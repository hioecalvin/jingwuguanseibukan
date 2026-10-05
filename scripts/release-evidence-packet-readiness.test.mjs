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
import { calculateCutoverReviewDigest } from "./production-cutover-readiness.mjs";
import { calculateRollbackReviewDigest } from "./rollback-readiness.mjs";

const COMMIT = "ab".repeat(20);
const PREVIOUS_COMMIT = "cd".repeat(20);
const DEPLOYMENT = "dpl_candidate_123";
const PREVIOUS_DEPLOYMENT = "dpl_known_good_456";
const PROJECT = "abcdefghijklmnopqrst";

function rollbackEvidence() {
  const manifest = {
    manifestVersion: 1,
    policy: "jingwuguan-production-rollback-v1",
    release: { branch: "release/v1-readiness-20260918", commitSha: COMMIT, deploymentId: DEPLOYMENT, previousCommitSha: PREVIOUS_COMMIT, previousDeploymentId: PREVIOUS_DEPLOYMENT },
    rehearsal: { environment: "staging", origin: "https://jingwuguanseibukan-staging.vercel.app", supabaseProjectRef: "eomubndonbetszdbhsrj", startedAt: new Date(Date.now() - 1_380_000).toISOString(), completedAt: new Date(Date.now() - 900_000).toISOString(), candidateDeploymentVerified: true, knownGoodDeploymentActivated: true, authenticationPassed: true, authorizationPassed: true, hostProbesPassed: true, candidateRestoredAfterTest: true, evidenceBundleSha256: "12".repeat(32) },
    databaseRecovery: { strategy: "replacement-target-restore", sourceProjectRef: "eomubndonbetszdbhsrj", targetKind: "disposable-managed", backupSha256: "34".repeat(32), evidenceBundleSha256: "56".repeat(32), migrationLedger: "006-058", exactLedgerPassed: true, catalogPassed: true, databaseLintPassed: true, grantsAndRlsPassed: true, roleSecurityPassed: true, restoreCompleted: true, zeroResidueVerified: true },
    timings: { decisionDeadlineMinutes: 15, applicationRollbackMinutes: 8, databaseRecoveryMinutes: 75, rtoMinutes: 90, completedWithinRto: true },
    safety: { productionContacted: false, productionMutated: false, destructiveDownMigrationUsed: false, historicalDataRewritten: false, outboundProvidersContacted: false, temporaryTargetDeletedOrQuarantined: true },
    attestation: { recordedByRole: "release-operator", reviewedByRole: "independent-reviewer", reviewedAt: new Date(Date.now() - 900_000).toISOString(), evidenceReviewed: true, allFindingsResolved: true, reviewDigest: "" },
  };
  manifest.attestation.reviewDigest = calculateRollbackReviewDigest(manifest);
  return manifest;
}

