import { NextRequest, NextResponse } from "next/server";

import { authenticateMuxRequest } from "@/lib/mux/request";
import { getMuxAsset, getMuxDirectUpload, validMuxId } from "@/lib/mux/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ uploadId: string }> };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function authorizedReadyUpload(
  auth: Exclude<Awaited<ReturnType<typeof authenticateMuxRequest>>, { response: NextResponse }>,
  uploadId: string,
) {
  if (!validMuxId(uploadId)) return { response: NextResponse.json({ error: "Invalid upload." }, { status: 400 }) };
  const upload = await getMuxDirectUpload(uploadId);
  const passthrough = upload.new_asset_settings?.passthrough;
  const expectedPrefix = `${auth.user.id}:`;
  if (!passthrough?.startsWith(expectedPrefix)) {
    return { response: NextResponse.json({ error: "Upload not found." }, { status: 404 }) };
  }
  const classId = passthrough.slice(expectedPrefix.length);
  if (!auth.scopeIds.has(classId)) {
    return { response: NextResponse.json({ error: "Repository Uploader access is no longer active." }, { status: 403 }) };
  }
  if (["errored", "cancelled", "timed_out"].includes(upload.status)) return { status: "failed" as const };
  if (upload.status !== "asset_created" || !validMuxId(upload.asset_id)) return { status: "processing" as const };
  const asset = await getMuxAsset(upload.asset_id);
  if (asset.passthrough !== passthrough) {
    return { response: NextResponse.json({ error: "Mux asset ownership could not be verified." }, { status: 502 }) };
  }
  if (asset.status === "errored") return { status: "failed" as const };
  if (asset.status !== "ready") return { status: "processing" as const };
  const playbackId = asset.playback_ids?.find(item => item.policy === "signed")?.id;
  if (!validMuxId(playbackId)) {
    return { response: NextResponse.json({ error: "Mux did not create signed playback." }, { status: 502 }) };
  }
  return { status: "ready" as const, classId, assetId: asset.id, playbackId };
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateMuxRequest(request, false);
    if ("response" in auth) return auth.response;
    const { uploadId } = await context.params;
    const ready = await authorizedReadyUpload(auth, uploadId);
    if ("response" in ready) return ready.response;
    return NextResponse.json(ready);
  } catch {
    console.error("Mux upload-status request failed.");
    return NextResponse.json({ error: "Unable to read Mux processing status." }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateMuxRequest(request, true);
    if ("response" in auth) return auth.response;
    const { uploadId } = await context.params;
    const ready = await authorizedReadyUpload(auth, uploadId);
    if ("response" in ready) return ready.response;
    if (ready.status !== "ready") {
      return NextResponse.json({ error: "Mux has not finished processing this upload." }, { status: 409 });
    }

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
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const section = typeof body.section === "string" ? body.section.trim() : "";
    const sortOrder = body.sortOrder;
    const repositoryDescription = [section ? `Section: ${section}` : "", description].filter(Boolean).join("\n\n");
    if (
      classId !== ready.classId ||
      ![classId, rankId, tierId].every(value => UUID_PATTERN.test(value)) ||
      !title || title.length > 100 || repositoryDescription.length > 5000 ||
      !Number.isSafeInteger(sortOrder) || Number(sortOrder) < 0 || Number(sortOrder) > 1_000_000
    ) {
      return NextResponse.json({ error: "Invalid repository Draft details." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: contentId, error } = await admin.rpc("create_repository_mux_content", {
      target_creator: auth.user.id,
      target_class: classId,
      target_rank: rankId,
      target_sub_rank: tierId,
      content_title: title,
      content_description: repositoryDescription,
      mux_playback_id: ready.playbackId,
      mux_asset_id: ready.assetId,
      content_sort_order: Number(sortOrder),
    });
    if (error || typeof contentId !== "string") throw new Error("Mux Draft finalization failed.");
    return NextResponse.json({
      status: "complete",
      contentId,
      assetId: ready.assetId,
      playbackId: ready.playbackId,
    });
  } catch {
    console.error("Mux upload finalization failed.");
    return NextResponse.json({ error: "Unable to finalize the Mux repository Draft." }, { status: 500 });
  }
}
