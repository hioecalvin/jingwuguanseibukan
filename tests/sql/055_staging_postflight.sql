-- Independent read-only ledger, zero-residue and security postflight for 055.
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
    from generate_series(6, 55) as value
  ) then
    raise exception 'Migration ledger is not exactly 006 through 055';
  end if;

  if not exists (
    select 1
    from supabase_migrations.schema_migrations
    where version = '055'
      and name = 'contact_details_compare_and_swap'
  ) then
    raise exception 'Migration 055 ledger name is incorrect';
  end if;

  if exists (
    select 1 from public.profiles
    where instagram_username in ('jwg055temporary', 'jwg055temporary2')
  ) or exists (
    select 1 from public.profile_contact_change_audit
    where new_value in ('jwg055temporary', 'jwg055temporary2')
  ) then
    raise exception 'Migration 055 acceptance left marker residue';
  end if;

  routine_definition := pg_catalog.pg_get_functiondef(
    'public.update_my_contact_details_if_unchanged(text,text,text,text)'::pg_catalog.regprocedure
  );

  if routine_definition not ilike '%for update%'
     or routine_definition not ilike '%errcode = ''40001''%'
     or routine_definition not ilike '%is distinct from expected_phone%'
     or routine_definition not ilike '%is distinct from expected_instagram_username%'
     or routine_definition not ilike '%if values_changed then%'
  then
    raise exception 'Migration 055 compare-and-swap contract is absent';
  end if;

  if has_function_privilege(
       'anon',
       'public.update_my_contact_details_if_unchanged(text,text,text,text)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'authenticated',
       'public.update_my_contact_details_if_unchanged(text,text,text,text)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'service_role',
       'public.update_my_contact_details_if_unchanged(text,text,text,text)',
       'EXECUTE'
     )
  then
    raise exception 'Migration 055 function ACL is unsafe';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_proc as routine
    join pg_catalog.pg_namespace as namespace on namespace.oid = routine.pronamespace
    where namespace.nspname = 'public'
      and routine.proname = 'update_my_contact_details_if_unchanged'
      and routine.prosecdef
      and routine.proconfig @> array['search_path=public, pg_temp']
  ) then
    raise exception 'Migration 055 function security attributes are unsafe';
  end if;

  if pg_catalog.to_regprocedure('public.update_my_contact_details(text,text)') is null then
    raise exception 'Migration 055 unexpectedly removed the compatibility RPC';
  end if;

  raise notice 'POSTFLIGHT PASS: exact 006-055 ledger, zero fixture residue and migration 055 security contract';
end
$postflight$;
