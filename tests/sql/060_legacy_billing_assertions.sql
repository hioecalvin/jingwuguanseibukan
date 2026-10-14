-- Synthetic local-only verification of historical function replacements and RLS.
-- No row data from the saved catalog is restored.
insert into public.dojos(id,name,active) values
 ('20000000-0000-4000-8000-000000000002','Synthetic inactive assigned dojo',false),
 ('20000000-0000-4000-8000-000000000003','Synthetic inactive other dojo',false);
insert into public.dojo_admin_assignments values
 ('10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002',true);
set local role authenticated;
do $rls$
begin
 perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
 assert (select count(*)=1 from public.dojos), 'Member sees only active public dojo';
 perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
 assert (select count(*)=2 from public.dojos), 'Admin sees active public plus own inactive dojo';
 assert not exists(select 1 from public.dojos where id='20000000-0000-4000-8000-000000000003');
 perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
 assert (select count(*)=3 from public.dojos), 'Super Admin sees active and inactive dojos';
end $rls$;
reset role;
update public.profiles set account_status='inactive' where id='10000000-0000-4000-8000-000000000002';
set local role authenticated;
do $rls$
begin
 perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
 assert (select count(*)=1 from public.dojos), 'Disabled Admin loses inactive-dojo visibility';
end $rls$;
reset role;
update public.profiles set account_status='active' where id='10000000-0000-4000-8000-000000000002';
set local role anon;
do $rls$
begin
 perform set_config('request.jwt.claim.sub','',true);
 assert (select count(*)=1 from public.dojos), 'Anonymous active-only policy unchanged';
end $rls$;
reset role;

do $legacy$
declare
 m uuid:='30000000-0000-4000-8000-000000000001';
 d uuid:='20000000-0000-4000-8000-000000000001';
 -- Legacy current-month API intentionally retains existing session-date semantics.
 base date:=date_trunc('month',current_date)::date;
 result jsonb; q jsonb;
begin
 perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
 assert public.generate_dojo_monthly_subscription_charges(d,base)=1;
 result:=public.adjust_current_membership_fee(m,0,'Synthetic legacy waiver');
 assert result->>'new_amount'='0';
 assert (select status='waived' from public.membership_subscription_charges where billing_month=base);
 update public.fixture_rate set amount=0;
 assert public.generate_dojo_monthly_subscription_charges(d,(base+interval '1 month')::date)=1;
 assert public.generate_dojo_monthly_subscription_charges(d,(base+interval '1 month')::date)=0;
 result:=public.system_generate_monthly_subscriptions((base+interval '2 months')::date);
 assert result->>'generated'='1';
 result:=public.system_generate_monthly_subscriptions((base+interval '2 months')::date);
 assert result->>'generated'='0';
 assert (select count(*)=3 from public.membership_subscription_charges where amount=0 and status='waived');
 assert (select count(*)=0 from public.membership_payments), 'No artificial receipts';
 assert (select count(*)=1 from public.notifications where notification_type='monthly_subscription_generated'), 'System replay does not duplicate notification';
 update public.fixture_rate set amount=300000;
 q:=public.quote_advance_subscription_payment(m,(base+interval '3 months')::date,1);
 perform public.record_advance_subscription_payment(m,(base+interval '3 months')::date,1,q,300000,(now() at time zone 'Asia/Jakarta')::date,'Cash',null,null);
 update public.fixture_rate set amount=0;
 assert public.generate_dojo_monthly_subscription_charges(d,(base+interval '3 months')::date)=0;
 result:=public.system_generate_monthly_subscriptions((base+interval '3 months')::date);
 assert result->>'generated'='0';
 assert (select status='paid' and amount=300000 from public.membership_subscription_charges where billing_month=(base+interval '3 months')::date), 'Generators preserve prepaid advance even if later rate is zero';
 assert (select count(*)=1 and sum(amount)=300000 from public.membership_payments);
 assert not has_function_privilege('authenticated','public.system_generate_monthly_subscriptions(date)','EXECUTE');
 assert not has_function_privilege('anon','public.adjust_current_membership_fee(uuid,numeric,text)','EXECUTE');
 assert has_function_privilege('service_role','public.generate_dojo_monthly_subscription_charges(uuid,date)','EXECUTE');
 raise notice 'PASS: scoped inactive-dojo RLS and legacy zero-fee generation/adjustment remain Waived, replay-safe, prepaid-preserving and service-only';
end $legacy$;
