import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export const RELEASE_BRANCH = "release/v1-readiness-20260918";
export const STAGING_PROJECT_REF = "eomubndonbetszdbhsrj";
export const RETIRED_PROJECT_REF = "pkmllhaavadhaozmwapz";

const TARGETS = Object.freeze({
  staging: "https://jingwuguanseibukan-staging.vercel.app/api/system/email-worker",
  production: "https://jingwuguanseibukan.com/api/system/email-worker",
});
const PROJECT_REF = /^[a-z0-9]{20}$/;
const SHA = /^[a-f0-9]{40}$/;
const ISO_WITH_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const MAX_EVIDENCE_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;
const SCHEMA = Object.freeze({
  "$": ["manifestVersion", "environment", "projectRef", "release", "scheduler", "request", "timing", "delivery", "security", "monitoring", "acceptance", "approvals"],
  release: ["branch", "commitSha", "deploymentId"],
  scheduler: ["provider", "jobId", "owner", "planSupportsSixtySeconds", "enabled"],
  request: ["method", "url", "headerName", "secretReference"],
  timing: ["cadenceSeconds", "maxConcurrentExecutions", "overlapPrevented", "workerBudgetSeconds", "providerTimeoutSeconds", "schedulerTimeoutSeconds"],
  delivery: ["automaticRetries", "applicationIdempotencyVerified", "nonSuccessResponsesRetained"],
  security: ["tlsVerified", "secretStoredProtected", "secretDistinctFromOtherSecrets", "requestHeadersRedacted"],
  monitoring: ["owner", "alertOnNonSuccess", "alertOnRateLimit", "alertOnQueueFailure", "maxOldestReadyEmailSeconds"],
  acceptance: ["configuredAt", "testedAt", "verifiedAt", "verifiedBy", "protectedReference", "emptyQueueConfirmed", "responseStatus", "providerRequests", "noUnrelatedRowsChanged", "nonSuccessRetentionVerified", "queueHealthTelemetryVerified", "alertDeliveryTested", "noProductionMutation"],
  approvals: ["operatorApproved", "monitoringApproved", "providerPlanApproved"],
});
const FORBIDDEN_KEYS = new Set([
  "password", "secret", "secretvalue", "token", "tokenvalue", "accesstoken",
  "refreshtoken", "apikey", "clientsecret", "privatekey", "servicerolekey",
  "publishablekey", "authorization", "headervalue", "databaseurl", "dburl",
  "connectionstring", "cookie", "session", "email", "emailaddress", "recipient",
  "memberid", "membernumber", "membername", "fullname", "userid", "profileid",
]);
const SECRET_VALUE = /(?:-----BEGIN [A-Z ]*PRIVATE KEY-----|\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.|(?:postgres(?:ql)?|https?):\/\/[^/\s:@]+:[^/\s@]+@|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b)/i;

function object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function add(blockers, path, message) {
  blockers.push({ path, message });
}

function normalizedIdentity(value) {
  return typeof value === "string" ? value.trim().toLocaleLowerCase("en-US") : "";
}

function validProjectRef(value) {
  return typeof value === "string" && PROJECT_REF.test(value) && !/^(.)\1{19}$/.test(value);
}

function exactKeys(blockers, value, path, keys) {
  const source = object(value);
  if (source !== value) add(blockers, path, "must be an object using the documented sanitized schema");
  if (Object.keys(source).some(key => !keys.includes(key))) {
    add(blockers, path, "contains an unsupported field; field names are intentionally redacted");
  }
  for (const key of keys) if (!(key in source)) add(blockers, `${path}.${key}`, "is required");
  return source;
}

function requireText(blockers, value, path) {
  if (typeof value !== "string" || value.trim().length < 2 || /replace|placeholder|tbd|todo|pending/i.test(value)) {
    add(blockers, path, "must be a completed non-placeholder value");
    return false;
  }
  return true;
}

