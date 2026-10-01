import assert from "node:assert/strict";
import test from "node:test";

import { evaluateMonitoringReadiness as evaluateGate } from "./monitoring-readiness.mjs";

const NOW = Date.parse("2026-10-02T12:00:00+10:00");
const RELEASE_SHA = "a".repeat(40);
const DEPLOYMENT_ID = "dpl_12345678";

function evaluateMonitoringReadiness(manifest, options = {}) {
  return evaluateGate(manifest, {
    expectedCommit: RELEASE_SHA,
    expectedDeployment: DEPLOYMENT_ID,
    ...options,
  });
}

function validManifest(overrides = {}) {
  const manifest = {
    manifestVersion: 1,
    environment: "staging",
    applicationOrigin: "https://jingwuguanseibukan-staging.vercel.app",
    release: {
      branch: "release/v1-readiness-20260918",
      commitSha: RELEASE_SHA,
      deploymentId: DEPLOYMENT_ID,
    },
    owners: {
      monitoring: "Monitoring owner",
      incidentCommander: "Incident commander",
      rollback: "Rollback owner",
      security: "Security owner",
    },
    evidence: {
      configuredAt: "2026-10-01T09:00:00+10:00",
      verifiedAt: "2026-10-02T10:00:00+10:00",
      verifiedBy: "Independent verifier",
      protectedReference: "protected evidence monitoring-20261002",
    },
    application: {
      httpStatusCaptured: true,
      routeAndMethodCaptured: true,
      deploymentIdCaptured: true,
      latencyCaptured: true,
      alertOnErrorRate: true,
      alertOnMissingTelemetry: true,
      maxServerErrorRatePercent: 1,
      errorRateWindowMinutes: 5,
    },
    auth: {
      failedLoginRateMonitored: true,
      adminAuthorizationFailuresMonitored: true,
      passwordResetAbuseMonitored: true,
      alertContainsNoIdentityData: true,
      maxFailedLoginsPerFiveMinutes: 10,
    },
    database: {
      availabilityMonitored: true,
      connectionSaturationMonitored: true,
      migrationLedgerDriftMonitored: true,
      rlsOrGrantRegressionMonitored: true,
      privilegedAuditEventsMonitored: true,
      backupFailureMonitored: true,
    },
    emailWorker: {
      missingInvocationAlert: true,
      staleClaimAlert: true,
      exhaustedAttemptAlert: true,
      queueGrowthAlert: true,
      responseCountersCaptured: true,
      alertOnEveryNonSuccessStatus: true,
      maxInvocationGapSeconds: 120,
      maxOldestReadyEmailSeconds: 120,
      alertHttpStatuses: [401, 429, 500, 502, 503],
      queueHealthFields: [
        "stuckProcessingEmails",
        "exhaustedFailures",
        "oldPendingEmails",
        "overdueReadyEmails",
        "queuedEmails",
        "dueEmails",
        "duplicateDedupeKeys",
        "oldestReadyAgeSeconds",
      ],
    },
    push: {
      disposition: "hidden",
      providerFailuresMonitored: false,
      persistenceFailuresMonitored: false,
      deliveryFailuresMonitored: false,
      alertDeliveryTested: false,
    },
    mux: {
      apiFailuresMonitored: true,
      credentialFailuresMonitored: true,
      uploadProcessingFailuresMonitored: true,
      signedPlaybackFailuresMonitored: true,
      orphanAssetInventoryMonitored: true,
      providerDetailsRedacted: true,
    },
    incident: {
      runbookReference: "operations monitoring runbook v1",
      primaryAlertChannel: "Primary operations channel",
      backupAlertChannel: "Backup telephone tree",
      criticalAcknowledgeMinutes: 5,
      escalationTested: true,
      alertDeliveryTested: true,
      providerStatusChecksDocumented: true,
      incidentTimelineRetained: true,
    },
    rollback: {
      knownGoodDeploymentReference: "protected known-good deployment evidence",
      recoveryPointReference: "protected recovery-point evidence",
      applicationRollbackTested: true,
      databaseRecoveryTested: true,
      accessVerified: true,
      monitoringContinuesDuringRollback: true,
      decisionDeadlineMinutes: 20,
    },
    releaseStopSignals: {
      authenticationFailure: true,
      authorizationFailure: true,
      databaseSecurityFailure: true,
      migrationOrRestoreMismatch: true,
      emailWorkerFailure: true,
      muxFailure: true,
      serverErrorRateBreach: true,
      rollbackAccessFailure: true,
      pushFailure: false,
    },
    redaction: {
      authorizationHeaders: true,
      cookiesAndSessions: true,
      secretValues: true,
      emailRecipientsAndBodies: true,
      providerIdentifiers: true,
      rawDatabaseErrors: true,
      retentionDays: 30,
    },
    acceptance: {
      applicationAlertDelivered: true,
      authAlertDelivered: true,
      databaseAlertDelivered: true,
      emailWorkerAlertDelivered: true,
      pushAlertDelivered: false,
      muxAlertDelivered: true,
      rollbackAlertDelivered: true,
      noProductionMutation: true,
    },
  };
  return { ...manifest, ...overrides };
}

