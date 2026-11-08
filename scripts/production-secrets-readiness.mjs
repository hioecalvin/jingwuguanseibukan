import { createHash, timingSafeEqual } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { parseEnv } from "node:util";

import { evaluateProviderConfiguration } from "./provider-config-readiness.mjs";

export const PRODUCTION_SECRETS_POLICY = "jingwuguan-production-secrets-v1";
export const PRODUCTION_REGION = "ap-southeast-1";
export const RELEASE_BRANCH = "release/v1-readiness-20260918";
export const STAGING_PROJECT_REF = "eomubndonbetszdbhsrj";
export const RETIRED_PROJECT_REF = "pkmllhaavadhaozmwapz";

const PROJECT_REF = /^[a-z0-9]{20}$/;
const COMMIT_SHA = /^[a-f0-9]{40}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const DEPLOYMENT_ID = /^[A-Za-z0-9][A-Za-z0-9_.-]{7,127}$/;
const MAX_EVIDENCE_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_ROTATION_AGE_MS = 90 * 24 * 60 * 60 * 1000;
const MAX_NEXT_ROTATION_MS = 365 * 24 * 60 * 60 * 1000;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

const ROOT_KEYS = [
  "schemaVersion", "policy", "environment", "target", "release",
  "configuration", "managedVariables", "governance", "independentReview",
];
const TARGET_KEYS = ["projectRef", "region", "supabaseOrigin", "siteOrigin"];
const RELEASE_KEYS = ["branch", "commitSha", "deploymentId", "vercelEnvironment"];
const CONFIGURATION_KEYS = [
  "validatedAt", "providerConfigurationReady", "offlineValidationOnly",
  "providerNetworkContacted", "rawSecretValuesPrinted", "configFingerprintSha256",
  "validationEvidenceSha256", "requiredVariableCount", "stagingResidueCount",
  "testResidueCount",
];
const VARIABLE_KEYS = [
  "name", "ownerFingerprint", "accessScope", "productionOnly",
  "stagingValueReused", "rotatedAt",
];
const GOVERNANCE_KEYS = [
  "secretsOwnerFingerprint", "accessReviewerFingerprint", "accessReviewedAt",
  "rotationPolicy", "accessPolicy", "protectedStore", "leastPrivilegeVerified",
  "incidentRotationPlanVerified", "stagingReuseVerifiedAbsent", "rawSecretsInEvidence",
  "accessEvidenceSha256", "rotationEvidenceSha256",
];
const REVIEW_KEYS = [
  "operatorFingerprint", "reviewerFingerprint", "reviewedAt", "result",
  "configFingerprintSha256", "validationEvidenceSha256", "accessEvidenceSha256",
  "rotationEvidenceSha256", "attestationSha256",
];

export const REQUIRED_PRODUCTION_VARIABLES = Object.freeze([
  "PRODUCTION_PROJECT_REF",
  "VERCEL_ENV",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "RESEND_API_KEY",
  "EMAIL_FROM_ADDRESS",
  "EMAIL_FROM_NAME",
  "EMAIL_WORKER_SECRET",
  "DURABLE_RATE_LIMIT_SECRET",
  "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "VAPID_SUBJECT",
  "PUSH_API_SECRET",
  "MUX_TOKEN_ID",
  "MUX_TOKEN_SECRET",
  "MUX_SIGNING_KEY_ID",
  "MUX_SIGNING_PRIVATE_KEY",
]);

export const MANAGED_SERVER_VARIABLES = Object.freeze([
  "SUPABASE_SECRET_KEY",
  "RESEND_API_KEY",
  "EMAIL_WORKER_SECRET",
  "DURABLE_RATE_LIMIT_SECRET",
  "VAPID_PRIVATE_KEY",
  "PUSH_API_SECRET",
  "MUX_TOKEN_ID",
  "MUX_TOKEN_SECRET",
  "MUX_SIGNING_KEY_ID",
  "MUX_SIGNING_PRIVATE_KEY",
]);

const STRONG_DISTINCT_VARIABLES = [
  "EMAIL_WORKER_SECRET", "PUSH_API_SECRET", "DURABLE_RATE_LIMIT_SECRET",
];
const FORBIDDEN_ENV_NAME = /^(?:STAGING_|PREVIEW_|SECURITY_TEST_|DUMMY_|TEST_ACCOUNT_)/;
const FORBIDDEN_LEGACY_NAMES = ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
const FORBIDDEN_VALUE = /(?:eomubndonbetszdbhsrj|pkmllhaavadhaozmwapz|jingwuguanseibukan-staging\.vercel\.app|localhost|\.invalid(?:\b|\/))/i;
const PLACEHOLDER = /(?:replace|placeholder|change[-_ ]?me|tbd|todo|pending|dummy|fixture|test[-_ ]?only)/i;

