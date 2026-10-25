-- Synthetic permissive grants isolate trigger enforcement from production RLS.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create table public.content (
  id uuid primary key, title text not null, description text,
  status text not null check(status in ('draft','published','archived')),
  video_provider text, video_id text, video_asset_id text
);
-- Existing migration 056 pair constraint.
alter table public.content add constraint content_video_provider_pair_check check (
  (video_provider is null and video_id is null and video_asset_id is null)
  or (video_provider='youtube' and video_id is not null
    and video_id ~ '^[A-Za-z0-9_-]{11}$' and video_asset_id is null)
  or (video_provider='mux' and video_id is not null
    and video_id ~ '^[A-Za-z0-9_-]{10,255}$' and video_asset_id is not null
    and video_asset_id ~ '^[A-Za-z0-9_-]{10,255}$')
);
insert into public.content values
 ('00000000-0000-4000-8000-000000000001','Legacy published','Retained description','published','youtube','abcdefghijk',null),
 ('00000000-0000-4000-8000-000000000002','Legacy draft',null,'draft','youtube','lmnopqrstuv',null),
 ('00000000-0000-4000-8000-000000000003','Empty draft',null,'draft',null,null,null),
 ('00000000-0000-4000-8000-000000000004','Mux published',null,'published','mux','muxPlayback01','muxAsset01a');
alter table public.content enable row level security;
grant select,insert,update on public.content to authenticated,service_role;
create policy synthetic_writes on public.content to authenticated using(true) with check(true);
-- Signature stubs only; this suite does not validate application RPC behavior.
create function public.create_repository_mux_content(uuid,uuid,uuid,uuid,text,text,text,text,integer)
returns void language sql as $$ select; $$;
create function public.update_repository_content(uuid,text,text,text,text,text,integer)
returns void language sql as $$ select; $$;