test("accepts a complete secret-free monitoring record", () => {
  const result = evaluateMonitoringReadiness(validManifest(), { now: NOW });
  assert.equal(result.ready, true);
  assert.deepEqual(result.blockers, []);
  assert.equal(result.summary.environment, "staging");
  assert.doesNotMatch(JSON.stringify(result), /Monitoring owner|Independent verifier|Primary operations channel/);
});

test("binds staging and production to their exact origins", () => {
  assert.equal(evaluateMonitoringReadiness(validManifest({
    applicationOrigin: "https://jingwuguanseibukan.com",
  }), { now: NOW }).ready, false);
  assert.equal(evaluateMonitoringReadiness(validManifest({
    environment: "production",
    applicationOrigin: "https://jingwuguanseibukan.com",
  }), { now: NOW }).ready, true);
  assert.equal(evaluateMonitoringReadiness(validManifest({
    applicationOrigin: "https://jingwuguanseibukan-staging.vercel.app/path",
  }), { now: NOW }).ready, false);
});

test("requires fresh, ordered and independently verified evidence", () => {
  const result = evaluateMonitoringReadiness(validManifest({
    evidence: {
      configuredAt: "2026-10-02T11:00:00+10:00",
      verifiedAt: "2026-10-01T10:00:00+10:00",
      verifiedBy: "TBD",
      protectedReference: "public notes",
    },
  }), { now: NOW });
  assert.equal(result.ready, false);
  assert.ok(result.blockers.length >= 3);

  assert.equal(evaluateMonitoringReadiness(validManifest({
    evidence: {
      ...validManifest().evidence,
      configuredAt: "2026-08-01T09:00:00+10:00",
      verifiedAt: "2026-08-02T10:00:00+10:00",
    },
  }), { now: NOW }).ready, false);
});

test("requires all-non-success coverage, mandatory statuses and complete queue-health telemetry", () => {
  for (const emailWorker of [
    { ...validManifest().emailWorker, alertHttpStatuses: [500, 502, 503] },
    { ...validManifest().emailWorker, alertOnEveryNonSuccessStatus: false },
    { ...validManifest().emailWorker, alertHttpStatuses: [401, 429, 500, 502, 503, 700] },
    { ...validManifest().emailWorker, queueHealthFields: ["queuedEmails"] },
    { ...validManifest().emailWorker, maxInvocationGapSeconds: 121 },
    { ...validManifest().emailWorker, maxOldestReadyEmailSeconds: 121 },
  ]) {
    assert.equal(evaluateMonitoringReadiness(validManifest({ emailWorker }), { now: NOW }).ready, false);
  }
});

