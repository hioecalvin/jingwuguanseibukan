-- Approved staging migration: organisation-wide narrow member directory.
-- Additive v2 keeps migration 050 and the deployed client's contract intact.
begin;

do $preflight$
begin
  if pg_catalog.to_regprocedure('public.get_my_member_directory()') is null
     or pg_catalog.to_regprocedure('public.is_active_app_user(uuid)') is null then
    raise exception 'Existing directory and active-account guard are required';
  end if;
end
$preflight$;

create or replace function public.get_my_member_directory_v2()
returns table (
  full_name text,
  avatar_url text,
  enrollments jsonb,
  instagram_username text
)
language plpgsql
stable
security definer
set search_path to public, pg_temp
as $function$
declare
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Not authenticated';
  end if;
  if not public.is_active_app_user(caller_id) then
    raise exception using errcode = '42501', message = 'Account access is disabled';
  end if;

  -- Identity is used ONLY for grouping: namesakes must remain separate people.
  -- No caller class/dojo restriction: the approved directory is organisation-wide.
  -- This grants no table access and does not change management policies.
  return query
  select
    profile.full_name::text,
    profile.avatar_url::text,
    jsonb_agg(jsonb_build_object(
      'class_name', class_data.name,
      'home_dojo', dojo.name,
      'current_rank', nullif(concat_ws(' · ',
        nullif(btrim(rank_data.name), ''),
        nullif(btrim(sub_rank_data.name), '')
      ), '')
    ) order by class_data.name, dojo.name nulls last, membership.id),
    profile.instagram_username::text
  from public.class_memberships as membership
  join public.profiles as profile on profile.id = membership.user_id
  join public.classes as class_data on class_data.id = membership.class_id
  left join public.dojos as dojo on dojo.id = membership.dojo_id
  left join public.ranks as rank_data on rank_data.id = membership.rank_id
  left join public.sub_ranks as sub_rank_data on sub_rank_data.id = membership.sub_rank_id
  where membership.status::text in ('active', 'break', 'break_1', 'break_2')
    and profile.account_status::text = 'active'
    and profile.date_of_passing is null
    and class_data.is_active = true
  group by profile.id, profile.full_name, profile.avatar_url, profile.instagram_username
  order by profile.full_name, profile.id;
end;
$function$;

alter function public.get_my_member_directory_v2() owner to postgres;
revoke all on function public.get_my_member_directory_v2()
  from public, anon, authenticated, service_role;
grant execute on function public.get_my_member_directory_v2() to authenticated;

comment on function public.get_my_member_directory_v2() is
  'Active signed-in community directory: one person, public photo/name/enrolments/Instagram only; no management authority.';

do $postflight$
declare
  result_columns text[];
begin
  select array_agg(argument.name order by argument.ordinality)
  into result_columns
  from pg_catalog.pg_proc as routine
  cross join lateral unnest(routine.proargnames, routine.proargmodes)
    with ordinality as argument(name, mode, ordinality)
  where routine.oid = 'public.get_my_member_directory_v2()'::regprocedure
    and argument.mode in ('o', 't');
  if result_columns is distinct from array[
    'full_name', 'avatar_url', 'enrollments', 'instagram_username'
  ]::text[] then
    raise exception 'Unexpected directory projection: %', result_columns;
  end if;
  if has_function_privilege('anon', 'public.get_my_member_directory_v2()', 'EXECUTE')
     or has_function_privilege('service_role', 'public.get_my_member_directory_v2()', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.get_my_member_directory_v2()', 'EXECUTE') then
    raise exception 'Unsafe directory function ACL';
  end if;
end
$postflight$;

notify pgrst, 'reload schema';
commit;
