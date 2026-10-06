import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { matchesSecret } from "@/lib/security/constant-time-secret";
import { renderEmail } from "@/lib/email/render-email";
import { emailProviderAbortSignal } from "@/lib/email/worker-runtime";
import {
  stagingEmailConfig, stagingEmailRequestAllowed,
  STAGING_EMAIL_SUBJECT, STAGING_EMAIL_TEMPLATE,
} from "@/lib/email/staging-single-message";

export const runtime = "nodejs";

function reply(status: number, code: string) {
  return NextResponse.json({ code }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const config = stagingEmailConfig(process.env);
  if (!config) return reply(404, "disabled");
  if (!stagingEmailRequestAllowed(request.url, request.headers.get("x-staging-email-id"), config.id) ||
      !matchesSecret(request.headers.get("x-staging-email-secret"), config.secret)) {
    return reply(403, "not_authorised");
  }
  // Content, recipient and UUID are operator-bound, never taken from a request body.
  if (request.body !== null) return reply(400, "body_not_allowed");

  try {
    const admin = createAdminClient();
    const profiles = await admin.from("profiles").select("id")
      .ilike("email", config.recipient.replace(/[\\%_]/g, "\\$&")).limit(1);
    if (profiles.error || !Array.isArray(profiles.data) || profiles.data.length) {
      return reply(409, "recipient_not_isolated");
    }
    // Small staging inventory only. Fail closed at the bound instead of assuming
    // that an uninspected later page contains no matching Auth identity.
    const identities = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (identities.error || !Array.isArray(identities.data?.users) ||
        identities.data.users.length >= 1000 || identities.data.users.some(user =>
          user.email?.trim().toLowerCase() === config.recipient ||
          user.identities?.some(identity => identity.identity_data?.email?.toLowerCase() === config.recipient))) {
      return reply(409, "recipient_not_isolated");
    }
    const html = renderEmail("class_event_notification", STAGING_EMAIL_TEMPLATE);
    if (!stagingEmailConfig(process.env)) return reply(404, "disabled");

    // Atomic compare-and-swap on an owner-prepared, cancelled synthetic fixture.
    // Normal claim_next_email ignores cancelled rows. Exactly one concurrent request
    // may move attempts 0 -> 1; max_attempts=1 prevents normal-worker retries too.
    // Never reset this latch on timeout, failed send or lost acknowledgement.
    const claimed = await admin.from("email_outbox").update({
      status: "processing", attempts: 1, last_attempt_at: new Date().toISOString(),
    }).eq("id", config.id).eq("status", "cancelled").eq("attempts", 0)
      .eq("max_attempts", 1).eq("recipient_email", config.recipient)
      .eq("email_type", "class_event_notification").eq("subject", STAGING_EMAIL_SUBJECT)
      .eq("template_data", JSON.stringify(STAGING_EMAIL_TEMPLATE))
      .eq("reference_type", "staging_single_message_v1").eq("reference_id", config.id)
      .eq("dedupe_key", `staging-single-message/${config.id}`)
      .is("recipient_user_id", null).is("created_by", null).is("sent_at", null)
      .is("failed_at", null).is("last_attempt_at", null).is("provider_message_id", null)
      .is("last_error", null).is("next_attempt_at", null).select("id");
    if (claimed.error) return reply(503, "claim_uncertain_reconcile");
    if (!Array.isArray(claimed.data) || claimed.data.length !== 1 || claimed.data[0].id !== config.id) {
      return reply(409, "fixture_unavailable");
    }
    if (!stagingEmailConfig(process.env)) return reply(409, "window_closed_reconcile");

    // Fixed recipient/content: even a later outbox edit cannot redirect this send.
    // At most one provider call; no automatic retries or failure requeue.
    const providerOptions = {
      idempotencyKey: `email-outbox/${config.id}`, signal: emailProviderAbortSignal(10_000),
      redirect: "error" as const,
    };
    const result = await new Resend(process.env.RESEND_API_KEY, {
      baseUrl: "https://api.resend.com", userAgent: "jingwuguan-staging-single-message/1",
    }).emails.send({
      from: `Jingwuguan Seibukan <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: [config.recipient], subject: STAGING_EMAIL_SUBJECT, html,
    }, providerOptions);
    if (result.error || typeof result.data?.id !== "string" || !result.data.id.trim()) {
      return reply(502, "provider_uncertain_reconcile");
    }

    const ack = await admin.rpc("mark_email_sent", {
      target_email_id: config.id, provider_id: result.data.id,
    });
    if (ack.error) return reply(503, "acknowledgement_uncertain_reconcile");
    // Provider acceptance is not verified inbox delivery.
    return reply(200, "provider_accepted");
  } catch {
    // Provider/SQL exceptions may contain credentials or recipient data. Never log them.
    return reply(503, "acceptance_uncertain_reconcile");
  }
}
