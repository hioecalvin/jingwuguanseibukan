import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const CUTOVER_POLICY = "jingwuguan-production-cutover-v1";
export const RELEASE_BRANCH = "release/v1-readiness-20260918";
export const PRODUCTION_ORIGIN = "https://jingwuguanseibukan.com";
export const PRODUCTION_REGION = "ap-southeast-1";
const STAGING_PROJECT_REF = "eomubndonbetszdbhsrj";
const RETIRED_PROJECT_REF = "pkmllhaavadhaozmwapz";
const PROJECT_REF = /^[a-z0-9]{20}$/;
const SHA = /^[a-f0-9]{40}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const DEPLOYMENT_ID = /^dpl_[A-Za-z0-9_-]{3,}$/;
const ISO_WITH_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_JSON_BYTES = 1024 * 1024;

function object(value) { return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {}; }
function add(blockers, path, message) { blockers.push({ path, message }); }
function exactKeys(blockers, value, path, allowed) {
  const keys = Object.keys(object(value)).sort();
  const expected = [...allowed].sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) add(blockers, path, "must contain exactly the documented sanitized fields");
}
function validDigest(value) { return typeof value === "string" && SHA256.test(value) && !/^(.)\1{63}$/.test(value); }
function timestamp(value) {
  if (typeof value !== "string" || !ISO_WITH_ZONE.test(value)) return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/.exec(value);
  if (!match) return false;
  const [, year, month, day, hour, minute, second] = match.map(Number);
  const normalized = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (normalized.getUTCFullYear() !== year || normalized.getUTCMonth() !== month - 1 || normalized.getUTCDate() !== day || normalized.getUTCHours() !== hour || normalized.getUTCMinutes() !== minute || normalized.getUTCSeconds() !== second) return false;
  return Number.isFinite(Date.parse(value));
}
function validateFreshTimestamp(blockers, value, path, now, maximumAge = MAX_AGE_MS) {
  if (!timestamp(value)) { add(blockers, path, "must be a real ISO-8601 timestamp with an explicit offset"); return; }
  const time = Date.parse(value);
  if (!Number.isFinite(now) || time > now + 5 * 60 * 1000) add(blockers, path, "must not be in the future");
  else if (now - time > maximumAge) add(blockers, path, `must be no more than ${maximumAge / 3_600_000} hours old`);
}
function requireTrue(blockers, value, path) { if (value !== true) add(blockers, path, "must be true"); }
function requireFalse(blockers, value, path) { if (value !== false) add(blockers, path, "must be false"); }
function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value !== null && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function scanSensitiveValues(blockers, value, path = "$") {
  if (typeof value === "string" && (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(value) || /\bBearer\s+[A-Za-z0-9._~-]+/i.test(value) || /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(value) || /\b(?:sb_secret_|re_[A-Za-z0-9_]{12,}|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\b/.test(value))) {
    add(blockers, path, "must not contain an email address, credential, token, or private key");
    return;
  }
  if (Array.isArray(value)) value.forEach((entry, index) => scanSensitiveValues(blockers, entry, `${path}[${index}]`));
  else if (value !== null && typeof value === "object") for (const entry of Object.values(value)) scanSensitiveValues(blockers, entry, `${path}.[field]`);
}

export function calculateCutoverReviewDigest(manifest) {
  const attestation = object(manifest?.attestation);
  return createHash("sha256").update(stable({
    manifestVersion: manifest?.manifestVersion,
    policy: manifest?.policy,
    release: object(manifest?.release),
    target: object(manifest?.target),
    database: object(manifest?.database),
    defaultAcl: object(manifest?.defaultAcl),
    roleSecurity: object(manifest?.roleSecurity),
    domain: object(manifest?.domain),
    probes: object(manifest?.probes),
    safety: object(manifest?.safety),
    attestation: {
      recordedByRole: attestation.recordedByRole,
      reviewedByRole: attestation.reviewedByRole,
      reviewedAt: attestation.reviewedAt,
      evidenceReviewed: attestation.evidenceReviewed,
      allFindingsDispositioned: attestation.allFindingsDispositioned,
    },
  })).digest("hex");
}

export function evaluateProductionCutoverReadiness(manifest, {
  expectedCommit,
  expectedDeploymentId,
  expectedProductionProjectRef,
  expectedWindowStartsAt,
  expectedWindowEndsAt,
  now = Date.now(),
} = {}) {
  const blockers = [];
  const warnings = [];
  if (manifest === null || typeof manifest !== "object" || Array.isArray(manifest)) return { ready: false, blockers: [{ path: "$", message: "manifest must be a JSON object" }], warnings, summary: null };
  scanSensitiveValues(blockers, manifest);
  exactKeys(blockers, manifest, "$", ["manifestVersion", "policy", "release", "target", "database", "defaultAcl", "roleSecurity", "domain", "probes", "safety", "attestation"]);
  if (manifest.manifestVersion !== 1) add(blockers, "manifestVersion", "must equal 1");
  if (manifest.policy !== CUTOVER_POLICY) add(blockers, "policy", `must equal ${CUTOVER_POLICY}`);
  if (!SHA.test(expectedCommit ?? "")) add(blockers, "expectedCommit", "must independently supply an exact lowercase 40-character release SHA");
  if (!DEPLOYMENT_ID.test(expectedDeploymentId ?? "")) add(blockers, "expectedDeploymentId", "must independently supply the exact immutable deployment ID");
  if (!PROJECT_REF.test(expectedProductionProjectRef ?? "") || [STAGING_PROJECT_REF, RETIRED_PROJECT_REF].includes(expectedProductionProjectRef)) add(blockers, "expectedProductionProjectRef", "must independently supply the exact active production project ref");
  if (!timestamp(expectedWindowStartsAt)) add(blockers, "expectedWindowStartsAt", "must independently supply the approved window start");
  if (!timestamp(expectedWindowEndsAt)) add(blockers, "expectedWindowEndsAt", "must independently supply the approved window end");
  if (timestamp(expectedWindowStartsAt) && timestamp(expectedWindowEndsAt)) {
    const startsAt = Date.parse(expectedWindowStartsAt);
    const endsAt = Date.parse(expectedWindowEndsAt);
    if (endsAt <= startsAt) add(blockers, "expectedWindowEndsAt", "must be later than the approved window start");
    if (!Number.isFinite(now) || now < startsAt || now > endsAt) add(blockers, "expectedWindowEndsAt", "cutover validation must run within the approved release window");
  }

  const release = object(manifest.release);
  exactKeys(blockers, release, "release", ["branch", "commitSha", "deploymentId", "origin", "windowStartsAt", "windowEndsAt"]);
  if (release.branch !== RELEASE_BRANCH) add(blockers, "release.branch", `must equal ${RELEASE_BRANCH}`);
  if (release.commitSha !== expectedCommit) add(blockers, "release.commitSha", "must match the independently supplied release commit");
  if (release.deploymentId !== expectedDeploymentId) add(blockers, "release.deploymentId", "must match the independently supplied deployment");
  if (release.origin !== PRODUCTION_ORIGIN) add(blockers, "release.origin", `must equal ${PRODUCTION_ORIGIN}`);
  if (release.windowStartsAt !== expectedWindowStartsAt) add(blockers, "release.windowStartsAt", "must match the independently supplied approved window start");
  if (release.windowEndsAt !== expectedWindowEndsAt) add(blockers, "release.windowEndsAt", "must match the independently supplied approved window end");

  const target = object(manifest.target);
  exactKeys(blockers, target, "target", ["environment", "projectRef", "region", "supabaseOrigin", "dashboardOwnershipVerified", "dashboardRegionVerified"]);
  if (target.environment !== "production") add(blockers, "target.environment", "must equal production");
  if (target.projectRef !== expectedProductionProjectRef) add(blockers, "target.projectRef", "must match the independently supplied production project ref");
  if (target.region !== PRODUCTION_REGION) add(blockers, "target.region", `must equal ${PRODUCTION_REGION}`);
  if (target.supabaseOrigin !== `https://${expectedProductionProjectRef}.supabase.co`) add(blockers, "target.supabaseOrigin", "must equal the exact production Supabase origin");
  requireTrue(blockers, target.dashboardOwnershipVerified, "target.dashboardOwnershipVerified");
  requireTrue(blockers, target.dashboardRegionVerified, "target.dashboardRegionVerified");

  const database = object(manifest.database);
  exactKeys(blockers, database, "database", ["capturedAt", "migrationLedger", "exactLedgerPassed", "catalogPassed", "databaseLintPassed", "securityVerifierPassed", "grantsAndRlsPassed", "evidenceSha256"]);
  validateFreshTimestamp(blockers, database.capturedAt, "database.capturedAt", now);
  if (database.migrationLedger !== "006-056") add(blockers, "database.migrationLedger", "must equal 006-056");
  for (const key of ["exactLedgerPassed", "catalogPassed", "databaseLintPassed", "securityVerifierPassed", "grantsAndRlsPassed"]) requireTrue(blockers, database[key], `database.${key}`);
  if (!validDigest(database.evidenceSha256)) add(blockers, "database.evidenceSha256", "must be a non-placeholder SHA-256 evidence digest");

  const acl = object(manifest.defaultAcl);
  exactKeys(blockers, acl, "defaultAcl", ["capturedAt", "status", "scope", "evidenceSha256", "exceptionReference", "exceptionExpiresAt", "reviewedByRole"]);
  validateFreshTimestamp(blockers, acl.capturedAt, "defaultAcl.capturedAt", now);
  if (!validDigest(acl.evidenceSha256) || acl.evidenceSha256 === database.evidenceSha256) add(blockers, "defaultAcl.evidenceSha256", "must be a distinct non-placeholder SHA-256 evidence digest");
  if (acl.reviewedByRole !== "independent-security-reviewer") add(blockers, "defaultAcl.reviewedByRole", "must equal independent-security-reviewer");
  if (acl.scope !== "supabase-admin-future-object-default-acl-only") add(blockers, "defaultAcl.scope", "must equal the narrow documented ACL scope");
  if (acl.status === "resolved") {
    if (acl.exceptionReference !== "not-applicable" || acl.exceptionExpiresAt !== null) add(blockers, "defaultAcl", "resolved status must not carry an exception");
  } else if (acl.status === "time-bounded-exception") {
    if (typeof acl.exceptionReference !== "string" || acl.exceptionReference.length < 6 || /replace|placeholder|todo|tbd/i.test(acl.exceptionReference)) add(blockers, "defaultAcl.exceptionReference", "must identify the approved narrow exception");
    if (!timestamp(acl.exceptionExpiresAt)) add(blockers, "defaultAcl.exceptionExpiresAt", "must be a real ISO-8601 timestamp with an explicit offset");
    else {
      const expiry = Date.parse(acl.exceptionExpiresAt);
      if (!Number.isFinite(now) || expiry <= now || expiry - now > 30 * 24 * 60 * 60 * 1000) add(blockers, "defaultAcl.exceptionExpiresAt", "must expire in the next 30 days");
    }
  } else add(blockers, "defaultAcl.status", "must equal resolved or time-bounded-exception");

  const roles = object(manifest.roleSecurity);
  exactKeys(blockers, roles, "roleSecurity", ["capturedAt", "readOnly", "memberPassed", "scopedAdminPassed", "superAdminPassed", "reviewedExistingAccounts", "authSessionWritesExpected", "applicationMutationsAttempted", "evidenceSha256"]);
  validateFreshTimestamp(blockers, roles.capturedAt, "roleSecurity.capturedAt", now);
  for (const key of ["readOnly", "memberPassed", "scopedAdminPassed", "superAdminPassed", "reviewedExistingAccounts", "authSessionWritesExpected"]) requireTrue(blockers, roles[key], `roleSecurity.${key}`);
  requireFalse(blockers, roles.applicationMutationsAttempted, "roleSecurity.applicationMutationsAttempted");
  if (!validDigest(roles.evidenceSha256) || [database.evidenceSha256, acl.evidenceSha256].includes(roles.evidenceSha256)) add(blockers, "roleSecurity.evidenceSha256", "must be a distinct non-placeholder SHA-256 evidence digest");

  const domain = object(manifest.domain);
  exactKeys(blockers, domain, "domain", ["capturedAt", "customDomain", "dnsResolved", "tlsValid", "certificateHostname", "supabaseSiteUrl", "authConfirmRedirect", "publicConfigProjectRef", "stagingResidueFound", "retiredResidueFound", "evidenceSha256"]);
  validateFreshTimestamp(blockers, domain.capturedAt, "domain.capturedAt", now);
  if (domain.customDomain !== "jingwuguanseibukan.com" || domain.certificateHostname !== "jingwuguanseibukan.com") add(blockers, "domain.customDomain", "must bind DNS and TLS to jingwuguanseibukan.com");
  requireTrue(blockers, domain.dnsResolved, "domain.dnsResolved");
  requireTrue(blockers, domain.tlsValid, "domain.tlsValid");
  if (domain.supabaseSiteUrl !== PRODUCTION_ORIGIN) add(blockers, "domain.supabaseSiteUrl", `must equal ${PRODUCTION_ORIGIN}`);
  if (domain.authConfirmRedirect !== `${PRODUCTION_ORIGIN}/auth/confirm`) add(blockers, "domain.authConfirmRedirect", "must equal the exact production confirmation redirect");
  if (domain.publicConfigProjectRef !== expectedProductionProjectRef) add(blockers, "domain.publicConfigProjectRef", "must bind public configuration to production");
  requireFalse(blockers, domain.stagingResidueFound, "domain.stagingResidueFound");
  requireFalse(blockers, domain.retiredResidueFound, "domain.retiredResidueFound");
  if (!validDigest(domain.evidenceSha256) || [database.evidenceSha256, acl.evidenceSha256, roles.evidenceSha256].includes(domain.evidenceSha256)) add(blockers, "domain.evidenceSha256", "must be a distinct non-placeholder SHA-256 evidence digest");

  const probes = object(manifest.probes);
  exactKeys(blockers, probes, "probes", ["capturedAt", "requiredHostProbes", "passedHostProbes", "browserAuthReadOnlyPassed", "redirectsPassed", "securityHeadersPassed", "serverErrors", "applicationAcceptanceWrites", "evidenceSha256"]);
  validateFreshTimestamp(blockers, probes.capturedAt, "probes.capturedAt", now);
  if (probes.requiredHostProbes !== 11 || probes.passedHostProbes !== 11) add(blockers, "probes.passedHostProbes", "must pass all 11 production host probes");
  for (const key of ["browserAuthReadOnlyPassed", "redirectsPassed", "securityHeadersPassed"]) requireTrue(blockers, probes[key], `probes.${key}`);
  if (probes.serverErrors !== 0) add(blockers, "probes.serverErrors", "must equal 0");
  if (probes.applicationAcceptanceWrites !== 0) add(blockers, "probes.applicationAcceptanceWrites", "must equal 0");
  if (!validDigest(probes.evidenceSha256) || [database.evidenceSha256, acl.evidenceSha256, roles.evidenceSha256, domain.evidenceSha256].includes(probes.evidenceSha256)) add(blockers, "probes.evidenceSha256", "must be a distinct non-placeholder SHA-256 evidence digest");

  const safety = object(manifest.safety);
  exactKeys(blockers, safety, "safety", ["acceptanceReadOnly", "memberRecordsMutated", "testAccountsCreated", "outboundProvidersContacted", "stagingContacted", "retiredProjectContacted", "rollbackDeploymentReachable"]);
  requireTrue(blockers, safety.acceptanceReadOnly, "safety.acceptanceReadOnly");
  requireTrue(blockers, safety.rollbackDeploymentReachable, "safety.rollbackDeploymentReachable");
  for (const key of ["memberRecordsMutated", "testAccountsCreated", "outboundProvidersContacted", "stagingContacted", "retiredProjectContacted"]) requireFalse(blockers, safety[key], `safety.${key}`);

  const attestation = object(manifest.attestation);
  exactKeys(blockers, attestation, "attestation", ["recordedByRole", "reviewedByRole", "reviewedAt", "evidenceReviewed", "allFindingsDispositioned", "reviewDigest"]);
  if (attestation.recordedByRole !== "production-release-operator") add(blockers, "attestation.recordedByRole", "must equal production-release-operator");
  if (attestation.reviewedByRole !== "independent-release-reviewer") add(blockers, "attestation.reviewedByRole", "must equal independent-release-reviewer");
  validateFreshTimestamp(blockers, attestation.reviewedAt, "attestation.reviewedAt", now);
  const evidenceTimes = [database.capturedAt, acl.capturedAt, roles.capturedAt, domain.capturedAt, probes.capturedAt].filter(timestamp).map(Date.parse);
  if (timestamp(expectedWindowStartsAt) && timestamp(expectedWindowEndsAt)) {
    const startsAt = Date.parse(expectedWindowStartsAt);
    const endsAt = Date.parse(expectedWindowEndsAt);
    for (const [path, value] of [
      ["database.capturedAt", database.capturedAt],
      ["defaultAcl.capturedAt", acl.capturedAt],
      ["roleSecurity.capturedAt", roles.capturedAt],
      ["domain.capturedAt", domain.capturedAt],
      ["probes.capturedAt", probes.capturedAt],
      ["attestation.reviewedAt", attestation.reviewedAt],
    ]) {
      if (timestamp(value) && (Date.parse(value) < startsAt || Date.parse(value) > endsAt)) add(blockers, path, "must be captured within the approved release window");
    }
  }
  if (timestamp(attestation.reviewedAt) && evidenceTimes.some(time => Date.parse(attestation.reviewedAt) < time)) add(blockers, "attestation.reviewedAt", "must follow every evidence capture");
  requireTrue(blockers, attestation.evidenceReviewed, "attestation.evidenceReviewed");
  requireTrue(blockers, attestation.allFindingsDispositioned, "attestation.allFindingsDispositioned");
  if (!validDigest(attestation.reviewDigest) || attestation.reviewDigest !== calculateCutoverReviewDigest(manifest)) add(blockers, "attestation.reviewDigest", "must match the canonical reviewed cutover evidence");

  warnings.push("This offline gate validates sanitized cutover evidence only; it does not connect, deploy, migrate, configure providers, or authorize production.");
  return { ready: blockers.length === 0, blockers, warnings, summary: blockers.length === 0 ? {
    policy: CUTOVER_POLICY,
    environment: "production",
    projectRef: target.projectRef,
    commitSha: release.commitSha,
    deploymentId: release.deploymentId,
    origin: release.origin,
    migrationLedger: database.migrationLedger,
    defaultAclStatus: acl.status,
  } : null };
}

function within(parent, child) { const rel = relative(parent, child); return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel)); }
export async function readProtectedCutoverManifest(path, { repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..") } = {}) {
  if (typeof path !== "string" || !isAbsolute(path) || /^[/\\]{2}/.test(path) || /[\0-\x1f]/.test(path) || /replace|placeholder|todo|tbd/i.test(path)) return { error: "Manifest must be an absolute non-placeholder protected JSON file." };
  let sourcePath;
  try {
    const info = await lstat(path);
    if (!info.isFile() || info.isSymbolicLink() || info.size <= 1 || info.size > MAX_JSON_BYTES) return { error: "Manifest must be a bounded regular JSON file, not a link." };
    sourcePath = await realpath(path);
  } catch { return { error: "Production cutover evidence manifest could not be read." }; }
  if (within(resolve(repositoryRoot), sourcePath)) return { error: "Manifest must remain outside the repository." };
  try {
    const parsed = JSON.parse(await readFile(sourcePath, "utf8"));
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid");
    return { parsed, sourcePath };
  } catch { return { error: "Production cutover evidence manifest must contain one JSON object." }; }
}
function option(argv, name) { const prefix = `${name}=`; return argv.find(value => value.startsWith(prefix))?.slice(prefix.length); }
export async function runCli(argv = process.argv.slice(2)) {
  if (argv.includes("--help")) { console.log("Usage: node scripts/production-cutover-readiness.mjs --manifest=<protected-json> --expected-commit=<sha> --expected-deployment-id=<id> --expected-production-project-ref=<ref> --expected-window-starts-at=<iso> --expected-window-ends-at=<iso> [--print-review-digest]"); return 0; }
  const manifestPath = option(argv, "--manifest");
  if (!manifestPath) { console.error(JSON.stringify({ ready: false, error: "Protected manifest and independent release identities are required." }, null, 2)); return 2; }
  const loaded = await readProtectedCutoverManifest(manifestPath);
  if (loaded.error) { console.error(JSON.stringify({ ready: false, error: loaded.error }, null, 2)); return 2; }
  const manifest = loaded.parsed;
  if (argv.includes("--print-review-digest")) manifest.attestation = { ...object(manifest.attestation), reviewDigest: calculateCutoverReviewDigest(manifest) };
  const result = evaluateProductionCutoverReadiness(manifest, { expectedCommit: option(argv, "--expected-commit"), expectedDeploymentId: option(argv, "--expected-deployment-id"), expectedProductionProjectRef: option(argv, "--expected-production-project-ref"), expectedWindowStartsAt: option(argv, "--expected-window-starts-at"), expectedWindowEndsAt: option(argv, "--expected-window-ends-at") });
  if (argv.includes("--print-review-digest") && result.ready) { console.log(manifest.attestation.reviewDigest); return 0; }
  console.log(JSON.stringify(result, null, 2));
  return result.ready ? 0 : 1;
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exitCode = await runCli();
