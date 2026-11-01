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
          video_provider not in ('youtube', 'vimeo')
          or nullif(btrim(video_id), '') is null
        )
      )
  ) then
    raise exception 'Existing content has an invalid legacy video pairing';
  end if;
end
$preflight$;

alter table public.content
  drop constraint if exists content_video_provider_check;

alter table public.content
  alter column video_provider drop not null,
  alter column video_provider drop default,
  alter column video_id drop not null;

alter table public.content
  add constraint content_legacy_video_pair_check
  check (
    (
      video_provider is null
      and video_id is null
    )
    or (
      video_provider is not null
      and video_id is not null
      and
      video_provider in ('youtube', 'vimeo')
      and nullif(btrim(video_id), '') is not null
    )
  ) not valid;

alter table public.content
  validate constraint content_legacy_video_pair_check;

do $postflight$
declare
  provider_not_null boolean;
  provider_default text;
  video_id_not_null boolean;
  pair_constraint_validated boolean;
begin
  select attribute.attnotnull,
         pg_get_expr(default_value.adbin, default_value.adrelid)
  into provider_not_null, provider_default
  from pg_attribute as attribute
  left join pg_attrdef as default_value
    on default_value.adrelid = attribute.attrelid
   and default_value.adnum = attribute.attnum
  where attribute.attrelid = 'public.content'::regclass
    and attribute.attname = 'video_provider'
    and not attribute.attisdropped;

  select attribute.attnotnull
  into video_id_not_null
  from pg_attribute as attribute
  where attribute.attrelid = 'public.content'::regclass
    and attribute.attname = 'video_id'
    and not attribute.attisdropped;

  select constraint_data.convalidated
  into pair_constraint_validated
  from pg_constraint as constraint_data
  where constraint_data.conrelid = 'public.content'::regclass
    and constraint_data.conname = 'content_legacy_video_pair_check'
    and constraint_data.contype = 'c';

  if provider_not_null is distinct from false
     or provider_default is not null
     or video_id_not_null is distinct from false
     or pair_constraint_validated is distinct from true
  then
    raise exception 'Content legacy-video pairing postflight failed';
  end if;
end
$postflight$;

comment on constraint content_legacy_video_pair_check on public.content is
  'Legacy embeds are either absent or a complete YouTube/Vimeo provider and video identifier pair; private repository video metadata is stored separately.';

notify pgrst, 'reload schema';

commit;
