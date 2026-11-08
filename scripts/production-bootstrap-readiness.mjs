import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import { RELEASE_MIGRATION_CONTRACT } from "./recovery-ledger-fingerprint.mjs";

export const PRODUCTION_BOOTSTRAP_POLICY = "jingwuguan-production-bootstrap-v1";
export const PRODUCTION_REGION = "ap-southeast-1";
export const RELEASE_BRANCH = "release/v1-readiness-20260918";
export const STAGING_PROJECT_REF = "eomubndonbetszdbhsrj";
export const RETIRED_PROJECT_REF = "pkmllhaavadhaozmwapz";

const PROJECT_REF = /^[a-z0-9]{20}$/;
const SHA = /^[a-f0-9]{40}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const MAX_EVIDENCE_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

const ROOT_KEYS = [
  "schemaVersion", "policy", "environment", "target", "release",
  "targetInventory", "baselineArtifact", "migrationLedger", "importPlan",
  "controls", "independentReview",
];
const TARGET_KEYS = ["projectRef", "region", "supabaseOrigin"];
const RELEASE_KEYS = ["branch", "commitSha"];
const INVENTORY_KEYS = [
  "projectRef", "capturedAt", "collectorRole", "transactionReadOnly", "inventoryComplete",
  "applicationObjectCount", "applicationMigrationCount", "authAccountCount",
  "storageObjectCount", "snapshotSha256", "evidenceSha256",
];
const BASELINE_KEYS = [
  "sourceProjectRef", "capturedAt", "payloadSha256", "payloadBytes",
  "catalogFormatVersion", "catalogSha256", "catalogObjectCount",
  "evidenceSha256",
];
const LEDGER_KEYS = [
  "firstVersion", "lastVersion", "migrationCount", "repositoryFilesSha256",
  "sourceLedgerSha256", "evidenceSha256",
];
const IMPORT_KEYS = [
  "mode", "preparedAt", "packageSha256", "packageBytes",
  "baselinePayloadSha256", "baselineCatalogSha256", "migrationLedgerSha256",
  "recoveryManifestSha256", "planEvidenceSha256",
];
const CONTROL_KEYS = [
  "offlineValidationOnly", "offlineGateNetworkContacted", "productionMutationAuthorized",
  "productionMutationsPerformed", "importExecuted", "deploymentExecuted",
  "applyMigrationsToEmptyTarget", "restoreBaselineBeforeMigrationVerification",
  "outboundDeliveryDisabledBeforeImport", "postImportCatalogMatchRequired",
  "postImportLedgerMatchRequired", "rollbackPlanPrepared", "rawSecretsInManifest",
  "rawPersonalDataInManifest",
];
const REVIEW_KEYS = [
  "preparerFingerprint", "reviewerFingerprint", "reviewedAt", "result",
  "targetInventorySha256", "baselineEvidenceSha256", "ledgerEvidenceSha256",
  "importPlanEvidenceSha256", "attestationSha256",
];

function record(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function add(blockers, path, message) {
  blockers.push({ path, message });
}

function exactKeys(blockers, path, value, keys) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    add(blockers, path, "must be an object with the exact documented sanitized fields");
    return false;
  }
  const allowed = new Set(keys);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) add(blockers, path, "contains unsupported fields");
  }
  for (const key of keys) {
    if (!(key in value)) add(blockers, `${path}.${key}`, "is required");
  }
  return true;
}

function digest(blockers, path, value) {
  if (typeof value !== "string" || !SHA256.test(value) || /^(.)\1{63}$/.test(value)) {
    add(blockers, path, "must be a non-placeholder lowercase SHA-256 digest");
    return "";
  }
  return value;
}

function timestamp(blockers, path, value, now) {
  if (typeof value !== "string" || !ISO_UTC.test(value) || !Number.isFinite(Date.parse(value))) {
    add(blockers, path, "must be a valid ISO-8601 UTC timestamp");
    return null;
  }
  const parsed = Date.parse(value);
  if (parsed > now + MAX_CLOCK_SKEW_MS) add(blockers, path, "must not be in the future");
  if (now - parsed > MAX_EVIDENCE_AGE_MS) add(blockers, path, "must be no more than 24 hours old");
  return parsed;
}

function positiveInteger(blockers, path, value) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    add(blockers, path, "must be a positive safe integer");
  }
}

function fingerprint(blockers, path, value) {
  if (typeof value !== "string" || !/^[a-z0-9][a-z0-9._-]{2,63}$/i.test(value) ||
      /replace|placeholder|tbd|todo|pending/i.test(value)) {
    add(blockers, path, "must be a bounded non-placeholder role fingerprint");
  }
}