function record(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
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

function fingerprint(blockers, path, value) {
  if (typeof value !== "string" || !/^[a-z0-9][a-z0-9._-]{2,63}$/i.test(value) || PLACEHOLDER.test(value)) {
    add(blockers, path, "must be a bounded non-placeholder role fingerprint");
  }
}

function timestamp(blockers, path, value, now, { maxAge = MAX_EVIDENCE_AGE_MS, future = false } = {}) {
  if (typeof value !== "string" || !ISO_UTC.test(value) || !Number.isFinite(Date.parse(value))) {
    add(blockers, path, "must be a valid ISO-8601 UTC timestamp");
    return null;
  }
  const parsed = Date.parse(value);
  if (parsed > now + MAX_CLOCK_SKEW_MS && !future) add(blockers, path, "must not be in the future");
  if (!future && now - parsed > maxAge) add(blockers, path, `must be no more than ${Math.floor(maxAge / 86400000)} days old`);
  if (future && parsed <= now) add(blockers, path, "must be in the future");
  if (future && parsed - now > MAX_NEXT_ROTATION_MS) add(blockers, path, "must be no more than 365 days in the future");
  return parsed;
}

function exactOrigin(raw) {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

function canonicalHash(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function calculateProductionConfigurationFingerprint(env) {
  return canonicalHash(REQUIRED_PRODUCTION_VARIABLES.map((name) => [
    name,
    createHash("sha256").update(typeof env[name] === "string" ? env[name] : "").digest("hex"),
  ]));
}

export function calculateProductionSecretsAttestation(manifest) {
  const review = record(manifest.independentReview);
  return canonicalHash({
    schemaVersion: manifest.schemaVersion,
    policy: manifest.policy,
    environment: manifest.environment,
    target: manifest.target,
    release: manifest.release,
    configuration: manifest.configuration,
    managedVariables: manifest.managedVariables,
    governance: manifest.governance,
    operatorFingerprint: review.operatorFingerprint,
    reviewerFingerprint: review.reviewerFingerprint,
    reviewedAt: review.reviewedAt,
    result: review.result,
    configFingerprintSha256: review.configFingerprintSha256,
    validationEvidenceSha256: review.validationEvidenceSha256,
    accessEvidenceSha256: review.accessEvidenceSha256,
    rotationEvidenceSha256: review.rotationEvidenceSha256,
  });
}

function safeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string") return false;
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function strongSecret(value) {
  if (typeof value !== "string" || value.length < 32) return false;
  if (new Set(value).size < 12 || /^(.)\1+$/.test(value) || /^(.{1,8})\1+$/.test(value)) return false;
  return !PLACEHOLDER.test(value);
}

function rawSecretMaterialPresent(value) {
  const serialized = JSON.stringify(value);
  return /(?:sb_secret_[A-Za-z0-9_-]{20,}|re_[A-Za-z0-9_-]{20,}|-----BEGIN (?:RSA |EC )?PRIVATE KEY-----|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/.test(serialized);
}

export function evaluateProductionSecrets(manifest, env, {
  expectedProjectRef,
  expectedCommit,
  expectedDeploymentId,
  expectedOrigin,
  now = Date.now(),
} = {}) {
  const blockers = [];
  const target = record(manifest.target);
  const release = record(manifest.release);
  const configuration = record(manifest.configuration);
  const governance = record(manifest.governance);
  const review = record(manifest.independentReview);

  exactKeys(blockers, "manifest", manifest, ROOT_KEYS);
  exactKeys(blockers, "target", manifest.target, TARGET_KEYS);
  exactKeys(blockers, "release", manifest.release, RELEASE_KEYS);
  exactKeys(blockers, "configuration", manifest.configuration, CONFIGURATION_KEYS);
  exactKeys(blockers, "governance", manifest.governance, GOVERNANCE_KEYS);
  exactKeys(blockers, "independentReview", manifest.independentReview, REVIEW_KEYS);

  if (manifest.schemaVersion !== 1) add(blockers, "schemaVersion", "must equal 1");
  if (manifest.policy !== PRODUCTION_SECRETS_POLICY) add(blockers, "policy", `must equal ${PRODUCTION_SECRETS_POLICY}`);
  if (manifest.environment !== "production") add(blockers, "environment", "must equal production");

  if (!PROJECT_REF.test(expectedProjectRef ?? "") || [STAGING_PROJECT_REF, RETIRED_PROJECT_REF].includes(expectedProjectRef)) {
    add(blockers, "expectedProjectRef", "must independently identify a new 20-character production project reference");
  }
  if (target.projectRef !== expectedProjectRef || [STAGING_PROJECT_REF, RETIRED_PROJECT_REF].includes(target.projectRef)) {
    add(blockers, "target.projectRef", "must match the independently supplied production project reference");
  }
  if (target.region !== PRODUCTION_REGION) add(blockers, "target.region", `must equal ${PRODUCTION_REGION}`);
  if (target.supabaseOrigin !== `https://${expectedProjectRef}.supabase.co`) {
    add(blockers, "target.supabaseOrigin", "must be the exact production Supabase origin");
  }
  const normalizedExpectedOrigin = exactOrigin(expectedOrigin);
  if (!normalizedExpectedOrigin || FORBIDDEN_VALUE.test(normalizedExpectedOrigin ?? "")) {
    add(blockers, "expectedOrigin", "must independently identify an exact production HTTPS origin");
  }
  if (target.siteOrigin !== normalizedExpectedOrigin) add(blockers, "target.siteOrigin", "must match the independently supplied production origin");

  if (!COMMIT_SHA.test(expectedCommit ?? "") || /^(.)\1{39}$/.test(expectedCommit)) {
    add(blockers, "expectedCommit", "must be a non-placeholder 40-character release commit");
  }
  if (release.branch !== RELEASE_BRANCH) add(blockers, "release.branch", `must equal ${RELEASE_BRANCH}`);
  if (release.commitSha !== expectedCommit) add(blockers, "release.commitSha", "must match the independently supplied release commit");
  if (!DEPLOYMENT_ID.test(expectedDeploymentId ?? "") || PLACEHOLDER.test(expectedDeploymentId) || /staging|preview|test/i.test(expectedDeploymentId)) {
    add(blockers, "expectedDeploymentId", "must independently identify the exact production deployment");
  }
  if (release.deploymentId !== expectedDeploymentId) add(blockers, "release.deploymentId", "must match the independently supplied production deployment");
  if (release.vercelEnvironment !== "production") add(blockers, "release.vercelEnvironment", "must equal production");

  const provider = evaluateProviderConfiguration(env, {
    environment: "production",
    expectedOrigin: normalizedExpectedOrigin ?? "",
    expectedSupabaseHost: `${expectedProjectRef}.supabase.co`,
  });
  for (const blocker of provider.blockers) add(blockers, `environment.${blocker.path}`, blocker.message);

  for (const [name, value] of Object.entries(env)) {
    if (FORBIDDEN_ENV_NAME.test(name) && typeof value === "string" && value.trim()) {
      add(blockers, `environment.${name}`, "staging, preview, dummy, or test-account configuration must not be present");
    }
  }
  for (const name of REQUIRED_PRODUCTION_VARIABLES) {
    const value = typeof env[name] === "string" ? env[name] : "";
    if (!value.trim()) add(blockers, `environment.${name}`, "is required in the production-only protected environment");
    if (value && FORBIDDEN_VALUE.test(value)) add(blockers, `environment.${name}`, "contains staging, retired, local, or test residue");
  }
  for (const name of FORBIDDEN_LEGACY_NAMES) {
    if (typeof env[name] === "string" && env[name].trim()) {
      add(blockers, `environment.${name}`, "must be removed in favor of the role-specific modern production key");
    }
  }
  for (const name of STRONG_DISTINCT_VARIABLES) {
    if (!strongSecret(env[name])) add(blockers, `environment.${name}`, "must be a strong non-placeholder secret with at least 32 characters and sufficient variation");
  }
  const strongValues = STRONG_DISTINCT_VARIABLES.map((name) => env[name]).filter(Boolean);
  if (new Set(strongValues).size !== strongValues.length) add(blockers, "environment", "worker, push, and rate-limit secrets must be distinct");
  const serverValues = MANAGED_SERVER_VARIABLES.map((name) => env[name]).filter(Boolean);
  if (new Set(serverValues).size !== serverValues.length) add(blockers, "environment", "managed server-only credentials must not reuse values");

  const computedFingerprint = calculateProductionConfigurationFingerprint(env);
  const configuredFingerprint = digest(blockers, "configuration.configFingerprintSha256", configuration.configFingerprintSha256);
  const validationEvidence = digest(blockers, "configuration.validationEvidenceSha256", configuration.validationEvidenceSha256);
  const validatedAt = timestamp(blockers, "configuration.validatedAt", configuration.validatedAt, now);
  if (configuration.providerConfigurationReady !== true) add(blockers, "configuration.providerConfigurationReady", "must be true");
  if (configuration.offlineValidationOnly !== true) add(blockers, "configuration.offlineValidationOnly", "must be true");
  if (configuration.providerNetworkContacted !== false) add(blockers, "configuration.providerNetworkContacted", "must be false");
  if (configuration.rawSecretValuesPrinted !== false) add(blockers, "configuration.rawSecretValuesPrinted", "must be false");
  if (!safeEqual(configuredFingerprint, computedFingerprint)) add(blockers, "configuration.configFingerprintSha256", "does not match the protected production environment");
  if (configuration.requiredVariableCount !== REQUIRED_PRODUCTION_VARIABLES.length) add(blockers, "configuration.requiredVariableCount", `must equal ${REQUIRED_PRODUCTION_VARIABLES.length}`);
  if (configuration.stagingResidueCount !== 0) add(blockers, "configuration.stagingResidueCount", "must equal zero");
  if (configuration.testResidueCount !== 0) add(blockers, "configuration.testResidueCount", "must equal zero");

  if (!Array.isArray(manifest.managedVariables)) {
    add(blockers, "managedVariables", "must list every managed server-only variable exactly once");
  } else {
    const names = manifest.managedVariables.map((entry) => record(entry).name);
    if (names.length !== MANAGED_SERVER_VARIABLES.length || new Set(names).size !== names.length ||
        MANAGED_SERVER_VARIABLES.some((name) => !names.includes(name))) {
      add(blockers, "managedVariables", "must list every required server-only variable exactly once");
    }
    for (let index = 0; index < manifest.managedVariables.length; index += 1) {
      const item = record(manifest.managedVariables[index]);
      const path = `managedVariables[${index}]`;
      exactKeys(blockers, path, manifest.managedVariables[index], VARIABLE_KEYS);
      if (!MANAGED_SERVER_VARIABLES.includes(item.name)) add(blockers, `${path}.name`, "is not an approved managed production variable");
      fingerprint(blockers, `${path}.ownerFingerprint`, item.ownerFingerprint);
      if (item.accessScope !== "vercel-production-runtime-only") add(blockers, `${path}.accessScope`, "must equal vercel-production-runtime-only");
      if (item.productionOnly !== true) add(blockers, `${path}.productionOnly`, "must be true");
      if (item.stagingValueReused !== false) add(blockers, `${path}.stagingValueReused`, "must be false");
      timestamp(blockers, `${path}.rotatedAt`, item.rotatedAt, now, { maxAge: MAX_ROTATION_AGE_MS });
    }
  }

  fingerprint(blockers, "governance.secretsOwnerFingerprint", governance.secretsOwnerFingerprint);
  fingerprint(blockers, "governance.accessReviewerFingerprint", governance.accessReviewerFingerprint);
  const accessReviewedAt = timestamp(blockers, "governance.accessReviewedAt", governance.accessReviewedAt, now);
  if (governance.secretsOwnerFingerprint === governance.accessReviewerFingerprint) add(blockers, "governance.accessReviewerFingerprint", "must be independent from the secrets owner");
  if (governance.rotationPolicy !== "rotate-on-exposure-role-change-or-scheduled-review") add(blockers, "governance.rotationPolicy", "must equal the documented rotation policy");
  if (governance.accessPolicy !== "least-privilege-production-only") add(blockers, "governance.accessPolicy", "must equal least-privilege-production-only");
  if (governance.protectedStore !== "vercel-encrypted-production-environment") add(blockers, "governance.protectedStore", "must identify the production-only encrypted Vercel store");
  for (const name of ["leastPrivilegeVerified", "incidentRotationPlanVerified", "stagingReuseVerifiedAbsent"]) {
    if (governance[name] !== true) add(blockers, `governance.${name}`, "must be true");
  }
  if (governance.rawSecretsInEvidence !== false) add(blockers, "governance.rawSecretsInEvidence", "must be false");
  const accessEvidence = digest(blockers, "governance.accessEvidenceSha256", governance.accessEvidenceSha256);
  const rotationEvidence = digest(blockers, "governance.rotationEvidenceSha256", governance.rotationEvidenceSha256);

  fingerprint(blockers, "independentReview.operatorFingerprint", review.operatorFingerprint);
  fingerprint(blockers, "independentReview.reviewerFingerprint", review.reviewerFingerprint);
  const reviewedAt = timestamp(blockers, "independentReview.reviewedAt", review.reviewedAt, now);
  if (review.operatorFingerprint === review.reviewerFingerprint || review.reviewerFingerprint === governance.secretsOwnerFingerprint) {
    add(blockers, "independentReview.reviewerFingerprint", "must be independent from the operator and secrets owner");
  }
  if (review.result !== "approved") add(blockers, "independentReview.result", "must equal approved");
  for (const [field, expected] of [
    ["configFingerprintSha256", configuredFingerprint],
    ["validationEvidenceSha256", validationEvidence],
    ["accessEvidenceSha256", accessEvidence],
    ["rotationEvidenceSha256", rotationEvidence],
  ]) {
    const actual = digest(blockers, `independentReview.${field}`, review[field]);
    if (expected && actual !== expected) add(blockers, `independentReview.${field}`, "must match the reviewed evidence");
  }
  if (new Set([validationEvidence, accessEvidence, rotationEvidence].filter(Boolean)).size !== 3) {
    add(blockers, "independentReview", "validation, access, and rotation evidence digests must be distinct");
  }
  if (reviewedAt !== null && validatedAt !== null && reviewedAt < validatedAt) add(blockers, "independentReview.reviewedAt", "must follow configuration validation");
  if (reviewedAt !== null && accessReviewedAt !== null && reviewedAt < accessReviewedAt) add(blockers, "independentReview.reviewedAt", "must follow the access review");
  const attestation = digest(blockers, "independentReview.attestationSha256", review.attestationSha256);
  const expectedAttestation = calculateProductionSecretsAttestation(manifest);
  if (attestation && attestation !== expectedAttestation) add(blockers, "independentReview.attestationSha256", "does not match the canonical reviewed manifest");

  if (rawSecretMaterialPresent(manifest)) add(blockers, "manifest", "must not contain raw secret material");

  return {
    ready: blockers.length === 0,
    blockers,
    warnings: ["Offline validation proves configuration consistency and evidence binding only; it does not contact Vercel, Supabase, Resend, Mux, or production."],
    summary: {
      environment: manifest.environment,
      projectRef: target.projectRef,
      commitSha: release.commitSha,
      deploymentId: release.deploymentId,
      vercelEnvironment: release.vercelEnvironment,
      requiredVariableCount: REQUIRED_PRODUCTION_VARIABLES.length,
      managedVariableCount: MANAGED_SERVER_VARIABLES.length,
      providerConfigurationReady: provider.ready,
      offlineValidationOnly: configuration.offlineValidationOnly,
    },
  };
}

function option(argv, name) {
  const prefix = `${name}=`;
  return argv.find((entry) => entry.startsWith(prefix))?.slice(prefix.length);
}

function usage() {
  return [
    "Usage: node scripts/production-secrets-readiness.mjs --manifest=<protected-json> --env-file=<protected-env> --expected-project-ref=<ref> --expected-commit=<sha> --expected-deployment-id=<id> --expected-origin=<origin>",
    "       node scripts/production-secrets-readiness.mjs --fingerprint-only --env-file=<protected-env>",
    "",
    "This gate is offline. It validates protected values in memory and reports field names, blockers and sanitized counts only; it never prints secret values.",
  ].join("\n");
}

export async function runCli(argv = process.argv.slice(2)) {
  if (argv.includes("--help")) {
    console.log(usage());
    return 0;
  }
  const manifestPath = option(argv, "--manifest");
  const envPath = option(argv, "--env-file");
  const fingerprintOnly = argv.includes("--fingerprint-only");
  if (!envPath || !existsSync(envPath) || (!fingerprintOnly && (!manifestPath || !existsSync(manifestPath)))) {
    console.error(JSON.stringify({ ready: false, error: "Protected manifest and environment files are required and must exist." }, null, 2));
    return 2;
  }
  let manifest;
  let protectedEnv;
  try {
    if (!fingerprintOnly) manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    // Parse the named protected file into an isolated object. `loadEnvFile()`
    // merges into process.env without replacing existing values, which can make
    // ambient shell variables silently override the evidence source being checked.
    protectedEnv = parseEnv(await readFile(envPath, "utf8"));
  } catch {
    console.error(JSON.stringify({ ready: false, error: "Protected readiness inputs could not be loaded." }, null, 2));
    return 2;
  }
  if (fingerprintOnly) {
    console.log(JSON.stringify({ configFingerprintSha256: calculateProductionConfigurationFingerprint(protectedEnv) }, null, 2));
    return 0;
  }
  const result = evaluateProductionSecrets(manifest, protectedEnv, {
    expectedProjectRef: option(argv, "--expected-project-ref"),
    expectedCommit: option(argv, "--expected-commit"),
    expectedDeploymentId: option(argv, "--expected-deployment-id"),
    expectedOrigin: option(argv, "--expected-origin"),
  });
  console.log(JSON.stringify(result, null, 2));
  return result.ready ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exitCode = await runCli();
}
