-- Run only in the synthetic loopback cluster created by test-advance-payment-local.mjs.
do $tests$
declare
  member_id uuid := '10000000-0000-4000-8000-000000000001';
  admin_id uuid := '10000000-0000-4000-8000-000000000002';
  super_id uuid := '10000000-0000-4000-8000-000000000003';
  other_id uuid := '10000000-0000-4000-8000-000000000004';
  membership_id uuid := '30000000-0000-4000-8000-000000000001';
  month_value date := date_trunc('month', now() at time zone 'Asia/Jakarta')::date;
  today_value date := (now() at time zone 'Asia/Jakarta')::date;
  quote_value jsonb; group_id uuid; result jsonb; total_count integer; alert_count integer;
begin
  perform set_config('request.jwt.claim.sub', member_id::text, true);
  quote_value := public.quote_advance_subscription_payment(membership_id,month_value,3);
  assert quote_value->>'total' = '900000', 'three monthly rates';
  assert jsonb_array_length(quote_value->'months') = 3;
  assert (select count(*)=0 from public.membership_subscription_charges), 'quote must not generate bills';
  begin
    perform public.record_advance_subscription_payment(membership_id,month_value,3,quote_value,900000,today_value,'Cash',null,null);
    raise exception 'Member bypassed receipt confirmation' using errcode='XX000';
  exception when raise_exception then null; end;
  group_id := public.submit_advance_subscription_payment(membership_id,month_value,3,quote_value,900000,today_value,'Transfer','Synthetic only');
  assert (select count(*)=0 from public.membership_payments), 'report never means paid';
  assert (select count(*)=3 from public.membership_subscription_charges where status='unpaid');
  assert (select count(*)=3 from public.membership_payment_confirmations where status='pending' and payment_group_id=group_id);
  assert (select count(*)=3 from public.notifications where user_id=admin_id), 'dojo alerts';
  assert (select count(*)=0 from public.notifications where user_id=other_id), 'no other dojo alerts';
  begin
    perform public.submit_advance_subscription_payment(membership_id,month_value,3,quote_value,900000,today_value,'Transfer',null);
    raise exception 'Duplicate report accepted' using errcode='XX000';
  exception when raise_exception then null; end;
  perform set_config('request.jwt.claim.sub', other_id::text, true);
  begin
    perform public.review_advance_subscription_payment(group_id,'approved',null);
    raise exception 'Wrong dojo approved' using errcode='XX000';
  exception when raise_exception then null; end;
  perform set_config('request.jwt.claim.sub', admin_id::text, true);
  -- Existing single-item controls cannot approve part of a group.
  begin
    perform public.review_membership_payment_confirmation(
      (select id from public.membership_payment_confirmations where payment_group_id=group_id limit 1),'approved',null);
    set constraints payment_group_review_atomic immediate;
    raise exception 'Split approval accepted' using errcode='XX000';
  exception when raise_exception then null; end;
  assert (select count(*)=0 from public.membership_payments), 'failed split rolls back payment';
  select count(*) into alert_count from public.notifications;
  perform set_config('fixture.fail_membership_payments',
    (select c.billing_month::text from public.membership_payment_confirmations pc
      join public.membership_subscription_charges c on c.id=pc.charge_id
      where pc.payment_group_id=group_id order by pc.id desc limit 1),true);
  begin
    perform public.review_advance_subscription_payment(group_id,'approved',null);
    raise exception 'Final-month approval failure was ignored' using errcode='XX000';
  exception when raise_exception then
    if sqlerrm <> 'Synthetic final-month failure' then raise; end if;
  end;
  perform set_config('fixture.fail_membership_payments','',true);
  assert (select count(*)=0 from public.membership_payments), 'all earlier approvals rolled back';
  assert (select count(*)=3 from public.membership_payment_confirmations where status='pending');
  assert (select count(*)=alert_count from public.notifications), 'failed approval alerts rolled back';
  total_count := public.review_advance_subscription_payment(group_id,'approved',null);
  set constraints payment_group_review_atomic immediate;
  set constraints payment_group_review_atomic deferred;
  assert total_count=3;
  assert (select sum(amount)=900000 from public.membership_payments);
  assert (select count(*)=3 from public.membership_subscription_charges where status='paid');
  begin
    perform public.review_advance_subscription_payment(group_id,'approved',null);
    raise exception 'Repeated review accepted' using errcode='XX000';
  exception when raise_exception then null; end;
  assert public.notify_monthly_subscription_charges('20000000-0000-4000-8000-000000000001',month_value)=0,
    'paid months receive no monthly due message';
  assert public.notify_unpaid_subscription_reminders('20000000-0000-4000-8000-000000000001',month_value)=0;

  -- Direct received-payment action retains its own authorization and atomicity.
  quote_value := public.quote_advance_subscription_payment(membership_id,(month_value+interval '3 months')::date,2);
  begin
    perform public.record_advance_subscription_payment(membership_id,(month_value+interval '3 months')::date,2,quote_value,500000,today_value,'Cash',null,null);
    raise exception 'Partial total accepted' using errcode='XX000';
  exception when raise_exception then null; end;
  assert (select count(*)=3 from public.membership_subscription_charges), 'failed totals leave no charges';
  update public.fixture_rate set amount=350000;
  begin
    perform public.record_advance_subscription_payment(membership_id,(month_value+interval '3 months')::date,2,quote_value,600000,today_value,'Cash',null,null);
    raise exception 'Stale rate accepted' using errcode='XX000';
  exception when raise_exception then null; end;
  quote_value := public.quote_advance_subscription_payment(membership_id,(month_value+interval '3 months')::date,2);
  perform set_config('fixture.fail_membership_payments',(month_value+interval '4 months')::date::text,true);
  begin
    perform public.record_advance_subscription_payment(membership_id,(month_value+interval '3 months')::date,2,quote_value,700000,today_value,'Cash',null,null);
    raise exception 'Final-month receipt failure was ignored' using errcode='XX000';
  exception when raise_exception then
    if sqlerrm <> 'Synthetic final-month failure' then raise; end if;
  end;
  perform set_config('fixture.fail_membership_payments','',true);
  assert (select count(*)=3 from public.membership_payments), 'earlier direct receipts rolled back';
  assert (select count(*)=3 from public.membership_subscription_charges), 'earlier new bills rolled back';
  result := public.record_advance_subscription_payment(membership_id,(month_value+interval '3 months')::date,2,quote_value,700000,today_value,'Cash','test',null);
  assert result->>'recorded_months'='2';
  assert (select count(*)=5 from public.membership_payments);
  assert (select count(*)=3 from public.membership_subscription_charges where amount=300000), 'earlier prices preserved';

  -- Declining a whole group leaves both months unpaid; Member may re-report.
  perform set_config('request.jwt.claim.sub',member_id::text,true);
  quote_value := public.quote_advance_subscription_payment(membership_id,(month_value+interval '5 months')::date,2);
  select count(*) into alert_count from public.notifications;
  perform set_config('fixture.fail_membership_payment_confirmations',(month_value+interval '6 months')::date::text,true);
  begin
    perform public.submit_advance_subscription_payment(membership_id,(month_value+interval '5 months')::date,2,quote_value,700000,today_value,'Transfer',null);
    raise exception 'Final-month report failure was ignored' using errcode='XX000';
  exception when raise_exception then
    if sqlerrm <> 'Synthetic final-month failure' then raise; end if;
  end;
  perform set_config('fixture.fail_membership_payment_confirmations','',true);
  assert (select count(*)=5 from public.membership_subscription_charges), 'report bills rolled back';
  assert (select count(*)=3 from public.membership_payment_confirmations), 'earlier reports rolled back';
  assert (select count(*)=alert_count from public.notifications), 'failed report alerts rolled back';
  group_id := public.submit_advance_subscription_payment(membership_id,(month_value+interval '5 months')::date,2,quote_value,700000,today_value,'Transfer',null);
  perform set_config('request.jwt.claim.sub',super_id::text,true);
  assert public.review_advance_subscription_payment(group_id,'rejected','Not received')=2;
  set constraints payment_group_review_atomic immediate;
  set constraints payment_group_review_atomic deferred;
  assert (select count(*)=5 from public.membership_payments), 'rejection adds no payment';
  perform set_config('request.jwt.claim.sub',member_id::text,true);
  quote_value := public.quote_advance_subscription_payment(membership_id,(month_value+interval '5 months')::date,2);
  group_id := public.submit_advance_subscription_payment(membership_id,(month_value+interval '5 months')::date,2,quote_value,700000,today_value,'Transfer',null);
  assert group_id is not null;
  assert not public.can_access_dojo_finance('20000000-0000-4000-8000-000000000001',super_id), 'caller spoof blocked';

  assert not has_function_privilege('anon','public.submit_advance_subscription_payment(uuid,date,integer,jsonb,numeric,date,text,text,date[])','EXECUTE');
  assert not has_function_privilege('authenticated','public.enforce_payment_group_review()','EXECUTE');
  assert has_function_privilege('authenticated','public.review_advance_subscription_payment(uuid,text,text)','EXECUTE');
  raise notice 'PASS: synthetic multi-month pending/receipt, scope, alerts, atomic review, rejection, duplicates, rates and ACL tests';
