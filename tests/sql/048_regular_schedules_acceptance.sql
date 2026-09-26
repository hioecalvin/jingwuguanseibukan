\set ON_ERROR_STOP on

select set_config('app.current_role', 'authenticated', false);
select set_config('app.current_uid', '00000000-0000-0000-0000-000000000002', false);

select public.upsert_regular_class_schedule(
  '20000000-0000-0000-0000-000000000001',
  2::smallint,
  '19:00'::time,
  '21:00'::time,
  '00000000-0000-0000-0000-000000000003',
  'Main hall',
  'Beginners welcome',
  true,
  null
);

do $assert$
begin
  if (select count(*) from public.get_manageable_schedule_scopes()) <> 1 then
    raise exception 'Scoped Admin received an unexpected management scope';
  end if;

  if (select count(*) from public.get_schedule_instructor_options(
    '20000000-0000-0000-0000-000000000001'
  )) <> 3 then
    raise exception 'Instructor options do not match active Aikido members';
  end if;
end
$assert$;

do $assert$
begin
  begin
    perform public.upsert_regular_class_schedule(
      '20000000-0000-0000-0000-000000000002',
      6::smallint,
      '10:00'::time,
      '12:00'::time,
      '00000000-0000-0000-0000-000000000003',
      null,
      null,
      true,
      null
    );
    raise exception 'Scoped Admin unexpectedly wrote outside assigned dojo';
  exception when insufficient_privilege then
    null;
  end;
end
$assert$;

select set_config('app.current_uid', '00000000-0000-0000-0000-000000000004', false);

do $assert$
begin
  if (select count(*) from public.get_regular_class_schedules(false)) <> 1 then
    raise exception 'Member did not receive the active information-only schedule';
  end if;

  begin
    perform public.upsert_regular_class_schedule(
      '20000000-0000-0000-0000-000000000001',
      4::smallint,
      '19:00'::time,
      '21:00'::time,
      null,
      null,
      null,
      true,
      null
    );
    raise exception 'Member unexpectedly wrote a schedule';
  exception when insufficient_privilege then
    null;
  end;
end
$assert$;

select set_config('app.current_uid', '00000000-0000-0000-0000-000000000002', false);

select public.upsert_regular_class_schedule(
  schedule.dojo_id,
  schedule.day_of_week,
  schedule.start_time,
  schedule.finish_time,
  schedule.instructor_id,
  schedule.venue,
  'Updated notes',
  false,
  schedule.schedule_id
)
from public.get_regular_class_schedules(true) as schedule
limit 1;

do $assert$
begin
  if (select count(*) from public.get_regular_class_schedules(true)) <> 1 then
    raise exception 'Scoped Admin cannot review the inactive schedule history';
  end if;

  if (select count(*) from public.regular_class_schedule_audit) <> 2 then
    raise exception 'Schedule audit did not record create and update';
  end if;

  if has_table_privilege('authenticated', 'public.regular_class_schedules', 'SELECT')
     or has_table_privilege('authenticated', 'public.regular_class_schedules', 'INSERT')
     or has_table_privilege('anon', 'public.regular_class_schedules', 'SELECT')
  then
    raise exception 'Schedule tables are directly exposed to browser roles';
  end if;
end
$assert$;

select set_config('app.current_uid', '00000000-0000-0000-0000-000000000004', false);

do $assert$
begin
  if (select count(*) from public.get_regular_class_schedules(false)) <> 0 then
    raise exception 'Inactive schedule remained visible to a Member';
  end if;
end
$assert$;
