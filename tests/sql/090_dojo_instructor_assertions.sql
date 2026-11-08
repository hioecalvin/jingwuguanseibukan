-- Synthetic identities only. Every rejected call checks the precise SQLSTATE.
create function pg_temp.check_true(value boolean,label text) returns void language plpgsql as $$
begin
 if value is distinct from true then raise exception 'Check failed: %',label;end if;
 perform set_config('test090.checks',(coalesce(nullif(current_setting('test090.checks',true),''),'0')::integer+1)::text,false);
end$$;
create function pg_temp.expect_denied(statement text,expected_code text) returns void language plpgsql as $$
begin
 begin execute statement;
 exception when others then
  if SQLSTATE=expected_code then perform pg_temp.check_true(true,'expected denial');return;end if;
  raise;
 end;
 raise exception 'Expected error %, statement succeeded',expected_code;
end$$;
create function pg_temp.check_visibility() returns void language plpgsql as $$
declare inc boolean;begin
 foreach inc in array array[false,true] loop
  perform pg_temp.check_true(
   (select coalesce(jsonb_agg(to_jsonb(s) order by schedule_id),'[]') from public.get_regular_class_schedules(inc) s)
   = (select coalesce(jsonb_agg(to_jsonb(s)-'instructor_phone'-'instructor_rank' order by schedule_id),'[]') from public.get_regular_schedules_with_instructor(inc) s),
   'Original schedule rows and columns preserved');
 end loop;
end$$;
select pg_temp.check_true((select relrowsecurity and relforcerowsecurity from pg_class where oid='instructor_private.enrollment_exceptions'::regclass),'forced RLS');
do $$declare role_name text;fn text;begin
 foreach role_name in array array['anon','authenticated','service_role'] loop
  perform pg_temp.check_true(not has_schema_privilege(role_name,'instructor_private','USAGE'),'private schema ACL');
  perform pg_temp.check_true(not has_table_privilege(role_name,'instructor_private.enrollment_exceptions','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'),'exception table ACL');
  perform pg_temp.check_true(not has_function_privilege(role_name,'instructor_private.is_eligible(uuid,uuid)','EXECUTE'),'eligibility helper private');
  foreach fn in array array['public.get_regular_schedules_with_instructor(boolean)','public.get_schedule_instructor_options(uuid)'] loop
   perform pg_temp.check_true(has_function_privilege(role_name,fn,'EXECUTE')=(role_name='authenticated'),'public RPC ACL');
  end loop;
 end loop;
end$$;
select pg_temp.check_true((select array_length(proallargtypes,1)=18 and not ('email'=any(proargnames)) from pg_proc where oid='public.get_regular_schedules_with_instructor(boolean)'::regprocedure),'only original fields plus rank/phone');

-- Other-class rank and records must remain untouched by teaching exceptions.
insert into public.classes values('20000000-0000-4000-8000-000000000002','Other Class',true);
insert into public.dojos values('30000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000002','Other Dojo',true);
insert into public.ranks values
 ('50000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','Dan 3',3),
 ('50000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000002','Other rank 99',99);
