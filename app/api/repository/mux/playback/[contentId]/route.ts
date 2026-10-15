import { NextRequest, NextResponse } from "next/server";

import { authenticateMuxRequest } from "@/lib/mux/request";
import { signMuxPlaybackToken, validMuxId } from "@/lib/mux/server";

export const runtime = "nodejs";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type RouteContext = { params: Promise<{ contentId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateMuxRequest(request, false);
    if ("response" in auth) return auth.response;
    const { contentId } = await context.params;
    if (!UUID_PATTERN.test(contentId)) return NextResponse.json({ error: "Invalid content." }, { status: 400 });
    const { data: content, error } = await auth.supabase
      .from("content")
      .select("id,video_provider,video_id,status")
      .eq("id", contentId)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw new Error("Repository lookup failed.");
    if (!content || content.video_provider !== "mux" || !validMuxId(content.video_id)) {
      return NextResponse.json({ error: "Video not found." }, { status: 404 });
    }
    const signed = signMuxPlaybackToken(content.video_id);
    return NextResponse.json({
      playbackId: content.video_id,
      playbackToken: signed.token,
      expiresAt: signed.expiresAt,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    console.error("Mux playback authorization failed.");
    return NextResponse.json({ error: "Unable to authorize video playback." }, { status: 500 });
  }
}
