-- Rollback-contained; actual migration-030 resolver, synthetic rate/catalog rows.
revoke all on function public.get_membership_subscription_rate(uuid,date) from public,anon,authenticated;
grant execute on function public.get_membership_subscription_rate(uuid,date) to service_role;
insert into public.dojo_subscription_settings(dojo_id,class_id,default_fee,currency,effective_from)
values ('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',300000,'IDR','2020-01-01');
insert into public.dojo_subscription_rate_history(dojo_id,class_id,new_fee,new_currency,old_fee,old_currency,effective_from)
values ('20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',350000,'IDR',300000,'IDR',
 (date_trunc('month',now() at time zone 'Asia/Jakarta')+interval '2 months')::date);
insert into public.membership_subscription_overrides(membership_id,special_fee,currency,effective_from,effective_until)
values ('30000000-0000-4000-8000-000000000001',200000,'IDR',
 (date_trunc('month',now() at time zone 'Asia/Jakarta')+interval '1 month')::date,
 (date_trunc('month',now() at time zone 'Asia/Jakarta')+interval '2 months'-interval '1 day')::date);
set local role authenticated;
do $test$
declare
 m uuid:='30000000-0000-4000-8000-000000000001';
 base date:=date_trunc('month',now() at time zone 'Asia/Jakarta')::date;
 q jsonb;
begin
 perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
 begin
   perform public.get_membership_subscription_rate(m,base);
   raise exception 'Browser invoked internal resolver directly' using errcode='XX000';
 exception when insufficient_privilege then null;end;
 q:=public.quote_advance_subscription_payment(m,base,3);
 assert q->>'total'='850000';
 assert q->'months'->0->>'amount'='300000';
 assert q->'months'->1->>'amount'='200000';
 assert q->'months'->1->>'rate_source'='member_special';
 assert q->'months'->2->>'amount'='350000';
 assert q->'months'->2->>'rate_source'='dojo_default';
end $test$;
reset role;
do $test$
declare
 m uuid:='30000000-0000-4000-8000-000000000001';
 base date:=date_trunc('month',now() at time zone 'Asia/Jakarta')::date;
 q jsonb;g uuid;
begin
 perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
 q:=public.quote_advance_subscription_payment(m,base,3);
 perform public.record_advance_subscription_payment(m,base,3,q,850000,(now() at time zone 'Asia/Jakarta')::date,'Cash',null,null);
 assert (select sum(amount)=850000 from public.membership_payments);
 update public.dojo_subscription_rate_history set new_fee=400000;
 assert (select amount=350000 from public.membership_subscription_charges where billing_month=(base+interval '2 months')::date), 'paid advance keeps recorded price';
 -- Scheduled old_* fallback remains available before a future setting begins.
 update public.dojo_subscription_settings set effective_from=(base+interval '6 months')::date;
 assert (select amount=300000 from public.get_membership_subscription_rate(m,base));
 -- Reject changing the applicable rate after quote without creating any charges.
 q:=public.quote_advance_subscription_payment(m,(base+interval '3 months')::date,1);
 update public.dojo_subscription_rate_history set new_fee=410000;
 begin
   perform public.record_advance_subscription_payment(m,(base+interval '3 months')::date,1,q,400000,(now() at time zone 'Asia/Jakarta')::date,'Cash',null,null);
   raise exception 'Stale real-rate quote accepted' using errcode='XX000';
 exception when raise_exception then
   if sqlerrm not like '%review a fresh quote%' then raise;end if;
 end;
 assert (select count(*)=3 from public.membership_subscription_charges);
 -- Per-member override and base currency may not be mixed in one payment.
 insert into public.membership_subscription_overrides(membership_id,special_fee,currency,effective_from,effective_until)
 values (m,10,'USD',(base+interval '4 months')::date,(base+interval '5 months'-interval '1 day')::date);
 begin
   perform public.quote_advance_subscription_payment(m,(base+interval '3 months')::date,2);
   raise exception 'Mixed real currencies accepted' using errcode='XX000';
 exception when raise_exception then
   if sqlerrm not like '%different currencies%' then raise;end if;
 end;
 -- A report pins the billed amount; subsequent rate changes affect new months only.
 perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
 q:=public.quote_advance_subscription_payment(m,(base+interval '3 months')::date,1);
 g:=public.submit_advance_subscription_payment(m,(base+interval '3 months')::date,1,q,410000,(now() at time zone 'Asia/Jakarta')::date,'Transfer',null);
 update public.dojo_subscription_rate_history set new_fee=450000;
 perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
 assert public.review_advance_subscription_payment(g,'approved',null)=1;
 assert (select amount=410000 from public.membership_subscription_charges where billing_month=(base+interval '3 months')::date);
 assert (select sum(amount)=1260000 from public.membership_payments);
 raise notice 'PASS: real 030 resolver intervals, override expiry, scheduled fallback, internal ACL, stale quote, currencies and fixed recorded prices';
end $test$;
set constraints payment_group_review_atomic immediate;
