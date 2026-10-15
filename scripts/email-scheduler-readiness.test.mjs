import assert from "node:assert/strict";
import test from "node:test";

import { evaluateEmailScheduler, STAGING_PROJECT_REF } from "./email-scheduler-readiness.mjs";

const NOW = Date.parse("2026-10-02T12:00:00+10:00");
const RELEASE_SHA = "ab".repeat(20);
const DEPLOYMENT_ID = "dpl_12345678";

function evaluate(manifest, options = {}) {
  return evaluateEmailScheduler(manifest, {
    expectedProjectRef: STAGING_PROJECT_REF,
    expectedCommit: RELEASE_SHA,
    expectedDeployment: DEPLOYMENT_ID,
    now: NOW,
    ...options,
  });
}

function validManifest(overrides = {}) {
  const manifest = {
    manifestVersion: 1,
    environment: "staging",
    projectRef: STAGING_PROJECT_REF,
    release: {
      branch: "release/v1-readiness-20260918",
      commitSha: RELEASE_SHA,
      deploymentId: DEPLOYMENT_ID,
    },
    scheduler: {
      provider: "Reviewed scheduler",
      jobId: "jwg-staging-email-worker",
      owner: "Scheduler owner",
      planSupportsSixtySeconds: true,
      enabled: true,
    },
    request: {
      method: "POST",
      url: "https://jingwuguanseibukan-staging.vercel.app/api/system/email-worker",
      headerName: "x-worker-secret",
      secretReference: "protected credential EMAIL_WORKER_SECRET",
    },
    timing: {
      cadenceSeconds: 60,
      maxConcurrentExecutions: 1,
      overlapPrevented: true,
      workerBudgetSeconds: 45,
      providerTimeoutSeconds: 10,
      schedulerTimeoutSeconds: 55,
    },
    delivery: {
      automaticRetries: false,
      applicationIdempotencyVerified: true,
      nonSuccessResponsesRetained: true,
    },
    security: {
      tlsVerified: true,
      secretStoredProtected: true,
      secretDistinctFromOtherSecrets: true,
      requestHeadersRedacted: true,
    },
    monitoring: {
      owner: "Monitoring owner",
      alertOnNonSuccess: true,
      alertOnRateLimit: true,
      alertOnQueueFailure: true,
      maxOldestReadyEmailSeconds: 120,
    },
    acceptance: {
      configuredAt: "2026-10-02T08:00:00+10:00",
      testedAt: "2026-10-02T09:00:00+10:00",
      verifiedAt: "2026-10-02T10:00:00+10:00",
      verifiedBy: "Independent verifier",
      protectedReference: "protected scheduler evidence 20261002",
      emptyQueueConfirmed: true,
      responseStatus: 200,
      providerRequests: 0,
      noUnrelatedRowsChanged: true,
      nonSuccessRetentionVerified: true,
      queueHealthTelemetryVerified: true,
      alertDeliveryTested: true,
      noProductionMutation: true,
    },
    approvals: {
      operatorApproved: true,
      monitoringApproved: true,
      providerPlanApproved: true,
    },
  };
  return { ...manifest, ...overrides };
}

test("accepts fresh independently reviewed scheduler evidence without exposing identities", () => {
  const result = evaluate(validManifest());
  assert.equal(result.ready, true);
  assert.deepEqual(result.blockers, []);
  assert.equal(result.summary.projectRef, STAGING_PROJECT_REF);
  assert.doesNotMatch(JSON.stringify(result), /Scheduler owner|Independent verifier|EMAIL_WORKER_SECRET/);
});

test("binds production to its independently supplied project, release, deployment and endpoint", () => {
  const productionRef = "abcdefghijklmnopqrst";
  const manifest = validManifest({
    environment: "production",
    projectRef: productionRef,
    request: { ...validManifest().request, url: "https://jingwuguanseibukan.com/api/system/email-worker" },
  });
  assert.equal(evaluate(manifest, { expectedProjectRef: productionRef }).ready, true);
  assert.equal(evaluate(manifest, { expectedProjectRef: STAGING_PROJECT_REF }).ready, false);
  assert.equal(evaluate(manifest, { expectedCommit: "cd".repeat(20) }).ready, false);
  assert.equal(evaluate(manifest, { expectedDeployment: "dpl_other123" }).ready, false);
  assert.equal(evaluate(manifest, { expectedProjectRef: "pkmllhaavadhaozmwapz" }).ready, false);
});

