import assert from "node:assert/strict";
import test from "node:test";

import {
  REQUIRED_CHECKS,
  REQUIRED_COMPONENTS,
  STAGING_PROJECT_REF,
  evaluateRecoveryManifest,
} from "./recovery-readiness.mjs";
import { RELEASE_MIGRATION_CONTRACT } from "./recovery-ledger-fingerprint.mjs";

const verifiedAt = "2026-09-16T02:00:00.000Z";

function validManifest() {
  return {
    manifestVersion: 2,
    recordedAt: verifiedAt,
    source: { environment: "staging", projectRef: STAGING_PROJECT_REF },
    restoreTarget: { kind: "disposable-supabase", projectRef: "disposable-ref" },
    production: { exists: false, projectRef: null, mutations: 0 },
    objectives: { declaredRpoHours: 24, declaredRtoHours: 4, observedRestoreMinutes: 60 },
    timing: {
      recoveryPointAt: "2026-09-16T00:00:00.000Z",
      rehearsalStartedAt: "2026-09-16T01:00:00.000Z",
      rehearsalCompletedAt: verifiedAt,
    },
    migrationLedger: {
      ...RELEASE_MIGRATION_CONTRACT,
      sourceLedgerSha256: "a".repeat(64),
      restoredLedgerSha256: "a".repeat(64),
    },
    controls: {
      backupEncrypted: true,
      accessRestricted: true,
      retentionAndDeletionRecorded: true,
      restoreTargetOutboundDisabled: true,
      rawSecretsRetainedInEvidence: false,
      rawPersonalDataRetainedInEvidence: false,
    },
    components: Object.fromEntries(
      REQUIRED_COMPONENTS.map((name) => [
        name,
        { status: "VERIFIED", verifiedAt, evidence: `evidence/${name}.json` },
      ]),
    ),
    checks: Object.fromEntries(REQUIRED_CHECKS.map((name) => [name, true])),
  };
}

test("complete staging recovery evidence passes with the staging limitation warning", () => {
  const result = evaluateRecoveryManifest(validManifest());
  assert.equal(result.ready, true);
  assert.deepEqual(result.blockers, []);
  assert.equal(result.warnings.length, 1);
});

test("missing managed Auth and Storage object proof fails closed", () => {
  const manifest = validManifest();
  delete manifest.components.authUsersAndIdentities;
  manifest.components.storageObjectBytes.status = "PENDING";

  const result = evaluateRecoveryManifest(manifest);
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(({ path }) => path === "components.authUsersAndIdentities"));
  assert.ok(result.blockers.some(({ path }) => path === "components.storageObjectBytes.status"));
});

test("a production restore target and production mutation can never pass", () => {
  const manifest = validManifest();
  manifest.production.exists = true;
  manifest.production.projectRef = "production-ref";
  manifest.restoreTarget.projectRef = manifest.production.projectRef;
  manifest.production.mutations = 1;

  const result = evaluateRecoveryManifest(manifest);
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(({ path }) => path === "restoreTarget.projectRef"));
  assert.ok(result.blockers.some(({ path }) => path === "production.mutations"));
});

test("production-source evidence requires an explicit acknowledgement", () => {
  const manifest = validManifest();
  manifest.production.exists = true;
  manifest.production.projectRef = "production-ref";
  manifest.source = { environment: "production", projectRef: manifest.production.projectRef };

  assert.equal(evaluateRecoveryManifest(manifest).ready, false);
  assert.equal(evaluateRecoveryManifest(manifest, { allowProductionSource: true }).ready, true);
});

test("production-source evidence cannot invent a project before production exists", () => {
  const manifest = validManifest();
  manifest.source = { environment: "production", projectRef: "invented-production" };

  const result = evaluateRecoveryManifest(manifest, { allowProductionSource: true });
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(({ path, message }) =>
    path === "source.environment" && /production\.exists/.test(message)));
});

test("a missing production project is represented explicitly without a fake reference", () => {
  const manifest = validManifest();
  assert.equal(evaluateRecoveryManifest(manifest).ready, true);

  manifest.production.projectRef = "placeholder-production";
  const result = evaluateRecoveryManifest(manifest);
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(({ path }) => path === "production.projectRef"));
});

test("stale recovery points and inconsistent rehearsal timing fail closed", () => {
  const manifest = validManifest();
  manifest.objectives.declaredRpoHours = 0.5;
  manifest.objectives.observedRestoreMinutes = 10;

  const result = evaluateRecoveryManifest(manifest);
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(({ path, message }) =>
    path === "timing.recoveryPointAt" && /RPO/.test(message)));
  assert.ok(result.blockers.some(({ path, message }) =>
    path === "objectives.observedRestoreMinutes" && /timestamps/.test(message)));
});

test("the exact 006-053 release contract and matching restored ledger are required", () => {
  const manifest = validManifest();
  manifest.migrationLedger.lastVersion = "046";
  manifest.migrationLedger.restoredLedgerSha256 = "b".repeat(64);

  const result = evaluateRecoveryManifest(manifest);
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(({ path }) => path === "migrationLedger.lastVersion"));
  assert.ok(result.blockers.some(({ path }) => path === "migrationLedger.restoredLedgerSha256"));
});

test("unsafe evidence retention and an exceeded RTO fail closed", () => {
  const manifest = validManifest();
  manifest.controls.rawSecretsRetainedInEvidence = true;
  manifest.objectives.observedRestoreMinutes = 241;

  const result = evaluateRecoveryManifest(manifest);
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(({ path }) => path === "controls.rawSecretsRetainedInEvidence"));
  assert.ok(result.blockers.some(({ path }) => path === "objectives.observedRestoreMinutes"));
});
