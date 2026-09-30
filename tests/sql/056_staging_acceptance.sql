-- Guarded staging-only semantic acceptance for migration 056.
--
-- The exact final exception is the success signal. PostgreSQL rolls back every
-- temporary content row, so this suite leaves no repository or member residue.
do $acceptance$
declare
  super_id uuid;
  denied_user_id uuid;
  target_class_id uuid;
  target_rank_id uuid;
  target_tier_id uuid;
  mux_content_id uuid;
  youtube_content_id uuid;
  mux_row record;
begin
  select id into super_id
  from public.profiles
  where registration_number = '0001'
    and account_status::text = 'active'
    and date_of_passing is null;

  select id into denied_user_id
  from public.profiles
  where registration_number in ('0101', '0002')
    and account_status::text = 'active'
    and date_of_passing is null
  order by case registration_number when '0101' then 0 else 1 end
  limit 1;

  if super_id is null or denied_user_id is null then
    raise exception 'Required staging security identities are missing';
  end if;

  perform set_config('request.jwt.claim.role', 'authenticated', false);
  perform set_config('request.jwt.claim.sub', denied_user_id::text, false);

  select class_record.id, rank_record.id, tier.id
  into target_class_id, target_rank_id, target_tier_id
  from public.classes as class_record
  join public.ranks as rank_record
    on rank_record.class_id = class_record.id
  join public.sub_ranks as tier
    on tier.rank_id = rank_record.id
  where class_record.is_active = true
    and not public.is_repository_uploader(class_record.id, denied_user_id)
  order by class_record.name, rank_record.sort_order, tier.sort_order
  limit 1;

  if target_class_id is null or target_rank_id is null or target_tier_id is null then
    raise exception 'A non-uploader staging class/rank/tier fixture is required';
  end if;

  begin
    perform public.create_repository_mux_content(
      denied_user_id,
      target_class_id,
      target_rank_id,
      target_tier_id,
      '__MUX_056_DENIED__',
      'must not persist',
      'MuxPlaybackDenied056',
      'MuxAssetDenied056',
      540001
    );
    raise exception 'Non-uploader unexpectedly created Mux repository content';
  exception when insufficient_privilege then
    null;
  end;

  perform set_config('request.jwt.claim.sub', super_id::text, false);
  perform set_config('request.jwt.claim.role', 'service_role', false);

  mux_content_id := public.create_repository_mux_content(
    super_id,
    target_class_id,
    target_rank_id,
    target_tier_id,
    '__MUX_056_ROLLBACK__',
    'rollback-contained signed playback acceptance',
    'MuxPlaybackFixture056',
    'MuxAssetFixture056',
    540002
  );

  if public.create_repository_mux_content(
       super_id,
       target_class_id,
       target_rank_id,
       target_tier_id,
       '__MUX_056_ROLLBACK_RETRY__',
       'idempotent retry',
       'MuxPlaybackFixture056',
       'MuxAssetFixture056',
       540099
     ) is distinct from mux_content_id
  then
    raise exception 'Mux Draft retry was not idempotent';
  end if;

  select * into mux_row
  from public.content
  where id = mux_content_id;

  if mux_row.video_provider is distinct from 'mux'
     or mux_row.video_id is distinct from 'MuxPlaybackFixture056'
     or mux_row.video_asset_id is distinct from 'MuxAssetFixture056'
     or mux_row.status::text is distinct from 'draft'
     or mux_row.created_by is distinct from super_id
  then
    raise exception 'Mux Draft did not preserve the server-pinned provider contract';
  end if;

  perform set_config('request.jwt.claim.role', 'authenticated', false);
  begin
    perform public.update_repository_content(
      mux_content_id,
      '__MUX_056_MUTATION_DENIED__',
      'must not replace playback identity',
      'mux',
      'DifferentMuxPlayback056',
      'draft',
      540005
    );
    raise exception 'Browser update unexpectedly replaced a server-managed Mux identifier';
  exception when others then
    if sqlerrm <> 'Mux provider identifiers are server-managed' then
      raise;
    end if;
  end;

  perform public.update_repository_content(
    mux_content_id,
    '__MUX_056_METADATA_UPDATE__',
    'metadata remains editable',
    'mux',
    'MuxPlaybackFixture056',
    'published',
    540006
  );

  if not exists (
    select 1 from public.content
    where id = mux_content_id
      and title = '__MUX_056_METADATA_UPDATE__'
      and status::text = 'published'
      and video_id = 'MuxPlaybackFixture056'
      and video_asset_id = 'MuxAssetFixture056'
  ) then
    raise exception 'Authorized Mux metadata update failed or changed provider identity';
  end if;

  perform set_config('request.jwt.claim.role', 'service_role', false);

  youtube_content_id := public.create_repository_content(
    target_class_id,
    target_rank_id,
    target_tier_id,
    '__YOUTUBE_056_ROLLBACK__',
    'legacy compatibility acceptance',
    'youtube',
    'dQw4w9WgXcQ',
    'draft',
    540003
  );

  if not exists (
    select 1
    from public.content
    where id = youtube_content_id
      and video_provider = 'youtube'
      and video_id = 'dQw4w9WgXcQ'
      and video_asset_id is null
  ) then
    raise exception 'Legacy YouTube compatibility was not preserved';
  end if;

  begin
    insert into public.content (
      class_id, rank_id, sub_rank_id, title, video_provider, video_id,
      video_asset_id, status, sort_order, created_by
    ) values (
      target_class_id, target_rank_id, target_tier_id,
      '__MUX_056_INCOMPLETE__', 'mux', 'MuxPlaybackFixture056', null,
      'draft'::public.content_status, 540004, super_id
    );
    raise exception 'Incomplete Mux provider pair unexpectedly passed the constraint';
  exception when check_violation then
    null;
  end;

  raise exception 'ROLLBACK-CONTAINED PASS: migration 056 Mux repository acceptance';
end
$acceptance$;
