import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  calculateRollbackReviewDigest,
  evaluateRollbackReadiness,
  readProtectedRollbackManifest,
  runCli,
} from "./rollback-readiness.mjs";

const NOW = Date.parse("2026-10-01T12:00:00+10:00");
const COMMIT = "ab".repeat(20);
const PREVIOUS_COMMIT = "cd".repeat(20);
const DEPLOYMENT = "dpl_candidate_123";
const PREVIOUS_DEPLOYMENT = "dpl_known_good_456";

export function validRollbackManifest() {
  const manifest = {
    manifestVersion: 1,
    policy: "jingwuguan-production-rollback-v1",
    release: {
      branch: "release/v1-readiness-20260918",
      commitSha: COMMIT,
      deploymentId: DEPLOYMENT,
      previousCommitSha: PREVIOUS_COMMIT,
      previousDeploymentId: PREVIOUS_DEPLOYMENT,
    },
    rehearsal: {
      environment: "staging",
      origin: "https://jingwuguanseibukan-staging.vercel.app",
      supabaseProjectRef: "eomubndonbetszdbhsrj",
      startedAt: "2026-10-01T09:52:00+10:00",
      completedAt: "2026-10-01T10:00:00+10:00",
      candidateDeploymentVerified: true,
      knownGoodDeploymentActivated: true,
      authenticationPassed: true,
      authorizationPassed: true,
      hostProbesPassed: true,
      candidateRestoredAfterTest: true,
      evidenceBundleSha256: "12".repeat(32),
    },
    databaseRecovery: {
      strategy: "replacement-target-restore",
      sourceProjectRef: "eomubndonbetszdbhsrj",
      targetKind: "disposable-managed",
      backupSha256: "34".repeat(32),
      evidenceBundleSha256: "56".repeat(32),
      migrationLedger: "006-056",
      exactLedgerPassed: true,
      catalogPassed: true,
      databaseLintPassed: true,
      grantsAndRlsPassed: true,
      roleSecurityPassed: true,
      restoreCompleted: true,
      zeroResidueVerified: true,
    },
    timings: {
      decisionDeadlineMinutes: 15,
      applicationRollbackMinutes: 8,
      databaseRecoveryMinutes: 75,
      rtoMinutes: 90,
      completedWithinRto: true,
    },
    safety: {
      productionContacted: false,
      productionMutated: false,
      destructiveDownMigrationUsed: false,
      historicalDataRewritten: false,
      outboundProvidersContacted: false,
      temporaryTargetDeletedOrQuarantined: true,
    },
    attestation: {
      recordedByRole: "release-operator",
      reviewedByRole: "independent-reviewer",
      reviewedAt: "2026-10-01T11:00:00+10:00",
      evidenceReviewed: true,
      allFindingsResolved: true,
      reviewDigest: "",
    },
  };
  manifest.attestation.reviewDigest = calculateRollbackReviewDigest(manifest);
  return manifest;
}

function options(overrides = {}) {
  return {
    expectedCommit: COMMIT,
    expectedDeploymentId: DEPLOYMENT,
    expectedPreviousCommit: PREVIOUS_COMMIT,
    expectedPreviousDeploymentId: PREVIOUS_DEPLOYMENT,
    now: NOW,
    ...overrides,
  };
}

test("reviewed application rollback and replacement-target recovery evidence passes", () => {
  const result = evaluateRollbackReadiness(validRollbackManifest(), options());
  assert.equal(result.ready, true, JSON.stringify(result.blockers));
  assert.equal(result.summary.commitSha, COMMIT);
  assert.equal(result.summary.databaseRecoveryTested, true);
});

test("checked-in template fails closed", async () => {
  const template = JSON.parse(await readFile(new URL("../release/rollback-evidence.template.json", import.meta.url), "utf8"));
  const result = evaluateRollbackReadiness(template, options());
  assert.equal(result.ready, false);
  for (const path of ["release.commitSha", "rehearsal.candidateDeploymentVerified", "databaseRecovery.restoreCompleted", "timings.completedWithinRto", "safety.temporaryTargetDeletedOrQuarantined", "attestation.reviewDigest"]) {
    assert.ok(result.blockers.some(blocker => blocker.path === path), path);
  }
});

