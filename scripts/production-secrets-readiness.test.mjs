import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createECDH, generateKeyPairSync, randomBytes } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  MANAGED_SERVER_VARIABLES,
  PRODUCTION_REGION,
  PRODUCTION_SECRETS_POLICY,
  RELEASE_BRANCH,
  REQUIRED_PRODUCTION_VARIABLES,
  calculateProductionConfigurationFingerprint,
  calculateProductionSecretsAttestation,
  evaluateProductionSecrets,
} from "./production-secrets-readiness.mjs";

const PROJECT_REF = "abcdefghijklmnopqrst";
const COMMIT = "1a".repeat(20);
const DEPLOYMENT = "dpl_production_abcdefghijklmnopqrstuv";
const ORIGIN = "https://jingwuguanseibukan.com";
const NOW = Date.parse("2026-10-01T12:00:00.000Z");

function validEnvironment() {
  const vapid = createECDH("prime256v1");
  vapid.setPrivateKey(randomBytes(32));
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  return {
    PRODUCTION_PROJECT_REF: PROJECT_REF,
    VERCEL_ENV: "production",
    NEXT_PUBLIC_SITE_URL: ORIGIN,
    NEXT_PUBLIC_SUPABASE_URL: `https://${PROJECT_REF}.supabase.co`,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_A1b2C3d4E5f6G7h8J9k0LmNoPqRsTuVw",
    SUPABASE_SECRET_KEY: "sb_secret_Z9y8X7w6V5u4T3s2R1q0PoNmLkJiHgFe",
    RESEND_API_KEY: "re_A1b2C3d4E5f6G7h8J9k0LmNoPqRsTuVw",
    EMAIL_FROM_ADDRESS: "membership@jingwuguanseibukan.com",
    EMAIL_FROM_NAME: "Jingwuguan Seibukan",
    EMAIL_WORKER_SECRET: "Ew1!rK9@mQ2#vT8$xP4%zN7&cD5*fH3+",
    DURABLE_RATE_LIMIT_SECRET: "Dr8!mL2@xQ6#pA4$vZ9%kT1&cN7*fG5+",
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: vapid.getPublicKey().toString("base64url"),
    VAPID_PRIVATE_KEY: vapid.getPrivateKey().toString("base64url"),
    VAPID_SUBJECT: "mailto:security@jingwuguanseibukan.com",
    PUSH_API_SECRET: "Ps7!nC3@wR9#fB1$yK6%qM4&vT8*xD2+",
    MUX_TOKEN_ID: "MuxProdTokenIdA1b2C3d4",
    MUX_TOKEN_SECRET: "MuxSecretA1b2C3d4E5f6G7h8J9k0LmNo",
    MUX_SIGNING_KEY_ID: "MuxProdSigningIdZ9y8X7w6",
    MUX_SIGNING_PRIVATE_KEY: Buffer.from(privateKey.export({ type: "pkcs8", format: "pem" })).toString("base64"),
  };
}

function validManifest(env = validEnvironment()) {
  const manifest = {
    schemaVersion: 1,
    policy: PRODUCTION_SECRETS_POLICY,
    environment: "production",
    target: {
      projectRef: PROJECT_REF,
      region: PRODUCTION_REGION,
      supabaseOrigin: `https://${PROJECT_REF}.supabase.co`,
      siteOrigin: ORIGIN,
    },
    release: {
      branch: RELEASE_BRANCH,
      commitSha: COMMIT,
      deploymentId: DEPLOYMENT,
      vercelEnvironment: "production",
    },
    configuration: {
      validatedAt: "2026-10-01T11:30:00.000Z",
      providerConfigurationReady: true,
      offlineValidationOnly: true,
      providerNetworkContacted: false,
      rawSecretValuesPrinted: false,
      configFingerprintSha256: calculateProductionConfigurationFingerprint(env),
      validationEvidenceSha256: "1a".repeat(32),
      requiredVariableCount: REQUIRED_PRODUCTION_VARIABLES.length,
      stagingResidueCount: 0,
      testResidueCount: 0,
    },
    managedVariables: MANAGED_SERVER_VARIABLES.map((name, index) => ({
      name,
      ownerFingerprint: `secret-owner-${index + 1}`,
      accessScope: "vercel-production-runtime-only",
      productionOnly: true,
      stagingValueReused: false,
      rotatedAt: "2026-09-30T09:00:00.000Z",
    })),
    governance: {
      secretsOwnerFingerprint: "production-secrets-owner",
      accessReviewerFingerprint: "production-access-reviewer",
      accessReviewedAt: "2026-10-01T11:35:00.000Z",
      rotationPolicy: "rotate-on-exposure-role-change-or-scheduled-review",
      accessPolicy: "least-privilege-production-only",
      protectedStore: "vercel-encrypted-production-environment",
      leastPrivilegeVerified: true,
      incidentRotationPlanVerified: true,
      stagingReuseVerifiedAbsent: true,
      rawSecretsInEvidence: false,
      accessEvidenceSha256: "2b".repeat(32),
      rotationEvidenceSha256: "3c".repeat(32),
    },
    independentReview: {
      operatorFingerprint: "production-release-operator",
      reviewerFingerprint: "independent-security-reviewer",
      reviewedAt: "2026-10-01T11:45:00.000Z",
      result: "approved",
      configFingerprintSha256: calculateProductionConfigurationFingerprint(env),
      validationEvidenceSha256: "1a".repeat(32),
      accessEvidenceSha256: "2b".repeat(32),
      rotationEvidenceSha256: "3c".repeat(32),
      attestationSha256: "",
    },
  };
  manifest.independentReview.attestationSha256 = calculateProductionSecretsAttestation(manifest);
  return manifest;
}

