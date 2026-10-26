import { claimIdPattern, claimRequestGuard, readClaimBody, reply } from "@/lib/member-claims/http";
import { consumeDurableRateLimit } from "@/lib/security/durable-rate-limit";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const blocked = await claimRequestGuard(request, "review");
    if (blocked) return blocked;
    const client = await createClient();
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user?.id || !user.email_confirmed_at) return reply({ error: "Please sign in again." }, 401);
    if (!(await consumeDurableRateLimit({ bucket: "claim-review-actor", subject: user.id, limit: 60, windowSeconds: 600 })).allowed) {
      return reply({ error: "Please wait before trying again." }, 429);
    }
    let body;
    try { body = await readClaimBody(request); } catch { return reply({ error: "Invalid request." }, 400); }
    if (body.action === "list") {
      const { data, error } = await client.rpc("get_reviewable_member_claims");
      if (error) return reply({ error: "Unable to load claim reviews." }, 403);
      return reply({ claims: data ?? [] });
    }
    if (!["approve", "reject"].includes(String(body.action)) || typeof body.claimId !== "string" || !claimIdPattern.test(body.claimId)) {
      return reply({ error: "Invalid review decision." }, 400);
    }
    // Actor identity comes from the verified JWT inside the database wrapper.
    // No actor/member/email supplied by the browser is trusted for authorization.
    const { error } = await client.rpc("review_member_claim", { claim_id: body.claimId, approve: body.action === "approve" });
    if (error) return reply({ error: "This claim is unavailable or outside your current Dojo authority." }, 403);
    return reply({ message: body.action === "approve" ? "Identity claim approved. A password-setup email has been queued for the member." : "Identity claim rejected." });
  } catch {
    return reply({ error: "Claim review is temporarily unavailable." }, 503);
  }
}
