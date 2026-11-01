begin;
create function pg_temp.conversion_check(ok boolean,label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'Conversion assertion failed: %',label; end if; end $$;
insert into public.classes(id,name) values('51000000-0000-4000-8000-000000000001','Conversion Class'),('51000000-0000-4000-8000-000000000002','Other Class');
insert into public.dojos(id,class_id,name,requires_superadmin_share,superadmin_share_percent)
 values('61000000-0000-4000-8000-000000000001','51000000-0000-4000-8000-000000000001','Conversion Dojo',false,0);
insert into public.ranks(id,class_id,name,level) values
 ('71000000-0000-4000-8000-000000000001','51000000-0000-4000-8000-000000000001','1st Dan','yudansha'),
 ('71000000-0000-4000-8000-000000000002','51000000-0000-4000-8000-000000000001','5th Kyu','mudansha');
insert into member_import_private.batches(source_sha256,source_filename,source_rows,source_headers,decisions)
 values(repeat('c',64),'synthetic-only',11,'[]','{}');
insert into member_import_private.conversion_class_map values(repeat('c',64),0,'Aikido','51000000-0000-4000-8000-000000000001');
insert into member_import_private.conversion_dojo_map values(repeat('c',64),0,'conversion dojo','61000000-0000-4000-8000-000000000001');
insert into member_import_private.conversion_rank_map values
 (repeat('c',64),0,'dan 1','71000000-0000-4000-8000-000000000001'),
 (repeat('c',64),0,'kyu 5','71000000-0000-4000-8000-000000000002');
create function pg_temp.synthetic_source(mid text,full_name text,grade text default 'Dan 1',terminated text default '',email text default null)
returns jsonb language plpgsql as $$ declare cells jsonb; begin
 select jsonb_agg(jsonb_build_object('type','n','value',null) order by i) into cells from generate_series(0,30)i;
 cells:=jsonb_set(cells,'{0}',jsonb_build_object('type','s','value',mid));
 cells:=jsonb_set(cells,'{1}',jsonb_build_object('type','s','value',full_name));
 cells:=jsonb_set(cells,'{3}',jsonb_build_object('type','s','value',email));
 cells:=jsonb_set(cells,'{5}',jsonb_build_object('type','s','value',terminated));
 cells:=jsonb_set(cells,'{6}',jsonb_build_object('type','s','value',' Conversion Dojo '));
 cells:=jsonb_set(cells,'{7}',jsonb_build_object('type','s','value',grade));
 cells:=jsonb_set(cells,'{8}',jsonb_build_object('type','s','value','Inactive'));
 cells:=jsonb_set(cells,'{9}',jsonb_build_object('type','date','value','2020-01-01T00:00:00'));
 return cells;
end $$;
insert into member_import_private.source_rows(source_sha256,sheet_name,row_number,source_json,row_sha256,disposition,review_reasons)
 select repeat('c',64),'MEMBER DATA',n,j::text,encode(sha256(convert_to(j::text,'UTF8')),'hex'),
 case n when 8 then 'held_for_review' when 9 then 'existing_owner_preserved' when 10 then 'orphan_held' else 'pending_member_conversion' end,'[]'
 from (select n,case n
 when 6 then pg_temp.synthetic_source('JS-0901','Conversion Member')
 when 7 then pg_temp.synthetic_source('JS-0902','Second Member','Unranked','Yes')
 when 11 then pg_temp.synthetic_source('JS-0903','  NORMALIZED   person  ','Unranked','Yes','Source@Example.Invalid')
 when 12 then pg_temp.synthetic_source('JS-0901','Collision Member')
 when 13 then jsonb_set(pg_temp.synthetic_source('JS-0913','Invalid Phone'),'{4}','{"type":"n","value":81234}')
 when 14 then jsonb_set(pg_temp.synthetic_source('JS-0914','Blank Birthday'),'{2}','{"type":"s","value":""}')
 when 15 then pg_temp.synthetic_source('JS-0915','Kyu Member','Kyu-5')
 else pg_temp.synthetic_source('JS-09'||n::text,'Additional Member') end j
 from generate_series(6,16)n) s;
create function pg_temp.source_hash(n integer) returns text language sql as $$
 select row_sha256 from member_import_private.source_rows where row_number=n and source_sha256=repeat('c',64);
$$;
create function pg_temp.member_plan(mid text,full_name text,rank_id uuid default '71000000-0000-4000-8000-000000000001',account_status text default 'active',email text default null)
returns jsonb language sql as $$
 select jsonb_build_object('profile',jsonb_build_object('registration_number',mid,'full_name',full_name,'email',email,'phone',null,'date_of_birth',null,'account_status',account_status),
 'memberships',jsonb_build_array(jsonb_build_object('class_id','51000000-0000-4000-8000-000000000001','dojo_id','61000000-0000-4000-8000-000000000001','rank_id',rank_id,'status','inactive','joined_date',null,'inactive_since','2020-01-01')));
$$;
create function pg_temp.reject_plan(n integer,plan jsonb,label text) returns void language plpgsql as $$
begin
 begin perform member_import_private.convert_reviewed_member(repeat('c',64),n,pg_temp.source_hash(n),plan);
  raise exception 'Invalid conversion accepted: %',label;
 exception when check_violation then null; end;
end $$;
do $$ declare plan jsonb; result uuid; again uuid; bad jsonb; n integer;
begin
 plan:=pg_temp.member_plan('JS-0901','Conversion Member');
 result:=member_import_private.convert_reviewed_member(repeat('c',64),6,pg_temp.source_hash(6),plan);
 perform pg_temp.conversion_check((select auth_user_id is null and member_origin='import' and not email_verified and not is_super_admin and email is null and date_of_birth is null from profiles where id=result),'offline profile with unknown values');
 perform pg_temp.conversion_check((select count(*)=1 from class_memberships where user_id=result and joined_date is null and role='user' and status='inactive' and level='yudansha'),'existing grade classification retained');
 perform pg_temp.conversion_check((select count(*)=3 from auth.users),'no Auth users created');
 perform pg_temp.conversion_check((select count(*)=0 from email_outbox),'no email queued');
 perform pg_temp.conversion_check((select reviewed_plan#>>'{memberships,0,inactive_since}'='2020-01-01' from member_import_private.conversions where profile_id=result),'historic inactive date preserved privately');
 perform pg_temp.conversion_check((select count(*)=0 from membership_status_history),'no invented status transition');
 update profiles set phone='081234' where id=result;
 again:=member_import_private.convert_reviewed_member(repeat('c',64),6,pg_temp.source_hash(6),plan);
 perform pg_temp.conversion_check(result=again and (select phone='081234' from profiles where id=result),'safe repeat preserves edits');
 perform pg_temp.reject_plan(6,jsonb_set(plan,'{profile,phone}','"changed"'),'changed receipt plan');
 begin perform member_import_private.convert_reviewed_member(repeat('c',64),7,repeat('0',64),plan);
  raise exception 'Wrong source hash accepted'; exception when check_violation then null; end;
 for n in 8..10 loop perform pg_temp.reject_plan(n,plan,'held/owner/orphan'); end loop;
 begin perform member_import_private.convert_reviewed_member(repeat('c',64),12,pg_temp.source_hash(12),pg_temp.member_plan('JS-0901','Collision Member'));
  raise exception 'Identity collision merged'; exception when unique_violation then null; end;
 bad:=pg_temp.member_plan('JS-0902','Second Member',null,'disabled');
 perform pg_temp.reject_plan(7,plan,'swapped source plan');
 perform pg_temp.reject_plan(7,jsonb_set(bad,'{profile,full_name}','"Forged Name"'),'identity tamper');
 perform pg_temp.reject_plan(7,jsonb_set(bad,'{profile,account_status}','"active"'),'termination tamper');
 perform pg_temp.reject_plan(7,jsonb_set(bad,'{memberships,0,rank_id}','"71000000-0000-4000-8000-000000000001"'),'grade tamper');
 perform pg_temp.reject_plan(7,jsonb_set(bad,'{memberships,0,joined_date}','"2000-01-01"'),'invented joining date');
 perform pg_temp.reject_plan(7,jsonb_set(bad,'{memberships}',(bad->'memberships')||(bad->'memberships')),'duplicate membership');
 perform pg_temp.reject_plan(7,jsonb_set(bad,'{memberships,0,status}','"break"'),'ambiguous break');
 perform pg_temp.reject_plan(7,jsonb_set(bad,'{profile,is_super_admin}','true'),'privilege');
 perform pg_temp.reject_plan(7,jsonb_set(bad,'{memberships,0,class_id}','"51000000-0000-4000-8000-000000000002"'),'dojo mismatch');
 perform pg_temp.conversion_check((select count(*)=1 from same_id_import_private.reservations),'failed conversion leaves no reservation');
 perform pg_temp.conversion_check((select count(*)=4 from profiles),'failed conversion leaves no profile');
 perform pg_temp.conversion_check((select count(*)=1 from class_memberships),'failed conversion leaves no membership');
 perform pg_temp.conversion_check((select count(*)=1 from member_import_private.conversions),'failed conversion leaves no receipt');
 result:=member_import_private.convert_reviewed_member(repeat('c',64),7,pg_temp.source_hash(7),bad);
 perform pg_temp.conversion_check((select account_status='disabled' and auth_user_id is null from profiles where id=result),'terminated remains disabled');
 perform pg_temp.conversion_check((select rank_id is null and sub_rank_id is null and title_level is null from class_memberships where user_id=result),'unranked without invented title/tier');
 bad:=pg_temp.member_plan('JS-0903','  NORMALIZED   person  ',null,'disabled','source@example.invalid');
 result:=member_import_private.convert_reviewed_member(repeat('c',64),11,pg_temp.source_hash(11),bad);
 perform pg_temp.conversion_check((select full_name='Normalized Person' and email='source@example.invalid' and not email_verified and auth_user_id is null from profiles where id=result),'application normalization without online access');
 perform pg_temp.reject_plan(13,pg_temp.member_plan('JS-0913','Invalid Phone'),'numeric phone');
 begin
  update public.ranks set level=null where id='71000000-0000-4000-8000-000000000001';
  perform member_import_private.convert_reviewed_member(repeat('c',64),16,pg_temp.source_hash(16),pg_temp.member_plan('JS-0916','Additional Member'));
  raise exception 'Missing rank classification accepted'; exception when check_violation then null;
 end;
 result:=member_import_private.convert_reviewed_member(repeat('c',64),14,pg_temp.source_hash(14),pg_temp.member_plan('JS-0914','Blank Birthday'));
 perform pg_temp.conversion_check((select date_of_birth is null from profiles where id=result),'blank source date stays unknown');
 result:=member_import_private.convert_reviewed_member(repeat('c',64),15,pg_temp.source_hash(15),pg_temp.member_plan('JS-0915','Kyu Member','71000000-0000-4000-8000-000000000002'));
 perform pg_temp.conversion_check((select rank_id='71000000-0000-4000-8000-000000000002' and level='mudansha' from class_memberships where user_id=result),'Kyu-5 source alias normalized');
 perform pg_temp.conversion_check((select count(*)=11 from member_import_private.source_rows),'all source rows preserved');
 perform pg_temp.conversion_check((select count(*)=3 from auth.users),'source email does not create Auth account');
 perform pg_temp.conversion_check((select count(*)=0 from email_outbox),'source email does not queue messages');
 perform pg_temp.conversion_check(not exists(select 1 from membership_subscription_charges)
  and not exists(select 1 from membership_payments) and not exists(select 1 from membership_grade_history)
  and not exists(select 1 from grade_certificates) and not exists(select 1 from assessment_results),
  'no invented financial, grade, certificate or assessment history');
end $$;
set local role service_role;
do $$ begin
 begin perform member_import_private.convert_reviewed_member(repeat('c',64),11,repeat('0',64),'{}');
  raise exception 'Service role converted a member'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'CONVERSION_ACCEPTANCE_PASSED';
rollback;
