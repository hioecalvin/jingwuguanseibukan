-- Synthetic numbering and existing Dojo Admin boundaries; no Class Admin role.
begin;
grant usage on schema public,auth to authenticated;
set role authenticated;
select set_config('app.current_uid','00000000-0000-0000-0000-000000000003',false);
do $$begin
  if to_regprocedure('public.set_class_administrator(uuid,uuid,boolean,text)') is not null then raise exception 'Class Admin survived removal';end if;
end$$;
select set_config('app.current_uid','00000000-0000-0000-0000-000000000001',false);
do $$declare prepared uuid; outcome jsonb; candidate jsonb; first_number text;
begin
  candidate:='[{"membership_id":"50000000-0000-0000-0000-000000000001","expected_rank_to_id":"60000000-0000-0000-0000-000000000002","expected_sub_rank_to_id":"70000000-0000-0000-0000-000000000002"}]';
  prepared:=(public.prepare_bulk_assessment('90000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',current_date,'00000000-0000-0000-0000-000000000004',null,null,candidate)->>'prepared_assessment_id')::uuid;
  if prepared is null then raise exception 'No preparation';end if;
  perform public.record_prepared_assessment_certificate_print(prepared);
  outcome:=public.finalize_prepared_bulk_assessment(prepared,'80000000-0000-0000-0000-000000000001','[{"membership_id":"50000000-0000-0000-0000-000000000001","outcome":"fail","notes":"Reassess"}]');
  select assessment_number into first_number from public.get_assessment_result_history();
  if first_number<>to_char(current_date,'YYYY')||'-0001' then raise exception 'First fail number incorrect';end if;
  outcome:=public.finalize_prepared_bulk_assessment(prepared,'80000000-0000-0000-0000-000000000001','[{"membership_id":"50000000-0000-0000-0000-000000000001","outcome":"fail","notes":"Reassess"}]');
  if (outcome->>'idempotent')::boolean is not true then raise exception 'Retry not idempotent';end if;
  if (select count(*) from public.get_assessment_result_history())<>1 then raise exception 'Retry allocated number';end if;
  prepared:=(public.prepare_bulk_assessment('90000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001',current_date,'00000000-0000-0000-0000-000000000004',null,null,candidate)->>'prepared_assessment_id')::uuid;
  perform public.finalize_prepared_bulk_assessment(prepared,'80000000-0000-0000-0000-000000000002','[{"membership_id":"50000000-0000-0000-0000-000000000001","outcome":"pass"}]');
  if (select count(*) from public.get_assessment_result_history())<>2 then raise exception 'Reassessment missing';end if;
  if not exists(select 1 from public.get_assessment_result_history() h where h.assessment_number=to_char(current_date,'YYYY')||'-0002' and h.outcome='pass') then raise exception 'Pass number missing';end if;
end$$;
select set_config('app.current_uid','30000000-0000-0000-0000-000000000001',false);
do $$begin
 if (select count(*) from public.get_assessment_result_history())<>2 then raise exception 'Own history missing';end if;
end$$;
select set_config('app.current_uid','00000000-0000-0000-0000-000000000003',false);
do $$begin
 if exists(select 1 from public.get_assessment_result_history()) then raise exception 'Foreign history leak';end if;
end$$;
reset role;
insert into public.dojo_admin_assignments(user_id,class_id,dojo_id,active)
select '00000000-0000-0000-0000-000000000002',class_id,dojo_id,true
from public.class_memberships where id='50000000-0000-0000-0000-000000000001';
set role authenticated;
select set_config('app.current_uid','00000000-0000-0000-0000-000000000002',false);
do $$begin
 if (select count(*) from public.get_assessment_result_history())<>2 then raise exception 'Dojo Admin history missing';end if;
 begin
   perform public.prepare_bulk_assessment(gen_random_uuid(),'10000000-0000-0000-0000-000000000001',current_date,'00000000-0000-0000-0000-000000000004',null,null,'[]');
   raise exception 'DOJO ADMIN ASSESSMENT ALLOWED';
 exception when raise_exception then
   if sqlerrm <> 'Only an active Super Admin can prepare assessments' then raise;end if;
 end;
