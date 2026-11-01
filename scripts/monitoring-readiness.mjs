import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const TARGETS = Object.freeze({
  staging: "https://jingwuguanseibukan-staging.vercel.app",
  production: "https://jingwuguanseibukan.com",
});
const RELEASE_BRANCH = "release/v1-readiness-20260918";
const STAGING_PROJECT_REF = "eomubndonbetszdbhsrj";
const RETIRED_PROJECT_REF = "pkmllhaavadhaozmwapz";
const PROJECT_REF = /^[a-z0-9]{20}$/;
const SHA = /^[a-f0-9]{40}$/;
const ISO_WITH_ZONE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const REQUIRED_WORKER_STATUSES = Object.freeze([401, 429, 500, 502, 503]);
const REQUIRED_QUEUE_FIELDS = Object.freeze([
  "stuckProcessingEmails",
  "exhaustedFailures",
  "oldPendingEmails",
  "overdueReadyEmails",
  "queuedEmails",
  "dueEmails",
  "duplicateDedupeKeys",
  "oldestReadyAgeSeconds",
]);
const REQUIRED_STOP_SIGNALS = Object.freeze([
  "authenticationFailure",
  "authorizationFailure",
  "databaseSecurityFailure",
  "migrationOrRestoreMismatch",
  "emailWorkerFailure",
  "muxFailure",
  "serverErrorRateBreach",
  "rollbackAccessFailure",
]);
const REQUIRED_REDACTIONS = Object.freeze([
  "authorizationHeaders",
  "cookiesAndSessions",
  "secretValues",
  "emailRecipientsAndBodies",
  "providerIdentifiers",
  "rawDatabaseErrors",
]);
const SCHEMA = Object.freeze({
  "$": ["manifestVersion", "environment", "projectRef", "applicationOrigin", "release", "owners", "evidence", "application", "auth", "database", "emailWorker", "push", "mux", "incident", "rollback", "releaseStopSignals", "redaction", "acceptance"],
  release: ["branch", "commitSha", "deploymentId"],
  owners: ["monitoring", "incidentCommander", "rollback", "security"],
  evidence: ["configuredAt", "acceptanceTestedAt", "verifiedAt", "verifiedBy", "protectedReference"],
  application: ["httpStatusCaptured", "routeAndMethodCaptured", "deploymentIdCaptured", "latencyCaptured", "alertOnErrorRate", "alertOnMissingTelemetry", "maxServerErrorRatePercent", "errorRateWindowMinutes"],
  auth: ["failedLoginRateMonitored", "adminAuthorizationFailuresMonitored", "passwordResetAbuseMonitored", "alertContainsNoIdentityData", "maxFailedLoginsPerFiveMinutes"],
  database: ["availabilityMonitored", "connectionSaturationMonitored", "migrationLedgerDriftMonitored", "rlsOrGrantRegressionMonitored", "privilegedAuditEventsMonitored", "backupFailureMonitored"],
  emailWorker: ["missingInvocationAlert", "staleClaimAlert", "exhaustedAttemptAlert", "queueGrowthAlert", "responseCountersCaptured", "alertOnEveryNonSuccessStatus", "maxInvocationGapSeconds", "maxOldestReadyEmailSeconds", "alertHttpStatuses", "queueHealthFields"],
  push: ["disposition", "providerFailuresMonitored", "persistenceFailuresMonitored", "deliveryFailuresMonitored", "alertDeliveryTested"],
  mux: ["apiFailuresMonitored", "credentialFailuresMonitored", "uploadProcessingFailuresMonitored", "signedPlaybackFailuresMonitored", "orphanAssetInventoryMonitored", "providerDetailsRedacted"],
  incident: ["runbookReference", "primaryAlertChannel", "backupAlertChannel", "criticalAcknowledgeMinutes", "escalationTested", "alertDeliveryTested", "providerStatusChecksDocumented", "incidentTimelineRetained"],
  rollback: ["knownGoodDeploymentReference", "recoveryPointReference", "applicationRollbackTested", "databaseRecoveryTested", "accessVerified", "monitoringContinuesDuringRollback", "decisionDeadlineMinutes"],
  releaseStopSignals: [...REQUIRED_STOP_SIGNALS, "pushFailure"],
  redaction: [...REQUIRED_REDACTIONS, "retentionDays"],
  acceptance: ["applicationAlertDelivered", "authAlertDelivered", "databaseAlertDelivered", "emailWorkerAlertDelivered", "pushAlertDelivered", "muxAlertDelivered", "rollbackAlertDelivered", "noProductionMutation"],
});
const FORBIDDEN_KEYS = new Set([
  "password",
  "secret",
  "secretvalue",
  "token",
  "tokenvalue",
  "accesstoken",
  "refreshtoken",
  "apikey",
  "clientsecret",
  "privatekey",
  "signingprivatekey",
  "servicerolekey",
  "publishablekey",
  "authorization",
  "headervalue",
  "databaseurl",
  "dburl",
  "connectionstring",
  "cookie",
  "session",
  "email",
  "emailaddress",
  "recipient",
  "recipientaddress",
  "memberid",
  "membernumber",
  "membername",
  "fullname",
  "userid",
  "profileid",
  "providerid",
  "assetid",
  "playbackid",
  "uploadid",
]);
const SECRET_VALUE = /(?:-----BEGIN [A-Z ]*PRIVATE KEY-----|\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.|(?:postgres(?:ql)?|https?):\/\/[^/\s:@]+:[^/\s@]+@|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b)/i;