function evaluate(manifest, env, options = {}) {
  return evaluateProductionSecrets(manifest, env, {
    expectedProjectRef: PROJECT_REF,
    expectedCommit: COMMIT,
    expectedDeploymentId: DEPLOYMENT,
    expectedOrigin: ORIGIN,
    now: NOW,
    ...options,
  });
}

test("accepts fresh reviewed production-only configuration bound to the exact target and deployment", () => {
  const env = validEnvironment();
  const result = evaluate(validManifest(env), env);
  assert.equal(result.ready, true);
  assert.deepEqual(result.blockers, []);
  assert.equal(result.summary.requiredVariableCount, 19);
  assert.equal(result.summary.managedVariableCount, 10);
  assert.doesNotMatch(JSON.stringify(result), /sb_secret_|re_A1|Ew1!/);
});

test("rejects the staging or retired target and an independently mismatched deployment", () => {
  const env = validEnvironment();
  const manifest = validManifest(env);
  manifest.target.projectRef = "eomubndonbetszdbhsrj";
  manifest.release.deploymentId = "dpl_other_production_abcdefghijkl";
  manifest.independentReview.attestationSha256 = calculateProductionSecretsAttestation(manifest);
  const result = evaluate(manifest, env);
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(({ path }) => path === "target.projectRef"));
  assert.ok(result.blockers.some(({ path }) => path === "release.deploymentId"));
});

test("requires the Vercel production environment and exact release binding", () => {
  const env = validEnvironment();
  env.VERCEL_ENV = "preview";
  const manifest = validManifest(env);
  manifest.release.vercelEnvironment = "preview";
  manifest.release.commitSha = "2b".repeat(20);
  manifest.independentReview.attestationSha256 = calculateProductionSecretsAttestation(manifest);
  const result = evaluate(manifest, env);
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(({ path }) => path === "release.vercelEnvironment"));
  assert.ok(result.blockers.some(({ path }) => path === "release.commitSha"));
  assert.ok(result.blockers.some(({ path }) => path === "environment.VERCEL_ENV"));
});

test("role-confused Supabase credentials and a mismatched VAPID pair fail closed", () => {
  const env = validEnvironment();
  env.SUPABASE_SECRET_KEY = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const other = createECDH("prime256v1");
  other.generateKeys();
  env.VAPID_PRIVATE_KEY = other.getPrivateKey().toString("base64url");
  const result = evaluate(validManifest(env), env);
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(({ path }) => path === "environment.SUPABASE_SECRET_KEY"));
  assert.ok(result.blockers.some(({ path }) => path === "environment.VAPID_PRIVATE_KEY"));
});

test("legacy Supabase aliases cannot substitute for the required modern production secret", () => {
  const env = validEnvironment();
  delete env.SUPABASE_SECRET_KEY;
  env.SUPABASE_SERVICE_ROLE_KEY = "legacy-server-value-that-must-not-be-used";
  const result = evaluate(validManifest(env), env);
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(({ path }) => path === "environment.SUPABASE_SECRET_KEY"));
  assert.ok(result.blockers.some(({ path }) => path === "environment.SUPABASE_SERVICE_ROLE_KEY"));
  assert.doesNotMatch(JSON.stringify(result), /legacy-server-value/);
});

