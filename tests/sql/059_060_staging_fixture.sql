-- Separate three-account fixture COMPONENT, not a standalone executable release.
-- Requires the guarded, reviewed rollback-only assembler and explicit live approval.
-- No Auth/profile writes, existing membership changes, fourth actor or generators.
do $fixture_guard$
declare ticket jsonb := nullif(current_setting('jwg.staging_fixture_ticket',true),'')::jsonb;
begin
 if ticket is null or ticket->>'projectRef' is distinct from 'eomubndonbetszdbhsrj'
    or ticket->>'nonce' is null or ticket->>'nonce' !~ '^[a-f0-9]{32}$'
    or current_setting('application_name') is distinct from 'jwg-finance-rehearsal-'||(ticket->>'nonce')
    or session_user::text <> 'postgres' or current_user::text <> 'postgres'
    or current_setting('transaction_read_only') <> 'off'
    or current_setting('plpgsql.check_asserts') <> 'on' then
   raise exception using errcode='Z0592',message='JWG_STAGING_FIXTURE_GUARD_REJECTED';
 end if;
end $fixture_guard$;

create temporary table finance_staging_baseline on commit drop as
select
 (select coalesce(jsonb_agg(to_jsonb(p) order by p.id),'[]') from public.profiles p) as profiles,
 (select coalesce(jsonb_agg(to_jsonb(m) order by m.id),'[]') from public.class_memberships m) as memberships,
 (select coalesce(jsonb_agg(to_jsonb(a) order by a.id),'[]') from public.dojo_admin_assignments a) as assignments,
 (select md5(coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text)::text,'[]')) from public.membership_status_history t) as status_digest,
 (select md5(coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text)::text,'[]')) from public.notification_outbox t) as outbox_digest,
 (select jsonb_build_array(last_value::text,is_called) from public.membership_status_history_id_seq) as status_sequence,
 (select jsonb_build_array(last_value::text,is_called) from public.notification_outbox_id_seq) as outbox_sequence,
 (select coalesce(jsonb_agg(id order by id),'[]') from public.notifications) as notification_ids,
 (select md5(coalesce(jsonb_agg(to_jsonb(t) order by t.id)::text,'[]')) from public.notifications t) as notification_digest;
-- Private baseline is never granted to the authenticated role.
create temporary table finance_staging_fixture(ids jsonb not null) on commit drop;
grant select on pg_temp.finance_staging_fixture to authenticated;
do $fixture$
declare
 ticket jsonb := current_setting('jwg.staging_fixture_ticket')::jsonb;
 actors jsonb := ticket->'bindings';
 member_id uuid := (actors->>'member')::uuid;
 admin_id uuid := (actors->>'admin')::uuid;
 super_id uuid := (actors->>'superAdmin')::uuid;
 class_a uuid := gen_random_uuid(); class_b uuid := gen_random_uuid();
 dojo_a uuid := gen_random_uuid(); dojo_b uuid := gen_random_uuid();
 member_a uuid := gen_random_uuid(); member_b uuid := gen_random_uuid(); admin_a uuid := gen_random_uuid();
 assignment_a uuid := gen_random_uuid(); setting_a uuid := gen_random_uuid(); setting_b uuid := gen_random_uuid();
 bill_waive uuid := gen_random_uuid(); bill_skip uuid := gen_random_uuid();
 bill_first uuid := gen_random_uuid(); bill_second uuid := gen_random_uuid();
 m date := date_trunc('month',now() at time zone 'Asia/Jakarta')::date;
begin
 if member_id is null or admin_id is null or super_id is null
    or member_id=admin_id or member_id=super_id or admin_id=super_id
    or (select count(*) from public.profiles p where
      (p.id=member_id and p.registration_number='0101' and not p.is_super_admin or
       p.id=admin_id and p.registration_number='0002' and not p.is_super_admin or
       p.id=super_id and p.registration_number='0001' and p.is_super_admin)
      and p.account_status::text='active' and p.date_of_passing is null) <> 3 then
   raise exception using errcode='Z0592',message='JWG_STAGING_FIXTURE_ACTORS_REJECTED';
 end if;
 insert into pg_temp.finance_staging_fixture values(jsonb_build_object(
   'nonce',ticket->>'nonce','member',member_id,'admin',admin_id,'superAdmin',super_id,
   'classA',class_a,'classB',class_b,'dojoA',dojo_a,'dojoB',dojo_b,
   'memberA',member_a,'memberB',member_b,'adminA',admin_a,'assignmentA',assignment_a,
   'settingA',setting_a,'settingB',setting_b,'waive',bill_waive,'skip',bill_skip,'first',bill_first,'second',bill_second));
 insert into public.classes(id,name) values
   (class_a,'Finance Rehearsal A '||class_a),(class_b,'Finance Rehearsal B '||class_b);
 insert into public.dojos(id,class_id,name,active) values
   (dojo_a,class_a,'Finance Rehearsal A '||dojo_a,true),(dojo_b,class_b,'Finance Rehearsal B '||dojo_b,true);
 insert into public.class_memberships(id,user_id,class_id,dojo_id,status) values
   (member_a,member_id,class_a,dojo_a,'active'),(member_b,member_id,class_b,dojo_b,'active'),
   (admin_a,admin_id,class_a,dojo_a,'active');
 insert into public.dojo_admin_assignments(id,user_id,class_id,dojo_id,active,assigned_by)
   values(assignment_a,admin_id,class_a,dojo_a,true,super_id);
 insert into public.dojo_subscription_settings(id,dojo_id,class_id,default_fee,currency,effective_from,active)
   values(setting_a,dojo_a,class_a,300000,'IDR',(m-interval '4 months')::date,true),
     (setting_b,dojo_b,class_b,300000,'IDR',(m-interval '4 months')::date,true);
 insert into public.membership_subscription_charges(id,membership_id,dojo_id,class_id,billing_month,amount,currency,rate_source)
   values(bill_waive,member_a,dojo_a,class_a,(m-interval '3 months')::date,300000,'IDR','dojo_default'),
     (bill_skip,member_a,dojo_a,class_a,(m-interval '2 months')::date,300000,'IDR','dojo_default'),
     (bill_first,member_a,dojo_a,class_a,(m-interval '1 month')::date,300000,'IDR','dojo_default'),
     (bill_second,member_a,dojo_a,class_a,m,300000,'IDR','dojo_default');
 -- Consume the transaction-local ordering ticket. It is not standalone authority.
 perform set_config('jwg.staging_fixture_ticket','',true);
end $fixture$;
