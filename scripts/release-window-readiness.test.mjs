import assert from "node:assert/strict";
import test from "node:test";

import {
  RELEASE_BRANCH,
  evaluateReleaseWindow,
} from "./release-window-readiness.mjs";

const RELEASE_SHA = "a".repeat(40);
const PREVIOUS_SHA = "b".repeat(40);
const NOW = Date.parse("2026-10-02T10:00:00+10:00");
const PRODUCTION_PROJECT_REF = "abcdefghijklmnopqrst";
const DEPLOYMENT_ID = "dpl_release_candidate";

function options(overrides = {}) {
  return { expectedCommit: RELEASE_SHA, expectedDeploymentId: DEPLOYMENT_ID, expectedProductionProjectRef: PRODUCTION_PROJECT_REF, now: NOW, ...overrides };
}

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
      manifestSha256: "ab".repeat(32),
      capturedAt: "2026-10-02T07:00:00+10:00",
      verifiedAt: "2026-10-02T08:00:00+10:00",
      verifiedBy: "Recovery verifier",
    },
    rollback: {
      manifestSha256: "35".repeat(32),
      result: "passed",
      commitSha: RELEASE_SHA,
      previousCommitSha: PREVIOUS_SHA,
      deploymentId: "dpl_release_candidate",
      previousDeploymentId: "dpl_known_good",
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
      productionCutoverVerified: true,
    },
    gateEvidence: {
      physicalSafari: {
        manifestSha256: "12".repeat(32),
        result: "passed",
        commitSha: RELEASE_SHA,
        stagingDeploymentId: "dpl_staging_candidate",
      },
      monitoring: {
        manifestSha256: "34".repeat(32),
        result: "passed",
        environment: "production",
        projectRef: PRODUCTION_PROJECT_REF,
        commitSha: RELEASE_SHA,
        deploymentId: "dpl_release_candidate",
      },
      productionIdentity: {
        manifestSha256: "56".repeat(32),
        result: "passed",
        environment: "production",
        projectRef: PRODUCTION_PROJECT_REF,
        commitSha: RELEASE_SHA,
        policy: "jingwuguan-production-identity-v1",
      },
      managedRestore: {
        manifestSha256: "78".repeat(32),
        result: "passed",
        environment: "staging",
        sourceProjectRef: "eomubndonbetszdbhsrj",
        commitSha: RELEASE_SHA,
        targetKind: "disposable-managed",
        zeroResidueVerified: true,
      },
      productionTarget: {
        manifestSha256: "9a".repeat(32),
        result: "passed",
        environment: "production",
        projectRef: PRODUCTION_PROJECT_REF,
        commitSha: RELEASE_SHA,
        region: "ap-southeast-1",
        supabaseOrigin: `https://${PRODUCTION_PROJECT_REF}.supabase.co`,
        policy: "jingwuguan-production-bootstrap-v1",
      },
      productionSecrets: {
        manifestSha256: "bc".repeat(32),
        result: "passed",
        environment: "production",
        projectRef: PRODUCTION_PROJECT_REF,
        commitSha: RELEASE_SHA,
        deploymentId: "dpl_release_candidate",
      },
      productionCutover: {
        manifestSha256: "25".repeat(32),
        result: "passed",
        environment: "production",
        projectRef: PRODUCTION_PROJECT_REF,
        commitSha: RELEASE_SHA,
        deploymentId: "dpl_release_candidate",
        origin: "https://jingwuguanseibukan.com",
        migrationLedger: "006-056",
        policy: "jingwuguan-production-cutover-v1",
      },
      providerDelivery: {
        manifestSha256: "de".repeat(32),
        result: "passed",
        environment: "production",
        projectRef: PRODUCTION_PROJECT_REF,
        commitSha: RELEASE_SHA,
        deploymentId: "dpl_release_candidate",
        dedicatedInboxPolicy: "dedicated-non-role-inbox",
      },
      emailScheduler: {
        manifestSha256: "f0".repeat(32),
        result: "passed",
        environment: "production",
        projectRef: PRODUCTION_PROJECT_REF,
        commitSha: RELEASE_SHA,
        deploymentId: "dpl_release_candidate",
        endpoint: "https://jingwuguanseibukan.com/api/system/email-worker",
      },
      installerAcceptance: {
        manifestSha256: "13".repeat(32),
        result: "passed",
        environment: "staging",
        projectRef: "eomubndonbetszdbhsrj",
        commitSha: RELEASE_SHA,
        origin: "https://jingwuguanseibukan-staging.vercel.app",
        installerSha256: "24".repeat(32),
        platform: "win32-x64",
        acceptancePolicy: "interactive-install-launch-uninstall",
        authenticodeStatus: "Valid",
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
    options(),
  );

  assert.equal(result.ready, true);
  assert.deepEqual(result.blockers, []);
  assert.equal(result.summary.commitSha, RELEASE_SHA);
  assert.doesNotMatch(JSON.stringify(result), /Release operator|Recovery verifier/);
});

test("pre-cutover validates every prerequisite without requiring post-cutover evidence", () => {
  const manifest = validManifest();
  manifest.approvals.productionCutoverVerified = false;
  manifest.gateEvidence.productionCutover = {};
  const result = evaluateReleaseWindow(manifest, options({
    phase: "pre-cutover",
    now: Date.parse("2026-10-02T09:00:00+10:00"),
  }));
  assert.equal(result.ready, true, JSON.stringify(result.blockers));
  assert.equal(result.summary.phase, "pre-cutover");
});

