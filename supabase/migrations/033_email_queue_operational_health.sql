-- ============================================================
-- 033 EMAIL QUEUE OPERATIONAL HEALTH
-- ============================================================
-- Align the database health signal with the release SLO: email work that has
-- been ready for more than two minutes must be observable as unhealthy.
-- Retried rows are measured from next_attempt_at so an intentional backoff is
-- not reported as delay before the retry is due.
--
-- This migration replaces one read-only health function. It does not send
-- email or update, delete, or insert any email_outbox row.
-- ============================================================

begin;


do $$
declare
  required_column text;
begin
  if to_regclass('public.email_outbox') is null then
    raise exception 'Required table public.email_outbox is missing';
  end if;

  foreach required_column in array array[
    'status',
    'attempts',
    'max_attempts',
    'last_attempt_at',
    'next_attempt_at',
    'created_at',
    'dedupe_key'
  ] loop
    if not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'email_outbox'
        and column_name = required_column
    ) then
      raise exception 'Required email_outbox column is missing: %', required_column;
    end if;
  end loop;

  if to_regprocedure('public.email_backend_health_check()') is null then
    raise exception 'Required function public.email_backend_health_check() is missing';
  end if;
end;
$$;


create or replace function public.email_backend_health_check()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  stuck_processing integer := 0;
  exhausted_failures integer := 0;
  old_pending integer := 0;
  overdue_ready integer := 0;
  queued_emails integer := 0;
  due_emails integer := 0;
  duplicate_dedupe integer := 0;
  oldest_ready_age_seconds integer;
begin
  select count(*)
  into stuck_processing
  from public.email_outbox
  where status = 'processing'
    and last_attempt_at < now() - interval '15 minutes';

  select count(*)
  into exhausted_failures
  from public.email_outbox
  where status = 'failed'
    and attempts >= max_attempts;

  -- Retain this existing key for monitoring-client compatibility, but use the
  -- documented two-minute threshold instead of the prior thirty minutes.
  select count(*)
  into old_pending
  from public.email_outbox
  where status = 'pending'
    and coalesce(next_attempt_at, created_at) < now() - interval '2 minutes';

  select
    count(*),
    count(*) filter (
      where coalesce(next_attempt_at, created_at) <= now()
    ),
    count(*) filter (
      where coalesce(next_attempt_at, created_at) < now() - interval '2 minutes'
    ),
    greatest(
      0,
      floor(
        extract(
          epoch from now() - min(coalesce(next_attempt_at, created_at)) filter (
            where coalesce(next_attempt_at, created_at) <= now()
          )
        )
      )::integer
    )
  into
    queued_emails,
    due_emails,
    overdue_ready,
    oldest_ready_age_seconds
  from public.email_outbox
  where status in ('pending', 'failed')
    and attempts < max_attempts;

  select count(*)
  into duplicate_dedupe
  from (
    select dedupe_key
    from public.email_outbox
    where dedupe_key is not null
    group by dedupe_key
    having count(*) > 1
  ) as duplicate;

  return jsonb_build_object(
    'status',
    case
      when stuck_processing = 0
       and exhausted_failures = 0
       and old_pending = 0
       and overdue_ready = 0
       and duplicate_dedupe = 0
      then 'PASS'
      else 'FAIL'
    end,
    'checks',
    jsonb_build_object(
      'stuck_processing_emails', stuck_processing,
      'failed_emails_exhausted', exhausted_failures,
      'old_pending_emails', old_pending,
      'overdue_ready_emails', overdue_ready,
      'queued_emails', queued_emails,
      'due_emails', due_emails,
      'oldest_ready_age_seconds', oldest_ready_age_seconds,
      'duplicate_dedupe_keys', duplicate_dedupe
    ),
    'checked_at', now()
  );
end;
$$;


revoke execute
on function public.email_backend_health_check()
from public, anon, authenticated;

grant execute
on function public.email_backend_health_check()
to service_role;

comment on function public.email_backend_health_check() is
  'Server-only email queue health summary; fails for work overdue by two minutes, stale claims, exhausted retries, or duplicate dedupe keys.';


do $$
begin
  if has_function_privilege('anon', 'public.email_backend_health_check()', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.email_backend_health_check()', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.email_backend_health_check()', 'EXECUTE')
  then
    raise exception 'Email health-check execution grants are unsafe';
  end if;
end;
$$;


notify pgrst, 'reload schema';

commit;
