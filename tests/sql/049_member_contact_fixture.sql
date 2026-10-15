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

create table auth.users (
  id uuid primary key,
  email text not null
);

create table public.profiles (
  id uuid primary key,
  email text not null,
  phone text not null,
  account_status text not null default 'active',
  date_of_passing date
);

create unique index profiles_email_normalized_uidx
on public.profiles (lower(btrim(email)));

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

insert into public.profiles (
  id,
  email,
  phone,
  account_status
) values
  ('00000000-0000-0000-0000-000000000001', 'member@example.test', '0812345678', 'active'),
  ('00000000-0000-0000-0000-000000000002', 'other@example.test', '0811111111', 'active'),
  ('00000000-0000-0000-0000-000000000003', 'disabled@example.test', '0822222222', 'disabled');

insert into auth.users (id, email)
select id, email
from public.profiles;
