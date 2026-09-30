import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

const expectedOrigin = "https://jingwuguanseibukan-staging.vercel.app";
const expectedSupabase = "https://eomubndonbetszdbhsrj.supabase.co";
const confirmation = "--confirm-staging-mux-disposable";
const muxApiOrigin = "https://api.mux.com";

if (process.argv[2] !== confirmation || !process.argv[3]) {
  throw new Error(`Usage: node --env-file=<protected staging env> scripts/staging-mux-live-acceptance.mjs ${confirmation} <video.mp4>`);
}

const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const superEmail = process.env.SECURITY_TEST_SUPER_EMAIL;
const superPassword = process.env.SECURITY_TEST_SUPER_PASSWORD;
const tokenId = process.env.MUX_TOKEN_ID;
const tokenSecret = process.env.MUX_TOKEN_SECRET;

if (siteOrigin !== expectedOrigin || supabaseUrl !== expectedSupabase || process.env.STAGING_PROJECT_REF !== "eomubndonbetszdbhsrj") {
  throw new Error("The live Mux acceptance is pinned to the approved staging targets.");
}
if ([publishableKey, secretKey, superEmail, superPassword, tokenId, tokenSecret].some(value => !value)) {
  throw new Error("Protected staging credentials are incomplete.");
}

const videoPath = process.argv[3];
const marker = `__MUX_056_DISPOSABLE_${Date.now()}_${randomBytes(4).toString("hex")}__`;
const description = "Disposable staging-only Mux signed-playback acceptance. Delete immediately.";
const section = "Staging acceptance";
const repositoryDescription = `Section: ${section}\n\n${description}`;
const basicAuth = Buffer.from(`${tokenId}:${tokenSecret}`, "utf8").toString("base64");
const publicClient = createClient(supabaseUrl, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const adminClient = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

let accessToken = "";
let uploadId = "";
let assetId = "";
let playbackId = "";
let contentId = "";
let legacyAssetBaseline = null;
let uploaderAuditBaseline = null;

function assertIdentifier(value, label) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{10,255}$/.test(value)) {
    throw new Error(`${label} was invalid.`);
  }
  return value;
}

function assertUuid(value, label) {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error(`${label} was invalid.`);
  }
  return value;
}

