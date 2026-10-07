create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;

create function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.current_uid', true), '')::uuid
$$;

create function auth.role()
returns text
language sql
stable
as $$
  select nullif(current_setting('app.current_role', true), '')
$$;

create type public.content_status as enum ('draft', 'published');

create table public.profiles (
  id uuid primary key,
  registration_number text,
  full_name text not null,
  account_status text not null default 'active',
  date_of_passing date,
  is_super_admin boolean not null default false
);

create table public.classes (
  id uuid primary key,
  name text not null,
  is_active boolean not null default true
);

create table public.ranks (
  id uuid primary key,
  class_id uuid not null references public.classes(id),
  name text not null
);

create table public.sub_ranks (
  id uuid primary key,
  rank_id uuid not null references public.ranks(id),
  name text not null
);

create table public.content (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id),
  rank_id uuid not null references public.ranks(id),
  sub_rank_id uuid not null references public.sub_ranks(id),
  title text not null,
  description text,
  video_provider text,
  video_id text,
  status public.content_status not null default 'draft',
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

alter table public.content enable row level security;
alter table public.content force row level security;

grant select on public.content to authenticated;

create policy "members read published repository content"
on public.content
for select
to authenticated
using (status = 'published');

create policy "repository managers read all content"
on public.content
for select
to authenticated
using (true);

create function public.is_active_app_user(target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path to public, pg_temp
as $$
  select target_user_id is not null
     and exists (
       select 1
       from public.profiles as profile
       where profile.id = target_user_id
         and profile.account_status = 'active'
         and profile.date_of_passing is null
     )
$$;

create function public.is_super_admin(target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path to public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles as profile
    where profile.id = target_user_id
      and profile.is_super_admin
  )
$$;

create function public.create_repository_content(
  target_class uuid,
  target_rank uuid,
  target_sub_rank uuid,
  content_title text,
  content_description text,
  provider text,
  provider_video_id text,
  content_status text,
  content_sort_order integer
)
returns uuid
language sql
as $$ select null::uuid $$;

create function public.update_repository_content(
  target_content uuid,
  content_title text,
  content_description text,
  provider text,
  provider_video_id text,
  content_status text,
  content_sort_order integer
)
returns void
language sql
as $$ select $$;

create function public.delete_repository_content(target_content uuid)
returns void
language sql
as $$ select $$;

insert into public.profiles (
  id,
  registration_number,
  full_name,
  is_super_admin
) values
  ('00000000-0000-0000-0000-000000000001', '0001', 'Super Admin', true),
  ('00000000-0000-0000-0000-000000000002', '0101', 'Ordinary Member', false),
  ('00000000-0000-0000-0000-000000000003', '0002', 'Unappointed Admin', false);

insert into public.classes (id, name) values
  ('10000000-0000-0000-0000-000000000001', 'Aikido'),
  ('10000000-0000-0000-0000-000000000002', 'Karate');

insert into public.classes (id, name, is_active) values
  ('10000000-0000-0000-0000-000000000003', 'Inactive Class', false);

insert into public.ranks (id, class_id, name) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Aikido Rank'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Karate Rank');

insert into public.sub_ranks (id, rank_id, name) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Aikido Tier'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'Karate Tier');
