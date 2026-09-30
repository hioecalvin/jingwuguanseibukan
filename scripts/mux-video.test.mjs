import assert from "node:assert/strict";
import { createVerify, generateKeyPairSync } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const migration = await readFile(
  new URL("../supabase/migrations/056_mux_repository_video.sql", import.meta.url),
  "utf8",
);

test("the deferred Mux candidate preserves legacy YouTube while requiring complete identifiers", () => {
  assert.match(migration, /add column if not exists video_asset_id text/i);
  assert.match(migration, /video_provider = 'youtube'[\s\S]+video_asset_id is null/i);
  assert.match(migration, /video_provider = 'mux'[\s\S]+video_asset_id ~ '\^\[A-Za-z0-9_-\]/i);
  assert.match(migration, /validate constraint content_video_provider_pair_check/i);
});

test("Mux Draft creation remains class-scoped, server-pinned and RPC-only", () => {
  assert.match(migration, /auth\.role\(\)[\s\S]+<> 'service_role'[\s\S]+not public\.is_repository_uploader\(target_class, target_creator\)[\s\S]+insert into public\.content/i);
  assert.match(migration, /'mux',[\s\S]+mux_playback_id,[\s\S]+mux_asset_id,[\s\S]+'draft'::public\.content_status/i);
  assert.match(migration, /create unique index[\s\S]+content_mux_asset_unique[\s\S]+video_asset_id is not null/i);
  assert.match(migration, /on conflict \(video_asset_id\)[\s\S]+do nothing[\s\S]+Mux asset is already bound/i);
  assert.match(migration, /content_row\.video_provider = 'mux'[\s\S]+Mux provider identifiers are server-managed/i);
  assert.match(migration, /revoke all[\s\S]+from public, anon, authenticated, service_role/i);
  assert.match(migration, /grant execute[\s\S]+to service_role/i);
});

async function loadMuxServer() {
  const result = await build({
    entryPoints: [fileURLToPath(new URL("../lib/mux/server.ts", import.meta.url))],
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    plugins: [{
      name: "server-only-stub",
      setup(builder) {
        builder.onResolve({ filter: /^server-only$/ }, () => ({ path: "server-only", namespace: "stub" }));
        builder.onLoad({ filter: /.*/, namespace: "stub" }, () => ({ contents: "export {}" }));
      },
    }],
  });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
}

test("Mux session creation uses server credentials and signed playback without exposing them", async () => {
  const mux = await loadMuxServer();
  const originalFetch = globalThis.fetch;
  const originalId = process.env.MUX_TOKEN_ID;
  const originalSecret = process.env.MUX_TOKEN_SECRET;
  process.env.MUX_TOKEN_ID = "mux-token-unit-1234";
  process.env.MUX_TOKEN_SECRET = "mux-secret-unit-1234567890";
  let captured;
  globalThis.fetch = async (input, init) => {
    captured = { input: String(input), init };
    return Response.json({ data: {
      id: "MuxUploadIdentifier1234",
      url: "https://storage.googleapis.com/video-storage-us-east1-uploads/upload?Signature=signed",
      status: "waiting",
    } }, { status: 201 });
  };
  try {
    const upload = await mux.createMuxDirectUpload({
      title: "Aikido fundamentals",
      passthrough: "user-id:class-id",
    });
    assert.equal(upload.id, "MuxUploadIdentifier1234");
    assert.equal(captured.input, "https://api.mux.com/video/v1/uploads");
    assert.match(captured.init.headers.Authorization, /^Basic /);
    const body = JSON.parse(captured.init.body);
    assert.deepEqual(body.new_asset_settings.playback_policies, ["signed"]);
    assert.equal(body.new_asset_settings.video_quality, "basic");
    assert.equal(body.new_asset_settings.passthrough, "user-id:class-id");
    assert.doesNotMatch(JSON.stringify(upload), /mux-secret-unit/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalId === undefined) delete process.env.MUX_TOKEN_ID; else process.env.MUX_TOKEN_ID = originalId;
    if (originalSecret === undefined) delete process.env.MUX_TOKEN_SECRET; else process.env.MUX_TOKEN_SECRET = originalSecret;
  }
});

test("Mux failures are reduced to bounded categories without exposing provider details", async () => {
  const mux = await loadMuxServer();
  assert.equal(mux.muxFailureCategory(new Error("Mux API credentials are missing.")), "credentials_missing");
  assert.equal(mux.muxFailureCategory(new Error("Mux API request failed (401).")), "api_status_401");
  assert.equal(mux.muxFailureCategory(new Error("Mux API request failed (503).")), "api_status_503");
  assert.equal(mux.muxFailureCategory(new Error("secret provider response body")), "unknown");
  assert.equal(mux.muxFailureCategory({ message: "Mux API request failed (401)." }), "unknown");
});

test("signed playback JWT is RS256, short-lived and bound to the playback ID", async () => {
  const mux = await loadMuxServer();
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const oldId = process.env.MUX_SIGNING_KEY_ID;
  const oldPrivate = process.env.MUX_SIGNING_PRIVATE_KEY;
  process.env.MUX_SIGNING_KEY_ID = "MuxSigningIdentifier1234";
  process.env.MUX_SIGNING_PRIVATE_KEY = Buffer.from(
    privateKey.export({ type: "pkcs8", format: "pem" }),
  ).toString("base64");
  try {
    const playbackId = "MuxPlaybackIdentifier1234";
    const result = mux.signMuxPlaybackToken(playbackId, 300);
    const [headerPart, payloadPart, signaturePart] = result.token.split(".");
    const header = JSON.parse(Buffer.from(headerPart, "base64url").toString("utf8"));
    const payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8"));
    assert.deepEqual(header, { alg: "RS256", typ: "JWT", kid: "MuxSigningIdentifier1234" });
    assert.equal(payload.sub, playbackId);
    assert.equal(payload.aud, "v");
    assert.equal(payload.kid, "MuxSigningIdentifier1234");
    assert.ok(payload.exp > Math.floor(Date.now() / 1000));
    const verifier = createVerify("RSA-SHA256").update(`${headerPart}.${payloadPart}`).end();
    assert.equal(verifier.verify(publicKey, Buffer.from(signaturePart, "base64url")), true);
  } finally {
    if (oldId === undefined) delete process.env.MUX_SIGNING_KEY_ID; else process.env.MUX_SIGNING_KEY_ID = oldId;
    if (oldPrivate === undefined) delete process.env.MUX_SIGNING_PRIVATE_KEY; else process.env.MUX_SIGNING_PRIVATE_KEY = oldPrivate;
  }
});

test("Member playback obtains a server token while legacy YouTube remains readable", async () => {
  const page = await readFile(
    new URL("../app/(member)/repository/[classId]/[rankId]/[tierId]/page.tsx", import.meta.url),
    "utf8",
  );
  const player = await readFile(new URL("../components/mux-repository-player.tsx", import.meta.url), "utf8");
  assert.match(page, /normalizedProvider === "mux"[\s\S]+MuxRepositoryPlayer/);
  assert.match(page, /normalized === "youtube"[\s\S]+getYouTubeEmbedUrl/);
  assert.match(player, /\/api\/repository\/mux\/playback\//);
  assert.match(player, /tokens=\{\{ playback: authorization\.playbackToken \}\}/);
  assert.match(player, /disableTracking[\s\S]+disableCookies/);
});

test("Mux Draft finalization re-verifies provider state on the server", async () => {
  const route = await readFile(
    new URL("../app/api/repository/mux/uploads/[uploadId]/route.ts", import.meta.url),
    "utf8",
  );
  const desktop = await readFile(new URL("../desktop/js-video-uploader/src/auth.ts", import.meta.url), "utf8");
  assert.match(route, /export async function POST[\s\S]+authorizedReadyUpload[\s\S]+createAdminClient\(\)[\s\S]+create_repository_mux_content/);
  assert.match(route, /target_creator: auth\.user\.id/);
  assert.doesNotMatch(desktop, /\.rpc\("create_repository_mux_content"/);
  assert.match(desktop, /finalizeMuxUpload[\s\S]+\/api\/repository\/mux\/uploads\//);
});

test("Mux API failures keep provider and credential details out of server logs", async () => {
  const routes = await Promise.all([
    readFile(new URL("../app/api/repository/mux/uploads/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/repository/mux/uploads/[uploadId]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/repository/mux/playback/[contentId]/route.ts", import.meta.url), "utf8"),
  ]);
  for (const route of routes) {
    assert.doesNotMatch(route, /console\.error\([^;]*,\s*error\s*\)/);
  }
  assert.match(routes[0], /category:\s*muxFailureCategory\(error\)/);
});