test("rejects unsafe URL forms, wrong methods, raw credentials and undocumented fields", () => {
  for (const request of [
    { ...validManifest().request, method: "GET" },
    { ...validManifest().request, url: "http://jingwuguanseibukan-staging.vercel.app/api/system/email-worker" },
    { ...validManifest().request, url: "https://jingwuguanseibukan-staging.vercel.app/api/system/email-worker?secret=value" },
    { ...validManifest().request, headerValue: "raw-value" },
    { ...validManifest().request, headerName: "authorization" },
  ]) assert.equal(evaluate(validManifest({ request })).ready, false);

  const unsafe = validManifest();
  unsafe["private-person@example.test"] = "raw";
  const result = evaluate(unsafe);
  assert.equal(result.ready, false);
  assert.doesNotMatch(JSON.stringify(result), /private-person|example\.test/);
});

test("requires a one-minute non-overlapping schedule with bounded timeouts", () => {
  for (const timing of [
    { ...validManifest().timing, cadenceSeconds: 300 },
    { ...validManifest().timing, maxConcurrentExecutions: 2 },
    { ...validManifest().timing, overlapPrevented: false },
    { ...validManifest().timing, providerTimeoutSeconds: 46 },
    { ...validManifest().timing, schedulerTimeoutSeconds: 45 },
    { ...validManifest().timing, schedulerTimeoutSeconds: 60 },
  ]) assert.equal(evaluate(validManifest({ timing })).ready, false);
});

test("requires retained failures, queue health and protected header handling", () => {
  const result = evaluate(validManifest({
    delivery: { automaticRetries: true, applicationIdempotencyVerified: false, nonSuccessResponsesRetained: false },
    security: { tlsVerified: false, secretStoredProtected: false, secretDistinctFromOtherSecrets: false, requestHeadersRedacted: false },
    monitoring: { owner: "TBD", alertOnNonSuccess: false, alertOnRateLimit: false, alertOnQueueFailure: false, maxOldestReadyEmailSeconds: 121 },
  }));
  assert.equal(result.ready, false);
  assert.ok(result.blockers.length >= 12);
});

test("requires ordered fresh live acceptance and an independent verifier", () => {
  const result = evaluate(validManifest({
    acceptance: {
      ...validManifest().acceptance,
      configuredAt: "2026-10-02T11:00:00+10:00",
      testedAt: "2026-10-02T10:00:00+10:00",
      verifiedAt: "2026-09-30T10:00:00+10:00",
      verifiedBy: "Scheduler owner",
      alertDeliveryTested: false,
      queueHealthTelemetryVerified: false,
      nonSuccessRetentionVerified: false,
    },
  }));
  assert.equal(result.ready, false);
  assert.ok(result.blockers.length >= 6);
});

test("reviewer independence is case- and whitespace-insensitive", () => {
  const manifest = validManifest();
  manifest.scheduler.owner = "Scheduler Owner";
  manifest.acceptance.verifiedBy = "  scheduler owner  ";
  const result = evaluate(manifest);
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(({ path }) => path === "acceptance.verifiedBy"));
});

test("requires zero-provider empty-queue acceptance and explicit approvals", () => {
  const result = evaluate(validManifest({
    acceptance: {
      ...validManifest().acceptance,
      emptyQueueConfirmed: false,
      responseStatus: 503,
      providerRequests: 1,
      noUnrelatedRowsChanged: false,
      noProductionMutation: false,
    },
    approvals: { operatorApproved: false, monitoringApproved: false, providerPlanApproved: false },
  }));
  assert.equal(result.ready, false);
  assert.ok(result.blockers.length >= 8);
});