insert into public.class_memberships values('60000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000003','50000000-0000-4000-8000-000000000003','active');
insert into instructor_private.appointments(member_id,class_id,active) values('10000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000002',true);
select set_config('test090.other_membership',(select to_jsonb(m)::text from public.class_memberships m where m.id='60000000-0000-4000-8000-000000000002'),false);
select set_config('test090.other_appointment',(select to_jsonb(a)::text from instructor_private.appointments a where a.class_id='20000000-0000-4000-8000-000000000002'),false);
select set_config('test090.admins',(select jsonb_agg(to_jsonb(a) order by id)::text from public.dojo_admin_assignments a),false);
set request.jwt.claim.sub='10000000-0000-4000-8000-000000000001';
set role authenticated;
select set_config('test090.other_schedule',public.upsert_regular_class_schedule('30000000-0000-4000-8000-000000000003',2::smallint,'19:00'::time,'20:00'::time,'10000000-0000-4000-8000-000000000003')::text,false);
select public.upsert_regular_class_schedule('30000000-0000-4000-8000-000000000002',2::smallint,'19:00'::time,'20:00'::time,null,null,null,false);
reset role;
select set_config('test090.other_schedule_row',(select to_jsonb(s)::text from public.regular_class_schedules s where s.id=current_setting('test090.other_schedule')::uuid),false);
set request.jwt.claim.sub='10000000-0000-4000-8000-000000000002';
set role authenticated;
select set_config('test090.schedule',public.upsert_regular_class_schedule('30000000-0000-4000-8000-000000000001',2::smallint,'19:00'::time,'20:00'::time,'10000000-0000-4000-8000-000000000003')::text,false);
select pg_temp.check_true((select instructor_phone='+62812555' and instructor_rank='Dan 2' and instructor_name='Fixture instructor' from public.get_regular_schedules_with_instructor() where schedule_id=current_setting('test090.schedule')::uuid),'current appointed details');
select pg_temp.check_true((select count(*)=2 from public.get_regular_schedules_with_instructor(true)),'scoped admin cannot see other inactive dojo');
select pg_temp.check_visibility();
select pg_temp.expect_denied($s$select public.upsert_regular_class_schedule('30000000-0000-4000-8000-000000000003',3::smallint,'19:00'::time,'20:00'::time)$s$,'42501');
select pg_temp.expect_denied($s$select public.get_schedule_instructor_options('30000000-0000-4000-8000-000000000003')$s$,'42501');
reset role;
update public.profiles set full_name='Updated instructor',phone='+62812999' where id='10000000-0000-4000-8000-000000000003';
update public.class_memberships set rank_id='50000000-0000-4000-8000-000000000002' where id='60000000-0000-4000-8000-000000000001';
set request.jwt.claim.sub='10000000-0000-4000-8000-000000000003';
set role authenticated;
select pg_temp.check_true((select instructor_phone='+62812999' and instructor_rank='Dan 3' and instructor_name='Updated instructor' and not (to_jsonb(s)::text like '%never-return%') from public.get_regular_schedules_with_instructor() s where schedule_id=current_setting('test090.schedule')::uuid),'live profile and class rank; no email');
select pg_temp.check_visibility();
select pg_temp.expect_denied($s$select public.upsert_regular_class_schedule('30000000-0000-4000-8000-000000000001',3::smallint,'19:00'::time,'20:00'::time)$s$,'42501');
select pg_temp.expect_denied($s$select public.get_schedule_instructor_options('30000000-0000-4000-8000-000000000001')$s$,'42501');
select pg_temp.expect_denied($s$select public.set_class_instructor_appointment('10000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000001',true,false)$s$,'42501');
reset role;

