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

create type public.membership_level as enum ('mudansha', 'yudansha');

create table public.profiles (
  id uuid primary key,
  full_name text not null,
  avatar_url text,
  member_id text,
  aikikai_registration_number text,
  role text not null default 'member',
  is_grading_assessor boolean not null default false,
  date_of_passing date,
  account_status text not null default 'active'
);

create table public.classes (
  id uuid primary key,
  name text not null,
  logo_url text
);

create table public.dojos (
  id uuid primary key,
  class_id uuid not null references public.classes(id),
  name text not null
);

create table public.ranks (
  id uuid primary key,
  name text not null,
  sort_order integer not null default 0
);

create table public.sub_ranks (
  id uuid primary key,
  rank_id uuid not null references public.ranks(id),
  name text not null,
  sort_order integer not null default 0
);

create table public.class_memberships (
  id uuid primary key,
  user_id uuid not null references public.profiles(id),
  class_id uuid not null references public.classes(id),
  dojo_id uuid references public.dojos(id),
  status text not null default 'active',
  rank_id uuid references public.ranks(id),
  sub_rank_id uuid references public.sub_ranks(id),
  level public.membership_level not null
);

create table public.membership_grade_history (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.class_memberships(id),
  rank_id uuid not null references public.ranks(id),
  sub_rank_id uuid references public.sub_ranks(id),
  effective_date date not null,
  created_by uuid not null references public.profiles(id),
  assessor_type text not null,
  assessor_member_id uuid references public.profiles(id),
  assessor_name_snapshot text not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  notification_type text not null,
  title text not null,
  message text not null,
  reference_type text,
  reference_id uuid,
  data jsonb not null default '{}'::jsonb
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  class_id uuid references public.classes(id),
  created_by uuid not null references public.profiles(id),
  published boolean not null default false,
  announcement_type text not null default 'general',
  subject_user_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint announcements_type_check check (announcement_type in (
    'general',
    'memorial_initial',
    'memorial_remembrance',
    'memorial_heavenly_birthday'
  ))
);

