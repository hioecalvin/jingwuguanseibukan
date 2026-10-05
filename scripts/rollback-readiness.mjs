import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const ROLLBACK_POLICY = "jingwuguan-production-rollback-v1";
export const RELEASE_BRANCH = "release/v1-readiness-20260918";
export const STAGING_ORIGIN = "https://jingwuguanseibukan-staging.vercel.app";
export const STAGING_PROJECT_REF = "eomubndonbetszdbhsrj";

const SHA = /^[a-f0-9]{40}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const ISO_WITH_ZONE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|([+-])(\d{2}):(\d{2}))$/;
const DEPLOYMENT_ID = /^dpl_[A-Za-z0-9_-]{8,64}$/;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_JSON_BYTES = 1024 * 1024;

function object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function add(blockers, path, message) {
  blockers.push({ path, message });
}

function exactKeys(blockers, value, path, allowed) {
  const keys = Object.keys(object(value)).sort();
  const expected = [...allowed].sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    add(blockers, path, "must contain exactly the documented sanitized fields");
  }
}

function validDigest(value) {
  return typeof value === "string" && SHA256.test(value) && !/^(.)\1{63}$/.test(value);
}

function timestamp(value) {
  if (typeof value !== "string") return false;
  const match = ISO_WITH_ZONE.exec(value);
  if (!match) return false;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, offsetSign, offsetHourText, offsetMinuteText] = match;
  const [year, month, day, hour, minute, second] = [yearText, monthText, dayText, hourText, minuteText, secondText].map(Number);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth[month - 1] || hour > 23 || minute > 59 || second > 59) return false;
  if (offsetSign) {
    const offsetHour = Number(offsetHourText);
    const offsetMinute = Number(offsetMinuteText);
    if (offsetHour > 14 || offsetMinute > 59 || (offsetHour === 14 && offsetMinute !== 0)) return false;
  }
  return Number.isFinite(Date.parse(value));
}

function validDeploymentId(value) {
  return typeof value === "string" && DEPLOYMENT_ID.test(value);
}

function validateTimestamp(blockers, value, path, now) {
  if (!timestamp(value)) {
    add(blockers, path, "must be an ISO-8601 timestamp with an explicit offset");
    return;
  }
  const time = Date.parse(value);
  if (!Number.isFinite(now) || time > now + 5 * 60 * 1000) add(blockers, path, "must not be in the future");
  else if (now - time > MAX_AGE_MS) add(blockers, path, "must be no more than 30 days old");
}

