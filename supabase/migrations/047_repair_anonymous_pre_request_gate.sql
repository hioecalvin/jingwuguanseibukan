-- ============================================================
-- 047 REPAIR ANONYMOUS POSTGREST PRE-REQUEST GATE
-- ============================================================
--
-- Migration 040 intentionally removed anonymous EXECUTE access from
-- is_active_app_user(uuid). Its pre-request hook used that helper in the
-- second operand of a boolean AND. PostgreSQL does not guarantee boolean
-- evaluation order, so an anonymous catalog request can attempt the helper
-- call and fail with 42501 before classes/dojos RLS is evaluated.
--
-- Keep the active/deceased account boundary for authenticated JWTs, but exit
-- before invoking the protected helper for every other role.
-- ============================================================

begin;

do $prerequisites$
begin
  if pg_catalog.to_regprocedure('public.is_active_app_user(uuid)') is null then
    raise exception 'Missing prerequisite function public.is_active_app_user(uuid)';
  end if;

  if pg_catalog.to_regprocedure('public.enforce_active_account_request()') is null then
    raise exception 'Missing prerequisite function public.enforce_active_account_request()';
  end if;
end
$prerequisites$;

create or replace function public.enforce_active_account_request()
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if coalesce(auth.role(), '') <> 'authenticated' then
    return;
  end if;

  if not public.is_active_app_user(auth.uid()) then
    raise exception using
      errcode = '42501',
      message = 'Account access is disabled';
  end if;
end;
$$;

-- Preserve the protected helper boundary. Anonymous callers may invoke only
-- the invoker pre-request wrapper, whose early return cannot expose profiles.
revoke execute on function public.is_active_app_user(uuid)
from public, anon;

grant execute on function public.is_active_app_user(uuid)
to authenticated, service_role;

revoke execute on function public.enforce_active_account_request()
from public, anon, authenticated, service_role;

grant execute on function public.enforce_active_account_request()
to anon, authenticated, service_role;

alter role authenticator
set pgrst.db_pre_request = 'public.enforce_active_account_request';

do $verify$
declare
  hook_record record;
begin
  select
    routine.prosecdef,
    routine.proconfig
  into hook_record
  from pg_catalog.pg_proc as routine
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = routine.pronamespace
  where namespace.nspname = 'public'
    and routine.proname = 'enforce_active_account_request'
    and routine.pronargs = 0;

  if hook_record.prosecdef is distinct from false
     or not coalesce(
       hook_record.proconfig @> array['search_path=public, pg_temp'],
       false
     ) then
    raise exception 'The active-account pre-request hook is not a fixed-path SECURITY INVOKER';
  end if;

  if pg_catalog.has_function_privilege(
       'anon',
       'public.is_active_app_user(uuid)',
       'EXECUTE'
     ) then
    raise exception 'Anonymous callers can execute the protected active-user helper';
  end if;

  if not pg_catalog.has_function_privilege(
       'anon',
       'public.enforce_active_account_request()',
       'EXECUTE'
     )
     or not pg_catalog.has_function_privilege(
       'authenticated',
       'public.enforce_active_account_request()',
       'EXECUTE'
     ) then
    raise exception 'PostgREST roles cannot execute the active-account pre-request hook';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_db_role_setting as setting_record
    join pg_catalog.pg_roles as role_record
      on role_record.oid = setting_record.setrole
    where role_record.rolname = 'authenticator'
      and 'pgrst.db_pre_request=public.enforce_active_account_request' = any(
        setting_record.setconfig
      )
  ) then
    raise exception 'The authenticator pre-request hook is not configured';
  end if;
end
$verify$;

notify pgrst, 'reload schema';
notify pgrst, 'reload config';

commit;