function timestamp(blockers, value, path, now) {
  if (typeof value !== "string" || !ISO_WITH_ZONE.test(value) || !Number.isFinite(Date.parse(value))) {
    add(blockers, path, "must be an ISO-8601 timestamp with an explicit offset");
    return null;
  }
  const parsed = Date.parse(value);
  if (parsed > now + MAX_CLOCK_SKEW_MS) add(blockers, path, "must not be in the future");
  return parsed;
}

function scanForSecrets(value, blockers, path = "$") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanForSecrets(item, blockers, `${path}[${index}]`));
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      const childPath = `${path}.[field]`;
      if (FORBIDDEN_KEYS.has(key.replace(/[^a-z0-9]/gi, "").toLowerCase())) {
        add(blockers, childPath, "secret-bearing fields are forbidden from this sanitized manifest");
      }
      scanForSecrets(child, blockers, childPath);
    }
    return;
  }
  if (typeof value === "string" && SECRET_VALUE.test(value)) {
    add(blockers, path, "appears to contain a credential, identity or secret value");
  }
}

export function evaluateEmailScheduler(manifest, {
  expectedProjectRef,
  expectedCommit,
  expectedDeployment,
  now = Date.now(),
} = {}) {
  const blockers = [];
  const warnings = [];

  if (manifest === null || typeof manifest !== "object" || Array.isArray(manifest)) {
    return { ready: false, blockers: [{ path: "$", message: "manifest must be a JSON object" }], warnings, summary: null };
  }

  scanForSecrets(manifest, blockers);
  exactKeys(blockers, manifest, "$", SCHEMA["$"]);
  if (manifest.manifestVersion !== 1) add(blockers, "manifestVersion", "must equal 1");

  const environment = manifest.environment;
  if (!(environment in TARGETS)) add(blockers, "environment", "must equal staging or production");
  if (!validProjectRef(expectedProjectRef)) {
    add(blockers, "expectedProjectRef", "must independently supply an exact 20-character project ref");
  } else if (environment === "staging" && expectedProjectRef !== STAGING_PROJECT_REF) {
    add(blockers, "expectedProjectRef", `must equal ${STAGING_PROJECT_REF} for staging`);
  } else if (environment === "production" && [STAGING_PROJECT_REF, RETIRED_PROJECT_REF].includes(expectedProjectRef)) {
    add(blockers, "expectedProjectRef", "must identify the active production project, not staging or retired");
  }
  if (manifest.projectRef !== expectedProjectRef) add(blockers, "projectRef", "must equal the independently supplied project ref");

  const release = exactKeys(blockers, manifest.release, "release", SCHEMA.release);
  if (release.branch !== RELEASE_BRANCH) add(blockers, "release.branch", `must equal ${RELEASE_BRANCH}`);
  if (!SHA.test(expectedCommit ?? "") || release.commitSha !== expectedCommit) {
    add(blockers, "release.commitSha", "must equal the independently supplied release commit");
  }
  if (typeof expectedDeployment !== "string" || !/^dpl_[A-Za-z0-9]{8,}$/.test(expectedDeployment) || release.deploymentId !== expectedDeployment) {
    add(blockers, "release.deploymentId", "must equal the independently supplied deployment id");
  }

  const scheduler = exactKeys(blockers, manifest.scheduler, "scheduler", SCHEMA.scheduler);
  requireText(blockers, scheduler.provider, "scheduler.provider");
  requireText(blockers, scheduler.jobId, "scheduler.jobId");
  requireText(blockers, scheduler.owner, "scheduler.owner");
  if (scheduler.planSupportsSixtySeconds !== true) add(blockers, "scheduler.planSupportsSixtySeconds", "must be true");
  if (scheduler.enabled !== true) add(blockers, "scheduler.enabled", "must be true");

  const request = exactKeys(blockers, manifest.request, "request", SCHEMA.request);
  if (request.method !== "POST") add(blockers, "request.method", "must equal POST");
  if (environment in TARGETS && request.url !== TARGETS[environment]) add(blockers, "request.url", `must equal the exact ${environment} email-worker URL`);
  try {
    const url = new URL(request.url);
    if (url.protocol !== "https:" || url.username || url.password || url.port || url.search || url.hash) {
      add(blockers, "request.url", "must be credential-free HTTPS with no custom port, query or fragment");
    }
  } catch {
    add(blockers, "request.url", "must be a valid absolute URL");
  }
  if (request.headerName !== "x-worker-secret") add(blockers, "request.headerName", "must equal x-worker-secret");
  requireText(blockers, request.secretReference, "request.secretReference");
  if (typeof request.secretReference === "string" && !/protected|vault|credential/i.test(request.secretReference)) {
    add(blockers, "request.secretReference", "must identify a protected secret source without containing its value");
  }

  const timing = exactKeys(blockers, manifest.timing, "timing", SCHEMA.timing);
  if (timing.cadenceSeconds !== 60) add(blockers, "timing.cadenceSeconds", "must equal 60");
  if (timing.maxConcurrentExecutions !== 1) add(blockers, "timing.maxConcurrentExecutions", "must equal 1");
  if (timing.overlapPrevented !== true) add(blockers, "timing.overlapPrevented", "must be true");
  if (!Number.isSafeInteger(timing.workerBudgetSeconds) || timing.workerBudgetSeconds < 30 || timing.workerBudgetSeconds > 50) add(blockers, "timing.workerBudgetSeconds", "must be an integer from 30 to 50");
  if (!Number.isSafeInteger(timing.providerTimeoutSeconds) || timing.providerTimeoutSeconds < 5 || timing.providerTimeoutSeconds > 15 || timing.providerTimeoutSeconds >= timing.workerBudgetSeconds) add(blockers, "timing.providerTimeoutSeconds", "must be an integer from 5 to 15 and less than the worker budget");
  if (!Number.isSafeInteger(timing.schedulerTimeoutSeconds) || timing.schedulerTimeoutSeconds <= timing.workerBudgetSeconds || timing.schedulerTimeoutSeconds >= timing.cadenceSeconds) add(blockers, "timing.schedulerTimeoutSeconds", "must exceed the worker budget and remain below the cadence");

  const delivery = exactKeys(blockers, manifest.delivery, "delivery", SCHEMA.delivery);
  if (delivery.automaticRetries !== false) add(blockers, "delivery.automaticRetries", "must be false to avoid scheduler-level duplicate runs");
  if (delivery.applicationIdempotencyVerified !== true) add(blockers, "delivery.applicationIdempotencyVerified", "must be true");
  if (delivery.nonSuccessResponsesRetained !== true) add(blockers, "delivery.nonSuccessResponsesRetained", "must be true");

  const security = exactKeys(blockers, manifest.security, "security", SCHEMA.security);
  for (const key of SCHEMA.security) if (security[key] !== true) add(blockers, `security.${key}`, "must be true");

  const monitoring = exactKeys(blockers, manifest.monitoring, "monitoring", SCHEMA.monitoring);
  requireText(blockers, monitoring.owner, "monitoring.owner");
  for (const key of ["alertOnNonSuccess", "alertOnRateLimit", "alertOnQueueFailure"]) if (monitoring[key] !== true) add(blockers, `monitoring.${key}`, "must be true");
  if (!Number.isSafeInteger(monitoring.maxOldestReadyEmailSeconds) || monitoring.maxOldestReadyEmailSeconds < 60 || monitoring.maxOldestReadyEmailSeconds > 120) add(blockers, "monitoring.maxOldestReadyEmailSeconds", "must be an integer from 60 to 120");

  const acceptance = exactKeys(blockers, manifest.acceptance, "acceptance", SCHEMA.acceptance);
  const configuredAt = timestamp(blockers, acceptance.configuredAt, "acceptance.configuredAt", now);
  const testedAt = timestamp(blockers, acceptance.testedAt, "acceptance.testedAt", now);
  const verifiedAt = timestamp(blockers, acceptance.verifiedAt, "acceptance.verifiedAt", now);
  if (configuredAt !== null && testedAt !== null && testedAt < configuredAt) add(blockers, "acceptance.testedAt", "must not be earlier than configuredAt");
  if (testedAt !== null && verifiedAt !== null && verifiedAt < testedAt) add(blockers, "acceptance.verifiedAt", "must not be earlier than testedAt");
  if (verifiedAt !== null && (!Number.isFinite(now) || now < verifiedAt || now - verifiedAt > MAX_EVIDENCE_AGE_MS)) add(blockers, "acceptance.verifiedAt", "must be independently verified within the previous 24 hours");
  requireText(blockers, acceptance.verifiedBy, "acceptance.verifiedBy");
  requireText(blockers, acceptance.protectedReference, "acceptance.protectedReference");
  if (typeof acceptance.protectedReference === "string" && !/protected|vault|restricted|evidence/i.test(acceptance.protectedReference)) add(blockers, "acceptance.protectedReference", "must identify protected evidence without containing it");
  if ([scheduler.owner, monitoring.owner].map(normalizedIdentity).includes(normalizedIdentity(acceptance.verifiedBy))) add(blockers, "acceptance.verifiedBy", "must be independent from scheduler and monitoring ownership");
  for (const key of ["emptyQueueConfirmed", "noUnrelatedRowsChanged", "nonSuccessRetentionVerified", "queueHealthTelemetryVerified", "alertDeliveryTested", "noProductionMutation"]) if (acceptance[key] !== true) add(blockers, `acceptance.${key}`, "must be true");
  if (acceptance.responseStatus !== 200) add(blockers, "acceptance.responseStatus", "must equal 200");
  if (acceptance.providerRequests !== 0) add(blockers, "acceptance.providerRequests", "must equal 0 for the empty-queue scheduler acceptance");

  const approvals = exactKeys(blockers, manifest.approvals, "approvals", SCHEMA.approvals);
  for (const key of SCHEMA.approvals) if (approvals[key] !== true) add(blockers, `approvals.${key}`, "must be true");

  warnings.push("This offline gate validates a sanitized scheduler record only; it does not invoke the worker, contact a provider or authorize production.");
  return {
    ready: blockers.length === 0,
    blockers,
    warnings,
    summary: blockers.length === 0 ? {
      environment,
      projectRef: manifest.projectRef,
      commitSha: release.commitSha,
      deploymentId: release.deploymentId,
      endpoint: request.url,
      cadenceSeconds: timing.cadenceSeconds,
      verifiedAt: acceptance.verifiedAt,
    } : null,
  };
}

