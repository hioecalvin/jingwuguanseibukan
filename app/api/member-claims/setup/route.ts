import { randomBytes } from "node:crypto";
import { claimIdPattern, claimProofPattern, claimRequestGuard, readClaimBody, reply } from "@/lib/member-claims/http";
import { consumeDurableRateLimit } from "@/lib/security/durable-rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const blocked = await claimRequestGuard(request, "setup");
    if (blocked) return blocked;
    let body;
    try { body = await readClaimBody(request); } catch { return reply({ error: "Invalid setup request." }, 400); }
    if (typeof body.claimId !== "string" || !claimIdPattern.test(body.claimId) ||
        typeof body.token !== "string" || !claimProofPattern.test(body.token)) return reply({ error: "Invalid setup link." }, 400);
    if (typeof body.password !== "string" || body.password.length < 12 || body.password.length > 128 ||
        !/[A-Z]/.test(body.password) || !/[a-z]/.test(body.password) || !/[0-9]/.test(body.password)) {
      return reply({ error: "Use 12–128 characters, including uppercase, lowercase and a number." }, 400);
    }
    if (!(await consumeDurableRateLimit({ bucket: "claim-setup-id", subject: body.claimId, limit: 5, windowSeconds: 600 })).allowed) {
      return reply({ error: "Please wait before trying again." }, 429);
    }
    const admin = createAdminClient();
    const ticket = randomBytes(32).toString("hex");
    const prepared = await admin.rpc("prepare_member_claim_setup", { claim_id: body.claimId, setup_token: body.token, ticket });
    if (prepared.error) return reply({ error: prepared.error.code === "55P03"
      ? "Setup is already in progress. Wait five minutes, then try again."
      : "This setup link is unavailable. Contact your Dojo Admin if you need a new one." }, prepared.error.code === "55P03" ? 409 : 400);
    const row = Array.isArray(prepared.data) && prepared.data.length === 1 ? prepared.data[0] : null;
    if (!row || typeof row.member_uuid !== "string" || !claimIdPattern.test(row.member_uuid) ||
        typeof row.verified_email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.verified_email) ||
        typeof row.already_complete !== "boolean") return reply({ error: "Account setup is temporarily unavailable." }, 503);
    if (row.already_complete) return reply({ message: "Account setup is already complete. Sign in with the password you previously set." });
    // Exactly one create attempt. A timeout may mean the provider committed;
    // reconcile private claim + Auth state instead of resetting any password.
    try {
      await admin.auth.admin.createUser({
        id: row.member_uuid, email: row.verified_email, password: body.password,
        email_confirm: true, app_metadata: { member_claim_ticket: ticket },
      });
    } catch { /* Reconciliation below covers an ambiguous provider response. */ }
    const completed = await admin.rpc("member_claim_setup_complete", { claim_id: body.claimId, setup_token: body.token });
    if (completed.error || completed.data !== true) return reply({ error: "Account setup could not be confirmed. Wait five minutes and retry this link, or contact your Dojo Admin. Your password has not been reset." }, 503);
    return reply({ message: "Your account is ready. Sign in with your email or JS Member ID and the password you just chose." });
  } catch {
    return reply({ error: "Account setup is temporarily unavailable. Please try later." }, 503);
  }
}
