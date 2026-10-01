import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const TARGETS = Object.freeze({
  staging: "https://jingwuguanseibukan-staging.vercel.app/api/system/email-worker",
  production: "https://jingwuguanseibukan.com/api/system/email-worker",
});

const ISO_WITH_ZONE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function add(blockers, path, message) {
  blockers.push({ path, message });
}

function requireText(blockers, value, path) {
  if (
    typeof value !== "string" ||
    value.trim().length < 2 ||
    /replace|placeholder|tbd|todo/i.test(value)
  ) {
    add(blockers, path, "must be a completed non-placeholder value");
    return false;
  }
  return true;
}

function timestamp(value) {
  return typeof value === "string" &&
    ISO_WITH_ZONE.test(value) &&
    Number.isFinite(Date.parse(value));
}

export function evaluateEmailScheduler(manifest) {
  const blockers = [];
  const warnings = [];

  if (manifest === null || typeof manifest !== "object" || Array.isArray(manifest)) {
    return {
      ready: false,
      blockers: [{ path: "$", message: "manifest must be a JSON object" }],
      warnings,
      summary: null,
    };
  }

  if (manifest.manifestVersion !== 1) {
    add(blockers, "manifestVersion", "must equal 1");
  }

  const environment = manifest.environment;
  if (!(environment in TARGETS)) {
    add(blockers, "environment", "must equal staging or production");
  }

  const scheduler = object(manifest.scheduler);
  requireText(blockers, scheduler.provider, "scheduler.provider");
  requireText(blockers, scheduler.jobId, "scheduler.jobId");
  requireText(blockers, scheduler.owner, "scheduler.owner");
  if (scheduler.planSupportsSixtySeconds !== true) {
    add(blockers, "scheduler.planSupportsSixtySeconds", "must be true");
  }
  if (scheduler.enabled !== true) {
    add(blockers, "scheduler.enabled", "must be true");
  }

  const request = object(manifest.request);
  if (request.method !== "POST") {
    add(blockers, "request.method", "must equal POST");
  }
  if (environment in TARGETS && request.url !== TARGETS[environment]) {
    add(blockers, "request.url", `must equal the exact ${environment} email-worker URL`);
  }
  try {
    const url = new URL(request.url);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      url.search ||
      url.hash
    ) {
      add(blockers, "request.url", "must be credential-free HTTPS with no custom port, query or fragment");
    }
  } catch {
    add(blockers, "request.url", "must be a valid absolute URL");
  }
  if (request.headerName !== "x-worker-secret") {
    add(blockers, "request.headerName", "must equal x-worker-secret");
  }
  if ("headerValue" in request || "secretValue" in request || "token" in request) {
    add(blockers, "request", "must not contain a raw secret or token");
  }
  requireText(blockers, request.secretReference, "request.secretReference");
  if (
    typeof request.secretReference === "string" &&
    !/secret|protected|vault|credential/i.test(request.secretReference)
  ) {
    add(blockers, "request.secretReference", "must identify a protected secret source without containing its value");
  }

  const timing = object(manifest.timing);
  if (timing.cadenceSeconds !== 60) {
    add(blockers, "timing.cadenceSeconds", "must equal 60");
  }
  if (timing.maxConcurrentExecutions !== 1) {
    add(blockers, "timing.maxConcurrentExecutions", "must equal 1");
  }
  if (timing.overlapPrevented !== true) {
    add(blockers, "timing.overlapPrevented", "must be true");
  }
  if (
    !Number.isSafeInteger(timing.workerBudgetSeconds) ||
    timing.workerBudgetSeconds < 30 ||
    timing.workerBudgetSeconds > 50
  ) {
    add(blockers, "timing.workerBudgetSeconds", "must be an integer from 30 to 50");
  }
  if (
    !Number.isSafeInteger(timing.providerTimeoutSeconds) ||
    timing.providerTimeoutSeconds < 5 ||
    timing.providerTimeoutSeconds > 15 ||
    timing.providerTimeoutSeconds >= timing.workerBudgetSeconds
  ) {
    add(blockers, "timing.providerTimeoutSeconds", "must be an integer from 5 to 15 and less than the worker budget");
  }
  if (
    !Number.isSafeInteger(timing.schedulerTimeoutSeconds) ||
    timing.schedulerTimeoutSeconds <= timing.workerBudgetSeconds ||
    timing.schedulerTimeoutSeconds >= timing.cadenceSeconds
  ) {
    add(blockers, "timing.schedulerTimeoutSeconds", "must exceed the worker budget and remain below the cadence");
  }

  const delivery = object(manifest.delivery);
  if (delivery.automaticRetries !== false) {
    add(blockers, "delivery.automaticRetries", "must be false to avoid unbounded duplicate or overlapping runs");
  }
  if (delivery.applicationIdempotencyVerified !== true) {
    add(blockers, "delivery.applicationIdempotencyVerified", "must be true");
  }
  if (delivery.nonSuccessResponsesRetained !== true) {
    add(blockers, "delivery.nonSuccessResponsesRetained", "must be true");
  }

  const security = object(manifest.security);
  for (const key of [
    "tlsVerified",
    "secretStoredProtected",
    "secretDistinctFromOtherSecrets",
    "requestHeadersRedacted",
  ]) {
    if (security[key] !== true) {
      add(blockers, `security.${key}`, "must be true");
    }
  }

  const monitoring = object(manifest.monitoring);
  requireText(blockers, monitoring.owner, "monitoring.owner");
  if (monitoring.alertOnNonSuccess !== true) {
    add(blockers, "monitoring.alertOnNonSuccess", "must be true");
  }
  if (monitoring.alertOnRateLimit !== true) {
    add(blockers, "monitoring.alertOnRateLimit", "must be true");
  }
  if (monitoring.alertOnQueueFailure !== true) {
    add(blockers, "monitoring.alertOnQueueFailure", "must be true");
  }
  if (
    !Number.isSafeInteger(monitoring.maxOldestReadyEmailSeconds) ||
    monitoring.maxOldestReadyEmailSeconds < 60 ||
    monitoring.maxOldestReadyEmailSeconds > 120
  ) {
    add(blockers, "monitoring.maxOldestReadyEmailSeconds", "must be an integer from 60 to 120");
  }

  const acceptance = object(manifest.acceptance);
  if (!timestamp(acceptance.testedAt)) {
    add(blockers, "acceptance.testedAt", "must be an ISO-8601 timestamp with an explicit offset");
  }
  requireText(blockers, acceptance.verifiedBy, "acceptance.verifiedBy");
  if (acceptance.emptyQueueConfirmed !== true) {
    add(blockers, "acceptance.emptyQueueConfirmed", "must be true");
  }
  if (acceptance.responseStatus !== 200) {
    add(blockers, "acceptance.responseStatus", "must equal 200");
  }
  if (acceptance.providerRequests !== 0) {
    add(blockers, "acceptance.providerRequests", "must equal 0 for the scheduler-only acceptance run");
  }
  if (acceptance.noUnrelatedRowsChanged !== true) {
    add(blockers, "acceptance.noUnrelatedRowsChanged", "must be true");
  }

  const approvals = object(manifest.approvals);
  for (const key of ["operatorApproved", "monitoringApproved", "providerPlanApproved"]) {
    if (approvals[key] !== true) {
      add(blockers, `approvals.${key}`, "must be true");
    }
  }

  warnings.push(
    "This offline gate validates recorded scheduler evidence only; it does not invoke the worker or authorize production.",
  );

  return {
    ready: blockers.length === 0,
    blockers,
    warnings,
    summary: blockers.length === 0
      ? {
          environment,
          provider: scheduler.provider,
          cadenceSeconds: timing.cadenceSeconds,
          testedAt: acceptance.testedAt,
        }
      : null,
  };
}

function option(argv, name) {
  const prefix = `${name}=`;
  return argv.find(value => value.startsWith(prefix))?.slice(prefix.length);
}

export async function runCli(argv = process.argv.slice(2)) {
  if (argv.includes("--help")) {
    console.log("Usage: node scripts/email-scheduler-readiness.mjs --manifest=<protected-json>");
    return 0;
  }

  const manifestPath = option(argv, "--manifest");
  if (!manifestPath) {
    console.error(JSON.stringify({ ready: false, error: "A protected scheduler manifest is required." }, null, 2));
    return 2;
  }

  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch {
    console.error(JSON.stringify({ ready: false, error: "Scheduler manifest could not be read." }, null, 2));
    return 2;
  }

  const result = evaluateEmailScheduler(manifest);
  console.log(JSON.stringify(result, null, 2));
  return result.ready ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exitCode = await runCli();
}
