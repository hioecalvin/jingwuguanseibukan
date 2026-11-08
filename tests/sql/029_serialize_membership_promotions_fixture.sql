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
  is_grading_assessor boolean not null default false
);

create table public.class_memberships (
  id uuid primary key,
  user_id uuid not null,
  class_id uuid not null,
  rank_id uuid,
  sub_rank_id uuid,
  level public.membership_level not null
);

create table public.membership_grade_history (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.class_memberships(id),
  rank_id uuid not null,
  sub_rank_id uuid,
  effective_date date not null,
  created_by uuid not null,
  assessor_type text not null,
  assessor_member_id uuid,
  assessor_name_snapshot text not null,
  revoked_at timestamptz
);

-- The runtime helper records whether promotion acquired its row-lock table mode
-- before asking for the next grade. PostgreSQL takes RowShareLock for SELECT
-- ... FOR UPDATE, so a successful observation exercises the ordering in 029.
create table public.promotion_lock_observations (
  membership_id uuid not null,
  rank_seen uuid,
  row_lock_mode_seen boolean not null
);

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

create function public.get_next_membership_promotion(target_membership_id uuid)
returns table (next_rank_id uuid, next_sub_rank_id uuid, next_level text)
language plpgsql
as $$
declare
  current_rank_id uuid;
  lock_seen boolean;
begin
  select exists (
    select 1
    from pg_locks
    where pid = pg_backend_pid()
      and relation = 'public.class_memberships'::regclass
      and mode = 'RowShareLock'
      and granted
  ) into lock_seen;

  select rank_id into current_rank_id
  from public.class_memberships
  where id = target_membership_id;

  insert into public.promotion_lock_observations (
    membership_id, rank_seen, row_lock_mode_seen
  ) values (target_membership_id, current_rank_id, lock_seen);

  if not lock_seen then
    raise exception 'Progression calculated before membership row lock';
  end if;

  if current_rank_id = '60000000-0000-0000-0000-000000000001'::uuid then
    return query select
      '60000000-0000-0000-0000-000000000002'::uuid,
      null::uuid,
      'mudansha'::text;
  elsif current_rank_id = '60000000-0000-0000-0000-000000000002'::uuid then
    return query select
      '60000000-0000-0000-0000-000000000003'::uuid,
      null::uuid,
      'yudansha'::text;
  else
    return query select null::uuid, null::uuid, null::text;
  end if;
end
$$;

-- Migration 029 requires the prior function signature to exist.
create function public.promote_membership(
  uuid, date, uuid default null, text default null
)
returns uuid
language sql
as $$ select null::uuid $$;

insert into public.profiles (id, full_name, is_grading_assessor) values
  ('00000000-0000-0000-0000-000000000004', '  Test   Assessor  ', true),
  ('00000000-0000-0000-0000-000000000005', 'Ordinary Member', false);

insert into public.class_memberships (
  id, user_id, class_id, rank_id, sub_rank_id, level
) values
  (
    '50000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001',
    null,
    'mudansha'
  ),
  (
    '50000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000002',
    '60000000-0000-0000-0000-000000000001',
    null,
    'mudansha'
  );

insert into public.membership_grade_history (
  membership_id, rank_id, effective_date, created_by,
  assessor_type, assessor_member_id, assessor_name_snapshot
) values
  (
    '50000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001',
    date '2026-01-10',
    '00000000-0000-0000-0000-000000000001',
    'member',
    '00000000-0000-0000-0000-000000000004',
    'Test Assessor'
  ),
  (
    '50000000-0000-0000-0000-000000000002',
    '60000000-0000-0000-0000-000000000001',
    date '2026-01-10',
    '00000000-0000-0000-0000-000000000001',
    'member',
    '00000000-0000-0000-0000-000000000004',
    'Test Assessor'
  );
