-- Current instructor details for schedules and explicit teaching-only exceptions.
begin;
create table instructor_private.enrollment_exceptions (
 member_id uuid not null references public.profiles(id),
 class_id uuid not null references public.classes(id),
 reason text not null check(length(btrim(reason)) between 1 and 500),
 recorded_at timestamptz not null default clock_timestamp(),
 primary key(member_id,class_id)
);
alter table instructor_private.enrollment_exceptions enable row level security;
alter table instructor_private.enrollment_exceptions force row level security;
revoke all on instructor_private.enrollment_exceptions from public,anon,authenticated,service_role;
create trigger immutable_enrollment_exception before update or delete on instructor_private.enrollment_exceptions
for each row execute function instructor_private.preserve_audit();

create or replace function instructor_private.is_eligible(target_member uuid,target_class uuid) returns boolean
language sql stable security definer set search_path=pg_catalog as $$
 select exists(select from public.profiles p where p.id=target_member and p.account_status::text='active' and p.date_of_passing is null
 and (exists(select from public.class_memberships m where m.user_id=p.id and m.class_id=target_class and m.status::text='active')
 or exists(select from instructor_private.enrollment_exceptions e where e.member_id=p.id and e.class_id=target_class)));
$$;
create or replace function public.get_schedule_instructor_options(
  target_dojo_id uuid
)
returns table (
  instructor_id uuid,
  instructor_name text
)
language plpgsql
stable
security definer
set search_path to public, pg_temp
as $function$
declare
  caller_id uuid := auth.uid();
  target_class_id uuid;
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Not authenticated';
  end if;

  if not public.is_active_app_user(caller_id) then
    raise exception using errcode = '42501', message = 'Account access is disabled';
  end if;

  select dojo.class_id
  into target_class_id
  from public.dojos as dojo
  where dojo.id = target_dojo_id
    and dojo.active = true
    and exists(select 1 from public.classes c where c.id=dojo.class_id and c.is_active);

  if target_class_id is null then
    raise exception using errcode = 'P0002', message = 'Active dojo not found';
  end if;

  if not public.is_class_admin(target_class_id, target_dojo_id, caller_id) then
    raise exception using errcode = '42501', message = 'Not authorised for this dojo and class';
  end if;

  return query
  select distinct
    profile.id,
    profile.full_name
  from instructor_private.appointments as membership
  join public.profiles as profile
    on profile.id = membership.member_id
  where membership.class_id = target_class_id
    and membership.active
    and instructor_private.is_appointed(profile.id,target_class_id)
    and profile.account_status::text = 'active'
    and profile.date_of_passing is null
  order by profile.full_name, profile.id;
end;
$function$;




create function public.get_regular_schedules_with_instructor(include_inactive boolean default false)
returns table (
  schedule_id uuid,
  dojo_id uuid,
  dojo_name text,
  class_id uuid,
  class_name text,
  day_of_week smallint,
  start_time time without time zone,
  finish_time time without time zone,
  instructor_id uuid,
  instructor_name text,
  venue text,
  notes text,
  is_active boolean,
  can_manage boolean,
  updated_at timestamptz,
  instructor_rank text,
  instructor_phone text
)

language sql stable security definer set search_path=pg_catalog as $$
 -- Delegate every schedule visibility/admin decision to the existing getter.
 -- Preserve historical instructor IDs/names so existing retirement edits work.
 -- Only current appointments expose the additional contact/rank fields.
 select s.*,r.name,p.phone
 from public.get_regular_class_schedules(include_inactive) s
 left join public.profiles p on p.id=s.instructor_id and instructor_private.is_appointed(p.id,s.class_id)
 left join lateral (
  select rank.name from public.class_memberships m
  left join public.ranks rank on rank.id=m.rank_id and rank.class_id=m.class_id
  where m.user_id=p.id and m.class_id=s.class_id and m.status::text='active'
  order by (m.dojo_id=s.dojo_id) desc nulls last,rank.sort_order desc nulls last,m.id limit 1
 ) r on true;
$$;
alter table instructor_private.enrollment_exceptions owner to postgres;
alter function instructor_private.is_eligible(uuid,uuid) owner to postgres;
revoke all on function instructor_private.is_eligible(uuid,uuid) from public,anon,authenticated,service_role;
alter function public.get_schedule_instructor_options(uuid) owner to postgres;
revoke all on function public.get_schedule_instructor_options(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_schedule_instructor_options(uuid) to authenticated;
alter function public.get_regular_schedules_with_instructor(boolean) owner to postgres;
revoke all on function public.get_regular_schedules_with_instructor(boolean) from public,anon,authenticated,service_role;
grant execute on function public.get_regular_schedules_with_instructor(boolean) to authenticated;
notify pgrst,'reload schema';
commit;
