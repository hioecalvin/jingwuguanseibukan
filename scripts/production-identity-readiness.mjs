import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

export const PRODUCTION_IDENTITY_SCHEMA_VERSION = 1;
export const PRODUCTION_IDENTITY_POLICY = "jingwuguan-production-identity-v1";
export const STAGING_PROJECT_REF = "eomubndonbetszdbhsrj";
export const RETIRED_PROJECT_REF = "pkmllhaavadhaozmwapz";

const PROJECT_REF = /^[a-z0-9]{20}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const MAX_EVIDENCE_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;
const MAX_CAPTURE_SPAN_MS = 15 * 60 * 1000;

const ROOT_KEYS = [
  "schemaVersion",
  "environment",
  "projectRef",
  "classificationPolicy",
  "authEvidence",
  "databaseEvidence",
  "independentReview",
];
const AUTH_KEYS = [
  "source",
  "collectorRole",
  "projectRef",
  "capturedAt",
  "inventoryComplete",
  "paginationComplete",
  "snapshotSha256",
  "inventoryQueryVersion",
  "collectorFingerprint",
  "provenanceSha256",
  "totalAccounts",
  "classifications",
];
const AUTH_CLASSIFICATION_KEYS = [
  "dummyMetadata",
  "dummyDomain",
  "reservedDomain",
  "securityTest",
  "testMarker",
  "unreviewed",
];
const DATABASE_KEYS = [
  "source",
  "collectorRole",
  "projectRef",
  "capturedAt",
  "inventoryComplete",
  "transactionReadOnly",
  "snapshotSha256",
  "inventoryQueryVersion",
  "collectorFingerprint",
  "provenanceSha256",
  "authAccountCount",
  "profileCount",
  "authWithoutProfile",
  "orphanProfiles",
  "orphanMemberships",
  "duplicateProfileIdentities",
  "classifications",
];
const DATABASE_CLASSIFICATION_KEYS = [
  "dummyProfiles",
  "dummyMemberships",
  "securityTestProfiles",
  "testMarkerProfiles",
  "unreviewedProfiles",
];
const REVIEW_KEYS = [
  "reviewerRole",
  "reviewedAt",
  "result",
  "authSnapshotSha256",
  "databaseSnapshotSha256",
  "authProvenanceSha256",
  "databaseProvenanceSha256",
  "reviewerFingerprint",
  "attestationSha256",
  "zeroForbiddenAccountsConfirmed",
];

function add(blockers, path, message) {
  blockers.push({ path, message });
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(blockers, path, value, expected) {
  if (!isRecord(value)) {
    add(blockers, path, "must be an object with the documented sanitized fields");
    return false;
  }
  const expectedSet = new Set(expected);
  if (Object.keys(value).some((key) => !expectedSet.has(key))) {
    add(blockers, path, "contains unsupported fields; sanitized identity evidence must use the exact documented schema");
  }
  for (const key of expected) {
    if (!(key in value)) add(blockers, `${path}.${key}`, "is required");
  }
  return true;
}

function integer(blockers, path, value, { minimum = 0 } = {}) {
  if (!Number.isSafeInteger(value) || value < minimum) {
    add(blockers, path, `must be a safe integer greater than or equal to ${minimum}`);
    return null;
  }
  return value;
}

function exact(blockers, path, value, expected) {
  if (value !== expected) add(blockers, path, `must equal ${expected}`);
}

function requireTextFingerprint(blockers, path, value) {
  if (typeof value !== "string" || !/^[a-z0-9][a-z0-9._-]{2,63}$/i.test(value) || /replace|placeholder|tbd|todo/i.test(value)) {
    add(blockers, path, "must be a bounded non-placeholder query/tool version");
  }
}

function timestamp(blockers, path, value, now) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) {
    add(blockers, path, "must be an ISO-8601 UTC timestamp");
    return null;
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    add(blockers, path, "must be a valid timestamp");
    return null;
  }
  if (parsed > now + MAX_CLOCK_SKEW_MS) add(blockers, path, "must not be in the future");
  if (now - parsed > MAX_EVIDENCE_AGE_MS) add(blockers, path, "must be no more than 24 hours old");
  return parsed;
}

function digest(blockers, path, value) {
  if (typeof value !== "string" || !SHA256.test(value)) {
    add(blockers, path, "must be a lowercase SHA-256 digest of the complete protected inventory");
    return "";
  }
  if (/^(.)\1{63}$/.test(value)) {
    add(blockers, path, "must not be a placeholder digest");
    return "";
  }
  return value;
}

