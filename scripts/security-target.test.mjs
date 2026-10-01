import assert from "node:assert/strict";
import test from "node:test";
import { isAssessorAuthorizationDenied, isPermissionDenied, RETIRED_PROJECT_REF, RETIRED_SUPABASE_HOST, resolveSecurityCredential, validateSecurityTarget } from "./security-target.mjs";

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

test("retired project is always prohibited and future production is exact and read-only", () => {
  const retired = { ...staging, SECURITY_TEST_EXPECTED_HOST: RETIRED_SUPABASE_HOST, NEXT_PUBLIC_SUPABASE_URL: `https://${RETIRED_SUPABASE_HOST}` };
  assert.throws(() => validateSecurityTarget(retired), /retired/);
  assert.throws(() => validateSecurityTarget({ ...retired, SECURITY_TEST_ENVIRONMENT: "production-read-only", SECURITY_TEST_PRODUCTION_PROJECT_REF: RETIRED_PROJECT_REF }), /retired/);

  const production = {
    ...staging,
    SECURITY_TEST_ENVIRONMENT: "production-read-only",
    SECURITY_TEST_EXPECTED_HOST: "singapore123.supabase.co",
    SECURITY_TEST_PRODUCTION_PROJECT_REF: "singapore123",
    NEXT_PUBLIC_SUPABASE_URL: "https://singapore123.supabase.co",
  };
  assert.equal(validateSecurityTarget(production).allowMutationProbe, false);
  assert.throws(() => validateSecurityTarget({ ...production, SECURITY_TEST_PRODUCTION_PROJECT_REF: undefined }), /exact active production project/);
  assert.throws(() => validateSecurityTarget({ ...production, SECURITY_TEST_PRODUCTION_PROJECT_REF: "other" }), /exact hosted project origin/);
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
