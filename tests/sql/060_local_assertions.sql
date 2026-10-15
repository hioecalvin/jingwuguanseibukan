-- Synthetic cluster only. All fixture changes rolled back by the runner.
insert into public.membership_subscription_charges
 (membership_id,dojo_id,class_id,billing_month,amount,currency,rate_source)
select '30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',
 '40000000-0000-4000-8000-000000000001',
 (date_trunc('month',now() at time zone 'Asia/Jakarta')-make_interval(months=>n))::date,300000,'IDR','dojo_default'
from generate_series(1,3) n;
do $tests$
declare
  first_bill uuid; second_bill uuid; last_bill uuid;
  first_month date := (date_trunc('month',now() at time zone 'Asia/Jakarta')-interval '3 months')::date;
  q jsonb; g uuid; result jsonb;
begin
  select id into first_bill from public.membership_subscription_charges where billing_month=first_month;
  select id into second_bill from public.membership_subscription_charges where billing_month=(first_month+interval '1 month')::date;
  select id into last_bill from public.membership_subscription_charges where billing_month=(first_month+interval '2 months')::date;
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
  begin
    perform public.adjust_unpaid_subscription_charge(first_bill,300000,0,'Not attending');
    raise exception 'Member waived own debt' using errcode='XX000';
  exception when raise_exception then null; end;
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
  begin
    perform public.adjust_unpaid_subscription_charge(first_bill,300000,0,'Not attending');
    raise exception 'Wrong dojo waived debt' using errcode='XX000';
  exception when raise_exception then null; end;
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
  begin
    perform public.adjust_unpaid_subscription_charge(first_bill,300000,0,'  ');
    raise exception 'Blank waiver reason accepted' using errcode='XX000';
  exception when raise_exception then null; end;
  perform set_config('fixture.fail_notification','yes',true);
  begin
    perform public.adjust_unpaid_subscription_charge(first_bill,300000,0,'Failure injection');
    raise exception 'Notification failure was ignored' using errcode='XX000';
  exception when raise_exception then
    if sqlerrm <> 'Synthetic notification failure' then raise; end if;
  end;
  perform set_config('fixture.fail_notification','',true);
  assert (select amount=300000 and status='unpaid' from public.membership_subscription_charges where id=first_bill);
  assert (select count(*)=0 from public.membership_fee_adjustment_history), 'failed notification rolls back waiver and audit';
  result:=public.adjust_unpaid_subscription_charge(first_bill,300000,0,'First month exempt');
  assert result->>'status'='waived';
  assert (select amount=0 and status='waived' from public.membership_subscription_charges where id=first_bill);
  assert (select count(*)=0 from public.membership_payments), 'waiver is not money received';
  assert (select sum(amount)=600000 from public.membership_subscription_charges where status='unpaid');
  assert (select old_amount=300000 and new_amount=0 and reason='First month exempt'
    and changed_by='10000000-0000-4000-8000-000000000002' from public.membership_fee_adjustment_history);
  assert (select count(*)=1 from public.notifications where notification_type='subscription_fee_adjusted');
  begin
    perform public.adjust_unpaid_subscription_charge(first_bill,300000,0,'repeat');
    raise exception 'Duplicate waiver accepted' using errcode='XX000';
  exception when raise_exception then null; end;
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
  begin
    perform public.quote_advance_subscription_payment('30000000-0000-4000-8000-000000000001',first_month,3);
    raise exception 'Waived month quoted for payment' using errcode='XX000';
  exception when raise_exception then null; end;
  begin
    perform public.quote_advance_subscription_payment('30000000-0000-4000-8000-000000000001',(first_month-interval '1 month')::date,1);
    raise exception 'Nonexistent historical bill quoted' using errcode='XX000';
  exception when raise_exception then null; end;
  q:=public.quote_advance_subscription_payment('30000000-0000-4000-8000-000000000001',(first_month+interval '1 month')::date,2);
  assert q->>'total'='600000';
  g:=public.submit_advance_subscription_payment('30000000-0000-4000-8000-000000000001',
    (first_month+interval '1 month')::date,2,q,600000,(now() at time zone 'Asia/Jakarta')::date,'Transfer',null);
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
  begin
    perform public.adjust_unpaid_subscription_charge(second_bill,300000,0,'Pending waiver');
    raise exception 'Pending payment silently repriced' using errcode='XX000';
  exception when raise_exception then null; end;
  assert public.review_advance_subscription_payment(g,'rejected','Incorrect report')=2;
  perform public.adjust_unpaid_subscription_charge(second_bill,300000,250000,'Agreed reduced fee');
  begin
    perform public.adjust_unpaid_subscription_charge(second_bill,300000,200000,'Stale screen');
    raise exception 'Stale fee overwritten' using errcode='XX000';
  exception when raise_exception then null; end;
  -- Pay only the selected second month. Third month must remain due.
  q:=public.quote_advance_subscription_payment('30000000-0000-4000-8000-000000000001',(first_month+interval '1 month')::date,1);
  perform public.record_advance_subscription_payment('30000000-0000-4000-8000-000000000001',
    (first_month+interval '1 month')::date,1,q,250000,(now() at time zone 'Asia/Jakarta')::date,'Cash',null,null);
  assert (select amount=300000 and status='unpaid' from public.membership_subscription_charges where id=last_bill);
  begin
    perform public.adjust_unpaid_subscription_charge(second_bill,250000,0,'Paid waiver');
    raise exception 'Paid fee changed' using errcode='XX000';
  exception when raise_exception then null; end;
  assert (select count(*)=2 from public.membership_fee_adjustment_history), 'only successful changes audited';
  assert not has_function_privilege('anon','public.adjust_unpaid_subscription_charge(uuid,numeric,numeric,text)','EXECUTE');
  -- Existing current-month-only API must label a zero fee Waived too.
  insert into public.membership_subscription_charges
    (membership_id,dojo_id,class_id,billing_month,amount,currency,rate_source)
  values ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000001',date_trunc('month',current_date)::date,300000,'IDR','dojo_default');
  perform public.apply_membership_fee_adjustment('30000000-0000-4000-8000-000000000001',0,'this_month_only','Exempt');
  assert (select status='waived' from public.membership_subscription_charges where billing_month=date_trunc('month',current_date)::date);
  perform set_config('fixture.last_unpaid_charge',last_bill::text,true);
  raise notice 'PASS: waive first overdue month, retain audit, report remaining two, reject, reprice, pay one, retain remaining due and protect paid/pending months';
end
$tests$;
set local role authenticated;
do $role_test$
begin
  perform public.adjust_unpaid_subscription_charge(current_setting('fixture.last_unpaid_charge')::uuid,300000,275000,'Authenticated dojo Admin');
end
$role_test$;
reset role;
