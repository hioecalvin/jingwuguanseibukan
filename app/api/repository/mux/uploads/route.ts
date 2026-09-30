import { NextRequest, NextResponse } from "next/server";

import { authenticateMuxRequest } from "@/lib/mux/request";
import { createMuxDirectUpload, muxFailureCategory } from "@/lib/mux/server";
import { configuredRateLimit, consumeDurableRateLimit, durableRateLimitHeaders } from "@/lib/security/durable-rate-limit";

export const runtime = "nodejs";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateMuxRequest(request, true);
    if ("response" in auth) return auth.response;
    let body: Record<string, unknown>;
    try {
      const parsed: unknown = await request.json();
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
      body = parsed as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const classId = typeof body.classId === "string" ? body.classId : "";
    const rankId = typeof body.rankId === "string" ? body.rankId : "";
    const tierId = typeof body.tierId === "string" ? body.tierId : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (![classId, rankId, tierId].every(value => UUID_PATTERN.test(value)) || !title || title.length > 100) {
      return NextResponse.json({ error: "Valid repository selections and title are required." }, { status: 400 });
    }
    if (!auth.scopeIds.has(classId)) {
      return NextResponse.json({ error: "Repository Uploader access is required for this class." }, { status: 403 });
    }
    const [{ data: rank }, { data: tier }] = await Promise.all([
      auth.supabase.from("ranks").select("id").eq("id", rankId).eq("class_id", classId).maybeSingle(),
      auth.supabase.from("sub_ranks").select("id").eq("id", tierId).eq("rank_id", rankId).maybeSingle(),
    ]);
    if (!rank || !tier) return NextResponse.json({ error: "The selected rank or tier is invalid." }, { status: 400 });
    const rateLimit = await consumeDurableRateLimit({
      bucket: "mux-direct-upload",
      subject: auth.user.id,
      limit: configuredRateLimit("MUX_UPLOAD_RATE_LIMIT", 20, 100),
      windowSeconds: configuredRateLimit("MUX_UPLOAD_RATE_WINDOW_SECONDS", 86_400, 86_400),
    });
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "The daily video upload limit has been reached." }, {
        status: 429,
        headers: durableRateLimitHeaders(rateLimit),
      });
    }
    const upload = await createMuxDirectUpload({
      title,
      passthrough: `${auth.user.id}:${classId}`,
    });
    return NextResponse.json({ uploadId: upload.id, uploadUrl: upload.url });
  } catch (error) {
    console.error("Mux direct-upload creation failed.", {
      category: muxFailureCategory(error),
    });
    return NextResponse.json({ error: "Unable to prepare the secure Mux upload." }, { status: 500 });
  }
}
