import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  calculateCutoverReviewDigest,
  evaluateProductionCutoverReadiness,
  readProtectedCutoverManifest,
  runCli,
} from "./production-cutover-readiness.mjs";

const NOW = Date.parse("2026-10-02T11:15:00+10:00");
const COMMIT = "ab".repeat(20);
const DEPLOYMENT = "dpl_production_candidate_123";
const PROJECT = "abcdefghijklmnopqrst";
const WINDOW_START = "2026-10-02T08:30:00+10:00";
const WINDOW_END = "2026-10-02T11:30:00+10:00";

export function validCutoverManifest() {
  const manifest = {
    manifestVersion: 1,
    policy: "jingwuguan-production-cutover-v1",
    release: { branch: "release/v1-readiness-20260918", commitSha: COMMIT, deploymentId: DEPLOYMENT, origin: "https://jingwuguanseibukan.com", windowStartsAt: WINDOW_START, windowEndsAt: WINDOW_END },
    target: { environment: "production", projectRef: PROJECT, region: "ap-southeast-1", supabaseOrigin: `https://${PROJECT}.supabase.co`, dashboardOwnershipVerified: true, dashboardRegionVerified: true },
    database: { capturedAt: "2026-10-02T09:00:00+10:00", migrationLedger: "006-056", exactLedgerPassed: true, catalogPassed: true, databaseLintPassed: true, securityVerifierPassed: true, grantsAndRlsPassed: true, evidenceSha256: "12".repeat(32) },
    defaultAcl: { capturedAt: "2026-10-02T09:15:00+10:00", status: "resolved", scope: "supabase-admin-future-object-default-acl-only", evidenceSha256: "23".repeat(32), exceptionReference: "not-applicable", exceptionExpiresAt: null, reviewedByRole: "independent-security-reviewer" },
    roleSecurity: { capturedAt: "2026-10-02T09:30:00+10:00", readOnly: true, memberPassed: true, scopedAdminPassed: true, superAdminPassed: true, reviewedExistingAccounts: true, authSessionWritesExpected: true, applicationMutationsAttempted: false, evidenceSha256: "34".repeat(32) },
    domain: { capturedAt: "2026-10-02T10:00:00+10:00", customDomain: "jingwuguanseibukan.com", dnsResolved: true, tlsValid: true, certificateHostname: "jingwuguanseibukan.com", supabaseSiteUrl: "https://jingwuguanseibukan.com", authConfirmRedirect: "https://jingwuguanseibukan.com/auth/confirm", publicConfigProjectRef: PROJECT, stagingResidueFound: false, retiredResidueFound: false, evidenceSha256: "45".repeat(32) },
    probes: { capturedAt: "2026-10-02T10:30:00+10:00", requiredHostProbes: 11, passedHostProbes: 11, browserAuthReadOnlyPassed: true, redirectsPassed: true, securityHeadersPassed: true, serverErrors: 0, applicationAcceptanceWrites: 0, evidenceSha256: "56".repeat(32) },
    safety: { acceptanceReadOnly: true, memberRecordsMutated: false, testAccountsCreated: false, outboundProvidersContacted: false, stagingContacted: false, retiredProjectContacted: false, rollbackDeploymentReachable: true },
    attestation: { recordedByRole: "production-release-operator", reviewedByRole: "independent-release-reviewer", reviewedAt: "2026-10-02T11:00:00+10:00", evidenceReviewed: true, allFindingsDispositioned: true, reviewDigest: "" },
  };
  manifest.attestation.reviewDigest = calculateCutoverReviewDigest(manifest);
  return manifest;
}

function options(overrides = {}) { return { expectedCommit: COMMIT, expectedDeploymentId: DEPLOYMENT, expectedProductionProjectRef: PROJECT, expectedWindowStartsAt: WINDOW_START, expectedWindowEndsAt: WINDOW_END, now: NOW, ...overrides }; }

