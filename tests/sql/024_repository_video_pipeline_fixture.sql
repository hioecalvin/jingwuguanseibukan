\set ON_ERROR_STOP on

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end;
$$;

create schema auth;
create schema storage;

create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

create table public.profiles (
  id uuid primary key
);

create type public.content_status as enum (
  'draft',
  'published'
);

create table public.content (
  id uuid primary key,
  class_id uuid not null,
  status public.content_status not null
);

\ir ../../supabase/migrations/024_repository_video_pipeline.sql

insert into public.profiles (id)
values ('00000000-0000-4000-8000-000000000001');

insert into public.content (id, class_id, status)
values (
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000003',
  'published'
);

insert into public.repository_watermark_profiles (
  id,
  provider,
  provider_profile_id,
  version,
  logo_storage_key,
  active,
  created_by
)
values
  (
    '00000000-0000-4000-8000-000000000010',
    'cloudflare-stream',
    'watermark-v1',
    1,
    'branding/watermark-v1.png',
    true,
    '00000000-0000-4000-8000-000000000001'
  ),
  (
    '00000000-0000-4000-8000-000000000011',
    'cloudflare-stream',
    'watermark-v2',
    2,
    'branding/watermark-v2.png',
    false,
    '00000000-0000-4000-8000-000000000001'
  );

insert into public.repository_video_sources (
  id,
  content_id,
  original_storage_key,
  original_sha256,
  original_size_bytes,
  original_content_type,
  created_by
)
values (
  '00000000-0000-4000-8000-000000000020',
  '00000000-0000-4000-8000-000000000002',
  'repository/original-unit.mp4',
  repeat('a', 64),
  1024,
  'video/mp4',
  '00000000-0000-4000-8000-000000000001'
);

insert into public.repository_video_assets (
  id,
  source_id,
  watermark_profile_id,
  provider,
  provider_asset_id,
  state,
  created_by
)
values
  (
    '00000000-0000-4000-8000-000000000030',
    '00000000-0000-4000-8000-000000000020',
    '00000000-0000-4000-8000-000000000010',
    'cloudflare-stream',
    'provider-asset-v1',
    'uploading',
    '00000000-0000-4000-8000-000000000001'
  ),
  (
    '00000000-0000-4000-8000-000000000031',
    '00000000-0000-4000-8000-000000000020',
    '00000000-0000-4000-8000-000000000011',
    'cloudflare-stream',
    'provider-asset-v2',
    'uploading',
    '00000000-0000-4000-8000-000000000001'
  );

select *
from public.record_repository_video_event(
  'cloudflare-stream',
  'provider-asset-v1',
  'event-v1-processing',
  '2026-09-08T00:00:00Z',
  'processing',
  null,
  null,
  null,
  null,
  null
);

select *
from public.record_repository_video_event(
  'cloudflare-stream',
  'provider-asset-v1',
  'event-v1-processing',
  '2026-09-08T00:00:00Z',
  'processing',
  null,
  null,
  null,
  null,
  null
);

select *
from public.record_repository_video_event(
  'cloudflare-stream',
  'provider-asset-v1',
  'event-v1-ready',
  '2026-09-08T00:01:00Z',
  'ready',
  12.5,
  1920,
  1080,
  null,
  null
);

select *
from public.record_repository_video_event(
  'cloudflare-stream',
  'provider-asset-v1',
  'event-v1-stale-failure',
  '2026-09-08T00:00:30Z',
  'failed',
  null,
  null,
  null,
  'STALE',
  'This delayed event must not regress the asset.'
);

select *
from public.record_repository_video_event(
  'cloudflare-stream',
  'provider-asset-v2',
  'event-v2-ready',
  '2026-09-08T00:02:00Z',
  'ready',
  12.5,
  1920,
  1080,
  null,
  null
);

do $$
begin
  if not exists (
    select 1
    from storage.buckets
    where id = 'repository-video-originals'
      and public = false
      and file_size_limit = 2147483648
  ) then
    raise exception 'Private original bucket configuration failed';
  end if;

  if (
    select count(*)
    from public.repository_video_events
    where provider_event_id = 'event-v1-processing'
  ) <> 1 then
    raise exception 'Webhook event deduplication failed';
  end if;

  if not (
    select is_active
    from public.repository_video_assets
    where provider_asset_id = 'provider-asset-v1'
  ) then
    raise exception 'First ready derivative was not activated';
  end if;

  if (
    select state <> 'ready'
      or last_error_code is not null
    from public.repository_video_assets
    where provider_asset_id = 'provider-asset-v1'
  ) then
    raise exception 'Out-of-order webhook regressed a ready derivative';
  end if;

  if (
    select is_active
    from public.repository_video_assets
    where provider_asset_id = 'provider-asset-v2'
  ) then
    raise exception 'Replacement derivative activated before approval';
  end if;
end;
$$;

do $$
begin
  begin
    delete from public.content
    where id = '00000000-0000-4000-8000-000000000002';
    raise exception 'Content deletion bypassed managed provider cleanup';
  exception
    when foreign_key_violation then
      null;
  end;
end;
$$;

select public.activate_repository_video_asset(
  '00000000-0000-4000-8000-000000000031'
);

update public.repository_video_assets
set state = 'deleting'
where id = '00000000-0000-4000-8000-000000000030';

select *
from public.record_repository_video_event(
  'cloudflare-stream',
  'provider-asset-v1',
  'event-v1-late-after-delete-claim',
  '2026-09-08T00:03:00Z',
  'ready',
  12.5,
  1920,
  1080,
  null,
  null
);

do $$
begin
  if (
    select count(*)
    from public.repository_video_assets
    where source_id = '00000000-0000-4000-8000-000000000020'
      and is_active
  ) <> 1 then
    raise exception 'Atomic activation count failed';
  end if;

  if not (
    select is_active
    from public.repository_video_assets
    where id = '00000000-0000-4000-8000-000000000031'
  ) then
    raise exception 'Replacement derivative activation failed';
  end if;

  if exists (
    select 1
    from public.repository_video_assets
    where id = '00000000-0000-4000-8000-000000000030'
      and (is_active or retired_at is null)
  ) then
    raise exception 'Previous derivative retirement failed';
  end if;

  if (
    select state <> 'deleting'
      or is_active
    from public.repository_video_assets
    where id = '00000000-0000-4000-8000-000000000030'
  ) then
    raise exception 'Late provider event revived a deletion-claimed derivative';
  end if;

  if has_table_privilege(
    'authenticated',
    'public.repository_video_assets',
    'select'
  ) then
    raise exception 'Browser video asset privilege leaked';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.record_repository_video_event(text,text,text,timestamptz,text,numeric,integer,integer,text,text)',
    'execute'
  ) then
    raise exception 'Browser webhook RPC privilege leaked';
  end if;

  if not has_function_privilege(
    'service_role',
    'public.record_repository_video_event(text,text,text,timestamptz,text,numeric,integer,integer,text,text)',
    'execute'
  ) then
    raise exception 'Service webhook RPC privilege missing';
  end if;
end;
$$;

select 'VIDEO_PIPELINE_RUNTIME_PASS';