function productionCutoverEvidence(windowStartsAt, windowEndsAt) {
  const capturedAt = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const reviewedAt = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const manifest = {
    manifestVersion: 1,
    policy: "jingwuguan-production-cutover-v1",
    release: { branch: "release/v1-readiness-20260918", commitSha: COMMIT, deploymentId: DEPLOYMENT, origin: "https://jingwuguanseibukan.com", windowStartsAt, windowEndsAt },
    target: { environment: "production", projectRef: PROJECT, region: "ap-southeast-1", supabaseOrigin: `https://${PROJECT}.supabase.co`, dashboardOwnershipVerified: true, dashboardRegionVerified: true },
    database: { capturedAt, migrationLedger: "006-058", exactLedgerPassed: true, catalogPassed: true, databaseLintPassed: true, securityVerifierPassed: true, grantsAndRlsPassed: true, evidenceSha256: "12".repeat(32) },
    defaultAcl: { capturedAt, status: "resolved", scope: "supabase-admin-future-object-default-acl-only", evidenceSha256: "23".repeat(32), exceptionReference: "not-applicable", exceptionExpiresAt: null, reviewedByRole: "independent-security-reviewer" },
    roleSecurity: { capturedAt, readOnly: true, memberPassed: true, scopedAdminPassed: true, superAdminPassed: true, reviewedExistingAccounts: true, authSessionWritesExpected: true, applicationMutationsAttempted: false, evidenceSha256: "34".repeat(32) },
    domain: { capturedAt, customDomain: "jingwuguanseibukan.com", dnsResolved: true, tlsValid: true, certificateHostname: "jingwuguanseibukan.com", supabaseSiteUrl: "https://jingwuguanseibukan.com", authConfirmRedirect: "https://jingwuguanseibukan.com/auth/confirm", publicConfigProjectRef: PROJECT, stagingResidueFound: false, retiredResidueFound: false, evidenceSha256: "45".repeat(32) },
    probes: { capturedAt, requiredHostProbes: 11, passedHostProbes: 11, browserAuthReadOnlyPassed: true, redirectsPassed: true, securityHeadersPassed: true, serverErrors: 0, applicationAcceptanceWrites: 0, evidenceSha256: "56".repeat(32) },
    safety: { acceptanceReadOnly: true, memberRecordsMutated: false, testAccountsCreated: false, outboundProvidersContacted: false, stagingContacted: false, retiredProjectContacted: false, rollbackDeploymentReachable: true },
    attestation: { recordedByRole: "production-release-operator", reviewedByRole: "independent-release-reviewer", reviewedAt, evidenceReviewed: true, allFindingsDispositioned: true, reviewDigest: "" },
  };
  manifest.attestation.reviewDigest = calculateCutoverReviewDigest(manifest);
  return manifest;
}

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), "jingwuguan-release-packet-"));
  const windowStartsAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const windowEndsAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const evidenceFiles = {};
  const digests = {};
  for (const [index, key] of EVIDENCE_KEYS.entries()) {
    const path = join(directory, `${key}.json`);
    const evidence = key === "rollback"
      ? rollbackEvidence()
      : key === "productionCutover"
        ? productionCutoverEvidence(windowStartsAt, windowEndsAt)
        : { manifestVersion: 1, key, sequence: index + 1 };
    const bytes = Buffer.from(JSON.stringify(evidence));
    await writeFile(path, bytes);
    evidenceFiles[key] = path;
    digests[key] = createHash("sha256").update(bytes).digest("hex");
  }

  const releaseManifest = {
    release: { scope: "web-and-windows-uploader", commitSha: COMMIT, deploymentId: DEPLOYMENT, previousCommitSha: PREVIOUS_COMMIT, previousDeploymentId: PREVIOUS_DEPLOYMENT },
    window: { startsAt: windowStartsAt, endsAt: windowEndsAt },
    recovery: { manifestSha256: digests.recovery },
    rollback: { manifestSha256: digests.rollback, decisionDeadlineMinutes: 15 },
    gateEvidence: Object.fromEntries(
      EVIDENCE_KEYS.slice(2).map(key => [key, { manifestSha256: digests[key] }]),
    ),
  };
  releaseManifest.gateEvidence.productionCutover = {
    manifestSha256: digests.productionCutover,
    result: "passed",
    environment: "production",
    projectRef: PROJECT,
    commitSha: COMMIT,
    deploymentId: DEPLOYMENT,
    origin: "https://jingwuguanseibukan.com",
    migrationLedger: "006-058",
    policy: "jingwuguan-production-cutover-v1",
  };
  const index = {
    manifestVersion: 1,
    releaseWindowManifest: join(directory, "release-window.json"),
    evidenceFiles,
  };
  await writeFile(index.releaseWindowManifest, JSON.stringify(releaseManifest));
  return { directory, evidenceFiles, index, releaseManifest };
}