create function public.create_notification(
  target_user_id uuid,
  target_notification_type text,
  target_title text,
  target_message text,
  target_reference_type text default null,
  target_reference_id uuid default null,
  target_data jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
declare
  notification_id uuid;
begin
  insert into public.notifications (
    user_id, notification_type, title, message,
    reference_type, reference_id, data
  ) values (
    target_user_id, target_notification_type, target_title, target_message,
    target_reference_type, target_reference_id, target_data
  ) returning id into notification_id;
  return notification_id;
end
$$;

create function public.can_manage_class(target_class_id uuid, actor_id uuid)
returns boolean
language sql
stable
as $$
  select actor_id = '00000000-0000-0000-0000-000000000001'::uuid
      or (
        actor_id = '00000000-0000-0000-0000-000000000002'::uuid
        and target_class_id = '10000000-0000-0000-0000-000000000001'::uuid
      )
$$;

create function public.is_super_admin(
  caller_id uuid default auth.uid()
)
returns boolean
language sql
stable
as $$
  select caller_id = '00000000-0000-0000-0000-000000000001'::uuid
$$;

create function public.get_next_membership_promotion(target_membership_id uuid)
returns table (
  next_rank_id uuid,
  next_sub_rank_id uuid,
  next_level text,
  is_rank_promotion boolean
)
language plpgsql
as $$
declare
  current_rank_id uuid;
begin
  select rank_id into current_rank_id
  from public.class_memberships
  where id = target_membership_id;

  if current_rank_id = '60000000-0000-0000-0000-000000000001'::uuid then
    return query select
      '60000000-0000-0000-0000-000000000002'::uuid,
      '70000000-0000-0000-0000-000000000002'::uuid,
      'mudansha'::text,
      true;
  elsif current_rank_id = '60000000-0000-0000-0000-000000000002'::uuid then
    return query select
      '60000000-0000-0000-0000-000000000003'::uuid,
      null::uuid,
      'yudansha'::text,
      true;
  else
    raise exception 'Member is already at the highest configured rank';
  end if;
end
$$;

-- Migration 029 requires the previous RPC identity before replacing it.
create function public.promote_membership(
  uuid, date, uuid default null, text default null
)
returns uuid
language sql
as $$ select null::uuid $$;

insert into public.classes (id, name) values
  ('10000000-0000-0000-0000-000000000001', 'Aikido'),
  ('10000000-0000-0000-0000-000000000002', 'Karate');

insert into public.dojos (id, class_id, name) values
  (
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'North Dojo'
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    'South Dojo'
  ),
  (
    '20000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000002',
    'Other Dojo'
  );

insert into public.ranks (id, name, sort_order) values
  ('60000000-0000-0000-0000-000000000001', 'Sixth Kyu', 10),
  ('60000000-0000-0000-0000-000000000002', 'Fifth Kyu', 20),
  ('60000000-0000-0000-0000-000000000003', 'First Dan', 100),
  ('60000000-0000-0000-0000-000000000004', 'Terminal Rank', 110);

insert into public.sub_ranks (id, rank_id, name, sort_order) values
  (
    '70000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001',
    'White Belt',
    10
  ),
  (
    '70000000-0000-0000-0000-000000000002',
    '60000000-0000-0000-0000-000000000002',
    'Yellow Belt',
    20
  );

insert into public.profiles (
  id, full_name, avatar_url, is_grading_assessor, account_status
) values
  (
    '00000000-0000-0000-0000-000000000001',
    'Super Admin', null, false, 'active'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'Class Admin', null, false, 'active'
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'Ordinary Member', null, false, 'active'
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    '  Test   Assessor  ', null, true, 'active'
  ),
  (
    '30000000-0000-0000-0000-000000000001',
    'Alice Candidate', '/alice.png', false, 'active'
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    'Bob Candidate', '/bob.png', false, 'active'
  ),
  (
    '30000000-0000-0000-0000-000000000003',
    'Inactive Candidate', null, false, 'active'
  ),
  (
    '30000000-0000-0000-0000-000000000004',
    'Other Class Candidate', null, false, 'active'
  ),
  (
    '30000000-0000-0000-0000-000000000005',
    'Terminal Candidate', null, false, 'active'
  );

update public.profiles
set role = 'super_admin'
where id = '00000000-0000-0000-0000-000000000001';

insert into public.class_memberships (
  id, user_id, class_id, dojo_id, status, rank_id, sub_rank_id, level
) values
  (
    '50000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'active',
    '60000000-0000-0000-0000-000000000001',
    '70000000-0000-0000-0000-000000000001',
    'mudansha'
  ),
  (
    '50000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'active',
    '60000000-0000-0000-0000-000000000001',
    '70000000-0000-0000-0000-000000000001',
    'mudansha'
  ),
  (
    '50000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'inactive',
    '60000000-0000-0000-0000-000000000001',
    '70000000-0000-0000-0000-000000000001',
    'mudansha'
  ),
  (
    '50000000-0000-0000-0000-000000000004',
    '30000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000003',
    'active',
    '60000000-0000-0000-0000-000000000001',
    '70000000-0000-0000-0000-000000000001',
    'mudansha'
  ),
  (
    '50000000-0000-0000-0000-000000000005',
    '30000000-0000-0000-0000-000000000005',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000002',
    'active',
    '60000000-0000-0000-0000-000000000004',
    null,
    'yudansha'
  );

insert into public.membership_grade_history (
  membership_id, rank_id, sub_rank_id, effective_date, created_by,
  assessor_type, assessor_member_id, assessor_name_snapshot
)
select
  membership.id,
  membership.rank_id,
  membership.sub_rank_id,
  date '2026-01-10',
  '00000000-0000-0000-0000-000000000001',
  'member',
  '00000000-0000-0000-0000-000000000004',
  'Test Assessor'
from public.class_memberships as membership;
