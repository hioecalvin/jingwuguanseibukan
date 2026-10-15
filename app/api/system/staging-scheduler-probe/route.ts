import { NextResponse } from "next/server";
import { matchesSecret } from "@/lib/security/constant-time-secret";
import { schedulerProbeConfig, SCHEDULER_PROBE_ORIGIN, SCHEDULER_PROBE_PATH } from "@/lib/email/staging-scheduler-probe";

export const runtime = "nodejs";

export function POST(request: Request) {
  const config = schedulerProbeConfig();
  const reply = (body: object, status: number) => NextResponse.json(body, {
    status, headers: { "Cache-Control": "no-store" },
  });
  if (!config) return reply({ code: "disabled" }, 404);
  if (request.url !== SCHEDULER_PROBE_ORIGIN + SCHEDULER_PROBE_PATH ||
    !matchesSecret(request.headers.get("x-scheduler-acceptance-secret"), config.secret) ||
    request.headers.get("x-scheduler-acceptance-id") !== config.id ||
    request.headers.get("x-scheduler-acceptance-commit") !== config.commit) {
    return reply({ code: "not_authorised" }, 403);
  }
  // Deliberately never read/parse request content or call any application service.
  // A streamed or malicious body cannot initiate queue/memorial/provider work.
  if (!schedulerProbeConfig()) return reply({ code: "disabled" }, 404);
  return reply({ code: "no_send_probe", mode: "no_send", id: config.id,
    commit: config.commit, start: config.start, end: config.end,
    checkedAt: new Date().toISOString() }, 200);
}