end
$tests$;
set constraints payment_group_review_atomic immediate;

-- Execute through the actual low-privilege role, not only spoofed owner claims.
set local role authenticated;
do $role_tests$
declare quote_value jsonb;
begin
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
  quote_value := public.quote_advance_subscription_payment('30000000-0000-4000-8000-000000000001',
    (date_trunc('month',now() at time zone 'Asia/Jakarta')+interval '9 months')::date,1);
  assert quote_value->>'total'='350000';
  begin
    perform 1 from public.membership_payment_confirmations;
    raise exception 'Browser role read confirmation table' using errcode='XX000';
  exception when insufficient_privilege then null; end;
  begin
    perform public.get_pending_advance_payment_groups('20000000-0000-4000-8000-000000000001');
    raise exception 'Member read dojo finance groups' using errcode='XX000';
  exception when raise_exception then null; end;
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
  begin
    perform public.quote_advance_subscription_payment('30000000-0000-4000-8000-000000000001',
      (date_trunc('month',now() at time zone 'Asia/Jakarta')+interval '9 months')::date,1);
    raise exception 'Out-of-dojo Admin quoted Member fees' using errcode='XX000';
  exception when raise_exception then null; end;
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
  assert jsonb_array_length(public.get_pending_advance_payment_groups('20000000-0000-4000-8000-000000000001'))=1;
