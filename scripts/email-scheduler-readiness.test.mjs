import assert from "node:assert/strict";
import test from "node:test";

import { evaluateEmailScheduler } from "./email-scheduler-readiness.mjs";

function validManifest(overrides = {}) {
  const manifest = {
    manifestVersion: 1,
    environment: "staging",
    scheduler: {
      provider: "Reviewed scheduler",
      jobId: "jwg-staging-email-worker",
      owner: "Operations owner",
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
      testedAt: "2026-10-01T18:00:00+10:00",
      verifiedBy: "Independent verifier",
      emptyQueueConfirmed: true,
      responseStatus: 200,
      providerRequests: 0,
      noUnrelatedRowsChanged: true,
    },
    approvals: {
      operatorApproved: true,
      monitoringApproved: true,
      providerPlanApproved: true,
    },
  };
  return { ...manifest, ...overrides };
}

test("accepts complete staging scheduler evidence without exposing identities", () => {
  const result = evaluateEmailScheduler(validManifest());
  assert.equal(result.ready, true);
  assert.deepEqual(result.blockers, []);
  assert.equal(result.summary.environment, "staging");
  assert.doesNotMatch(JSON.stringify(result), /Operations owner|Independent verifier|EMAIL_WORKER_SECRET/);
});

test("binds each environment to its exact worker endpoint", () => {
  assert.equal(evaluateEmailScheduler(validManifest({
    request: {
      ...validManifest().request,
      url: "https://jingwuguanseibukan.com/api/system/email-worker",
    },
  })).ready, false);

  assert.equal(evaluateEmailScheduler(validManifest({
    environment: "production",
    request: {
      ...validManifest().request,
      url: "https://jingwuguanseibukan.com/api/system/email-worker",
    },
  })).ready, true);
});

test("rejects unsafe URL forms, wrong methods and raw credentials", () => {
  for (const request of [
    { ...validManifest().request, method: "GET" },
    { ...validManifest().request, url: "http://jingwuguanseibukan-staging.vercel.app/api/system/email-worker" },
    { ...validManifest().request, url: "https://jingwuguanseibukan-staging.vercel.app/api/system/email-worker?secret=value" },
    { ...validManifest().request, headerValue: "raw-value" },
    { ...validManifest().request, headerName: "authorization" },
  ]) {
    assert.equal(evaluateEmailScheduler(validManifest({ request })).ready, false);
  }
});

test("requires a one-minute non-overlapping schedule with bounded timeouts", () => {
  for (const timing of [
    { ...validManifest().timing, cadenceSeconds: 300 },
    { ...validManifest().timing, maxConcurrentExecutions: 2 },
    { ...validManifest().timing, overlapPrevented: false },
    { ...validManifest().timing, providerTimeoutSeconds: 46 },
    { ...validManifest().timing, schedulerTimeoutSeconds: 45 },
    { ...validManifest().timing, schedulerTimeoutSeconds: 60 },
  ]) {
    assert.equal(evaluateEmailScheduler(validManifest({ timing })).ready, false);
  }
});

test("requires monitored no-retry delivery and protected secret handling", () => {
  const result = evaluateEmailScheduler(validManifest({
    delivery: {
      automaticRetries: true,
      applicationIdempotencyVerified: false,
      nonSuccessResponsesRetained: false,
    },
    security: {
      tlsVerified: false,
      secretStoredProtected: false,
      secretDistinctFromOtherSecrets: false,
      requestHeadersRedacted: false,
    },
    monitoring: {
      owner: "TBD",
      alertOnNonSuccess: false,
      alertOnRateLimit: false,
      alertOnQueueFailure: false,
      maxOldestReadyEmailSeconds: 121,
    },
  }));
  assert.equal(result.ready, false);
  assert.ok(result.blockers.length >= 12);
});

test("requires an empty-queue zero-provider acceptance and explicit approvals", () => {
  const result = evaluateEmailScheduler(validManifest({
    acceptance: {
      testedAt: "not-a-date",
      verifiedBy: "REPLACE_ME",
      emptyQueueConfirmed: false,
      responseStatus: 503,
      providerRequests: 1,
      noUnrelatedRowsChanged: false,
    },
    approvals: {
      operatorApproved: false,
      monitoringApproved: false,
      providerPlanApproved: false,
    },
  }));
  assert.equal(result.ready, false);
  assert.ok(result.blockers.length >= 9);
});