test("complete fresh read-only production cutover evidence passes", () => {
  const result = evaluateProductionCutoverReadiness(validCutoverManifest(), options());
  assert.equal(result.ready, true, JSON.stringify(result.blockers));
  assert.equal(result.summary.migrationLedger, "006-056");
  assert.equal(result.summary.defaultAclStatus, "resolved");
});

test("checked-in template fails closed", async () => {
  const template = JSON.parse(await readFile(new URL("../release/production-cutover-evidence.template.json", import.meta.url), "utf8"));
  const result = evaluateProductionCutoverReadiness(template, options());
  assert.equal(result.ready, false);
  for (const path of ["release.commitSha", "target.projectRef", "database.exactLedgerPassed", "roleSecurity.readOnly", "domain.dnsResolved", "probes.passedHostProbes", "safety.acceptanceReadOnly", "attestation.reviewDigest"]) assert.ok(result.blockers.some(blocker => blocker.path === path), path);
});

test("independent commit, deployment and production project bindings are required", () => {
  const result = evaluateProductionCutoverReadiness(validCutoverManifest(), options({ expectedCommit: "cd".repeat(20), expectedDeploymentId: "dpl_other_456", expectedProductionProjectRef: "zyxwvutsrqponmlkjihg" }));
  assert.equal(result.ready, false);
  for (const path of ["release.commitSha", "release.deploymentId", "target.projectRef", "target.supabaseOrigin", "domain.publicConfigProjectRef"]) assert.ok(result.blockers.some(blocker => blocker.path === path));
});

test("database ledger, lint, security verifier, grants and RLS all fail closed", () => {
  const manifest = validCutoverManifest();
  Object.assign(manifest.database, { migrationLedger: "006-055", exactLedgerPassed: false, databaseLintPassed: false, securityVerifierPassed: false, grantsAndRlsPassed: false });
  manifest.attestation.reviewDigest = calculateCutoverReviewDigest(manifest);
  const result = evaluateProductionCutoverReadiness(manifest, options());
  assert.equal(result.ready, false);
  for (const path of ["database.migrationLedger", "database.exactLedgerPassed", "database.databaseLintPassed", "database.securityVerifierPassed", "database.grantsAndRlsPassed"]) assert.ok(result.blockers.some(blocker => blocker.path === path));
});

test("default ACL requires resolution or a narrow current exception", () => {
  const invalid = validCutoverManifest();
  Object.assign(invalid.defaultAcl, { status: "ignored", exceptionReference: "broad", exceptionExpiresAt: "2027-01-01T00:00:00+10:00" });
  invalid.attestation.reviewDigest = calculateCutoverReviewDigest(invalid);
  assert.equal(evaluateProductionCutoverReadiness(invalid, options()).ready, false);

  const accepted = validCutoverManifest();
  Object.assign(accepted.defaultAcl, { status: "time-bounded-exception", exceptionReference: "risk-acceptance-2026-10", exceptionExpiresAt: "2026-10-20T00:00:00+10:00" });
  accepted.attestation.reviewDigest = calculateCutoverReviewDigest(accepted);
  assert.equal(evaluateProductionCutoverReadiness(accepted, options()).ready, true);
});

test("default ACL evidence must be fresh and reviewed after capture", () => {
  const stale = validCutoverManifest();
  stale.defaultAcl.capturedAt = "2026-09-30T09:00:00+10:00";
  stale.attestation.reviewDigest = calculateCutoverReviewDigest(stale);
  let result = evaluateProductionCutoverReadiness(stale, options());
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(blocker => blocker.path === "defaultAcl.capturedAt"));

  const afterReview = validCutoverManifest();
  afterReview.defaultAcl.capturedAt = "2026-10-02T11:30:00+10:00";
  afterReview.attestation.reviewDigest = calculateCutoverReviewDigest(afterReview);
  result = evaluateProductionCutoverReadiness(afterReview, options());
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(blocker => blocker.path === "attestation.reviewedAt"));
});

