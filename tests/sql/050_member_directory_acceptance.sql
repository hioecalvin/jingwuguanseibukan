\set ON_ERROR_STOP on

select set_config('app.current_uid', '00000000-0000-0000-0000-000000000001', false);

do $assert$
begin
  if (select count(*) from public.get_my_member_directory()) <> 3 then
    raise exception 'Same-class directory did not return exactly the eligible Aikido rows';
  end if;

  if not exists (
    select 1
    from public.get_my_member_directory()
    where full_name = 'Other Dojo Member'
      and home_dojo = 'Chushin'
  ) then
    raise exception 'Cross-dojo same-class member is missing';
  end if;

  if not exists (
    select 1
    from public.get_my_member_directory()
    where full_name = 'Record Only Member'
  ) then
    raise exception 'Eligible record-only member is missing';
  end if;

  if exists (
    select 1
    from public.get_my_member_directory()
    where full_name in ('Karate Member', 'Terminated Member', 'Deceased Member')
  ) then
    raise exception 'Ineligible cross-class, terminated or deceased member leaked';
  end if;

  if (
    select current_rank
    from public.get_my_member_directory()
    where full_name = 'Caller Member'
  ) is distinct from '5th Kyu · Blue Belt' then
    raise exception 'Current official rank display is incomplete';
  end if;

  if has_function_privilege('anon', 'public.get_my_member_directory()', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.get_my_member_directory()', 'EXECUTE')
  then
    raise exception 'Directory RPC privileges are unsafe';
  end if;
end
$assert$;

select set_config('app.current_uid', '00000000-0000-0000-0000-000000000005', false);

do $assert$
begin
  begin
    perform public.get_my_member_directory();
    raise exception 'Disabled/deceased caller opened the directory';
  exception when insufficient_privilege then
    null;
  end;
end
$assert$;
