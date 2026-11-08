-- ============================================================
-- 053 REPOSITORY UPLOADER REAPPOINTMENT IDEMPOTENCY
-- ============================================================
-- Migration 052's upsert refreshed assigned_by and assigned_at when an already
-- active appointment was submitted again, but the active-state audit trigger
-- correctly emitted no second appointment event. Preserve the original audit
-- provenance for active retries while retaining audited inactive reactivation.
-- ============================================================

begin;

do $preflight$
begin
  if pg_catalog.to_regclass('public.repository_uploader_assignments') is null
     or pg_catalog.to_regclass(
       'public.repository_uploader_assignment_audit'
     ) is null
     or pg_catalog.to_regprocedure(
       'public.assign_repository_uploader(uuid,uuid)'
     ) is null
     or pg_catalog.to_regprocedure(
       'public.audit_repository_uploader_assignment()'
     ) is null
     or not exists (
       select 1
       from pg_catalog.pg_trigger as trigger_record
       where trigger_record.tgrelid =
         'public.repository_uploader_assignments'::pg_catalog.regclass
         and trigger_record.tgname =
           'audit_repository_uploader_assignment_trigger'
         and not trigger_record.tgisinternal
         and trigger_record.tgenabled in ('O', 'A')
     )
  then
    raise exception 'Migration 052 repository uploader objects are missing';
  end if;
end
$preflight$;

create or replace function public.assign_repository_uploader(
  target_user_id uuid,
  target_class_id uuid
)
returns void
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Not authenticated';
  end if;

  if not public.is_active_app_user(caller_id)
     or not public.is_super_admin(caller_id)
  then
    raise exception using
      errcode = '42501',
      message = 'Only Super Admin can appoint Repository Uploaders';
  end if;

  if not exists (
    select 1
    from public.profiles as profile
    where profile.id = target_user_id
      and profile.account_status::text = 'active'
      and profile.date_of_passing is null
  ) then
    raise exception 'Active member not found';
  end if;

  if not exists (
    select 1
    from public.classes as class_record
    where class_record.id = target_class_id
      and class_record.is_active = true
  ) then
    raise exception 'Active class not found';
  end if;

  insert into public.repository_uploader_assignments as assignment (
    user_id,
    class_id,
    active,
    assigned_by,
    assigned_at,
    revoked_by,
    revoked_at
  ) values (
    target_user_id,
    target_class_id,
    true,
    caller_id,
    now(),
    null,
    null
  )
  on conflict (user_id, class_id)
  do update set
    active = true,
    assigned_by = excluded.assigned_by,
    assigned_at = excluded.assigned_at,
    revoked_by = null,
    revoked_at = null
  where assignment.active = false;
end;
$function$;

alter function public.assign_repository_uploader(uuid, uuid)
  owner to postgres;

revoke all
on function public.assign_repository_uploader(uuid, uuid)
from public, anon, authenticated, service_role;

grant execute
on function public.assign_repository_uploader(uuid, uuid)
to authenticated, service_role;

comment on function public.assign_repository_uploader(uuid, uuid) is
  'Super Admin appointment boundary; active retries preserve original assignment provenance and inactive appointments reactivate with a new audit event.';

do $postconditions$
declare
  routine_definition text := pg_catalog.pg_get_functiondef(
    'public.assign_repository_uploader(uuid,uuid)'::pg_catalog.regprocedure
  );
begin
  if routine_definition not ilike '%on conflict (user_id, class_id)%'
     or routine_definition not ilike '%where assignment.active = false%'
     or routine_definition not ilike '%assigned_by = excluded.assigned_by%'
     or routine_definition not ilike '%assigned_at = excluded.assigned_at%'
  then
    raise exception 'Repository Uploader idempotent reappointment repair was not installed';
  end if;

  if has_function_privilege(
       'anon',
       'public.assign_repository_uploader(uuid,uuid)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'authenticated',
       'public.assign_repository_uploader(uuid,uuid)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'service_role',
       'public.assign_repository_uploader(uuid,uuid)',
       'EXECUTE'
     )
  then
    raise exception 'Repository Uploader appointment RPC ACL is unsafe';
  end if;
end
$postconditions$;

notify pgrst, 'reload schema';

commit;
