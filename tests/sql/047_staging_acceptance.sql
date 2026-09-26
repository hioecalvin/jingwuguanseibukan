-- Supabase CLI `db query` executes this as one prepared statement. The final
-- pass marker is deliberately raised so PostgreSQL rolls back every temporary
-- profile mutation made by the acceptance block.
do $acceptance$
declare
  super_id uuid;
  member_id uuid;
  original_status public.account_status;
  original_date_of_passing date;
  denial_message text;
  hook_record record;
begin
  select id into super_id
  from public.profiles
  where registration_number = '0001';

  select id, account_status, date_of_passing
  into member_id, original_status, original_date_of_passing
  from public.profiles
  where registration_number = '0101';

  if super_id is null or member_id is null then
    raise exception 'Required staging security-test identities are missing';
  end if;
  if original_status::text <> 'active' or original_date_of_passing is not null then
    raise exception 'Member 0101 is not an active living acceptance target';
  end if;

  -- Active authenticated Member requests remain allowed.
  perform set_config('request.jwt.claim.role', 'authenticated', false);
  perform set_config('request.jwt.claim.sub', member_id::text, false);
  perform public.enforce_active_account_request();

  -- A disabled Member receives the exact request-gate denial.
  perform set_config('request.jwt.claim.sub', super_id::text, false);
  update public.profiles
  set account_status = 'disabled'::public.account_status
  where id = member_id;

  perform set_config('request.jwt.claim.sub', member_id::text, false);
  begin
    perform public.enforce_active_account_request();
    raise exception 'Disabled Member unexpectedly passed the request gate';
  exception
    when insufficient_privilege then
      get stacked diagnostics denial_message = message_text;
      if denial_message <> 'Account access is disabled' then
        raise exception 'Unexpected disabled-account denial: %', denial_message;
      end if;
  end;

  -- Marking a Member deceased forces disabled status and receives the same
  -- authenticated request denial. Super Admin claims satisfy the field guard.
  perform set_config('request.jwt.claim.sub', super_id::text, false);
  update public.profiles
  set account_status = original_status,
      date_of_passing = null
  where id = member_id;
  update public.profiles
  set date_of_passing = current_date
  where id = member_id;

  if not exists (
    select 1
    from public.profiles
    where id = member_id
      and account_status::text = 'disabled'
      and date_of_passing = current_date
  ) then
    raise exception 'Deceased profile trigger did not force disabled status';
  end if;

  perform set_config('request.jwt.claim.sub', member_id::text, false);
  begin
    perform public.enforce_active_account_request();
    raise exception 'Deceased Member unexpectedly passed the request gate';
  exception
    when insufficient_privilege then
      get stacked diagnostics denial_message = message_text;
      if denial_message <> 'Account access is disabled' then
        raise exception 'Unexpected deceased-account denial: %', denial_message;
      end if;
  end;

  -- Non-authenticated PostgREST roles return before touching the protected
  -- helper. This covers both anonymous catalog requests and service calls.
  perform set_config('request.jwt.claim.role', 'anon', false);
  perform set_config('request.jwt.claim.sub', '', false);
  perform public.enforce_active_account_request();
  perform set_config('request.jwt.claim.role', 'service_role', false);
  perform public.enforce_active_account_request();

  if pg_catalog.has_function_privilege(
       'anon', 'public.is_active_app_user(uuid)', 'EXECUTE'
     )
     or not pg_catalog.has_function_privilege(
       'authenticated', 'public.is_active_app_user(uuid)', 'EXECUTE'
     )
     or not pg_catalog.has_function_privilege(
       'service_role', 'public.is_active_app_user(uuid)', 'EXECUTE'
     ) then
    raise exception 'Protected active-user helper ACL is unsafe';
  end if;

  if not pg_catalog.has_function_privilege(
       'anon', 'public.enforce_active_account_request()', 'EXECUTE'
     )
     or not pg_catalog.has_function_privilege(
       'authenticated', 'public.enforce_active_account_request()', 'EXECUTE'
     )
     or not pg_catalog.has_function_privilege(
       'service_role', 'public.enforce_active_account_request()', 'EXECUTE'
     ) then
    raise exception 'Pre-request wrapper ACL is incomplete';
  end if;

  select routine.prosecdef, routine.proconfig
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
    raise exception 'Pre-request wrapper is not fixed-path SECURITY INVOKER';
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
    raise exception 'Authenticator pre-request setting is missing';
  end if;

  raise exception using
    errcode = 'P0001',
    message = 'ROLLBACK-CONTAINED PASS: migration 047 active-account gate';
end
$acceptance$;
