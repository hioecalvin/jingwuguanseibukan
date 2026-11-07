import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { after } from "node:test";

import {
  REQUIRED_CLEANUP_SCOPES,
  authEmailReviewToken,
  evaluateStagingAuthEmailReadiness,
  runCli,
} from "./staging-auth-email-readiness.mjs";

const evidenceDirectory = mkdtempSync(join(tmpdir(), "jwg-auth-email-evidence-"));
const catalogFile = join(evidenceDirectory, "catalog.json");
const cleanupFile = join(evidenceDirectory, "cleanup-plan.json");
const catalogContents = '{"projectRef":"eomubndonbetszdbhsrj","kind":"catalog"}\n';
const cleanupContents = '{"projectRef":"eomubndonbetszdbhsrj","kind":"cleanup-plan"}\n';
writeFileSync(catalogFile, catalogContents, "utf8");
writeFileSync(cleanupFile, cleanupContents, "utf8");
const sha256 = (contents) => createHash("sha256").update(contents).digest("hex");

after(() => {
  if (existsSync(evidenceDirectory)) rmSync(evidenceDirectory, { recursive: true });
});

function validEnvironment({ includeReviewToken = true } = {}) {
  const environment = {
    NEXT_PUBLIC_SITE_URL: "https://jingwuguanseibukan-staging.vercel.app",
    STAGING_PROJECT_REF: "eomubndonbetszdbhsrj",
    NEXT_PUBLIC_SUPABASE_URL: "https://eomubndonbetszdbhsrj.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_acceptance_value",
    SUPABASE_SECRET_KEY: "sb_secret_acceptance_value",
    STAGING_AUTH_ACCEPTANCE_INBOX: "auth-acceptance@acceptance.jingwuguanseibukan.com",
    STAGING_AUTH_ACCEPTANCE_INBOX_CONFIRMATION: "auth-acceptance@acceptance.jingwuguanseibukan.com",
    EMAIL_FROM_ADDRESS: "membership@jingwuguanseibukan.com",
    RESEND_API_KEY: "re_staging_auth_acceptance_1234567890",
    EMAIL_WORKER_SECRET: "worker-secret-1234567890-abcdefghijklmnop",
    SECURITY_TEST_MEMBER_EMAIL: "0101@dummy.jingwuguan.test",
    SECURITY_TEST_MEMBER_PASSWORD: "Protected-Member-Secret-2026!",
    SECURITY_TEST_ADMIN_EMAIL: "0002@dummy.jingwuguan.test",
    SECURITY_TEST_ADMIN_PASSWORD: "Protected-Admin-Secret-2026!",
    SECURITY_TEST_SUPER_EMAIL: "0001@dummy.jingwuguan.test",
    SECURITY_TEST_SUPER_PASSWORD: "Protected-Super-Secret-2026!",
    STAGING_AUTH_ACCEPTANCE_RUN_ID: "JWG-AUTH-20261001-A1B2C3D4E5F6",
    STAGING_AUTH_ACCEPTANCE_CLASS_ID: "10000000-0000-4000-8000-000000000001",
    STAGING_AUTH_ACCEPTANCE_DOJO_ID: "20000000-0000-4000-8000-000000000002",
    STAGING_AUTH_ACCEPTANCE_REGISTRATION_PASSWORD: "Signup-Secret-2026!",
    STAGING_AUTH_ACCEPTANCE_REPLACEMENT_PASSWORD: "Replace-Secret-2026!",
    STAGING_AUTH_ACCEPTANCE_CATALOG_FILE: catalogFile,
    STAGING_AUTH_ACCEPTANCE_CATALOG_SHA256: sha256(catalogContents),
    STAGING_AUTH_ACCEPTANCE_CLEANUP_PLAN_FILE: cleanupFile,
    STAGING_AUTH_ACCEPTANCE_CLEANUP_SHA256: sha256(cleanupContents),
    STAGING_AUTH_ACCEPTANCE_CLEANUP_SCOPES: REQUIRED_CLEANUP_SCOPES.join(","),
  };
  if (includeReviewToken) {
    environment.STAGING_AUTH_ACCEPTANCE_REVIEW_TOKEN = authEmailReviewToken({
      runId: environment.STAGING_AUTH_ACCEPTANCE_RUN_ID,
      inbox: environment.STAGING_AUTH_ACCEPTANCE_INBOX,
      classId: environment.STAGING_AUTH_ACCEPTANCE_CLASS_ID,
      dojoId: environment.STAGING_AUTH_ACCEPTANCE_DOJO_ID,
      catalogSha256: environment.STAGING_AUTH_ACCEPTANCE_CATALOG_SHA256,
      cleanupSha256: environment.STAGING_AUTH_ACCEPTANCE_CLEANUP_SHA256,
      scopes: [...REQUIRED_CLEANUP_SCOPES].sort(),
      reviewSecret: environment.EMAIL_WORKER_SECRET,
    });
  }
  return environment;
}