test("binds all twelve distinct protected evidence files to the release manifest", async t => {
  const data = await fixture();
  t.after(() => rm(data.directory, { recursive: true, force: true }));
  const result = await verifyEvidenceFiles(data.index, data.releaseManifest, { expectedDeploymentId: DEPLOYMENT, expectedProductionProjectRef: PROJECT });
  assert.equal(result.ready, true, JSON.stringify(result.blockers));
  assert.deepEqual(result.summary, { verifiedEvidenceFiles: 12, semanticallyVerifiedEvidenceFiles: 2 });
});

test("hash-correct but semantically invalid production cutover evidence fails closed", async t => {
  const data = await fixture();
  t.after(() => rm(data.directory, { recursive: true, force: true }));
  const invalid = Buffer.from(JSON.stringify({ manifestVersion: 1, result: "passed" }));
  await writeFile(data.evidenceFiles.productionCutover, invalid);
  data.releaseManifest.gateEvidence.productionCutover.manifestSha256 = createHash("sha256").update(invalid).digest("hex");
  await writeFile(data.index.releaseWindowManifest, JSON.stringify(data.releaseManifest));
  const result = await verifyEvidenceFiles(data.index, data.releaseManifest, { expectedDeploymentId: DEPLOYMENT, expectedProductionProjectRef: PROJECT });
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(item => item.path.startsWith("evidenceFiles.productionCutover.")));
});

test("production cutover deployment cannot self-bind without independent packet identity", async t => {
  const data = await fixture();
  t.after(() => rm(data.directory, { recursive: true, force: true }));
  const result = await verifyEvidenceFiles(data.index, data.releaseManifest, {
    expectedDeploymentId: "dpl_independently_observed_other",
    expectedProductionProjectRef: PROJECT,
  });
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(item => item.path === "evidenceFiles.productionCutover.release.deploymentId"));
});

test("hash-correct but semantically invalid rollback evidence fails closed", async t => {
  const data = await fixture();
  t.after(() => rm(data.directory, { recursive: true, force: true }));
  const invalid = Buffer.from(JSON.stringify({ manifestVersion: 1, result: "passed" }));
  await writeFile(data.evidenceFiles.rollback, invalid);
  data.releaseManifest.rollback.manifestSha256 = createHash("sha256").update(invalid).digest("hex");
  await writeFile(data.index.releaseWindowManifest, JSON.stringify(data.releaseManifest));
  const result = await verifyEvidenceFiles(data.index, data.releaseManifest, { expectedDeploymentId: DEPLOYMENT, expectedProductionProjectRef: PROJECT });
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(item => item.path.startsWith("evidenceFiles.rollback.")));
});

test("hash-correct rollback identities cannot self-bind independently of the release record", async t => {
  const data = await fixture();
  t.after(() => rm(data.directory, { recursive: true, force: true }));

  const rollback = JSON.parse(await readFile(data.evidenceFiles.rollback, "utf8"));
  Object.assign(rollback.release, {
    commitSha: "ef".repeat(20),
    deploymentId: "dpl_substituted_candidate",
    previousCommitSha: "01".repeat(20),
    previousDeploymentId: "dpl_substituted_known_good",
  });
  rollback.attestation.reviewDigest = calculateRollbackReviewDigest(rollback);
  const bytes = Buffer.from(JSON.stringify(rollback));
  await writeFile(data.evidenceFiles.rollback, bytes);
  data.releaseManifest.rollback.manifestSha256 = createHash("sha256").update(bytes).digest("hex");
  await writeFile(data.index.releaseWindowManifest, JSON.stringify(data.releaseManifest));

  const result = await verifyEvidenceFiles(data.index, data.releaseManifest, { expectedDeploymentId: DEPLOYMENT, expectedProductionProjectRef: PROJECT });
  assert.equal(result.ready, false);
  for (const path of ["commitSha", "deploymentId", "previousCommitSha", "previousDeploymentId"]) {
    assert.ok(result.blockers.some(item => item.path === `evidenceFiles.rollback.release.${path}`), path);
  }
  assert.ok(!result.blockers.some(item => item.path === "evidenceFiles.rollback" && /SHA-256/.test(item.message)));
  assert.ok(!result.blockers.some(item => item.path === "evidenceFiles.rollback.attestation.reviewDigest"));
});

