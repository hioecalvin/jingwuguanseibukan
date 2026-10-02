-- ============================================================
-- 050 MEMBER DIRECTORY PRIVACY
-- ============================================================
-- Return a narrow directory projection only for classes in which the active
-- caller is currently enrolled. Same-class members may come from any dojo.
-- Private profile, identity, attendance, finance and status fields never cross
-- this database boundary.
-- ============================================================

begin;

do $preflight$
begin
  if pg_catalog.to_regclass('public.profiles') is null
     or pg_catalog.to_regclass('public.class_memberships') is null
     or pg_catalog.to_regclass('public.classes') is null
     or pg_catalog.to_regclass('public.dojos') is null
     or pg_catalog.to_regclass('public.ranks') is null
     or pg_catalog.to_regclass('public.sub_ranks') is null
     or pg_catalog.to_regprocedure('public.is_active_app_user(uuid)') is null
  then
    raise exception 'Required member directory objects are missing';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'instagram_username'
  ) then
    raise exception 'Migration 049 Instagram field is missing';
  end if;
end
$preflight$;

create or replace function public.get_my_member_directory()
returns table (
  class_name text,
  full_name text,
  avatar_url text,
  current_rank text,
  home_dojo text,
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

  return query
  select distinct
    class_data.name::text,
    profile.full_name::text,
    profile.avatar_url::text,
    nullif(
      concat_ws(
        ' · ',
        nullif(btrim(rank_data.name), ''),
        nullif(btrim(sub_rank_data.name), '')
      ),
      ''
    )::text as current_rank,
    dojo.name::text as home_dojo,
    profile.instagram_username::text
  from public.class_memberships as membership
  join public.profiles as profile
    on profile.id = membership.user_id
  join public.classes as class_data
    on class_data.id = membership.class_id
  left join public.dojos as dojo
    on dojo.id = membership.dojo_id
  left join public.ranks as rank_data
    on rank_data.id = membership.rank_id
  left join public.sub_ranks as sub_rank_data
    on sub_rank_data.id = membership.sub_rank_id
  where membership.status::text in ('active', 'break', 'break_1', 'break_2')
    and profile.account_status::text = 'active'
    and profile.date_of_passing is null
    and class_data.is_active = true
    and exists (
      select 1
      from public.class_memberships as caller_membership
      where caller_membership.user_id = caller_id
        and caller_membership.class_id = membership.class_id
        and caller_membership.status::text in ('active', 'break', 'break_1', 'break_2')
    )
  order by
    class_data.name,
    profile.full_name,
    dojo.name nulls last;
end;
$function$;

alter function public.get_my_member_directory()
  owner to postgres;

revoke all
on function public.get_my_member_directory()
from public, anon, authenticated, service_role;

grant execute
on function public.get_my_member_directory()
to authenticated, service_role;

comment on function public.get_my_member_directory() is
  'Narrow same-class directory projection for the active caller, across all dojos.';

do $postflight$
declare
  result_columns text[];
begin
  if pg_catalog.to_regprocedure('public.get_my_member_directory()') is null then
    raise exception 'Member directory function is missing';
  end if;

  select array_agg(argument.name order by argument.ordinality)
  into result_columns
  from pg_catalog.pg_proc as routine
  cross join lateral unnest(
    routine.proargnames,
    routine.proargmodes
  ) with ordinality as argument(name, mode, ordinality)
  where routine.oid = 'public.get_my_member_directory()'::regprocedure
    and argument.mode in ('o', 't');

  if result_columns is distinct from array[
    'class_name',
    'full_name',
    'avatar_url',
    'current_rank',
    'home_dojo',
    'instagram_username'
  ]::text[] then
    raise exception 'Member directory projection exposes unexpected columns: %', result_columns;
  end if;

  if has_function_privilege('anon', 'public.get_my_member_directory()', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.get_my_member_directory()', 'EXECUTE')
  then
    raise exception 'Member directory function privileges are unsafe';
  end if;
end
$postflight$;

notify pgrst, 'reload schema';

commit;
