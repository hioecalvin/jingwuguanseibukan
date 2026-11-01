import { createECDH, createPrivateKey, timingSafeEqual } from "node:crypto";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { pathToFileURL } from "node:url";

const SERVER_ONLY_NAMES = Object.freeze([
  "SUPABASE_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "RESEND_API_KEY",
  "EMAIL_WORKER_SECRET",
  "VAPID_PRIVATE_KEY",
  "PUSH_API_SECRET",
  "DURABLE_RATE_LIMIT_SECRET",
  "MUX_TOKEN_ID",
  "MUX_TOKEN_SECRET",
  "MUX_SIGNING_KEY_ID",
  "MUX_SIGNING_PRIVATE_KEY",
]);

const PLACEHOLDER = /(?:change[-_ ]?me|example|dummy|fixture|local[-_ ]?only|test[-_ ]?only|unit[-_ ]?only)/i;
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const PROJECT_REF = /^[a-z0-9]{20}$/;
const MODERN_PUBLISHABLE_KEY = /^sb_publishable_[A-Za-z0-9_-]{20,}$/;
const MODERN_SECRET_KEY = /^sb_secret_[A-Za-z0-9_-]{20,}$/;
const PRODUCTION_FORBIDDEN_NAMES = Object.freeze([
  "CONFIRM_STAGING",
  "DUMMY_ACCOUNT_PASSWORD",
  "STAGING_DB_URL",
  "STAGING_PROJECT_REF",
]);

function add(items, path, message) {
  items.push({ path, message });
}

function value(env, name) {
  return typeof env[name] === "string" ? env[name].trim() : "";
}

function requireValue(blockers, env, name) {
  const current = value(env, name);
  if (!current) add(blockers, name, "is required");
  return current;
}

function parseExactOrigin(raw, { allowLoopbackHttp = false } = {}) {
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }

  const loopback = parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost" || parsed.hostname === "[::1]";
  if (parsed.protocol !== "https:" && !(allowLoopbackHttp && loopback && parsed.protocol === "http:")) return null;
  if (parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) return null;
  return parsed.origin;
}

function decodeBase64Url(input) {
  if (!/^[A-Za-z0-9_-]+$/.test(input)) throw new Error("invalid base64url");
  return Buffer.from(input, "base64url");
}

function jwtClaims(value) {
  const segments = value.split(".");
  if (segments.length !== 3 || segments.some((segment) => !/^[A-Za-z0-9_-]+$/.test(segment))) {
    return null;
  }
  try {
    const header = JSON.parse(Buffer.from(segments[0], "base64url").toString("utf8"));
    const claims = JSON.parse(Buffer.from(segments[1], "base64url").toString("utf8"));
    const signature = Buffer.from(segments[2], "base64url");
    if (header?.alg !== "HS256" || header?.typ !== "JWT" || signature.length !== 32) return null;
    return claims && typeof claims === "object" && !Array.isArray(claims) ? claims : null;
  } catch {
    return null;
  }
}

function validLegacySupabaseJwt(current, expectedRole, expectedRef) {
  const claims = jwtClaims(current);
  return claims?.role === expectedRole && claims?.ref === expectedRef;
}

