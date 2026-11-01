import "server-only";
import { Resend } from "resend";
import { configuredApplicationOrigin } from "@/lib/application-origin";
import { memberClaimsEnabled } from "@/lib/features/member-claims";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderEmail } from "@/lib/email/render-email";

type DeliveryScope = { email: string; dateOfBirth: string } | { claimId: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Called only after the corresponding guarded request or scoped Admin review.
// No scheduler, general queue polling, memorial work or caller-provided message.
export async function deliverMemberClaimEmail(scope: DeliveryScope): Promise<void> {
  if (!memberClaimsEnabled() || process.env.MEMBER_CLAIM_EMAIL_DELIVERY_ENABLED !== "true") return;
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM_ADDRESS;
  if (!key || !from || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(from)) return;
  const setup = "claimId" in scope;
  const type = setup ? "member_claim_setup" : "member_claim_verification";
  if (setup && !uuid.test(scope.claimId)) return;
  const client = createAdminClient();
  let claimedId: string | undefined;
  let providerAccepted = false;
  try {
    const { data, error } = await client.rpc("claim_member_account_email", {
      target_email_type: type,
      registered_email: setup ? null : scope.email,
      registered_date_of_birth: setup ? null : scope.dateOfBirth,
      target_claim_id: setup ? scope.claimId : null,
    });
    if (error || !Array.isArray(data) || data.length !== 1) return;
    const row = data[0];
    if (typeof row.email_id !== "string" || !uuid.test(row.email_id)) return;
    claimedId = row.email_id;
    if (row.email_type !== type || typeof row.recipient_email !== "string" ||
      !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(row.recipient_email) ||
      !uuid.test(row.reference_id) ||
      (setup ? row.reference_id !== scope.claimId : row.recipient_email !== scope.email.trim().toLowerCase())) throw Error("Invalid delivery record");
    const field = setup ? "setup_url" : "verification_url";
    const url = new URL(row.template_data?.[field]);
    const fragment = new URLSearchParams(url.hash.slice(1));
    if (url.origin !== configuredApplicationOrigin() || url.protocol !== "https:" || url.username || url.password || url.search ||
      url.pathname !== (setup ? "/claim-id/setup" : "/claim-id/verify") ||
      fragment.get("claim") !== row.reference_id || !/^[a-f0-9]{64}$/.test(fragment.get("token") ?? "") ||
      [...fragment.keys()].sort().join(",") !== "claim,token") throw Error("Invalid claim link");
    const options = { idempotencyKey: `email-outbox/${claimedId}`, signal: AbortSignal.timeout(10000) };
    const response = await new Resend(key).emails.send({
      from: `Jingwuguan Seibukan <${from}>`, to: [row.recipient_email],
      subject: setup ? "Set your Jingwuguan Seibukan password" : "Verify your Jingwuguan Seibukan member claim",
      html: renderEmail(type, { [field]: url.href }),
    }, options);
    if (response.error || !response.data?.id) throw Error("Provider acknowledgement unavailable");
    providerAccepted = true;
    await client.rpc("mark_email_sent", { target_email_id: claimedId, provider_id: response.data.id });
    // If persistence fails, leave processing locked. A later bounded recovery
    // uses the same outbox idempotency key; never resend in this invocation.
  } catch {
    if (claimedId && !providerAccepted) {
      try { await client.rpc("mark_email_failed", { target_email_id: claimedId, error_message: "Account-claim email delivery could not be confirmed." }); }
      catch { /* Retain processing state for reconciliation; never log proof/recipient. */ }
    }
  }
}
