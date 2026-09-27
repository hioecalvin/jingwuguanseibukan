-- V1 payment simplification: future subscription payments must settle the
-- complete outstanding charge. Historical payment rows remain unchanged.

do $preflight$
begin
  if to_regclass('public.membership_subscription_charges') is null
     or to_regclass('public.membership_payments') is null
     or to_regclass('public.membership_payment_confirmations') is null
  then
    raise exception 'Required membership payment relations are missing';
  end if;
end
$preflight$;

create or replace function public.enforce_full_membership_payment()
returns trigger
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  charge_record public.membership_subscription_charges%rowtype;
  already_paid numeric := 0;
  remaining_balance numeric := 0;
begin
  select *
  into charge_record
  from public.membership_subscription_charges
  where id = new.charge_id
  for update;

  if not found then
    raise exception 'Subscription charge not found';
  end if;

  if charge_record.status in ('waived', 'cancelled') then
    raise exception 'This subscription charge is closed and cannot accept payments';
  end if;

  select coalesce(sum(payment.amount), 0)
  into already_paid
  from public.membership_payments as payment
  where payment.charge_id = new.charge_id;

  remaining_balance := greatest(charge_record.amount - already_paid, 0);

  if remaining_balance <= 0 then
    raise exception 'This subscription charge is already fully paid';
  end if;

  if new.amount is null or new.amount <> remaining_balance then
    raise exception 'Payment must equal the full outstanding subscription balance';
  end if;

  return new;
end;
$function$;

revoke all on function public.enforce_full_membership_payment() from public;
revoke all on function public.enforce_full_membership_payment() from anon;
revoke all on function public.enforce_full_membership_payment() from authenticated;

drop trigger if exists membership_payments_require_full_balance
  on public.membership_payments;

create trigger membership_payments_require_full_balance
before insert on public.membership_payments
for each row
execute function public.enforce_full_membership_payment();

create or replace function public.enforce_full_payment_confirmation()
returns trigger
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  charge_record public.membership_subscription_charges%rowtype;
  already_paid numeric := 0;
  remaining_balance numeric := 0;
begin
  select *
  into charge_record
  from public.membership_subscription_charges
  where id = new.charge_id
  for update;

  if not found then
    raise exception 'Subscription charge not found';
  end if;

  if charge_record.status in ('paid', 'waived', 'cancelled') then
    raise exception 'This subscription charge is closed and cannot accept a confirmation';
  end if;

  if new.membership_id <> charge_record.membership_id
     or new.dojo_id <> charge_record.dojo_id
  then
    raise exception 'Payment confirmation does not match the subscription charge';
  end if;

  select coalesce(sum(payment.amount), 0)
  into already_paid
  from public.membership_payments as payment
  where payment.charge_id = new.charge_id;

  remaining_balance := greatest(charge_record.amount - already_paid, 0);

  if remaining_balance <= 0 then
    raise exception 'This subscription charge is already fully paid';
  end if;

  if new.amount is null or new.amount <> remaining_balance then
    raise exception 'Payment confirmation must equal the full outstanding subscription balance';
  end if;

  return new;
end;
$function$;

revoke all on function public.enforce_full_payment_confirmation() from public;
revoke all on function public.enforce_full_payment_confirmation() from anon;
revoke all on function public.enforce_full_payment_confirmation() from authenticated;

drop trigger if exists membership_payment_confirmations_require_full_balance
  on public.membership_payment_confirmations;

create trigger membership_payment_confirmations_require_full_balance
before insert on public.membership_payment_confirmations
for each row
execute function public.enforce_full_payment_confirmation();

comment on function public.enforce_full_membership_payment() is
  'Requires each future payment row to settle the complete locked outstanding subscription balance.';

comment on function public.enforce_full_payment_confirmation() is
  'Requires each future Member payment confirmation to cover the complete locked outstanding subscription balance.';
