import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { isAbsolute, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const STAGING_AUTH_EMAIL_CONFIRMATION = "--confirm-offline-preflight";
export const STAGING_AUTH_EMAIL_PROJECT_REF = "eomubndonbetszdbhsrj";
export const STAGING_AUTH_EMAIL_APP_ORIGIN = "https://jingwuguanseibukan-staging.vercel.app";
export const STAGING_AUTH_EMAIL_SUPABASE_ORIGIN =
  `https://${STAGING_AUTH_EMAIL_PROJECT_REF}.supabase.co`;

export const REQUIRED_CLEANUP_SCOPES = Object.freeze([
  "auth.identities",
  "auth.users",
  "public.class_requests",
  "public.email_outbox",
  "public.password_reset_requests",
  "public.profiles",
]);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256 = /^[0-9a-f]{64}$/i;
const RUN_ID = /^JWG-AUTH-[0-9]{8}-[A-Z0-9]{12}$/;
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const PLACEHOLDER = /(?:change[-_ ]?me|example|dummy|fixture|invalid|local[-_ ]?only|test[-_ ]?only)/i;
const REPOSITORY_ROOT = realpathSync(fileURLToPath(new URL("../", import.meta.url)));
const PROTECTED_NAMES = Object.freeze([
  "NEXT_PUBLIC_SITE_URL",
  "STAGING_PROJECT_REF",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STAGING_AUTH_ACCEPTANCE_INBOX",
  "STAGING_AUTH_ACCEPTANCE_INBOX_CONFIRMATION",
  "STAGING_AUTH_ACCEPTANCE_RUN_ID",
  "STAGING_AUTH_ACCEPTANCE_CLASS_ID",
  "STAGING_AUTH_ACCEPTANCE_DOJO_ID",
  "STAGING_AUTH_ACCEPTANCE_REGISTRATION_PASSWORD",
  "STAGING_AUTH_ACCEPTANCE_REPLACEMENT_PASSWORD",
  "STAGING_AUTH_ACCEPTANCE_CATALOG_SHA256",
  "STAGING_AUTH_ACCEPTANCE_CATALOG_FILE",
  "STAGING_AUTH_ACCEPTANCE_CLEANUP_SHA256",
  "STAGING_AUTH_ACCEPTANCE_CLEANUP_PLAN_FILE",
  "STAGING_AUTH_ACCEPTANCE_CLEANUP_SCOPES",
  "STAGING_AUTH_ACCEPTANCE_REVIEW_TOKEN",
  "EMAIL_FROM_ADDRESS",
  "RESEND_API_KEY",
  "EMAIL_WORKER_SECRET",
  "SECURITY_TEST_MEMBER_EMAIL",
  "SECURITY_TEST_MEMBER_PASSWORD",
  "SECURITY_TEST_ADMIN_EMAIL",
  "SECURITY_TEST_ADMIN_PASSWORD",
  "SECURITY_TEST_SUPER_EMAIL",
  "SECURITY_TEST_SUPER_PASSWORD",
]);

const EXPECTED_SECURITY_ACCOUNTS = Object.freeze({
  MEMBER: "0101@dummy.jingwuguan.test",
  ADMIN: "0002@dummy.jingwuguan.test",
  SUPER: "0001@dummy.jingwuguan.test",
});

function value(environment, name) {
  return typeof environment[name] === "string" ? environment[name].trim() : "";
}

function add(blockers, path, message) {
  blockers.push({ path, message });
}

function requireValue(blockers, environment, name) {
  const current = value(environment, name);
  if (!current) add(blockers, name, "is required in the protected staging environment file");
  return current;
}

function exactOrigin(raw) {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password ||
        url.pathname !== "/" || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function constantTimeEqual(left, right) {
  const leftDigest = createHash("sha256").update(left).digest();
  const rightDigest = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftDigest, rightDigest);
}

function strongDisposablePassword(password) {
  return password.length >= 16 && password.length <= 128 &&
    /[A-Z]/.test(password) && /[a-z]/.test(password) &&
    /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password) &&
    !PLACEHOLDER.test(password);
}

