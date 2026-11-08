begin;

lock table public.content in share row exclusive mode;

do $preflight$
begin
  if to_regclass('public.content') is null then
    raise exception 'Required public.content table is missing';
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
    raise exception 'Existing content is not compatible with complete YouTube video pairs';
  end if;
end
$preflight$;

alter table public.content
  drop constraint if exists content_youtube_video_pair_check;

alter table public.content
  add constraint content_youtube_video_pair_check
  check (
    (
      video_provider is null
      and video_id is null
    )
    or (
      video_provider is not null
      and video_id is not null
      and video_provider = 'youtube'
      and video_id ~ '^[A-Za-z0-9_-]{11}$'
    )
  ) not valid;

alter table public.content
  validate constraint content_youtube_video_pair_check;

do $postflight$
declare
  pair_constraint_validated boolean;
begin
  select constraint_data.convalidated
  into pair_constraint_validated
  from pg_constraint as constraint_data
  where constraint_data.conrelid = 'public.content'::regclass
    and constraint_data.conname = 'content_youtube_video_pair_check'
    and constraint_data.contype = 'c';

  if pair_constraint_validated is distinct from true then
    raise exception 'Complete YouTube video-pair constraint postflight failed';
  end if;
end
$postflight$;

comment on constraint content_youtube_video_pair_check on public.content is
  'Repository videos are either absent or a complete YouTube provider and 11-character video identifier pair.';

notify pgrst, 'reload schema';

commit;
