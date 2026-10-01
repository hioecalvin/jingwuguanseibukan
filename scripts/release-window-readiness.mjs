import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export const RELEASE_BRANCH =
  "release/v1-readiness-20260918";
const STAGING_PROJECT_REF = "eomubndonbetszdbhsrj";
const RETIRED_PROJECT_REF = "pkmllhaavadhaozmwapz";
const PRODUCTION_IDENTITY_POLICY = "jingwuguan-production-identity-v1";
const PROJECT_REF = /^[a-z0-9]{20}$/;

const SHA = /^[a-f0-9]{40}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const ISO_WITH_ZONE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const REQUIRED_APPROVALS = Object.freeze([
  "explicitReleaseApproval",
  "productionTargetVerified",
  "productionSecretsVerified",
  "managedRestoreVerified",
  "providerDeliveryVerified",
  "physicalSafariVerified",
  "monitoringReady",
  "weakTestAccountsRemoved",
  "pushHiddenOrVerified",
]);
const REQUIRED_STOP_CONDITIONS = Object.freeze([
  "authenticationFailure",
  "authorizationFailure",
  "databaseSecurityFailure",
  "migrationOrRestoreMismatch",
  "emailWorkerFailure",
  "rollbackAccessFailure",
]);

function object(value) {
  return value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? value
    : {};
}

