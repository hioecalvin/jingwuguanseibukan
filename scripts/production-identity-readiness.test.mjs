import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateProductionIdentityDigests,
  evaluateProductionIdentityEvidence,
  PRODUCTION_IDENTITY_POLICY,
} from "./production-identity-readiness.mjs";

const PROJECT_REF = "abcdefghijklmnopqrst";
const NOW = Date.parse("2026-10-01T06:30:00Z");
const AUTH_DIGEST = "12".repeat(32);
const DATABASE_DIGEST = "34".repeat(32);

function validManifest() {
  const manifest = {
    schemaVersion: 1,
    environment: "production",
    projectRef: PROJECT_REF,
    classificationPolicy: PRODUCTION_IDENTITY_POLICY,
    authEvidence: {
      source: "supabase-auth-admin-api",
      collectorRole: "auth-inventory-collector",
      projectRef: PROJECT_REF,
      capturedAt: "2026-10-01T06:00:00Z",
      inventoryComplete: true,
      paginationComplete: true,
      snapshotSha256: AUTH_DIGEST,
      inventoryQueryVersion: "auth-inventory-v1",
      collectorFingerprint: "56".repeat(32),
      provenanceSha256: "12".repeat(32),
      totalAccounts: 12,
      classifications: {
        dummyMetadata: 0,
        dummyDomain: 0,
        reservedDomain: 0,
        securityTest: 0,
        testMarker: 0,
        unreviewed: 0,
      },
    },
    databaseEvidence: {
      source: "postgres-owner-read-only",
      collectorRole: "database-identity-collector",
      projectRef: PROJECT_REF,
      capturedAt: "2026-10-01T06:04:00Z",
      inventoryComplete: true,
      transactionReadOnly: true,
      snapshotSha256: DATABASE_DIGEST,
      inventoryQueryVersion: "database-identity-v1",
      collectorFingerprint: "78".repeat(32),
      provenanceSha256: "34".repeat(32),
      authAccountCount: 12,
      profileCount: 12,
      authWithoutProfile: 0,
      orphanProfiles: 0,
      orphanMemberships: 0,
      duplicateProfileIdentities: 0,
      classifications: {
        dummyProfiles: 0,
        dummyMemberships: 0,
        securityTestProfiles: 0,
        testMarkerProfiles: 0,
        unreviewedProfiles: 0,
      },
    },
    independentReview: {
      reviewerRole: "release-security-reviewer",
      reviewedAt: "2026-10-01T06:15:00Z",
      result: "approved",
      authSnapshotSha256: AUTH_DIGEST,
      databaseSnapshotSha256: DATABASE_DIGEST,
      authProvenanceSha256: "12".repeat(32),
      databaseProvenanceSha256: "34".repeat(32),
      reviewerFingerprint: "9a".repeat(32),
      attestationSha256: "ab".repeat(32),
      zeroForbiddenAccountsConfirmed: true,
    },
  };
  const digests = calculateProductionIdentityDigests(manifest);
  manifest.authEvidence.provenanceSha256 = digests.authProvenanceSha256;
  manifest.databaseEvidence.provenanceSha256 = digests.databaseProvenanceSha256;
  manifest.independentReview.authProvenanceSha256 = digests.authProvenanceSha256;
  manifest.independentReview.databaseProvenanceSha256 = digests.databaseProvenanceSha256;
  manifest.independentReview.attestationSha256 = calculateProductionIdentityDigests(manifest).attestationSha256;
  return manifest;
}

function evaluate(manifest = validManifest(), expectedProjectRef = PROJECT_REF) {
  return evaluateProductionIdentityEvidence(manifest, { expectedProjectRef, now: NOW });
}

test("accepts fresh, independently reviewed, zero-forbidden production identity evidence", () => {
  const result = evaluate();
  assert.equal(result.ready, true);
  assert.deepEqual(result.target, {
    projectRef: PROJECT_REF,
    policy: PRODUCTION_IDENTITY_POLICY,
    totalAccounts: 12,
    profileCount: 12,
  });
});

test("rejects every dummy, test, security, reserved-domain, and unreviewed account class", () => {
  const manifest = validManifest();
  for (const key of Object.keys(manifest.authEvidence.classifications)) {
    manifest.authEvidence.classifications[key] = 1;
  }
  for (const key of Object.keys(manifest.databaseEvidence.classifications)) {
    manifest.databaseEvidence.classifications[key] = 1;
  }
  const result = evaluate(manifest);
  assert.equal(result.ready, false);
  assert.equal(result.blockers.filter(({ message }) => message === "must be zero before production release").length, 11);
});

test("binds all evidence to the exact non-staging, non-retired production project", () => {
  const mismatched = validManifest();
  mismatched.databaseEvidence.projectRef = "zyxwvutsrqponmlkjihg";
  assert.equal(evaluate(mismatched).ready, false);

  for (const forbidden of ["eomubndonbetszdbhsrj", "pkmllhaavadhaozmwapz"]) {
    const manifest = validManifest();
    manifest.projectRef = forbidden;
    manifest.authEvidence.projectRef = forbidden;
    manifest.databaseEvidence.projectRef = forbidden;
    const result = evaluateProductionIdentityEvidence(manifest, { expectedProjectRef: forbidden, now: NOW });
    assert.equal(result.ready, false);
    assert.ok(result.blockers.some(({ message }) => message.includes("active production")));
  }
});