end
$role_tests$;
reset role;
-- Nonconsecutive arrears: the middle month's complete row must remain unchanged.
set constraints payment_group_review_atomic deferred;
insert into public.membership_subscription_charges
 (membership_id,dojo_id,class_id,billing_month,amount,currency,rate_source)
select '30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',
 '40000000-0000-4000-8000-000000000001',
 (date_trunc('month',now() at time zone 'Asia/Jakarta')-make_interval(months=>n))::date,300000,'IDR','dojo_default'
from generate_series(1,3) n;
do $selected_tests$
declare
  m uuid := '30000000-0000-4000-8000-000000000001';
  base date := date_trunc('month',now() at time zone 'Asia/Jakarta')::date;
  first_date date; last_date date; q jsonb; g uuid; baseline jsonb; dates date[];
begin
  first_date := (base-interval '3 months')::date;
  last_date := (base-interval '1 month')::date;
  dates := array[first_date,last_date];
  select to_jsonb(c) into baseline from public.membership_subscription_charges c
    where billing_month=(base-interval '2 months')::date;
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
  q := public.quote_advance_subscription_payment(m,first_date,2,array[last_date,first_date]);
  assert q->>'total'='600000';
  assert q->'months'->0->>'month'=first_date::text, 'canonical chronological quote';
  foreach dates slice 1 in array array[array[first_date,first_date],array[first_date,null::date],array[first_date,last_date+1]] loop
    begin
      perform public.quote_advance_subscription_payment(m,first_date,2,dates);
      raise exception 'Invalid selected dates accepted' using errcode='XX000';
    exception when raise_exception then null; end;
  end loop;
  dates := array[first_date,last_date];
  begin
    perform public.quote_advance_subscription_payment(m,first_date,3,dates);
    raise exception 'Count mismatch accepted' using errcode='XX000';
  exception when raise_exception then null; end;
  g := public.submit_advance_subscription_payment(m,first_date,2,q,600000,(now() at time zone 'Asia/Jakarta')::date,'Transfer',null,dates);
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
  assert (select item->'months'=to_jsonb(dates) from jsonb_array_elements(public.get_pending_advance_payment_groups(
    '20000000-0000-4000-8000-000000000001')) item where item->>'payment_group_id'=g::text), 'review lists only selected months';
  assert public.review_advance_subscription_payment(g,'approved',null)=2;
  assert (select to_jsonb(c)=baseline from public.membership_subscription_charges c
    where billing_month=(base-interval '2 months')::date), 'skipped debt row unchanged';
  assert (select count(*)=0 from public.membership_payments where charge_id=(baseline->>'id')::uuid);
  first_date := (base+interval '10 months')::date;
  last_date := (base+interval '12 months')::date;
  dates := array[first_date,last_date];
  q := public.quote_advance_subscription_payment(m,first_date,2,dates);
  perform public.record_advance_subscription_payment(m,first_date,2,q,700000,(now() at time zone 'Asia/Jakarta')::date,'Cash',null,null,dates);
  assert (select count(*)=2 from public.membership_subscription_charges where billing_month=any(dates) and status='paid');
  assert (select count(*)=0 from public.membership_subscription_charges where billing_month=(base+interval '11 months')::date), 'skipped future month not generated';
  raise notice 'PASS: selected nonconsecutive report/receipt, exact review months, unchanged skipped debt and invalid date arrays';
end
$selected_tests$;
update public.profiles set account_status='inactive' where id='10000000-0000-4000-8000-000000000002';
update public.profiles set date_of_passing=current_date where id='10000000-0000-4000-8000-000000000003';
set local role authenticated;
do $disabled_roles$
begin
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
  assert not public.can_access_dojo_finance('20000000-0000-4000-8000-000000000001');
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
  assert not public.can_access_dojo_finance('20000000-0000-4000-8000-000000000001');
  raise notice 'PASS: authenticated-role table denial, scope, Super Admin oversight and disabled-account boundaries';
end
$disabled_roles$;
reset role;
set local role anon;
do $anonymous_role$
begin
  begin
    perform public.get_pending_advance_payment_groups('20000000-0000-4000-8000-000000000001');
    raise exception 'Anonymous caller executed finance RPC' using errcode='XX000';
  exception when insufficient_privilege then null; end;
end
$anonymous_role$;
reset role;