-- Actual Super Admin RPC revokes; the existing schedule can still be retired.
set request.jwt.claim.sub='10000000-0000-4000-8000-000000000001';
set role authenticated;
select public.set_class_instructor_appointment('10000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000001',true,false);
select pg_temp.check_true((select instructor_phone is null and instructor_rank is null and instructor_id='10000000-0000-4000-8000-000000000003' from public.get_regular_schedules_with_instructor() where schedule_id=current_setting('test090.schedule')::uuid),'revoked added fields hidden; historical edit ID retained');
select pg_temp.check_true((select count(*)=0 from public.get_schedule_instructor_options('30000000-0000-4000-8000-000000000001')),'revoked absent from picker');
select pg_temp.expect_denied($s$select public.upsert_regular_class_schedule('30000000-0000-4000-8000-000000000001',3::smallint,'19:00'::time,'20:00'::time,'10000000-0000-4000-8000-000000000003')$s$,'22023');
select public.upsert_regular_class_schedule('30000000-0000-4000-8000-000000000001',2::smallint,'19:00'::time,'20:00'::time,'10000000-0000-4000-8000-000000000003',null,null,false,current_setting('test090.schedule')::uuid);
select pg_temp.check_visibility();
reset role;
select pg_temp.check_true((select count(*)=3 from public.regular_class_schedules),'failed write added no schedule');
select pg_temp.check_true((select count(*)=4 from public.regular_class_schedule_audit),'failed write added no audit');
delete from public.class_memberships where id='60000000-0000-4000-8000-000000000001';
set role authenticated;
select pg_temp.expect_denied($s$select public.set_class_instructor_appointment('10000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000001',false,true)$s$,'22023');
reset role;
insert into instructor_private.enrollment_exceptions(member_id,class_id,reason) values('10000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000001','Synthetic explicit teaching-only authorization');
select pg_temp.expect_denied('update instructor_private.enrollment_exceptions set reason=''changed''','P0001');
select pg_temp.expect_denied('delete from instructor_private.enrollment_exceptions','P0001');
select pg_temp.check_true(not instructor_private.is_appointed('10000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000001'),'exception alone does not appoint');
set role authenticated;
select public.set_class_instructor_appointment('10000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000001',false,true);
select pg_temp.check_true((select count(*)=1 from public.get_schedule_instructor_options('30000000-0000-4000-8000-000000000001')),'teaching exception in picker');
select public.upsert_regular_class_schedule('30000000-0000-4000-8000-000000000001',2::smallint,'19:00'::time,'20:00'::time,'10000000-0000-4000-8000-000000000003',null,null,true,current_setting('test090.schedule')::uuid);
select pg_temp.check_true((select instructor_rank is null and instructor_phone='+62812999' from public.get_regular_schedules_with_instructor() where schedule_id=current_setting('test090.schedule')::uuid),'exception phone with no invented or other-class rank');
reset role;
select pg_temp.check_true((select count(*)=0 from public.class_memberships where class_id='20000000-0000-4000-8000-000000000001'),'exception never enrolls');
select pg_temp.check_true((select count(*)=2 from instructor_private.audit),'state changes audited once');
update public.profiles set phone=null,email=null where id='10000000-0000-4000-8000-000000000003';
set role authenticated;
select pg_temp.check_true((select instructor_phone is null and instructor_name='Updated instructor' from public.get_regular_schedules_with_instructor() where schedule_id=current_setting('test090.schedule')::uuid),'null phone/missing email remain eligible');
reset role;
update public.profiles set phone='+62812999',account_status='terminated' where id='10000000-0000-4000-8000-000000000003';
set role authenticated;
select pg_temp.check_true((select instructor_id is null and instructor_name is null and instructor_phone is null and instructor_rank is null from public.get_regular_schedules_with_instructor() where schedule_id=current_setting('test090.schedule')::uuid),'terminated exception details hidden');
select pg_temp.check_true((select count(*)=0 from public.get_schedule_instructor_options('30000000-0000-4000-8000-000000000001')),'terminated absent from picker');
select pg_temp.check_visibility();
select public.set_class_instructor_appointment('10000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000001',true,false);
select pg_temp.expect_denied($s$select public.set_class_instructor_appointment('10000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000001',false,true)$s$,'22023');
reset role;
update public.profiles set account_status='active',date_of_passing=current_date where id='10000000-0000-4000-8000-000000000003';
select pg_temp.check_true(not instructor_private.is_eligible('10000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000001'),'deceased exception ineligible');
set role authenticated;
select pg_temp.check_true((select instructor_phone is null from public.get_regular_schedules_with_instructor() where schedule_id=current_setting('test090.schedule')::uuid),'deceased phone hidden');
reset role;
update public.profiles set date_of_passing=null where id='10000000-0000-4000-8000-000000000003';
select pg_temp.check_true(not instructor_private.is_eligible('10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001'),'exception member-specific');
select pg_temp.check_true(not instructor_private.is_eligible('10000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000099'),'exception class-specific');
select pg_temp.check_true((select to_jsonb(m)::text=current_setting('test090.other_membership') from public.class_memberships m where m.id='60000000-0000-4000-8000-000000000002'),'other membership unchanged');
select pg_temp.check_true((select to_jsonb(a)::text=current_setting('test090.other_appointment') from instructor_private.appointments a where a.class_id='20000000-0000-4000-8000-000000000002'),'other appointment unchanged');
select pg_temp.check_true((select to_jsonb(s)::text=current_setting('test090.other_schedule_row') from public.regular_class_schedules s where s.id=current_setting('test090.other_schedule')::uuid),'other schedule unchanged');
select pg_temp.check_true((select jsonb_agg(to_jsonb(a) order by id)::text=current_setting('test090.admins') from public.dojo_admin_assignments a),'no administrator grants');
set request.jwt.claim.sub='10000000-0000-4000-8000-000000000004';
set role authenticated;
select pg_temp.expect_denied('select public.get_regular_schedules_with_instructor(true)','42501');
select pg_temp.expect_denied($s$select public.get_schedule_instructor_options('30000000-0000-4000-8000-000000000001')$s$,'42501');
set request.jwt.claim.sub='';
select pg_temp.expect_denied('select public.get_regular_schedules_with_instructor()','42501');
reset role;
set role anon;
select pg_temp.expect_denied('select public.get_regular_schedules_with_instructor()','42501');
reset role;
set role service_role;
select pg_temp.expect_denied('select public.get_regular_schedules_with_instructor()','42501');
reset role;
select 'INSTRUCTOR090_PASS checks='||current_setting('test090.checks');
