import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import { RELEASE_MIGRATION_CONTRACT } from "./recovery-ledger-fingerprint.mjs";

export const STAGING_PROJECT_REF = "eomubndonbetszdbhsrj";

export const REQUIRED_COMPONENTS = Object.freeze([
  "applicationDatabase",
  "migrationLedger",
  "authUsersAndIdentities",
  "storageMetadata",
  "storageObjectBytes",
  "databaseRolesAndGrants",
  "vaultAndEncryptionKeys",
  "authConfiguration",
  "edgeAndProviderSecrets",
  "scheduledJobs",
  "externalProviderResources",
]);

export const REQUIRED_CHECKS = Object.freeze([
  "restoreCompleted",
  "sourceRestoreFactsMatch",
  "migrationHistoryExact",
  "authLoginRefreshVerified",
  "storageUploadDownloadVerified",
  "storageObjectManifestMatched",
  "rlsAndGrantsVerified",
  "scheduledJobsDisabledOnRestore",
  "outboundDeliveryIsolated",
  "securitySmokePassed",
  "databaseLintPassed",
  "restoreTargetDecommissionedOrQuarantined",
]);

const REQUIRED_TRUE_CONTROLS = Object.freeze([
  "backupEncrypted",
  "accessRestricted",
  "retentionAndDeletionRecorded",
  "restoreTargetOutboundDisabled",
]);

const REQUIRED_FALSE_CONTROLS = Object.freeze([
  "rawSecretsRetainedInEvidence",
  "rawPersonalDataRetainedInEvidence",
]);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isIsoDate(value) {
  return typeof value === "string" && value.length > 0 && Number.isFinite(Date.parse(value));
}

function isSha256(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);
}

function add(blockers, path, message) {
  blockers.push({ path, message });
}

function requireNonEmptyString(blockers, value, path) {
  if (typeof value !== "string" || value.trim() === "") {
    add(blockers, path, "must be a non-empty string");
    return false;
  }
  return true;
}