async function appRequest(pathname, init = {}) {
  const response = await fetch(`${siteOrigin}${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.method && init.method !== "GET" ? { Origin: siteOrigin, "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof result.error === "string" ? result.error : "Request failed.";
    throw new Error(`Staging app request failed (${response.status}): ${message}`);
  }
  return result;
}

async function muxRequest(pathname, init = {}) {
  const response = await fetch(`${muxApiOrigin}${pathname}`, {
    ...init,
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
  });
  return response;
}

async function resolveAssetFromUpload() {
  if (!uploadId || assetId) return;
  const response = await muxRequest(`/video/v1/uploads/${encodeURIComponent(uploadId)}`);
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    return;
  }
  const result = await response.json();
  if (typeof result?.data?.asset_id === "string") assetId = result.data.asset_id;
}

async function deleteCapturedContent() {
  if (!contentId) return;
  const { error } = await publicClient.rpc("delete_repository_content", { target_content: contentId });
  if (error) {
    const fallback = await adminClient.from("content").delete().eq("id", contentId);
    if (fallback.error) throw new Error("Captured Repository Draft cleanup failed.");
  }
}

async function deleteCapturedAsset() {
  await resolveAssetFromUpload();
  if (!assetId) return;
  const response = await muxRequest(`/video/v1/assets/${encodeURIComponent(assetId)}`, { method: "DELETE" });
  if (![204, 404].includes(response.status)) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error(`Captured Mux asset cleanup failed (${response.status}).`);
  }
  await response.body?.cancel().catch(() => undefined);
}

async function verifyProviderDeletion() {
  if (!assetId) return;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const response = await muxRequest(`/video/v1/assets/${encodeURIComponent(assetId)}`);
    if (response.status === 404) {
      await response.body?.cancel().catch(() => undefined);
      return;
    }
    await response.body?.cancel().catch(() => undefined);
    if (response.status !== 200) throw new Error(`Mux deletion verification failed (${response.status}).`);
    await new Promise(resolve => setTimeout(resolve, 5_000));
  }
  throw new Error("Mux asset still existed after deletion.");
}

async function verifyDatabaseResidue() {
  const checks = await Promise.all([
    adminClient.from("content").select("id", { count: "exact", head: true }).eq("title", marker),
    assetId
      ? adminClient.from("content").select("id", { count: "exact", head: true }).eq("video_asset_id", assetId)
      : Promise.resolve({ count: 0, error: null }),
    adminClient.from("repository_video_assets").select("id", { count: "exact", head: true }),
    adminClient.from("repository_uploader_assignment_audit").select("id", { count: "exact", head: true }),
  ]);
  for (const check of checks) if (check.error) throw new Error("Zero-residue database verification failed.");
  if (
    checks[0].count !== 0 ||
    checks[1].count !== 0 ||
    (legacyAssetBaseline !== null && checks[2].count !== legacyAssetBaseline) ||
    (uploaderAuditBaseline !== null && checks[3].count !== uploaderAuditBaseline)
  ) {
    throw new Error("Disposable Mux acceptance left database residue.");
  }
}

async function uploadVideo(uploadUrl) {
  const trusted = new URL(uploadUrl);
  if (trusted.protocol !== "https:" || trusted.hostname !== "storage.googleapis.com" || !trusted.pathname.startsWith("/video-storage-")) {
    throw new Error("The staging app returned an untrusted upload URL.");
  }
  const bytes = await readFile(videoPath);
  if (!bytes.length || bytes.length > 25 * 1024 * 1024) throw new Error("The disposable video must contain 1 byte to 25 MB.");
  const response = await fetch(trusted, {
    method: "PUT",
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(bytes.length),
      "Content-Range": `bytes 0-${bytes.length - 1}/${bytes.length}`,
    },
    body: bytes,
    redirect: "error",
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error(`Direct Mux upload failed (${response.status}).`);
  }
  await response.body?.cancel().catch(() => undefined);
}

async function waitForReady() {
  const deadline = Date.now() + 10 * 60_000;
  while (Date.now() < deadline) {
    const result = await appRequest(`/api/repository/mux/uploads/${encodeURIComponent(uploadId)}`, { method: "GET" });
    if (result.status === "failed") throw new Error("Mux reported that disposable processing failed.");
    if (result.status === "ready") {
      assetId = assertIdentifier(result.assetId, "Mux asset ID");
      playbackId = assertIdentifier(result.playbackId, "Mux playback ID");
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 5_000));
  }
  throw new Error("Timed out waiting for the disposable Mux asset.");
}

async function verifySignedPlayback() {
  const response = await fetch(`${siteOrigin}/api/repository/mux/playback/${encodeURIComponent(contentId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
  });
  const authorization = await response.json().catch(() => ({}));
  if (!response.ok || response.headers.get("cache-control") !== "private, no-store") {
    throw new Error(`Signed playback authorization failed (${response.status}).`);
  }
  if (authorization.playbackId !== playbackId || typeof authorization.playbackToken !== "string") {
    throw new Error("Signed playback authorization returned the wrong asset.");
  }
  const pieces = authorization.playbackToken.split(".");
  if (pieces.length !== 3) throw new Error("Signed playback token was malformed.");
  const header = JSON.parse(Buffer.from(pieces[0], "base64url").toString("utf8"));
  const payload = JSON.parse(Buffer.from(pieces[1], "base64url").toString("utf8"));
  const now = Math.floor(Date.now() / 1000);
  if (
    header.alg !== "RS256" || header.typ !== "JWT" || header.kid !== process.env.MUX_SIGNING_KEY_ID ||
    payload.sub !== playbackId || payload.aud !== "v" || payload.kid !== process.env.MUX_SIGNING_KEY_ID ||
    !Number.isSafeInteger(payload.exp) || payload.exp <= now || payload.exp > now + 14_460
  ) {
    throw new Error("Signed playback token claims were unsafe.");
  }
  const unsignedStream = await fetch(`https://stream.mux.com/${encodeURIComponent(playbackId)}.m3u8`, {
    redirect: "follow",
    signal: AbortSignal.timeout(30_000),
  });
  await unsignedStream.body?.cancel().catch(() => undefined);
  if (unsignedStream.ok) throw new Error("Signed Mux playback was accessible without a token.");
  const stream = await fetch(`https://stream.mux.com/${encodeURIComponent(playbackId)}.m3u8?token=${encodeURIComponent(authorization.playbackToken)}`, {
    redirect: "follow",
    signal: AbortSignal.timeout(30_000),
  });
  const manifest = await stream.text();
  if (!stream.ok || !manifest.startsWith("#EXTM3U")) throw new Error(`Signed Mux playback failed (${stream.status}).`);
}

let failure;
try {
  const signIn = await publicClient.auth.signInWithPassword({ email: superEmail, password: superPassword });
  if (signIn.error || !signIn.data.session?.access_token) throw new Error("Protected Super Admin staging sign-in failed.");
  accessToken = signIn.data.session.access_token;

  const [{ data: scopes, error: scopesError }, legacyAssets, uploaderAudit, staleMuxFixtures] = await Promise.all([
    publicClient.rpc("get_my_repository_upload_scopes"),
    adminClient.from("repository_video_assets").select("id", { count: "exact", head: true }),
    adminClient.from("repository_uploader_assignment_audit").select("id", { count: "exact", head: true }),
    adminClient.from("content").select("id", { count: "exact", head: true }).like("title", "__MUX_056_DISPOSABLE_%"),
  ]);
  if (scopesError || legacyAssets.error || uploaderAudit.error || staleMuxFixtures.error) {
    throw new Error("Staging fixture baselines could not be read.");
  }
  if (staleMuxFixtures.count !== 0) throw new Error("A stale disposable Mux fixture already exists; refusing to create another.");
  legacyAssetBaseline = legacyAssets.count;
  uploaderAuditBaseline = uploaderAudit.count;
  const classIds = [...new Set((scopes ?? []).map(row => row.class_id).filter(Boolean))];
  if (!classIds.length) throw new Error("Super Admin has no Repository Uploader scope in staging.");

  const classes = await publicClient.from("classes").select("id,name").in("id", classIds).eq("is_active", true).order("name").limit(1).single();
  if (classes.error || !classes.data) throw new Error("No active staging class fixture is available.");
  const classId = assertUuid(classes.data.id, "Class ID");
  const ranks = await publicClient.from("ranks").select("id").eq("class_id", classId).order("sort_order").limit(1).single();
  if (ranks.error || !ranks.data) throw new Error("No staging rank fixture is available.");
  const rankId = assertUuid(ranks.data.id, "Rank ID");
  const tiers = await publicClient.from("sub_ranks").select("id").eq("rank_id", rankId).order("sort_order").limit(1).single();
  if (tiers.error || !tiers.data) throw new Error("No staging tier fixture is available.");
  const tierId = assertUuid(tiers.data.id, "Tier ID");

  const created = await appRequest("/api/repository/mux/uploads", {
    method: "POST",
    body: JSON.stringify({ classId, rankId, tierId, title: marker }),
  });
  uploadId = assertIdentifier(created.uploadId, "Mux upload ID");
  if (typeof created.uploadUrl !== "string") throw new Error("Mux upload URL was missing.");
  await uploadVideo(created.uploadUrl);
  await waitForReady();

  const finalized = await appRequest(`/api/repository/mux/uploads/${encodeURIComponent(uploadId)}`, {
    method: "POST",
    body: JSON.stringify({ classId, rankId, tierId, title: marker, description, section, sortOrder: 990_056 }),
  });
  contentId = assertUuid(finalized.contentId, "Repository content ID");
  if (finalized.assetId !== assetId || finalized.playbackId !== playbackId) throw new Error("Finalized identifiers did not match the verified Mux asset.");

  const draft = await adminClient.from("content").select("id,status,video_provider,video_id,video_asset_id").eq("id", contentId).single();
  if (draft.error || draft.data.status !== "draft" || draft.data.video_provider !== "mux" || draft.data.video_id !== playbackId || draft.data.video_asset_id !== assetId) {
    throw new Error("The linked Mux Repository Draft was not persisted correctly.");
  }

  const published = await publicClient.rpc("update_repository_content", {
    target_content: contentId,
    content_title: marker,
    content_description: repositoryDescription,
    provider: "mux",
    provider_video_id: playbackId,
    content_status: "published",
    content_sort_order: 990_056,
  });
  if (published.error) throw new Error("The disposable Draft could not enter its temporary playback-test state.");
  await verifySignedPlayback();
  const restored = await publicClient.rpc("update_repository_content", {
    target_content: contentId,
    content_title: marker,
    content_description: repositoryDescription,
    provider: "mux",
    provider_video_id: playbackId,
    content_status: "draft",
    content_sort_order: 990_056,
  });
  if (restored.error) throw new Error("The disposable content could not return to Draft before cleanup.");
  const restoredDraft = await adminClient.from("content").select("status").eq("id", contentId).single();
  if (restoredDraft.error || restoredDraft.data.status !== "draft") {
    throw new Error("The disposable content did not return to Draft before cleanup.");
  }
} catch (error) {
  failure = error;
} finally {
  try {
    await deleteCapturedContent();
    await deleteCapturedAsset();
    await verifyProviderDeletion();
    await verifyDatabaseResidue();
    if (contentId && accessToken) {
      const response = await fetch(`${siteOrigin}/api/repository/mux/playback/${encodeURIComponent(contentId)}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        redirect: "error",
        signal: AbortSignal.timeout(30_000),
      });
      if (response.status !== 404) throw new Error("Deleted Repository content still authorized playback.");
      await response.body?.cancel().catch(() => undefined);
    }
  } catch (cleanupError) {
    failure = cleanupError;
  }
  await publicClient.auth.signOut({ scope: "local" }).catch(() => undefined);
}

if (failure) throw failure;
console.log("PASS: one staging-only Mux asset and linked Repository Draft completed signed playback and were deleted with zero application/provider residue.");
