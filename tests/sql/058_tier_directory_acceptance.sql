-- Executed only inside the runner's rollback transaction, with draft DDL or
-- persisted 057/058. Uses only existing staging security-test accounts.
create temporary table acceptance058_ids as
select p.registration_number,p.id as user_id,m.id as membership_id,m.class_id,m.dojo_id
from public.profiles p join public.class_memberships m on m.user_id=p.id
where p.registration_number in ('0001','0002','0101') and m.status::text='active';
grant select on acceptance058_ids to authenticated;
do $fixtures$
begin
 if (select count(*) from acceptance058_ids)<>3 then raise exception 'Expected exactly three test memberships'; end if;
 if not exists(select 1 from public.profiles where registration_number='0001' and is_super_admin) then raise exception 'Missing Super Admin'; end if;
end
$fixtures$;
select set_config('request.jwt.claims',jsonb_build_object('sub',user_id,'role','authenticated')::text,true)
from acceptance058_ids where registration_number='0001';
select set_config('request.jwt.claim.sub',user_id::text,true) from acceptance058_ids where registration_number='0001';
update public.profiles set is_grading_assessor=true where id=(select user_id from acceptance058_ids where registration_number='0001');
-- Normalise only the test member, all reverted by the outer rollback.
update public.class_memberships set rank_id='57e91a37-21f2-49e8-bfeb-06853743f12f',
 sub_rank_id='9b03d137-2a3d-44d6-94a0-6ba52834d63a',level='mudansha'
where id=(select membership_id from acceptance058_ids where registration_number='0101');