end$$;
reset role;
update public.dojo_admin_assignments set active=false;
set role authenticated;
do $$begin
 if exists(select 1 from public.get_assessment_result_history()) then raise exception 'Revoked dojo history leak';end if;
end$$;
reset role;
do $$begin
 if (select count(*) from public.assessment_results)<>2 then raise exception 'Results missing';end if;
 if (select count(*) from public.prepared_assessment_certificates where status='voided')<>1 or (select count(*) from public.prepared_assessment_certificates where status='issued')<>1 then raise exception 'Certificate lifecycle incorrect';end if;
  begin update public.assessment_results set notes='overwrite';raise exception 'MUTABLE';exception when raise_exception then if sqlerrm<>'Submitted assessment records are immutable' then raise;end if;end;
  begin update public.assessment_results set assessment_date=assessment_date+1;raise exception 'MUTABLE DATE';exception when raise_exception then if sqlerrm<>'Submitted assessment records are immutable' then raise;end if;end;
  begin delete from public.assessment_results;raise exception 'DELETABLE';exception when raise_exception then if sqlerrm<>'Submitted assessment records are immutable' then raise;end if;end;
 if has_table_privilege('authenticated','public.assessment_year_counters','UPDATE') then raise exception 'ACL';end if;
end$$;
-- Exercise the allocation trigger independently of live-date preparation rules.
-- All rows are synthetic, transaction-local and rolled back with their counters.
do $$declare template public.assessment_results%rowtype; next_row public.assessment_results%rowtype; year_value integer; aikido_batch uuid; karate_batch uuid;
begin
 select * into template from public.assessment_results where outcome='fail' limit 1;
 year_value:=extract(year from current_date)::integer+1;
 insert into public.assessment_batches(submission_key,class_id,dojo_id,assessment_date,candidate_count,passed_count,failed_count,request_payload,submitted_by)
 values(gen_random_uuid(),'10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',make_date(year_value,1,1),1,0,1,'{}','00000000-0000-0000-0000-000000000001') returning id into aikido_batch;
 insert into public.assessment_batches(submission_key,class_id,dojo_id,assessment_date,candidate_count,passed_count,failed_count,request_payload,submitted_by)
 values(gen_random_uuid(),'10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000003',make_date(year_value,1,1),1,0,1,'{}','00000000-0000-0000-0000-000000000001') returning id into karate_batch;
 next_row:=template;next_row.id:=gen_random_uuid();next_row.batch_id:=aikido_batch;
 next_row.membership_id:='50000000-0000-0000-0000-000000000002';next_row.member_user_id:='30000000-0000-0000-0000-000000000002';
 next_row.assessment_date:=make_date(year_value,1,1);
 next_row.assessment_number:=null;next_row.assessment_year:=null;next_row.annual_number:=null;
 insert into public.assessment_results select (next_row).*;
 if not exists(select 1 from public.assessment_results where id=next_row.id and annual_number=1 and assessment_year=year_value) then raise exception 'Year did not reset';end if;
 -- Cross-class result shares the same counter, not a class-specific sequence.
 next_row.id:=gen_random_uuid();next_row.membership_id:='50000000-0000-0000-0000-000000000004';next_row.member_user_id:='30000000-0000-0000-0000-000000000004';
 next_row.batch_id:=karate_batch;next_row.dojo_id_snapshot:='20000000-0000-0000-0000-000000000003';next_row.dojo_name_snapshot:='Other Dojo';
 insert into public.assessment_results select (next_row).*;
 if not exists(select 1 from public.assessment_results where id=next_row.id and annual_number=2) then raise exception 'Sequence not shared';end if;
 if (select count(distinct b.class_id) from public.assessment_results r join public.assessment_batches b on b.id=r.batch_id where r.assessment_year=year_value)<>2 then raise exception 'Cross-class fixture does not cover two classes';end if;
 if exists(select 1 from public.assessment_results r join public.assessment_batches b on b.id=r.batch_id join public.class_memberships m on m.id=r.membership_id where r.assessment_year=year_value and (b.class_id<>m.class_id or r.member_user_id<>m.user_id or b.assessment_date<>r.assessment_date or r.dojo_id_snapshot is distinct from m.dojo_id)) then raise exception 'Inconsistent cross-class fixture';end if;
 -- Failed subtransaction must roll back its allocated number.
 begin
   next_row.id:=gen_random_uuid();next_row.membership_id:='50000000-0000-0000-0000-000000000003';
   next_row.member_user_id:='30000000-0000-0000-0000-000000000003';next_row.batch_id:=aikido_batch;
   next_row.dojo_id_snapshot:='20000000-0000-0000-0000-000000000001';next_row.dojo_name_snapshot:='North Dojo';
   insert into public.assessment_results select (next_row).*;
   raise exception 'intentional rollback';
 exception when raise_exception then if sqlerrm<>'intentional rollback' then raise;end if;end;
 if (select last_number from public.assessment_year_counters where assessment_year=year_value)<>2 then raise exception 'Rollback leaked counter';end if;
 -- Maximum does not wrap or truncate to a duplicate four-digit reference.
 update public.assessment_year_counters set last_number=9999 where assessment_year=year_value;
 begin insert into public.assessment_results select (next_row).*;raise exception 'OVERFLOW ACCEPTED';
 exception when check_violation then null;end;
 if (select last_number from public.assessment_year_counters where assessment_year=year_value)<>9999 then raise exception 'Overflow changed counter';end if;
