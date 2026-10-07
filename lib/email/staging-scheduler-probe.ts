import "server-only";

// This probe has no database, queue, memorial or delivery dependencies.
export const SCHEDULER_PROBE_ORIGIN = "https://jingwuguanseibukan-staging.vercel.app";
export const SCHEDULER_PROBE_PATH = "/api/system/staging-scheduler-probe";
export const SCHEDULER_PROBE_PROJECT = "eomubndonbetszdbhsrj";

function timestamp(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return NaN;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString() === value ? time : NaN;
}

export function schedulerProbeConfig(
  env: Record<string, string | undefined> = process.env,
  now = Date.now(),
) {
  const start = timestamp(env.SCHEDULER_ACCEPTANCE_START);
  const end = timestamp(env.SCHEDULER_ACCEPTANCE_END);
  const secret = env.SCHEDULER_ACCEPTANCE_SECRET;
  const id = env.SCHEDULER_ACCEPTANCE_ID;
  const commit = env.SCHEDULER_ACCEPTANCE_COMMIT;
  if (env.SCHEDULER_ACCEPTANCE_ENABLED !== "true" || env.VERCEL_ENV !== "preview" ||
    env.VERCEL_GIT_COMMIT_REF !== "release/v1-readiness-20260918" ||
    env.STAGING_PROJECT_REF !== SCHEDULER_PROBE_PROJECT ||
    env.NEXT_PUBLIC_SUPABASE_URL !== `https://${SCHEDULER_PROBE_PROJECT}.supabase.co` ||
    env.NEXT_PUBLIC_SITE_URL !== SCHEDULER_PROBE_ORIGIN ||
    !commit || !/^[a-f0-9]{40}$/.test(commit) || env.VERCEL_GIT_COMMIT_SHA !== commit ||
    !id || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id) ||
    !secret || !/^[A-Za-z0-9_-]{48,128}$/.test(secret) ||
    secret === env.EMAIL_WORKER_SECRET || secret === env.PUSH_API_SECRET ||
    !Number.isFinite(now) || !Number.isFinite(start) || !Number.isFinite(end) ||
    end <= start || end - start > 600_000 || now < start || now >= end) return null;
  return { id, commit, secret, start: env.SCHEDULER_ACCEPTANCE_START!, end: env.SCHEDULER_ACCEPTANCE_END! };
}
