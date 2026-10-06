// Operator-only acceptance gate. No defaults enable it and no caller-supplied content.
export const STAGING_EMAIL_ORIGIN = "https://jingwuguanseibukan-staging.vercel.app";
export const STAGING_EMAIL_PROJECT = "eomubndonbetszdbhsrj";
export const STAGING_EMAIL_SUBJECT = "[STAGING TEST] Jingwuguan email delivery acceptance";
export const STAGING_EMAIL_TEMPLATE = {
  notification_number: 1,
  class_name: "STAGING TEST — not a real class",
  title: "Email delivery acceptance test",
  description: "This is an approved staging test. No member, event or registration was created. No action is required.",
};

export function stagingEmailConfig(env: NodeJS.ProcessEnv, now = Date.now()) {
  const id = env.STAGING_EMAIL_TEST_ID ?? "";
  const recipient = env.STAGING_EMAIL_TEST_RECIPIENT ?? "";
  const secret = env.STAGING_EMAIL_TEST_SECRET ?? "";
  const start = Date.parse(env.STAGING_EMAIL_TEST_START ?? "");
  const end = Date.parse(env.STAGING_EMAIL_TEST_END ?? "");
  const sha = env.STAGING_EMAIL_TEST_COMMIT ?? "";
  const excluded = Object.entries(env).filter(([key]) =>
    key === "EMAIL_FROM_ADDRESS" || /^SECURITY_TEST_.*(?:EMAIL|LOGIN|USERNAME)$/.test(key),
  ).map(([, value]) => value?.trim().toLowerCase());
  const domain = recipient.split("@")[1] ?? "";
  if (env.STAGING_EMAIL_TEST_ENABLED !== "true" || env.VERCEL_ENV !== "preview" ||
      env.NODE_ENV !== "production" ||
      env.VERCEL_GIT_COMMIT_REF !== "release/v1-readiness-20260918" ||
      env.STAGING_PROJECT_REF !== STAGING_EMAIL_PROJECT ||
      env.NEXT_PUBLIC_SUPABASE_URL !== `https://${STAGING_EMAIL_PROJECT}.supabase.co` ||
      env.NEXT_PUBLIC_SITE_URL !== STAGING_EMAIL_ORIGIN ||
      !/^[a-f0-9]{40}$/.test(sha) || env.VERCEL_GIT_COMMIT_SHA !== sha ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id) ||
      !/^[A-Za-z0-9_-]{43,128}$/.test(secret) ||
      /example|placeholder|change.?me|dummy/i.test(secret) ||
      [env.EMAIL_WORKER_SECRET, env.PUSH_API_SECRET, env.SUPABASE_SECRET_KEY,
        env.SUPABASE_SERVICE_ROLE_KEY, env.RESEND_API_KEY, env.DURABLE_RATE_LIMIT_SECRET,
        env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, env.NEXT_PUBLIC_SUPABASE_ANON_KEY].includes(secret) ||
      !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(recipient) ||
      recipient.length > 254 || env.STAGING_EMAIL_TEST_RECIPIENT_CONFIRMATION !== recipient ||
      excluded.includes(recipient) ||
      /^(admin|administrator|support|security|noreply|no-reply|postmaster|webmaster|abuse)(?:@|[+._-])/.test(recipient) ||
      /(^|\.)(example|invalid|localhost|test)$/.test(domain) ||
      /(^|\.)example\.(com|net|org)$/.test(domain) ||
      !/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(env.EMAIL_FROM_ADDRESS ?? "") ||
      !env.RESEND_API_KEY?.startsWith("re_") ||
      !Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(now) ||
      end <= start || end - start > 15 * 60_000 || now < start || now >= end) return null;
  return { id, recipient, secret, start, end };
}

export function stagingEmailRequestAllowed(url: string, id: string | null, expected: string) {
  // Do not trust Host/X-Forwarded-Host to establish an environment boundary.
  return url === `${STAGING_EMAIL_ORIGIN}/api/system/staging-email-test` && id === expected;
}
