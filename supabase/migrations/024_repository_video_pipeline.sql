-- ============================================================
-- 020 REPOSITORY VIDEO PIPELINE
-- ============================================================
-- Provider-neutral state for private originals, asynchronous processing,
-- watermarked adaptive playback, retries and operational diagnostics.
-- Provider API credentials and signed playback tokens remain server-only.
-- ============================================================

begin;


insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'repository-video-originals',
  'repository-video-originals',
  false,
  2147483648,
  array[
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/x-matroska'
  ]
)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1
    from storage.buckets
    where id = 'repository-video-originals'
      and public = false
  ) then
    raise exception 'Private repository video originals bucket is unavailable';
  end if;
end;
$$;


create table public.repository_watermark_profiles (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_profile_id text not null,
  version integer not null unique check (version > 0),
  logo_storage_key text not null,
  scale numeric not null default 0.10 check (scale > 0 and scale <= 1),
  opacity numeric not null default 0.75 check (opacity > 0 and opacity <= 1),
  padding numeric not null default 0.05 check (padding >= 0 and padding <= 1),
  position text not null default 'upperRight'
    check (position in ('upperRight', 'upperLeft', 'lowerRight', 'lowerLeft', 'center')),
  active boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint repository_watermark_provider_profile_unique
    unique (provider, provider_profile_id)
);

create unique index repository_watermark_one_active_idx
on public.repository_watermark_profiles ((active))
where active;