test("independent release and known-good identities are mandatory", () => {
  const result = evaluateRollbackReadiness(validRollbackManifest(), options({
    expectedCommit: "ef".repeat(20),
    expectedDeploymentId: "dpl_other",
    expectedPreviousCommit: "01".repeat(20),
    expectedPreviousDeploymentId: "dpl_other_previous",
  }));
  assert.equal(result.ready, false);
  for (const path of ["release.commitSha", "release.deploymentId", "release.previousCommitSha", "release.previousDeploymentId"]) assert.ok(result.blockers.some(blocker => blocker.path === path));
});

test("application rehearsal must restore the candidate and pass auth, authorization and host probes", () => {
  const manifest = validRollbackManifest();
  Object.assign(manifest.rehearsal, { knownGoodDeploymentActivated: false, authenticationPassed: false, authorizationPassed: false, hostProbesPassed: false, candidateRestoredAfterTest: false });
  manifest.attestation.reviewDigest = calculateRollbackReviewDigest(manifest);
  const result = evaluateRollbackReadiness(manifest, options());
  assert.equal(result.ready, false);
  for (const key of ["knownGoodDeploymentActivated", "authenticationPassed", "authorizationPassed", "hostProbesPassed", "candidateRestoredAfterTest"]) assert.ok(result.blockers.some(blocker => blocker.path === `rehearsal.${key}`));
});

test("database rollback requires replacement restore, full security evidence and zero residue", () => {
  const manifest = validRollbackManifest();
  Object.assign(manifest.databaseRecovery, { strategy: "down-migration", migrationLedger: "006-055", exactLedgerPassed: false, databaseLintPassed: false, grantsAndRlsPassed: false, roleSecurityPassed: false, zeroResidueVerified: false });
  manifest.attestation.reviewDigest = calculateRollbackReviewDigest(manifest);
  const result = evaluateRollbackReadiness(manifest, options());
  assert.equal(result.ready, false);
  for (const path of ["databaseRecovery.strategy", "databaseRecovery.migrationLedger", "databaseRecovery.exactLedgerPassed", "databaseRecovery.databaseLintPassed", "databaseRecovery.grantsAndRlsPassed", "databaseRecovery.roleSecurityPassed", "databaseRecovery.zeroResidueVerified"]) assert.ok(result.blockers.some(blocker => blocker.path === path));
});

test("timing evidence must meet the decision deadline and RTO", () => {
  const manifest = validRollbackManifest();
  Object.assign(manifest.timings, { decisionDeadlineMinutes: 4, applicationRollbackMinutes: 20, databaseRecoveryMinutes: 100, rtoMinutes: 90, completedWithinRto: false });
  manifest.attestation.reviewDigest = calculateRollbackReviewDigest(manifest);
  const result = evaluateRollbackReadiness(manifest, options());
  assert.equal(result.ready, false);
  for (const path of ["timings.decisionDeadlineMinutes", "timings.applicationRollbackMinutes", "timings.databaseRecoveryMinutes", "timings.completedWithinRto"]) assert.ok(result.blockers.some(blocker => blocker.path === path));
});

test("timestamps reject normalized calendar dates and timing claims shorter than the rehearsal", () => {
  const invalidDate = validRollbackManifest();
  invalidDate.rehearsal.startedAt = "2026-09-31T09:52:00+10:00";
  invalidDate.attestation.reviewDigest = calculateRollbackReviewDigest(invalidDate);
  let result = evaluateRollbackReadiness(invalidDate, options());
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(blocker => blocker.path === "rehearsal.startedAt"));

  const understatedDuration = validRollbackManifest();
  understatedDuration.rehearsal.startedAt = "2026-10-01T09:51:59+10:00";
  understatedDuration.attestation.reviewDigest = calculateRollbackReviewDigest(understatedDuration);
  result = evaluateRollbackReadiness(understatedDuration, options());
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(blocker => blocker.path === "timings.applicationRollbackMinutes"));
});

