import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export const RELEASE_BRANCH =
  "release/v1-readiness-20260918";
const STAGING_PROJECT_REF = "eomubndonbetszdbhsrj";
const RETIRED_PROJECT_REF = "pkmllhaavadhaozmwapz";
const PRODUCTION_IDENTITY_POLICY = "jingwuguan-production-identity-v1";
const PRODUCTION_BOOTSTRAP_POLICY = "jingwuguan-production-bootstrap-v1";
const PRODUCTION_REGION = "ap-southeast-1";
const PRODUCTION_ORIGIN = "https://jingwuguanseibukan.com";
const PRODUCTION_EMAIL_WORKER = `${PRODUCTION_ORIGIN}/api/system/email-worker`;
const DEDICATED_INBOX_POLICY = "dedicated-non-role-inbox";
const INSTALLER_ACCEPTANCE_POLICY = "interactive-install-launch-uninstall";
const PRODUCTION_CUTOVER_POLICY = "jingwuguan-production-cutover-v1";
const PROJECT_REF = /^[a-z0-9]{20}$/;

const SHA = /^[a-f0-9]{40}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const DEPLOYMENT_ID = /^dpl_[A-Za-z0-9_-]{3,}$/;
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
  "productionCutoverVerified",
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

// Explicit scope prevents an incomplete combined release silently becoming web-only.
export function releaseScopeBlockers(manifest) {
  const blockers = [];
  const scope = object(manifest?.release).scope;
  if (!["web-only", "web-and-windows-uploader"].includes(scope)) {
    add(blockers, "release.scope", "must explicitly equal web-only or web-and-windows-uploader");
  }
  if (scope === "web-only") {
    if (object(manifest.approvals).windowsUploaderWithheld !== true) {
      add(blockers, "approvals.windowsUploaderWithheld", "must confirm the Windows uploader is withheld from distribution for this web-only release");
    }
    if (Object.hasOwn(object(manifest.gateEvidence), "installerAcceptance")) {
      add(blockers, "gateEvidence.installerAcceptance", "must be absent for web-only scope; deferred does not mean passed");
    }
  }
  return blockers;
}