function scanSensitiveValues(blockers, value, path = "$") {
  if (typeof value === "string" && (
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(value) ||
    /\bBearer\s+[A-Za-z0-9._~-]+/i.test(value) ||
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(value) ||
    /\b(?:sb_secret_|re_[A-Za-z0-9_]{12,}|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\b/.test(value)
  )) {
    add(blockers, path, "must not contain an email address, credential, token, or private key");
    return;
  }
  if (Array.isArray(value)) value.forEach((entry, index) => scanSensitiveValues(blockers, entry, `${path}[${index}]`));
  else if (value !== null && typeof value === "object") {
    for (const entry of Object.values(value)) scanSensitiveValues(blockers, entry, `${path}.[field]`);
  }
}

function requireTrue(blockers, value, path) {
  if (value !== true) add(blockers, path, "must be true");
}

function requireFalse(blockers, value, path) {
  if (value !== false) add(blockers, path, "must be false");
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function within(parent, child) {
  const rel = relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

export async function readProtectedRollbackManifest(path, {
  repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), ".."),
} = {}) {
  if (typeof path !== "string" || !isAbsolute(path) || /^[/\\]{2}/.test(path) || /[\0-\x1f]/.test(path) || /replace|placeholder|todo|tbd/i.test(path)) {
    return { error: "Manifest must be an absolute non-placeholder protected JSON file." };
  }
  let sourcePath;
  try {
    const info = await lstat(path);
    if (!info.isFile() || info.isSymbolicLink() || info.size <= 1 || info.size > MAX_JSON_BYTES) {
      return { error: "Manifest must be a bounded regular JSON file, not a link." };
    }
    sourcePath = await realpath(path);
  } catch {
    return { error: "Rollback evidence manifest could not be read." };
  }
  if (within(resolve(repositoryRoot), sourcePath)) {
    return { error: "Manifest must remain outside the repository." };
  }
  try {
    const parsed = JSON.parse(await readFile(sourcePath, "utf8"));
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid");
    return { parsed, sourcePath };
  } catch {
    return { error: "Rollback evidence manifest must contain one JSON object." };
  }
}

export function calculateRollbackReviewDigest(manifest) {
  const attestation = object(manifest?.attestation);
  const review = {
    manifestVersion: manifest?.manifestVersion,
    policy: manifest?.policy,
    release: object(manifest?.release),
    rehearsal: object(manifest?.rehearsal),
    databaseRecovery: object(manifest?.databaseRecovery),
    timings: object(manifest?.timings),
    safety: object(manifest?.safety),
    attestation: {
      recordedByRole: attestation.recordedByRole,
      reviewedByRole: attestation.reviewedByRole,
      reviewedAt: attestation.reviewedAt,
      evidenceReviewed: attestation.evidenceReviewed,
      allFindingsResolved: attestation.allFindingsResolved,
    },
  };
  return createHash("sha256").update(stable(review)).digest("hex");
}

export function evaluateRollbackReadiness(manifest, {
  expectedCommit,
  expectedDeploymentId,
  expectedPreviousCommit,
  expectedPreviousDeploymentId,
  now = Date.now(),
} = {}) {
  const blockers = [];
  const warnings = [];
  if (manifest === null || typeof manifest !== "object" || Array.isArray(manifest)) {
    return { ready: false, blockers: [{ path: "$", message: "manifest must be a JSON object" }], warnings, summary: null };
  }

  scanSensitiveValues(blockers, manifest);
  exactKeys(blockers, manifest, "$", ["manifestVersion", "policy", "release", "rehearsal", "databaseRecovery", "timings", "safety", "attestation"]);
  if (manifest.manifestVersion !== 1) add(blockers, "manifestVersion", "must equal 1");
  if (manifest.policy !== ROLLBACK_POLICY) add(blockers, "policy", `must equal ${ROLLBACK_POLICY}`);

  for (const [path, value] of [["expectedCommit", expectedCommit], ["expectedPreviousCommit", expectedPreviousCommit]]) {
    if (!SHA.test(value ?? "")) add(blockers, path, "must independently supply an exact lowercase 40-character Git SHA");
  }
  for (const [path, value] of [["expectedDeploymentId", expectedDeploymentId], ["expectedPreviousDeploymentId", expectedPreviousDeploymentId]]) {
    if (!validDeploymentId(value)) add(blockers, path, "must independently supply an exact Vercel dpl_ deployment ID");
  }

  const release = object(manifest.release);
  exactKeys(blockers, release, "release", ["branch", "commitSha", "deploymentId", "previousCommitSha", "previousDeploymentId"]);
  if (release.branch !== RELEASE_BRANCH) add(blockers, "release.branch", `must equal ${RELEASE_BRANCH}`);
  if (release.commitSha !== expectedCommit) add(blockers, "release.commitSha", "must equal the independently supplied candidate commit");
  if (release.deploymentId !== expectedDeploymentId) add(blockers, "release.deploymentId", "must equal the independently supplied candidate deployment");
  if (release.previousCommitSha !== expectedPreviousCommit || release.previousCommitSha === release.commitSha) add(blockers, "release.previousCommitSha", "must equal the distinct independently supplied known-good commit");
  if (release.previousDeploymentId !== expectedPreviousDeploymentId || release.previousDeploymentId === release.deploymentId) add(blockers, "release.previousDeploymentId", "must equal the distinct independently supplied known-good deployment");

  const rehearsal = object(manifest.rehearsal);
  exactKeys(blockers, rehearsal, "rehearsal", ["environment", "origin", "supabaseProjectRef", "startedAt", "completedAt", "candidateDeploymentVerified", "knownGoodDeploymentActivated", "authenticationPassed", "authorizationPassed", "hostProbesPassed", "candidateRestoredAfterTest", "evidenceBundleSha256"]);
  if (rehearsal.environment !== "staging") add(blockers, "rehearsal.environment", "must equal staging");
  if (rehearsal.origin !== STAGING_ORIGIN) add(blockers, "rehearsal.origin", `must equal ${STAGING_ORIGIN}`);
  if (rehearsal.supabaseProjectRef !== STAGING_PROJECT_REF) add(blockers, "rehearsal.supabaseProjectRef", `must equal ${STAGING_PROJECT_REF}`);
  validateTimestamp(blockers, rehearsal.startedAt, "rehearsal.startedAt", now);
  validateTimestamp(blockers, rehearsal.completedAt, "rehearsal.completedAt", now);
  for (const key of ["candidateDeploymentVerified", "knownGoodDeploymentActivated", "authenticationPassed", "authorizationPassed", "hostProbesPassed", "candidateRestoredAfterTest"]) requireTrue(blockers, rehearsal[key], `rehearsal.${key}`);
  if (!validDigest(rehearsal.evidenceBundleSha256)) add(blockers, "rehearsal.evidenceBundleSha256", "must be a non-placeholder SHA-256 evidence digest");

  const database = object(manifest.databaseRecovery);
  exactKeys(blockers, database, "databaseRecovery", ["strategy", "sourceProjectRef", "targetKind", "backupSha256", "evidenceBundleSha256", "migrationLedger", "exactLedgerPassed", "catalogPassed", "databaseLintPassed", "grantsAndRlsPassed", "roleSecurityPassed", "restoreCompleted", "zeroResidueVerified"]);
  if (database.strategy !== "replacement-target-restore") add(blockers, "databaseRecovery.strategy", "must equal replacement-target-restore; down migrations are not accepted");
  if (database.sourceProjectRef !== STAGING_PROJECT_REF) add(blockers, "databaseRecovery.sourceProjectRef", `must equal ${STAGING_PROJECT_REF}`);
  if (database.targetKind !== "disposable-managed") add(blockers, "databaseRecovery.targetKind", "must equal disposable-managed");
  if (!validDigest(database.backupSha256)) add(blockers, "databaseRecovery.backupSha256", "must be a non-placeholder SHA-256 digest");
  if (!validDigest(database.evidenceBundleSha256) || database.evidenceBundleSha256 === database.backupSha256 || database.evidenceBundleSha256 === rehearsal.evidenceBundleSha256) add(blockers, "databaseRecovery.evidenceBundleSha256", "must be a distinct non-placeholder SHA-256 digest");
  if (validDigest(database.backupSha256) && database.backupSha256 === rehearsal.evidenceBundleSha256) add(blockers, "databaseRecovery.backupSha256", "must be distinct from the application rehearsal evidence digest");
  if (database.migrationLedger !== "006-058") add(blockers, "databaseRecovery.migrationLedger", "must equal 006-058");
  for (const key of ["exactLedgerPassed", "catalogPassed", "databaseLintPassed", "grantsAndRlsPassed", "roleSecurityPassed", "restoreCompleted", "zeroResidueVerified"]) requireTrue(blockers, database[key], `databaseRecovery.${key}`);

  const timings = object(manifest.timings);
  exactKeys(blockers, timings, "timings", ["decisionDeadlineMinutes", "applicationRollbackMinutes", "databaseRecoveryMinutes", "rtoMinutes", "completedWithinRto"]);
  for (const key of ["decisionDeadlineMinutes", "applicationRollbackMinutes", "databaseRecoveryMinutes", "rtoMinutes"]) {
    if (!Number.isSafeInteger(timings[key]) || timings[key] <= 0 || timings[key] > 240) add(blockers, `timings.${key}`, "must be an integer from 1 to 240 minutes");
  }
  if (Number.isSafeInteger(timings.decisionDeadlineMinutes) && (timings.decisionDeadlineMinutes < 5 || timings.decisionDeadlineMinutes > 60)) add(blockers, "timings.decisionDeadlineMinutes", "must be from 5 to 60 minutes");
  if (Number.isSafeInteger(timings.applicationRollbackMinutes) && Number.isSafeInteger(timings.decisionDeadlineMinutes) && timings.applicationRollbackMinutes > timings.decisionDeadlineMinutes) add(blockers, "timings.applicationRollbackMinutes", "must not exceed the rollback decision deadline");
  if (Number.isSafeInteger(timings.databaseRecoveryMinutes) && Number.isSafeInteger(timings.rtoMinutes) && timings.databaseRecoveryMinutes > timings.rtoMinutes) add(blockers, "timings.databaseRecoveryMinutes", "must not exceed the documented RTO");
  requireTrue(blockers, timings.completedWithinRto, "timings.completedWithinRto");

  const safety = object(manifest.safety);
  exactKeys(blockers, safety, "safety", ["productionContacted", "productionMutated", "destructiveDownMigrationUsed", "historicalDataRewritten", "outboundProvidersContacted", "temporaryTargetDeletedOrQuarantined"]);
  for (const key of ["productionContacted", "productionMutated", "destructiveDownMigrationUsed", "historicalDataRewritten", "outboundProvidersContacted"]) requireFalse(blockers, safety[key], `safety.${key}`);
  requireTrue(blockers, safety.temporaryTargetDeletedOrQuarantined, "safety.temporaryTargetDeletedOrQuarantined");

  if (timestamp(rehearsal.startedAt) && timestamp(rehearsal.completedAt)) {
    const rehearsalDurationMs = Date.parse(rehearsal.completedAt) - Date.parse(rehearsal.startedAt);
    if (rehearsalDurationMs < 0) add(blockers, "rehearsal.completedAt", "must not be earlier than startedAt");
    else if (Number.isSafeInteger(timings.applicationRollbackMinutes) && rehearsalDurationMs > timings.applicationRollbackMinutes * 60 * 1000) add(blockers, "timings.applicationRollbackMinutes", "must not be shorter than the timestamped application rehearsal duration");
  }

  const attestation = object(manifest.attestation);
  exactKeys(blockers, attestation, "attestation", ["recordedByRole", "reviewedByRole", "reviewedAt", "evidenceReviewed", "allFindingsResolved", "reviewDigest"]);
  if (attestation.recordedByRole !== "release-operator") add(blockers, "attestation.recordedByRole", "must equal release-operator");
  if (attestation.reviewedByRole !== "independent-reviewer") add(blockers, "attestation.reviewedByRole", "must equal independent-reviewer");
  validateTimestamp(blockers, attestation.reviewedAt, "attestation.reviewedAt", now);
  if (timestamp(attestation.reviewedAt) && timestamp(rehearsal.completedAt) && Date.parse(attestation.reviewedAt) < Date.parse(rehearsal.completedAt)) add(blockers, "attestation.reviewedAt", "must not be earlier than rehearsal completion");
  requireTrue(blockers, attestation.evidenceReviewed, "attestation.evidenceReviewed");
  requireTrue(blockers, attestation.allFindingsResolved, "attestation.allFindingsResolved");
  const expectedReviewDigest = calculateRollbackReviewDigest(manifest);
  if (!validDigest(attestation.reviewDigest) || attestation.reviewDigest !== expectedReviewDigest) add(blockers, "attestation.reviewDigest", "must match the canonical reviewed rollback evidence");

  warnings.push("This offline gate validates sanitized rollback evidence only; it does not deploy, restore, contact providers, or authorize production.");
  return {
    ready: blockers.length === 0,
    blockers,
    warnings,
    summary: blockers.length === 0 ? {
      policy: ROLLBACK_POLICY,
      commitSha: release.commitSha,
      deploymentId: release.deploymentId,
      previousCommitSha: release.previousCommitSha,
      previousDeploymentId: release.previousDeploymentId,
      decisionDeadlineMinutes: timings.decisionDeadlineMinutes,
      databaseRecoveryTested: true,
    } : null,
  };
}

function option(argv, name) {
  const prefix = `${name}=`;
  return argv.find(value => value.startsWith(prefix))?.slice(prefix.length);
}

export async function runCli(argv = process.argv.slice(2)) {
  if (argv.includes("--help")) {
    console.log("Usage: node scripts/rollback-readiness.mjs --manifest=<protected-json> --expected-commit=<sha> --expected-deployment-id=<id> --expected-previous-commit=<sha> --expected-previous-deployment-id=<id> [--print-review-digest]");
    return 0;
  }
  const manifestPath = option(argv, "--manifest");
  if (!manifestPath) {
    console.error(JSON.stringify({ ready: false, error: "Protected manifest and independent release identities are required." }, null, 2));
    return 2;
  }
  const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const loaded = await readProtectedRollbackManifest(manifestPath, { repositoryRoot });
  if (loaded.error) {
    console.error(JSON.stringify({ ready: false, error: loaded.error }, null, 2));
    return 2;
  }
  const manifest = loaded.parsed;
  if (argv.includes("--print-review-digest")) {
    manifest.attestation = { ...object(manifest.attestation), reviewDigest: calculateRollbackReviewDigest(manifest) };
  }
  const result = evaluateRollbackReadiness(manifest, {
    expectedCommit: option(argv, "--expected-commit"),
    expectedDeploymentId: option(argv, "--expected-deployment-id"),
    expectedPreviousCommit: option(argv, "--expected-previous-commit"),
    expectedPreviousDeploymentId: option(argv, "--expected-previous-deployment-id"),
  });
  if (argv.includes("--print-review-digest") && result.ready) {
    console.log(manifest.attestation.reviewDigest);
    return 0;
  }
  console.log(JSON.stringify(result, null, 2));
  return result.ready ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exitCode = await runCli();