test("requires application, Auth, database/security and Mux coverage", () => {
  const result = evaluateMonitoringReadiness(validManifest({
    application: { ...validManifest().application, alertOnMissingTelemetry: false, maxServerErrorRatePercent: 6 },
    auth: { ...validManifest().auth, adminAuthorizationFailuresMonitored: false },
    database: { ...validManifest().database, rlsOrGrantRegressionMonitored: false },
    mux: { ...validManifest().mux, signedPlaybackFailuresMonitored: false },
  }), { now: NOW });
  assert.equal(result.ready, false);
  assert.ok(result.blockers.length >= 5);
});

test("requires independent alert paths, tested incident escalation and rollback access", () => {
  const result = evaluateMonitoringReadiness(validManifest({
    incident: {
      ...validManifest().incident,
      backupAlertChannel: "Primary operations channel",
      criticalAcknowledgeMinutes: 30,
      escalationTested: false,
    },
    rollback: {
      ...validManifest().rollback,
      accessVerified: false,
      decisionDeadlineMinutes: 0,
    },
  }), { now: NOW });
  assert.equal(result.ready, false);
  assert.ok(result.blockers.length >= 5);
});

test("requires every release stop signal, redaction control and acceptance probe", () => {
  const result = evaluateMonitoringReadiness(validManifest({
    releaseStopSignals: { ...validManifest().releaseStopSignals, muxFailure: false },
    redaction: { ...validManifest().redaction, emailRecipientsAndBodies: false, retentionDays: 1000 },
    acceptance: { ...validManifest().acceptance, authAlertDelivered: false },
  }), { now: NOW });
  assert.equal(result.ready, false);
  assert.ok(result.blockers.length >= 4);
});

test("rejects secret-bearing fields and values anywhere in the manifest", () => {
  for (const manifest of [
    { ...validManifest(), tokenValue: "not-even-a-real-token" },
    { ...validManifest(), apiKey: "not-even-a-real-key" },
    { ...validManifest(), database: { ...validManifest().database, databaseUrl: "postgresql://operator:value@db.example" } },
    { ...validManifest(), evidence: { ...validManifest().evidence, protectedReference: "eyJabcdefghijklmno.abcdefghijklmnop.signature" } },
    { ...validManifest(), evidence: { ...validManifest().evidence, protectedReference: "-----BEGIN PRIVATE KEY-----" } },
    { ...validManifest(), memberEmail: "person@example.com" },
    { ...validManifest(), memberId: "private-identity" },
  ]) {
    assert.equal(evaluateMonitoringReadiness(manifest, { now: NOW }).ready, false);
  }
});

test("rejects every undocumented field without echoing sensitive field names", () => {
  const manifest = validManifest();
  manifest.debug = { "person@example.com": "raw provider detail" };
  const result = evaluateMonitoringReadiness(manifest, { now: NOW });
  assert.equal(result.ready, false);
  assert.doesNotMatch(JSON.stringify(result), /person@example\.com/);
});

test("requires either hidden push or complete monitored push coverage", () => {
  const enabled = validManifest();
  enabled.push = {
    disposition: "enabled",
    providerFailuresMonitored: true,
    persistenceFailuresMonitored: true,
    deliveryFailuresMonitored: true,
    alertDeliveryTested: true,
  };
  enabled.releaseStopSignals.pushFailure = true;
  enabled.acceptance.pushAlertDelivered = true;
  assert.equal(evaluateMonitoringReadiness(enabled, { now: NOW }).ready, true);

  enabled.push.persistenceFailuresMonitored = false;
  assert.equal(evaluateMonitoringReadiness(enabled, { now: NOW }).ready, false);
});

test("binds monitoring evidence to the independently supplied release deployment", () => {
  const manifest = validManifest();
  manifest.release.commitSha = "b".repeat(40);
  manifest.release.deploymentId = "dpl_other123";
  assert.equal(evaluateMonitoringReadiness(manifest, { now: NOW }).ready, false);
});