export function evaluateRecoveryManifest(manifest, options = {}) {
  const blockers = [];
  const warnings = [];

  if (!isObject(manifest)) {
    return {
      ready: false,
      blockers: [{ path: "$", message: "manifest must be a JSON object" }],
      warnings,
    };
  }

  if (manifest.manifestVersion !== 2) {
    add(blockers, "manifestVersion", "must equal 2");
  }
  if (!isIsoDate(manifest.recordedAt)) {
    add(blockers, "recordedAt", "must be an ISO-8601 timestamp");
  }

  const source = isObject(manifest.source) ? manifest.source : {};
  const restoreTarget = isObject(manifest.restoreTarget) ? manifest.restoreTarget : {};
  const production = isObject(manifest.production) ? manifest.production : {};

  if (!["staging", "production"].includes(source.environment)) {
    add(blockers, "source.environment", "must be staging or production");
  }
  requireNonEmptyString(blockers, source.projectRef, "source.projectRef");
  requireNonEmptyString(blockers, restoreTarget.projectRef, "restoreTarget.projectRef");

  if (production.exists !== true && production.exists !== false) {
    add(blockers, "production.exists", "must be a boolean");
  } else if (production.exists === true) {
    requireNonEmptyString(blockers, production.projectRef, "production.projectRef");
  } else if (production.projectRef !== null) {
    add(blockers, "production.projectRef", "must be null while no production project exists");
  }

  if (!["disposable-supabase", "isolated-postgresql"].includes(restoreTarget.kind)) {
    add(
      blockers,
      "restoreTarget.kind",
      "must be disposable-supabase or isolated-postgresql",
    );
  }
  if (restoreTarget.projectRef && restoreTarget.projectRef === source.projectRef) {
    add(blockers, "restoreTarget.projectRef", "must differ from the source project");
  }
  if (production.exists === true && restoreTarget.projectRef && restoreTarget.projectRef === production.projectRef) {
    add(blockers, "restoreTarget.projectRef", "must never be the production project");
  }
  if (source.environment === "production" && options.allowProductionSource !== true) {
    add(
      blockers,
      "source.environment",
      "production-source evidence requires the explicit --allow-production-source acknowledgement",
    );
  }
  if (source.environment === "production" && production.exists !== true) {
    add(blockers, "source.environment", "cannot be production while production.exists is false");
  }
  if (source.environment === "production" && production.exists === true &&
      source.projectRef !== production.projectRef) {
    add(blockers, "source.projectRef", "must equal the recorded production project");
  }
  if (source.environment === "staging" && source.projectRef === production.projectRef) {
    add(blockers, "source.projectRef", "staging source must not equal the production project");
  }
  if (source.environment === "staging" && source.projectRef !== STAGING_PROJECT_REF) {
    add(blockers, "source.projectRef", `must equal the approved staging project ${STAGING_PROJECT_REF}`);
  }
  if (production.exists === true && production.projectRef === STAGING_PROJECT_REF) {
    add(blockers, "production.projectRef", "must not equal the staging project");
  }
  if (production.mutations !== 0) {
    add(blockers, "production.mutations", "must be exactly 0 during a recovery rehearsal");
  }

  const controls = isObject(manifest.controls) ? manifest.controls : {};
  for (const key of REQUIRED_TRUE_CONTROLS) {
    if (controls[key] !== true) {
      add(blockers, `controls.${key}`, "must be true");
    }
  }
  for (const key of REQUIRED_FALSE_CONTROLS) {
    if (controls[key] !== false) {
      add(blockers, `controls.${key}`, "must be false");
    }
  }

  const objectives = isObject(manifest.objectives) ? manifest.objectives : {};
  for (const key of ["declaredRpoHours", "declaredRtoHours", "observedRestoreMinutes"]) {
    if (typeof objectives[key] !== "number" || !Number.isFinite(objectives[key]) || objectives[key] < 0) {
      add(blockers, `objectives.${key}`, "must be a non-negative number");
    }
  }
  if (objectives.declaredRtoHours === 0) {
    add(blockers, "objectives.declaredRtoHours", "must be greater than zero");
  }
  if (
    Number.isFinite(objectives.declaredRtoHours) &&
    Number.isFinite(objectives.observedRestoreMinutes) &&
    objectives.observedRestoreMinutes > objectives.declaredRtoHours * 60
  ) {
    add(blockers, "objectives.observedRestoreMinutes", "exceeds the declared RTO");
  }

  const timing = isObject(manifest.timing) ? manifest.timing : {};
  for (const key of ["recoveryPointAt", "rehearsalStartedAt", "rehearsalCompletedAt"]) {
    if (!isIsoDate(timing[key])) {
      add(blockers, `timing.${key}`, "must be an ISO-8601 timestamp");
    }
  }
  if ([timing.recoveryPointAt, timing.rehearsalStartedAt, timing.rehearsalCompletedAt]
    .every(isIsoDate)) {
    const recoveryPointAt = Date.parse(timing.recoveryPointAt);
    const startedAt = Date.parse(timing.rehearsalStartedAt);
    const completedAt = Date.parse(timing.rehearsalCompletedAt);
    const recordedAt = Date.parse(manifest.recordedAt);
    if (recoveryPointAt > startedAt) {
      add(blockers, "timing.recoveryPointAt", "must not be later than rehearsalStartedAt");
    }
    if (completedAt < startedAt) {
      add(blockers, "timing.rehearsalCompletedAt", "must not be earlier than rehearsalStartedAt");
    }
    if (Number.isFinite(recordedAt) && completedAt > recordedAt) {
      add(blockers, "timing.rehearsalCompletedAt", "must not be later than recordedAt");
    }
    if (Number.isFinite(objectives.declaredRpoHours) &&
        startedAt - recoveryPointAt > objectives.declaredRpoHours * 60 * 60 * 1000) {
      add(blockers, "timing.recoveryPointAt", "does not meet the declared RPO");
    }
    const measuredRestoreMinutes = (completedAt - startedAt) / 60_000;
    if (Number.isFinite(objectives.observedRestoreMinutes) &&
        Math.abs(measuredRestoreMinutes - objectives.observedRestoreMinutes) > 1) {
      add(blockers, "objectives.observedRestoreMinutes", "must match the rehearsal timestamps within one minute");
    }
  }

  const ledger = isObject(manifest.migrationLedger) ? manifest.migrationLedger : {};
  for (const [key, expected] of Object.entries(RELEASE_MIGRATION_CONTRACT)) {
    if (ledger[key] !== expected) {
      add(blockers, `migrationLedger.${key}`, `must match the release contract (${expected})`);
    }
  }
  for (const key of ["sourceLedgerSha256", "restoredLedgerSha256"]) {
    if (!isSha256(ledger[key])) {
      add(blockers, `migrationLedger.${key}`, "must be a SHA-256 digest");
    }
  }
  if (isSha256(ledger.sourceLedgerSha256) && isSha256(ledger.restoredLedgerSha256) &&
      ledger.sourceLedgerSha256.toLowerCase() !== ledger.restoredLedgerSha256.toLowerCase()) {
    add(blockers, "migrationLedger.restoredLedgerSha256", "must match the source ledger digest");
  }

  const components = isObject(manifest.components) ? manifest.components : {};
  for (const name of REQUIRED_COMPONENTS) {
    const component = components[name];
    if (!isObject(component)) {
      add(blockers, `components.${name}`, "is required");
      continue;
    }
    if (component.status !== "VERIFIED") {
      add(blockers, `components.${name}.status`, "must equal VERIFIED");
    }
    if (!isIsoDate(component.verifiedAt)) {
      add(blockers, `components.${name}.verifiedAt`, "must be an ISO-8601 timestamp");
    }
    requireNonEmptyString(blockers, component.evidence, `components.${name}.evidence`);
  }

  const checks = isObject(manifest.checks) ? manifest.checks : {};
  for (const name of REQUIRED_CHECKS) {
    if (checks[name] !== true) {
      add(blockers, `checks.${name}`, "must be true");
    }
  }

  if (source.environment === "staging") {
    warnings.push(
      "Staging-source recovery proves the procedure, not the freshness or restorability of a production backup.",
    );
  }

  return { ready: blockers.length === 0, blockers, warnings };
}

function usage() {
  return [
    "Usage: node scripts/recovery-readiness.mjs <manifest.json> [--allow-production-source]",
    "",
    "This command is offline and read-only. It prints only validation results, never manifest values.",
  ].join("\n");
}

export async function runCli(argv = process.argv.slice(2)) {
  const allowProductionSource = argv.includes("--allow-production-source");
  const positional = argv.filter((arg) => !arg.startsWith("--"));

  if (positional.length !== 1) {
    console.error(usage());
    return 2;
  }

  let manifest;
  try {
    manifest = JSON.parse(await readFile(positional[0], "utf8"));
  } catch {
    console.error(JSON.stringify({ ready: false, error: "Manifest could not be read as JSON." }, null, 2));
    return 2;
  }

  const result = evaluateRecoveryManifest(manifest, { allowProductionSource });
  console.log(JSON.stringify(result, null, 2));
  return result.ready ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exitCode = await runCli();
}
