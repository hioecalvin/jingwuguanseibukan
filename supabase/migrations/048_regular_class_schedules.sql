-- ============================================================
-- 048 REGULAR CLASS SCHEDULES
-- ============================================================
-- Add a database-driven weekly timetable. These rows are informational only:
-- they do not create events, attendance, reminders, notifications, teaching
-- hours or any other workflow side effect.
-- ============================================================

begin;

do $preflight$
begin
  if pg_catalog.to_regclass('public.classes') is null
     or pg_catalog.to_regclass('public.dojos') is null
     or pg_catalog.to_regclass('public.profiles') is null
     or pg_catalog.to_regclass('public.class_memberships') is null
  then
    raise exception 'Required schedule relations are missing';
  end if;

  if pg_catalog.to_regprocedure('public.is_active_app_user(uuid)') is null
     or pg_catalog.to_regprocedure('public.is_class_admin(uuid,uuid,uuid)') is null
  then
    raise exception 'Required schedule authorization routines are missing';
  end if;
end
$preflight$;

create table public.regular_class_schedules (
  id uuid primary key default gen_random_uuid(),
  dojo_id uuid not null references public.dojos(id) on delete restrict,
  class_id uuid not null references public.classes(id) on delete restrict,
  day_of_week smallint not null,
  start_time time without time zone not null,
  finish_time time without time zone not null,
  instructor_id uuid references public.profiles(id) on delete restrict,
  venue text,
  notes text,
  is_active boolean not null default true,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint regular_class_schedules_day_check
    check (day_of_week between 0 and 6),
  constraint regular_class_schedules_time_check
    check (finish_time > start_time),
  constraint regular_class_schedules_venue_check
    check (venue is null or (length(venue) between 1 and 200)),
  constraint regular_class_schedules_notes_check
    check (notes is null or (length(notes) between 1 and 1000)),
  constraint regular_class_schedules_unique_slot
    unique (dojo_id, day_of_week, start_time, finish_time)
);

create index regular_class_schedules_class_idx
on public.regular_class_schedules (
  class_id,
  day_of_week,
  start_time
);

create index regular_class_schedules_active_dojo_idx
on public.regular_class_schedules (
  dojo_id,
  day_of_week,
  start_time
)
where is_active = true;

create table public.regular_class_schedule_audit (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null
    references public.regular_class_schedules(id) on delete restrict,
  action text not null,
  actor_user_id uuid not null
    references public.profiles(id) on delete restrict,
  previous_values jsonb,
  new_values jsonb,
  recorded_at timestamptz not null default now(),
  constraint regular_class_schedule_audit_action_check
    check (action in ('created', 'updated')),
  constraint regular_class_schedule_audit_payload_check
    check (
      (action = 'created' and previous_values is null and new_values is not null)
      or
      (action = 'updated' and previous_values is not null and new_values is not null)
    )
);

create index regular_class_schedule_audit_schedule_idx
on public.regular_class_schedule_audit (
  schedule_id,
  recorded_at desc,
  id desc
);

alter table public.regular_class_schedules enable row level security;
alter table public.regular_class_schedules force row level security;
alter table public.regular_class_schedule_audit enable row level security;
alter table public.regular_class_schedule_audit force row level security;

revoke all privileges
on table public.regular_class_schedules, public.regular_class_schedule_audit
from public, anon, authenticated, service_role;

grant select
on table public.regular_class_schedules, public.regular_class_schedule_audit
to service_role;

