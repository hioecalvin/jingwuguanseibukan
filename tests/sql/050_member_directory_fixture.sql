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

create table public.profiles (
  id uuid primary key,
  full_name text not null,
  email text not null,
  phone text not null,
  avatar_url text,
  instagram_username text,
  account_status text not null default 'active',
  date_of_passing date
);

create table public.classes (
  id uuid primary key,
  name text not null,
  is_active boolean not null default true
);

create table public.dojos (
  id uuid primary key,
  name text not null
);

create table public.ranks (
  id uuid primary key,
  name text not null
);

create table public.sub_ranks (
  id uuid primary key,
  name text not null
);

create table public.class_memberships (
  id uuid primary key,
  user_id uuid not null references public.profiles(id),
  class_id uuid not null references public.classes(id),
  dojo_id uuid references public.dojos(id),
  rank_id uuid references public.ranks(id),
  sub_rank_id uuid references public.sub_ranks(id),
  status text not null
);

create function public.is_active_app_user(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path to public, pg_temp
as $$
  select target_user_id = auth.uid()
     and exists (
       select 1
       from public.profiles as profile
       where profile.id = target_user_id
         and profile.account_status = 'active'
         and profile.date_of_passing is null
     )
$$;

insert into public.classes (id, name) values
  ('10000000-0000-0000-0000-000000000001', 'Aikido'),
  ('10000000-0000-0000-0000-000000000002', 'Karate');

insert into public.dojos (id, name) values
  ('20000000-0000-0000-0000-000000000001', 'Kagami'),
  ('20000000-0000-0000-0000-000000000002', 'Chushin');

insert into public.ranks (id, name) values
  ('30000000-0000-0000-0000-000000000001', '5th Kyu');

insert into public.sub_ranks (id, name) values
  ('40000000-0000-0000-0000-000000000001', 'Blue Belt');

insert into public.profiles (
  id, full_name, email, phone, instagram_username, account_status, date_of_passing
) values
  ('00000000-0000-0000-0000-000000000001', 'Caller Member', 'caller@example.test', '0810000001', 'caller', 'active', null),
  ('00000000-0000-0000-0000-000000000002', 'Other Dojo Member', 'other@example.test', '0810000002', 'other', 'active', null),
  ('00000000-0000-0000-0000-000000000003', 'Karate Member', 'karate@example.test', '0810000003', null, 'active', null),
  ('00000000-0000-0000-0000-000000000004', 'Terminated Member', 'terminated@example.test', '0810000004', null, 'active', null),
  ('00000000-0000-0000-0000-000000000005', 'Deceased Member', 'deceased@example.test', '0810000005', null, 'disabled', '2026-01-01'),
  ('00000000-0000-0000-0000-000000000006', 'Record Only Member', 'record@example.test', '0810000006', null, 'active', null);

insert into public.class_memberships (
  id, user_id, class_id, dojo_id, rank_id, sub_rank_id, status
) values
  ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'active'),
  ('50000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', null, 'break_1'),
  ('50000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', null, null, 'active'),
  ('50000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', null, null, 'inactive'),
  ('50000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', null, null, 'active'),
  ('50000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', null, null, 'active');