function sha256(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function evidenceEnvelope(manifest, evidence, kind) {
  const common = {
    schemaVersion: manifest.schemaVersion,
    environment: manifest.environment,
    projectRef: manifest.projectRef,
    classificationPolicy: manifest.classificationPolicy,
    kind,
    source: evidence.source,
    collectorRole: evidence.collectorRole,
    collectorFingerprint: evidence.collectorFingerprint,
    inventoryQueryVersion: evidence.inventoryQueryVersion,
    capturedAt: evidence.capturedAt,
    snapshotSha256: evidence.snapshotSha256,
    classifications: evidence.classifications,
  };
  return kind === "auth"
    ? { ...common, inventoryComplete: evidence.inventoryComplete, paginationComplete: evidence.paginationComplete, totalAccounts: evidence.totalAccounts }
    : { ...common, inventoryComplete: evidence.inventoryComplete, transactionReadOnly: evidence.transactionReadOnly, authAccountCount: evidence.authAccountCount, profileCount: evidence.profileCount, authWithoutProfile: evidence.authWithoutProfile, orphanProfiles: evidence.orphanProfiles, orphanMemberships: evidence.orphanMemberships, duplicateProfileIdentities: evidence.duplicateProfileIdentities };
}

export function calculateProductionIdentityDigests(manifest) {
  const authProvenanceSha256 = sha256(evidenceEnvelope(manifest, manifest.authEvidence, "auth"));
  const databaseProvenanceSha256 = sha256(evidenceEnvelope(manifest, manifest.databaseEvidence, "database"));
  const attestationSha256 = sha256({
    schemaVersion: manifest.schemaVersion,
    environment: manifest.environment,
    projectRef: manifest.projectRef,
    classificationPolicy: manifest.classificationPolicy,
    reviewerRole: manifest.independentReview.reviewerRole,
    reviewerFingerprint: manifest.independentReview.reviewerFingerprint,
    reviewedAt: manifest.independentReview.reviewedAt,
    result: manifest.independentReview.result,
    authProvenanceSha256,
    databaseProvenanceSha256,
    zeroForbiddenAccountsConfirmed: manifest.independentReview.zeroForbiddenAccountsConfirmed,
  });
  return { authProvenanceSha256, databaseProvenanceSha256, attestationSha256 };
}

function projectRef(blockers, path, value, expectedProjectRef) {
  if (typeof value !== "string" || !PROJECT_REF.test(value)) {
    add(blockers, path, "must be the exact 20-character production project reference");
    return;
  }
  if ([STAGING_PROJECT_REF, RETIRED_PROJECT_REF].includes(value)) {
    add(blockers, path, "must not identify staging or the retired project");
  }
  if (value !== expectedProjectRef) add(blockers, path, "must match --expected-project-ref exactly");
}

function zeroClassifications(blockers, path, value, keys) {
  if (!exactKeys(blockers, path, value, keys)) return;
  for (const key of keys) {
    const count = integer(blockers, `${path}.${key}`, value[key]);
    if (count !== null && count !== 0) {
      add(blockers, `${path}.${key}`, "must be zero before production release");
    }
  }
}

export function evaluateProductionIdentityEvidence(manifest, {
  expectedProjectRef,
  now = Date.now(),
} = {}) {
  const blockers = [];
  const warnings = [
    "This offline gate validates sanitized aggregate evidence only; it does not query, delete, disable, or reveal any account.",
  ];

  if (!PROJECT_REF.test(expectedProjectRef ?? "") ||
      [STAGING_PROJECT_REF, RETIRED_PROJECT_REF].includes(expectedProjectRef)) {
    add(blockers, "expectedProjectRef", "must be the exact active production project reference");
  }
  if (!exactKeys(blockers, "manifest", manifest, ROOT_KEYS)) {
    return { ready: false, blockers, warnings, target: null };
  }

  exact(blockers, "schemaVersion", manifest.schemaVersion, PRODUCTION_IDENTITY_SCHEMA_VERSION);
  exact(blockers, "environment", manifest.environment, "production");
  exact(blockers, "classificationPolicy", manifest.classificationPolicy, PRODUCTION_IDENTITY_POLICY);
  projectRef(blockers, "projectRef", manifest.projectRef, expectedProjectRef);

  const auth = manifest.authEvidence;
  const database = manifest.databaseEvidence;
  const review = manifest.independentReview;
  const authValid = exactKeys(blockers, "authEvidence", auth, AUTH_KEYS);
  const databaseValid = exactKeys(blockers, "databaseEvidence", database, DATABASE_KEYS);
  const reviewValid = exactKeys(blockers, "independentReview", review, REVIEW_KEYS);

  let authCapturedAt = null;
  let databaseCapturedAt = null;
  let reviewedAt = null;
  let authSnapshot = "";
  let databaseSnapshot = "";
  let authTotal = null;
  let databaseAuthTotal = null;
  let databaseProfileTotal = null;
  let authProvenance = "";
  let databaseProvenance = "";

  if (authValid) {
    exact(blockers, "authEvidence.source", auth.source, "supabase-auth-admin-api");
    exact(blockers, "authEvidence.collectorRole", auth.collectorRole, "auth-inventory-collector");
    projectRef(blockers, "authEvidence.projectRef", auth.projectRef, expectedProjectRef);
    authCapturedAt = timestamp(blockers, "authEvidence.capturedAt", auth.capturedAt, now);
    exact(blockers, "authEvidence.inventoryComplete", auth.inventoryComplete, true);
    exact(blockers, "authEvidence.paginationComplete", auth.paginationComplete, true);
    authSnapshot = digest(blockers, "authEvidence.snapshotSha256", auth.snapshotSha256);
    requireTextFingerprint(blockers, "authEvidence.inventoryQueryVersion", auth.inventoryQueryVersion);
    digest(blockers, "authEvidence.collectorFingerprint", auth.collectorFingerprint);
    authProvenance = digest(blockers, "authEvidence.provenanceSha256", auth.provenanceSha256);
    authTotal = integer(blockers, "authEvidence.totalAccounts", auth.totalAccounts, { minimum: 1 });
    zeroClassifications(blockers, "authEvidence.classifications", auth.classifications, AUTH_CLASSIFICATION_KEYS);
  }

  if (databaseValid) {
    exact(blockers, "databaseEvidence.source", database.source, "postgres-owner-read-only");
    exact(blockers, "databaseEvidence.collectorRole", database.collectorRole, "database-identity-collector");
    projectRef(blockers, "databaseEvidence.projectRef", database.projectRef, expectedProjectRef);
    databaseCapturedAt = timestamp(blockers, "databaseEvidence.capturedAt", database.capturedAt, now);
    exact(blockers, "databaseEvidence.inventoryComplete", database.inventoryComplete, true);
    exact(blockers, "databaseEvidence.transactionReadOnly", database.transactionReadOnly, true);
    databaseSnapshot = digest(blockers, "databaseEvidence.snapshotSha256", database.snapshotSha256);
    requireTextFingerprint(blockers, "databaseEvidence.inventoryQueryVersion", database.inventoryQueryVersion);
    digest(blockers, "databaseEvidence.collectorFingerprint", database.collectorFingerprint);
    databaseProvenance = digest(blockers, "databaseEvidence.provenanceSha256", database.provenanceSha256);
    databaseAuthTotal = integer(blockers, "databaseEvidence.authAccountCount", database.authAccountCount, { minimum: 1 });
    databaseProfileTotal = integer(blockers, "databaseEvidence.profileCount", database.profileCount, { minimum: 1 });
    for (const key of ["authWithoutProfile", "orphanProfiles", "orphanMemberships", "duplicateProfileIdentities"]) {
      const count = integer(blockers, `databaseEvidence.${key}`, database[key]);
      if (count !== null && count !== 0) add(blockers, `databaseEvidence.${key}`, "must be zero before production release");
    }
    zeroClassifications(blockers, "databaseEvidence.classifications", database.classifications, DATABASE_CLASSIFICATION_KEYS);
  }

  if (reviewValid) {
    exact(blockers, "independentReview.reviewerRole", review.reviewerRole, "release-security-reviewer");
    reviewedAt = timestamp(blockers, "independentReview.reviewedAt", review.reviewedAt, now);
    exact(blockers, "independentReview.result", review.result, "approved");
    exact(blockers, "independentReview.zeroForbiddenAccountsConfirmed", review.zeroForbiddenAccountsConfirmed, true);
    const reviewedAuth = digest(blockers, "independentReview.authSnapshotSha256", review.authSnapshotSha256);
    const reviewedDatabase = digest(blockers, "independentReview.databaseSnapshotSha256", review.databaseSnapshotSha256);
    const reviewedAuthProvenance = digest(blockers, "independentReview.authProvenanceSha256", review.authProvenanceSha256);
    const reviewedDatabaseProvenance = digest(blockers, "independentReview.databaseProvenanceSha256", review.databaseProvenanceSha256);
    const reviewerFingerprint = digest(blockers, "independentReview.reviewerFingerprint", review.reviewerFingerprint);
    const attestation = digest(blockers, "independentReview.attestationSha256", review.attestationSha256);
    if (authSnapshot && reviewedAuth && reviewedAuth !== authSnapshot) {
      add(blockers, "independentReview.authSnapshotSha256", "must bind the exact Auth inventory snapshot");
    }
    if (databaseSnapshot && reviewedDatabase && reviewedDatabase !== databaseSnapshot) {
      add(blockers, "independentReview.databaseSnapshotSha256", "must bind the exact database inventory snapshot");
    }
    if (authProvenance && reviewedAuthProvenance !== authProvenance) add(blockers, "independentReview.authProvenanceSha256", "must bind the exact Auth provenance envelope");
    if (databaseProvenance && reviewedDatabaseProvenance !== databaseProvenance) add(blockers, "independentReview.databaseProvenanceSha256", "must bind the exact database provenance envelope");
    if (authValid && databaseValid) {
      const calculated = calculateProductionIdentityDigests(manifest);
      if (authProvenance && calculated.authProvenanceSha256 !== authProvenance) add(blockers, "authEvidence.provenanceSha256", "must match the canonical project-bound provenance envelope");
      if (databaseProvenance && calculated.databaseProvenanceSha256 !== databaseProvenance) add(blockers, "databaseEvidence.provenanceSha256", "must match the canonical project-bound provenance envelope");
      if (attestation && calculated.attestationSha256 !== attestation) add(blockers, "independentReview.attestationSha256", "must match the canonical review attestation envelope");
      const actorFingerprints = [auth.collectorFingerprint, database.collectorFingerprint, reviewerFingerprint].filter(Boolean);
      if (new Set(actorFingerprints).size !== 3) add(blockers, "independentReview.reviewerFingerprint", "must be distinct from both inventory collectors");
    }
  }

  if (authSnapshot && databaseSnapshot && authSnapshot === databaseSnapshot) {
    add(blockers, "databaseEvidence.snapshotSha256", "must come from an independent inventory source");
  }
  if (authTotal !== null && databaseAuthTotal !== null && authTotal !== databaseAuthTotal) {
    add(blockers, "databaseEvidence.authAccountCount", "must equal the independently captured Auth account count");
  }
  if (databaseAuthTotal !== null && databaseProfileTotal !== null && databaseProfileTotal !== databaseAuthTotal) {
    add(blockers, "databaseEvidence.profileCount", "must equal the database Auth account count when orphan and missing-profile counts are zero");
  }
  if (authCapturedAt !== null && databaseCapturedAt !== null &&
      Math.abs(authCapturedAt - databaseCapturedAt) > MAX_CAPTURE_SPAN_MS) {
    add(blockers, "databaseEvidence.capturedAt", "must be within 15 minutes of the Auth inventory capture");
  }
  if (reviewedAt !== null) {
    const latestCapture = Math.max(authCapturedAt ?? -Infinity, databaseCapturedAt ?? -Infinity);
    if (Number.isFinite(latestCapture) && reviewedAt < latestCapture) {
      add(blockers, "independentReview.reviewedAt", "must be at or after both inventory captures");
    }
  }

  return {
    ready: blockers.length === 0,
    blockers,
    warnings,
    target: blockers.length === 0 ? {
      projectRef: manifest.projectRef,
      policy: manifest.classificationPolicy,
      totalAccounts: authTotal,
      profileCount: database.profileCount,
    } : null,
  };
}

function option(argv, name) {
  const prefix = `${name}=`;
  return argv.find((entry) => entry.startsWith(prefix))?.slice(prefix.length);
}

function usage() {
  return [
    "Usage: node scripts/production-identity-readiness.mjs --manifest=<protected-json> --expected-project-ref=<20-character-ref>",
    "",
    "The check is offline and accepts aggregate evidence only. It never contacts Supabase or prints account identities.",
  ].join("\n");
}

export function runCli(argv = process.argv.slice(2), now = Date.now()) {
  if (argv.includes("--help")) {
    console.log(usage());
    return 0;
  }
  const manifestPath = option(argv, "--manifest");
  if (!manifestPath) {
    console.error(JSON.stringify({ ready: false, error: "A protected manifest path is required." }, null, 2));
    return 2;
  }
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    console.error(JSON.stringify({ ready: false, error: "The protected manifest could not be read as JSON." }, null, 2));
    return 2;
  }
  const result = evaluateProductionIdentityEvidence(manifest, {
    expectedProjectRef: option(argv, "--expected-project-ref"),
    now,
  });
  console.log(JSON.stringify(result, null, 2));
  return result.ready ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exitCode = runCli();
}
