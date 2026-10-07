create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create extension if not exists pgcrypto;
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

create table public.profiles (
  id uuid primary key,
  full_name text not null,
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
  class_id uuid not null references public.classes(id),
  name text not null,
  active boolean not null default true
);

create table public.class_memberships (
  id uuid primary key,
  user_id uuid not null references public.profiles(id),
  class_id uuid not null references public.classes(id),
  dojo_id uuid references public.dojos(id),
  status text not null default 'active'
);

create table public.dojo_admin_assignments (
  user_id uuid not null references public.profiles(id),
  class_id uuid not null references public.classes(id),
  dojo_id uuid not null references public.dojos(id),
  active boolean not null default true,
  primary key (user_id, dojo_id)
);

create function public.is_active_app_user(target_user_id uuid default auth.uid())
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

create function public.is_class_admin(
  target_class uuid,
  target_dojo uuid default null,
  uid uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path to public, pg_temp
as $$
  select uid = auth.uid()
     and (
       uid = '00000000-0000-0000-0000-000000000001'::uuid
       or exists (
         select 1
         from public.dojo_admin_assignments as assignment
         where assignment.user_id = uid
           and assignment.class_id = target_class
           and assignment.dojo_id = target_dojo
           and assignment.active = true
       )
     )
$$;

insert into public.profiles (id, full_name) values
  ('00000000-0000-0000-0000-000000000001', 'Super Admin'),
  ('00000000-0000-0000-0000-000000000002', 'North Admin'),
  ('00000000-0000-0000-0000-000000000003', 'Aikido Instructor'),
  ('00000000-0000-0000-0000-000000000004', 'Ordinary Member'),
  ('00000000-0000-0000-0000-000000000005', 'Karate Instructor');

insert into public.classes (id, name) values
  ('10000000-0000-0000-0000-000000000001', 'Aikido'),
  ('10000000-0000-0000-0000-000000000002', 'Karate');

insert into public.dojos (id, class_id, name) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'North Dojo'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'South Dojo'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'West Dojo');

insert into public.class_memberships (id, user_id, class_id, dojo_id) values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002'),
  ('30000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000003');

insert into public.dojo_admin_assignments (user_id, class_id, dojo_id) values
  ('00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001');