function normalizeScopes(raw) {
  return [...new Set(raw.split(",").map((item) => item.trim()).filter(Boolean))].sort();
}

function verifyProtectedArtifact({
  blockers,
  environment,
  pathName,
  digestName,
  expectedDigest,
}) {
  const artifactPath = requireValue(blockers, environment, pathName);
  if (!artifactPath) return null;
  if (!isAbsolute(artifactPath)) {
    add(blockers, pathName, "must be an absolute protected evidence-file path");
    return null;
  }

  try {
    const realArtifactPath = realpathSync(artifactPath);
    if (realArtifactPath === REPOSITORY_ROOT ||
        realArtifactPath.startsWith(`${REPOSITORY_ROOT}${sep}`)) {
      add(blockers, pathName, "must point outside the repository");
      return null;
    }
    const stats = statSync(realArtifactPath);
    if (!stats.isFile() || stats.size <= 0 || stats.size > 32 * 1024 * 1024) {
      add(blockers, pathName, "must be a non-empty regular evidence file no larger than 32 MiB");
      return null;
    }
    const actualDigest = createHash("sha256").update(readFileSync(realArtifactPath)).digest("hex");
    if (SHA256.test(expectedDigest) && !constantTimeEqual(actualDigest, expectedDigest)) {
      add(blockers, digestName, `must match the exact file named by ${pathName}`);
      return null;
    }
    return realArtifactPath;
  } catch {
    add(blockers, pathName, "must identify a readable protected evidence file");
    return null;
  }
}

export function authEmailReviewToken({
  runId,
  inbox,
  classId,
  dojoId,
  catalogSha256,
  cleanupSha256,
  scopes,
  reviewSecret,
}) {
  return createHmac(
    "sha256",
    reviewSecret,
  )
    .update([
      "jwg-staging-auth-email-acceptance-v1",
      STAGING_AUTH_EMAIL_PROJECT_REF,
      STAGING_AUTH_EMAIL_APP_ORIGIN,
      runId,
      inbox.toLowerCase(),
      classId.toLowerCase(),
      dojoId.toLowerCase(),
      catalogSha256.toLowerCase(),
      cleanupSha256.toLowerCase(),
      ...scopes,
    ].join("\n"))
    .digest("hex")
    .slice(0, 24)
    .toUpperCase();
}