function normalizedIdentity(value) {
  return typeof value === "string" ? value.trim().toLocaleLowerCase("en-US") : "";
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

function requirePassingEvidence(blockers, evidence, path) {
  requireDigest(blockers, evidence.manifestSha256, `${path}.manifestSha256`);
  if (evidence.result !== "passed") {
    add(blockers, `${path}.result`, "must equal passed for the referenced evidence manifest");
  }
}

function bindReleaseEvidence(blockers, evidence, path, release) {
  if (evidence.commitSha !== release.commitSha) {
    add(blockers, `${path}.commitSha`, "must bind the evidence to the release commit");
  }
}

function bindProductionEvidence(
  blockers,
  evidence,
  path,
  { expectedProductionProjectRef, release, requireDeployment = true },
) {
  bindReleaseEvidence(blockers, evidence, path, release);
  if (evidence.environment !== "production") {
    add(blockers, `${path}.environment`, "must equal production");
  }
  if (evidence.projectRef !== expectedProductionProjectRef) {
    add(blockers, `${path}.projectRef`, "must equal the independently supplied production project ref");
  }
  if (requireDeployment && evidence.deploymentId !== release.deploymentId) {
    add(blockers, `${path}.deploymentId`, "must bind the evidence to the production deployment");
  }
}

export function evaluateReleaseWindow(
  manifest,
  {
    expectedCommit,
    expectedDeploymentId,
    expectedProductionProjectRef,
    phase = "final",
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
  if (!DEPLOYMENT_ID.test(expectedDeploymentId ?? "")) add(blockers, "expectedDeploymentId", "must independently supply the exact immutable deployment ID");
  if (!["pre-cutover", "final"].includes(phase)) add(blockers, "phase", "must equal pre-cutover or final");

  const release = object(manifest.release);
  blockers.push(...releaseScopeBlockers(manifest));
  const includesInstaller = release.scope !== "web-only";
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
  if (DEPLOYMENT_ID.test(expectedDeploymentId ?? "") && release.deploymentId !== expectedDeploymentId) add(blockers, "release.deploymentId", "must equal the independently supplied deployment ID");
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
    if (!Number.isFinite(now) || approvedAt > now) add(blockers, "window.approvedAt", "must not be in the future");
    if (durationMinutes < 15 || durationMinutes > 240) {
      add(blockers, "window.endsAt", "must define a 15-to-240-minute release window");
    }
    if (!Number.isFinite(now) || now > endsAt) {
      add(blockers, "window.endsAt", "release window has expired");
    }
    if (Number.isFinite(now) && now < startsAt) add(blockers, "window.startsAt", `${phase} validation must run within the approved release window`);
    if (Number.isFinite(now) && startsAt - now > 14 * 24 * 60 * 60 * 1000) {
      add(blockers, "window.startsAt", "must be no more than 14 days ahead");
    }
  }

  const recovery = object(manifest.recovery);
  requireText(blockers, recovery.pointId, "recovery.pointId");
  requireDigest(blockers, recovery.manifestSha256, "recovery.manifestSha256");
  for (const key of ["capturedAt", "verifiedAt"]) {
    if (!timestamp(recovery[key])) {
      add(blockers, `recovery.${key}`, "must be an ISO-8601 timestamp with an explicit offset");
    }
  }
  requireText(blockers, recovery.verifiedBy, "recovery.verifiedBy");
  if (Object.values(owners).map(normalizedIdentity).includes(normalizedIdentity(recovery.verifiedBy))) {
    add(blockers, "recovery.verifiedBy", "must be independent from deployment, rollback and monitoring ownership");
  }
  if (timestamp(recovery.capturedAt) && timestamp(recovery.verifiedAt)) {
    const capturedAt = Date.parse(recovery.capturedAt);
    const verifiedAt = Date.parse(recovery.verifiedAt);
    if (verifiedAt < capturedAt) {
      add(blockers, "recovery.verifiedAt", "must not be earlier than capturedAt");
    }
    if (!Number.isFinite(now) || capturedAt > now + 5 * 60 * 1000) add(blockers, "recovery.capturedAt", "must not be in the future");
    if (!Number.isFinite(now) || verifiedAt > now + 5 * 60 * 1000) add(blockers, "recovery.verifiedAt", "must not be in the future");
    if (
      timestamp(window.startsAt) &&
      Date.parse(window.startsAt) - capturedAt > 24 * 60 * 60 * 1000
    ) {
      add(blockers, "recovery.capturedAt", "must be within 24 hours of the release window");
    }
  }

  const rollback = object(manifest.rollback);
  requirePassingEvidence(blockers, rollback, "rollback");
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
  if (rollback.commitSha !== release.commitSha || rollback.deploymentId !== release.deploymentId) {
    add(blockers, "rollback", "must bind rollback evidence to the release commit and deployment");
  }
  if (rollback.previousCommitSha !== release.previousCommitSha ||
      rollback.previousDeploymentId !== release.previousDeploymentId) {
    add(blockers, "rollback", "must bind rollback evidence to the exact known-good commit and deployment");
  }

  const approvals = object(manifest.approvals);
  for (const key of REQUIRED_APPROVALS.filter(key => phase === "final" || key !== "productionCutoverVerified")) {
    if (approvals[key] !== true) {
      add(blockers, `approvals.${key}`, "must be true");
    }
  }

  const gateEvidence = object(manifest.gateEvidence);
  const safari = object(gateEvidence.physicalSafari);
  requirePassingEvidence(blockers, safari, "gateEvidence.physicalSafari");
  if (safari.commitSha !== release.commitSha) add(blockers, "gateEvidence.physicalSafari.commitSha", "must bind the Safari evidence to the release commit");
  requireText(blockers, safari.stagingDeploymentId, "gateEvidence.physicalSafari.stagingDeploymentId");
  if (safari.stagingDeploymentId === release.deploymentId) add(blockers, "gateEvidence.physicalSafari.stagingDeploymentId", "must identify the separately tested staging deployment");

  const monitoring = object(gateEvidence.monitoring);
  requirePassingEvidence(blockers, monitoring, "gateEvidence.monitoring");
  if (monitoring.environment !== "production") add(blockers, "gateEvidence.monitoring.environment", "must equal production");
  if (monitoring.projectRef !== expectedProductionProjectRef) add(blockers, "gateEvidence.monitoring.projectRef", "must equal the independently supplied production project ref");
  if (monitoring.commitSha !== release.commitSha) add(blockers, "gateEvidence.monitoring.commitSha", "must bind monitoring evidence to the release commit");
  if (monitoring.deploymentId !== release.deploymentId) add(blockers, "gateEvidence.monitoring.deploymentId", "must bind monitoring evidence to the production deployment");

  const identity = object(gateEvidence.productionIdentity);
  requirePassingEvidence(blockers, identity, "gateEvidence.productionIdentity");
  if (!PROJECT_REF.test(expectedProductionProjectRef ?? "") || [STAGING_PROJECT_REF, RETIRED_PROJECT_REF].includes(expectedProductionProjectRef)) {
    add(blockers, "expectedProductionProjectRef", "must independently supply the exact active production project ref");
  }
  if (identity.projectRef !== expectedProductionProjectRef) add(blockers, "gateEvidence.productionIdentity.projectRef", "must equal the independently supplied production project ref");
  if (identity.environment !== "production") add(blockers, "gateEvidence.productionIdentity.environment", "must equal production");
  bindReleaseEvidence(blockers, identity, "gateEvidence.productionIdentity", release);
  if (identity.policy !== PRODUCTION_IDENTITY_POLICY) add(blockers, "gateEvidence.productionIdentity.policy", `must equal ${PRODUCTION_IDENTITY_POLICY}`);

  const managedRestore = object(gateEvidence.managedRestore);
  requirePassingEvidence(blockers, managedRestore, "gateEvidence.managedRestore");
  bindReleaseEvidence(blockers, managedRestore, "gateEvidence.managedRestore", release);
  if (managedRestore.environment !== "staging") {
    add(blockers, "gateEvidence.managedRestore.environment", "must equal staging for the non-production restore rehearsal");
  }
  if (managedRestore.sourceProjectRef !== STAGING_PROJECT_REF) {
    add(blockers, "gateEvidence.managedRestore.sourceProjectRef", `must equal ${STAGING_PROJECT_REF}`);
  }
  if (managedRestore.targetKind !== "disposable-managed") {
    add(blockers, "gateEvidence.managedRestore.targetKind", "must equal disposable-managed");
  }
  if (managedRestore.zeroResidueVerified !== true) {
    add(blockers, "gateEvidence.managedRestore.zeroResidueVerified", "must be true");
  }

  const productionTarget = object(gateEvidence.productionTarget);
  requirePassingEvidence(blockers, productionTarget, "gateEvidence.productionTarget");
  bindProductionEvidence(blockers, productionTarget, "gateEvidence.productionTarget", {
    expectedProductionProjectRef,
    release,
    requireDeployment: false,
  });
  if (productionTarget.region !== PRODUCTION_REGION) {
    add(blockers, "gateEvidence.productionTarget.region", `must equal ${PRODUCTION_REGION}`);
  }
  if (productionTarget.supabaseOrigin !== `https://${expectedProductionProjectRef}.supabase.co`) {
    add(blockers, "gateEvidence.productionTarget.supabaseOrigin", "must equal the exact production Supabase origin");
  }
  if (productionTarget.policy !== PRODUCTION_BOOTSTRAP_POLICY) {
    add(blockers, "gateEvidence.productionTarget.policy", `must equal ${PRODUCTION_BOOTSTRAP_POLICY}`);
  }

  const productionSecrets = object(gateEvidence.productionSecrets);
  requirePassingEvidence(blockers, productionSecrets, "gateEvidence.productionSecrets");
  bindProductionEvidence(blockers, productionSecrets, "gateEvidence.productionSecrets", {
    expectedProductionProjectRef,
    release,
  });

  const productionCutover = object(gateEvidence.productionCutover);
  if (phase === "final") {
    requirePassingEvidence(blockers, productionCutover, "gateEvidence.productionCutover");
    bindProductionEvidence(blockers, productionCutover, "gateEvidence.productionCutover", {
      expectedProductionProjectRef,
      release,
    });
    if (productionCutover.origin !== PRODUCTION_ORIGIN) add(blockers, "gateEvidence.productionCutover.origin", `must equal ${PRODUCTION_ORIGIN}`);
    if (productionCutover.migrationLedger !== "006-056") add(blockers, "gateEvidence.productionCutover.migrationLedger", "must equal 006-056");
    if (productionCutover.policy !== PRODUCTION_CUTOVER_POLICY) add(blockers, "gateEvidence.productionCutover.policy", `must equal ${PRODUCTION_CUTOVER_POLICY}`);
  }

  const providerDelivery = object(gateEvidence.providerDelivery);
  requirePassingEvidence(blockers, providerDelivery, "gateEvidence.providerDelivery");
  bindProductionEvidence(blockers, providerDelivery, "gateEvidence.providerDelivery", {
    expectedProductionProjectRef,
    release,
  });
  if (providerDelivery.dedicatedInboxPolicy !== DEDICATED_INBOX_POLICY) {
    add(blockers, "gateEvidence.providerDelivery.dedicatedInboxPolicy", `must equal ${DEDICATED_INBOX_POLICY}`);
  }

  const emailScheduler = object(gateEvidence.emailScheduler);
  requirePassingEvidence(blockers, emailScheduler, "gateEvidence.emailScheduler");
  bindProductionEvidence(blockers, emailScheduler, "gateEvidence.emailScheduler", {
    expectedProductionProjectRef,
    release,
  });
  if (emailScheduler.endpoint !== PRODUCTION_EMAIL_WORKER) {
    add(blockers, "gateEvidence.emailScheduler.endpoint", `must equal ${PRODUCTION_EMAIL_WORKER}`);
  }

  const installer = object(gateEvidence.installerAcceptance);
  if (includesInstaller) {
    requirePassingEvidence(blockers, installer, "gateEvidence.installerAcceptance");
    bindReleaseEvidence(blockers, installer, "gateEvidence.installerAcceptance", release);
    if (installer.environment !== "staging") {
      add(blockers, "gateEvidence.installerAcceptance.environment", "must equal staging for guarded installer acceptance");
    }
    if (installer.projectRef !== STAGING_PROJECT_REF) {
      add(blockers, "gateEvidence.installerAcceptance.projectRef", `must equal ${STAGING_PROJECT_REF}`);
    }
    if (installer.origin !== "https://jingwuguanseibukan-staging.vercel.app") {
      add(blockers, "gateEvidence.installerAcceptance.origin", "must equal the exact staging origin");
    }
    requireDigest(blockers, installer.installerSha256, "gateEvidence.installerAcceptance.installerSha256");
    if (installer.platform !== "win32-x64") {
      add(blockers, "gateEvidence.installerAcceptance.platform", "must equal win32-x64");
    }
    if (installer.acceptancePolicy !== INSTALLER_ACCEPTANCE_POLICY) {
      add(blockers, "gateEvidence.installerAcceptance.acceptancePolicy", `must equal ${INSTALLER_ACCEPTANCE_POLICY}`);
    }
    if (installer.authenticodeStatus !== "Valid") {
      add(blockers, "gateEvidence.installerAcceptance.authenticodeStatus", "must equal Valid for the release installer");
    }
  }

  const gateDigests = [
    recovery.manifestSha256,
    rollback.manifestSha256,
    safari.manifestSha256,
    monitoring.manifestSha256,
    identity.manifestSha256,
    managedRestore.manifestSha256,
    productionTarget.manifestSha256,
    productionSecrets.manifestSha256,
    ...(phase === "final" ? [productionCutover.manifestSha256] : []),
    providerDelivery.manifestSha256,
    emailScheduler.manifestSha256,
    ...(includesInstaller ? [installer.manifestSha256] : []),
  ].filter(value => SHA256.test(value ?? ""));
  const expectedGateCount = (phase === "final" ? 11 : 10) + Number(includesInstaller);
  if (gateDigests.length !== expectedGateCount || new Set(gateDigests).size !== expectedGateCount) {
    add(blockers, "gateEvidence", `must bind ${expectedGateCount} distinct rollback, recovery and release-gate manifests`);
  }

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
          phase,
          scope: release.scope,
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
    "Usage: node scripts/release-window-readiness.mjs --manifest=<protected-json> --expected-commit=<40-char-sha> --expected-deployment-id=<id> --expected-production-project-ref=<20-char-ref> [--phase=pre-cutover|final]",
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
  const expectedDeploymentId = option(argv, "--expected-deployment-id");
  const expectedProductionProjectRef = option(argv, "--expected-production-project-ref");
  const phase = option(argv, "--phase") ?? "final";
  if (!manifestPath || !expectedCommit || !expectedDeploymentId || !expectedProductionProjectRef) {
    console.error(JSON.stringify({
      ready: false,
      error: "Manifest path, expected commit, deployment ID and expected production project ref are required.",
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
    { expectedCommit, expectedDeploymentId, expectedProductionProjectRef, phase },
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
