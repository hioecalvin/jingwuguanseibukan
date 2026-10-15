-- Three bound actors only. No unrelated account, committed writes or delivery.
set local plpgsql.check_asserts=on;
set local role authenticated;
do $report$
declare f jsonb := (select ids from pg_temp.finance_staging_fixture);
 m date := date_trunc('month',now() at time zone 'Asia/Jakarta')::date; q jsonb; g uuid;
begin
 perform set_config('request.jwt.claims','',true);
 perform set_config('request.jwt.claim.sub',f->>'member',true);
 begin
  perform public.adjust_unpaid_subscription_charge((f->>'waive')::uuid,300000,0,'Member must not waive');
  raise exception 'Member waiver bypass' using errcode='XX000';
 exception when raise_exception then null; end;
 perform set_config('request.jwt.claim.sub',f->>'admin',true);
 begin
  perform public.quote_advance_subscription_payment((f->>'memberB')::uuid,m,1);
  raise exception 'Cross-dojo quote bypass' using errcode='XX000';
 exception when raise_exception then null; end;
 perform public.adjust_unpaid_subscription_charge((f->>'waive')::uuid,300000,0,'Rehearsal first-month waiver');
 perform set_config('request.jwt.claim.sub',f->>'superAdmin',true);
 q:=public.quote_advance_subscription_payment((f->>'memberB')::uuid,m,1);
 assert (q->>'total')::numeric=300000,'Super Admin can quote unassigned fixture dojo';
 perform set_config('request.jwt.claim.sub',f->>'member',true);
 q:=public.quote_advance_subscription_payment((f->>'memberA')::uuid,(m-interval '1 month')::date,2);
 g:=public.submit_advance_subscription_payment((f->>'memberA')::uuid,(m-interval '1 month')::date,
   2,q,600000,(now() at time zone 'Asia/Jakarta')::date,'Transfer','Rollback rehearsal only');
 perform set_config('jwg.staging_fixture_group',g::text,true);
end $report$;
reset role;
do $pending$
declare f jsonb := (select ids from pg_temp.finance_staging_fixture);
begin
 assert (select count(*)=0 from public.membership_payments where membership_id=(f->>'memberA')::uuid),'No receipt before confirmation';
 assert (select count(*)=2 from public.membership_payment_confirmations
   where payment_group_id=current_setting('jwg.staging_fixture_group')::uuid and status='pending'),'Two pending months';
 assert (select status='waived' and amount=0 from public.membership_subscription_charges where id=(f->>'waive')::uuid),'First month waived';
 assert (select status='unpaid' and amount=300000 from public.membership_subscription_charges where id=(f->>'skip')::uuid),'Skipped debt remains';
end $pending$;
set local role authenticated;
do $receipt$
declare f jsonb := (select ids from pg_temp.finance_staging_fixture); n integer;
begin
 perform set_config('request.jwt.claim.sub',f->>'member',true);
 begin
  perform public.review_advance_subscription_payment(current_setting('jwg.staging_fixture_group')::uuid,'approved',null);
  raise exception 'Member receipt bypass' using errcode='XX000';
 exception when raise_exception then null; end;
 perform set_config('request.jwt.claim.sub',f->>'admin',true);
 n:=public.review_advance_subscription_payment(current_setting('jwg.staging_fixture_group')::uuid,'approved',null);
 assert n=2,'Assigned Admin confirms both months';
 perform set_config('request.jwt.claim.sub',f->>'member',true);
 assert (select count(*)=2 from public.class_memberships where id in((f->>'memberA')::uuid,(f->>'memberB')::uuid,(f->>'adminA')::uuid)),'Member own memberships';
 assert not exists(select 1 from public.profiles where id=(f->>'admin')::uuid),'Member cannot read Admin private profile';
 assert (select count(*)=2 from public.membership_payments where membership_id=(f->>'memberA')::uuid),'Member own receipts';
 assert (select count(*)=1 from public.membership_fee_adjustment_history where membership_id=(f->>'memberA')::uuid),'Member own waiver audit';
 begin
  update public.membership_subscription_charges set amount=1 where id=(f->>'skip')::uuid;
  raise exception 'Direct financial update permitted' using errcode='XX000';
 exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claim.sub',f->>'admin',true);
 assert (select count(*)=2 from public.class_memberships where id in((f->>'memberA')::uuid,(f->>'memberB')::uuid,(f->>'adminA')::uuid)),'Admin assigned memberships';
 assert not exists(select 1 from public.class_memberships where id=(f->>'memberB')::uuid),'Admin cannot read other dojo';
 assert (select count(*)=2 from public.membership_payments where membership_id=(f->>'memberA')::uuid),'Admin assigned receipts';
 perform set_config('request.jwt.claim.sub',f->>'superAdmin',true);
 assert (select count(*)=3 from public.class_memberships where id in((f->>'memberA')::uuid,(f->>'memberB')::uuid,(f->>'adminA')::uuid)),'Super Admin both dojos';
 perform set_config('request.jwt.claim.sub','',true);
 perform set_config('request.jwt.claims','',true);
 assert not exists(select 1 from public.membership_subscription_charges where membership_id=(f->>'memberA')::uuid),'Missing claims denied';