test("a reviewed exact-target staging acceptance configuration passes without exposing secrets or inbox", () => {
  const environment = validEnvironment();
  const result = evaluateStagingAuthEmailReadiness(environment);
  assert.equal(result.ready, true);
  assert.deepEqual(result.blockers, []);
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /Signup-Secret|Replace-Secret|auth-acceptance@/);
  assert.equal(result.target.projectRef, "eomubndonbetszdbhsrj");
});

test("the first offline pass issues a stable review token but is not ready to mutate", () => {
  const environment = validEnvironment({ includeReviewToken: false });
  const first = evaluateStagingAuthEmailReadiness(environment);
  const second = evaluateStagingAuthEmailReadiness(environment);
  assert.equal(first.ready, false);
  assert.match(first.reviewToken, /^[A-F0-9]{24}$/);
  assert.equal(first.reviewToken, second.reviewToken);
  assert.ok(first.blockers.some(({ path }) => path === "STAGING_AUTH_ACCEPTANCE_REVIEW_TOKEN"));
});

test("production, retired, alternate preview, and path-bearing targets fail closed", () => {
  const mutations = [
    ["NEXT_PUBLIC_SITE_URL", "https://jingwuguanseibukan.com"],
    ["NEXT_PUBLIC_SITE_URL", "https://jingwuguanseibukan-staging.vercel.app/login"],
    ["NEXT_PUBLIC_SUPABASE_URL", "https://pkmllhaavadhaozmwapz.supabase.co"],
    ["STAGING_PROJECT_REF", "pkmllhaavadhaozmwapz"],
  ];
  for (const [name, current] of mutations) {
    const result = evaluateStagingAuthEmailReadiness({ ...validEnvironment(), [name]: current });
    assert.equal(result.ready, false, `${name}=${current}`);
    assert.ok(result.blockers.some(({ path }) => path === name), name);
  }
});

test("the dedicated inbox must be deliverable, repeated, and isolated from role and sender accounts", () => {
  const cases = [
    { STAGING_AUTH_ACCEPTANCE_INBOX: "not-an-email" },
    { STAGING_AUTH_ACCEPTANCE_INBOX: "acceptance@dummy.jingwuguan.test", STAGING_AUTH_ACCEPTANCE_INBOX_CONFIRMATION: "acceptance@dummy.jingwuguan.test" },
    { STAGING_AUTH_ACCEPTANCE_INBOX: "acceptance@example.org", STAGING_AUTH_ACCEPTANCE_INBOX_CONFIRMATION: "acceptance@example.org" },
    { STAGING_AUTH_ACCEPTANCE_INBOX_CONFIRMATION: "different@acceptance.jingwuguanseibukan.com" },
    { STAGING_AUTH_ACCEPTANCE_INBOX: "0101@dummy.jingwuguan.test", STAGING_AUTH_ACCEPTANCE_INBOX_CONFIRMATION: "0101@dummy.jingwuguan.test" },
    { STAGING_AUTH_ACCEPTANCE_INBOX: "membership@jingwuguanseibukan.com", STAGING_AUTH_ACCEPTANCE_INBOX_CONFIRMATION: "membership@jingwuguanseibukan.com" },
  ];
  for (const changes of cases) {
    const result = evaluateStagingAuthEmailReadiness({ ...validEnvironment(), ...changes });
    assert.equal(result.ready, false);
    assert.ok(result.blockers.some(({ path }) => path === "STAGING_AUTH_ACCEPTANCE_INBOX" || path === "STAGING_AUTH_ACCEPTANCE_INBOX_CONFIRMATION"));
  }
});

test("credentials must be strong, distinct, server-side, and non-placeholder", () => {
  const weak = evaluateStagingAuthEmailReadiness({
    ...validEnvironment(),
    SUPABASE_SECRET_KEY: "sb_publishable_acceptance_value",
    STAGING_AUTH_ACCEPTANCE_REGISTRATION_PASSWORD: "change-me",
    STAGING_AUTH_ACCEPTANCE_REPLACEMENT_PASSWORD: "change-me",
  });
  assert.equal(weak.ready, false);
  assert.ok(weak.blockers.some(({ path }) => path === "SUPABASE_SECRET_KEY"));
  assert.ok(weak.blockers.some(({ path }) => path === "STAGING_AUTH_ACCEPTANCE_REGISTRATION_PASSWORD"));
  assert.ok(weak.blockers.some(({ path }) => path === "STAGING_AUTH_ACCEPTANCE_REPLACEMENT_PASSWORD"));
});

