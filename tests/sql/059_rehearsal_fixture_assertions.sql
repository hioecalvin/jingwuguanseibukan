-- Local validation of the reusable fixture contract under the real SQL role.
-- This file is NOT full-schema staging authorization or browser evidence.
set local plpgsql.check_asserts=on;
set local role authenticated;
do $roles$
declare
  f jsonb := (select ids from pg_temp.finance_fixture);
  m date := date_trunc('month',now() at time zone 'Asia/Jakarta')::date;
  q jsonb; g uuid;
begin
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
  perform public.adjust_unpaid_subscription_charge((f->>'waive')::uuid,300000,0,'Fixture first-month waiver');
  perform set_config('request.jwt.claim.sub',f->>'superAdmin',true);
  q:=public.quote_advance_subscription_payment((f->>'memberB')::uuid,m,1);
  assert (q->>'total')::numeric=300000,'Super Admin can quote the unassigned fixture dojo';
  perform set_config('request.jwt.claim.sub',f->>'member',true);
  q:=public.quote_advance_subscription_payment((f->>'memberA')::uuid,(m-interval '1 month')::date,2);
  g:=public.submit_advance_subscription_payment((f->>'memberA')::uuid,(m-interval '1 month')::date,
    2,q,600000,(now() at time zone 'Asia/Jakarta')::date,'Transfer','Isolated fixture only');
  perform set_config('jwg.fixture_group',g::text,true);
end $roles$;
reset role;
do $pending$
declare f jsonb := (select ids from pg_temp.finance_fixture);
begin
  assert (select count(*)=0 from public.membership_payments where membership_id=(f->>'memberA')::uuid);
  assert (select count(*)=2 from public.membership_payment_confirmations
    where payment_group_id=current_setting('jwg.fixture_group')::uuid and status='pending');
  assert (select status='waived' and amount=0 from public.membership_subscription_charges where id=(f->>'waive')::uuid);
  assert (select status='unpaid' and amount=300000 from public.membership_subscription_charges where id=(f->>'skip')::uuid);
end $pending$;
set local role authenticated;
do $receipt$
declare f jsonb := (select ids from pg_temp.finance_fixture); n integer;
begin
  perform set_config('request.jwt.claim.sub',f->>'member',true);
  begin
    perform public.review_advance_subscription_payment(current_setting('jwg.fixture_group')::uuid,'approved',null);
    raise exception 'Member receipt bypass' using errcode='XX000';
  exception when raise_exception then null; end;
  perform set_config('request.jwt.claim.sub',f->>'admin',true);
  n:=public.review_advance_subscription_payment(current_setting('jwg.fixture_group')::uuid,'approved',null);
  assert n=2,'Both reported months confirmed together';
end $receipt$;
reset role;
set constraints all immediate;
do $verified$
declare f jsonb := (select ids from pg_temp.finance_fixture); after_profiles jsonb;
 b record; digest text;
begin
  assert (select count(*)=1 from public.dojo_admin_assignments
    where id=(f->>'assignmentA')::uuid and user_id=(f->>'admin')::uuid and dojo_id=(f->>'dojoA')::uuid),
    'Exact isolated assignment captured';
  assert (select count(*)=2 from public.dojo_subscription_settings
    where id in((f->>'settingA')::uuid,(f->>'settingB')::uuid)), 'Exact rate-setting UUIDs captured';
  assert (select count(*)=2 and bool_and(name=initcap(name)) from public.classes
    where id in((f->>'classA')::uuid,(f->>'classB')::uuid)), 'Captured class name normalization';
  assert (select count(*)=2 and bool_and(name=initcap(name)) from public.dojos
    where id in((f->>'dojoA')::uuid,(f->>'dojoB')::uuid)), 'Captured dojo name normalization';
  assert (select count(*)=2 and sum(amount)=600000 from public.membership_payments where membership_id=(f->>'memberA')::uuid);
  assert (select count(*)=2 from public.membership_subscription_charges where membership_id=(f->>'memberA')::uuid and status='paid');
  assert (select status='unpaid' and amount=300000 from public.membership_subscription_charges where id=(f->>'skip')::uuid);
  assert (select count(*)=1 and bool_and(changed_by=(f->>'admin')::uuid and new_amount=0)
    from public.membership_fee_adjustment_history where membership_id=(f->>'memberA')::uuid);
  select jsonb_agg(to_jsonb(p) order by p.id) into after_profiles from public.profiles p
    where id in((f->>'member')::uuid,(f->>'admin')::uuid,(f->>'superAdmin')::uuid);
  assert after_profiles=(select actors_before from pg_temp.finance_fixture),'Actor profiles unchanged';
  select * into strict b from pg_temp.finance_fixture_baseline;
  assert (select count(*)=5 from public.notifications t
    where not (b.notification_ids @> jsonb_build_array(t.id))), 'Exactly five captured-writer notifications';
  assert (select count(*)=2 and bool_and(user_id=(f->>'admin')::uuid
      and reference_type='membership_payment_confirmation'
      and message like '% reported their %'
      and message like '%Please confirm receipt before marking it Paid.%')
    from public.notifications t where not (b.notification_ids @> jsonb_build_array(t.id))
      and notification_type='membership_payment_confirmation_pending'), 'Pending alerts ask only the assigned Admin to confirm receipt';
  assert (select count(*)=2 and bool_and(user_id=(f->>'member')::uuid
      and reference_type='membership_subscription_charge'
      and reference_id in((f->>'first')::uuid,(f->>'second')::uuid))
    from public.notifications t where not (b.notification_ids @> jsonb_build_array(t.id))
      and notification_type='membership_payment_confirmation_approved'), 'Receipt alerts reference only the two paid fixture bills';
  assert (select count(*)=1 and bool_and(user_id=(f->>'member')::uuid
      and reference_id=(f->>'waive')::uuid and metadata->>'new_amount'='0')
    from public.notifications t where not (b.notification_ids @> jsonb_build_array(t.id))
      and notification_type='subscription_fee_adjusted'), 'Waiver alert references only the waived fixture bill';
  select md5(coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text)::text,'[]')) into digest from public.membership_status_history t;
  assert digest=b.status_digest,'Existing status audit preserved';
  select md5(coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text)::text,'[]')) into digest from public.notification_outbox t;
  assert digest=b.outbox_digest,'Existing legacy outbox preserved';
  assert (select jsonb_build_array(last_value::text,is_called)=b.status_sequence from public.membership_status_history_id_seq),'Status sequence untouched';
  assert (select jsonb_build_array(last_value::text,is_called)=b.outbox_sequence from public.notification_outbox_id_seq),'Outbox sequence untouched';
  select md5(coalesce(jsonb_agg(to_jsonb(t) order by t.id)::text,'[]')) into digest from public.notifications t
    where b.notification_ids @> jsonb_build_array(t.id);
  assert digest=b.notification_digest,'Existing notifications preserved';
  assert not exists(select 1 from public.notifications t
    where not (b.notification_ids @> jsonb_build_array(t.id))
    and (t.user_id is null or t.user_id not in((f->>'member')::uuid,(f->>'admin')::uuid))),
    'No notifications for unrelated recipients';
