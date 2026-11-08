import { NextResponse } from "next/server";
import { configuredApplicationOrigin } from "@/lib/application-origin";
import { deliverAdminEmailChange } from "@/lib/admin-email-change";
import { readClaimBody } from "@/lib/member-claims/http";
import { consumeDurableRateLimit } from "@/lib/security/durable-rate-limit";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
function reply(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
function details(value: unknown): value is { full_name: string; date_of_birth: string | null; email: string | null; phone: string | null } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return Object.keys(row).sort().join(",") === "date_of_birth,email,full_name,phone" &&
    typeof row.full_name === "string" && row.full_name.length <= 200 &&
    (row.date_of_birth === null || typeof row.date_of_birth === "string" && /^\d{4}-\d{2}-\d{2}$/.test(row.date_of_birth)) &&
    (row.email === null || typeof row.email === "string" && row.email.length <= 254) &&
    (row.phone === null || typeof row.phone === "string" && row.phone.length <= 32);
}
export async function POST(request: Request) {
  try {
    if (request.headers.get("origin") !== configuredApplicationOrigin() || request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return reply({ error: "Invalid request." }, 403);
    const client = await createClient();
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user?.id || !user.email_confirmed_at) return reply({ error: "Please sign in again." }, 401);
    let body;
    try { body = await readClaimBody(request); } catch { return reply({ error: "Invalid request." }, 400); }
    if (typeof body.memberId !== "string" || !uuid.test(body.memberId) || !details(body.values) || !details(body.expectedValues)) return reply({ error: "Check the personal details and reload the record if necessary." }, 400);
    if (!(await consumeDurableRateLimit({ bucket: "admin-personal-details", subject: user.id, limit: 30, windowSeconds: 600 })).allowed) return reply({ error: "Please wait before saving more changes." }, 429);
    const { data, error: saveError } = await client.rpc("update_member_personal_details", {
      target_member_id: body.memberId, new_full_name: body.values.full_name, new_date_of_birth: body.values.date_of_birth,
      new_email: body.values.email, new_phone: body.values.phone, expected_values: body.expectedValues,
    });
    if (saveError) return reply({ error: saveError.code === "40001" ? "Personal details changed. Reload before saving." : "Unable to save. Check the details, your Super Admin access, and any pending email change." }, saveError.code === "40001" ? 409 : 400);
    if (!data?.saved) return reply({ error: "Unable to confirm the saved changes. Reload the record." }, 503);
    if (typeof data.email_request_id === "string" && uuid.test(data.email_request_id)) {
      const delivery = await deliverAdminEmailChange(data.email_request_id, user.id);
      return reply({ message: delivery === "sent" ? "Personal details saved. Verification email sent; the existing login email stays active until confirmation is complete." : "Personal details saved. Email verification delivery could not be confirmed. The existing login email is unchanged; reload to see the pending request." });
    }
    return reply({ message: "Personal details saved." });
  } catch {
    return reply({ error: "Personal details are temporarily unavailable. Reload before retrying." }, 503);
  }
}
