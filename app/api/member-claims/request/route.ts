import { after } from "next/server";
import { deliverMemberClaimEmail } from "@/lib/member-claims/delivery";
import { randomBytes } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { configuredApplicationOrigin } from "@/lib/application-origin";
import { claimRequestGuard, readClaimBody, reply } from "@/lib/member-claims/http";
import { consumeDurableRateLimit } from "@/lib/security/durable-rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 30;
export async function POST(request: Request) {
  const started = Date.now();
  try {
    const blocked = await claimRequestGuard(request, "request");
    if (blocked) return blocked;
    let body;
    try { body = await readClaimBody(request); } catch { return reply({ error: "Invalid request." }, 400); }
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const dateOfBirth = typeof body.dateOfBirth === "string" ? body.dateOfBirth : "";
    const parsedBirth = /^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) ? Date.parse(`${dateOfBirth}T00:00:00Z`) : NaN;
    const validBirth = !dateOfBirth.startsWith("0000-") && Number.isFinite(parsedBirth) && parsedBirth <= Date.now() &&
      new Date(parsedBirth).toISOString().slice(0, 10) === dateOfBirth;
    if (!validBirth || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return reply({ error: "Enter your registered email address and a valid date of birth." }, 400);
    }
    for (const [kind, subject] of [["email", email]]) {
      if (!(await consumeDurableRateLimit({ bucket: `claim-request-${kind}`, subject, limit: 3, windowSeconds: 3600 })).allowed) {
        return reply({ error: "Please wait before trying again." }, 429);
      }
    }
    const { error } = await createAdminClient().rpc("request_registered_member_claim", {
      registered_email: email, registered_date_of_birth: dateOfBirth,
      proof_token: randomBytes(32).toString("hex"), site_origin: configuredApplicationOrigin(),
    });
    if (error) return reply({ error: "Unable to process your request. Please try later." }, 503);
    after(() => deliverMemberClaimEmail({ email, dateOfBirth }));
    return reply({ message: "If these details match an eligible member record, a verification link will be sent to the registered email address. Your Dojo Admin must then approve the claim." }, 202);
  } catch {
    return reply({ error: "Unable to process your request. Please try later." }, 503);
  } finally {
    // Reduce straightforward account-existence timing probes; durable limits remain
    // essential because network/database variability can exceed this floor.
    await delay(Math.max(0, 1000 - (Date.now() - started)));
  }
}
