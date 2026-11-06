create function pg_temp.check84(value boolean, label text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception 'Failed %',label;end if;end$$;
-- Synthetic-only fixture changes below are enclosed by the runner's rollback.
alter table exam_import_private.records disable trigger historical_exam_immutable;
update exam_import_private.records set rank_id='60000000-0000-0000-0000-000000000002'
 where entry_kind='recorded_grade';
alter table exam_import_private.records enable trigger historical_exam_immutable;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
set local role authenticated;
select pg_temp.check84((select count(*)>0 and bool_and(rank_before='Sixth Kyu') from public.get_assessment_result_history() where outcome='recorded_grade'),'historical predecessor uses class rank order');
select pg_temp.check84(not exists(select 1 from public.get_assessment_result_history() where outcome in('lost_record','skipped_rank') and rank_before is not null),'lost and skipped retain unknown prior rank');
select pg_temp.check84(not exists(select 1 from public.get_assessment_result_history() where outcome='recorded_grade' and notes not like '%Rank Before derived from the class grade order.%'),'derivation explained');
reset role;
alter table exam_import_private.records disable trigger historical_exam_immutable;
update exam_import_private.records set rank_id='60000000-0000-0000-0000-000000000001' where entry_kind='recorded_grade';
alter table exam_import_private.records enable trigger historical_exam_immutable;
set local role authenticated;
select pg_temp.check84((select count(*)>0 and bool_and(rank_before='Ungraded') from public.get_assessment_result_history() where outcome='recorded_grade'),'first grade ungraded');
reset role;
alter table exam_import_private.records disable trigger historical_exam_immutable;
update exam_import_private.records set rank_id=null where entry_kind='recorded_grade';
alter table exam_import_private.records enable trigger historical_exam_immutable;
set local role authenticated;
select pg_temp.check84(not exists(select 1 from public.get_assessment_result_history() where outcome='recorded_grade' and rank_before is not null),'missing grade remains unresolved');
reset role;
alter table exam_import_private.records disable trigger historical_exam_immutable;
update exam_import_private.records set rank_id='60000000-0000-0000-0000-000000000006',class_id='10000000-0000-0000-0000-000000000002' where entry_kind='recorded_grade';
alter table exam_import_private.records enable trigger historical_exam_immutable;
set local role authenticated;
select pg_temp.check84((select count(*)>0 and bool_and(rank_before='Karate Sixth Kyu') from public.get_assessment_result_history() where outcome='recorded_grade'),'same class predecessor');
reset role;
select set_config('request.jwt.claim.sub','',true);
insert into auth.users(id,email,raw_user_meta_data) values
 ('84000000-0000-4000-8000-000000000001','aikido84@example.invalid','{"full_name":"Synthetic Aikido","phone":"08123456789","date_of_birth":"1990-01-01","requested_class_id":"10000000-0000-0000-0000-000000000001","aikikai_registration_number":" AIK  123 "}'),
 ('84000000-0000-4000-8000-000000000002','karate84@example.invalid','{"full_name":"Synthetic Karate","phone":"08123456789","date_of_birth":"1990-01-01","requested_class_id":"10000000-0000-0000-0000-000000000002","aikikai_registration_number":" AIK  456 "}'),
 ('84000000-0000-4000-8000-000000000003','invalid84@example.invalid','{"full_name":"Synthetic Invalid","phone":"08123456789","date_of_birth":"1990-01-01","requested_class_id":"invalid","aikikai_registration_number":" AIK  789 "}');
select pg_temp.check84((select aikikai_registration_number='AIK 123' from public.profiles where id='84000000-0000-4000-8000-000000000001'),'Aikido signup retains normalized optional number');
select pg_temp.check84(not exists(select 1 from public.profiles where id in('84000000-0000-4000-8000-000000000002','84000000-0000-4000-8000-000000000003') and aikikai_registration_number is not null),'other and invalid classes reject metadata number');
-- A single identity in two classes must expose the number only in its Aikido row.
update public.profiles set aikikai_registration_number='SYNTHETIC-MIXED' where id='00000000-0000-0000-0000-000000000003';
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
set local role authenticated;
select pg_temp.check84(not exists(select 1 from public.admin_visible_members where lower(btrim(class_name))<>'aikido' and aikikai_registration_number is not null),'non-Aikido admin rows suppress number');
reset role;
select 'FEATURE084_LOCAL_ASSERTIONS_PASSED';
