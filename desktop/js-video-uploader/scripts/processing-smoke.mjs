import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "node:module";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parseEnv } from "node:util";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const protectedValues = parseEnv(await readFile(process.argv[2], "utf8"));
await build({ entryPoints: ["src/auth.ts", "src/config.ts", "src/video-processing.ts"], outdir: "test-results/processing-modules", outExtension: { ".js": ".cjs" }, bundle: true, platform: "node", format: "cjs", packages: "external" });
const require = createRequire(import.meta.url);
const { DesktopAuth } = require("../test-results/processing-modules/auth.cjs");
const { publicConfig } = require("../test-results/processing-modules/config.cjs");
const { processVideo } = require("../test-results/processing-modules/video-processing.cjs");
const config = publicConfig({
  url: protectedValues.NEXT_PUBLIC_SUPABASE_URL,
  key: protectedValues.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || protectedValues.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  environment: "Staging",
  siteUrl: protectedValues.NEXT_PUBLIC_SITE_URL,
  googleClientId: null,
  youtubeChannelId: null,
});
assert.ok(config);
const auth = new DesktopAuth(config);
const root = await mkdtemp(join(tmpdir(), "js-uploader-processing-"));
const ffmpeg = resolve("node_modules/ffmpeg-static/ffmpeg.exe");
try {
  const access = await auth.signIn(protectedValues.SECURITY_TEST_SUPER_EMAIL, protectedValues.SECURITY_TEST_SUPER_PASSWORD);
  assert.ok(access.user, access.message);
  const selectedClass = access.user.classes.find(item => item.logoUrl);
  assert.ok(selectedClass?.logoUrl, "Staging needs at least one current class logo");
  const configuredClassLogo = new URL(selectedClass.logoUrl, config.siteUrl);
  const allowedLogoOrigins = new Set([new URL(config.siteUrl).origin, new URL(config.url).origin]);
  const classLogoUrl = allowedLogoOrigins.has(configuredClassLogo.origin) ? configuredClassLogo.toString() : `${config.siteUrl}/js-logo.jpeg`;
  if (classLogoUrl !== configuredClassLogo.toString()) console.log(`BLOCKER: ${selectedClass.name} still references the retired class-logo origin ${configuredClassLogo.origin}; the smoke test will not contact it.`);
  const input = join(root, "source.mp4");
  const generated = spawnSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "color=c=navy:s=640x360:d=2", "-f", "lavfi", "-i", "sine=frequency=440:duration=2", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", input], { windowsHide: true, encoding: "utf8" });
  assert.equal(generated.status, 0, generated.stderr);
  const processed = await processVideo({
    inputPath: input,
    tempRoot: root,
    ffmpegPath: ffmpeg,
    organisationLogoUrl: `${config.siteUrl}/js-logo.jpeg`,
    classLogoUrl,
    siteUrl: config.siteUrl,
    supabaseUrl: config.url,
    signal: new AbortController().signal,
    progress: () => undefined,
  });
  const output = await stat(processed.outputPath);
  assert.ok(output.size > 1_000, "Processed video is unexpectedly small");
  const decoded = spawnSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-i", processed.outputPath, "-f", "null", "-"], { windowsHide: true, encoding: "utf8" });
  assert.equal(decoded.status, 0, decoded.stderr);
  await processed.cleanup();
  console.log(`PASS: local FFmpeg processed and decoded a synthetic two-watermark video${classLogoUrl === configuredClassLogo.toString() ? ` using the current ${selectedClass.name} logo` : " using the trusted JS logo in both positions"}.`);
} finally {
  await auth.signOut();
  await rm(root, { recursive: true, force: true });
}
