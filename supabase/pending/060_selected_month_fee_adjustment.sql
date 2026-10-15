-- LOCAL CANDIDATE ONLY. Requires approved 059; no deployment/application authorized.
-- Reuse existing fee history, notifications and waived charge status. No new table.
begin;
do $preflight$
begin
  if to_regclass('public.membership_fee_adjustment_history') is null
    or to_regprocedure('public.quote_advance_subscription_payment(uuid,date,integer,date[])') is null then
    raise exception 'Required existing fee history and pending 059 are missing';
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.membership_fee_adjustment_history'::regclass
    and conname='membership_fee_adjustment_history_type_check' and contype='c'
    and pg_get_constraintdef(oid) = $expected$CHECK ((adjustment_type = ANY (ARRAY['this_month_only'::text, 'this_month_onward'::text, 'next_month_onward'::text])))$expected$) then
    raise exception 'Fee history type constraint differs; reconcile before applying';
  end if;
end
$preflight$;
alter table public.membership_fee_adjustment_history drop constraint membership_fee_adjustment_history_type_check;
alter table public.membership_fee_adjustment_history add constraint membership_fee_adjustment_history_type_check
  check (adjustment_type in ('this_month_only','this_month_onward','next_month_onward','selected_month_only'));

create function public.adjust_unpaid_subscription_charge(
  target_charge_id uuid, expected_amount numeric, new_amount numeric, adjustment_reason text
)
returns jsonb language plpgsql security definer
set search_path to public, pg_temp
as $function$
declare
  bill public.membership_subscription_charges%rowtype;
  membership public.class_memberships%rowtype;
  history_id uuid;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if expected_amount is null or expected_amount::text in ('NaN','Infinity','-Infinity')
    or new_amount is null or new_amount < 0 or new_amount::text in ('NaN','Infinity','-Infinity')
    or new_amount <> round(new_amount,2)
    or nullif(trim(adjustment_reason),'') is null or length(adjustment_reason)>1000 then
    raise exception 'Enter a finite nonnegative fee (up to two decimals) and a reason';
  end if;
  select * into bill from public.membership_subscription_charges where id=target_charge_id;
  if not found or not public.can_access_dojo_finance(bill.dojo_id,auth.uid()) then
    raise exception 'No financial access to this charge';
  end if;
  -- Match 059 lock ordering: monthly generation -> membership -> charge.
  perform pg_advisory_xact_lock(hashtextextended('subscription-notifications:' || bill.dojo_id::text
    || ':' || to_char(bill.billing_month,'YYYY-MM-DD'),0));
  select * into strict membership from public.class_memberships where id=bill.membership_id for update;
  select * into strict bill from public.membership_subscription_charges where id=target_charge_id for update;
  if not public.can_access_dojo_finance(bill.dojo_id,auth.uid())
    or bill.dojo_id is distinct from membership.dojo_id or bill.class_id is distinct from membership.class_id then
    raise exception 'Membership or financial scope changed';
  end if;
  if bill.status <> 'unpaid' or exists (select 1 from public.membership_payments where charge_id=bill.id)
    or exists (select 1 from public.membership_payment_confirmations where charge_id=bill.id and status='pending') then
    raise exception 'Only unpaid bills without payment activity can be adjusted; review pending reports first';
  end if;
  if bill.amount is distinct from expected_amount then raise exception 'Fee changed; refresh before adjusting'; end if;
  if new_amount=bill.amount then raise exception 'Fee is unchanged'; end if;
  insert into public.membership_fee_adjustment_history
    (membership_id,charge_id,dojo_id,class_id,adjustment_type,effective_from,effective_until,
      old_amount,new_amount,currency,reason,changed_by,changed_at)
  values (bill.membership_id,bill.id,bill.dojo_id,bill.class_id,'selected_month_only',bill.billing_month,
    (bill.billing_month+interval '1 month'-interval '1 day')::date,bill.amount,new_amount,bill.currency,
    trim(adjustment_reason),auth.uid(),now()) returning id into history_id;
  update public.membership_subscription_charges set amount=new_amount,
    status=case when new_amount=0 then 'waived' else 'unpaid' end where id=bill.id;
  perform public.create_notification(membership.user_id,'subscription_fee_adjusted',
    case when new_amount=0 then 'Subscription fee waived' else 'Subscription fee adjusted' end,
    'Your ' || to_char(bill.billing_month,'FMMonth YYYY') || ' fee changed from ' || bill.currency || ' '
      || bill.amount || ' to ' || new_amount || '. ' || trim(adjustment_reason),
    'membership_subscription_charge',bill.id,
    jsonb_build_object('charge_id',bill.id,'adjustment_id',history_id,'old_amount',bill.amount,
      'new_amount',new_amount,'reason',trim(adjustment_reason),'billing_month',bill.billing_month));
  return jsonb_build_object('adjustment_id',history_id,'status',case when new_amount=0 then 'waived' else 'unpaid' end,
    'old_amount',bill.amount,'new_amount',new_amount);
end;
$function$;
alter function public.adjust_unpaid_subscription_charge(uuid,numeric,numeric,text) owner to postgres;
revoke all on function public.adjust_unpaid_subscription_charge(uuid,numeric,numeric,text) from public,anon,authenticated,service_role;
grant execute on function public.adjust_unpaid_subscription_charge(uuid,numeric,numeric,text) to authenticated;

-- Preserve existing adjustment API and history; zero-fee adjustments are waivers,
-- not receipts. Refuse an unreviewed installed body. Do not rewrite old records.
do $legacy_zero_fee$
declare
  definition text:=pg_get_functiondef('public.apply_membership_fee_adjustment(uuid,numeric,text,text)'::regprocedure);
  pattern text:=$pattern$when new_amount = 0\s+then 'paid'$pattern$;
begin
  if (select count(*) from regexp_matches(definition,pattern,'g')) <> 2 then
    raise exception 'Existing fee-adjustment body differs; reconcile before applying';
  end if;
  execute regexp_replace(definition,pattern,$replacement$when new_amount = 0 then 'waived'$replacement$,'g');
end
$legacy_zero_fee$;

-- Other existing zero-fee writers are internal/service-only. Keep signatures,
-- ACLs and business logic; correct only the no-money status, never stored rows.
do $remaining_zero_fee$
declare
  signature text; definition text; pattern text;
begin
  foreach signature in array array[
    'public.adjust_current_membership_fee(uuid,numeric,text)',
    'public.generate_dojo_monthly_subscription_charges(uuid,date)',
    'public.system_generate_monthly_subscriptions(date)'
  ] loop
    if to_regprocedure(signature) is null then raise exception 'Required existing zero-fee writer missing: %',signature; end if;
    definition:=pg_get_functiondef(to_regprocedure(signature));
    pattern:=case when signature like '%adjust_current_membership_fee%'
      then $pattern$when new_amount = 0\s+then 'paid'$pattern$
      else $pattern$when rate_record\.amount = 0\s+then 'paid'$pattern$ end;
    if (select count(*) from regexp_matches(definition,pattern,'g')) <> 1 then
      raise exception 'Zero-fee writer differs; reconcile before applying: %',signature;
    end if;
    execute regexp_replace(definition,pattern,
      case when signature like '%adjust_current_membership_fee%'
        then $replacement$when new_amount = 0 then 'waived'$replacement$
        else $replacement$when rate_record.amount = 0 then 'waived'$replacement$ end,'g');
  end loop;
end
$remaining_zero_fee$;
notify pgrst,'reload schema';
commit;