set local role authenticated;
do $roles$
declare r record; n bigint; k text; result record;
begin
 for r in select * from acceptance058_ids loop
  perform set_config('request.jwt.claim.sub',r.user_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',r.user_id,'role','authenticated')::text,true);
  select count(*) into n from public.get_my_member_directory_v2();
  if n<3 then raise exception 'Directory excludes other classes/dojos'; end if;
  for result in select to_jsonb(d) j from public.get_my_member_directory_v2() d loop
   if (select array_agg(key order by key) from jsonb_object_keys(result.j) key)
      is distinct from array['avatar_url','enrollments','full_name','instagram_username'] then raise exception 'Private directory top-level field'; end if;
   if exists(select 1 from jsonb_array_elements(result.j->'enrollments') e
      where (select array_agg(key order by key) from jsonb_object_keys(e) key)
        is distinct from array['class_name','current_rank','home_dojo']) then raise exception 'Private enrolment field'; end if;
  end loop;
  if r.registration_number<>'0001' then
   begin
    perform public.submit_bulk_assessment(gen_random_uuid(),r.class_id,current_date,null,null,r.dojo_id,'[]');
    raise exception 'Non Super Admin submitted assessment';
   exception when insufficient_privilege then null; end;
  end if;
 end loop;
end
$roles$;

select set_config('request.jwt.claim.sub',user_id::text,true) from acceptance058_ids where registration_number='0101';
select set_config('request.jwt.claims',jsonb_build_object('sub',user_id,'role','authenticated')::text,true) from acceptance058_ids where registration_number='0101';
do $member_denied$
begin
 begin
  perform public.promote_membership((select membership_id from acceptance058_ids where registration_number='0101'),current_date,null,null);
  raise exception 'Member promoted self';
 exception when insufficient_privilege then null; end;
end
$member_denied$;

select set_config('request.jwt.claim.sub',user_id::text,true) from acceptance058_ids where registration_number='0002';
select set_config('request.jwt.claims',jsonb_build_object('sub',user_id,'role','authenticated')::text,true) from acceptance058_ids where registration_number='0002';
do $admin$
declare target uuid; assessor uuid; h uuid;
begin
 select membership_id into target from acceptance058_ids where registration_number='0101';
 select user_id into assessor from acceptance058_ids where registration_number='0001';
 begin
  perform * from public.get_next_membership_promotion((select membership_id from acceptance058_ids where registration_number='0001'));
  raise exception 'Admin read foreign dojo progression';
 exception when insufficient_privilege then null; end;
 begin
  perform public.promote_membership((select membership_id from acceptance058_ids where registration_number='0001'),current_date,assessor,null);
  raise exception 'Admin promoted foreign dojo';
 exception when insufficient_privilege then null; end;
 h:=public.promote_membership(target,(timezone('Asia/Jakarta',now()))::date,assessor,null);
 if not exists(select 1 from public.membership_grade_history where id=h and membership_id=target
   and rank_id='57e91a37-21f2-49e8-bfeb-06853743f12f' and sub_rank_id='382221ae-f2ed-46c1-8fa9-3f9b826a7409'
   and created_by=auth.uid()) then raise exception 'Tier or audit incorrect'; end if;
end
$admin$;
reset role;
-- Null-dojo targets and inactive memberships must not broaden an Admin scope.
update public.class_memberships set dojo_id=null
where id=(select membership_id from acceptance058_ids where registration_number='0101');
set local role authenticated;
do $null_dojo$
begin
 begin perform * from public.get_next_membership_promotion((select membership_id from acceptance058_ids where registration_number='0101'));
 raise exception 'Null dojo permitted Admin progression'; exception when insufficient_privilege then null; end;
end
$null_dojo$;
reset role;
update public.class_memberships set dojo_id=(select dojo_id from acceptance058_ids where registration_number='0101'),status='inactive'
where id=(select membership_id from acceptance058_ids where registration_number='0101');
set local role authenticated;
do $inactive$
begin
 begin perform * from public.get_next_membership_promotion((select membership_id from acceptance058_ids where registration_number='0101'));
 raise exception 'Inactive target progression permitted'; exception when insufficient_privilege then null; end;
end
$inactive$;
reset role;
update public.class_memberships set status='active'
where id=(select membership_id from acceptance058_ids where registration_number='0101');
update public.class_memberships set sub_rank_id='f433e115-6754-46d6-9185-281a5bc098f3'
where id=(select membership_id from acceptance058_ids where registration_number='0101');
set local role authenticated;
do $rank_denied$
begin
 begin
  perform public.promote_membership((select membership_id from acceptance058_ids where registration_number='0101'),current_date,null,null);
  raise exception 'Admin crossed rank boundary';
 exception when insufficient_privilege then null; end;
end
$rank_denied$;
select set_config('request.jwt.claim.sub',user_id::text,true) from acceptance058_ids where registration_number='0001';
select set_config('request.jwt.claims',jsonb_build_object('sub',user_id,'role','authenticated')::text,true) from acceptance058_ids where registration_number='0001';
do $assessment$
declare target uuid; cls uuid; dojo uuid; prepared jsonb; result jsonb; expected record; key uuid:=gen_random_uuid();
begin
 select membership_id,class_id,dojo_id into target,cls,dojo from acceptance058_ids where registration_number='0101';
 begin
  perform public.promote_membership(target,current_date,auth.uid(),null);
  raise exception 'Super Admin bypassed assessment for rank';
 exception when insufficient_privilege then null; end;
 select * into expected from public.get_next_membership_promotion(target);
 prepared:=public.prepare_bulk_assessment(gen_random_uuid(),cls,(timezone('Asia/Jakarta',now()))::date,auth.uid(),null,dojo,
   jsonb_build_array(jsonb_build_object('membership_id',target,'expected_rank_to_id',expected.next_rank_id,'expected_sub_rank_to_id',expected.next_sub_rank_id)));
 result:=public.finalize_prepared_bulk_assessment((prepared->>'prepared_assessment_id')::uuid,key,
   jsonb_build_array(jsonb_build_object('membership_id',target,'outcome','pass','notes','ROLLBACK058')));
 if (result->>'passed_count')::integer<>1 then raise exception 'Assessment did not pass one member'; end if;
 if not exists(select 1 from public.class_memberships where id=target and rank_id=expected.next_rank_id) then raise exception 'Assessment did not advance rank'; end if;
 if not exists(select 1 from public.announcements where id=(result->>'announcement_id')::uuid and published) then raise exception 'Assessment announcement absent'; end if;
 result:=public.finalize_prepared_bulk_assessment((prepared->>'prepared_assessment_id')::uuid,key,
   jsonb_build_array(jsonb_build_object('membership_id',target,'outcome','pass','notes','ROLLBACK058')));
 if (result->>'idempotent')::boolean is distinct from true then raise exception 'Assessment replay not idempotent'; end if;
end
$assessment$;
select set_config('request.jwt.claim.sub',user_id::text,true) from acceptance058_ids where registration_number='0002';
select set_config('request.jwt.claims',jsonb_build_object('sub',user_id,'role','authenticated')::text,true) from acceptance058_ids where registration_number='0002';
do $undo_denied$
begin
 begin perform public.undo_last_membership_promotion((select membership_id from acceptance058_ids where registration_number='0101'),'ROLLBACK058');
 raise exception 'Admin undid rank assessment'; exception when insufficient_privilege then null; end;
 begin perform public.undo_last_membership_promotion((select membership_id from acceptance058_ids where registration_number='0001'),'ROLLBACK058');
 raise exception 'Admin undid foreign dojo'; exception when insufficient_privilege then null; end;
end
$undo_denied$;
reset role;
select set_config('request.jwt.claim.sub',user_id::text,true) from acceptance058_ids where registration_number='0001';
select set_config('request.jwt.claims',jsonb_build_object('sub',user_id,'role','authenticated')::text,true) from acceptance058_ids where registration_number='0001';
-- Deceased target must disappear from the public directory and be ineligible.
update public.profiles set date_of_passing=(timezone('Asia/Jakarta',now()))::date-1
where id=(select user_id from acceptance058_ids where registration_number='0101');
set local role authenticated;
do $deceased$
begin
 if exists(select 1 from public.get_my_member_directory_v2() where full_name=(select full_name from public.profiles where registration_number='0101')) then raise exception 'Deceased target listed'; end if;
 begin perform * from public.get_next_membership_promotion((select membership_id from acceptance058_ids where registration_number='0101'));
 raise exception 'Deceased target progression permitted'; exception when insufficient_privilege then null; end;
end
$deceased$;
reset role;
-- Disabled caller must not browse; no persisted account change.
update public.profiles set account_status='disabled' where id=(select user_id from acceptance058_ids where registration_number='0101');
select set_config('request.jwt.claim.sub',user_id::text,true) from acceptance058_ids where registration_number='0101';
select set_config('request.jwt.claims',jsonb_build_object('sub',user_id,'role','authenticated')::text,true) from acceptance058_ids where registration_number='0101';
set local role authenticated;
do $disabled$
begin
 begin perform * from public.get_my_member_directory_v2(); raise exception 'Disabled caller read directory';
 exception when insufficient_privilege then null; end;
end
$disabled$;
reset role;
set local role anon;
do $anon$
begin
 begin perform * from public.get_my_member_directory_v2(); raise exception 'Anonymous directory read'; exception when insufficient_privilege then null; end;
end
$anon$;
reset role;
do $internal_acl$
declare f text; r text;
begin
 foreach f in array array['public._apply_assessed_membership_promotion(uuid,date,uuid,text)','public._calculate_membership_promotion(uuid)','public.assert_membership_progression_scope(uuid)'] loop
 foreach r in array array['anon','authenticated','service_role'] loop
 if has_function_privilege(r,f,'EXECUTE') then raise exception 'Internal helper exposed'; end if;
 end loop; end loop;
end
$internal_acl$;