export function evaluateStagingAuthEmailReadiness(environment) {
  const blockers = [];
  const warnings = [
    "This command is offline and does not prove Supabase SMTP, Resend, scheduler, inbox, redirect, or delivery readiness.",
    "Application/database cleanup cannot remove messages from the dedicated inbox or provider delivery logs; retain those as named acceptance evidence.",
    "Run the live workflow only after a separate read-only catalog audit proves the reviewed cleanup inventory still matches staging.",
  ];

  const siteOrigin = exactOrigin(requireValue(blockers, environment, "NEXT_PUBLIC_SITE_URL"));
  if (siteOrigin !== STAGING_AUTH_EMAIL_APP_ORIGIN) {
    add(blockers, "NEXT_PUBLIC_SITE_URL", "must be the exact fixed staging application origin");
  }
  const projectRef = requireValue(blockers, environment, "STAGING_PROJECT_REF");
  if (projectRef !== STAGING_AUTH_EMAIL_PROJECT_REF) {
    add(blockers, "STAGING_PROJECT_REF", "must identify only the approved staging project");
  }
  const supabaseOrigin = exactOrigin(requireValue(blockers, environment, "NEXT_PUBLIC_SUPABASE_URL"));
  if (supabaseOrigin !== STAGING_AUTH_EMAIL_SUPABASE_ORIGIN) {
    add(blockers, "NEXT_PUBLIC_SUPABASE_URL", "must be the exact approved staging Supabase origin");
  }

  const publishableKey = requireValue(blockers, environment, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  const secretKey = value(environment, "SUPABASE_SECRET_KEY") ||
    value(environment, "SUPABASE_SERVICE_ROLE_KEY");
  if (!secretKey) add(blockers, "SUPABASE_SECRET_KEY", "or SUPABASE_SERVICE_ROLE_KEY is required for exact cleanup verification");
  if (publishableKey && secretKey && constantTimeEqual(publishableKey, secretKey)) {
    add(blockers, "SUPABASE_SECRET_KEY", "must be distinct from the browser publishable key");
  }

  const inbox = requireValue(blockers, environment, "STAGING_AUTH_ACCEPTANCE_INBOX").toLowerCase();
  const inboxConfirmation = requireValue(
    blockers,
    environment,
    "STAGING_AUTH_ACCEPTANCE_INBOX_CONFIRMATION",
  ).toLowerCase();
  if (inbox && !EMAIL.test(inbox)) {
    add(blockers, "STAGING_AUTH_ACCEPTANCE_INBOX", "must be one valid deliverable mailbox address");
  }
  if (inbox && /(?:\.test|\.invalid|(?:^|\.)example\.(?:com|net|org)|dummy\.jingwuguan\.test)$/i.test(inbox.split("@")[1] ?? "")) {
    add(blockers, "STAGING_AUTH_ACCEPTANCE_INBOX", "must not use a reserved, dummy, or non-deliverable domain");
  }
  if (inbox && inboxConfirmation && !constantTimeEqual(inbox, inboxConfirmation)) {
    add(blockers, "STAGING_AUTH_ACCEPTANCE_INBOX_CONFIRMATION", "must exactly repeat the dedicated inbox address");
  }
  for (const [role, expectedEmail] of Object.entries(EXPECTED_SECURITY_ACCOUNTS)) {
    const securityEmail = requireValue(blockers, environment, `SECURITY_TEST_${role}_EMAIL`).toLowerCase();
    requireValue(blockers, environment, `SECURITY_TEST_${role}_PASSWORD`);
    if (securityEmail && securityEmail !== expectedEmail) {
      add(blockers, `SECURITY_TEST_${role}_EMAIL`, "must identify the approved staging-only role account");
    }
    if (inbox && securityEmail && constantTimeEqual(inbox, securityEmail)) {
      add(blockers, "STAGING_AUTH_ACCEPTANCE_INBOX", "must not reuse an existing role-security account");
    }
  }
  const sender = requireValue(blockers, environment, "EMAIL_FROM_ADDRESS").toLowerCase();
  if (sender && !EMAIL.test(sender)) {
    add(blockers, "EMAIL_FROM_ADDRESS", "must be one valid sender mailbox address");
  }
  if (inbox && sender && constantTimeEqual(inbox, sender)) {
    add(blockers, "STAGING_AUTH_ACCEPTANCE_INBOX", "must be distinct from the configured sender mailbox");
  }
  const resendKey = requireValue(blockers, environment, "RESEND_API_KEY");
  if (resendKey && (!resendKey.startsWith("re_") || resendKey.length < 20)) {
    add(blockers, "RESEND_API_KEY", "does not have the expected server-only Resend key shape");
  }
  const workerSecret = requireValue(blockers, environment, "EMAIL_WORKER_SECRET");
  if (workerSecret && (workerSecret.length < 32 || PLACEHOLDER.test(workerSecret))) {
    add(blockers, "EMAIL_WORKER_SECRET", "must be a non-placeholder server-only secret with at least 32 characters");
  }

  const runId = requireValue(blockers, environment, "STAGING_AUTH_ACCEPTANCE_RUN_ID").toUpperCase();
  if (runId && !RUN_ID.test(runId)) {
    add(blockers, "STAGING_AUTH_ACCEPTANCE_RUN_ID", "must match JWG-AUTH-YYYYMMDD-XXXXXXXXXXXX");
  }
  const classId = requireValue(blockers, environment, "STAGING_AUTH_ACCEPTANCE_CLASS_ID");
  const dojoId = requireValue(blockers, environment, "STAGING_AUTH_ACCEPTANCE_DOJO_ID");
  if (classId && !UUID.test(classId)) add(blockers, "STAGING_AUTH_ACCEPTANCE_CLASS_ID", "must be one reviewed staging class UUID");
  if (dojoId && !UUID.test(dojoId)) add(blockers, "STAGING_AUTH_ACCEPTANCE_DOJO_ID", "must be one reviewed staging dojo UUID");
  if (classId && dojoId && classId.toLowerCase() === dojoId.toLowerCase()) {
    add(blockers, "STAGING_AUTH_ACCEPTANCE_DOJO_ID", "must be distinct from the class UUID");
  }

  const registrationPassword = requireValue(blockers, environment, "STAGING_AUTH_ACCEPTANCE_REGISTRATION_PASSWORD");
  const replacementPassword = requireValue(blockers, environment, "STAGING_AUTH_ACCEPTANCE_REPLACEMENT_PASSWORD");
  if (registrationPassword && !strongDisposablePassword(registrationPassword)) {
    add(blockers, "STAGING_AUTH_ACCEPTANCE_REGISTRATION_PASSWORD", "must be a non-placeholder 16–128 character password with upper, lower, number, and symbol");
  }
  if (replacementPassword && !strongDisposablePassword(replacementPassword)) {
    add(blockers, "STAGING_AUTH_ACCEPTANCE_REPLACEMENT_PASSWORD", "must be a non-placeholder 16–128 character password with upper, lower, number, and symbol");
  }
  if (registrationPassword && replacementPassword && constantTimeEqual(registrationPassword, replacementPassword)) {
    add(blockers, "STAGING_AUTH_ACCEPTANCE_REPLACEMENT_PASSWORD", "must be distinct from the registration password");
  }

  const catalogSha256 = requireValue(blockers, environment, "STAGING_AUTH_ACCEPTANCE_CATALOG_SHA256");
  const cleanupSha256 = requireValue(blockers, environment, "STAGING_AUTH_ACCEPTANCE_CLEANUP_SHA256");
  if (catalogSha256 && !SHA256.test(catalogSha256)) {
    add(blockers, "STAGING_AUTH_ACCEPTANCE_CATALOG_SHA256", "must be the SHA-256 of a current read-only staging catalog inventory");
  }
  if (cleanupSha256 && !SHA256.test(cleanupSha256)) {
    add(blockers, "STAGING_AUTH_ACCEPTANCE_CLEANUP_SHA256", "must be the SHA-256 of the independently reviewed cleanup plan");
  }
  if (catalogSha256 && /^0{64}$/i.test(catalogSha256)) {
    add(blockers, "STAGING_AUTH_ACCEPTANCE_CATALOG_SHA256", "must not be an empty placeholder digest");
  }
  if (cleanupSha256 && /^0{64}$/i.test(cleanupSha256)) {
    add(blockers, "STAGING_AUTH_ACCEPTANCE_CLEANUP_SHA256", "must not be an empty placeholder digest");
  }
  const catalogFile = verifyProtectedArtifact({
    blockers,
    environment,
    pathName: "STAGING_AUTH_ACCEPTANCE_CATALOG_FILE",
    digestName: "STAGING_AUTH_ACCEPTANCE_CATALOG_SHA256",
    expectedDigest: catalogSha256,
  });
  const cleanupFile = verifyProtectedArtifact({
    blockers,
    environment,
    pathName: "STAGING_AUTH_ACCEPTANCE_CLEANUP_PLAN_FILE",
    digestName: "STAGING_AUTH_ACCEPTANCE_CLEANUP_SHA256",
    expectedDigest: cleanupSha256,
  });
  const artifactsDistinct = catalogFile && cleanupFile &&
    !constantTimeEqual(catalogFile, cleanupFile);
  if (catalogFile && cleanupFile && !artifactsDistinct) {
    add(blockers, "STAGING_AUTH_ACCEPTANCE_CLEANUP_PLAN_FILE", "must be distinct from the catalog evidence file");
  }

  const scopes = normalizeScopes(requireValue(blockers, environment, "STAGING_AUTH_ACCEPTANCE_CLEANUP_SCOPES"));
  const missingScopes = REQUIRED_CLEANUP_SCOPES.filter((scope) => !scopes.includes(scope));
  if (missingScopes.length > 0) {
    add(blockers, "STAGING_AUTH_ACCEPTANCE_CLEANUP_SCOPES", `is missing required reviewed scope(s): ${missingScopes.join(", ")}`);
  }

  let reviewToken = null;
  if (blockers.length === 0 && runId && inbox && classId && dojoId && SHA256.test(catalogSha256) &&
      SHA256.test(cleanupSha256) && catalogFile && cleanupFile && artifactsDistinct &&
      missingScopes.length === 0) {
    reviewToken = authEmailReviewToken({
      runId,
      inbox,
      classId,
      dojoId,
      catalogSha256,
      cleanupSha256,
      scopes,
      reviewSecret:
        workerSecret,
    });
    const supplied = value(environment, "STAGING_AUTH_ACCEPTANCE_REVIEW_TOKEN");
    if (!supplied || !constantTimeEqual(supplied.toUpperCase(), reviewToken)) {
      add(blockers, "STAGING_AUTH_ACCEPTANCE_REVIEW_TOKEN", "must match the token produced by a separate reviewed offline preflight");
    }
  }

  return {
    ready: blockers.length === 0,
    target: {
      environment: "staging",
      projectRef: STAGING_AUTH_EMAIL_PROJECT_REF,
      appOrigin: STAGING_AUTH_EMAIL_APP_ORIGIN,
    },
    runId: RUN_ID.test(runId) ? runId : null,
    reviewToken,
    requiredCleanupScopes: [...REQUIRED_CLEANUP_SCOPES],
    blockers,
    warnings,
  };
}

function option(argv, name) {
  const prefix = `${name}=`;
  return argv.find((entry) => entry.startsWith(prefix))?.slice(prefix.length);
}

function usage() {
  return [
    "Usage: node scripts/staging-auth-email-readiness.mjs --confirm-offline-preflight --env-file=<absolute-protected-path>",
    "",
    "This command performs no network I/O and no mutation. It never prints mailbox or credential values.",
    "Run it once to obtain the review token, review the exact catalog and cleanup digests, then store the token in the protected file and run it again.",
  ].join("\n");
}

export function runCli(argv = process.argv.slice(2), environment = process.env) {
  if (argv.includes("--help")) {
    console.log(usage());
    return 0;
  }
  if (argv.length !== 2 || argv[0] !== STAGING_AUTH_EMAIL_CONFIRMATION ||
      !argv[1].startsWith("--env-file=")) {
    console.error(JSON.stringify({ ready: false, error: `Exact ${STAGING_AUTH_EMAIL_CONFIRMATION} acknowledgement is required.` }, null, 2));
    return 2;
  }
  const envFile = option(argv, "--env-file");
  if (!envFile || !isAbsolute(envFile) || !existsSync(envFile)) {
    console.error(JSON.stringify({ ready: false, error: "Protected environment file does not exist." }, null, 2));
    return 2;
  }
  const resolvedFile = resolve(envFile);
  if (resolvedFile === REPOSITORY_ROOT || resolvedFile.startsWith(`${REPOSITORY_ROOT}${sep}`)) {
    console.error(JSON.stringify({ ready: false, error: "Protected environment file must be outside the repository." }, null, 2));
    return 2;
  }
  for (const name of PROTECTED_NAMES) delete environment[name];
  try {
    loadEnvFile(envFile);
  } catch {
    console.error(JSON.stringify({ ready: false, error: "Protected environment file could not be loaded." }, null, 2));
    return 2;
  }
  const result = evaluateStagingAuthEmailReadiness(environment);
  console.log(JSON.stringify(result, null, 2));
  return result.ready ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exitCode = runCli();
}
