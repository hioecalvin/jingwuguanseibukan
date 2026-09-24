-- ============================================================
-- 045 LAST TRAINING SESSION
-- ============================================================
-- Store one instructor-recorded training date per membership, retain an
-- append-only audit of corrections, and calculate recency on the database
-- server using the Jakarta business date.
-- ============================================================

begin;

do $preflight$
begin
  if pg_catalog.to_regclass('public.class_memberships') is null
     or pg_catalog.to_regclass('public.profiles') is null
     or pg_catalog.to_regclass('public.admin_visible_members') is null
  then
    raise exception 'Required membership relations are missing';
  end if;

  if pg_catalog.to_regprocedure('public.is_super_admin(uuid)') is null
     or pg_catalog.to_regprocedure('public.is_class_admin(uuid,uuid,uuid)') is null
     or pg_catalog.to_regprocedure('public.is_active_app_user(uuid)') is null
  then
    raise exception 'Required authorization routines are missing';
  end if;
end
$preflight$;

alter table public.class_memberships
  add column last_training_session_date date;

create table public.membership_training_session_audit (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null
    references public.class_memberships(id) on delete restrict,
  previous_training_date date,
  new_training_date date not null,
  recorded_by uuid not null
    references public.profiles(id) on delete restrict,
  recorded_at timestamptz not null default now(),
  constraint membership_training_session_audit_changed_check
    check (previous_training_date is distinct from new_training_date)
);

create index membership_training_session_audit_membership_idx
on public.membership_training_session_audit (
  membership_id,
  recorded_at desc,
  id desc
);

alter table public.membership_training_session_audit enable row level security;
alter table public.membership_training_session_audit force row level security;

revoke all privileges
on table public.membership_training_session_audit
from public, anon, authenticated, service_role;

grant select
on table public.membership_training_session_audit
to service_role;

create or replace function public.set_membership_last_training_session(
  target_membership_id uuid,
  new_training_date date
)
returns table (
  membership_id uuid,
  training_date date,
  days_ago integer
)
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  caller_id uuid := auth.uid();
  business_today date;
  effective_training_date date;
  membership_record record;
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Not authenticated';
  end if;

  if not public.is_active_app_user(caller_id) then
    raise exception using errcode = '42501', message = 'Account access is disabled';
  end if;

  if target_membership_id is null then
    raise exception using errcode = '22023', message = 'Membership is required';
  end if;

  select
    membership.id,
    membership.class_id,
    membership.dojo_id,
    membership.joined_date,
    membership.status,
    membership.last_training_session_date,
    profile.date_of_passing
  into membership_record
  from public.class_memberships as membership
  join public.profiles as profile
    on profile.id = membership.user_id
  where membership.id = target_membership_id
  for update of membership, profile;

  if not found then
    raise exception using errcode = 'P0002', message = 'Membership not found';
  end if;

  -- Capture the authoritative day after the target locks are acquired. NULL is
  -- reserved for the mark-today wrapper; the correction UI always supplies a date.
  business_today := (clock_timestamp() at time zone 'Asia/Jakarta')::date;
  effective_training_date := coalesce(new_training_date, business_today);

  if membership_record.date_of_passing is not null then
    raise exception using errcode = '22023', message = 'A training session cannot be recorded for a deceased member';
  end if;

  if membership_record.status::text is distinct from 'active' then
    raise exception using errcode = '22023', message = 'Only an active membership can record training';
  end if;

  if not (
    public.is_super_admin(caller_id)
    or public.is_class_admin(
      membership_record.class_id,
      membership_record.dojo_id,
      caller_id
    )
  ) then
    raise exception using errcode = '42501', message = 'Not authorised for this membership';
  end if;

  if effective_training_date > business_today then
    raise exception using errcode = '22023', message = 'Training date cannot be in the future';
  end if;

  if membership_record.joined_date is not null
     and effective_training_date < membership_record.joined_date
  then
    raise exception using errcode = '22023', message = 'Training date cannot be before the membership joined date';
  end if;

  if membership_record.last_training_session_date is distinct from effective_training_date then
    insert into public.membership_training_session_audit (
      membership_id,
      previous_training_date,
      effective_training_date,
      recorded_by
    ) values (
      membership_record.id,
      membership_record.last_training_session_date,
      new_training_date,
      caller_id
    );

    update public.class_memberships as membership
    set
      last_training_session_date = effective_training_date
    where membership.id = membership_record.id;
  end if;

  return query
  select
    membership_record.id::uuid,
    effective_training_date,
    (business_today - effective_training_date)::integer;
