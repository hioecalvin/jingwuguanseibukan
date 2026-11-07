-- Authentication helpers are intentionally simple; schedule routines below are
-- checked byte-for-byte against 048/086 by the runner before any test is run.
alter table public.profiles add column full_name text, add column phone text, add column email text,
 add column registration_number text, add column account_status text default 'active', add column date_of_passing date;
create function public.is_active_super_admin(actor uuid) returns boolean language sql stable security definer set search_path=pg_catalog as $$
 select public.is_active_app_user(actor) and coalesce((select p.is_super_admin from public.profiles p where p.id=actor),false);
$$;
alter table public.classes add column is_active boolean default true;
create table public.ranks(id uuid primary key,class_id uuid references public.classes(id),name text,sort_order integer);
create table public.class_memberships(id uuid primary key,user_id uuid references public.profiles(id),class_id uuid references public.classes(id),dojo_id uuid references public.dojos(id),rank_id uuid references public.ranks(id),status text);
create schema instructor_private;
revoke all on schema instructor_private from public,anon,authenticated,service_role;
create table instructor_private.appointments(member_id uuid references public.profiles(id),class_id uuid references public.classes(id),active boolean,primary key(member_id,class_id));
alter table instructor_private.appointments add column changed_by uuid references public.profiles(id), add column changed_at timestamptz default clock_timestamp();
create table instructor_private.audit(id uuid primary key default gen_random_uuid(),member_id uuid references public.profiles(id),class_id uuid references public.classes(id),actor_id uuid references public.profiles(id),previous_active boolean,new_active boolean,recorded_at timestamptz default clock_timestamp());
create function instructor_private.preserve_audit() returns trigger language plpgsql set search_path=pg_catalog as $$begin raise exception 'Immutable';end$$;
create function instructor_private.is_eligible(target_member uuid,target_class uuid) returns boolean language sql stable security definer set search_path=pg_catalog as $$
select exists(select from public.profiles p join public.class_memberships m on m.user_id=p.id where p.id=target_member and m.class_id=target_class and m.status='active' and p.account_status='active' and p.date_of_passing is null);
$$;
create function instructor_private.is_appointed(target_member uuid,target_class uuid) returns boolean language sql stable security definer set search_path=pg_catalog as $$
select instructor_private.is_eligible(target_member,target_class) and exists(select from instructor_private.appointments a where a.member_id=target_member and a.class_id=target_class and a.active);
$$;
revoke all on all functions in schema instructor_private from public,anon,authenticated,service_role;
update public.profiles set full_name='Fixture instructor',phone='+62812555',email='never-return@example.invalid' where id='10000000-0000-4000-8000-000000000003';
insert into ranks values('50000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Dan 2',2);
insert into class_memberships values('60000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','active');
insert into instructor_private.appointments(member_id,class_id,active) values('10000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000001',true);
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
  perform pg_catalog.pg_advisory_xact_lock_shared(860086);
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

  if target_instructor_id is not null and not (
    not target_is_active and target_schedule_id is not null and exists (
      select 1 from public.regular_class_schedules s where s.id=target_schedule_id
      and s.dojo_id=target_dojo_id and s.class_id=target_class_id and s.instructor_id=target_instructor_id)
  ) and (not instructor_private.is_appointed(target_instructor_id,target_class_id)
    or not exists(select 1 from public.classes c where c.id=target_class_id and c.is_active)) then
    raise exception using errcode='22023',message='Select an appointed active instructor for this class';
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
