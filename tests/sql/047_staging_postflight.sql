do $postflight$
declare
  actual_ledger text[];
  expected_ledger text[];
begin
  select array_agg(version order by version)
  into actual_ledger
  from supabase_migrations.schema_migrations;

  select array_agg(lpad(number::text, 3, '0') order by number)
  into expected_ledger
  from generate_series(6, 47) as versions(number);

  if actual_ledger is distinct from expected_ledger then
    raise exception 'Migration ledger is not exactly 006-047';
  end if;

  if not exists (
    select 1
    from supabase_migrations.schema_migrations
    where version = '047'
      and name = 'repair_anonymous_pre_request_gate'
  ) then
    raise exception 'Migration 047 ledger name is incorrect';
  end if;

  if not exists (
    select 1
    from public.profiles
    where registration_number = '0101'
      and account_status::text = 'active'
      and date_of_passing is null
  ) then
    raise exception 'Member 0101 has acceptance-test residue';
  end if;

  raise notice 'POSTFLIGHT PASS: exact ledger 006-047 and zero profile residue';
end
$postflight$;
