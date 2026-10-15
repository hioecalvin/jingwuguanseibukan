-- ============================================================
-- 019 DEDUPLICATE FUTURE MEMBERSHIP STATUS HISTORY WRITES
-- ============================================================
--
-- Hosted staging acceptance proved that two RPC paths wrote the same status
-- transition twice: once through the existing membership_status_change trigger
-- and once through an explicit INSERT in the RPC body. Keep the trigger as the
-- single writer because every class_memberships.status update passes through it.
-- Existing history is deliberately not deleted; historical rows require a
-- separately reviewed data-reconciliation decision.
-- ============================================================

begin;

do $preflight$
begin
  if not exists (
    select 1
    from pg_catalog.pg_trigger as trigger_record
    join pg_catalog.pg_class as relation
      on relation.oid = trigger_record.tgrelid
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = 'class_memberships'
      and trigger_record.tgname = 'membership_status_change'
      and not trigger_record.tgisinternal
      and trigger_record.tgenabled <> 'D'
  ) then
    raise exception
      'Required membership_status_change trigger is missing or disabled';
  end if;
end
$preflight$;


create or replace function public.review_membership_break_request(
  target_request_id uuid,
  decision text,
  rejection_note text default null::text
)
returns jsonb
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  break_request public.membership_break_requests%rowtype;
  membership public.class_memberships%rowtype;
  current_month date;
  next_month date;
  current_charge_id uuid;
  current_charge_status text;
  payment_exists boolean := false;
  effective_date date;
  activation text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  decision := lower(trim(decision));
  if decision not in ('approved', 'rejected') then
    raise exception 'Decision must be approved or rejected';
  end if;

  select *
  into break_request
  from public.membership_break_requests
  where id = target_request_id
  for update;

  if not found then
    raise exception 'Break request not found';
  end if;
  if break_request.status <> 'pending' then
    raise exception 'This Break request has already been reviewed';
  end if;

  select *
  into membership
  from public.class_memberships
  where id = break_request.membership_id
  for update;

  if not found then
    raise exception 'Membership not found';
  end if;

  if not (
    public.is_super_admin()
    or public.is_class_admin(membership.class_id, membership.dojo_id)
  ) then
    raise exception 'Not authorised to review this Break request';
  end if;

  if decision = 'rejected' then
    if rejection_note is null or trim(rejection_note) = '' then
      raise exception 'Rejection reason is required';
    end if;

    update public.membership_break_requests
    set
      status = 'rejected',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      rejection_reason = trim(rejection_note),
      effective_from = null,
      activation_type = null,
      updated_at = now()
    where id = target_request_id;

    return jsonb_build_object(
      'success', true,
      'decision', 'rejected',
      'membership_id', membership.id
    );
  end if;

  if membership.status <> 'active'::public.membership_status then
    raise exception 'Only an Active membership can begin a new Break';
  end if;

  current_month := date_trunc('month', current_date)::date;
  next_month := (current_month + interval '1 month')::date;

  select charge.id, charge.status
  into current_charge_id, current_charge_status
  from public.membership_subscription_charges as charge
  where charge.membership_id = membership.id
    and charge.billing_month = current_month
  limit 1;

  if current_charge_id is not null then
    select exists (
      select 1
      from public.membership_payments as payment
      where payment.charge_id = current_charge_id
        and payment.membership_id = membership.id
    )
    into payment_exists;

    if current_charge_status = 'paid' then
      payment_exists := true;
    end if;
  end if;

  if payment_exists then
    effective_date := next_month;
    activation := 'next_month';

    update public.membership_break_requests
    set
      status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      rejection_reason = null,
      effective_from = effective_date,
      activation_type = activation,
      updated_at = now()
    where id = target_request_id;

    return jsonb_build_object(
      'success', true,
      'decision', 'approved',
      'activation_type', activation,
      'effective_from', effective_date,
      'membership_id', membership.id,
      'current_month_paid', true
    );
  end if;

  if current_charge_id is not null then
    update public.membership_payment_confirmations
    set
      status = 'rejected',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      rejection_reason = 'Membership Break approved before payment',
      updated_at = now()
    where charge_id = current_charge_id
      and status = 'pending';

    update public.membership_subscription_charges
    set status = 'waived'
    where id = current_charge_id
      and status in ('unpaid', 'cancelled');
  end if;

  update public.class_memberships
  set
    status = 'break_1'::public.membership_status,
    break_count = 1,
    break_last_processed_month = current_month,
    updated_at = now()
  where id = membership.id;

  -- membership_status_change is the sole history writer for this transition.

  effective_date := current_date;
  activation := 'immediate';

  update public.membership_break_requests
  set
    status = 'approved',
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    rejection_reason = null,
    effective_from = effective_date,
    activation_type = activation,
    updated_at = now()
  where id = target_request_id;

  return jsonb_build_object(
    'success', true,
    'decision', 'approved',
    'activation_type', activation,
    'effective_from', effective_date,
    'membership_id', membership.id,
    'current_month_paid', false
  );
end;
$function$;


create or replace function public.return_membership_active(membership_id uuid)
returns void
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  membership public.class_memberships%rowtype;
  cancelled_request_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select class_membership.*
  into membership
  from public.class_memberships as class_membership
  where class_membership.id = $1
  for update;

  if not found then
    raise exception 'Membership not found';
  end if;

  if not (
    public.is_super_admin()
    or public.is_class_admin(membership.class_id, membership.dojo_id)
  ) then
    raise exception 'Not authorised';
  end if;

  update public.membership_break_requests as break_request
  set
    status = 'cancelled',
    reviewed_by = coalesce(break_request.reviewed_by, auth.uid()),
    reviewed_at = coalesce(break_request.reviewed_at, now()),
    applied_at = coalesce(
      break_request.applied_at,
      case when break_request.status = 'approved' then now() else null end
    ),
    updated_at = now()
  where break_request.membership_id = $1
    and break_request.applied_at is null
    and break_request.status in ('pending', 'approved');

  get diagnostics cancelled_request_count = row_count;

  if membership.status = 'active'::public.membership_status then
    if cancelled_request_count = 0 then
      raise exception 'Membership is already Active and has no scheduled Break';
    end if;

    update public.class_memberships as class_membership
    set
      break_count = 0,
      break_last_processed_month = null,
      updated_at = now()
    where class_membership.id = $1;

    return;
  end if;

  update public.class_memberships as class_membership
  set
    status = 'active'::public.membership_status,
    break_count = 0,
    break_last_processed_month = null,
    updated_at = now()
  where class_membership.id = $1;

  -- membership_status_change is the sole history writer for this transition.
end;
$function$;


-- CREATE OR REPLACE retains existing owner and ACLs. Assert the browser contract
-- explicitly so drift cannot turn this repair into a new exposure.
revoke execute on function public.review_membership_break_request(uuid, text, text)
  from public, anon;
revoke execute on function public.return_membership_active(uuid)
  from public, anon;

grant execute on function public.review_membership_break_request(uuid, text, text)
  to authenticated, service_role;
grant execute on function public.return_membership_active(uuid)
  to authenticated, service_role;

commit;
