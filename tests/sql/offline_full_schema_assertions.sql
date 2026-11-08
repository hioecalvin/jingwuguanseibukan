-- Complete captured public/Auth/Storage schema. Synthetic transaction only.
begin;
create function pg_temp.check_true(ok boolean,label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'Full schema assertion failed: %',label; end if; end $$;
insert into classes(id,name) values('50000000-0000-4000-8000-000000000001','Synthetic Class');
insert into dojos(id,class_id,name,requires_superadmin_share,superadmin_share_percent) values
 ('60000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','Synthetic First',false,0),
 ('60000000-0000-4000-8000-000000000002','50000000-0000-4000-8000-000000000001','Synthetic Second',false,0);
insert into class_memberships(user_id,class_id,dojo_id,role) values
 ('10000000-0000-4000-8000-000000000002','50000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','admin'),
 ('10000000-0000-4000-8000-000000000003','50000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000002','user');
insert into dojo_admin_assignments(user_id,class_id,dojo_id,assigned_by) values
 ('10000000-0000-4000-8000-000000000002','50000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001');
insert into same_id_import_private.reservations(profile_id,source_hash,source_row,expected_profile) values
 ('20000000-0000-4000-8000-000000000001',repeat('a',64),1,'{"registration_number":"JS-0101","full_name":"Offline First","email":null,"phone":null,"date_of_birth":null,"account_status":"active"}'),
 ('20000000-0000-4000-8000-000000000002',repeat('a',64),2,'{"registration_number":"JS-0102","full_name":"Offline Second","email":"source@example.invalid","phone":null,"date_of_birth":null,"account_status":"active"}');
insert into profiles(id,member_origin,registration_number,full_name,email) values
 ('20000000-0000-4000-8000-000000000001','import','JS-0101','Offline First',null),
 ('20000000-0000-4000-8000-000000000002','import','JS-0102','Offline Second','source@example.invalid');
insert into class_memberships(user_id,class_id,dojo_id,joined_date) values
 ('20000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001',null),
 ('20000000-0000-4000-8000-000000000002','50000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000002',null);
select pg_temp.check_true((select count(*)=3 from auth.users),'offline imports created no Auth');
select pg_temp.check_true((select count(*)=2 from profiles where member_origin='import' and phone is null and date_of_birth is null),'unknown contacts preserved');

set local role authenticated;
set local request.jwt.claim.role='authenticated';
set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000003';
select pg_temp.check_true((select count(*)=1 from profiles),'Member full-profile privacy');
select pg_temp.check_true(not public.is_super_admin() and not public.is_class_admin('50000000-0000-4000-8000-000000000001'),'Member has no Admin authority');
set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000002';
select pg_temp.check_true((select count(*)=1 from profiles where id='20000000-0000-4000-8000-000000000001'),'Dojo Admin sees own offline member');
select pg_temp.check_true((select count(*)=0 from profiles where id='20000000-0000-4000-8000-000000000002'),'Dojo Admin cannot read other dojo');
set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000001';
select pg_temp.check_true((select count(*)=5 from profiles),'Super Admin sees all');
set local request.jwt.claim.sub='20000000-0000-4000-8000-000000000001';
select pg_temp.check_true((select count(*)=0 from profiles),'unbound JWT cannot read own profile');
select pg_temp.check_true((select count(*)=0 from class_memberships),'unbound JWT cannot read own memberships');
select pg_temp.check_true(not public.is_active_app_user(),'unbound inactive app identity');
select pg_temp.check_true(not public.is_super_admin() and not public.is_class_admin('50000000-0000-4000-8000-000000000001'),'unbound has no administrator authority');
select pg_temp.check_true(not has_schema_privilege(current_user,'member_claim_private','usage'),'private claims inaccessible to Member');
do $$ begin
 begin perform public.prepare_member_claim_setup(gen_random_uuid(),repeat('a',64),repeat('b',64));
  raise exception 'Member unexpectedly executed setup';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
set local request.jwt.claim.sub='';set local request.jwt.claim.role='';

-- Ordinary status corrections retain exact history with no offline email.
update class_memberships set status='inactive' where user_id::text like '20000000%';
select pg_temp.check_true((select count(*)=2 from membership_status_history),'offline history preserved');
select pg_temp.check_true((select count(*)=0 from email_outbox),'offline status did not queue emails');
update class_memberships set status='active' where user_id::text like '20000000%';
select pg_temp.check_true((select count(*)=4 from membership_status_history),'second status correction preserved');

-- Actual event triggers and manual send counts exclude both offline variants.
insert into events(id,class_id,title,starts_at,created_by) values
 ('70000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','Synthetic Event',now()+interval '1 day','10000000-0000-4000-8000-000000000001');
select pg_temp.check_true((select count(*)=2 from email_outbox),'automatic event emails only online members');
select pg_temp.check_true(not exists(select 1 from email_outbox where recipient_user_id::text like '20000000%'),'no event mail for offline members');
set local role authenticated;set local request.jwt.claim.role='authenticated';set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000001';
select pg_temp.check_true(public.queue_event_email('70000000-0000-4000-8000-000000000001')=2,'manual event count excludes offline');
reset role;set local request.jwt.claim.sub='';set local request.jwt.claim.role='';
select pg_temp.check_true((select email_send_count=1 from events where id='70000000-0000-4000-8000-000000000001'),'manual send count');

-- Simulate a previously queued row and ensure the actual worker cannot claim it.
update email_outbox set status='cancelled';
insert into email_outbox(recipient_user_id,recipient_email,email_type,subject) values
 ('20000000-0000-4000-8000-000000000002','source@example.invalid','test','Synthetic stale message'),
 (null,'nonmember@example.invalid','test','Synthetic explicit message');
set local role service_role;set local request.jwt.claim.role='service_role';
select pg_temp.check_true((select recipient_email='nonmember@example.invalid' from public.claim_next_email()),'worker retains explicit nonmember email');
select pg_temp.check_true((select count(*)=0 from public.claim_next_email()),'worker does not claim offline email');
select pg_temp.check_true(not has_schema_privilege(current_user,'member_claim_private','usage'),'service cannot bypass private claims API');
reset role;set local request.jwt.claim.role='';
select pg_temp.check_true((select status='cancelled' from email_outbox where recipient_user_id='20000000-0000-4000-8000-000000000002'),'stale offline email cancelled');

-- Request, proof, scoped approval, setup and real captured Auth lifecycle.
set local role service_role;
select public.request_member_claim('JS-0101','claimed@example.invalid',repeat('a',64),'https://app.example.invalid');
reset role;
select id as claim_id from member_claim_private.claims where email='claimed@example.invalid' \gset
set local role service_role;
select public.verify_member_claim(:'claim_id',repeat('a',64));
reset role;
set local role authenticated;set local request.jwt.claim.role='authenticated';set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000003';
select pg_temp.check_true((select count(*)=0 from public.get_reviewable_member_claims()),'ordinary member cannot list claims');
select set_config('test.claim_id',:'claim_id',true);
do $$ begin
 begin perform public.review_member_claim(current_setting('test.claim_id')::uuid,true);
  raise exception 'Member unexpectedly approved claim';
 exception when insufficient_privilege then null; end;
end $$;
set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000002';
select pg_temp.check_true((select count(*)=1 from public.get_reviewable_member_claims()),'assigned admin reviews claim');
select public.review_member_claim(:'claim_id',true);
reset role;set local request.jwt.claim.sub='';set local request.jwt.claim.role='';
select split_part(template_data->>'setup_url','&token=',2) as setup_token from email_outbox where reference_id=:'claim_id' and email_type='member_claim_setup' \gset
set local role service_role;
select * from public.prepare_member_claim_setup(:'claim_id',:'setup_token',repeat('b',64)) \gset
reset role;
select pg_temp.check_true(:'member_uuid'='20000000-0000-4000-8000-000000000001','setup retains UUID');
insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data) values
 (:'member_uuid',:'verified_email',jsonb_build_object('member_claim_ticket',repeat('b',64)),'{"requested_class_id":"invalid-untrusted"}');
update auth.users set email_confirmed_at=now() where id=:'member_uuid';
set local role service_role;
select pg_temp.check_true(public.member_claim_setup_complete(:'claim_id',:'setup_token'),'full-schema setup completion');
reset role;
select pg_temp.check_true((select full_name='Offline First' and phone is null and date_of_birth is null and email_verified and auth_user_id=id from profiles where id=:'member_uuid'),'history/identity and unknown dates retained');
select pg_temp.check_true((select count(*)=0 from class_requests where user_id=:'member_uuid'),'no duplicate enrollment from signup metadata');
select pg_temp.check_true((select count(*)=4 from membership_status_history),'claim retained status history');
set local role authenticated;set local request.jwt.claim.role='authenticated';set local request.jwt.claim.sub=:'member_uuid';
select pg_temp.check_true((select count(*)=1 from profiles),'claimed Member now sees own profile');
select pg_temp.check_true((select count(*)=1 from class_memberships),'claimed Member sees existing membership');
select pg_temp.check_true(not public.is_super_admin() and not public.is_class_admin('50000000-0000-4000-8000-000000000001'),'claim grants no administrator rights');
reset role;
select 'FULL_SCHEMA_ACCEPTANCE_PASSED';
rollback;