test("role acceptance is dedicated, read-only and covers all three roles", () => {
  const manifest = validCutoverManifest();
  Object.assign(manifest.roleSecurity, { readOnly: false, memberPassed: false, scopedAdminPassed: false, superAdminPassed: false, reviewedExistingAccounts: false, authSessionWritesExpected: false, applicationMutationsAttempted: true });
  manifest.attestation.reviewDigest = calculateCutoverReviewDigest(manifest);
  const result = evaluateProductionCutoverReadiness(manifest, options());
  assert.equal(result.ready, false);
  for (const path of ["roleSecurity.readOnly", "roleSecurity.memberPassed", "roleSecurity.scopedAdminPassed", "roleSecurity.superAdminPassed", "roleSecurity.reviewedExistingAccounts", "roleSecurity.authSessionWritesExpected", "roleSecurity.applicationMutationsAttempted"]) assert.ok(result.blockers.some(blocker => blocker.path === path));
});

test("custom domain, TLS, redirects and public configuration must be production exact", () => {
  const manifest = validCutoverManifest();
  Object.assign(manifest.domain, { customDomain: "staging.example.test", dnsResolved: false, tlsValid: false, supabaseSiteUrl: "https://staging.example.test", authConfirmRedirect: "https://staging.example.test/auth/confirm", publicConfigProjectRef: "eomubndonbetszdbhsrj", stagingResidueFound: true, retiredResidueFound: true });
  manifest.attestation.reviewDigest = calculateCutoverReviewDigest(manifest);
  const result = evaluateProductionCutoverReadiness(manifest, options());
  assert.equal(result.ready, false);
  for (const path of ["domain.customDomain", "domain.dnsResolved", "domain.tlsValid", "domain.supabaseSiteUrl", "domain.authConfirmRedirect", "domain.publicConfigProjectRef", "domain.stagingResidueFound", "domain.retiredResidueFound"]) assert.ok(result.blockers.some(blocker => blocker.path === path));
});

test("all eleven host probes and read-only browser acceptance are mandatory", () => {
  const manifest = validCutoverManifest();
  Object.assign(manifest.probes, { passedHostProbes: 10, browserAuthReadOnlyPassed: false, redirectsPassed: false, securityHeadersPassed: false, serverErrors: 1, applicationAcceptanceWrites: 1 });
  manifest.attestation.reviewDigest = calculateCutoverReviewDigest(manifest);
  const result = evaluateProductionCutoverReadiness(manifest, options());
  assert.equal(result.ready, false);
  for (const path of ["probes.passedHostProbes", "probes.browserAuthReadOnlyPassed", "probes.redirectsPassed", "probes.securityHeadersPassed", "probes.serverErrors", "probes.applicationAcceptanceWrites"]) assert.ok(result.blockers.some(blocker => blocker.path === path));
});

test("acceptance cannot mutate records, create accounts, contact providers, staging or retired", () => {
  const manifest = validCutoverManifest();
  Object.assign(manifest.safety, { acceptanceReadOnly: false, memberRecordsMutated: true, testAccountsCreated: true, outboundProvidersContacted: true, stagingContacted: true, retiredProjectContacted: true, rollbackDeploymentReachable: false });
  manifest.attestation.reviewDigest = calculateCutoverReviewDigest(manifest);
  const result = evaluateProductionCutoverReadiness(manifest, options());
  assert.equal(result.ready, false);
  for (const key of Object.keys(manifest.safety)) assert.ok(result.blockers.some(blocker => blocker.path === `safety.${key}`));
});