function canonicalHash(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function calculateProductionBootstrapAttestation(manifest) {
  const review = record(manifest.independentReview);
  return canonicalHash({
    schemaVersion: manifest.schemaVersion,
    policy: manifest.policy,
    environment: manifest.environment,
    target: manifest.target,
    release: manifest.release,
    targetInventorySha256: review.targetInventorySha256,
    baselineEvidenceSha256: review.baselineEvidenceSha256,
    ledgerEvidenceSha256: review.ledgerEvidenceSha256,
    importPlanEvidenceSha256: review.importPlanEvidenceSha256,
    preparerFingerprint: review.preparerFingerprint,
    reviewerFingerprint: review.reviewerFingerprint,
    reviewedAt: review.reviewedAt,
    result: review.result,
  });
}

export function evaluateProductionBootstrap(manifest, {
  expectedProjectRef,
  expectedCommit,
  now = Date.now(),
} = {}) {
  const blockers = [];
  const warnings = [];

  if (manifest === null || typeof manifest !== "object" || Array.isArray(manifest)) {
    return { ready: false, blockers: [{ path: "$", message: "manifest must be a JSON object" }], warnings, summary: null };
  }
  exactKeys(blockers, "$", manifest, ROOT_KEYS);
  if (manifest.schemaVersion !== 1) add(blockers, "schemaVersion", "must equal 1");
  if (manifest.policy !== PRODUCTION_BOOTSTRAP_POLICY) {
    add(blockers, "policy", `must equal ${PRODUCTION_BOOTSTRAP_POLICY}`);
  }
  if (manifest.environment !== "production") add(blockers, "environment", "must equal production");

  if (!PROJECT_REF.test(expectedProjectRef ?? "") ||
      [STAGING_PROJECT_REF, RETIRED_PROJECT_REF].includes(expectedProjectRef)) {
    add(blockers, "expectedProjectRef", "must independently supply the exact new 20-character production project ref");
  }
  if (!SHA.test(expectedCommit ?? "")) {
    add(blockers, "expectedCommit", "must independently supply the exact lowercase 40-character release SHA");
  }

  const target = record(manifest.target);
  exactKeys(blockers, "target", manifest.target, TARGET_KEYS);
  if (!PROJECT_REF.test(target.projectRef ?? "") ||
      [STAGING_PROJECT_REF, RETIRED_PROJECT_REF].includes(target.projectRef)) {
    add(blockers, "target.projectRef", "must be a new production Supabase project ref, not staging or retired");
  }
  if (target.projectRef !== expectedProjectRef) {
    add(blockers, "target.projectRef", "must match --expected-project-ref exactly");
  }
  if (target.region !== PRODUCTION_REGION) add(blockers, "target.region", `must equal ${PRODUCTION_REGION}`);
  if (target.supabaseOrigin !== `https://${target.projectRef}.supabase.co`) {
    add(blockers, "target.supabaseOrigin", "must be the exact HTTPS origin for target.projectRef");
  }

  const release = record(manifest.release);
  exactKeys(blockers, "release", manifest.release, RELEASE_KEYS);
  if (release.branch !== RELEASE_BRANCH) add(blockers, "release.branch", `must equal ${RELEASE_BRANCH}`);
  if (!SHA.test(release.commitSha ?? "") || release.commitSha !== expectedCommit) {
    add(blockers, "release.commitSha", "must equal the independently supplied release SHA");
  }

  const inventory = record(manifest.targetInventory);
  exactKeys(blockers, "targetInventory", manifest.targetInventory, INVENTORY_KEYS);
  if (inventory.projectRef !== target.projectRef) {
    add(blockers, "targetInventory.projectRef", "must match target.projectRef exactly");
  }
  const inventoryCapturedAt = timestamp(blockers, "targetInventory.capturedAt", inventory.capturedAt, now);
  fingerprint(blockers, "targetInventory.collectorRole", inventory.collectorRole);
  if (inventory.transactionReadOnly !== true) add(blockers, "targetInventory.transactionReadOnly", "must be true");
  if (inventory.inventoryComplete !== true) add(blockers, "targetInventory.inventoryComplete", "must be true");
  for (const key of ["applicationObjectCount", "applicationMigrationCount", "authAccountCount", "storageObjectCount"]) {
    if (inventory[key] !== 0) add(blockers, `targetInventory.${key}`, "must be exactly 0 before bootstrap");
  }
  digest(blockers, "targetInventory.snapshotSha256", inventory.snapshotSha256);
  digest(blockers, "targetInventory.evidenceSha256", inventory.evidenceSha256);

  const baseline = record(manifest.baselineArtifact);
  exactKeys(blockers, "baselineArtifact", manifest.baselineArtifact, BASELINE_KEYS);
  if (baseline.sourceProjectRef !== STAGING_PROJECT_REF) {
    add(blockers, "baselineArtifact.sourceProjectRef", `must equal the verified source ${STAGING_PROJECT_REF}`);
  }
  const baselineCapturedAt = timestamp(blockers, "baselineArtifact.capturedAt", baseline.capturedAt, now);
  digest(blockers, "baselineArtifact.payloadSha256", baseline.payloadSha256);
  positiveInteger(blockers, "baselineArtifact.payloadBytes", baseline.payloadBytes);
  if (baseline.catalogFormatVersion !== 1) add(blockers, "baselineArtifact.catalogFormatVersion", "must equal 1");
  digest(blockers, "baselineArtifact.catalogSha256", baseline.catalogSha256);
  positiveInteger(blockers, "baselineArtifact.catalogObjectCount", baseline.catalogObjectCount);
  digest(blockers, "baselineArtifact.evidenceSha256", baseline.evidenceSha256);

  const ledger = record(manifest.migrationLedger);
  exactKeys(blockers, "migrationLedger", manifest.migrationLedger, LEDGER_KEYS);
  for (const [key, expected] of Object.entries(RELEASE_MIGRATION_CONTRACT)) {
    if (ledger[key] !== expected) add(blockers, `migrationLedger.${key}`, `must equal the immutable repository contract ${expected}`);
  }
  digest(blockers, "migrationLedger.sourceLedgerSha256", ledger.sourceLedgerSha256);
  digest(blockers, "migrationLedger.evidenceSha256", ledger.evidenceSha256);

  const plan = record(manifest.importPlan);
  exactKeys(blockers, "importPlan", manifest.importPlan, IMPORT_KEYS);
  if (plan.mode !== "managed-full-import") add(blockers, "importPlan.mode", "must equal managed-full-import");
  const planPreparedAt = timestamp(blockers, "importPlan.preparedAt", plan.preparedAt, now);
  digest(blockers, "importPlan.packageSha256", plan.packageSha256);
  positiveInteger(blockers, "importPlan.packageBytes", plan.packageBytes);
  if (plan.baselinePayloadSha256 !== baseline.payloadSha256) {
    add(blockers, "importPlan.baselinePayloadSha256", "must match baselineArtifact.payloadSha256");
  }
  if (plan.baselineCatalogSha256 !== baseline.catalogSha256) {
    add(blockers, "importPlan.baselineCatalogSha256", "must match baselineArtifact.catalogSha256");
  }
  if (plan.migrationLedgerSha256 !== ledger.sourceLedgerSha256) {
    add(blockers, "importPlan.migrationLedgerSha256", "must match migrationLedger.sourceLedgerSha256");
  }
  digest(blockers, "importPlan.recoveryManifestSha256", plan.recoveryManifestSha256);
  digest(blockers, "importPlan.planEvidenceSha256", plan.planEvidenceSha256);

  const controls = record(manifest.controls);
  exactKeys(blockers, "controls", manifest.controls, CONTROL_KEYS);
  for (const key of [
    "offlineValidationOnly", "restoreBaselineBeforeMigrationVerification",
    "outboundDeliveryDisabledBeforeImport", "postImportCatalogMatchRequired",
    "postImportLedgerMatchRequired", "rollbackPlanPrepared",
  ]) {
    if (controls[key] !== true) add(blockers, `controls.${key}`, "must be true");
  }
  for (const key of [
    "offlineGateNetworkContacted", "productionMutationAuthorized", "importExecuted",
    "deploymentExecuted", "applyMigrationsToEmptyTarget", "rawSecretsInManifest",
    "rawPersonalDataInManifest",
  ]) {
    if (controls[key] !== false) add(blockers, `controls.${key}`, "must be false");
  }
  if (controls.productionMutationsPerformed !== 0) {
    add(blockers, "controls.productionMutationsPerformed", "must be exactly 0 for this offline preflight");
  }

  const review = record(manifest.independentReview);
  exactKeys(blockers, "independentReview", manifest.independentReview, REVIEW_KEYS);
  fingerprint(blockers, "independentReview.preparerFingerprint", review.preparerFingerprint);
  fingerprint(blockers, "independentReview.reviewerFingerprint", review.reviewerFingerprint);
  if (review.preparerFingerprint === review.reviewerFingerprint) {
    add(blockers, "independentReview.reviewerFingerprint", "must identify a reviewer independent from the preparer");
  }
  const reviewedAt = timestamp(blockers, "independentReview.reviewedAt", review.reviewedAt, now);
  if (review.result !== "approved") add(blockers, "independentReview.result", "must equal approved");
  if (baselineCapturedAt !== null && planPreparedAt !== null && baselineCapturedAt > planPreparedAt) {
    add(blockers, "importPlan.preparedAt", "must not precede baselineArtifact.capturedAt");
  }
  if (reviewedAt !== null && planPreparedAt !== null && reviewedAt < planPreparedAt) {
    add(blockers, "independentReview.reviewedAt", "must not precede importPlan.preparedAt");
  }
  if (reviewedAt !== null && inventoryCapturedAt !== null && reviewedAt < inventoryCapturedAt) {
    add(blockers, "independentReview.reviewedAt", "must not precede targetInventory.capturedAt");
  }
  for (const [reviewKey, sourceValue, sourcePath] of [
    ["targetInventorySha256", inventory.evidenceSha256, "targetInventory.evidenceSha256"],
    ["baselineEvidenceSha256", baseline.evidenceSha256, "baselineArtifact.evidenceSha256"],
    ["ledgerEvidenceSha256", ledger.evidenceSha256, "migrationLedger.evidenceSha256"],
    ["importPlanEvidenceSha256", plan.planEvidenceSha256, "importPlan.planEvidenceSha256"],
  ]) {
    digest(blockers, `independentReview.${reviewKey}`, review[reviewKey]);
    if (review[reviewKey] !== sourceValue) {
      add(blockers, `independentReview.${reviewKey}`, `must match ${sourcePath}`);
    }
  }
  const attestation = digest(blockers, "independentReview.attestationSha256", review.attestationSha256);
  if (attestation && attestation !== calculateProductionBootstrapAttestation(manifest)) {
    add(blockers, "independentReview.attestationSha256", "must match the canonical independent-review attestation");
  }

  const evidenceDigests = [
    inventory.evidenceSha256, baseline.evidenceSha256,
    ledger.evidenceSha256, plan.planEvidenceSha256,
  ].filter((value) => SHA256.test(value ?? ""));
  if (new Set(evidenceDigests).size !== 4) {
    add(blockers, "independentReview", "must bind four distinct protected evidence bundles");
  }

  warnings.push(
    "This offline preflight authorizes no production action. A passing result requires separate explicit approval before any managed import, migration, deployment, or provider contact.",
  );

  return {
    ready: blockers.length === 0,
    blockers,
    warnings,
    summary: blockers.length === 0 ? {
      projectRef: target.projectRef,
      region: target.region,
      commitSha: release.commitSha,
      migrationContract: {
        firstVersion: ledger.firstVersion,
        lastVersion: ledger.lastVersion,
        migrationCount: ledger.migrationCount,
      },
      productionMutationsPerformed: controls.productionMutationsPerformed,
    } : null,
  };
}

function option(argv, name) {
  const prefix = `${name}=`;
  return argv.find((entry) => entry.startsWith(prefix))?.slice(prefix.length);
}

function usage() {
  return [
    "Usage: node scripts/production-bootstrap-readiness.mjs --manifest=<protected-json> --expected-project-ref=<20-char-ref> --expected-commit=<40-char-sha>",
    "Offline validation only. This command never connects to Supabase or authorizes production mutation.",
  ].join("\n");
}

export async function runCli(argv = process.argv.slice(2)) {
  if (argv.includes("--help")) {
    console.log(usage());
    return 0;
  }
  const manifestPath = option(argv, "--manifest");
  const expectedProjectRef = option(argv, "--expected-project-ref");
  const expectedCommit = option(argv, "--expected-commit");
  if (!manifestPath || !expectedProjectRef || !expectedCommit) {
    console.error(JSON.stringify({ ready: false, error: "Manifest path, expected project ref and expected commit are required." }, null, 2));
    return 2;
  }
  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch {
    console.error(JSON.stringify({ ready: false, error: "Bootstrap manifest could not be read." }, null, 2));
    return 2;
  }
  const result = evaluateProductionBootstrap(manifest, { expectedProjectRef, expectedCommit });
  console.log(JSON.stringify(result, null, 2));
  return result.ready ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exitCode = await runCli();
}