function option(argv, name) {
  const prefix = `${name}=`;
  return argv.find(value => value.startsWith(prefix))?.slice(prefix.length);
}

export async function runCli(argv = process.argv.slice(2)) {
  if (argv.includes("--help")) {
    console.log("Usage: node scripts/email-scheduler-readiness.mjs --manifest=<protected-json> --expected-project-ref=<ref> --expected-commit=<sha> --expected-deployment=<dpl_id>");
    return 0;
  }
  const manifestPath = option(argv, "--manifest");
  const expectedProjectRef = option(argv, "--expected-project-ref");
  const expectedCommit = option(argv, "--expected-commit");
  const expectedDeployment = option(argv, "--expected-deployment");
  if (!manifestPath || !expectedProjectRef || !expectedCommit || !expectedDeployment) {
    console.error(JSON.stringify({ ready: false, error: "A protected manifest and independently supplied project, commit and deployment are required." }, null, 2));
    return 2;
  }
  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch {
    console.error(JSON.stringify({ ready: false, error: "Scheduler manifest could not be read." }, null, 2));
    return 2;
  }
  const result = evaluateEmailScheduler(manifest, { expectedProjectRef, expectedCommit, expectedDeployment });
  console.log(JSON.stringify(result, null, 2));
  return result.ready ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exitCode = await runCli();
