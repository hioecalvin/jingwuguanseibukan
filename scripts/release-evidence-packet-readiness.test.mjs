import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  EVIDENCE_KEYS,
  runCli,
  verifyEvidenceFiles,
} from "./release-evidence-packet-readiness.mjs";

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), "jingwuguan-release-packet-"));
  const evidenceFiles = {};
  const digests = {};
  for (const [index, key] of EVIDENCE_KEYS.entries()) {
    const path = join(directory, `${key}.json`);
    const bytes = Buffer.from(JSON.stringify({ manifestVersion: 1, key, sequence: index + 1 }));
    await writeFile(path, bytes);
    evidenceFiles[key] = path;
    digests[key] = createHash("sha256").update(bytes).digest("hex");
  }

  const releaseManifest = {
    recovery: { manifestSha256: digests.recovery },
    rollback: { manifestSha256: digests.rollback },
    gateEvidence: Object.fromEntries(
      EVIDENCE_KEYS.slice(2).map(key => [key, { manifestSha256: digests[key] }]),
    ),
  };
  const index = {
    manifestVersion: 1,
    releaseWindowManifest: join(directory, "release-window.json"),
    evidenceFiles,
  };
  await writeFile(index.releaseWindowManifest, JSON.stringify(releaseManifest));
  return { directory, evidenceFiles, index, releaseManifest };
}

test("binds all eleven distinct protected evidence files to the release manifest", async t => {
  const data = await fixture();
  t.after(() => rm(data.directory, { recursive: true, force: true }));
  const result = await verifyEvidenceFiles(data.index, data.releaseManifest);
  assert.equal(result.ready, true);
  assert.deepEqual(result.summary, { verifiedEvidenceFiles: 11 });
});

test("digest drift and reused evidence files fail closed", async t => {
  const data = await fixture();
  t.after(() => rm(data.directory, { recursive: true, force: true }));
  data.releaseManifest.rollback.manifestSha256 = "ab".repeat(32);
  data.index.evidenceFiles.monitoring = data.index.evidenceFiles.physicalSafari;
  const result = await verifyEvidenceFiles(data.index, data.releaseManifest);
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(item => item.path === "evidenceFiles.rollback"));
  assert.ok(result.blockers.some(item => item.path === "evidenceFiles"));
});

test("missing, in-repository and malformed JSON evidence cannot pass", async t => {
  const data = await fixture();
  t.after(() => rm(data.directory, { recursive: true, force: true }));

  data.index.evidenceFiles.providerDelivery = join(data.directory, "missing.json");
  data.index.evidenceFiles.emailScheduler = resolve("release/release-evidence-index.template.json");
  await writeFile(data.index.evidenceFiles.installerAcceptance, "[]");
  const result = await verifyEvidenceFiles(data.index, data.releaseManifest);
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(item => item.path === "evidenceFiles.providerDelivery"));
  assert.ok(result.blockers.some(item => item.path === "evidenceFiles.emailScheduler"));
  assert.ok(result.blockers.some(item => item.path === "evidenceFiles.installerAcceptance"));
});

test("network-share and control-character paths are rejected before file access", async t => {
  const data = await fixture();
  t.after(() => rm(data.directory, { recursive: true, force: true }));
  data.index.evidenceFiles.recovery = "\\\\server\\share\\evidence.json";
  data.index.evidenceFiles.rollback = "//server/share/evidence.json";
  data.index.evidenceFiles.physicalSafari = `${data.directory}\nunsafe.json`;
  const result = await verifyEvidenceFiles(data.index, data.releaseManifest);
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(item => item.path === "evidenceFiles.recovery"));
  assert.ok(result.blockers.some(item => item.path === "evidenceFiles.rollback"));
  assert.ok(result.blockers.some(item => item.path === "evidenceFiles.physicalSafari"));
});

test("the release manifest must exist outside the repository and cannot double as evidence", async t => {
  const data = await fixture();
  t.after(() => rm(data.directory, { recursive: true, force: true }));

  data.index.releaseWindowManifest = resolve("release/release-window-manifest.template.json");
  let result = await verifyEvidenceFiles(data.index, data.releaseManifest);
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(item => item.path === "releaseWindowManifest"));

  await writeFile(data.index.releaseWindowManifest = join(data.directory, "release-window.json"), JSON.stringify(data.releaseManifest));
  const bytes = await readFile(data.index.releaseWindowManifest);
  data.releaseManifest.recovery.manifestSha256 = createHash("sha256").update(bytes).digest("hex");
  data.index.evidenceFiles.recovery = data.index.releaseWindowManifest;
  await writeFile(data.index.releaseWindowManifest, JSON.stringify(data.releaseManifest));
  result = await verifyEvidenceFiles(data.index, data.releaseManifest);
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(item => item.path === "evidenceFiles.recovery" && /release-window/.test(item.message)));
});

test("a mismatched in-memory release manifest cannot be substituted for the protected file", async t => {
  const data = await fixture();
  t.after(() => rm(data.directory, { recursive: true, force: true }));
  data.releaseManifest.rollback.manifestSha256 = "ab".repeat(32);
  const result = await verifyEvidenceFiles(data.index, data.releaseManifest);
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(item => item.path === "releaseWindowManifest"));
});

test("the evidence index rejects missing and undocumented fields without echoing them", async t => {
  const data = await fixture();
  t.after(() => rm(data.directory, { recursive: true, force: true }));
  delete data.index.evidenceFiles.monitoring;
  data.index["private-person@example.test"] = "never echo this";
  const result = await verifyEvidenceFiles(data.index, data.releaseManifest);
  assert.equal(result.ready, false);
  const output = JSON.stringify(result);
  assert.doesNotMatch(output, /private-person|never echo/i);
  assert.match(output, /documented fields/);
});

test("checked-in template is incomplete and CLI refuses missing independent identity", async () => {
  const template = JSON.parse(
    await readFile(new URL("../release/release-evidence-index.template.json", import.meta.url), "utf8"),
  );
  const result = await verifyEvidenceFiles(template, {});
  assert.equal(result.ready, false);
  assert.equal(await runCli([]), 2);
});