end;
$function$;

alter function public.set_membership_last_training_session(uuid, date)
  owner to postgres;

create or replace function public.get_my_last_training_sessions()
returns table (
  membership_id uuid,
  training_date date,
  days_ago integer
)
language plpgsql
stable
security definer
set search_path to public, pg_temp
as $function$
declare
  caller_id uuid := auth.uid();
  business_today date := (now() at time zone 'Asia/Jakarta')::date;
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Not authenticated';
  end if;

  if not public.is_active_app_user(caller_id) then
    raise exception using errcode = '42501', message = 'Account access is disabled';
  end if;

  return query
  select
    membership.id,
    membership.last_training_session_date,
    case
      when membership.last_training_session_date is null then null
      else (business_today - membership.last_training_session_date)::integer
    end
  from public.class_memberships as membership
  where membership.user_id = caller_id
  order by membership.id;
end;
$function$;

alter function public.get_my_last_training_sessions()
  owner to postgres;

create or replace function public.mark_membership_trained_today(
  target_membership_id uuid
)
returns table (
  membership_id uuid,
  training_date date,
  days_ago integer
)
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
begin
  -- Delegate to the same locked, audited and role-scoped write boundary used
  -- for corrections. auth.uid() remains the original authenticated caller.
  return query
  select result.membership_id, result.training_date, result.days_ago
  from public.set_membership_last_training_session(
    target_membership_id,
    null::date
  ) as result;
end;
$function$;

alter function public.mark_membership_trained_today(uuid)
  owner to postgres;

revoke all
on function public.set_membership_last_training_session(uuid, date)
from public, anon, authenticated, service_role;

grant execute
on function public.set_membership_last_training_session(uuid, date)
to authenticated;

revoke all
on function public.get_my_last_training_sessions()
from public, anon, authenticated, service_role;

grant execute
on function public.get_my_last_training_sessions()
to authenticated;

revoke all
on function public.mark_membership_trained_today(uuid)
from public, anon, authenticated, service_role;

grant execute
on function public.mark_membership_trained_today(uuid)
to authenticated;

create or replace view public.admin_visible_members
with (security_invoker = true)
as
select
  m.id as membership_id,
  p.id as user_id,
  p.registration_number as member_id,
  p.registration_number,
  p.full_name,
  p.email,
  p.phone,
  p.whatsapp_number,
  p.avatar_url,
  p.date_of_birth,
  c.id as class_id,
  c.name as class_name,
  d.id as dojo_id,
  d.name as dojo_name,
  m.status as membership_status,
  m.break_count,
  m.level,
  m.role,
  m.rank_id,
  r.name as rank_name,
  m.sub_rank_id,
  sr.name as sub_rank_name,
  m.joined_date,
  (
    select history.effective_date
    from public.membership_grade_history as history
    where history.membership_id = m.id
      and history.revoked_at is null
    order by history.effective_date desc, history.created_at desc, history.id desc
    limit 1
  ) as last_grading_date,
  exists (
    select 1
    from public.dojo_admin_assignments as assignment
    where assignment.user_id = m.user_id
      and assignment.class_id = m.class_id
      and assignment.active = true
  ) as has_admin_access,
  p.is_grading_assessor,
  p.aikikai_registration_number,
  c.title_system,
  m.title_level,
  public.get_membership_title_name(c.id, m.title_level) as title_name,
  p.date_of_passing,
  p.account_status,
  -- PostgreSQL only permits CREATE OR REPLACE VIEW to append new columns.
  -- Keep the migration-040 column order stable and add these at the end.
  m.last_training_session_date,
  case
    when m.last_training_session_date is null then null
    else (
      (now() at time zone 'Asia/Jakarta')::date
      - m.last_training_session_date
    )::integer
  end as last_training_days_ago