test("catalog, cleanup digest, isolated UUIDs, and minimum residue scopes are mandatory", () => {
  const environment = validEnvironment();
  environment.STAGING_AUTH_ACCEPTANCE_CATALOG_SHA256 = "0".repeat(64);
  environment.STAGING_AUTH_ACCEPTANCE_CLEANUP_SHA256 = "short";
  environment.STAGING_AUTH_ACCEPTANCE_CLASS_ID = "not-a-uuid";
  environment.STAGING_AUTH_ACCEPTANCE_DOJO_ID = "not-a-uuid";
  environment.STAGING_AUTH_ACCEPTANCE_CLEANUP_SCOPES = "auth.users,public.profiles";
  const result = evaluateStagingAuthEmailReadiness(environment);
  assert.equal(result.ready, false);
  for (const name of [
    "STAGING_AUTH_ACCEPTANCE_CATALOG_SHA256",
    "STAGING_AUTH_ACCEPTANCE_CLEANUP_SHA256",
    "STAGING_AUTH_ACCEPTANCE_CLASS_ID",
    "STAGING_AUTH_ACCEPTANCE_DOJO_ID",
    "STAGING_AUTH_ACCEPTANCE_CLEANUP_SCOPES",
  ]) assert.ok(result.blockers.some(({ path }) => path === name), name);
});

test("catalog and cleanup digests must bind distinct protected evidence files", () => {
  const mismatch = evaluateStagingAuthEmailReadiness({
    ...validEnvironment(),
    STAGING_AUTH_ACCEPTANCE_CATALOG_SHA256: "a".repeat(64),
  });
  assert.equal(mismatch.ready, false);
  assert.equal(mismatch.reviewToken, null);
  assert.ok(mismatch.blockers.some(({ path, message }) =>
    path === "STAGING_AUTH_ACCEPTANCE_CATALOG_SHA256" && /exact file/.test(message)));

  const missing = evaluateStagingAuthEmailReadiness({
    ...validEnvironment(),
    STAGING_AUTH_ACCEPTANCE_CLEANUP_PLAN_FILE: join(evidenceDirectory, "missing.json"),
  });
  assert.equal(missing.ready, false);
  assert.equal(missing.reviewToken, null);
  assert.ok(missing.blockers.some(({ path }) =>
    path === "STAGING_AUTH_ACCEPTANCE_CLEANUP_PLAN_FILE"));

  const inRepository = evaluateStagingAuthEmailReadiness({
    ...validEnvironment(),
    STAGING_AUTH_ACCEPTANCE_CATALOG_FILE: resolve("package.json"),
  });
  assert.equal(inRepository.ready, false);
  assert.ok(inRepository.blockers.some(({ path, message }) =>
    path === "STAGING_AUTH_ACCEPTANCE_CATALOG_FILE" && /outside/.test(message)));

  const sameFile = evaluateStagingAuthEmailReadiness({
    ...validEnvironment(),
    STAGING_AUTH_ACCEPTANCE_CLEANUP_PLAN_FILE: catalogFile,
    STAGING_AUTH_ACCEPTANCE_CLEANUP_SHA256: sha256(catalogContents),
  });
  assert.equal(sameFile.ready, false);
  assert.equal(sameFile.reviewToken, null);
  assert.ok(sameFile.blockers.some(({ path, message }) =>
    path === "STAGING_AUTH_ACCEPTANCE_CLEANUP_PLAN_FILE" && /distinct/.test(message)));

  const otherwiseInvalid = evaluateStagingAuthEmailReadiness({
    ...validEnvironment({ includeReviewToken: false }),
    EMAIL_WORKER_SECRET: "short",
  });
  assert.equal(otherwiseInvalid.ready, false);
  assert.equal(otherwiseInvalid.reviewToken, null);
});

test("changing any reviewed non-secret scope invalidates the review token", () => {
  const environment = validEnvironment();
  environment.STAGING_AUTH_ACCEPTANCE_DOJO_ID = "30000000-0000-4000-8000-000000000003";
  const result = evaluateStagingAuthEmailReadiness(environment);
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(({ path }) => path === "STAGING_AUTH_ACCEPTANCE_REVIEW_TOKEN"));
});

test("CLI refuses missing acknowledgement and missing protected files without network access", () => {
  assert.equal(runCli([], {}), 2);
  assert.equal(runCli(["--confirm-offline-preflight", "--env-file=Z:\\missing\\auth.env"], {}), 2);
});
