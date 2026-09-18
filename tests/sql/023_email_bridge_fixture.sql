create role anon nologin;
create role authenticated nologin;
create role service_role nologin;

create schema auth;

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create table public.profiles (
  id uuid primary key,
  email text
);

create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid references public.profiles(id),
  recipient_email text not null,
  email_type text not null,
  subject text not null,
  template_data jsonb not null default '{}'::jsonb,
  reference_type text,
  reference_id uuid,
  dedupe_key text unique,
  status text not null default 'pending',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.notification_outbox (
  id bigserial primary key,
  user_id uuid references public.profiles(id),
  recipient_email text not null,
  event_type text not null,
  subject text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create or replace function public.queue_email(
  target_email text,
  target_email_type text,
  target_subject text,
  target_template_data jsonb default '{}'::jsonb,
  target_user_id uuid default null,
  target_reference_type text default null,
  target_reference_id uuid default null,
  target_dedupe_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  queued_id uuid;
begin
  insert into public.email_outbox (
    recipient_user_id,
    recipient_email,
    email_type,
    subject,
    template_data,
    reference_type,
    reference_id,
    dedupe_key,
    created_by
  ) values (
    target_user_id,
    lower(trim(target_email)),
    trim(target_email_type),
    trim(target_subject),
    coalesce(target_template_data, '{}'::jsonb),
    target_reference_type,
    target_reference_id,
    target_dedupe_key,
    auth.uid()
  )
  returning id into queued_id;

  return queued_id;
end;
$$;

insert into public.profiles (id, email)
values (
  '11111111-1111-4111-8111-111111111111',
  'member@example.invalid'
);
