-- ============================================================
-- 046 REPAIR LAST-TRAINING AUDIT INSERT
-- ============================================================
-- Migration 045 created the intended audit column as new_training_date, but
-- its PL/pgSQL insert named a non-existent column and passed the nullable RPC
-- argument instead of the resolved Jakarta business date. Repair the deployed
-- routine forward-only without rewriting migration history.
-- ============================================================

begin;

do $preflight$
begin
  if pg_catalog.to_regclass('public.class_memberships') is null
     or pg_catalog.to_regclass('public.membership_training_session_audit') is null
     or pg_catalog.to_regprocedure(
       'public.set_membership_last_training_session(uuid,date)'
     ) is null
  then
    raise exception 'Migration 045 last-training objects are missing';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_attribute as attribute
    where attribute.attrelid =
      'public.membership_training_session_audit'::pg_catalog.regclass
      and attribute.attname = 'new_training_date'
      and not attribute.attisdropped
  ) then
    raise exception 'Required audit column new_training_date is missing';
  end if;
end
$preflight$;

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
      new_training_date,
      recorded_by
    ) values (
      membership_record.id,
      membership_record.last_training_session_date,
      effective_training_date,
      caller_id
    );

    update public.class_memberships as membership
    set last_training_session_date = effective_training_date
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

revoke all
on function public.set_membership_last_training_session(uuid, date)
from public, anon, authenticated, service_role;

grant execute
on function public.set_membership_last_training_session(uuid, date)
to authenticated;

comment on function public.set_membership_last_training_session(uuid, date) is
  'Records an audited last-training date for an active, living membership within the caller Admin scope.';

notify pgrst, 'reload schema';

do $postconditions$
declare
  routine_definition text := pg_catalog.pg_get_functiondef(
    'public.set_membership_last_training_session(uuid,date)'::pg_catalog.regprocedure
  );
begin
  if routine_definition not ilike '%new_training_date,%'
     or routine_definition not ilike '%effective_training_date,%'
     or routine_definition ilike '%previous_training_date,%effective_training_date,%recorded_by%'
  then
    raise exception 'Last-training audit insert repair was not installed';
  end if;

  if has_function_privilege(
       'anon',
       'public.set_membership_last_training_session(uuid,date)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'authenticated',
       'public.set_membership_last_training_session(uuid,date)',
       'EXECUTE'
     )
  then
    raise exception 'Last-training correction RPC ACL is unsafe';
  end if;
end
$postconditions$;

commit;