test("hash-correct rollback deadline must match the independent release record", async t => {
  const data = await fixture();
  t.after(() => rm(data.directory, { recursive: true, force: true }));

  const rollback = JSON.parse(await readFile(data.evidenceFiles.rollback, "utf8"));
  rollback.timings.decisionDeadlineMinutes = 30;
  rollback.attestation.reviewDigest = calculateRollbackReviewDigest(rollback);
  const bytes = Buffer.from(JSON.stringify(rollback));
  await writeFile(data.evidenceFiles.rollback, bytes);
  data.releaseManifest.rollback.manifestSha256 = createHash("sha256").update(bytes).digest("hex");
  await writeFile(data.index.releaseWindowManifest, JSON.stringify(data.releaseManifest));

  const result = await verifyEvidenceFiles(data.index, data.releaseManifest, { expectedDeploymentId: DEPLOYMENT, expectedProductionProjectRef: PROJECT });
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(item =>
    item.path === "evidenceFiles.rollback.timings.decisionDeadlineMinutes" &&
    /release manifest/.test(item.message),
  ), JSON.stringify(result.blockers));
  assert.ok(!result.blockers.some(item => item.path === "evidenceFiles.rollback" && /SHA-256/.test(item.message)));
  assert.ok(!result.blockers.some(item => item.path === "evidenceFiles.rollback.attestation.reviewDigest"));
});

test("digest drift and reused evidence files fail closed", async t => {
  const data = await fixture();
  t.after(() => rm(data.directory, { recursive: true, force: true }));
  data.releaseManifest.rollback.manifestSha256 = "ab".repeat(32);
  data.index.evidenceFiles.monitoring = data.index.evidenceFiles.physicalSafari;
  const result = await verifyEvidenceFiles(data.index, data.releaseManifest, { expectedDeploymentId: DEPLOYMENT, expectedProductionProjectRef: PROJECT });
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
  const result = await verifyEvidenceFiles(data.index, data.releaseManifest, { expectedDeploymentId: DEPLOYMENT, expectedProductionProjectRef: PROJECT });
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
  const result = await verifyEvidenceFiles(data.index, data.releaseManifest, { expectedDeploymentId: DEPLOYMENT, expectedProductionProjectRef: PROJECT });
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(item => item.path === "evidenceFiles.recovery"));
  assert.ok(result.blockers.some(item => item.path === "evidenceFiles.rollback"));
  assert.ok(result.blockers.some(item => item.path === "evidenceFiles.physicalSafari"));
});

test("the release manifest must exist outside the repository and cannot double as evidence", async t => {
  const data = await fixture();
  t.after(() => rm(data.directory, { recursive: true, force: true }));

  data.index.releaseWindowManifest = resolve("release/release-window-manifest.template.json");
  let result = await verifyEvidenceFiles(data.index, data.releaseManifest, { expectedDeploymentId: DEPLOYMENT, expectedProductionProjectRef: PROJECT });
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(item => item.path === "releaseWindowManifest"));

  await writeFile(data.index.releaseWindowManifest = join(data.directory, "release-window.json"), JSON.stringify(data.releaseManifest));
  const bytes = await readFile(data.index.releaseWindowManifest);
  data.releaseManifest.recovery.manifestSha256 = createHash("sha256").update(bytes).digest("hex");
  data.index.evidenceFiles.recovery = data.index.releaseWindowManifest;
  await writeFile(data.index.releaseWindowManifest, JSON.stringify(data.releaseManifest));
  result = await verifyEvidenceFiles(data.index, data.releaseManifest, { expectedDeploymentId: DEPLOYMENT, expectedProductionProjectRef: PROJECT });
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(item => item.path === "evidenceFiles.recovery" && /release-window/.test(item.message)));
});

