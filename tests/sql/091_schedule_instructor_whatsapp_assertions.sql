-- Continues the 090 fixture. The same instructor's appointment is current in
-- the other class and revoked in the original class. Both schedules remain.
begin;
update public.profiles set whatsapp_number = '+62812000101', phone = '+62812000202'
where id = '10000000-0000-4000-8000-000000000003';
update public.profiles set whatsapp_number = '+62812000303'
where id = '10000000-0000-4000-8000-000000000002';

create function pg_temp.check_whatsapp_visibility() returns void language plpgsql as $$
declare include_hidden boolean;
begin
  foreach include_hidden in array array[false, true, null] loop
    perform pg_temp.check_true(
      (select jsonb_agg(to_jsonb(s) order by schedule_id)
       from public.get_regular_schedules_with_instructor(include_hidden) s)
      is not distinct from
      (select jsonb_agg(to_jsonb(s) - 'instructor_whatsapp' order by schedule_id)
       from public.get_regular_schedules_with_whatsapp(include_hidden) s),
      'Every original schedule and field is preserved for this caller');
  end loop;
end$$;

set request.jwt.claim.sub = '10000000-0000-4000-8000-000000000002';
set role authenticated;
select pg_temp.check_whatsapp_visibility();
select pg_temp.check_true((
  select instructor_whatsapp = '+62812000101' and instructor_phone = '+62812000202'
  from public.get_regular_schedules_with_whatsapp()
  where schedule_id = current_setting('test090.other_schedule')::uuid
), 'Appointed instructor supplies separate WhatsApp and phone, independent of viewer');
select pg_temp.check_true((
  select instructor_id is not null and instructor_whatsapp is null
  from public.get_regular_schedules_with_whatsapp()
  where schedule_id = current_setting('test090.schedule')::uuid
), 'Appointment in another class does not reveal WhatsApp for a revoked instructor');

set request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
select pg_temp.check_whatsapp_visibility();
select pg_temp.check_true((
  select count(*) = 1 and bool_and(instructor_whatsapp is null)
  from public.get_regular_schedules_with_whatsapp(true) where instructor_id is null
), 'An unassigned schedule remains visible with no WhatsApp');
reset role;

update public.profiles set whatsapp_number = null
where id = '10000000-0000-4000-8000-000000000003';
set request.jwt.claim.sub = '10000000-0000-4000-8000-000000000003';
set role authenticated;
select pg_temp.check_whatsapp_visibility();
select pg_temp.check_true((
  select instructor_phone = '+62812000202' and instructor_whatsapp is null
  from public.get_regular_schedules_with_whatsapp()
  where schedule_id = current_setting('test090.other_schedule')::uuid
), 'Missing WhatsApp is never filled from phone');
reset role;
update public.profiles set whatsapp_number = '+62812000404', phone = null
where id = '10000000-0000-4000-8000-000000000003';
set role authenticated;
select pg_temp.check_true((
  select instructor_phone is null and instructor_whatsapp = '+62812000404'
  from public.get_regular_schedules_with_whatsapp()
  where schedule_id = current_setting('test090.other_schedule')::uuid
), 'Profile updates are immediately visible even without a phone');
set request.jwt.claim.sub = '10000000-0000-4000-8000-000000000004';
select pg_temp.expect_denied('select * from public.get_regular_schedules_with_whatsapp(true)', '42501');
set request.jwt.claim.sub = '';
select pg_temp.expect_denied('select * from public.get_regular_schedules_with_whatsapp()', '42501');
reset role;
set role anon;
select pg_temp.expect_denied('select * from public.get_regular_schedules_with_whatsapp()', '42501');
reset role;
set role service_role;
select pg_temp.expect_denied('select * from public.get_regular_schedules_with_whatsapp()', '42501');
reset role;
select 'SCHEDULE091_PASS checks=' || current_setting('test090.checks');
rollback;