function object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
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
  for (const key of keys) {
    if (!(key in source)) add(blockers, `${path}.${key}`, "is required");
  }
  return source;
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

function requireTrue(blockers, source, keys, prefix) {
  for (const key of keys) {
    if (source[key] !== true) add(blockers, `${prefix}.${key}`, "must be true");
  }
}

function scanForSecrets(value, blockers, path = "$") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanForSecrets(item, blockers, `${path}[${index}]`));
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      const childPath = `${path}.[field]`;
      const normalizedKey = key.replace(/[^a-z0-9]/gi, "").toLowerCase();
      if (FORBIDDEN_KEYS.has(normalizedKey)) {
        add(blockers, childPath, "secret-bearing fields are forbidden from this sanitized manifest");
      }
      scanForSecrets(child, blockers, childPath);
    }
    return;
  }
  if (typeof value === "string" && SECRET_VALUE.test(value)) {
    add(blockers, path, "appears to contain a credential or secret value");
  }
}

export function evaluateMonitoringReadiness(manifest, {
  expectedProjectRef,
  expectedCommit,
  expectedDeployment,
  now = Date.now(),
} = {}) {
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

  scanForSecrets(manifest, blockers);
  exactKeys(blockers, manifest, "$", SCHEMA["$"]);
  if (manifest.manifestVersion !== 1) add(blockers, "manifestVersion", "must equal 1");

  const release = exactKeys(blockers, manifest.release, "release", SCHEMA.release);
  if (release.branch !== RELEASE_BRANCH) add(blockers, "release.branch", `must equal ${RELEASE_BRANCH}`);
  if (!SHA.test(expectedCommit ?? "") || release.commitSha !== expectedCommit) {
    add(blockers, "release.commitSha", "must equal the independently supplied release commit");
  }
  if (typeof expectedDeployment !== "string" || !/^dpl_[A-Za-z0-9]{8,}$/.test(expectedDeployment) || release.deploymentId !== expectedDeployment) {
    add(blockers, "release.deploymentId", "must equal the independently supplied deployment id");
  }

  const environment = manifest.environment;
  if (!(environment in TARGETS)) {
    add(blockers, "environment", "must equal staging or production");
  }
  if (environment in TARGETS && manifest.applicationOrigin !== TARGETS[environment]) {
    add(blockers, "applicationOrigin", `must equal the exact ${environment} origin`);
  }
  if (!validProjectRef(expectedProjectRef)) {
    add(blockers, "expectedProjectRef", "must independently supply an exact 20-character project ref");
  } else if (environment === "staging" && expectedProjectRef !== STAGING_PROJECT_REF) {
    add(blockers, "expectedProjectRef", `must equal ${STAGING_PROJECT_REF} for staging`);
  } else if (environment === "production" && [STAGING_PROJECT_REF, RETIRED_PROJECT_REF].includes(expectedProjectRef)) {
    add(blockers, "expectedProjectRef", "must identify the active production project, not staging or retired");
  }
  if (manifest.projectRef !== expectedProjectRef) {
    add(blockers, "projectRef", "must equal the independently supplied project ref");
  }
  try {
    const origin = new URL(manifest.applicationOrigin);
    if (origin.origin !== manifest.applicationOrigin || origin.protocol !== "https:") {
      add(blockers, "applicationOrigin", "must be a credential-free HTTPS origin with no path, query or fragment");
    }
  } catch {
    add(blockers, "applicationOrigin", "must be a valid absolute URL");
  }

  const owners = exactKeys(blockers, manifest.owners, "owners", SCHEMA.owners);
  for (const key of ["monitoring", "incidentCommander", "rollback", "security"]) {
    requireText(blockers, owners[key], `owners.${key}`);
  }

  const evidence = exactKeys(blockers, manifest.evidence, "evidence", SCHEMA.evidence);
  for (const key of ["configuredAt", "acceptanceTestedAt", "verifiedAt"]) {
    if (!timestamp(evidence[key])) {
      add(blockers, `evidence.${key}`, "must be an ISO-8601 timestamp with an explicit offset");
    }
  }
  requireText(blockers, evidence.verifiedBy, "evidence.verifiedBy");
  requireText(blockers, evidence.protectedReference, "evidence.protectedReference");
  if (
    typeof evidence.protectedReference === "string" &&
    !/protected|vault|restricted|evidence/i.test(evidence.protectedReference)
  ) {
    add(blockers, "evidence.protectedReference", "must identify protected evidence without containing it");
  }
  if (timestamp(evidence.configuredAt) && timestamp(evidence.verifiedAt)) {
    const configuredAt = Date.parse(evidence.configuredAt);
    const acceptanceTestedAt = Date.parse(evidence.acceptanceTestedAt);
    const verifiedAt = Date.parse(evidence.verifiedAt);
    if (acceptanceTestedAt < configuredAt) add(blockers, "evidence.acceptanceTestedAt", "must not be earlier than configuredAt");
    if (verifiedAt < acceptanceTestedAt) add(blockers, "evidence.verifiedAt", "must not be earlier than acceptanceTestedAt");
    if (!Number.isFinite(now) || now < verifiedAt || now - verifiedAt > 24 * 60 * 60 * 1000) {
      add(blockers, "evidence.verifiedAt", "must be independently verified within the previous 24 hours");
    }
  }
  if (Object.values(owners).map(normalizedIdentity).includes(normalizedIdentity(evidence.verifiedBy))) {
    add(blockers, "evidence.verifiedBy", "must be independent from all operational owners");
  }

  const application = exactKeys(blockers, manifest.application, "application", SCHEMA.application);
  requireTrue(blockers, application, [
    "httpStatusCaptured",
    "routeAndMethodCaptured",
    "deploymentIdCaptured",
    "latencyCaptured",
    "alertOnErrorRate",
    "alertOnMissingTelemetry",
  ], "application");
  if (
    typeof application.maxServerErrorRatePercent !== "number" ||
    !Number.isFinite(application.maxServerErrorRatePercent) ||
    application.maxServerErrorRatePercent <= 0 ||
    application.maxServerErrorRatePercent > 5
  ) {
    add(blockers, "application.maxServerErrorRatePercent", "must be greater than 0 and no more than 5");
  }
  if (![5, 10, 15].includes(application.errorRateWindowMinutes)) {
    add(blockers, "application.errorRateWindowMinutes", "must equal 5, 10 or 15 minutes");
  }

  const auth = exactKeys(blockers, manifest.auth, "auth", SCHEMA.auth);
  requireTrue(blockers, auth, [
    "failedLoginRateMonitored",
    "adminAuthorizationFailuresMonitored",
    "passwordResetAbuseMonitored",
    "alertContainsNoIdentityData",
  ], "auth");
  if (!Number.isSafeInteger(auth.maxFailedLoginsPerFiveMinutes) || auth.maxFailedLoginsPerFiveMinutes < 3 || auth.maxFailedLoginsPerFiveMinutes > 100) {
    add(blockers, "auth.maxFailedLoginsPerFiveMinutes", "must be an integer from 3 to 100");
  }

  const database = exactKeys(blockers, manifest.database, "database", SCHEMA.database);
  requireTrue(blockers, database, [
    "availabilityMonitored",
    "connectionSaturationMonitored",
    "migrationLedgerDriftMonitored",
    "rlsOrGrantRegressionMonitored",
    "privilegedAuditEventsMonitored",
    "backupFailureMonitored",
  ], "database");

  const emailWorker = exactKeys(blockers, manifest.emailWorker, "emailWorker", SCHEMA.emailWorker);
  requireTrue(blockers, emailWorker, [
    "missingInvocationAlert",
    "staleClaimAlert",
    "exhaustedAttemptAlert",
    "queueGrowthAlert",
    "responseCountersCaptured",
    "alertOnEveryNonSuccessStatus",
  ], "emailWorker");
  if (!Number.isSafeInteger(emailWorker.maxInvocationGapSeconds) || emailWorker.maxInvocationGapSeconds < 60 || emailWorker.maxInvocationGapSeconds > 120) {
    add(blockers, "emailWorker.maxInvocationGapSeconds", "must be an integer from 60 to 120");
  }
  if (!Number.isSafeInteger(emailWorker.maxOldestReadyEmailSeconds) || emailWorker.maxOldestReadyEmailSeconds < 60 || emailWorker.maxOldestReadyEmailSeconds > 120) {
    add(blockers, "emailWorker.maxOldestReadyEmailSeconds", "must be an integer from 60 to 120");
  }
  const statuses = Array.isArray(emailWorker.alertHttpStatuses)
    ? [...new Set(emailWorker.alertHttpStatuses)].sort((a, b) => a - b)
    : [];
  if (!statuses.every(status => Number.isInteger(status) && status >= 400 && status <= 599) ||
      !REQUIRED_WORKER_STATUSES.every(status => statuses.includes(status))) {
    add(blockers, "emailWorker.alertHttpStatuses", "must include 401, 429, 500, 502 and 503 and contain only HTTP error statuses");
  }
  const queueFields = Array.isArray(emailWorker.queueHealthFields)
    ? [...new Set(emailWorker.queueHealthFields)].sort()
    : [];
  if (JSON.stringify(queueFields) !== JSON.stringify([...REQUIRED_QUEUE_FIELDS].sort())) {
    add(blockers, "emailWorker.queueHealthFields", "must contain the complete sanitized queue-health field set");
  }

  const push = exactKeys(blockers, manifest.push, "push", SCHEMA.push);
  if (!["hidden", "enabled"].includes(push.disposition)) {
    add(blockers, "push.disposition", "must equal hidden or enabled");
  }
  const pushChecks = ["providerFailuresMonitored", "persistenceFailuresMonitored", "deliveryFailuresMonitored", "alertDeliveryTested"];
  for (const key of pushChecks) {
    if (push.disposition === "enabled" && push[key] !== true) add(blockers, `push.${key}`, "must be true when push is enabled");
    if (push.disposition === "hidden" && push[key] !== false) add(blockers, `push.${key}`, "must be false when push is hidden");
  }

  const mux = exactKeys(blockers, manifest.mux, "mux", SCHEMA.mux);
  requireTrue(blockers, mux, [
    "apiFailuresMonitored",
    "credentialFailuresMonitored",
    "uploadProcessingFailuresMonitored",
    "signedPlaybackFailuresMonitored",
    "orphanAssetInventoryMonitored",
    "providerDetailsRedacted",
  ], "mux");

  const incident = exactKeys(blockers, manifest.incident, "incident", SCHEMA.incident);
  requireText(blockers, incident.runbookReference, "incident.runbookReference");
  requireText(blockers, incident.primaryAlertChannel, "incident.primaryAlertChannel");
  requireText(blockers, incident.backupAlertChannel, "incident.backupAlertChannel");
  if (incident.primaryAlertChannel === incident.backupAlertChannel) {
    add(blockers, "incident.backupAlertChannel", "must differ from the primary alert channel");
  }
  if (!Number.isSafeInteger(incident.criticalAcknowledgeMinutes) || incident.criticalAcknowledgeMinutes < 1 || incident.criticalAcknowledgeMinutes > 15) {
    add(blockers, "incident.criticalAcknowledgeMinutes", "must be an integer from 1 to 15");
  }
  requireTrue(blockers, incident, [
    "escalationTested",
    "alertDeliveryTested",
    "providerStatusChecksDocumented",
    "incidentTimelineRetained",
  ], "incident");

  const rollback = exactKeys(blockers, manifest.rollback, "rollback", SCHEMA.rollback);
  requireText(blockers, rollback.knownGoodDeploymentReference, "rollback.knownGoodDeploymentReference");
  requireText(blockers, rollback.recoveryPointReference, "rollback.recoveryPointReference");
  requireTrue(blockers, rollback, [
    "applicationRollbackTested",
    "databaseRecoveryTested",
    "accessVerified",
    "monitoringContinuesDuringRollback",
  ], "rollback");
  if (!Number.isSafeInteger(rollback.decisionDeadlineMinutes) || rollback.decisionDeadlineMinutes < 5 || rollback.decisionDeadlineMinutes > 60) {
    add(blockers, "rollback.decisionDeadlineMinutes", "must be an integer from 5 to 60");
  }

  const stopSignals = exactKeys(blockers, manifest.releaseStopSignals, "releaseStopSignals", SCHEMA.releaseStopSignals);
  requireTrue(blockers, stopSignals, REQUIRED_STOP_SIGNALS, "releaseStopSignals");
  if (push.disposition === "enabled" && stopSignals.pushFailure !== true) add(blockers, "releaseStopSignals.pushFailure", "must be true when push is enabled");
  if (push.disposition === "hidden" && stopSignals.pushFailure !== false) add(blockers, "releaseStopSignals.pushFailure", "must be false when push is hidden");
  const redaction = exactKeys(blockers, manifest.redaction, "redaction", SCHEMA.redaction);
  requireTrue(blockers, redaction, REQUIRED_REDACTIONS, "redaction");
  if (!Number.isSafeInteger(redaction.retentionDays) || redaction.retentionDays < 7 || redaction.retentionDays > 365) {
    add(blockers, "redaction.retentionDays", "must be an integer from 7 to 365");
  }

  const acceptance = exactKeys(blockers, manifest.acceptance, "acceptance", SCHEMA.acceptance);
  requireTrue(blockers, acceptance, [
    "applicationAlertDelivered",
    "authAlertDelivered",
    "databaseAlertDelivered",
    "emailWorkerAlertDelivered",
    "muxAlertDelivered",
    "rollbackAlertDelivered",
    "noProductionMutation",
  ], "acceptance");
  if (push.disposition === "enabled" && acceptance.pushAlertDelivered !== true) add(blockers, "acceptance.pushAlertDelivered", "must be true when push is enabled");
  if (push.disposition === "hidden" && acceptance.pushAlertDelivered !== false) add(blockers, "acceptance.pushAlertDelivered", "must be false when push is hidden");

  warnings.push(
    "This offline gate validates a sanitized monitoring record only; it does not query telemetry, trigger alerts, authorize rollback or contact a provider.",
  );

  return {
    ready: blockers.length === 0,
    blockers,
    warnings,
    summary: blockers.length === 0
      ? {
          environment,
          projectRef: manifest.projectRef,
          commitSha: release.commitSha,
          deploymentId: release.deploymentId,
          applicationOrigin: manifest.applicationOrigin,
          verifiedAt: evidence.verifiedAt,
          maxServerErrorRatePercent: application.maxServerErrorRatePercent,
          maxOldestReadyEmailSeconds: emailWorker.maxOldestReadyEmailSeconds,
          criticalAcknowledgeMinutes: incident.criticalAcknowledgeMinutes,
          decisionDeadlineMinutes: rollback.decisionDeadlineMinutes,
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
    console.log("Usage: node scripts/monitoring-readiness.mjs --manifest=<protected-sanitized-json> --expected-project-ref=<ref> --expected-commit=<40-char-sha> --expected-deployment=<dpl_id>");
    return 0;
  }
  const manifestPath = option(argv, "--manifest");
  const expectedProjectRef = option(argv, "--expected-project-ref");
  const expectedCommit = option(argv, "--expected-commit");
  const expectedDeployment = option(argv, "--expected-deployment");
  if (!manifestPath || !expectedProjectRef || !expectedCommit || !expectedDeployment) {
    console.error(JSON.stringify({ ready: false, error: "A protected manifest and expected project, commit and deployment are required." }, null, 2));
    return 2;
  }
  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch {
    console.error(JSON.stringify({ ready: false, error: "Monitoring manifest could not be read." }, null, 2));
    return 2;
  }
  const result = evaluateMonitoringReadiness(manifest, { expectedProjectRef, expectedCommit, expectedDeployment });
  console.log(JSON.stringify(result, null, 2));
  return result.ready ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exitCode = await runCli();
}
