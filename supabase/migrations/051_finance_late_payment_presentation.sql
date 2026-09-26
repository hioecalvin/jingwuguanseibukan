-- ============================================================
-- 051 FINANCE LATE-PAYMENT PRESENTATION
-- ============================================================
--
-- The accounting contract is intentionally unchanged:
-- - settlement eligibility remains based on membership_payments.payment_date;
-- - the existing eligible-payment function remains the source of truth for
--   settlement-month filtering and duplicate-settlement exclusion;
-- - settlement contents and lifecycle rules are not changed.
--
-- These narrow display wrappers add the related charge billing month and a
-- derived late-payment flag to the existing finance projections.
-- ============================================================

begin;

do $preflight$
begin
  if pg_catalog.to_regclass('public.membership_payments') is null
     or pg_catalog.to_regclass('public.membership_subscription_charges') is null
     or pg_catalog.to_regprocedure('public.get_settlement_eligible_payments(uuid,date)') is null
     or pg_catalog.to_regprocedure('public.get_dojo_settlement_items(uuid)') is null
  then
    raise exception 'Required settlement presentation objects are missing';
  end if;
end
$preflight$;

create or replace function public.get_settlement_eligible_payment_details(
  target_dojo_id uuid,
  target_month date
)
returns table (
  payment_id uuid,
  membership_id uuid,
  member_name text,
  member_id text,
  billing_month date,
  payment_date date,
  is_late_payment boolean,
  payment_amount numeric,
  currency text,
  payment_method text,
  payment_reference text,
  suggested_share numeric
)
language sql
stable
security definer
set search_path to public, pg_temp
as $$
  select
    eligible.payment_id,
    eligible.membership_id,
    eligible.member_name,
    eligible.member_id,
    charge.billing_month,
    eligible.payment_date,
    date_trunc('month', eligible.payment_date)::date
      > date_trunc('month', charge.billing_month)::date,
    eligible.payment_amount,
    eligible.currency,
    eligible.payment_method,
    eligible.payment_reference,
    eligible.suggested_share
  from public.get_settlement_eligible_payments(
    target_dojo_id,
    target_month
  ) as eligible
  join public.membership_payments as payment
    on payment.id = eligible.payment_id
  join public.membership_subscription_charges as charge
    on charge.id = payment.charge_id
$$;


create or replace function public.get_dojo_settlement_item_details(
  target_settlement_id uuid
)
returns table (
  item_id uuid,
  payment_id uuid,
  membership_id uuid,
  member_name text,
  member_id text,
  billing_month date,
  payment_date date,
  is_late_payment boolean,
  payment_amount numeric,
  payment_method text,
  payment_reference text,
  share_percent numeric,
  share_amount numeric,
  currency text
)
language sql
stable
security definer
set search_path to public, pg_temp
as $$
  select
    item.item_id,
    item.payment_id,
    item.membership_id,
    item.member_name,
    item.member_id,
    charge.billing_month,
    item.payment_date,
    date_trunc('month', item.payment_date)::date
      > date_trunc('month', charge.billing_month)::date,
    item.payment_amount,
    item.payment_method,
    item.payment_reference,
    item.share_percent,
    item.share_amount,
    item.currency
  from public.get_dojo_settlement_items(
    target_settlement_id
  ) as item
  join public.membership_payments as payment
    on payment.id = item.payment_id
  join public.membership_subscription_charges as charge
    on charge.id = payment.charge_id
$$;


revoke all privileges
on function public.get_settlement_eligible_payment_details(uuid, date)
from public, anon, authenticated, service_role;

grant execute
on function public.get_settlement_eligible_payment_details(uuid, date)
to authenticated, service_role;

revoke all privileges
on function public.get_dojo_settlement_item_details(uuid)
from public, anon, authenticated, service_role;

grant execute
on function public.get_dojo_settlement_item_details(uuid)
to authenticated, service_role;

comment on function public.get_settlement_eligible_payment_details(uuid, date) is
  'Existing cash-received settlement eligibility enriched with charge billing month and display-only late-payment status.';

comment on function public.get_dojo_settlement_item_details(uuid) is
  'Existing protected settlement detail enriched with charge billing month and display-only late-payment status.';

do $postflight$
begin
  if pg_catalog.to_regprocedure('public.get_settlement_eligible_payment_details(uuid,date)') is null
     or pg_catalog.to_regprocedure('public.get_dojo_settlement_item_details(uuid)') is null
  then
    raise exception 'Settlement presentation functions are incomplete';
  end if;

  if has_function_privilege('anon', 'public.get_settlement_eligible_payment_details(uuid,date)', 'EXECUTE')
     or has_function_privilege('anon', 'public.get_dojo_settlement_item_details(uuid)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.get_settlement_eligible_payment_details(uuid,date)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.get_dojo_settlement_item_details(uuid)', 'EXECUTE')
  then
    raise exception 'Settlement presentation function privileges are unsafe';
  end if;
end
$postflight$;

notify pgrst, 'reload schema';


commit;
