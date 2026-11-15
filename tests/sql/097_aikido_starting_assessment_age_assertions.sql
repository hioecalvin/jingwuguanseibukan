begin;
select set_config('app.current_uid','00000000-0000-0000-0000-000000000001',false);
update public.classes set name='Aikido' where id='10000000-0000-0000-0000-000000000001';
insert into public.ranks(id,name,sort_order,class_id,level)
values('60000000-0000-0000-0000-000000000009','9th Kyu',0,'10000000-0000-0000-0000-000000000001','mudansha');
do $$
declare m uuid:='50000000-0000-0000-0000-000000000001';
 c uuid:='10000000-0000-0000-0000-000000000001';
 fifth uuid:='60000000-0000-0000-0000-000000000003';
 ninth uuid:='60000000-0000-0000-0000-000000000009';
 assessor uuid:='00000000-0000-0000-0000-000000000004';
 today date:=(timezone('Asia/Jakarta',now()))::date; birthday date; row_data jsonb;
 selected jsonb; prepared jsonb; rejected boolean; target uuid;
begin
 update public.class_memberships set rank_id=null,sub_rank_id=null where id=m;
 birthday:=(today-interval '15 years')::date;
 update public.profiles set date_of_birth=birthday where id=(select user_id from public.class_memberships where id=m);
 select r into row_data from public.get_dated_assessment_candidates(c,null,today) r where r->>'membership_id'=m::text;
 if jsonb_array_length(row_data->'target_options')<>1 or row_data->>'rank_to_id'<>fifth::text or row_data ? 'date_of_birth' then
  raise exception 'Exactly 15 must default to fifth only without exposing DOB';end if;
 perform public._resolve_dated_assessment_target(m,fifth,today);
 for target in select id from public.ranks where class_id=c and id<>fifth loop
  rejected:=false;
  begin perform public._resolve_dated_assessment_target(m,target,today);exception when others then rejected:=true;end;
  if not rejected then raise exception 'Adult ungraded target outside fifth accepted';end if;
 end loop;
 -- One day before the 15th birthday has both options; changing the assessment date changes eligibility.
 select r into row_data from public.get_dated_assessment_candidates(c,null,today-1) r where r->>'membership_id'=m::text;
 if jsonb_array_length(row_data->'target_options')<>2 then raise exception 'Under 15 options wrong';end if;
 perform public._resolve_dated_assessment_target(m,ninth,today-1);
 if public._starting_assessment_target_allowed('Aikido',null,'9th Kyu','2000-02-29','2015-03-01')
  or not public._starting_assessment_target_allowed('Aikido',null,'9th Kyu','2000-02-29','2015-02-28') then raise exception 'Leap day age boundary wrong';end if;
 -- No birth date / impossible future birth date blocks both display and preparation.
 update public.profiles set date_of_birth=null where id=(select user_id from public.class_memberships where id=m);
 select r into row_data from public.get_dated_assessment_candidates(c,null,today) r where r->>'membership_id'=m::text;
 if row_data->'target_options'<>'[]'::jsonb or row_data->>'target_blocked_reason' is null or row_data->>'rank_to_id' is not null then raise exception 'Missing DOB must block';end if;
 rejected:=false;
 begin perform public._resolve_dated_assessment_target(m,fifth,today);exception when others then rejected:=true;end;
 if not rejected then raise exception 'Missing DOB accepted';end if;
 update public.profiles set date_of_birth=today+1 where id=(select user_id from public.class_memberships where id=m);
 rejected:=false;
 begin perform public._resolve_dated_assessment_target(m,fifth,today+5);exception when others then rejected:=true;end;
 if not rejected then raise exception 'Future DOB accepted';end if;
 -- Prepare a child's ninth, then correct DOB: submission must revalidate and leave no result.
 update public.profiles set date_of_birth=birthday+1 where id=(select user_id from public.class_memberships where id=m);
 selected:=jsonb_build_array(jsonb_build_object('membership_id',m,'expected_rank_to_id',ninth,'expected_sub_rank_to_id',null));
 prepared:=public.prepare_bulk_assessment(gen_random_uuid(),c,today,assessor,null,null,selected);
 update public.profiles set date_of_birth=birthday where id=(select user_id from public.class_memberships where id=m);
 rejected:=false;
 begin perform public.finalize_prepared_bulk_assessment((prepared->>'prepared_assessment_id')::uuid,gen_random_uuid(),jsonb_build_array(jsonb_build_object('membership_id',m,'outcome','pass')));
 exception when others then
  if position('Ungraded Aikido' in sqlerrm)=0 then raise;end if;rejected:=true;
 end;
 if not rejected or exists(select from public.assessment_results where membership_id=m) then raise exception 'DOB correction bypassed';end if;
 -- A new adult assessment for fifth passes and records one actual starting promotion.
 selected:=jsonb_set(selected,'{0,expected_rank_to_id}',to_jsonb(fifth));
 prepared:=public.prepare_bulk_assessment(gen_random_uuid(),c,today,assessor,null,null,selected);
 perform public.finalize_prepared_bulk_assessment((prepared->>'prepared_assessment_id')::uuid,gen_random_uuid(),jsonb_build_array(jsonb_build_object('membership_id',m,'outcome','pass')));
 if (select rank_id from public.class_memberships where id=m)<>fifth then raise exception 'Adult starting fifth did not apply';end if;
 if not exists(select from public.assessment_results where membership_id=m and rank_before_id is null and rank_to_id=fifth and assessment_number is not null) then raise exception 'Starting assessment record missing';end if;
 if not public._starting_assessment_target_allowed('Karate',null,'8th Kyu',null,today)
 or not public._starting_assessment_target_allowed('Aikido',fifth,'4th Kyu',null,today) then raise exception 'Other classes/ranked candidates changed';end if;
 if has_function_privilege('authenticated','public._resolve_dated_assessment_target(uuid,uuid,date)','execute')
 or has_function_privilege('anon','public.get_dated_assessment_candidates(uuid,uuid,date)','execute') then raise exception 'Age helpers exposed';end if;
 perform set_config('app.current_uid','00000000-0000-0000-0000-000000000003',true);
 rejected:=false;
 begin perform public.get_dated_assessment_candidates(c,null,today);exception when insufficient_privilege then rejected:=true;end;
 if not rejected then raise exception 'Member can read admin roster';end if;
end;$$;
rollback;
