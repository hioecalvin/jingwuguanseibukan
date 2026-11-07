-- Additive authoring guard. Preserve legacy video data and playback.
-- Apply inside the target-bound migration transaction after 062.
lock table public.content in share row exclusive mode;
do $$ begin
  if to_regprocedure('public.create_repository_mux_content(uuid,uuid,uuid,uuid,text,text,text,text,integer)') is null
    or to_regprocedure('public.update_repository_content(uuid,text,text,text,text,text,integer)') is null then
    raise exception 'Mux repository migration is required';
  end if;
end $$;

create function public.enforce_mux_only_repository_authoring()
returns trigger language plpgsql set search_path = pg_catalog as $$
begin
  if new.video_provider = 'youtube' then
    if tg_op = 'INSERT' then
      raise exception using errcode = '23514', message = 'New repository videos must use Mux';
    end if;
    if old.video_provider is distinct from 'youtube'
      or new.video_id is distinct from old.video_id
      or new.video_asset_id is distinct from old.video_asset_id then
      raise exception using errcode = '23514', message = 'YouTube video authoring is disabled';
    end if;
    if new.status::text = 'published' and old.status::text is distinct from 'published' then
      raise exception using errcode = '23514', message = 'Publish this video through the Mux uploader';
    end if;
  end if;
  return new;
end $$;
alter function public.enforce_mux_only_repository_authoring() owner to postgres;
revoke all on function public.enforce_mux_only_repository_authoring()
  from public, anon, authenticated, service_role;
-- AFTER sees the final row even if another BEFORE trigger normalizes input.
create trigger enforce_mux_only_repository_authoring
after insert or update on public.content
for each row execute function public.enforce_mux_only_repository_authoring();
comment on function public.enforce_mux_only_repository_authoring() is
  'Reject new/replaced YouTube pairs and new publication of legacy YouTube drafts; retain existing published playback and metadata edits.';