end $verified$;

-- Direct reads under captured policies, not owner-only RPC assertions.
-- Fourth synthetic actor and claims are LOCAL ONLY, never remote actor authority.
do $$ begin if inet_server_addr() is distinct from '127.0.0.1'::inet then raise exception 'Local only';end if;end $$;
set local role authenticated;
do $read_boundaries$
declare f jsonb := (select ids from pg_temp.finance_fixture);
begin
  perform set_config('request.jwt.claim.sub',f->>'member',true);
  assert (select count(*)=2 from public.class_memberships where id in((f->>'memberA')::uuid,(f->>'memberB')::uuid,(f->>'adminA')::uuid)), 'Member reads own memberships only';
  assert not exists(select 1 from public.profiles where id=(f->>'admin')::uuid), 'Member cannot read Admin private profile';
  assert (select count(*)=2 from public.membership_payments where membership_id=(f->>'memberA')::uuid), 'Member reads own receipts';
  assert (select count(*)=1 from public.membership_fee_adjustment_history where membership_id=(f->>'memberA')::uuid), 'Member reads own waiver history';
  begin
    update public.membership_subscription_charges set amount=1 where id=(f->>'skip')::uuid;
    raise exception 'Direct financial update permitted' using errcode='XX000';
  exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claim.sub',f->>'admin',true);
  assert (select count(*)=2 from public.class_memberships where id in((f->>'memberA')::uuid,(f->>'memberB')::uuid,(f->>'adminA')::uuid)), 'Admin reads assigned class memberships';
  assert not exists(select 1 from public.class_memberships where id=(f->>'memberB')::uuid), 'Admin cannot read other dojo membership';
  assert (select count(*)=2 from public.membership_payments where membership_id=(f->>'memberA')::uuid), 'Admin reads assigned receipts';
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
  assert not exists(select 1 from public.class_memberships where id in((f->>'memberA')::uuid,(f->>'memberB')::uuid,(f->>'adminA')::uuid)), 'Unassigned local actor has no fixture membership access';
  assert not exists(select 1 from public.membership_subscription_charges where membership_id=(f->>'memberA')::uuid), 'Unassigned actor cannot read charges';
  assert not exists(select 1 from public.membership_payments where membership_id=(f->>'memberA')::uuid), 'Unassigned actor cannot read receipts';
  assert not exists(select 1 from public.membership_fee_adjustment_history where membership_id=(f->>'memberA')::uuid), 'Unassigned actor cannot read fee audit';
  perform set_config('request.jwt.claim.sub',f->>'superAdmin',true);
  assert (select count(*)=3 from public.class_memberships where id in((f->>'memberA')::uuid,(f->>'memberB')::uuid,(f->>'adminA')::uuid)), 'Super Admin reads both fixture dojos';
  assert (select count(*)=2 from public.membership_payments where membership_id=(f->>'memberA')::uuid), 'Super Admin reads fixture receipts';
  perform set_config('request.jwt.claim.sub','',true);
  perform set_config('request.jwt.claims','',true);
  assert not exists(select 1 from public.membership_subscription_charges where membership_id=(f->>'memberA')::uuid), 'Missing claims do not grant private reads';
  raise notice 'PASS: captured profile/membership/finance SELECT policies enforce Member, assigned Admin, unassigned actor, Super Admin and missing-claim boundaries';
end $read_boundaries$;
reset role;