create or replace function public.get_regular_class_schedules(
  include_inactive boolean default false
)
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
  updated_at timestamptz
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
  select
    schedule.id,
    dojo.id,
    dojo.name,
    class_record.id,
    class_record.name,
    schedule.day_of_week,
    schedule.start_time,
    schedule.finish_time,
    instructor.id,
    instructor.full_name,
    schedule.venue,
    schedule.notes,
    schedule.is_active,
    public.is_class_admin(schedule.class_id, schedule.dojo_id, caller_id),
    schedule.updated_at
  from public.regular_class_schedules as schedule
  join public.dojos as dojo
    on dojo.id = schedule.dojo_id
   and dojo.class_id = schedule.class_id
  join public.classes as class_record
    on class_record.id = schedule.class_id
  left join public.profiles as instructor
    on instructor.id = schedule.instructor_id
   and instructor.account_status::text = 'active'
   and instructor.date_of_passing is null
  where (
       schedule.is_active = true
       and dojo.active = true
       and class_record.is_active = true
     )
     or (
       include_inactive = true
       and public.is_class_admin(schedule.class_id, schedule.dojo_id, caller_id)
     )
  order by
    class_record.name,
    dojo.name,
    schedule.day_of_week,
    schedule.start_time,
    schedule.id;
end;
$function$;

alter function public.get_regular_class_schedules(boolean)
  owner to postgres;

