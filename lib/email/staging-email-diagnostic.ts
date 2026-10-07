import {
  stagingEmailConfig, STAGING_EMAIL_ORIGIN, STAGING_EMAIL_PROJECT,
} from "./staging-single-message";

// In-memory checks only. This module must never import a database/provider client.
export function stagingEmailDiagnosticReport(env: NodeJS.ProcessEnv, expectedCommit: string, now: number) {
  const checks = {
    preview: env.VERCEL_ENV === "preview",
    productionNodeRuntime: env.NODE_ENV === "production",
    releaseBranch: env.VERCEL_GIT_COMMIT_REF === "release/v1-readiness-20260918",
    expectedCommit: /^[a-f0-9]{40}$/.test(expectedCommit) && env.VERCEL_GIT_COMMIT_SHA === expectedCommit,
    stagingProject: env.STAGING_PROJECT_REF === STAGING_EMAIL_PROJECT,
    stagingDatabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL === `https://${STAGING_EMAIL_PROJECT}.supabase.co`,
    stagingSiteUrl: env.NEXT_PUBLIC_SITE_URL === STAGING_EMAIL_ORIGIN,
    senderMailboxShape: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(env.EMAIL_FROM_ADDRESS ?? ""),
    providerKeyShape: env.RESEND_API_KEY?.startsWith("re_") === true,
    sendDisabled: env.STAGING_EMAIL_TEST_ENABLED !== "true",
  };
  // Synthetic settings are passed only to the pure configuration predicate.
  // They are never assigned to process.env or used by any sending handler.
  const simulation = {
    ...env,
    STAGING_EMAIL_TEST_ENABLED: "true",
    STAGING_EMAIL_TEST_COMMIT: expectedCommit,
    STAGING_EMAIL_TEST_ID: "7b755dd5-85ec-4a9c-8360-76a58a38d0c5",
    STAGING_EMAIL_TEST_SECRET: "s".repeat(64),
    STAGING_EMAIL_TEST_RECIPIENT: "acceptance@owned-mail.org",
    STAGING_EMAIL_TEST_RECIPIENT_CONFIRMATION: "acceptance@owned-mail.org",
    STAGING_EMAIL_TEST_START: new Date(now - 1000).toISOString(),
    STAGING_EMAIL_TEST_END: new Date(now + 60000).toISOString(),
  };
  return {
    checks,
    simulatedConfigAccepted: stagingEmailConfig(simulation, now) !== null,
    actualSendConfigAccepted: stagingEmailConfig(env, now) !== null,
  };
}

export function stagingEmailDiagnosticAllowed(env: NodeJS.ProcessEnv, now: number) {
  const start = Date.parse(env.STAGING_EMAIL_DIAGNOSTIC_START ?? "");
  const end = Date.parse(env.STAGING_EMAIL_DIAGNOSTIC_END ?? "");
  return env.STAGING_EMAIL_DIAGNOSTIC_ENABLED === "true" &&
    env.STAGING_EMAIL_TEST_ENABLED !== "true" && env.VERCEL_ENV === "preview" &&
    env.VERCEL_PROJECT_ID === "prj_uCQO2Y5KiACpA5YAWKAWp8yb5rZ8" &&
    env.STAGING_PROJECT_REF === STAGING_EMAIL_PROJECT &&
    env.NEXT_PUBLIC_SUPABASE_URL === `https://${STAGING_EMAIL_PROJECT}.supabase.co` &&
    env.NEXT_PUBLIC_SITE_URL === STAGING_EMAIL_ORIGIN &&
    (env.EMAIL_WORKER_SECRET?.length ?? 0) >= 32 &&
    Number.isFinite(now) && Number.isFinite(start) && Number.isFinite(end) &&
    end > start && end - start <= 15 * 60000 && now >= start && now < end;
}