test("weak or reused worker and push secrets fail without exposing values", () => {
  const env = validEnvironment();
  env.EMAIL_WORKER_SECRET = "a".repeat(40);
  env.PUSH_API_SECRET = env.DURABLE_RATE_LIMIT_SECRET;
  const result = evaluate(validManifest(env), env);
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(({ path }) => path === "environment.EMAIL_WORKER_SECRET"));
  assert.ok(result.blockers.some(({ path, message }) => path === "environment" && /distinct/.test(message)));
  assert.doesNotMatch(JSON.stringify(result), new RegExp(env.DURABLE_RATE_LIMIT_SECRET.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("invalid Resend, sender, and Mux configuration is rejected by the composed provider gate", () => {
  const env = validEnvironment();
  env.RESEND_API_KEY = "wrong";
  env.EMAIL_FROM_ADDRESS = "not-a-mailbox";
  env.MUX_TOKEN_SECRET = "short";
  env.MUX_SIGNING_PRIVATE_KEY = "not-a-key";
  const result = evaluate(validManifest(env), env);
  assert.equal(result.ready, false);
  for (const name of ["RESEND_API_KEY", "EMAIL_FROM_ADDRESS", "MUX_TOKEN_SECRET", "MUX_SIGNING_PRIVATE_KEY"]) {
    assert.ok(result.blockers.some(({ path }) => path === `environment.${name}`), name);
  }
});

test("staging and security-test residue fails closed without printing its value", () => {
  const env = validEnvironment();
  env.STAGING_PROJECT_REF = "sensitive-staging-ref";
  env.SECURITY_TEST_MEMBER_PASSWORD = "sensitive-test-password";
  env.EMAIL_FROM_ADDRESS = "membership@jingwuguanseibukan-staging.vercel.app";
  const result = evaluate(validManifest(env), env);
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(({ path }) => path === "environment.STAGING_PROJECT_REF"));
  assert.ok(result.blockers.some(({ path }) => path === "environment.SECURITY_TEST_MEMBER_PASSWORD"));
  assert.ok(result.blockers.some(({ path }) => path === "environment.EMAIL_FROM_ADDRESS"));
  assert.doesNotMatch(JSON.stringify(result), /sensitive-staging-ref|sensitive-test-password/);
});

test("managed inventory requires exact production-only ownership and current rotation metadata", () => {
  const env = validEnvironment();
  const manifest = validManifest(env);
  manifest.managedVariables.pop();
  manifest.managedVariables[0].accessScope = "all-environments";
  manifest.managedVariables[0].stagingValueReused = true;
  manifest.managedVariables[0].rotatedAt = "2025-01-01T00:00:00.000Z";
  manifest.independentReview.attestationSha256 = calculateProductionSecretsAttestation(manifest);
  const result = evaluate(manifest, env);
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(({ path }) => path === "managedVariables"));
  assert.ok(result.blockers.some(({ path }) => path === "managedVariables[0].accessScope"));
  assert.ok(result.blockers.some(({ path }) => path === "managedVariables[0].stagingValueReused"));
  assert.ok(result.blockers.some(({ path }) => path === "managedVariables[0].rotatedAt"));
});

test("stale evidence, non-independent review, and a forged attestation fail closed", () => {
  const env = validEnvironment();
  const manifest = validManifest(env);
  manifest.configuration.validatedAt = "2026-09-20T00:00:00.000Z";
  manifest.independentReview.reviewerFingerprint = manifest.independentReview.operatorFingerprint;
  manifest.independentReview.attestationSha256 = "4d".repeat(32);
  const result = evaluate(manifest, env);
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(({ path }) => path === "configuration.validatedAt"));
  assert.ok(result.blockers.some(({ path }) => path === "independentReview.reviewerFingerprint"));
  assert.ok(result.blockers.some(({ path }) => path === "independentReview.attestationSha256"));
});

test("raw secret material and unsupported manifest fields are rejected without echoing them", () => {
  const env = validEnvironment();
  const manifest = validManifest(env);
  manifest.configuration.secret = "sb_secret_this_raw_value_must_never_be_echoed";
  manifest.independentReview.attestationSha256 = calculateProductionSecretsAttestation(manifest);
  const result = evaluate(manifest, env);
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(({ path }) => path === "configuration"));
  assert.ok(result.blockers.some(({ path, message }) => path === "manifest" && /raw secret/.test(message)));
  assert.doesNotMatch(JSON.stringify(result), /this_raw_value/);
});

test("the checked-in evidence template is valid JSON and intentionally fails closed", () => {
  const template = JSON.parse(readFileSync(new URL("../release/production-secrets-manifest.template.json", import.meta.url), "utf8"));
  const env = validEnvironment();
  const result = evaluate(template, env);
  assert.equal(result.ready, false);
  assert.ok(result.blockers.length > 5);
  assert.doesNotMatch(JSON.stringify(result), /sb_secret_|re_A1|Ew1!/);
});

test("the CLI fingerprints only the named protected env file, not ambient overrides", () => {
  const directory = mkdtempSync(join(tmpdir(), "production-secrets-readiness-"));
  const envPath = join(directory, "production.env");
  const fileEnv = { PRODUCTION_PROJECT_REF: "fileprojectref1234567" };
  writeFileSync(envPath, `PRODUCTION_PROJECT_REF=${fileEnv.PRODUCTION_PROJECT_REF}\n`, "utf8");
  try {
    const result = spawnSync(process.execPath, [
      fileURLToPath(new URL("./production-secrets-readiness.mjs", import.meta.url)),
      "--fingerprint-only",
      `--env-file=${envPath}`,
    ], {
      encoding: "utf8",
      env: { ...process.env, PRODUCTION_PROJECT_REF: "ambientoverride12345" },
    });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), {
      configFingerprintSha256: calculateProductionConfigurationFingerprint(fileEnv),
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