create or replace function public.get_manageable_schedule_scopes()
returns table (
  dojo_id uuid,
  dojo_name text,
  class_id uuid,
  class_name text
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
  select
    dojo.id,
    dojo.name,
    class_record.id,
    class_record.name
  from public.dojos as dojo
  join public.classes as class_record
    on class_record.id = dojo.class_id
  where dojo.active = true
    and class_record.is_active = true
    and public.is_class_admin(class_record.id, dojo.id, caller_id)
  order by class_record.name, dojo.name, dojo.id;
end;
$function$;

alter function public.get_manageable_schedule_scopes()
  owner to postgres;

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
    and dojo.active = true;

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
  from public.class_memberships as membership
  join public.profiles as profile
    on profile.id = membership.user_id
  where membership.class_id = target_class_id
    and membership.status::text in ('active', 'break', 'break_1', 'break_2')
    and profile.account_status::text = 'active'
    and profile.date_of_passing is null
  order by profile.full_name, profile.id;
end;
$function$;

alter function public.get_schedule_instructor_options(uuid)
  owner to postgres;

create or replace function public.upsert_regular_class_schedule(
  target_dojo_id uuid,
  target_day_of_week smallint,
  target_start_time time without time zone,
  target_finish_time time without time zone,
  target_instructor_id uuid default null,
  target_venue text default null,
  target_notes text default null,
  target_is_active boolean default true,
  target_schedule_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  caller_id uuid := auth.uid();
  target_class_id uuid;
  dojo_is_active boolean;
  existing_record public.regular_class_schedules%rowtype;
  saved_record public.regular_class_schedules%rowtype;
  clean_venue text := nullif(btrim(target_venue), '');
  clean_notes text := nullif(btrim(target_notes), '');
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Not authenticated';
  end if;

  if not public.is_active_app_user(caller_id) then
    raise exception using errcode = '42501', message = 'Account access is disabled';
  end if;

  select dojo.class_id, dojo.active
  into target_class_id, dojo_is_active
  from public.dojos as dojo
  where dojo.id = target_dojo_id;

  if target_class_id is null then
    raise exception using errcode = 'P0002', message = 'Dojo not found';
  end if;

  if target_is_active is null then
    raise exception using errcode = '22023', message = 'Active status is required';
  end if;

  if target_is_active and not dojo_is_active then
    raise exception using errcode = '22023', message = 'An active schedule requires an active dojo';
  end if;

  if not public.is_class_admin(target_class_id, target_dojo_id, caller_id) then
    raise exception using errcode = '42501', message = 'Not authorised for this dojo and class';
  end if;

  if target_day_of_week is null or target_day_of_week not between 0 and 6 then
    raise exception using errcode = '22023', message = 'Day of week must be between 0 and 6';
  end if;

  if target_start_time is null or target_finish_time is null
     or target_finish_time <= target_start_time
  then
    raise exception using errcode = '22023', message = 'Finish time must be after start time';
  end if;

  if length(coalesce(clean_venue, '')) > 200 then
    raise exception using errcode = '22023', message = 'Venue must contain 200 characters or fewer';
  end if;

  if length(coalesce(clean_notes, '')) > 1000 then
    raise exception using errcode = '22023', message = 'Notes must contain 1000 characters or fewer';
  end if;

  if target_instructor_id is not null and not exists (
    select 1
    from public.class_memberships as membership
    join public.profiles as profile
      on profile.id = membership.user_id
    where membership.user_id = target_instructor_id
      and membership.class_id = target_class_id
      and membership.status::text in ('active', 'break', 'break_1', 'break_2')
      and profile.account_status::text = 'active'
      and profile.date_of_passing is null
  ) then
    raise exception using errcode = '22023', message = 'Instructor must be an active member of this class';
  end if;

  if target_schedule_id is null then
    insert into public.regular_class_schedules (
      dojo_id,
      class_id,
      day_of_week,
      start_time,
      finish_time,
      instructor_id,
      venue,
      notes,
      is_active,
      created_by,
      updated_by
    ) values (
      target_dojo_id,
      target_class_id,
      target_day_of_week,
      target_start_time,
      target_finish_time,
      target_instructor_id,
      clean_venue,
      clean_notes,
      target_is_active,
      caller_id,
      caller_id
    )
    returning * into saved_record;

    insert into public.regular_class_schedule_audit (
      schedule_id,
      action,
      actor_user_id,
      previous_values,
      new_values
    ) values (
      saved_record.id,
      'created',
      caller_id,
      null,
      to_jsonb(saved_record)
    );
  else
    select schedule.*
    into existing_record
    from public.regular_class_schedules as schedule
    where schedule.id = target_schedule_id
    for update;

    if not found then
      raise exception using errcode = 'P0002', message = 'Schedule not found';
    end if;

    if not public.is_class_admin(
      existing_record.class_id,
      existing_record.dojo_id,
      caller_id
    ) then
      raise exception using errcode = '42501', message = 'Not authorised for the existing schedule';
    end if;

    update public.regular_class_schedules as schedule
    set
      dojo_id = target_dojo_id,
      class_id = target_class_id,
      day_of_week = target_day_of_week,
      start_time = target_start_time,
      finish_time = target_finish_time,
      instructor_id = target_instructor_id,
      venue = clean_venue,
      notes = clean_notes,
      is_active = target_is_active,
      updated_by = caller_id,
      updated_at = now()
    where schedule.id = target_schedule_id
    returning * into saved_record;

    if to_jsonb(existing_record) is distinct from to_jsonb(saved_record) then
      insert into public.regular_class_schedule_audit (
        schedule_id,
        action,
        actor_user_id,
        previous_values,
        new_values
      ) values (
        saved_record.id,
        'updated',
        caller_id,
        to_jsonb(existing_record),
        to_jsonb(saved_record)
      );
    end if;
  end if;

  return saved_record.id;
exception
  when unique_violation then
    raise exception using
      errcode = '23505',
      message = 'This dojo already has a schedule at the same day and time';
end;
$function$;

alter function public.upsert_regular_class_schedule(
  uuid,
  smallint,
  time without time zone,
  time without time zone,
  uuid,
  text,
  text,
  boolean,
  uuid
)
owner to postgres;

revoke all
on function public.get_regular_class_schedules(boolean)
from public, anon, authenticated, service_role;

grant execute
on function public.get_regular_class_schedules(boolean)
to authenticated, service_role;

revoke all
on function public.get_manageable_schedule_scopes()
from public, anon, authenticated, service_role;

grant execute
on function public.get_manageable_schedule_scopes()
to authenticated, service_role;

revoke all
on function public.get_schedule_instructor_options(uuid)
from public, anon, authenticated, service_role;

grant execute
on function public.get_schedule_instructor_options(uuid)
to authenticated, service_role;

revoke all
on function public.upsert_regular_class_schedule(
  uuid,
  smallint,
  time without time zone,
  time without time zone,
  uuid,
  text,
  text,
  boolean,
  uuid
)
from public, anon, authenticated, service_role;

grant execute
on function public.upsert_regular_class_schedule(
  uuid,
  smallint,
  time without time zone,
  time without time zone,
  uuid,
  text,
  text,
  boolean,
  uuid
)
to authenticated, service_role;

comment on table public.regular_class_schedules is
  'Information-only weekly dojo/class timetable; it has no event, attendance or notification side effects.';

comment on table public.regular_class_schedule_audit is
  'Private append-only audit of regular schedule creation and changes.';

comment on function public.get_regular_class_schedules(boolean) is
  'Returns member-safe schedule fields; inactive rows are visible only inside the caller administrative scope.';

comment on function public.get_manageable_schedule_scopes() is
  'Returns active dojo/class offerings the caller may maintain.';

comment on function public.get_schedule_instructor_options(uuid) is
  'Returns safe active class-member names for a scoped schedule instructor picker.';

comment on function public.upsert_regular_class_schedule(
  uuid,
  smallint,
  time without time zone,
  time without time zone,
  uuid,
  text,
  text,
  boolean,
  uuid
) is
  'Creates or updates an audited weekly schedule within the caller exact dojo/class scope.';

do $postflight$
begin
  if pg_catalog.to_regclass('public.regular_class_schedules') is null
     or pg_catalog.to_regclass('public.regular_class_schedule_audit') is null
     or pg_catalog.to_regprocedure('public.get_regular_class_schedules(boolean)') is null
     or pg_catalog.to_regprocedure('public.get_manageable_schedule_scopes()') is null
     or pg_catalog.to_regprocedure('public.get_schedule_instructor_options(uuid)') is null
     or pg_catalog.to_regprocedure(
       'public.upsert_regular_class_schedule(uuid,smallint,time without time zone,time without time zone,uuid,text,text,boolean,uuid)'
     ) is null
  then
    raise exception 'Regular schedule objects are incomplete';
  end if;

  if has_table_privilege('anon', 'public.regular_class_schedules', 'SELECT')
     or has_table_privilege('authenticated', 'public.regular_class_schedules', 'SELECT')
     or has_table_privilege('authenticated', 'public.regular_class_schedules', 'INSERT')
     or has_table_privilege('authenticated', 'public.regular_class_schedules', 'UPDATE')
     or has_table_privilege('authenticated', 'public.regular_class_schedules', 'DELETE')
     or has_table_privilege('anon', 'public.regular_class_schedule_audit', 'SELECT')
     or has_table_privilege('authenticated', 'public.regular_class_schedule_audit', 'SELECT')
  then
    raise exception 'Regular schedule tables have unsafe browser privileges';
  end if;

  if has_function_privilege('anon', 'public.get_regular_class_schedules(boolean)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.get_regular_class_schedules(boolean)', 'EXECUTE')
     or has_function_privilege('anon', 'public.get_manageable_schedule_scopes()', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.get_manageable_schedule_scopes()', 'EXECUTE')
     or has_function_privilege('anon', 'public.get_schedule_instructor_options(uuid)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.get_schedule_instructor_options(uuid)', 'EXECUTE')
     or has_function_privilege(
       'anon',
       'public.upsert_regular_class_schedule(uuid,smallint,time without time zone,time without time zone,uuid,text,text,boolean,uuid)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'authenticated',
       'public.upsert_regular_class_schedule(uuid,smallint,time without time zone,time without time zone,uuid,text,text,boolean,uuid)',
       'EXECUTE'
     )
  then
    raise exception 'Regular schedule RPC ACLs are unsafe';
  end if;

  if (
    select count(*)
    from pg_class as relation
    where relation.oid in (
      'public.regular_class_schedules'::regclass,
      'public.regular_class_schedule_audit'::regclass
    )
      and relation.relrowsecurity
      and relation.relforcerowsecurity
  ) <> 2 then
    raise exception 'Regular schedule RLS is not forced';
  end if;
end
$postflight$;

notify pgrst, 'reload schema';

commit;