function timestamp(value) {
  return typeof value === "string" &&
    ISO_WITH_ZONE.test(value) &&
    Number.isFinite(Date.parse(value));
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

function requireDigest(blockers, value, path) {
  if (!SHA256.test(value ?? "") || /^(.)\1{63}$/.test(value)) {
    add(blockers, path, "must be a non-placeholder 64-character SHA-256 digest");
    return false;
  }
  return true;
}

export function evaluateReleaseWindow(
  manifest,
  {
    expectedCommit,
    expectedProductionProjectRef,
    now = Date.now(),
  } = {},
) {
  const blockers = [];
  const warnings = [];

  if (
    manifest === null ||
    typeof manifest !== "object" ||
    Array.isArray(manifest)
  ) {
    return {
      ready: false,
      blockers: [{
        path: "$",
        message: "manifest must be a JSON object",
      }],
      warnings,
      summary: null,
    };
  }

  if (manifest.manifestVersion !== 1) {
    add(blockers, "manifestVersion", "must equal 1");
  }

  if (!SHA.test(expectedCommit ?? "")) {
    add(blockers, "expectedCommit", "must be the exact lowercase 40-character release SHA");
  }

  const release = object(manifest.release);
  if (release.branch !== RELEASE_BRANCH) {
    add(blockers, "release.branch", `must equal ${RELEASE_BRANCH}`);
  }
  if (!SHA.test(release.commitSha ?? "")) {
    add(blockers, "release.commitSha", "must be a lowercase 40-character Git SHA");
  } else if (SHA.test(expectedCommit ?? "") && release.commitSha !== expectedCommit) {
    add(blockers, "release.commitSha", "must equal the independently supplied expected commit");
  }
  if (!SHA.test(release.previousCommitSha ?? "")) {
    add(blockers, "release.previousCommitSha", "must be a lowercase 40-character rollback SHA");
  } else if (release.previousCommitSha === release.commitSha) {
    add(blockers, "release.previousCommitSha", "must differ from the release commit");
  }
  requireText(blockers, release.deploymentId, "release.deploymentId");
  requireText(blockers, release.previousDeploymentId, "release.previousDeploymentId");
  if (
    typeof release.deploymentId === "string" &&
    release.deploymentId === release.previousDeploymentId
  ) {
    add(blockers, "release.previousDeploymentId", "must differ from the release deployment");
  }

  const owners = object(manifest.owners);
  for (const key of ["deployment", "rollback", "monitoring"]) {
    requireText(blockers, owners[key], `owners.${key}`);
  }

  const window = object(manifest.window);
  for (const key of ["approvedAt", "startsAt", "endsAt"]) {
    if (!timestamp(window[key])) {
      add(blockers, `window.${key}`, "must be an ISO-8601 timestamp with an explicit offset");
    }
  }
  if (window.timeZone !== "Australia/Sydney") {
    add(blockers, "window.timeZone", "must equal Australia/Sydney");
  }
  if ([window.approvedAt, window.startsAt, window.endsAt].every(timestamp)) {
    const approvedAt = Date.parse(window.approvedAt);
    const startsAt = Date.parse(window.startsAt);
    const endsAt = Date.parse(window.endsAt);
    const durationMinutes = (endsAt - startsAt) / 60_000;

    if (approvedAt > startsAt) {
      add(blockers, "window.approvedAt", "must not be later than startsAt");
    }
    if (durationMinutes < 15 || durationMinutes > 240) {
      add(blockers, "window.endsAt", "must define a 15-to-240-minute release window");
    }
    if (!Number.isFinite(now) || now > endsAt) {
      add(blockers, "window.endsAt", "release window has expired");
    }
    if (Number.isFinite(now) && startsAt - now > 14 * 24 * 60 * 60 * 1000) {
      add(blockers, "window.startsAt", "must be no more than 14 days ahead");
    }
  }

  const recovery = object(manifest.recovery);
  requireText(blockers, recovery.pointId, "recovery.pointId");
  if (!SHA256.test(recovery.manifestSha256 ?? "")) {
    add(blockers, "recovery.manifestSha256", "must be a 64-character SHA-256 digest");
  }
  for (const key of ["capturedAt", "verifiedAt"]) {
    if (!timestamp(recovery[key])) {
      add(blockers, `recovery.${key}`, "must be an ISO-8601 timestamp with an explicit offset");
    }
  }
  requireText(blockers, recovery.verifiedBy, "recovery.verifiedBy");
  if (timestamp(recovery.capturedAt) && timestamp(recovery.verifiedAt)) {
    const capturedAt = Date.parse(recovery.capturedAt);
    const verifiedAt = Date.parse(recovery.verifiedAt);
    if (verifiedAt < capturedAt) {
      add(blockers, "recovery.verifiedAt", "must not be earlier than capturedAt");
    }
    if (
      timestamp(window.startsAt) &&
      Date.parse(window.startsAt) - capturedAt > 24 * 60 * 60 * 1000
    ) {
      add(blockers, "recovery.capturedAt", "must be within 24 hours of the release window");
    }
  }

  const rollback = object(manifest.rollback);
  if (rollback.applicationTested !== true) {
    add(blockers, "rollback.applicationTested", "must be true");
  }
  if (rollback.databaseRecoveryTested !== true) {
    add(blockers, "rollback.databaseRecoveryTested", "must be true");
  }
  if (
    !Number.isSafeInteger(rollback.decisionDeadlineMinutes) ||
    rollback.decisionDeadlineMinutes < 5 ||
    rollback.decisionDeadlineMinutes > 60
  ) {
    add(blockers, "rollback.decisionDeadlineMinutes", "must be an integer from 5 to 60");
  }

  const approvals = object(manifest.approvals);
  for (const key of REQUIRED_APPROVALS) {
    if (approvals[key] !== true) {
      add(blockers, `approvals.${key}`, "must be true");
    }
  }

  const gateEvidence = object(manifest.gateEvidence);
  const safari = object(gateEvidence.physicalSafari);
  requireDigest(blockers, safari.manifestSha256, "gateEvidence.physicalSafari.manifestSha256");
  if (safari.commitSha !== release.commitSha) add(blockers, "gateEvidence.physicalSafari.commitSha", "must bind the Safari evidence to the release commit");
  requireText(blockers, safari.stagingDeploymentId, "gateEvidence.physicalSafari.stagingDeploymentId");
  if (safari.stagingDeploymentId === release.deploymentId) add(blockers, "gateEvidence.physicalSafari.stagingDeploymentId", "must identify the separately tested staging deployment");

  const monitoring = object(gateEvidence.monitoring);
  requireDigest(blockers, monitoring.manifestSha256, "gateEvidence.monitoring.manifestSha256");
  if (monitoring.environment !== "production") add(blockers, "gateEvidence.monitoring.environment", "must equal production");
  if (monitoring.commitSha !== release.commitSha) add(blockers, "gateEvidence.monitoring.commitSha", "must bind monitoring evidence to the release commit");
  if (monitoring.deploymentId !== release.deploymentId) add(blockers, "gateEvidence.monitoring.deploymentId", "must bind monitoring evidence to the production deployment");

  const identity = object(gateEvidence.productionIdentity);
  requireDigest(blockers, identity.manifestSha256, "gateEvidence.productionIdentity.manifestSha256");
  if (!PROJECT_REF.test(expectedProductionProjectRef ?? "") || [STAGING_PROJECT_REF, RETIRED_PROJECT_REF].includes(expectedProductionProjectRef)) {
    add(blockers, "expectedProductionProjectRef", "must independently supply the exact active production project ref");
  }
  if (identity.projectRef !== expectedProductionProjectRef) add(blockers, "gateEvidence.productionIdentity.projectRef", "must equal the independently supplied production project ref");
  if (identity.policy !== PRODUCTION_IDENTITY_POLICY) add(blockers, "gateEvidence.productionIdentity.policy", `must equal ${PRODUCTION_IDENTITY_POLICY}`);
  const gateDigests = [safari.manifestSha256, monitoring.manifestSha256, identity.manifestSha256].filter(value => SHA256.test(value ?? ""));
  if (new Set(gateDigests).size !== 3) add(blockers, "gateEvidence", "must bind three distinct gate manifests");

  const stopConditions = object(manifest.stopConditions);
  for (const key of REQUIRED_STOP_CONDITIONS) {
    if (stopConditions[key] !== true) {
      add(blockers, `stopConditions.${key}`, "must be true");
    }
  }
  if (
    typeof stopConditions.maxServerErrorRatePercent !== "number" ||
    !Number.isFinite(stopConditions.maxServerErrorRatePercent) ||
    stopConditions.maxServerErrorRatePercent <= 0 ||
    stopConditions.maxServerErrorRatePercent > 5
  ) {
    add(blockers, "stopConditions.maxServerErrorRatePercent", "must be greater than 0 and no more than 5");
  }
  if (
    !Number.isSafeInteger(stopConditions.maxOldestReadyEmailSeconds) ||
    stopConditions.maxOldestReadyEmailSeconds < 30 ||
    stopConditions.maxOldestReadyEmailSeconds > 120
  ) {
    add(blockers, "stopConditions.maxOldestReadyEmailSeconds", "must be an integer from 30 to 120");
  }

  warnings.push(
    "This offline gate validates recorded approvals only; it does not authorize or execute a production release.",
  );

  return {
    ready: blockers.length === 0,
    blockers,
    warnings,
    summary: blockers.length === 0
      ? {
          branch: release.branch,
          commitSha: release.commitSha,
          previousCommitSha: release.previousCommitSha,
          startsAt: window.startsAt,
          endsAt: window.endsAt,
          timeZone: window.timeZone,
        }
      : null,
  };
}

function option(argv, name) {
  const prefix = `${name}=`;
  return argv.find(value =>
    value.startsWith(prefix))?.slice(prefix.length);
}

function usage() {
  return [
    "Usage: node scripts/release-window-readiness.mjs --manifest=<protected-json> --expected-commit=<40-char-sha> --expected-production-project-ref=<20-char-ref>",
    "The check is offline and does not authorize or execute a release.",
  ].join("\n");
}

export async function runCli(
  argv = process.argv.slice(2),
) {
  if (argv.includes("--help")) {
    console.log(usage());
    return 0;
  }

  const manifestPath = option(argv, "--manifest");
  const expectedCommit = option(argv, "--expected-commit");
  const expectedProductionProjectRef = option(argv, "--expected-production-project-ref");
  if (!manifestPath || !expectedCommit || !expectedProductionProjectRef) {
    console.error(JSON.stringify({
      ready: false,
      error: "Manifest path, expected commit and expected production project ref are required.",
    }, null, 2));
    return 2;
  }

  let manifest;
  try {
    manifest = JSON.parse(
      await readFile(manifestPath, "utf8"),
    );
  } catch {
    console.error(JSON.stringify({
      ready: false,
      error: "Release-window manifest could not be read.",
    }, null, 2));
    return 2;
  }

  const result = evaluateReleaseWindow(
    manifest,
    { expectedCommit, expectedProductionProjectRef },
  );
  console.log(JSON.stringify(result, null, 2));
  return result.ready ? 0 : 1;
}

if (
  import.meta.url ===
  pathToFileURL(process.argv[1] ?? "").href
) {
  process.exitCode = await runCli();
}