test("final validation requires independent deployment identity and an active approved window", () => {
  let result = evaluateReleaseWindow(validManifest(), options({ expectedDeploymentId: "dpl_substituted" }));
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(({ path }) => path === "release.deploymentId"));

  result = evaluateReleaseWindow(validManifest(), options({ now: Date.parse("2026-10-02T08:45:00+10:00") }));
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(({ path }) => path === "window.startsAt"));

  result = evaluateReleaseWindow(validManifest(), options({ now: Date.parse("2026-10-02T08:00:00+10:00") }));
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(({ path }) => path === "window.approvedAt"));
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
      options(),
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
      options(),
    ).ready, false);
  }
});

test("pre-cutover and final phases reject future recovery claims", () => {
  const manifest = validManifest({
    recovery: {
      ...validManifest().recovery,
      capturedAt: "2026-10-02T10:30:00+10:00",
      verifiedAt: "2026-10-02T10:45:00+10:00",
    },
  });
  for (const phase of ["pre-cutover", "final"]) {
    const result = evaluateReleaseWindow(manifest, options({ phase }));
    assert.equal(result.ready, false);
    assert.ok(result.blockers.some(({ path }) => path === "recovery.capturedAt"));
    assert.ok(result.blockers.some(({ path }) => path === "recovery.verifiedAt"));
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
    options(),
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
        ...validManifest().rollback,
        applicationTested: false,
        databaseRecoveryTested: false,
        decisionDeadlineMinutes: 0,
      },
    }),
    options(),
  );

  assert.equal(result.ready, false);
  assert.ok(result.blockers.length >= 6);
});

test("recovery verification is independent from release ownership", () => {
  const manifest = validManifest();
  manifest.owners.rollback = "Rollback Owner";
  manifest.recovery.verifiedBy = "  rollback owner  ";
  const result = evaluateReleaseWindow(manifest, options());
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(({ path }) => path === "recovery.verifiedBy"));
});

test("requires distinct gate manifests bound to the exact release and production project", () => {
  const manifest = validManifest();
  manifest.gateEvidence.physicalSafari.commitSha = PREVIOUS_SHA;
  manifest.gateEvidence.monitoring.deploymentId = "dpl_other_deployment";
  manifest.gateEvidence.monitoring.projectRef = "zyxwvutsrqponmlkjihg";
  manifest.gateEvidence.productionIdentity.projectRef = "zyxwvutsrqponmlkjihg";
  manifest.gateEvidence.monitoring.manifestSha256 = manifest.gateEvidence.physicalSafari.manifestSha256;
  const result = evaluateReleaseWindow(manifest, options());
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(({ path }) => path === "gateEvidence.physicalSafari.commitSha"));
  assert.ok(result.blockers.some(({ path }) => path === "gateEvidence.monitoring.deploymentId"));
  assert.ok(result.blockers.some(({ path }) => path === "gateEvidence.monitoring.projectRef"));
  assert.ok(result.blockers.some(({ path }) => path === "gateEvidence.productionIdentity.projectRef"));
  assert.ok(result.blockers.some(({ path }) => path === "gateEvidence"));
});

test("bare approval booleans cannot replace managed restore, target, secrets, cutover, provider, scheduler, or installer evidence", () => {
  const manifest = validManifest();
  manifest.gateEvidence = {
    physicalSafari: manifest.gateEvidence.physicalSafari,
    monitoring: manifest.gateEvidence.monitoring,
    productionIdentity: manifest.gateEvidence.productionIdentity,
  };
  const result = evaluateReleaseWindow(manifest, options());
  assert.equal(result.ready, false);
  for (const gate of [
    "managedRestore",
    "productionTarget",
    "productionSecrets",
    "productionCutover",
    "providerDelivery",
    "emailScheduler",
    "installerAcceptance",
  ]) {
    assert.ok(result.blockers.some(({ path }) => path === `gateEvidence.${gate}.manifestSha256`));
  }
});

test("every referenced gate must have a passing result and exact production/release binding", () => {
  const manifest = validManifest();
  manifest.gateEvidence.managedRestore.result = "failed";
  manifest.gateEvidence.productionTarget.region = "us-east-1";
  manifest.gateEvidence.productionSecrets.projectRef = "zyxwvutsrqponmlkjihg";
  manifest.gateEvidence.productionCutover.migrationLedger = "006-055";
  manifest.gateEvidence.providerDelivery.dedicatedInboxPolicy = "shared-role-inbox";
  manifest.gateEvidence.emailScheduler.endpoint = "https://example.invalid/worker";
  manifest.gateEvidence.installerAcceptance.authenticodeStatus = "NotSigned";
  const result = evaluateReleaseWindow(manifest, options());
  assert.equal(result.ready, false);
  for (const path of [
    "gateEvidence.managedRestore.result",
    "gateEvidence.productionTarget.region",
    "gateEvidence.productionSecrets.projectRef",
    "gateEvidence.productionCutover.migrationLedger",
    "gateEvidence.providerDelivery.dedicatedInboxPolicy",
    "gateEvidence.emailScheduler.endpoint",
    "gateEvidence.installerAcceptance.authenticodeStatus",
  ]) {
    assert.ok(result.blockers.some(blocker => blocker.path === path));
  }
});

test("all recovery and gate manifest digests must be distinct", () => {
  const manifest = validManifest();
  manifest.gateEvidence.emailScheduler.manifestSha256 = manifest.gateEvidence.productionSecrets.manifestSha256;
  const result = evaluateReleaseWindow(manifest, options());
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(({ path }) => path === "gateEvidence"));
});
