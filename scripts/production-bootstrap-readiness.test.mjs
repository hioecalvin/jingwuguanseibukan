import assert from "node:assert/strict";
import test from "node:test";

import {
  PRODUCTION_BOOTSTRAP_POLICY,
  PRODUCTION_REGION,
  RELEASE_BRANCH,
  STAGING_PROJECT_REF,
  calculateProductionBootstrapAttestation,
  evaluateProductionBootstrap,
} from "./production-bootstrap-readiness.mjs";
import { RELEASE_MIGRATION_CONTRACT } from "./recovery-ledger-fingerprint.mjs";

const PROJECT_REF = "abcdefghijklmnopqrst";
const COMMIT = "1".repeat(40);
const NOW = Date.parse("2026-10-01T12:00:00.000Z");

function validManifest() {
  const manifest = {
    schemaVersion: 1,
    policy: PRODUCTION_BOOTSTRAP_POLICY,
    environment: "production",
    target: {
      projectRef: PROJECT_REF,
      region: PRODUCTION_REGION,
      supabaseOrigin: `https://${PROJECT_REF}.supabase.co`,
    },
    release: { branch: RELEASE_BRANCH, commitSha: COMMIT },
    targetInventory: {
      projectRef: PROJECT_REF,
      capturedAt: "2026-10-01T11:30:00.000Z",
      collectorRole: "production-readonly-inventory-v1",
      transactionReadOnly: true,
      inventoryComplete: true,
      applicationObjectCount: 0,
      applicationMigrationCount: 0,
      authAccountCount: 0,
      storageObjectCount: 0,
      snapshotSha256: "1a".repeat(32),
      evidenceSha256: "2a".repeat(32),
    },
    baselineArtifact: {
      sourceProjectRef: STAGING_PROJECT_REF,
      capturedAt: "2026-10-01T11:00:00.000Z",
      payloadSha256: "3a".repeat(32),
      payloadBytes: 1048576,
      catalogFormatVersion: 1,
      catalogSha256: "4a".repeat(32),
      catalogObjectCount: 4146,
      evidenceSha256: "5a".repeat(32),
    },
    migrationLedger: {
      ...RELEASE_MIGRATION_CONTRACT,
      sourceLedgerSha256: "6a".repeat(32),
      evidenceSha256: "7a".repeat(32),
    },
    importPlan: {
      mode: "managed-full-import",
      preparedAt: "2026-10-01T11:40:00.000Z",
      packageSha256: "8a".repeat(32),
      packageBytes: 2097152,
      baselinePayloadSha256: "3a".repeat(32),
      baselineCatalogSha256: "4a".repeat(32),
      migrationLedgerSha256: "6a".repeat(32),
      recoveryManifestSha256: "9a".repeat(32),
      planEvidenceSha256: "ab".repeat(32),
    },
    controls: {
      offlineValidationOnly: true,
      offlineGateNetworkContacted: false,
      productionMutationAuthorized: false,
      productionMutationsPerformed: 0,
      importExecuted: false,
      deploymentExecuted: false,
      applyMigrationsToEmptyTarget: false,
      restoreBaselineBeforeMigrationVerification: true,
      outboundDeliveryDisabledBeforeImport: true,
      postImportCatalogMatchRequired: true,
      postImportLedgerMatchRequired: true,
      rollbackPlanPrepared: true,
      rawSecretsInManifest: false,
      rawPersonalDataInManifest: false,
    },
    independentReview: {
      preparerFingerprint: "release-operator-v1",
      reviewerFingerprint: "security-reviewer-v1",
      reviewedAt: "2026-10-01T11:50:00.000Z",
      result: "approved",
      targetInventorySha256: "2a".repeat(32),
      baselineEvidenceSha256: "5a".repeat(32),
      ledgerEvidenceSha256: "7a".repeat(32),
      importPlanEvidenceSha256: "ab".repeat(32),
      attestationSha256: "",
    },
  };
  manifest.independentReview.attestationSha256 = calculateProductionBootstrapAttestation(manifest);
  return manifest;
}

