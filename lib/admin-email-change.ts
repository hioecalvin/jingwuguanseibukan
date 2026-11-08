import "server-only";
import { Resend } from "resend";
import { configuredApplicationOrigin } from "@/lib/application-origin";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;
type Message = { to: string; url: string; kind: "current" | "new"; requestId: string };
type Sender = (message: Message) => Promise<void>;
export type EmailChangeDelivery = "sent" | "unconfirmed";
const mailbox = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

/** Keep provider tokens and recipients inside this server-only module. */
export async function performAdminEmailChange(
  client: AdminClient, requestId: string, actorId: string, send: Sender,
  origin = configuredApplicationOrigin(), supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
): Promise<EmailChangeDelivery> {
  let claimed = false;
  let providerAttempted = false;
  try {
    const { data: record, error } = await client.rpc("claim_admin_email_change", { request_id: requestId, actor_id: actorId });
    if (error || !record || record.request_id !== requestId) return "unconfirmed";
    claimed = true;
    if (typeof record.profile_id !== "string" || !mailbox.test(record.old_email) || !mailbox.test(record.new_email) || record.old_email === record.new_email) throw Error("Invalid request");
    const { data: existing, error: lookupError } = await client.auth.admin.getUserById(record.profile_id);
    if (lookupError || existing.user?.id !== record.profile_id || existing.user.email?.toLowerCase() !== record.old_email.toLowerCase()) throw Error("Account changed");
    const redirectTo = `${origin}/auth/confirm`;
    const buildLink = async (kind: "current" | "new") => {
      const response = await client.auth.admin.generateLink({
        type: kind === "current" ? "email_change_current" : "email_change_new",
        email: record.old_email, newEmail: record.new_email, options: { redirectTo },
      });
      if (response.error) {
        // This exact Auth response means dual-address confirmation is disabled.
        // Any other error fails closed; we never weaken the Auth setting.
        if (kind === "current" && response.error.status === 400 && response.error.code === "validation_failed" &&
          response.error.message === "Enable secure email change to generate link for current email") return null;
        throw Error("Email verification unavailable");
      }
      if (response.data.user?.id !== record.profile_id || !supabaseUrl) throw Error("Invalid verification account");
      const action = new URL(response.data.properties.action_link);
      const expected = new URL(supabaseUrl);
      if (action.origin !== expected.origin || action.protocol !== "https:" || action.username || action.password || action.hash ||
        action.pathname !== "/auth/v1/verify" || action.searchParams.get("type") !== "email_change" ||
        action.searchParams.get("redirect_to") !== redirectTo || !/^[a-f0-9]{40,128}$/i.test(action.searchParams.get("token") ?? "")) throw Error("Invalid verification link");
      // Auth's action link carries the correct new-address token. Do not use
      // generated properties.hashed_token, which can refer to the old address.
      const link = new URL("/auth/confirm", origin);
      link.searchParams.set("type", "email_change");
      link.searchParams.set("token_hash", action.searchParams.get("token")!);
      return link.href;
    };
    // Generate both before sending: generating the second resets confirmation status.
    const current = await buildLink("current");
    const replacement = await buildLink("new");
    if (!replacement) throw Error("Missing replacement verification");
    if (current) {
      providerAttempted = true;
      await send({ to: record.old_email, url: current, kind: "current", requestId });
    }
    providerAttempted = true;
    await send({ to: record.new_email, url: replacement, kind: "new", requestId });
    const finished = await client.rpc("finish_admin_email_change", { request_id: requestId, delivered: true });
    return finished.error ? "unconfirmed" : "sent";
  } catch {
    // An uncertain provider response remains locked for manual reconciliation.
    // No retry, token, recipient or raw Auth/provider error is returned or logged.
    if (claimed && !providerAttempted) {
      try { await client.rpc("finish_admin_email_change", { request_id: requestId, delivered: false }); } catch { /* Keep processing. */ }
    }
    return "unconfirmed";
  }
}

export async function deliverAdminEmailChange(requestId: string, actorId: string): Promise<EmailChangeDelivery> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM_ADDRESS;
  if (!key || !from || !mailbox.test(from)) return "unconfirmed";
  const resend = new Resend(key);
  return performAdminEmailChange(createAdminClient(), requestId, actorId, async ({ to, url, kind, requestId: id }) => {
    const result = await resend.emails.send({
      from: `Jingwuguan Seibukan <${from}>`, to: [to],
      subject: "Confirm your Jingwuguan Seibukan email change",
      text: `A Super Admin requested an email change for your member account.\n\n${kind === "current" ? "Confirm this request from your current address:" : "Verify your replacement email address:"}\n${url}\n\nYour existing login email stays active until all required confirmations are complete. If you received a confirmation at both addresses, confirm both. If you did not request this change, do not use the link and contact your Super Admin.`,
    }, { idempotencyKey: `personal-email/${id}/${kind}` });
    if (result.error || !result.data?.id) throw Error("Delivery unconfirmed");
  });
}