create table public.repository_video_sources (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null unique references public.content(id) on delete restrict,
  original_storage_key text not null unique,
  original_sha256 text check (
    original_sha256 is null
    or original_sha256 ~ '^[0-9a-f]{64}$'
  ),
  sha256_verified_at timestamptz,
  original_size_bytes bigint not null check (original_size_bytes > 0),
  original_content_type text not null,
  upload_state text not null default 'awaiting_upload'
    check (upload_state in ('awaiting_upload', 'uploaded', 'ingesting', 'ingested', 'failed', 'cancelling')),
  upload_expires_at timestamptz,
  uploaded_at timestamptz,
  ingestion_started_at timestamptz,
  ingestion_attempts integer not null default 0 check (ingestion_attempts >= 0),
  last_error_message text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index repository_video_sources_upload_state_idx
on public.repository_video_sources (upload_state, updated_at)
where upload_state <> 'ingested';


create table public.repository_video_assets (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null
    references public.repository_video_sources(id) on delete cascade,
  watermark_profile_id uuid not null
    references public.repository_watermark_profiles(id) on delete restrict,
  provider text not null,
  provider_asset_id text not null,
  state text not null default 'uploading'
    check (state in (
      'uploading',
      'uploaded',
      'queued',
      'processing',
      'ready',
      'failed',
      'deleting',
      'deleted'
    )),
  playback_domain text,
  duration_seconds numeric,
  width integer,
  height integer,
  processing_attempts integer not null default 0
    check (processing_attempts >= 0),
  max_processing_attempts integer not null default 5
    check (max_processing_attempts between 1 and 20),
  next_processing_attempt_at timestamptz,
  last_provider_event_at timestamptz,
  last_error_code text,
  last_error_message text,
  is_active boolean not null default false,
  activated_at timestamptz,
  retired_at timestamptz,
  created_by uuid not null
    references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint repository_video_provider_asset_unique
    unique (provider, provider_asset_id),
  constraint repository_video_dimensions_valid
    check (
      (width is null and height is null)
      or (width > 0 and height > 0)
    ),
  constraint repository_video_active_ready
    check (not is_active or state = 'ready'),
  constraint repository_video_asset_version_unique
    unique (source_id, watermark_profile_id)
);

create unique index repository_video_one_active_asset_idx
on public.repository_video_assets (source_id)
where is_active;

create index repository_video_assets_processing_idx
on public.repository_video_assets (
  state,
  next_processing_attempt_at,
  updated_at
)
where state in ('uploading', 'uploaded', 'queued', 'processing', 'failed');


create table public.repository_video_events (
  id bigint generated always as identity primary key,
  video_asset_id uuid not null
    references public.repository_video_assets(id) on delete cascade,
  provider_event_id text,
  event_type text not null,
  previous_state text,
  next_state text,
  diagnostic jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  constraint repository_video_event_dedupe
    unique (video_asset_id, provider_event_id)
);

create index repository_video_events_asset_time_idx
on public.repository_video_events (video_asset_id, received_at desc);


create or replace function public.touch_repository_video_asset()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger touch_repository_watermark_profile_trigger
before update on public.repository_watermark_profiles
for each row
execute function public.touch_repository_video_asset();

create trigger touch_repository_video_source_trigger
before update on public.repository_video_sources
for each row
execute function public.touch_repository_video_asset();

create trigger touch_repository_video_asset_trigger
before update on public.repository_video_assets
for each row
execute function public.touch_repository_video_asset();


create or replace function public.activate_repository_video_asset(
  target_asset_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_source_id uuid;
begin
  select asset.source_id
  into target_source_id
  from public.repository_video_assets as asset
  where asset.id = target_asset_id
    and asset.state = 'ready'
  for update;

  if target_source_id is null then
    raise exception 'Ready repository video asset not found';
  end if;

  perform 1
  from public.repository_video_assets as asset
  where asset.source_id = target_source_id
  for update;

  update public.repository_video_assets
  set
    is_active = false,
    retired_at = coalesce(retired_at, now())
  where source_id = target_source_id
    and is_active;

  update public.repository_video_assets
  set
    is_active = true,
    activated_at = now(),
    retired_at = null
  where id = target_asset_id;
end;
$$;


create or replace function public.record_repository_video_event(
  target_provider text,
  target_provider_asset_id text,
  target_provider_event_id text,
  target_provider_event_at timestamptz,
  target_next_state text,
  target_duration_seconds numeric default null,
  target_width integer default null,
  target_height integer default null,
  target_error_code text default null,
  target_error_message text default null
)
returns table (
  video_asset_id uuid,
  event_applied boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_asset public.repository_video_assets%rowtype;
  inserted_event_id bigint;
begin
  if target_next_state not in ('processing', 'ready', 'failed') then
    raise exception 'Unsupported repository video webhook state';
  end if;

  select asset.*
  into current_asset
  from public.repository_video_assets as asset
  where asset.provider = target_provider
    and asset.provider_asset_id = target_provider_asset_id
  for update;

  if current_asset.id is null then
    raise exception 'Repository video asset not found';
  end if;

  insert into public.repository_video_events (
    video_asset_id,
    provider_event_id,
    event_type,
    previous_state,
    next_state,
    diagnostic
  )
  values (
    current_asset.id,
    target_provider_event_id,
    'provider_status',
    current_asset.state,
    target_next_state,
    jsonb_strip_nulls(
      jsonb_build_object(
        'duration_seconds', target_duration_seconds,
        'width', target_width,
        'height', target_height,
        'error_code', target_error_code,
        'error_message', target_error_message,
        'provider_event_at', target_provider_event_at
      )
    )
  )
  on conflict on constraint repository_video_event_dedupe do nothing
  returning id into inserted_event_id;

  if inserted_event_id is null then
    return query
    select current_asset.id, false;
    return;
  end if;

  -- A provider callback can race with an administrator retry or retirement.
  -- Once deletion has been claimed, no late callback may make the derivative
  -- playable again.
  if current_asset.state in ('deleting', 'deleted') then
    return query
    select current_asset.id, false;
    return;
  end if;

  if
    target_provider_event_at is null
    or (
      current_asset.last_provider_event_at is not null
      and target_provider_event_at <=
        current_asset.last_provider_event_at
    )
  then
    return query
    select current_asset.id, false;
    return;
  end if;

  update public.repository_video_assets
  set
    state = target_next_state,
    duration_seconds = coalesce(target_duration_seconds, duration_seconds),
    width = coalesce(target_width, width),
    height = coalesce(target_height, height),
    last_provider_event_at = target_provider_event_at,
    last_error_code = case
      when target_next_state = 'failed' then target_error_code
      else null
    end,
    last_error_message = case
      when target_next_state = 'failed' then target_error_message
      else null
    end
  where id = current_asset.id;

  if target_next_state = 'ready' then
    perform 1
    from public.repository_video_assets as asset
    where asset.source_id = current_asset.source_id
    for update;

    if not exists (
      select 1
      from public.repository_video_assets as asset
      where asset.source_id = current_asset.source_id
        and asset.is_active
    ) then
      update public.repository_video_assets
      set
        is_active = true,
        activated_at = now(),
        retired_at = null
      where id = current_asset.id;
    end if;
  end if;

  return query
  select current_asset.id, true;
end;
$$;


alter table public.repository_watermark_profiles enable row level security;
alter table public.repository_watermark_profiles force row level security;
alter table public.repository_video_sources enable row level security;
alter table public.repository_video_sources force row level security;
alter table public.repository_video_assets enable row level security;
alter table public.repository_video_assets force row level security;
alter table public.repository_video_events enable row level security;
alter table public.repository_video_events force row level security;

-- Browser roles never read provider identifiers, storage keys, processing
-- diagnostics or watermark configuration directly. Guarded server routes use
-- the service role after rechecking the caller against the content class.
revoke all privileges
on table
  public.repository_watermark_profiles,
  public.repository_video_sources,
  public.repository_video_assets,
  public.repository_video_events
from public, anon, authenticated;

revoke all privileges
on sequence public.repository_video_events_id_seq
from public, anon, authenticated;

grant all privileges
on table
  public.repository_watermark_profiles,
  public.repository_video_sources,
  public.repository_video_assets,
  public.repository_video_events
to service_role;

grant all privileges
on sequence public.repository_video_events_id_seq
to service_role;

revoke execute
on function public.touch_repository_video_asset(),
  public.activate_repository_video_asset(uuid),
  public.record_repository_video_event(text,text,text,timestamptz,text,numeric,integer,integer,text,text)
from public, anon, authenticated;

grant execute
on function public.touch_repository_video_asset(),
  public.activate_repository_video_asset(uuid),
  public.record_repository_video_event(text,text,text,timestamptz,text,numeric,integer,integer,text,text)
to service_role;


comment on table public.repository_watermark_profiles is
  'Immutable version records for provider watermark profiles; one version is selected for new processing.';

comment on table public.repository_video_sources is
  'Server-only references to clean, unwatermarked originals in private object storage. A non-null original_sha256 is client-declared until sha256_verified_at is set by a trusted verifier.';


comment on table public.repository_video_assets is
  'Versioned provider-neutral state for private, watermarked adaptive repository video derivatives.';

comment on table public.repository_video_events is
  'Idempotent provider event and processing diagnostic history for repository video assets.';


notify pgrst, 'reload schema';

commit;
