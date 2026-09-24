import assert from "node:assert/strict";
import { createECDH, randomBytes } from "node:crypto";
import test from "node:test";

import { evaluateProviderConfiguration } from "./provider-config-readiness.mjs";

function validEnvironment() {
  const ecdh = createECDH("prime256v1");
  ecdh.setPrivateKey(randomBytes(32));
  return {
    NEXT_PUBLIC_SITE_URL: "https://staging.example.org/",
    NEXT_PUBLIC_SUPABASE_URL: "https://staging-ref.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_unit_value",
    SUPABASE_SECRET_KEY: "sb_secret_server_value",
    RESEND_API_KEY: "re_123456789012345678901234567890",
    EMAIL_FROM_ADDRESS: "membership@staging.example.org",
    EMAIL_FROM_NAME: "Jingwuguan Seibukan",
    EMAIL_WORKER_SECRET: "worker-1234567890-abcdefghijklmnopqrstuvwxyz",
    DURABLE_RATE_LIMIT_SECRET: "rate-limit-1234567890-abcdefghijklmnop",
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: ecdh.getPublicKey().toString("base64url"),
    VAPID_PRIVATE_KEY: ecdh.getPrivateKey().toString("base64url"),
    VAPID_SUBJECT: "mailto:admin@example.org",
    PUSH_API_SECRET: "push-123456789012-abcdefghijklmnopqrstuvwxyz",
  };
}

const options = {
  environment: "staging",
  expectedOrigin: "https://staging.example.org",
  expectedSupabaseHost: "staging-ref.supabase.co",
};

test("a coherent staging provider configuration passes without revealing values", () => {
  const result = evaluateProviderConfiguration(validEnvironment(), options);
  assert.equal(result.ready, true);
  assert.deepEqual(result.blockers, []);
  assert.equal(result.warnings.length, 1);
  assert.doesNotMatch(JSON.stringify(result), /worker-123|sb_secret/);
});

test("missing configuration and the wrong Supabase target fail closed", () => {
  const env = validEnvironment();
  delete env.RESEND_API_KEY;
  delete env.DURABLE_RATE_LIMIT_SECRET;
  env.NEXT_PUBLIC_SUPABASE_URL = "https://production-ref.supabase.co";
  const result = evaluateProviderConfiguration(env, options);
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(({ path }) => path === "RESEND_API_KEY"));
  assert.ok(result.blockers.some(({ path }) => path === "DURABLE_RATE_LIMIT_SECRET"));
  assert.ok(result.blockers.some(({ path }) => path === "NEXT_PUBLIC_SUPABASE_URL"));
});

test("the expected origin must match the normalized configured site URL", () => {
  const env = validEnvironment();
  env.NEXT_PUBLIC_SITE_URL = "https://different-staging.example.org";
  const result = evaluateProviderConfiguration(env, options);
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(({ path, message }) =>
    path === "NEXT_PUBLIC_SITE_URL" && message.includes("does not match --expected-origin")
  ));
});

test("the configured site URL must be an exact secure origin", () => {
  const env = validEnvironment();
  env.NEXT_PUBLIC_SITE_URL = "https://staging.example.org/app?preview=true";
  const result = evaluateProviderConfiguration(env, options);
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(({ path, message }) =>
    path === "NEXT_PUBLIC_SITE_URL" && message.includes("exact HTTPS origin")
  ));
});

test("a mismatched VAPID pair and reused secrets fail closed", () => {
  const env = validEnvironment();
  const other = createECDH("prime256v1");
  other.generateKeys();
  env.VAPID_PRIVATE_KEY = other.getPrivateKey().toString("base64url");
  env.PUSH_API_SECRET = env.EMAIL_WORKER_SECRET;
  const result = evaluateProviderConfiguration(env, options);
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(({ path, message }) => path === "VAPID_PRIVATE_KEY" && message.includes("does not match")));
  assert.ok(result.blockers.some(({ path, message }) => path === "PUSH_API_SECRET" && message.includes("distinct")));
});

test("server credentials exposed through NEXT_PUBLIC names fail closed", () => {
  const env = validEnvironment();
  env.NEXT_PUBLIC_RESEND_API_KEY = "re_should-never-be-public";
  const result = evaluateProviderConfiguration(env, options);
  assert.equal(result.ready, false);
  assert.ok(result.blockers.some(({ path }) => path === "NEXT_PUBLIC_RESEND_API_KEY"));
});
