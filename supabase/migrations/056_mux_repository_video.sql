begin;

lock table public.content in share row exclusive mode;

do $preflight$
begin
  if pg_catalog.to_regclass('public.content') is null
     or pg_catalog.to_regprocedure('public.is_repository_uploader(uuid,uuid)') is null
  then
    raise exception 'Required repository objects are missing';
  end if;

  if exists (
    select 1
    from public.content
    where
      (video_provider is null) <> (video_id is null)
      or (
        video_provider is not null
        and (
          video_provider <> 'youtube'
          or video_id !~ '^[A-Za-z0-9_-]{11}$'
        )
      )
  ) then
    raise exception 'Existing repository videos are not compatible with the Mux transition';
  end if;
end
$preflight$;

alter table public.content
  add column if not exists video_asset_id text;

alter table public.content
  drop constraint if exists content_youtube_video_pair_check;

alter table public.content
  drop constraint if exists content_video_provider_pair_check;

alter table public.content
  add constraint content_video_provider_pair_check
  check (
    (
      video_provider is null
      and video_id is null
      and video_asset_id is null
    )
    or (
      video_provider = 'youtube'
      and video_id ~ '^[A-Za-z0-9_-]{11}$'
      and video_asset_id is null
    )
    or (
      video_provider = 'mux'
      and video_id ~ '^[A-Za-z0-9_-]{10,255}$'
      and video_asset_id ~ '^[A-Za-z0-9_-]{10,255}$'
    )
  ) not valid;

alter table public.content
  validate constraint content_video_provider_pair_check;

create unique index if not exists content_mux_asset_unique
on public.content (video_asset_id)
where video_asset_id is not null;

create or replace function public.update_repository_content(
  target_content uuid,
  content_title text,
  content_description text,
  provider text,
  provider_video_id text,
  content_status text,
  content_sort_order integer
)
returns void
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  content_row public.content%rowtype;
begin
  select item.*
  into content_row
  from public.content as item
  where item.id = target_content
  for update;

  if not found then
    raise exception 'Content not found';
  end if;

  if not public.is_repository_uploader(content_row.class_id, auth.uid()) then
    raise exception using
      errcode = '42501',
      message = 'Not authorised to upload for this class';
  end if;

  if content_row.video_provider = 'mux'
     and (
       nullif(trim(provider), '') is distinct from 'mux'
       or nullif(trim(provider_video_id), '') is distinct from content_row.video_id
     )
  then
    raise exception 'Mux provider identifiers are server-managed';
  end if;

  update public.content
  set
    title = trim(content_title),
    description = nullif(trim(content_description), ''),
    video_provider = nullif(trim(provider), ''),
    video_id = nullif(trim(provider_video_id), ''),
    status = content_status::public.content_status,
    sort_order = content_sort_order,
    updated_at = now()
  where id = target_content;
end;
$function$;

alter function public.update_repository_content(uuid,text,text,text,text,text,integer)
  owner to postgres;

