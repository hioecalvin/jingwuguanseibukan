import assert from "node:assert/strict";
import test from "node:test";

import {
  STAGING_APP_ORIGIN,
  STAGING_BROWSER_CONFIRMATION,
  STAGING_BROWSER_MODE,
  STAGING_PROJECT_REF,
  STAGING_SUPABASE_ORIGIN,
  assertStagingBrowserRuntime,
  classifyStagingBrowserRequest,
  parseExactStagingOrigin,
  stagingBrowserEnvironment,
  validateStagingBrowserInvocation,
} from "./staging-browser-target.mjs";

function protectedEnvironment(overrides = {}) {
  return {
    PATH: "node-path",
    SystemRoot: "system-root",
    NEXT_PUBLIC_SITE_URL: STAGING_APP_ORIGIN,
    STAGING_PROJECT_REF,
    NEXT_PUBLIC_SUPABASE_URL: STAGING_SUPABASE_ORIGIN,
    SECURITY_TEST_MEMBER_EMAIL: "0101@dummy.jingwuguan.test",
    SECURITY_TEST_MEMBER_PASSWORD: "member-secret",
    SECURITY_TEST_ADMIN_EMAIL: "0002@dummy.jingwuguan.test",
    SECURITY_TEST_ADMIN_PASSWORD: "admin-secret",
    SECURITY_TEST_SUPER_EMAIL: "0001@dummy.jingwuguan.test",
    SECURITY_TEST_SUPER_PASSWORD: "super-secret",
    ...overrides,
  };
}

test("the deployed browser target is the exact HTTPS staging origin", () => {
  assert.equal(parseExactStagingOrigin(STAGING_APP_ORIGIN), STAGING_APP_ORIGIN);
  for (const target of [
    "http://jingwuguanseibukan-staging.vercel.app",
    "https://jingwuguanseibukan-staging.vercel.app.evil.invalid",
    "https://jingwuguanseibukan-staging.vercel.app/path",
    "https://jingwuguanseibukan-staging.vercel.app?preview=true",
    "https://jingwuguanseibukan.com",
  ]) assert.throws(() => parseExactStagingOrigin(target), /Refusing/);
});

test("invocation requires only the explicit confirmation and approved protected identities", () => {
  const environment = protectedEnvironment();
  assert.doesNotThrow(() => validateStagingBrowserInvocation([STAGING_BROWSER_CONFIRMATION], environment));
  for (const argv of [[], ["--confirm-production"], [STAGING_BROWSER_CONFIRMATION, "--project=webkit"]]) {
    assert.throws(() => validateStagingBrowserInvocation(argv, environment), /exact --confirm-staging/);
  }
  assert.throws(() => validateStagingBrowserInvocation([STAGING_BROWSER_CONFIRMATION], protectedEnvironment({ NEXT_PUBLIC_SITE_URL: "https://jingwuguanseibukan.com" })), /Refusing/);
  assert.throws(() => validateStagingBrowserInvocation([STAGING_BROWSER_CONFIRMATION], protectedEnvironment({ NEXT_PUBLIC_SUPABASE_URL: "https://pkmllhaavadhaozmwapz.supabase.co" })), /approved staging backend/);
  assert.throws(() => validateStagingBrowserInvocation([STAGING_BROWSER_CONFIRMATION], protectedEnvironment({ SECURITY_TEST_ADMIN_EMAIL: "other@example.test" })), /approved staging-only account/);
  assert.throws(() => validateStagingBrowserInvocation([STAGING_BROWSER_CONFIRMATION], protectedEnvironment({ SECURITY_TEST_SUPER_PASSWORD: "" })), /SECURITY_TEST_SUPER_PASSWORD/);
});

test("child environment keeps only runtime necessities and protected browser credentials", () => {
  const child = stagingBrowserEnvironment(protectedEnvironment({
    NODE_OPTIONS: "--require malicious",
    HTTPS_PROXY: "https://proxy.invalid",
    SUPABASE_SECRET_KEY: "server-secret",
    RESEND_API_KEY: "provider-secret",
  }));
  assert.equal(child.PATH, "node-path");
  assert.equal(child.STAGING_BROWSER_MODE, STAGING_BROWSER_MODE);
  assert.equal(child.NEXT_PUBLIC_SITE_URL, STAGING_APP_ORIGIN);
  assert.equal(child.NODE_OPTIONS, undefined);
  assert.equal(child.HTTPS_PROXY, undefined);
  assert.equal(child.SUPABASE_SECRET_KEY, undefined);
  assert.equal(child.RESEND_API_KEY, undefined);
  assert.doesNotThrow(() => assertStagingBrowserRuntime(child));
  assert.throws(() => assertStagingBrowserRuntime({ ...child, STAGING_BROWSER_MODE: "" }), /unconfirmed/);
});

test("request guard allows reads and ephemeral auth but rejects writes and unknown origins", () => {
  const cases = [
    ["GET", `${STAGING_APP_ORIGIN}/register`, true],
    ["GET", `${STAGING_SUPABASE_ORIGIN}/rest/v1/profiles?select=id`, true],
    ["POST", `${STAGING_SUPABASE_ORIGIN}/auth/v1/token?grant_type=password`, true],
    ["POST", `${STAGING_SUPABASE_ORIGIN}/auth/v1/token?grant_type=refresh_token`, true],
    ["POST", `${STAGING_SUPABASE_ORIGIN}/auth/v1/logout?scope=local`, true],
    ["POST", `${STAGING_SUPABASE_ORIGIN}/rest/v1/rpc/get_my_last_training_sessions`, true],
    ["POST", `${STAGING_SUPABASE_ORIGIN}/rest/v1/rpc/get_my_available_class_enrollments`, true],
    ["POST", `${STAGING_SUPABASE_ORIGIN}/rest/v1/rpc/get_my_class_enrollment_requests`, true],
    ["POST", `${STAGING_APP_ORIGIN}/api/subscribe`, false],
    ["POST", `${STAGING_SUPABASE_ORIGIN}/rest/v1/profiles`, false],
    ["PATCH", `${STAGING_SUPABASE_ORIGIN}/rest/v1/profiles?id=eq.1`, false],
    ["POST", `${STAGING_SUPABASE_ORIGIN}/rest/v1/rpc/get_or_create_title_certificate`, false],
    ["POST", `${STAGING_SUPABASE_ORIGIN}/rest/v1/rpc/promote_membership`, false],
    ["POST", `${STAGING_SUPABASE_ORIGIN}/auth/v1/signup`, false],
    ["GET", "https://jingwuguanseibukan.com/", false],
  ];
  for (const [method, url, expected] of cases) {
    assert.equal(classifyStagingBrowserRequest(method, url).allowed, expected, `${method} ${url}`);
  }
});
