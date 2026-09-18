import assert from "node:assert/strict";
import test from "node:test";

import {
  REQUIRED_CHECKS,
  REQUIRED_COMPONENTS,
  evaluateRecoveryManifest,
} from "./recovery-readiness.mjs";

const verifiedAt = "2026-09-16T00:00:00.000Z";

function validManifest() {
  return {
    manifestVersion: 1,
    recordedAt: verifiedAt,
    source: { environment: "staging", projectRef: "staging-ref" },
    restoreTarget: { kind: "disposable-supabase", projectRef: "disposable-ref" },
    production: { projectRef: "production-ref", mutations: 0 },
    objectives: { declaredRpoHours: 24, declaredRtoHours: 4, observedRestoreMinutes: 90 },
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
  manifest.restoreTarget.projectRef = manifest.production.projectRef;
  manifest.production.mutations = 1;

  const result = evaluateRecoveryManifest(manifest);
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(({ path }) => path === "restoreTarget.projectRef"));
  assert.ok(result.blockers.some(({ path }) => path === "production.mutations"));
});

test("production-source evidence requires an explicit acknowledgement", () => {
  const manifest = validManifest();
  manifest.source = { environment: "production", projectRef: manifest.production.projectRef };

  assert.equal(evaluateRecoveryManifest(manifest).ready, false);
  assert.equal(evaluateRecoveryManifest(manifest, { allowProductionSource: true }).ready, true);
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