test("a mismatched in-memory release manifest cannot be substituted for the protected file", async t => {
  const data = await fixture();
  t.after(() => rm(data.directory, { recursive: true, force: true }));
  data.releaseManifest.rollback.manifestSha256 = "ab".repeat(32);
  const result = await verifyEvidenceFiles(data.index, data.releaseManifest, { expectedDeploymentId: DEPLOYMENT, expectedProductionProjectRef: PROJECT });
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(item => item.path === "releaseWindowManifest"));
});

test("the evidence index rejects missing and undocumented fields without echoing them", async t => {
  const data = await fixture();
  t.after(() => rm(data.directory, { recursive: true, force: true }));
  delete data.index.evidenceFiles.monitoring;
  data.index["private-person@example.test"] = "never echo this";
  const result = await verifyEvidenceFiles(data.index, data.releaseManifest, { expectedDeploymentId: DEPLOYMENT, expectedProductionProjectRef: PROJECT });
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

async function webOnlyFixture() {
  const data = await fixture();
  data.releaseManifest.release.scope = "web-only";
  data.releaseManifest.approvals = { windowsUploaderWithheld: true };
  delete data.releaseManifest.gateEvidence.installerAcceptance;
  delete data.index.evidenceFiles.installerAcceptance;
  await writeFile(data.index.releaseWindowManifest, JSON.stringify(data.releaseManifest));
  return data;
}

test("web-only packet verifies eleven distinct files without accessing installer evidence", async t => {
  const data = await webOnlyFixture();
  t.after(() => rm(data.directory, { recursive: true, force: true }));
  const result = await verifyEvidenceFiles(data.index, data.releaseManifest, { expectedDeploymentId: DEPLOYMENT, expectedProductionProjectRef: PROJECT });
  assert.equal(result.ready, true, JSON.stringify(result.blockers));
  assert.deepEqual(result.summary, { verifiedEvidenceFiles: 11, semanticallyVerifiedEvidenceFiles: 2 });
});

test("web-only packet rejects missing web evidence and extra installer entries", async t => {
  const data = await webOnlyFixture();
  t.after(() => rm(data.directory, { recursive: true, force: true }));
  for (const key of Object.keys(data.index.evidenceFiles)) {
    const index = structuredClone(data.index);
    delete index.evidenceFiles[key];
    assert.equal((await verifyEvidenceFiles(index, data.releaseManifest, { expectedDeploymentId: DEPLOYMENT, expectedProductionProjectRef: PROJECT })).ready, false, key);
  }
  data.index.evidenceFiles.installerAcceptance = join(data.directory, "not-to-be-read.json");
  const result = await verifyEvidenceFiles(data.index, data.releaseManifest, { expectedDeploymentId: DEPLOYMENT, expectedProductionProjectRef: PROJECT });
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(item => item.path === "evidenceFiles"));
});

test("packet scope cannot be omitted, invented or used without distribution withholding", async t => {
  const data = await webOnlyFixture();
  t.after(() => rm(data.directory, { recursive: true, force: true }));
  for (const scope of [undefined, "unknown", "web-and-windows-uploader"]) {
    const manifest = structuredClone(data.releaseManifest);
    manifest.release.scope = scope;
    await writeFile(data.index.releaseWindowManifest, JSON.stringify(manifest));
    assert.equal((await verifyEvidenceFiles(data.index, manifest, { expectedDeploymentId: DEPLOYMENT, expectedProductionProjectRef: PROJECT })).ready, false);
  }
  delete data.releaseManifest.approvals.windowsUploaderWithheld;
  await writeFile(data.index.releaseWindowManifest, JSON.stringify(data.releaseManifest));
  assert.equal((await verifyEvidenceFiles(data.index, data.releaseManifest, { expectedDeploymentId: DEPLOYMENT, expectedProductionProjectRef: PROJECT })).ready, false);
});