create or replace function public.create_repository_mux_content(
  target_creator uuid,
  target_class uuid,
  target_rank uuid,
  target_sub_rank uuid,
  content_title text,
  content_description text,
  mux_playback_id text,
  mux_asset_id text,
  content_sort_order integer
)
returns uuid
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  new_content_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using
      errcode = '42501',
      message = 'Service role required';
  end if;

  if target_creator is null
     or not public.is_repository_uploader(target_class, target_creator)
  then
    raise exception using
      errcode = '42501',
      message = 'Not authorised to upload for this class';
  end if;

  if not exists (
    select 1
    from public.ranks as rank_record
    where rank_record.id = target_rank
      and rank_record.class_id = target_class
  ) then
    raise exception 'Rank does not belong to selected class';
  end if;

  if not exists (
    select 1
    from public.sub_ranks as tier
    where tier.id = target_sub_rank
      and tier.rank_id = target_rank
  ) then
    raise exception 'Tier does not belong to selected rank';
  end if;

  if nullif(trim(content_title), '') is null
     or char_length(trim(content_title)) > 100
  then
    raise exception 'Title must contain 1 to 100 characters';
  end if;

  if char_length(coalesce(trim(content_description), '')) > 5000 then
    raise exception 'Description must contain 5,000 characters or fewer';
  end if;

  if mux_playback_id !~ '^[A-Za-z0-9_-]{10,255}$'
     or mux_asset_id !~ '^[A-Za-z0-9_-]{10,255}$'
  then
    raise exception 'Mux identifiers are invalid';
  end if;

  if content_sort_order is null
     or content_sort_order < 0
     or content_sort_order > 1000000
  then
    raise exception 'Sort order is invalid';
  end if;

  insert into public.content (
    class_id,
    rank_id,
    sub_rank_id,
    title,
    description,
    video_provider,
    video_id,
    video_asset_id,
    status,
    sort_order,
    created_by
  ) values (
    target_class,
    target_rank,
    target_sub_rank,
    trim(content_title),
    nullif(trim(content_description), ''),
    'mux',
    mux_playback_id,
    mux_asset_id,
    'draft'::public.content_status,
    content_sort_order,
    target_creator
  )
  on conflict (video_asset_id) where video_asset_id is not null
  do nothing
  returning id into new_content_id;

  if new_content_id is null then
    select content_record.id
    into new_content_id
    from public.content as content_record
    where content_record.video_asset_id = mux_asset_id
      and content_record.video_provider = 'mux'
      and content_record.video_id = mux_playback_id
      and content_record.class_id = target_class
      and content_record.rank_id = target_rank
      and content_record.sub_rank_id = target_sub_rank
      and content_record.created_by = target_creator;

    if new_content_id is null then
      raise exception 'Mux asset is already bound to different repository content';
    end if;
  end if;

  return new_content_id;
end;
$function$;

alter function public.create_repository_mux_content(uuid,uuid,uuid,uuid,text,text,text,text,integer)
  owner to postgres;

revoke all
on function public.create_repository_mux_content(uuid,uuid,uuid,uuid,text,text,text,text,integer)
from public, anon, authenticated, service_role;

grant execute
on function public.create_repository_mux_content(uuid,uuid,uuid,uuid,text,text,text,text,integer)
to service_role;

comment on column public.content.video_asset_id is
  'Server-managed provider asset identifier. Mux playback uses the separate signed-policy playback ID stored in video_id.';

comment on constraint content_video_provider_pair_check on public.content is
  'Preserves legacy YouTube references while requiring complete Mux asset and signed-playback identifiers for new Mux video content.';

comment on function public.create_repository_mux_content(uuid,uuid,uuid,uuid,text,text,text,text,integer) is
  'Service-only finalization of a verified Mux Direct Upload for an active class-scoped Repository Uploader.';

comment on function public.update_repository_content(uuid,text,text,text,text,text,integer) is
  'Updates authorized repository metadata while keeping Mux asset and signed-playback identifiers server-managed and immutable.';

do $postflight$
declare
  pair_constraint_validated boolean;
begin
  select constraint_data.convalidated
  into pair_constraint_validated
  from pg_catalog.pg_constraint as constraint_data
  where constraint_data.conrelid = 'public.content'::pg_catalog.regclass
    and constraint_data.conname = 'content_video_provider_pair_check'
    and constraint_data.contype = 'c';

  if pair_constraint_validated is distinct from true then
    raise exception 'Mux repository video constraint postflight failed';
  end if;

  if pg_catalog.has_function_privilege(
       'anon',
       'public.create_repository_mux_content(uuid,uuid,uuid,uuid,text,text,text,text,integer)',
       'EXECUTE'
     )
     or pg_catalog.has_function_privilege(
       'authenticated',
       'public.create_repository_mux_content(uuid,uuid,uuid,uuid,text,text,text,text,integer)',
       'EXECUTE'
     )
     or not pg_catalog.has_function_privilege(
       'service_role',
       'public.create_repository_mux_content(uuid,uuid,uuid,uuid,text,text,text,text,integer)',
       'EXECUTE'
     )
  then
    raise exception 'Mux repository content RPC ACL is unsafe';
  end if;
end
$postflight$;

notify pgrst, 'reload schema';

commit;