test("fresh ordered evidence and canonical review bind the complete record", () => {
  const stale = validCutoverManifest();
  stale.database.capturedAt = "2026-09-01T09:00:00+10:00";
  stale.attestation.reviewedAt = "2026-10-02T09:15:00+10:00";
  stale.attestation.reviewDigest = calculateCutoverReviewDigest(stale);
  let result = evaluateProductionCutoverReadiness(stale, options());
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(blocker => blocker.path === "database.capturedAt"));
  assert.ok(result.blockers.some(blocker => blocker.path === "attestation.reviewedAt"));

  const altered = validCutoverManifest();
  altered.probes.serverErrors = 1;
  result = evaluateProductionCutoverReadiness(altered, options());
  assert.ok(result.blockers.some(blocker => blocker.path === "attestation.reviewDigest"));
});

test("every capture and review must fall inside the independently supplied release window", () => {
  const before = validCutoverManifest();
  before.database.capturedAt = "2026-10-02T08:00:00+10:00";
  before.attestation.reviewDigest = calculateCutoverReviewDigest(before);
  let result = evaluateProductionCutoverReadiness(before, options());
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(blocker => blocker.path === "database.capturedAt" && /release window/.test(blocker.message)));

  const mismatched = validCutoverManifest();
  mismatched.release.windowEndsAt = "2026-10-02T12:00:00+10:00";
  mismatched.attestation.reviewDigest = calculateCutoverReviewDigest(mismatched);
  result = evaluateProductionCutoverReadiness(mismatched, options());
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(blocker => blocker.path === "release.windowEndsAt"));

  result = evaluateProductionCutoverReadiness(validCutoverManifest(), options({ now: Date.parse("2026-10-02T12:00:00+10:00") }));
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(blocker => blocker.path === "expectedWindowEndsAt" && /within/.test(blocker.message)));
});

test("evidence hashes are distinct and unknown or sensitive fields never leak", () => {
  const manifest = validCutoverManifest();
  manifest.probes.evidenceSha256 = manifest.database.evidenceSha256;
  manifest.notes = "private-person@example.test";
  manifest.attestation.token = "Bearer private-token";
  manifest.attestation.reviewDigest = calculateCutoverReviewDigest(manifest);
  const result = evaluateProductionCutoverReadiness(manifest, options());
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(blocker => blocker.path === "probes.evidenceSha256"));
  assert.ok(result.blockers.some(blocker => blocker.path === "$"));
  assert.doesNotMatch(JSON.stringify(result), /private-person|private-token|notes/);
});

test("protected input enforcement and digest generation are operator-usable", async t => {
  const repositoryResult = await readProtectedCutoverManifest(resolve("release/production-cutover-evidence.template.json"));
  assert.match(repositoryResult.error, /outside the repository/);
  const directory = await mkdtemp(join(tmpdir(), "jingwuguan-cutover-review-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const path = join(directory, "production-cutover.json");
  const manifest = validCutoverManifest();
  const capturedAt = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  manifest.release.windowStartsAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  manifest.release.windowEndsAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  manifest.database.capturedAt = capturedAt;
  manifest.defaultAcl.capturedAt = capturedAt;
  manifest.roleSecurity.capturedAt = capturedAt;
  manifest.domain.capturedAt = capturedAt;
  manifest.probes.capturedAt = capturedAt;
  manifest.attestation.reviewedAt = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  manifest.attestation.reviewDigest = "REPLACE_WITH_CANONICAL_64_CHARACTER_SHA256";
  await writeFile(path, JSON.stringify(manifest));
  const output = [];
  const originalLog = console.log;
  console.log = value => output.push(String(value));
  try {
    assert.equal(await runCli([`--manifest=${path}`, `--expected-commit=${COMMIT}`, `--expected-deployment-id=${DEPLOYMENT}`, `--expected-production-project-ref=${PROJECT}`, `--expected-window-starts-at=${manifest.release.windowStartsAt}`, `--expected-window-ends-at=${manifest.release.windowEndsAt}`, "--print-review-digest"]), 0);
  } finally { console.log = originalLog; }
  assert.equal(output.length, 1);
  assert.match(output[0], /^[a-f0-9]{64}$/);
});
