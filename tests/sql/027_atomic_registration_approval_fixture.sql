create role anon nologin;
create role authenticated nologin;
create role service_role nologin;

create extension if not exists pgcrypto;
create schema auth;

create function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.current_uid', true), '')::uuid
$$;

create type public.request_status as enum ('pending', 'approved', 'rejected');
create type public.membership_level as enum ('mudansha', 'yudansha');

create table public.profiles (
  id uuid primary key,
  email text not null
);

create table public.classes (
  id uuid primary key,
  name text not null
);

create table public.class_requests (
  id uuid primary key,
  user_id uuid not null references public.profiles(id),
  class_id uuid not null references public.classes(id),
  dojo_id uuid,
  status public.request_status not null default 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  rejection_reason text
);

create table public.class_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  class_id uuid not null references public.classes(id),
  dojo_id uuid,
  status text not null,
  level public.membership_level not null,
  role text not null,
  updated_at timestamptz not null default clock_timestamp(),
  unique (user_id, class_id)
);

create table public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  recipient_email text not null,
  event_type text not null,
  subject text not null,
  payload jsonb not null
);

create function public.is_super_admin()
returns boolean
language sql
stable
as $$
  select auth.uid() = '00000000-0000-0000-0000-000000000001'::uuid
$$;

create function public.is_class_admin(target_class_id uuid, target_dojo_id uuid)
returns boolean
language sql
stable
as $$
  select auth.uid() = '00000000-0000-0000-0000-000000000002'::uuid
    and target_class_id = '10000000-0000-0000-0000-000000000001'::uuid
    and target_dojo_id in (
      '20000000-0000-0000-0000-000000000001'::uuid,
      '20000000-0000-0000-0000-000000000002'::uuid
    )
$$;

create function public.review_class_request(
  request_id uuid,
  decision public.request_status,
  reason text default null
)
returns void
language plpgsql
security definer
set search_path to public, pg_temp
as $$ begin null; end $$;

insert into public.classes (id, name) values
  ('10000000-0000-0000-0000-000000000001', 'Japanese Class'),
  ('10000000-0000-0000-0000-000000000002', 'Other Class');

insert into public.profiles (id, email) values
  ('30000000-0000-0000-0000-000000000001', 'approval@example.test'),
  ('30000000-0000-0000-0000-000000000002', 'rejection@example.test'),
  ('30000000-0000-0000-0000-000000000003', 'unauthorised@example.test'),
  ('30000000-0000-0000-0000-000000000004', 'rollback@example.test'),
  ('30000000-0000-0000-0000-000000000005', 'existing@example.test');

insert into public.class_requests (id, user_id, class_id, dojo_id) values
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002');

insert into public.class_memberships (
  id, user_id, class_id, dojo_id, status, level, role
) values (
  '50000000-0000-0000-0000-000000000005',
  '30000000-0000-0000-0000-000000000005',
  '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'inactive',
  'mudansha',
  'user'
);