test("deployment identities must be exact Vercel IDs and evidence digests must be independent", () => {
  const weakIdentities = evaluateRollbackReadiness(validRollbackManifest(), options({
    expectedDeploymentId: "candidate",
    expectedPreviousDeploymentId: "known-good",
  }));
  assert.equal(weakIdentities.ready, false);
  assert.ok(weakIdentities.blockers.some(blocker => blocker.path === "expectedDeploymentId"));
  assert.ok(weakIdentities.blockers.some(blocker => blocker.path === "expectedPreviousDeploymentId"));

  const reusedEvidence = validRollbackManifest();
  reusedEvidence.databaseRecovery.backupSha256 = reusedEvidence.rehearsal.evidenceBundleSha256;
  reusedEvidence.databaseRecovery.evidenceBundleSha256 = reusedEvidence.rehearsal.evidenceBundleSha256;
  reusedEvidence.attestation.reviewDigest = calculateRollbackReviewDigest(reusedEvidence);
  const result = evaluateRollbackReadiness(reusedEvidence, options());
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(blocker => blocker.path === "databaseRecovery.backupSha256"));
  assert.ok(result.blockers.some(blocker => blocker.path === "databaseRecovery.evidenceBundleSha256"));
});

test("production/provider contact and destructive recovery fail closed", () => {
  const manifest = validRollbackManifest();
  Object.assign(manifest.safety, { productionContacted: true, productionMutated: true, destructiveDownMigrationUsed: true, historicalDataRewritten: true, outboundProvidersContacted: true });
  manifest.attestation.reviewDigest = calculateRollbackReviewDigest(manifest);
  const result = evaluateRollbackReadiness(manifest, options());
  assert.equal(result.ready, false);
  for (const key of ["productionContacted", "productionMutated", "destructiveDownMigrationUsed", "historicalDataRewritten", "outboundProvidersContacted"]) assert.ok(result.blockers.some(blocker => blocker.path === `safety.${key}`));
});

test("review digest binds every accepted field", () => {
  const manifest = validRollbackManifest();
  const originalDigest = manifest.attestation.reviewDigest;
  const leaves = [];
  function collect(value, path = []) {
    if (value !== null && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) {
        if (path.length === 1 && path[0] === "attestation" && key === "reviewDigest") continue;
        collect(child, [...path, key]);
      }
    } else {
      leaves.push(path);
    }
  }
  collect(manifest);

  for (const path of leaves) {
    const changed = structuredClone(manifest);
    const parent = path.slice(0, -1).reduce((value, key) => value[key], changed);
    const key = path.at(-1);
    if (typeof parent[key] === "boolean") parent[key] = !parent[key];
    else if (typeof parent[key] === "number") parent[key] += 1;
    else parent[key] = `${parent[key]}-changed`;
    assert.notEqual(calculateRollbackReviewDigest(changed), originalDigest, path.join("."));
  }

  manifest.timings.applicationRollbackMinutes = 9;
  const result = evaluateRollbackReadiness(manifest, options());
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(blocker => blocker.path === "attestation.reviewDigest"));
});

test("unknown fields and sensitive values are rejected without echoing them", () => {
  const manifest = validRollbackManifest();
  manifest.notes = "private-person@example.test";
  manifest.attestation.token = "Bearer private-token";
  const result = evaluateRollbackReadiness(manifest, options());
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(blocker => blocker.path === "$"));
  assert.ok(result.blockers.some(blocker => blocker.path.includes("[field]")));
  assert.doesNotMatch(JSON.stringify(result), /private-person|private-token|notes/);
});

test("protected input enforcement rejects repository files and review digest mode is operator-usable", async t => {
  const repositoryResult = await readProtectedRollbackManifest(resolve("release/rollback-evidence.template.json"));
  assert.match(repositoryResult.error, /outside the repository/);

  const directory = await mkdtemp(join(tmpdir(), "jingwuguan-rollback-review-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const path = join(directory, "rollback-evidence.json");
  const manifest = validRollbackManifest();
  manifest.attestation.reviewDigest = "REPLACE_WITH_CANONICAL_64_CHARACTER_SHA256";
  await writeFile(path, JSON.stringify(manifest));

  const output = [];
  const originalLog = console.log;
  console.log = value => output.push(String(value));
  try {
    const code = await runCli([
      `--manifest=${path}`,
      `--expected-commit=${COMMIT}`,
      `--expected-deployment-id=${DEPLOYMENT}`,
      `--expected-previous-commit=${PREVIOUS_COMMIT}`,
      `--expected-previous-deployment-id=${PREVIOUS_DEPLOYMENT}`,
      "--print-review-digest",
    ]);
    assert.equal(code, 0);
  } finally {
    console.log = originalLog;
  }
  assert.match(output[0], /^[a-f0-9]{64}$/);
  assert.equal(output.length, 1);
});
