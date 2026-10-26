import { randomBytes } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { configuredApplicationOrigin } from "@/lib/application-origin";
import { claimRequestGuard, readClaimBody, reply } from "@/lib/member-claims/http";
import { consumeDurableRateLimit } from "@/lib/security/durable-rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const started = Date.now();
  try {
    const blocked = await claimRequestGuard(request, "request");
    if (blocked) return blocked;
    let body;
    try { body = await readClaimBody(request); } catch { return reply({ error: "Invalid request." }, 400); }
    const memberId = typeof body.memberId === "string" ? body.memberId.trim().toUpperCase() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!/^JS-\d{4,10}$/.test(memberId) || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return reply({ error: "Enter your JS ID and a valid email address." }, 400);
    }
    for (const [kind, subject] of [["member", memberId], ["email", email]]) {
      if (!(await consumeDurableRateLimit({ bucket: `claim-request-${kind}`, subject, limit: 3, windowSeconds: 3600 })).allowed) {
        return reply({ error: "Please wait before trying again." }, 429);
      }
    }
    const { error } = await createAdminClient().rpc("request_member_claim", {
      target_registration_number: memberId, proposed_email: email,
      proof_token: randomBytes(32).toString("hex"), site_origin: configuredApplicationOrigin(),
    });
    if (error) return reply({ error: "Unable to process your request. Please try later." }, 503);
    return reply({ message: "If this JS ID is eligible, a verification link will be sent to the email you entered. Your Dojo Admin must then approve the claim." }, 202);
  } catch {
    return reply({ error: "Unable to process your request. Please try later." }, 503);
  } finally {
    // Reduce straightforward ID-existence timing probes; durable limits remain
    // essential because network/database variability can exceed this floor.
    await delay(Math.max(0, 1000 - (Date.now() - started)));
  }
}
