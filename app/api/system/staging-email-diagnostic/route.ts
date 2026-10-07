import { NextRequest, NextResponse } from "next/server";
import { matchesSecret } from "@/lib/security/constant-time-secret";
import { STAGING_EMAIL_ORIGIN } from "@/lib/email/staging-single-message";
import { stagingEmailDiagnosticAllowed, stagingEmailDiagnosticReport } from "@/lib/email/staging-email-diagnostic";

export const runtime = "nodejs";

function reply(status: number, body: object) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (!stagingEmailDiagnosticAllowed(process.env, Date.now())) return reply(404, { code: "disabled" });
  if (!matchesSecret(request.headers.get("x-worker-secret"), process.env.EMAIL_WORKER_SECRET)) {
    return reply(403, { code: "not_authorised" });
  }
  const expectedCommit = request.headers.get("x-staging-diagnostic-commit") ?? "";
  if (request.body !== null || !/^[a-f0-9]{40}$/.test(expectedCommit)) return reply(400, { code: "invalid_request" });
  // Exact hostname is reported as a boolean (never echo URL/headers). No caller
  // content or credentials are returned. No database, provider, RPC or send code.
  return reply(200, {
    code: "diagnostic_only_v1",
    ...stagingEmailDiagnosticReport(process.env, expectedCommit, Date.now()),
    exactRequestUrl: request.url === `${STAGING_EMAIL_ORIGIN}/api/system/staging-email-diagnostic`,
    directNodeRuntimeProduction: process.env.NODE_ENV === "production",
  });
}
