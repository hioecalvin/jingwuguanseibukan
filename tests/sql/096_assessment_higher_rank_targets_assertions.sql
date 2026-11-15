begin;
select set_config('app.current_uid','00000000-0000-0000-0000-000000000001',false);
do $$
declare
 member_id uuid:='50000000-0000-0000-0000-000000000001';
 class_id uuid:='10000000-0000-0000-0000-000000000001';
 assessor_id uuid:='00000000-0000-0000-0000-000000000004';
 target_id uuid:='60000000-0000-0000-0000-000000000003';
 original_id uuid:='60000000-0000-0000-0000-000000000001';
 grading_date date:=(timezone('Asia/Jakarta',now()))::date;
 prepared_id uuid; stale_id uuid; first_key uuid:=gen_random_uuid(); submit_key uuid; answer jsonb; roster jsonb;
 original_history integer; selected jsonb; result_count integer; iteration integer; rejected boolean;
begin
 select count(*) into original_history from public.membership_grade_history where membership_id=member_id;
 select c into roster from public.get_bulk_assessment_candidates_with_member_ids(class_id,null) c
 where c->>'membership_id'=member_id::text;
 if jsonb_array_length(roster->'target_options')<>3 or exists(
  select 1 from jsonb_array_elements(roster->'target_options') o where o->>'rank_to_id'=original_id::text
 ) then raise exception 'Dropdown must contain only higher ranks';end if;
 selected:=jsonb_build_array(jsonb_build_object('membership_id',member_id,'expected_rank_to_id',target_id,'expected_sub_rank_to_id',null));
 for iteration in 1..2 loop
  answer:=public.prepare_bulk_assessment(case when iteration=1 then first_key else gen_random_uuid() end,class_id,grading_date,assessor_id,null,null,selected);
  prepared_id:=(answer->>'prepared_assessment_id')::uuid;
  if not exists(select 1 from public.prepared_assessment_candidates where prepared_assessment_id=prepared_id and rank_before_id=original_id and rank_to_id=target_id and sub_rank_to_id is null) then
   raise exception 'Prepared certificate must snapshot the direct 8th to 5th target';end if;
  if iteration=1 then
   answer:=public.prepare_bulk_assessment(first_key,class_id,grading_date,assessor_id,null,null,selected);
   if not (answer->>'idempotent')::boolean then raise exception 'Preparation replay must be idempotent';end if;
  end if;
  submit_key:=gen_random_uuid();
  answer:=public.finalize_prepared_bulk_assessment(prepared_id,submit_key,jsonb_build_array(jsonb_build_object('membership_id',member_id,'outcome',case when iteration=1 then 'fail' else 'pass' end)));
  answer:=public.finalize_prepared_bulk_assessment(prepared_id,submit_key,jsonb_build_array(jsonb_build_object('membership_id',member_id,'outcome',case when iteration=1 then 'fail' else 'pass' end)));
  if not (answer->>'idempotent')::boolean then raise exception 'Submission replay must be idempotent';end if;
  if iteration=1 then
   if (select rank_id from public.class_memberships where id=member_id)<>original_id
    or (select count(*) from public.membership_grade_history where membership_id=member_id)<>original_history then
    raise exception 'Failure must not change rank or add promotion history';end if;
   if not exists(select 1 from public.prepared_assessment_certificates cert join public.prepared_assessment_candidates c on c.id=cert.prepared_candidate_id where c.prepared_assessment_id=prepared_id and cert.status='voided') then
    raise exception 'Failed certificate must be voided';end if;
  end if;
 end loop;
 if (select rank_id from public.class_memberships where id=member_id)<>target_id
  or (select count(*) from public.membership_grade_history where membership_id=member_id)<>original_history+1
  or exists(select 1 from public.membership_grade_history where membership_id=member_id and rank_id='60000000-0000-0000-0000-000000000002') then
  raise exception 'Pass must make one direct promotion without invented intermediate history';end if;
 select count(distinct assessment_number) into result_count from public.assessment_results where membership_id=member_id;
 if result_count<>2 then raise exception 'Failed and passed same-day attempts must have distinct assessment numbers';end if;
 if not exists(select 1 from public.assessment_results where membership_id=member_id and outcome='fail' and promotion_history_id is null and rank_to_id=target_id)
  or not exists(select 1 from public.assessment_results where membership_id=member_id and outcome='pass' and promotion_history_id is not null and rank_to_id=target_id and rank_before_id=original_id) then
  raise exception 'Results must record actual start and selected target';end if;
 -- Same and lower targets are rejected even when invoked below the UI.
 for iteration in 1..2 loop
  rejected:=false;
  begin
   perform public._resolve_assessment_rank_target(member_id,case when iteration=1 then target_id else original_id end);
  exception when others then rejected:=true;end;
  if not rejected then raise exception 'Same/lower target accepted';end if;
 end loop;
 update public.class_memberships set rank_id='60000000-0000-0000-0000-000000000004' where id=member_id;
 rejected:=false;
 begin perform public._resolve_assessment_rank_target(member_id,target_id);exception when others then rejected:=true;end;
 if not rejected then raise exception '4th Kyu must not assess for 5th Kyu';end if;
 insert into public.ranks(id,name,sort_order,class_id,level)
 values('60000000-0000-0000-0000-000000000099','Foreign high grade',999,'10000000-0000-0000-0000-000000000002','mudansha');
 rejected:=false;
 begin perform public._resolve_assessment_rank_target(member_id,'60000000-0000-0000-0000-000000000099');exception when others then rejected:=true;end;
 if not rejected then raise exception 'Cross-class target accepted';end if;
 -- A second candidate changes grade after preparation but remains below target.
 member_id:='50000000-0000-0000-0000-000000000002';
 selected:=jsonb_build_array(jsonb_build_object('membership_id',member_id,'expected_rank_to_id',target_id,'expected_sub_rank_to_id',null));
 rejected:=false;
 begin
  perform public.prepare_bulk_assessment(gen_random_uuid(),class_id,grading_date,assessor_id,null,null,
   jsonb_set(selected,'{0,expected_sub_rank_to_id}','"70000000-0000-0000-0000-000000000002"'));
 exception when others then rejected:=true;end;
 if not rejected then raise exception 'Tier-target request accepted';end if;
 answer:=public.prepare_bulk_assessment(gen_random_uuid(),class_id,grading_date,assessor_id,null,null,selected);
 stale_id:=(answer->>'prepared_assessment_id')::uuid;
 update public.class_memberships set rank_id='60000000-0000-0000-0000-000000000002' where id=member_id;
 rejected:=false;
 begin
  perform public.finalize_prepared_bulk_assessment(stale_id,gen_random_uuid(),jsonb_build_array(jsonb_build_object('membership_id',member_id,'outcome','pass')));
 exception when others then
  if position('starting grade changed' in sqlerrm)=0 then raise;end if;
  rejected:=true;
 end;
 if not rejected or exists(select 1 from public.assessment_results where membership_id=member_id) then raise exception 'Stale preparation must roll back';end if;
 if has_function_privilege('authenticated','public._apply_assessed_membership_target(uuid,date,uuid,text,uuid)','execute')
  or has_function_privilege('anon','public._resolve_assessment_rank_target(uuid,uuid)','execute') then raise exception 'Private target helpers exposed';end if;
 perform set_config('app.current_uid','00000000-0000-0000-0000-000000000003',true);
 rejected:=false;
 begin perform public.get_bulk_assessment_candidates_with_member_ids(class_id,null);exception when insufficient_privilege then rejected:=true;end;
 if not rejected then raise exception 'Ordinary member can select assessment targets';end if;
end;$$;
rollback;