end $receipt$;
reset role;
set constraints all immediate;
do $preserved$
declare f jsonb := (select ids from pg_temp.finance_staging_fixture); b record; digest text;
begin
 select * into strict b from pg_temp.finance_staging_baseline;
 assert (select coalesce(jsonb_agg(to_jsonb(p) order by p.id),'[]')=b.profiles from public.profiles p),'All profiles unchanged';
 assert (select coalesce(jsonb_agg(to_jsonb(m) order by m.id),'[]')=b.memberships from public.class_memberships m
   where m.id not in((f->>'memberA')::uuid,(f->>'memberB')::uuid,(f->>'adminA')::uuid)),'All original memberships unchanged';
 assert (select coalesce(jsonb_agg(to_jsonb(a) order by a.id),'[]')=b.assignments from public.dojo_admin_assignments a
   where a.id<>(f->>'assignmentA')::uuid),'All original assignments unchanged';
 assert (select count(*)=3 from public.class_memberships where id in((f->>'memberA')::uuid,(f->>'memberB')::uuid,(f->>'adminA')::uuid)),'Exactly three fixture memberships';
 assert (select count(*)=1 from public.dojo_admin_assignments where id=(f->>'assignmentA')::uuid and user_id=(f->>'admin')::uuid and dojo_id=(f->>'dojoA')::uuid),'Bound fixture assignment';
 assert (select count(*)=2 and bool_and(name=initcap(name)) from public.classes where id in((f->>'classA')::uuid,(f->>'classB')::uuid)),'Class normalization';
 assert (select count(*)=2 and bool_and(name=initcap(name)) from public.dojos where id in((f->>'dojoA')::uuid,(f->>'dojoB')::uuid)),'Dojo normalization';
 assert (select count(*)=2 and sum(amount)=600000 from public.membership_payments where membership_id=(f->>'memberA')::uuid),'Exact receipts';
 assert (select count(*)=2 from public.membership_subscription_charges where membership_id=(f->>'memberA')::uuid and status='paid'),'Two paid months';
 assert (select status='unpaid' and amount=300000 from public.membership_subscription_charges where id=(f->>'skip')::uuid),'Skipped debt preserved';
 assert (select count(*)=1 and bool_and(changed_by=(f->>'admin')::uuid and new_amount=0) from public.membership_fee_adjustment_history where membership_id=(f->>'memberA')::uuid),'Exact waiver audit';
 assert (select count(*)=5 from public.notifications t where not (b.notification_ids @> jsonb_build_array(t.id))),'Exactly five fixture notifications';
 assert (select count(*)=2 and bool_and(user_id=(f->>'admin')::uuid and reference_type='membership_payment_confirmation'
   and message like '%Please confirm receipt before marking it Paid.%') from public.notifications t
   where not (b.notification_ids @> jsonb_build_array(t.id)) and notification_type='membership_payment_confirmation_pending'),'Nominated receiver alerts';
 assert (select count(*)=2 and bool_and(user_id=(f->>'member')::uuid and reference_type='membership_subscription_charge'
   and reference_id in((f->>'first')::uuid,(f->>'second')::uuid)) from public.notifications t
   where not (b.notification_ids @> jsonb_build_array(t.id)) and notification_type='membership_payment_confirmation_approved'),'Exact receipt alerts';
 assert (select count(*)=1 and bool_and(user_id=(f->>'member')::uuid and reference_id=(f->>'waive')::uuid and metadata->>'new_amount'='0')
   from public.notifications t where not (b.notification_ids @> jsonb_build_array(t.id)) and notification_type='subscription_fee_adjusted'),'Exact waiver alert';
 select md5(coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text)::text,'[]')) into digest from public.membership_status_history t;
 assert digest=b.status_digest,'Status audit unchanged';
 select md5(coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text)::text,'[]')) into digest from public.notification_outbox t;
 assert digest=b.outbox_digest,'Outbox unchanged';
 assert (select jsonb_build_array(last_value::text,is_called)=b.status_sequence from public.membership_status_history_id_seq),'Status sequence unchanged';
 assert (select jsonb_build_array(last_value::text,is_called)=b.outbox_sequence from public.notification_outbox_id_seq),'Outbox sequence unchanged';
 select md5(coalesce(jsonb_agg(to_jsonb(t) order by t.id)::text,'[]')) into digest from public.notifications t where b.notification_ids @> jsonb_build_array(t.id);
 assert digest=b.notification_digest,'Original notifications unchanged';
 assert not exists(select 1 from public.notifications t where not (b.notification_ids @> jsonb_build_array(t.id))
   and (t.user_id is null or t.user_id not in((f->>'member')::uuid,(f->>'admin')::uuid))),'No unrelated notification recipients';
end $preserved$;
