import assert from "node:assert/strict";
import test from "node:test";
import { isAssessorAuthorizationDenied, isPermissionDenied, PRODUCTION_SUPABASE_HOST, resolveSecurityCredential, validateSecurityTarget } from "./security-target.mjs";

const staging = {
  SECURITY_TEST_ENVIRONMENT: "staging",
  SECURITY_TEST_EXPECTED_HOST: "test-project.supabase.co",
  NEXT_PUBLIC_SUPABASE_URL: "https://test-project.supabase.co",
};

test("security runner requires an explicit mode and exact target", () => {
  assert.throws(() => validateSecurityTarget({ ...staging, SECURITY_TEST_ENVIRONMENT: undefined }));
  assert.throws(() => validateSecurityTarget({ ...staging, SECURITY_TEST_EXPECTED_HOST: undefined }));
  assert.throws(() => validateSecurityTarget({ ...staging, SECURITY_TEST_EXPECTED_HOST: "other.supabase.co" }));
  assert.equal(validateSecurityTarget(staging).allowMutationProbe, true);
});

test("known production cannot be declared staging and has no mutation probe", () => {
  const production = { ...staging, SECURITY_TEST_EXPECTED_HOST: PRODUCTION_SUPABASE_HOST, NEXT_PUBLIC_SUPABASE_URL: `https://${PRODUCTION_SUPABASE_HOST}` };
  assert.throws(() => validateSecurityTarget(production), /cannot be used/);
  assert.equal(validateSecurityTarget({ ...production, SECURITY_TEST_ENVIRONMENT: "production-read-only" }).allowMutationProbe, false);
});

test("target URLs reject embedded credentials, remote HTTP, and paths", () => {
  for (const url of ["https://user:password@test-project.supabase.co", "http://test-project.supabase.co", "https://test-project.supabase.co/rest/v1", "https://test-project.supabase.co?key=secret", "not-a-url"]) {
    assert.throws(() => validateSecurityTarget({ ...staging, NEXT_PUBLIC_SUPABASE_URL: url }));
  }
  assert.equal(validateSecurityTarget({ ...staging, NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321", SECURITY_TEST_EXPECTED_HOST: "127.0.0.1:54321" }).allowMutationProbe, true);
});

test("security credentials require one complete and unambiguous mode", () => {
  assert.deepEqual(resolveSecurityCredential({
    SECURITY_TEST_MEMBER_ACCESS_TOKEN: "access",
    SECURITY_TEST_MEMBER_REFRESH_TOKEN: "refresh",
  }, "MEMBER"), {
    mode: "session",
    accessToken: "access",
    refreshToken: "refresh",
  });
  assert.deepEqual(resolveSecurityCredential({
    SECURITY_TEST_ADMIN_EMAIL: "admin@example.test",
    SECURITY_TEST_ADMIN_PASSWORD: "password",
  }, "ADMIN"), {
    mode: "password",
    email: "admin@example.test",
    password: "password",
  });
  assert.throws(() => resolveSecurityCredential({}, "SUPER"), /either/);
  assert.throws(() => resolveSecurityCredential({ SECURITY_TEST_MEMBER_ACCESS_TOKEN: "access" }, "MEMBER"), /both/);
  assert.throws(() => resolveSecurityCredential({
    SECURITY_TEST_MEMBER_ACCESS_TOKEN: "access",
    SECURITY_TEST_MEMBER_REFRESH_TOKEN: "refresh",
    SECURITY_TEST_MEMBER_EMAIL: "member@example.test",
    SECURITY_TEST_MEMBER_PASSWORD: "password",
  }, "MEMBER"), /either/);
});

test("only database permission failures count as read denials", () => {
  assert.equal(isPermissionDenied({ code: "42501" }), true);
  for (const error of [null, { code: "PGRST202" }, { code: "42P01" }, { message: "fetch failed" }, { code: "P0001" }]) {
    assert.equal(isPermissionDenied(error), false);
  }
});

test("mutation denial cannot pass because a random member is missing", () => {
  assert.equal(isAssessorAuthorizationDenied({ code: "P0001", message: "Only Super Admin can manage grading assessors" }), true);
  assert.equal(isAssessorAuthorizationDenied({ code: "P0001", message: "Member not found" }), false);
  assert.equal(isAssessorAuthorizationDenied({ code: "P0001", message: "Not authenticated" }), false);
});
