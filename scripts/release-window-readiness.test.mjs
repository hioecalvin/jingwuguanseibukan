import assert from "node:assert/strict";
import test from "node:test";

import {
  RELEASE_BRANCH,
  evaluateReleaseWindow,
} from "./release-window-readiness.mjs";

const RELEASE_SHA = "a".repeat(40);
const PREVIOUS_SHA = "b".repeat(40);
const NOW = Date.parse("2026-10-02T08:00:00+10:00");
const PRODUCTION_PROJECT_REF = "abcdefghijklmnopqrst";

function validManifest(overrides = {}) {
  const manifest = {
    manifestVersion: 1,
    release: {
      branch: RELEASE_BRANCH,
      commitSha: RELEASE_SHA,
      previousCommitSha: PREVIOUS_SHA,
      deploymentId: "dpl_release_candidate",
      previousDeploymentId: "dpl_known_good",
    },
    owners: {
      deployment: "Release operator",
      rollback: "Rollback operator",
      monitoring: "Monitoring operator",
    },
    window: {
      approvedAt: "2026-10-02T08:30:00+10:00",
      startsAt: "2026-10-02T09:00:00+10:00",
      endsAt: "2026-10-02T11:00:00+10:00",
      timeZone: "Australia/Sydney",
    },
    recovery: {
      pointId: "protected-recovery-20261002",
      manifestSha256: "c".repeat(64),
      capturedAt: "2026-10-02T07:00:00+10:00",
      verifiedAt: "2026-10-02T08:00:00+10:00",
      verifiedBy: "Recovery verifier",
    },
    rollback: {
      applicationTested: true,
      databaseRecoveryTested: true,
      decisionDeadlineMinutes: 20,
    },
    approvals: {
      explicitReleaseApproval: true,
      productionTargetVerified: true,
      productionSecretsVerified: true,
      managedRestoreVerified: true,
      providerDeliveryVerified: true,
      physicalSafariVerified: true,
      monitoringReady: true,
      weakTestAccountsRemoved: true,
      pushHiddenOrVerified: true,
    },
    gateEvidence: {
      physicalSafari: {
        manifestSha256: "12".repeat(32),
        commitSha: RELEASE_SHA,
        stagingDeploymentId: "dpl_staging_candidate",
      },
      monitoring: {
        manifestSha256: "34".repeat(32),
        environment: "production",
        commitSha: RELEASE_SHA,
        deploymentId: "dpl_release_candidate",
      },
      productionIdentity: {
        manifestSha256: "56".repeat(32),
        projectRef: PRODUCTION_PROJECT_REF,
        policy: "jingwuguan-production-identity-v1",
      },
    },
    stopConditions: {
      authenticationFailure: true,
      authorizationFailure: true,
      databaseSecurityFailure: true,
      migrationOrRestoreMismatch: true,
      emailWorkerFailure: true,
      rollbackAccessFailure: true,
      maxServerErrorRatePercent: 1,
      maxOldestReadyEmailSeconds: 120,
    },
  };

  return {
    ...manifest,
    ...overrides,
  };
}

test("accepts a complete time-bounded release and rollback record", () => {
  const result = evaluateReleaseWindow(
    validManifest(),
    {
      expectedCommit: RELEASE_SHA,
      expectedProductionProjectRef: PRODUCTION_PROJECT_REF,
      now: NOW,
    },
  );

  assert.equal(result.ready, true);
  assert.deepEqual(result.blockers, []);
  assert.equal(result.summary.commitSha, RELEASE_SHA);
  assert.doesNotMatch(JSON.stringify(result), /Release operator|Recovery verifier/);
});

test("binds the approved release to the independent commit and rollback revision", () => {
  for (const release of [
    { ...validManifest().release, branch: "main" },
    { ...validManifest().release, commitSha: "d".repeat(40) },
    { ...validManifest().release, previousCommitSha: RELEASE_SHA },
    {
      ...validManifest().release,
      previousDeploymentId: "dpl_release_candidate",
    },
  ]) {
    assert.equal(evaluateReleaseWindow(
      validManifest({ release }),
      { expectedCommit: RELEASE_SHA, expectedProductionProjectRef: PRODUCTION_PROJECT_REF, now: NOW },
    ).ready, false);
  }
});

