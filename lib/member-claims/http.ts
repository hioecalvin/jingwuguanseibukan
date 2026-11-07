import "server-only";
import { isIP } from "node:net";
import { NextResponse } from "next/server";
import { configuredApplicationOrigin } from "@/lib/application-origin";
import { memberClaimsEnabled } from "@/lib/features/member-claims";
import { consumeDurableRateLimit } from "@/lib/security/durable-rate-limit";

export function reply(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: {
    "Cache-Control": "no-store", "Referrer-Policy": "no-referrer",
  } });
}

export async function claimRequestGuard(request: Request, action: string) {
  if (!memberClaimsEnabled()) return reply({ error: "Member claiming is not available yet." }, 503);
  if (request.headers.get("origin") !== configuredApplicationOrigin() ||
      request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return reply({ error: "Invalid request." }, 403);
  }
  const forwarded = process.env.VERCEL === "1" ? request.headers.get("x-vercel-forwarded-for")?.trim() : undefined;
  const client = forwarded && isIP(forwarded) ? forwarded : "shared";
  // Reviews send a list refresh after every decision and may share a dojo IP.
  // The authenticated route additionally enforces its per-actor allowance.
  const clientLimit = action === "review" ? 120 : 10;
  for (const options of [
    { bucket: `claim-${action}-global`, subject: "all", limit: 100, windowSeconds: 60 },
    { bucket: `claim-${action}-client`, subject: client, limit: clientLimit, windowSeconds: 600 },
  ]) if (!(await consumeDurableRateLimit(options)).allowed) return reply({ error: "Please wait before trying again." }, 429);
  return null;
}

export async function readClaimBody(request: Request): Promise<Record<string, unknown>> {
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > 4096)) throw new Error("Invalid body");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing body");
  let size = 0;
  const chunks: Buffer[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) { await reader.cancel(); throw new Error("Invalid body"); }
      chunks.push(Buffer.from(value));
    }
  } finally { reader.releaseLock(); }
  const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid body");
  return parsed as Record<string, unknown>;
}

export const claimIdPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export const claimProofPattern = /^[a-f0-9]{64}$/;
