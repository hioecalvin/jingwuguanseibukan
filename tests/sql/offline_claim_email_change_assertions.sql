-- Synthetic imported-claim lifecycle against the complete captured schema.
-- Existing fixture Super Admin is 10000000-0000-4000-8000-000000000001.
begin;
create function pg_temp.email_change_check(ok boolean,label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'Claim email assertion failed: %',label; end if; end $$;
insert into same_id_import_private.reservations(profile_id,source_hash,source_row,expected_profile) values
 ('21000000-0000-4000-8000-000000000001',repeat('e',64),6,
 '{"registration_number":"JS-0951","full_name":"Email Change Fixture","email":null,"phone":null,"date_of_birth":null,"account_status":"active"}');
insert into public.profiles(id,member_origin,registration_number,full_name,email) values
 ('21000000-0000-4000-8000-000000000001','import','JS-0951','Email Change Fixture',null);
set local role service_role;
select public.request_member_claim('JS-0951','claim-original@example.invalid',repeat('e',64),'https://app.example.invalid');
reset role;
select id as claim_id from member_claim_private.claims where member_id='21000000-0000-4000-8000-000000000001' \gset
set local role service_role;
select public.verify_member_claim(:'claim_id',repeat('e',64));
reset role;
set local role authenticated;
set local request.jwt.claim.role='authenticated';
set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000001';
select public.review_member_claim(:'claim_id',true);
reset role;
set local request.jwt.claim.role='';set local request.jwt.claim.sub='';
select split_part(template_data->>'setup_url','&token=',2) as setup_token
 from public.email_outbox where reference_id=:'claim_id' and email_type='member_claim_setup' \gset
set local role service_role;
select * from public.prepare_member_claim_setup(:'claim_id',:'setup_token',repeat('f',64)) \gset
reset role;
insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data) values
 (:'member_uuid',:'verified_email',jsonb_build_object('member_claim_ticket',repeat('f',64)),
 '{"requested_class_id":"invalid-untrusted","requested_dojo_id":"invalid-untrusted"}');

-- A different email cannot be substituted during initial claim confirmation.
do $$ begin
 begin
  update auth.users set email='initial-substitute@example.invalid',email_confirmed_at=now()
   where id='21000000-0000-4000-8000-000000000001';
  raise exception 'Initial confirmation unexpectedly changed claimed email';
 exception when raise_exception then
  if sqlerrm<>'Imported Auth identity mismatch' then raise; end if;
 end;
end $$;
select pg_temp.email_change_check((select email='claim-original@example.invalid' and email_confirmed_at is null
 from auth.users where id=:'member_uuid'),'failed initial substitution retained Auth state');
select pg_temp.email_change_check((select email='claim-original@example.invalid' and not email_verified
 from profiles where id=:'member_uuid'),'failed initial substitution retained profile state');
update auth.users set email_confirmed_at=now() where id=:'member_uuid';
set local role service_role;
select pg_temp.email_change_check(public.member_claim_setup_complete(:'claim_id',:'setup_token'),'initial claim completes normally');
reset role;

-- Auth confirmation trigger sorts before the existing contact-sync trigger.
-- Updating both columns must therefore tolerate the old, still-current profile
-- email until the later trigger synchronizes it and creates the exact audit.
update auth.users set email='Changed@Example.Invalid',email_confirmed_at=now()+interval '1 second'
 where id=:'member_uuid';
select pg_temp.email_change_check((select email='changed@example.invalid' and email_verified
 and auth_user_id=id and registration_number='JS-0951' and full_name='Email Change Fixture'
 and not is_super_admin and not is_grading_assessor from profiles where id=:'member_uuid'),
 'confirmed imported account retains identity and synchronizes email');
select pg_temp.email_change_check((select count(*)=1 from public.profile_contact_change_audit
 where profile_id=:'member_uuid' and field_name='email' and previous_value='claim-original@example.invalid'
 and new_value='changed@example.invalid' and change_source='auth_email_confirmation'
 and changed_by=:'member_uuid'),'one exact ordinary contact-change audit');
select pg_temp.email_change_check((select count(*)=0 from public.class_requests where user_id=:'member_uuid'),
 'email change does not process untrusted enrollment metadata');
select pg_temp.email_change_check((select state='bound' and email='claim-original@example.invalid'
 from member_claim_private.claims where id=:'claim_id'),'original verified claim evidence preserved');
select pg_temp.email_change_check((select count(*)=0 from auth.users where raw_app_meta_data ? 'member_claim_ticket'),
 'claim ticket absent from stored Auth metadata');

-- Email-only updates still follow the existing 049 synchronization path.
update auth.users set email='second-change@example.invalid' where id=:'member_uuid';
select pg_temp.email_change_check((select email='second-change@example.invalid' from profiles where id=:'member_uuid'),
 'email-only confirmation path retained');
select pg_temp.email_change_check((select count(*)=2 from public.profile_contact_change_audit where profile_id=:'member_uuid'),
 'email-only change produces its audit once');
select 'CLAIM_EMAIL_CHANGE_ACCEPTANCE_PASSED';
rollback;