test("rejects expired, excessive, unapproved, and stale-recovery windows", () => {
  const cases = [
    validManifest({
      window: {
        ...validManifest().window,
        endsAt: "2026-10-02T08:30:00+10:00",
      },
    }),
    validManifest({
      window: {
        ...validManifest().window,
        endsAt: "2026-10-02T14:00:00+10:00",
      },
    }),
    validManifest({
      window: {
        ...validManifest().window,
        approvedAt: "2026-10-02T09:30:00+10:00",
      },
    }),
    validManifest({
      recovery: {
        ...validManifest().recovery,
        capturedAt: "2026-09-30T07:00:00+10:00",
      },
    }),
  ];

  for (const manifest of cases) {
    assert.equal(evaluateReleaseWindow(
      manifest,
      { expectedCommit: RELEASE_SHA, expectedProductionProjectRef: PRODUCTION_PROJECT_REF, now: NOW },
    ).ready, false);
  }
});

test("requires every external approval and stop condition", () => {
  const approvals = {
    ...validManifest().approvals,
    physicalSafariVerified: false,
  };
  const stopConditions = {
    ...validManifest().stopConditions,
    authorizationFailure: false,
    maxOldestReadyEmailSeconds: 121,
  };
  const result = evaluateReleaseWindow(
    validManifest({ approvals, stopConditions }),
    { expectedCommit: RELEASE_SHA, expectedProductionProjectRef: PRODUCTION_PROJECT_REF, now: NOW },
  );

  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(({ path }) =>
    path === "approvals.physicalSafariVerified"));
  assert.ok(result.blockers.some(({ path }) =>
    path === "stopConditions.authorizationFailure"));
  assert.ok(result.blockers.some(({ path }) =>
    path === "stopConditions.maxOldestReadyEmailSeconds"));
});

test("rejects placeholders, missing owners, and untested rollback", () => {
  const result = evaluateReleaseWindow(
    validManifest({
      owners: {
        deployment: "TBD",
        rollback: "",
        monitoring: "Monitoring operator",
      },
      recovery: {
        ...validManifest().recovery,
        pointId: "REPLACE_WITH_RECOVERY_POINT",
      },
      rollback: {
        applicationTested: false,
        databaseRecoveryTested: false,
        decisionDeadlineMinutes: 0,
      },
    }),
    { expectedCommit: RELEASE_SHA, expectedProductionProjectRef: PRODUCTION_PROJECT_REF, now: NOW },
  );

  assert.equal(result.ready, false);
  assert.ok(result.blockers.length >= 6);
});

test("requires distinct gate manifests bound to the exact release and production project", () => {
  const manifest = validManifest();
  manifest.gateEvidence.physicalSafari.commitSha = PREVIOUS_SHA;
  manifest.gateEvidence.monitoring.deploymentId = "dpl_other_deployment";
  manifest.gateEvidence.productionIdentity.projectRef = "zyxwvutsrqponmlkjihg";
  manifest.gateEvidence.monitoring.manifestSha256 = manifest.gateEvidence.physicalSafari.manifestSha256;
  const result = evaluateReleaseWindow(manifest, {
    expectedCommit: RELEASE_SHA,
    expectedProductionProjectRef: PRODUCTION_PROJECT_REF,
    now: NOW,
  });
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(({ path }) => path === "gateEvidence.physicalSafari.commitSha"));
  assert.ok(result.blockers.some(({ path }) => path === "gateEvidence.monitoring.deploymentId"));
  assert.ok(result.blockers.some(({ path }) => path === "gateEvidence.productionIdentity.projectRef"));
  assert.ok(result.blockers.some(({ path }) => path === "gateEvidence"));
});