end$$;
-- The complete supported year scopes both display and sequence uniqueness.
-- Retained historical assessments must coexist with this and the next century.
do $$declare template public.assessment_results%rowtype; next_row public.assessment_results%rowtype; year_value integer;
begin
 select * into template from public.assessment_results where outcome='fail' and assessment_year=extract(year from current_date)::integer limit 1;
 foreach year_value in array array[1925,2025,2125] loop
   next_row:=template;next_row.id:=gen_random_uuid();next_row.assessment_date:=make_date(year_value,1,1);
   next_row.assessment_number:=null;next_row.assessment_year:=null;next_row.annual_number:=null;
   insert into public.assessment_batches(submission_key,class_id,dojo_id,assessment_date,candidate_count,passed_count,failed_count,request_payload,submitted_by)
   select gen_random_uuid(),class_id,dojo_id,next_row.assessment_date,1,0,1,'{}',submitted_by from public.assessment_batches where id=template.batch_id returning id into next_row.batch_id;
   insert into public.assessment_results select (next_row).*;
   if not exists(select 1 from public.assessment_results where id=next_row.id and assessment_year=year_value and annual_number=1 and assessment_number=year_value::text||'-0001') then raise exception 'Century-specific allocation failed';end if;
 end loop;
 if (select count(distinct assessment_number) from public.assessment_results where assessment_year in (1925,2025,2125) and annual_number=1)<>3 then raise exception 'Full-year references collided';end if;
 -- Dates outside the supported range fail without creating a counter.
 foreach year_value in array array[1899,2200] loop
   next_row.id:=gen_random_uuid();next_row.assessment_date:=make_date(year_value,1,1);
   begin insert into public.assessment_results select (next_row).*;raise exception 'INVALID YEAR ACCEPTED';
   exception when raise_exception then if sqlerrm<>'Assessment year out of range' then raise;end if;end;
   if exists(select 1 from public.assessment_year_counters where assessment_year=year_value) then raise exception 'Invalid year allocated counter';end if;
 end loop;
end$$;
rollback;
