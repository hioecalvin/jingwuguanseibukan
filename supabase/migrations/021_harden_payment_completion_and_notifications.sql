-- ============================================================
-- 021 HARDEN PAYMENT COMPLETION AND NOTIFICATIONS
-- ============================================================
--
-- Hosted staging acceptance proved that the official-payment RPC accepted a
-- further payment after a charge was fully paid. The same acceptance run also
-- proved that the current confirmation-review RPC records linked payments but
-- does not notify the Member after approval or rejection.
-- ============================================================

begin;

do $preflight$
begin
  if pg_catalog.to_regprocedure(
    'public.record_membership_payment(uuid,numeric,text,text,date,text)'
  ) is null then
    raise exception 'Required record_membership_payment function is missing';
  end if;

  if pg_catalog.to_regprocedure(
    'public.review_membership_payment_confirmation(uuid,text,text)'
  ) is null then
    raise exception 'Required review_membership_payment_confirmation function is missing';
  end if;

  if pg_catalog.to_regprocedure(
    'public.create_notification(uuid,text,text,text,text,uuid,jsonb)'
  ) is null then
    raise exception 'Required create_notification function is missing';
  end if;

  if pg_catalog.to_regclass('public.membership_subscription_charges') is null
     or pg_catalog.to_regclass('public.membership_payments') is null
     or pg_catalog.to_regclass('public.membership_payment_confirmations') is null
  then
    raise exception 'Required payment relations are missing';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_class as index_data
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = index_data.relnamespace
    join pg_catalog.pg_index as index_state
      on index_state.indexrelid = index_data.oid
    where namespace.nspname = 'public'
      and index_data.relname = 'membership_payments_confirmation_unique_idx'
      and index_state.indisunique
      and index_state.indisvalid
  ) then
    raise exception 'Required unique payment-confirmation index is missing or invalid';
  end if;
end
$preflight$;