test("requires complete, read-only, fresh, coherent independent inventories", () => {
  const manifest = validManifest();
  manifest.authEvidence.paginationComplete = false;
  manifest.databaseEvidence.transactionReadOnly = false;
  manifest.databaseEvidence.authAccountCount = 11;
  manifest.databaseEvidence.snapshotSha256 = AUTH_DIGEST;
  manifest.databaseEvidence.capturedAt = "2026-10-01T05:40:00Z";
  const result = evaluate(manifest);
  assert.equal(result.ready, false);
  for (const path of [
    "authEvidence.paginationComplete",
    "databaseEvidence.transactionReadOnly",
    "databaseEvidence.authAccountCount",
    "databaseEvidence.snapshotSha256",
    "databaseEvidence.capturedAt",
  ]) assert.ok(result.blockers.some((blocker) => blocker.path === path), path);
});

test("requires an independent review that binds both exact inventory digests", () => {
  const manifest = validManifest();
  manifest.independentReview.result = "pending";
  manifest.independentReview.authSnapshotSha256 = "56".repeat(32);
  manifest.independentReview.databaseSnapshotSha256 = "78".repeat(32);
  manifest.independentReview.zeroForbiddenAccountsConfirmed = false;
  manifest.independentReview.reviewedAt = "2026-10-01T05:59:00Z";
  const result = evaluate(manifest);
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(({ path, message }) =>
    path === "independentReview.authSnapshotSha256" && message.includes("exact Auth")));
  assert.ok(result.blockers.some(({ path }) => path === "independentReview.reviewedAt"));
});

test("fails closed on identity-bearing or undocumented fields without echoing values", () => {
  const manifest = validManifest();
  manifest.authEvidence["private-person@example.com"] = "private-person@example.com";
  manifest.databaseEvidence["secret-user-id"] = ["secret-user-id"];
  const result = evaluate(manifest);
  assert.equal(result.ready, false);
  const serialized = JSON.stringify(result);
  assert.ok(result.blockers.some(({ path }) => path === "authEvidence"));
  assert.ok(result.blockers.some(({ path }) => path === "databaseEvidence"));
  assert.doesNotMatch(serialized, /private-person|secret-user-id/);
});

test("rejects missing profiles, orphans, duplicates, stale evidence, and placeholder hashes", () => {
  const manifest = validManifest();
  manifest.authEvidence.capturedAt = "2026-09-29T06:00:00Z";
  manifest.authEvidence.snapshotSha256 = "0".repeat(64);
  manifest.databaseEvidence.authWithoutProfile = 1;
  manifest.databaseEvidence.orphanProfiles = 1;
  manifest.databaseEvidence.orphanMemberships = 1;
  manifest.databaseEvidence.duplicateProfileIdentities = 1;
  const result = evaluate(manifest);
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(({ path, message }) => path === "authEvidence.capturedAt" && message.includes("24 hours")));
  assert.ok(result.blockers.some(({ path, message }) => path === "authEvidence.snapshotSha256" && message.includes("placeholder")));
});

test("rejects project-rebound provenance and the same actor across collection and review", () => {
  const replayed = validManifest();
  const otherProject = "zyxwvutsrqponmlkjihg";
  replayed.projectRef = otherProject;
  replayed.authEvidence.projectRef = otherProject;
  replayed.databaseEvidence.projectRef = otherProject;
  assert.equal(evaluate(replayed, otherProject).ready, false);
  assert.ok(evaluate(replayed, otherProject).blockers.some(({ message }) => message.includes("project-bound")));

  const sameActor = validManifest();
  sameActor.independentReview.reviewerFingerprint = sameActor.authEvidence.collectorFingerprint;
  const digests = calculateProductionIdentityDigests(sameActor);
  sameActor.independentReview.attestationSha256 = digests.attestationSha256;
  assert.equal(evaluate(sameActor).ready, false);
  assert.ok(evaluate(sameActor).blockers.some(({ message }) => message.includes("distinct")));
});

test("rejects an impossible profile total even when orphan counters are zero", () => {
  const manifest = validManifest();
  manifest.databaseEvidence.profileCount = 999;
  const digests = calculateProductionIdentityDigests(manifest);
  manifest.databaseEvidence.provenanceSha256 = digests.databaseProvenanceSha256;
  manifest.independentReview.databaseProvenanceSha256 = digests.databaseProvenanceSha256;
  manifest.independentReview.attestationSha256 = calculateProductionIdentityDigests(manifest).attestationSha256;
  const result = evaluate(manifest);
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(({ path }) => path === "databaseEvidence.profileCount"));
});

test("fails closed without throwing when an evidence section is missing", () => {
  const manifest = validManifest();
  delete manifest.authEvidence;
  const result = evaluate(manifest);
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(({ path }) => path === "authEvidence"));
});
