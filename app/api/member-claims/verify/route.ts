import { claimIdPattern, claimProofPattern, claimRequestGuard, readClaimBody, reply } from "@/lib/member-claims/http";
import { consumeDurableRateLimit } from "@/lib/security/durable-rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const blocked = await claimRequestGuard(request, "verify");
    if (blocked) return blocked;
    let body;
    try { body = await readClaimBody(request); } catch { return reply({ error: "Invalid verification link." }, 400); }
    if (typeof body.claimId !== "string" || !claimIdPattern.test(body.claimId) ||
        typeof body.token !== "string" || !claimProofPattern.test(body.token)) return reply({ error: "Invalid verification link." }, 400);
    if (!(await consumeDurableRateLimit({ bucket: "claim-verify-id", subject: body.claimId, limit: 5, windowSeconds: 600 })).allowed) {
      return reply({ error: "Please wait before trying again." }, 429);
    }
    const { error } = await createAdminClient().rpc("verify_member_claim", { claim_id: body.claimId, proof_token: body.token });
    if (error) return reply({ error: error.code === "42501" ? "This link has expired or has already been used." : "Verification is temporarily unavailable." }, error.code === "42501" ? 400 : 503);
    return reply({ message: "Email verified. Your claim is waiting for your Dojo Admin to check your identity." });
  } catch {
    return reply({ error: "Verification is temporarily unavailable." }, 503);
  }
}
