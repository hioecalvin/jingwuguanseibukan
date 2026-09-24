create schema auth;
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;

create table auth.users (
  id uuid primary key,
  email text not null,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  email_confirmed_at timestamptz
);

create type public.request_status as enum ('pending', 'approved', 'rejected');
create type public.membership_level as enum ('mudansha', 'yudansha');

create table public.profiles (
  id uuid primary key,
  registration_number text,
  aikikai_registration_number text,
  full_name text not null,
  email text not null,
  phone text,
  date_of_birth date,
  email_verified boolean not null default false,
  is_super_admin boolean not null default false,
  updated_at timestamptz not null default clock_timestamp()
);

create unique index profiles_registration_number_normalized_uidx
  on public.profiles ((upper(regexp_replace(btrim(registration_number), '\s+', '', 'g'))))
  where registration_number is not null;

create unique index profiles_aikikai_registration_number_unique
  on public.profiles (lower(btrim(aikikai_registration_number)))
  where aikikai_registration_number is not null
    and btrim(aikikai_registration_number) <> '';

create table public.classes (
  id uuid primary key,
  name text not null
);

create table public.dojos (
  id uuid primary key,
  name text not null
);

create table public.class_requests (
  id uuid primary key,
  user_id uuid not null references public.profiles(id),
  class_id uuid not null references public.classes(id),
  dojo_id uuid references public.dojos(id),
  status public.request_status not null default 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default clock_timestamp()
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
  user_id uuid not null references public.profiles(id),
  recipient_email text not null,
  event_type text not null,
  subject text not null,
  payload jsonb not null
);

create function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create function public.is_super_admin(
  uid uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path to public, pg_temp
as $$
  select coalesce((
    select profile.is_super_admin
    from public.profiles as profile
    where profile.id = uid
  ), false)
$$;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to public, pg_temp
as $$
begin
  insert into public.profiles(
    id, full_name, email, phone, date_of_birth, email_verified
  )
  values(
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    new.raw_user_meta_data->>'phone',
    (new.raw_user_meta_data->>'date_of_birth')::date,
    (new.email_confirmed_at is not null)
  );
  return new;
end
$$;

create trigger jwg_profile_on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

create function public.review_class_request_with_level(
  target_request_id uuid,
  decision public.request_status,
  reason text default null,
  selected_level public.membership_level default 'mudansha'
)
returns uuid
language plpgsql
security definer
set search_path to public, pg_temp
as $$
begin
  return null;
end
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
as $$
begin
  return;
end
$$;

create view public.admin_visible_requests
with (security_invoker = true)
as
select
  request_record.id as request_id,
  profile_record.id as user_id,
  profile_record.registration_number as member_id,
  profile_record.full_name,
  profile_record.email,
  profile_record.phone,
  profile_record.date_of_birth,
  class_record.id as class_id,
  class_record.name as class_name,
  dojo_record.id as dojo_id,
  dojo_record.name as dojo_name,
  request_record.status,
  request_record.rejection_reason,
  request_record.created_at
from public.class_requests as request_record
join public.profiles as profile_record
  on profile_record.id = request_record.user_id
join public.classes as class_record
  on class_record.id = request_record.class_id
left join public.dojos as dojo_record
  on dojo_record.id = request_record.dojo_id;

-- These rows represent records that already exist when migration 044 seeds its
-- sequence. New applications are inserted by the post-migration assertions.
insert into public.profiles (id, registration_number, full_name, email, is_super_admin)
values
  ('00000000-0000-0000-0000-000000000001', '0001', 'Super Admin', 'super@example.invalid', true),
  ('00000000-0000-0000-0000-000000000002', '0002', 'Scoped Admin', 'admin@example.invalid', false),
  ('00000000-0000-0000-0000-000000000101', '0101', 'Existing Member', 'existing@example.invalid', false);

insert into public.classes (id, name)
values ('20000000-0000-0000-0000-000000000001', 'Karate');