function validateProductionSupabaseCredentials(blockers, env, {
  projectRef,
  publishableKey,
  supabaseSecret,
}) {
  if (!PROJECT_REF.test(projectRef)) {
    add(blockers, "PRODUCTION_PROJECT_REF", "must be the exact 20-character production project reference");
    return;
  }

  const legacyAnon = value(env, "NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const legacyServiceRole = value(env, "SUPABASE_SERVICE_ROLE_KEY");
  if (publishableKey && legacyAnon) {
    add(blockers, "NEXT_PUBLIC_SUPABASE_ANON_KEY", "must be removed when NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is configured for production");
  }
  if (value(env, "SUPABASE_SECRET_KEY") && legacyServiceRole) {
    add(blockers, "SUPABASE_SERVICE_ROLE_KEY", "must be removed when SUPABASE_SECRET_KEY is configured for production");
  }

  if (publishableKey && !MODERN_PUBLISHABLE_KEY.test(publishableKey) &&
      !validLegacySupabaseJwt(publishableKey, "anon", projectRef)) {
    add(blockers, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "must be a modern publishable key or an anon JWT bound to PRODUCTION_PROJECT_REF");
  }
  if (publishableKey && PLACEHOLDER.test(publishableKey)) {
    add(blockers, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "must not be a placeholder or test credential");
  }
  if (supabaseSecret && !MODERN_SECRET_KEY.test(supabaseSecret) &&
      !validLegacySupabaseJwt(supabaseSecret, "service_role", projectRef)) {
    add(blockers, "SUPABASE_SECRET_KEY", "must be a modern secret key or a service_role JWT bound to PRODUCTION_PROJECT_REF");
  }
  if (supabaseSecret && PLACEHOLDER.test(supabaseSecret)) {
    add(blockers, "SUPABASE_SECRET_KEY", "must not be a placeholder or test credential");
  }
}

function validateProductionIsolation(blockers, env) {
  for (const name of [...SERVER_ONLY_NAMES, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]) {
    const raw = typeof env[name] === "string" ? env[name] : "";
    if (/[\u0000-\u001f\u007f]/.test(raw)) {
      add(blockers, name, "must not contain control characters");
    }
  }
  for (const name of PRODUCTION_FORBIDDEN_NAMES) {
    if (value(env, name)) add(blockers, name, "must not be present in a production deployment environment");
  }
  for (const name of Object.keys(env)) {
    if (name.startsWith("SECURITY_TEST_") && value(env, name)) {
      add(blockers, name, "test-account credentials must not be present in a production deployment environment");
    }
  }
  const vercelEnvironment = value(env, "VERCEL_ENV");
  if (vercelEnvironment && vercelEnvironment !== "production") {
    add(blockers, "VERCEL_ENV", "must equal production when supplied to the production configuration gate");
  }
}

export function evaluateProviderConfiguration(env, options = {}) {
  const blockers = [];
  const warnings = [];
  const environment = options.environment;
  const allowLoopbackHttp = environment === "local";

  if (!["local", "staging", "production"].includes(environment)) {
    add(blockers, "environment", "must be local, staging, or production");
  }

  const expectedOrigin = parseExactOrigin(options.expectedOrigin ?? "", { allowLoopbackHttp });
  if (!expectedOrigin) add(blockers, "expectedOrigin", "must be an exact HTTPS origin (HTTP is allowed only for loopback local use)");

  const siteUrl = requireValue(blockers, env, "NEXT_PUBLIC_SITE_URL");
  const configuredOrigin = parseExactOrigin(siteUrl, { allowLoopbackHttp });
  if (siteUrl && !configuredOrigin) {
    add(blockers, "NEXT_PUBLIC_SITE_URL", "must be an exact HTTPS origin (HTTP is allowed only for loopback local use)");
  }
  if (expectedOrigin && configuredOrigin && expectedOrigin !== configuredOrigin) {
    add(blockers, "NEXT_PUBLIC_SITE_URL", "normalized origin does not match --expected-origin");
  }

  const supabaseUrl = requireValue(blockers, env, "NEXT_PUBLIC_SUPABASE_URL");
  const publishableKey = requireValue(blockers, env, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  const supabaseSecret = value(env, "SUPABASE_SECRET_KEY") || value(env, "SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseSecret) add(blockers, "SUPABASE_SECRET_KEY", "or SUPABASE_SERVICE_ROLE_KEY is required");
  if (publishableKey && supabaseSecret && publishableKey === supabaseSecret) {
    add(blockers, "SUPABASE_SECRET_KEY", "must not equal the browser publishable key");
  }

  let parsedSupabase;
  try {
    parsedSupabase = new URL(supabaseUrl);
  } catch {
    parsedSupabase = null;
  }
  if (!parsedSupabase || (parsedSupabase.protocol !== "https:" && !(allowLoopbackHttp && ["localhost", "127.0.0.1", "[::1]"].includes(parsedSupabase.hostname)))) {
    add(blockers, "NEXT_PUBLIC_SUPABASE_URL", "must be an HTTPS URL (HTTP is allowed only for loopback local use)");
  }
  if (options.expectedSupabaseHost) {
    if (parsedSupabase?.host !== options.expectedSupabaseHost) {
      add(blockers, "NEXT_PUBLIC_SUPABASE_URL", "host does not match --expected-supabase-host");
    }
  } else if (environment !== "local") {
    add(blockers, "expectedSupabaseHost", "is required outside local development");
  }

  if (environment === "production") {
    const projectRef = value(env, "PRODUCTION_PROJECT_REF");
    validateProductionSupabaseCredentials(blockers, env, {
      projectRef,
      publishableKey,
      supabaseSecret,
    });
    if (PROJECT_REF.test(projectRef) && parsedSupabase?.hostname !== `${projectRef}.supabase.co`) {
      add(blockers, "NEXT_PUBLIC_SUPABASE_URL", "must match PRODUCTION_PROJECT_REF exactly");
    }
    validateProductionIsolation(blockers, env);
  }

  const resendKey = requireValue(blockers, env, "RESEND_API_KEY");
  const fromAddress = requireValue(blockers, env, "EMAIL_FROM_ADDRESS");
  const fromName = requireValue(blockers, env, "EMAIL_FROM_NAME");
  const workerSecret = requireValue(blockers, env, "EMAIL_WORKER_SECRET");
  const durableRateLimitSecret = requireValue(blockers, env, "DURABLE_RATE_LIMIT_SECRET");
  if (fromAddress && !EMAIL.test(fromAddress)) add(blockers, "EMAIL_FROM_ADDRESS", "must be a valid mailbox address");
  if (fromName && /[\r\n<>]/.test(fromName)) add(blockers, "EMAIL_FROM_NAME", "must not contain header or address delimiters");
  if (resendKey && (!resendKey.startsWith("re_") || resendKey.length < 20)) add(blockers, "RESEND_API_KEY", "does not have the expected Resend key shape");
  if (environment === "production" && resendKey && PLACEHOLDER.test(resendKey)) {
    add(blockers, "RESEND_API_KEY", "must not be a placeholder or test credential");
  }

  const vapidPublic = requireValue(blockers, env, "NEXT_PUBLIC_VAPID_PUBLIC_KEY");
  const vapidPrivate = requireValue(blockers, env, "VAPID_PRIVATE_KEY");
  const vapidSubject = requireValue(blockers, env, "VAPID_SUBJECT");
  const pushSecret = requireValue(blockers, env, "PUSH_API_SECRET");
  const muxTokenId = requireValue(blockers, env, "MUX_TOKEN_ID");
  const muxTokenSecret = requireValue(blockers, env, "MUX_TOKEN_SECRET");
  const muxSigningKeyId = requireValue(blockers, env, "MUX_SIGNING_KEY_ID");
  const muxSigningPrivateKey = requireValue(blockers, env, "MUX_SIGNING_PRIVATE_KEY");
  if (vapidSubject && !/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(vapidSubject) && !/^https:\/\/[^\s]+$/i.test(vapidSubject)) {
    add(blockers, "VAPID_SUBJECT", "must be a mailto mailbox or HTTPS URL");
  }
  if (vapidPublic && vapidPrivate) {
    try {
      const publicBytes = decodeBase64Url(vapidPublic);
      const privateBytes = decodeBase64Url(vapidPrivate);
      if (publicBytes.length !== 65 || publicBytes[0] !== 4 || privateBytes.length !== 32) throw new Error("invalid key lengths");
      const ecdh = createECDH("prime256v1");
      ecdh.setPrivateKey(privateBytes);
      const derived = ecdh.getPublicKey(undefined, "uncompressed");
      if (derived.length !== publicBytes.length || !timingSafeEqual(derived, publicBytes)) {
        add(blockers, "VAPID_PRIVATE_KEY", "does not match NEXT_PUBLIC_VAPID_PUBLIC_KEY");
      }
    } catch {
      if (!blockers.some(({ path }) => path === "VAPID_PRIVATE_KEY")) {
        add(blockers, "VAPID_PRIVATE_KEY", "and the public key must be a valid matching P-256 VAPID pair");
      }
    }
  }

  if (muxTokenId && !/^[A-Za-z0-9_-]{10,255}$/.test(muxTokenId)) {
    add(blockers, "MUX_TOKEN_ID", "must have a valid Mux identifier shape");
  }
  if (muxSigningKeyId && !/^[A-Za-z0-9_-]{10,255}$/.test(muxSigningKeyId)) {
    add(blockers, "MUX_SIGNING_KEY_ID", "must have a valid Mux identifier shape");
  }
  if (muxTokenSecret && (muxTokenSecret.length < 20 || PLACEHOLDER.test(muxTokenSecret))) {
    add(blockers, "MUX_TOKEN_SECRET", "must be a non-placeholder secret with at least 20 characters");
  }
  if (muxSigningPrivateKey) {
    try {
      const key = createPrivateKey(Buffer.from(muxSigningPrivateKey, "base64").toString("utf8"));
      if (key.asymmetricKeyType !== "rsa") throw new Error("not RSA");
    } catch {
      add(blockers, "MUX_SIGNING_PRIVATE_KEY", "must be a base64-encoded RSA private key");
    }
  }

  const strongSecrets = {
    EMAIL_WORKER_SECRET: workerSecret,
    PUSH_API_SECRET: pushSecret,
    DURABLE_RATE_LIMIT_SECRET: durableRateLimitSecret,
  };
  for (const [name, secret] of Object.entries(strongSecrets)) {
    if (secret && secret.length < 32) add(blockers, name, "must contain at least 32 characters");
    if (secret && PLACEHOLDER.test(secret)) add(blockers, name, "must not be a placeholder value");
  }
  const seenSecrets = new Map();
  for (const [name, secret] of Object.entries(strongSecrets)) {
    if (!secret) continue;
    if (seenSecrets.has(secret)) add(blockers, name, `must be distinct from ${seenSecrets.get(secret)}`);
    else seenSecrets.set(secret, name);
  }

  for (const name of SERVER_ONLY_NAMES) {
    const publicName = `NEXT_PUBLIC_${name}`;
    if (value(env, publicName)) add(blockers, publicName, "must never expose a server-only credential");
  }

  if (environment === "local") warnings.push("Local configuration does not prove hosted sender, scheduler, push, or redirect readiness.");
  else warnings.push("This offline check validates configuration consistency only; live provider resources and delivery still require guarded acceptance evidence.");

  return { ready: blockers.length === 0, blockers, warnings };
}

function option(argv, name) {
  const prefix = `${name}=`;
  return argv.find((entry) => entry.startsWith(prefix))?.slice(prefix.length);
}

function usage() {
  return [
    "Usage: node scripts/provider-config-readiness.mjs --environment=<local|staging|production> --expected-origin=<origin> [--expected-supabase-host=<host>] [--env-file=<protected-path>]",
    "",
    "Production also requires PRODUCTION_PROJECT_REF and refuses staging/test deployment residue.",
    "The check is offline. It reports variable names and validation failures only; it never prints values.",
  ].join("\n");
}

export function runCli(argv = process.argv.slice(2), env = process.env) {
  if (argv.includes("--help")) {
    console.log(usage());
    return 0;
  }
  const envFile = option(argv, "--env-file");
  if (envFile) {
    if (!existsSync(envFile)) {
      console.error(JSON.stringify({ ready: false, error: "Environment file does not exist." }, null, 2));
      return 2;
    }
    try {
      loadEnvFile(envFile);
    } catch {
      console.error(JSON.stringify({ ready: false, error: "Environment file could not be loaded." }, null, 2));
      return 2;
    }
  }

  const result = evaluateProviderConfiguration(env, {
    environment: option(argv, "--environment"),
    expectedOrigin: option(argv, "--expected-origin"),
    expectedSupabaseHost: option(argv, "--expected-supabase-host"),
  });
  console.log(JSON.stringify(result, null, 2));
  return result.ready ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exitCode = runCli();
}