create or replace function public.record_membership_payment(
  target_charge_id uuid,
  payment_amount numeric,
  payment_method_value text default null,
  payment_reference_value text default null,
  payment_date_value date default current_date,
  payment_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  charge_record public.membership_subscription_charges%rowtype;
  payment_id uuid;
  already_paid numeric := 0;
  remaining_balance numeric := 0;
  final_paid numeric := 0;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into charge_record
  from public.membership_subscription_charges
  where id = target_charge_id
  for update;

  if not found then
    raise exception 'Subscription charge not found';
  end if;

  if not public.can_access_dojo_finance(
    charge_record.dojo_id,
    auth.uid()
  ) then
    raise exception 'You do not have financial access to this dojo';
  end if;

  if payment_amount is null or payment_amount <= 0 then
    raise exception 'Payment amount must be greater than zero';
  end if;

  if charge_record.status in ('waived', 'cancelled') then
    raise exception 'This subscription charge is closed and cannot accept payments';
  end if;

  select coalesce(sum(payment.amount), 0)
  into already_paid
  from public.membership_payments as payment
  where payment.charge_id = target_charge_id;

  remaining_balance := greatest(charge_record.amount - already_paid, 0);

  if charge_record.status = 'paid' or remaining_balance <= 0 then
    raise exception 'This subscription charge is already fully paid';
  end if;

  if payment_amount > remaining_balance then
    raise exception 'Payment exceeds the remaining subscription balance';
  end if;

  insert into public.membership_payments (
    charge_id,
    membership_id,
    dojo_id,
    amount,
    currency,
    payment_method,
    payment_reference,
    payment_date,
    recorded_by,
    notes
  )
  values (
    target_charge_id,
    charge_record.membership_id,
    charge_record.dojo_id,
    payment_amount,
    charge_record.currency,
    nullif(trim(payment_method_value), ''),
    nullif(trim(payment_reference_value), ''),
    coalesce(payment_date_value, current_date),
    auth.uid(),
    nullif(trim(payment_notes), '')
  )
  returning id into payment_id;

  final_paid := already_paid + payment_amount;

  update public.membership_subscription_charges
  set status = case
    when final_paid >= charge_record.amount then 'paid'
    when final_paid > 0 then 'partially_paid'
    else 'unpaid'
  end
  where id = target_charge_id;

  return payment_id;
end;
$function$;


create or replace function public.review_membership_payment_confirmation(
  target_confirmation_id uuid,
  decision text,
  rejection_note text default null
)
returns void
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  confirmation_record public.membership_payment_confirmations%rowtype;
  charge_record public.membership_subscription_charges%rowtype;
  already_paid numeric := 0;
  remaining_balance numeric := 0;
  final_paid numeric := 0;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into confirmation_record
  from public.membership_payment_confirmations
  where id = target_confirmation_id
  for update;

  if not found then
    raise exception 'Payment confirmation not found';
  end if;

  if not public.can_access_dojo_finance(
    confirmation_record.dojo_id,
    auth.uid()
  ) then
    raise exception 'Not authorised to review this payment';
  end if;

  if confirmation_record.status <> 'pending' then
    raise exception 'This payment confirmation has already been reviewed';
  end if;

  if decision not in ('approved', 'rejected') then
    raise exception 'Decision must be approved or rejected';
  end if;

  if decision = 'rejected'
     and nullif(trim(rejection_note), '') is null
  then
    raise exception 'A rejection reason is required';
  end if;

  if decision = 'rejected' then
    update public.membership_payment_confirmations
    set status = 'rejected',
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        rejection_reason = trim(rejection_note)
    where id = target_confirmation_id;

    perform public.create_notification(
      confirmation_record.submitted_by,
      'membership_payment_confirmation_rejected',
      'Payment confirmation declined',
      'Your payment confirmation was declined. You can submit another confirmation.',
      'membership_payment_confirmation',
      confirmation_record.id,
      jsonb_build_object(
        'confirmation_id', confirmation_record.id,
        'charge_id', confirmation_record.charge_id,
        'membership_id', confirmation_record.membership_id,
        'dojo_id', confirmation_record.dojo_id,
        'rejection_reason', trim(rejection_note)
      )
    );

    return;
  end if;

  select *
  into charge_record
  from public.membership_subscription_charges
  where id = confirmation_record.charge_id
  for update;

  if not found then
    raise exception 'Subscription charge not found';
  end if;

  if charge_record.membership_id <> confirmation_record.membership_id then
    raise exception 'Payment confirmation membership does not match charge';
  end if;

  if charge_record.dojo_id <> confirmation_record.dojo_id then
    raise exception 'Payment confirmation dojo does not match charge';
  end if;

  if confirmation_record.amount <= 0 then
    raise exception 'Payment amount must be greater than zero';
  end if;

  if charge_record.status in ('waived', 'cancelled') then
    raise exception 'This subscription charge is closed and cannot accept payments';
  end if;

  select coalesce(sum(payment.amount), 0)
  into already_paid
  from public.membership_payments as payment
  where payment.charge_id = charge_record.id;

  remaining_balance := greatest(charge_record.amount - already_paid, 0);

  if charge_record.status = 'paid' or remaining_balance <= 0 then
    raise exception 'This subscription charge is already fully paid';
  end if;

  if confirmation_record.amount > remaining_balance then
    raise exception 'Payment exceeds the remaining subscription balance';
  end if;

  insert into public.membership_payments (
    confirmation_id,
    charge_id,
    membership_id,
    dojo_id,
    amount,
    currency,
    payment_method,
    payment_reference,
    payment_date,
    recorded_by,
    recorded_at,
    notes
  )
  values (
    confirmation_record.id,
    charge_record.id,
    confirmation_record.membership_id,
    confirmation_record.dojo_id,
    confirmation_record.amount,
    charge_record.currency,
    confirmation_record.payment_method,
    null,
    confirmation_record.transfer_date,
    auth.uid(),
    now(),
    confirmation_record.member_note
  );

  update public.membership_payment_confirmations
  set status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      rejection_reason = null
  where id = target_confirmation_id;

  select coalesce(sum(payment.amount), 0)
  into final_paid
  from public.membership_payments as payment
  where payment.charge_id = charge_record.id;

  update public.membership_subscription_charges
  set status = case
    when final_paid >= charge_record.amount then 'paid'
    when final_paid > 0 then 'partially_paid'
    else 'unpaid'
  end
  where id = charge_record.id;

  perform public.create_notification(
    confirmation_record.submitted_by,
    'membership_payment_confirmation_approved',
    'Payment confirmed',
    'Your subscription payment has been confirmed.',
    'membership_subscription_charge',
    charge_record.id,
    jsonb_build_object(
      'confirmation_id', confirmation_record.id,
      'charge_id', charge_record.id,
      'membership_id', confirmation_record.membership_id,
      'dojo_id', confirmation_record.dojo_id,
      'amount', confirmation_record.amount,
      'currency', charge_record.currency
    )
  );
end;
$function$;


comment on function public.record_membership_payment(
  uuid, numeric, text, text, date, text
) is
  'Records a scoped official payment without permitting closed-charge payment or overpayment.';

comment on function public.review_membership_payment_confirmation(
  uuid, text, text
) is
  'Atomically reviews a Member payment confirmation, links approved payments and notifies the submitting Member.';

revoke execute on function public.record_membership_payment(
  uuid, numeric, text, text, date, text
) from public, anon;
revoke execute on function public.review_membership_payment_confirmation(
  uuid, text, text
) from public, anon;

grant execute on function public.record_membership_payment(
  uuid, numeric, text, text, date, text
) to authenticated, service_role;
grant execute on function public.review_membership_payment_confirmation(
  uuid, text, text
) to authenticated, service_role;

commit;