from public.class_memberships as m
join public.profiles as p on p.id = m.user_id
join public.classes as c on c.id = m.class_id
left join public.dojos as d on d.id = m.dojo_id
left join public.ranks as r on r.id = m.rank_id
left join public.sub_ranks as sr on sr.id = m.sub_rank_id
where p.date_of_passing is null
   or public.is_super_admin();

revoke all on public.admin_visible_members from public, anon;
grant select on public.admin_visible_members to authenticated, service_role;

comment on column public.class_memberships.last_training_session_date is
  'Latest instructor-recorded training date for this class membership.';

comment on table public.membership_training_session_audit is
  'Private append-only history of instructor corrections to the latest training date.';

comment on function public.set_membership_last_training_session(uuid, date) is
  'Scoped Admin/Super Admin update for the latest training date, validated in Jakarta business time.';

comment on function public.get_my_last_training_sessions() is
  'Member-safe server-calculated last-training recency for the caller memberships.';

comment on function public.mark_membership_trained_today(uuid) is
  'Instructor action that records the Jakarta business date through the audited scoped write boundary.';

do $postflight$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'class_memberships'
      and column_name = 'last_training_session_date'
  ) then
    raise exception 'Last-training membership columns were not installed';
  end if;

  if pg_catalog.to_regclass('public.membership_training_session_audit') is null
     or pg_catalog.to_regprocedure('public.set_membership_last_training_session(uuid,date)') is null
     or pg_catalog.to_regprocedure('public.get_my_last_training_sessions()') is null
     or pg_catalog.to_regprocedure('public.mark_membership_trained_today(uuid)') is null
  then
    raise exception 'Last-training objects are incomplete';
  end if;

  if has_table_privilege('anon', 'public.membership_training_session_audit', 'SELECT')
     or has_table_privilege('authenticated', 'public.membership_training_session_audit', 'SELECT')
     or has_table_privilege('authenticated', 'public.membership_training_session_audit', 'INSERT')
     or has_table_privilege('authenticated', 'public.membership_training_session_audit', 'UPDATE')
     or has_table_privilege('authenticated', 'public.membership_training_session_audit', 'DELETE')
     or has_table_privilege('anon', 'public.membership_training_session_audit', 'INSERT')
     or has_table_privilege('anon', 'public.membership_training_session_audit', 'UPDATE')
     or has_table_privilege('anon', 'public.membership_training_session_audit', 'DELETE')
     or has_table_privilege('service_role', 'public.membership_training_session_audit', 'INSERT')
     or has_table_privilege('service_role', 'public.membership_training_session_audit', 'UPDATE')
     or has_table_privilege('service_role', 'public.membership_training_session_audit', 'DELETE')
  then
    raise exception 'Training-session audit table has unsafe browser or service-role privileges';
  end if;

  if has_function_privilege('anon', 'public.set_membership_last_training_session(uuid,date)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.set_membership_last_training_session(uuid,date)', 'EXECUTE')
     or has_function_privilege('anon', 'public.get_my_last_training_sessions()', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.get_my_last_training_sessions()', 'EXECUTE')
     or has_function_privilege('anon', 'public.mark_membership_trained_today(uuid)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.mark_membership_trained_today(uuid)', 'EXECUTE')
  then
    raise exception 'Last-training RPC ACLs are unsafe';
  end if;

  if not exists (
    select 1
    from pg_class as relation
    where relation.oid = 'public.membership_training_session_audit'::regclass
      and relation.relrowsecurity
      and relation.relforcerowsecurity
  ) then
    raise exception 'Training-session audit RLS is not forced';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'admin_visible_members'
      and column_name = 'last_training_days_ago'
  ) then
    raise exception 'Admin member view does not expose server-calculated training recency';
  end if;
end
$postflight$;

notify pgrst, 'reload schema';

commit;
