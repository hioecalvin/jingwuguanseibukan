import { listPackage, extractFile } from "@electron/asar";
import { readFile, stat } from "node:fs/promises";
import { parseEnv } from "node:util";
import assert from "node:assert/strict";
const archive = "release/win-unpacked/resources/app.asar";
const entries = listPackage(archive);
assert.ok(entries.includes("\\dist\\public-config.json") || entries.includes("/dist/public-config.json"));
assert.ok(!entries.some(path => /(^|[/\\])(?:\.env(?:\.|$)|tests|test-results|scripts)(?:[/\\]|$)/.test(path)));
const config = JSON.parse(extractFile(archive, "dist/public-config.json").toString());
assert.equal(config.url, "https://eomubndonbetszdbhsrj.supabase.co");
assert.equal(config.environment, "Staging");
assert.equal(config.siteUrl, "https://jingwuguanseibukan-staging.vercel.app");
assert.deepEqual(Object.keys(config).sort(), ["environment", "key", "siteUrl", "url"]);
assert.ok(entries.includes("\\dist\\public-config.json") || entries.includes("/dist/public-config.json"));
for (const path of ["release/win-unpacked/resources/ffmpeg/ffmpeg.exe", "release/win-unpacked/resources/ffmpeg/LICENSE.txt", "release/win-unpacked/resources/ffmpeg/README.txt"]) {
  const file = await stat(path);
  assert.ok(file.isFile() && file.size > 0, `Missing packaged resource: ${path}`);
}
const protectedValues = parseEnv(await readFile(process.argv[2], "utf8"));
const bytes = await readFile(archive);
for (const [name, value] of Object.entries(protectedValues)) {
  if (/SECRET|PASSWORD|SERVICE_ROLE|TOKEN/i.test(name) && value.length >= 12) assert.ok(!bytes.includes(Buffer.from(value)), "Protected credential found in package");
}
console.log("PASS: package has staging-only public configuration, bundled FFmpeg/license, and no protected credentials, environment files or test fixtures.");
