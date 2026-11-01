-- Durable, cross-instance application API rate limits.
-- Browser roles have no direct access; server routes consume limits through the
-- service-role-only SECURITY DEFINER function.

begin;

create table public.api_rate_limit_buckets (
  bucket text not null,
  subject_hash text not null,
  window_started_at timestamptz not null,
  request_count integer not null,
  updated_at timestamptz not null default clock_timestamp(),
  primary key (bucket, subject_hash),
  constraint api_rate_limit_bucket_length_check
    check (char_length(bucket) between 1 and 100),
  constraint api_rate_limit_subject_hash_check
    check (subject_hash ~ '^[0-9a-f]{64}$'),
  constraint api_rate_limit_request_count_check
    check (request_count > 0)
);

alter table public.api_rate_limit_buckets enable row level security;
alter table public.api_rate_limit_buckets force row level security;

revoke all on table public.api_rate_limit_buckets from public, anon, authenticated;
revoke all on table public.api_rate_limit_buckets from service_role;

create or replace function public.consume_api_rate_limit(
  target_bucket text,
  target_subject_hash text,
  target_limit integer,
  target_window_seconds integer
)
returns table (
  allowed boolean,
  remaining integer,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  now_at timestamptz := clock_timestamp();
  current_row public.api_rate_limit_buckets%rowtype;
  window_length interval;
begin
  if target_bucket is null
     or target_bucket <> btrim(target_bucket)
     or char_length(target_bucket) not between 1 and 100
     or target_subject_hash is null
     or target_subject_hash !~ '^[0-9a-f]{64}$'
     or target_limit is null
     or target_limit not between 1 and 100000
     or target_window_seconds is null
     or target_window_seconds not between 1 and 86400
  then
    raise exception 'Invalid rate-limit parameters';
  end if;

  window_length := make_interval(secs => target_window_seconds);

  insert into public.api_rate_limit_buckets as rate_limit (
    bucket,
    subject_hash,
    window_started_at,
    request_count,
    updated_at
  ) values (
    target_bucket,
    target_subject_hash,
    now_at,
    1,
    now_at
  )
  on conflict (bucket, subject_hash) do update
  set
    window_started_at = case
      when rate_limit.window_started_at + window_length <= now_at then now_at
      else rate_limit.window_started_at
    end,
    request_count = case
      when rate_limit.window_started_at + window_length <= now_at then 1
      else rate_limit.request_count + 1
    end,
    updated_at = now_at
  returning rate_limit.* into current_row;

  allowed := current_row.request_count <= target_limit;
  remaining := greatest(target_limit - current_row.request_count, 0);
  retry_after_seconds := case
    when allowed then 0
    else greatest(
      ceil(extract(epoch from (current_row.window_started_at + window_length - now_at)))::integer,
      1
    )
  end;

  return next;
end;
$function$;

alter function public.consume_api_rate_limit(text, text, integer, integer) owner to postgres;
revoke all on function public.consume_api_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, text, integer, integer) to service_role;

create index api_rate_limit_buckets_updated_at_idx
  on public.api_rate_limit_buckets (updated_at);

notify pgrst, 'reload schema';

commit;