function evaluate(manifest, options = {}) {
  return evaluateProductionBootstrap(manifest, {
    expectedProjectRef: PROJECT_REF,
    expectedCommit: COMMIT,
    now: NOW,
    ...options,
  });
}

test("accepts a reviewed offline plan bound to the exact empty Singapore production target", () => {
  const result = evaluate(validManifest());
  assert.equal(result.ready, true);
  assert.equal(result.summary.projectRef, PROJECT_REF);
  assert.equal(result.summary.productionMutationsPerformed, 0);
  assert.deepEqual(result.summary.migrationContract, {
    firstVersion: "006", lastVersion: "058", migrationCount: 53,
  });
});

test("rejects staging, retired, mismatched, or non-Singapore targets", () => {
  for (const projectRef of [STAGING_PROJECT_REF, "pkmllhaavadhaozmwapz", "zyxwvutsrqponmlkjihg"]) {
    const manifest = validManifest();
    manifest.target.projectRef = projectRef;
    manifest.target.supabaseOrigin = `https://${projectRef}.supabase.co`;
    manifest.independentReview.attestationSha256 = calculateProductionBootstrapAttestation(manifest);
    assert.equal(evaluate(manifest).ready, false);
  }
  const manifest = validManifest();
  manifest.target.region = "ap-southeast-2";
  manifest.independentReview.attestationSha256 = calculateProductionBootstrapAttestation(manifest);
  assert.equal(evaluate(manifest).ready, false);
});

test("rejects a non-empty target or incomplete/read-write inventory", () => {
  const manifest = validManifest();
  manifest.targetInventory.applicationObjectCount = 1;
  manifest.targetInventory.applicationMigrationCount = 1;
  manifest.targetInventory.authAccountCount = 1;
  manifest.targetInventory.storageObjectCount = 1;
  manifest.targetInventory.transactionReadOnly = false;
  manifest.targetInventory.inventoryComplete = false;
  manifest.targetInventory.projectRef = "zyxwvutsrqponmlkjihg";
  manifest.independentReview.attestationSha256 = calculateProductionBootstrapAttestation(manifest);
  const result = evaluate(manifest);
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(({ path }) => path === "targetInventory.applicationObjectCount"));
  assert.ok(result.blockers.some(({ path }) => path === "targetInventory.transactionReadOnly"));
  assert.ok(result.blockers.some(({ path }) => path === "targetInventory.projectRef"));
});

test("requires the protected pre-006 baseline instead of treating migrations as a bootstrap", () => {
  const manifest = validManifest();
  manifest.baselineArtifact.catalogObjectCount = 0;
  manifest.importPlan.baselinePayloadSha256 = "cc".repeat(32);
  manifest.controls.applyMigrationsToEmptyTarget = true;
  manifest.controls.restoreBaselineBeforeMigrationVerification = false;
  manifest.independentReview.attestationSha256 = calculateProductionBootstrapAttestation(manifest);
  const result = evaluate(manifest);
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(({ path }) => path === "baselineArtifact.catalogObjectCount"));
  assert.ok(result.blockers.some(({ path }) => path === "importPlan.baselinePayloadSha256"));
  assert.ok(result.blockers.some(({ path }) => path === "controls.applyMigrationsToEmptyTarget"));
});

test("requires the immutable 006-058 repository contract and matching source ledger", () => {
  const manifest = validManifest();
  manifest.migrationLedger.firstVersion = "007";
  manifest.migrationLedger.repositoryFilesSha256 = "cd".repeat(32);
  manifest.importPlan.migrationLedgerSha256 = "ef".repeat(32);
  manifest.independentReview.attestationSha256 = calculateProductionBootstrapAttestation(manifest);
  const result = evaluate(manifest);
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(({ path }) => path === "migrationLedger.firstVersion"));
  assert.ok(result.blockers.some(({ path }) => path === "migrationLedger.repositoryFilesSha256"));
  assert.ok(result.blockers.some(({ path }) => path === "importPlan.migrationLedgerSha256"));
});

