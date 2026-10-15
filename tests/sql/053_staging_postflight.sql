-- Independent read-only ledger, residue and security postflight for migration 053.
do $postflight$
declare
  versions text[];
  routine_definition text;
begin
  select array_agg(version order by version)
  into versions
  from supabase_migrations.schema_migrations;

  if versions is distinct from array(
    select lpad(value::text, 3, '0')
    from generate_series(6, 53) as value
  ) then
    raise exception 'Migration ledger is not exactly 006 through 053';
  end if;

  if not exists (
    select 1
    from supabase_migrations.schema_migrations
    where version = '053'
      and name = 'repository_uploader_reappointment_idempotency'
  ) then
    raise exception 'Migration 053 ledger name is incorrect';
  end if;

  if exists (
    select 1
    from public.repository_uploader_assignments
    where assigned_at = timestamptz '1900-01-03 04:05:06+00'
  ) then
    raise exception 'Migration 053 acceptance left assignment residue';
  end if;

  routine_definition := pg_catalog.pg_get_functiondef(
    'public.assign_repository_uploader(uuid,uuid)'::pg_catalog.regprocedure
  );

  if routine_definition not ilike '%on conflict (user_id, class_id)%'
     or routine_definition not ilike '%where assignment.active = false%'
  then
    raise exception 'Migration 053 idempotent assignment repair is absent';
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
    raise exception 'Migration 053 RPC ACL is unsafe';
  end if;

  if has_table_privilege(
       'anon', 'public.repository_uploader_assignments', 'SELECT'
     )
     or has_table_privilege(
       'authenticated', 'public.repository_uploader_assignments', 'SELECT'
     )
     or has_table_privilege(
       'anon', 'public.repository_uploader_assignment_audit', 'SELECT'
     )
     or has_table_privilege(
       'authenticated', 'public.repository_uploader_assignment_audit', 'SELECT'
     )
  then
    raise exception 'Repository Uploader private-table ACL is unsafe';
  end if;

  raise notice 'POSTFLIGHT PASS: exact 006-053 ledger, zero marker residue and migration 053 security contract';
end
$postflight$;