test("any production contact, mutation, import, deployment, or unsafe evidence fails closed", () => {
  const manifest = validManifest();
  manifest.controls.offlineGateNetworkContacted = true;
  manifest.controls.productionMutationAuthorized = true;
  manifest.controls.productionMutationsPerformed = 1;
  manifest.controls.importExecuted = true;
  manifest.controls.deploymentExecuted = true;
  manifest.controls.rawSecretsInManifest = true;
  manifest.independentReview.attestationSha256 = calculateProductionBootstrapAttestation(manifest);
  const result = evaluate(manifest);
  assert.equal(result.ready, false);
  for (const path of [
    "controls.offlineGateNetworkContacted", "controls.productionMutationAuthorized",
    "controls.productionMutationsPerformed", "controls.importExecuted",
    "controls.deploymentExecuted", "controls.rawSecretsInManifest",
  ]) assert.ok(result.blockers.some((blocker) => blocker.path === path), path);
});

test("independent review must bind four distinct evidence hashes and canonical attestation", () => {
  const manifest = validManifest();
  manifest.independentReview.reviewerFingerprint = manifest.independentReview.preparerFingerprint;
  manifest.importPlan.planEvidenceSha256 = manifest.independentReview.ledgerEvidenceSha256;
  manifest.independentReview.importPlanEvidenceSha256 = manifest.importPlan.planEvidenceSha256;
  manifest.independentReview.attestationSha256 = "fe".repeat(32);
  const result = evaluate(manifest);
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(({ path, message }) => path === "independentReview.reviewerFingerprint" && /independent/.test(message)));
  assert.ok(result.blockers.some(({ path, message }) => path === "independentReview" && /distinct/.test(message)));
  assert.ok(result.blockers.some(({ path }) => path === "independentReview.attestationSha256"));
});

test("stale evidence, unsupported fields, placeholders, and wrong independent arguments fail", () => {
  const manifest = validManifest();
  manifest.targetInventory.capturedAt = "2026-09-20T00:00:00.000Z";
  manifest.targetInventory.password = "must-never-be-accepted";
  manifest.independentReview.reviewerFingerprint = "PENDING";
  manifest.independentReview.attestationSha256 = calculateProductionBootstrapAttestation(manifest);
  const result = evaluate(manifest, { expectedProjectRef: "zyxwvutsrqponmlkjihg", expectedCommit: "2".repeat(40) });
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(({ path }) => path === "targetInventory"));
  assert.ok(result.blockers.some(({ path }) => path === "targetInventory.capturedAt"));
  assert.ok(result.blockers.some(({ path }) => path === "independentReview.reviewerFingerprint"));
  assert.ok(result.blockers.some(({ path }) => path === "target.projectRef"));
  assert.ok(result.blockers.some(({ path }) => path === "release.commitSha"));
});

test("the import plan and independent review must follow their captured evidence", () => {
  const manifest = validManifest();
  manifest.baselineArtifact.capturedAt = "2026-10-01T11:45:00.000Z";
  manifest.importPlan.preparedAt = "2026-10-01T11:40:00.000Z";
  manifest.targetInventory.capturedAt = "2026-10-01T11:55:00.000Z";
  manifest.independentReview.reviewedAt = "2026-10-01T11:50:00.000Z";
  manifest.independentReview.attestationSha256 = calculateProductionBootstrapAttestation(manifest);
  const result = evaluate(manifest);
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(({ path, message }) =>
    path === "importPlan.preparedAt" && /baselineArtifact/.test(message)));
  assert.ok(result.blockers.some(({ path, message }) =>
    path === "independentReview.reviewedAt" && /targetInventory/.test(message)));
});
