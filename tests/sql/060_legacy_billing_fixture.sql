-- Historical schema-only definitions reviewed from the 29 September catalog.
-- Synthetic test fixture ONLY; never execute against a live project.
-- Source routines.json SHA256: aa1a051d9211a006959d5d69708a404e0ac2e83a2a56c7d56d018ee415355bd7
create type public.membership_status as enum ('active','break','break_1','break_2','inactive');
alter table public.class_memberships alter column status type public.membership_status using status::public.membership_status;
alter table public.membership_subscription_charges add column generated_at timestamptz default now();
drop function public.generate_dojo_monthly_subscription_charges(uuid,date);
CREATE OR REPLACE FUNCTION public.adjust_current_membership_fee(target_membership_id uuid, new_amount numeric, adjustment_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  membership_record public.class_memberships%rowtype;
  charge_record public.membership_subscription_charges%rowtype;

  billing_month_value date;
  payment_count integer := 0;
  pending_confirmation_count integer := 0;

  old_amount numeric;
begin

  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;


  /*
   * VALIDATE AMOUNT
   */
  if new_amount is null or new_amount < 0 then
    raise exception
      'Fee must be zero or greater';
  end if;


  /*
   * LOAD MEMBERSHIP
   */
  select *
  into membership_record
  from public.class_memberships
  where id = target_membership_id;

  if not found then
    raise exception 'Membership not found';
  end if;


  if membership_record.dojo_id is null then
    raise exception 'Membership has no dojo';
  end if;


  /*
   * ADMIN / SUPER ADMIN FINANCE ACCESS
   */
  if not public.can_access_dojo_finance(
    membership_record.dojo_id,
    auth.uid()
  ) then
    raise exception
      'You do not have financial access to this dojo';
  end if;


  billing_month_value :=
    date_trunc('month', current_date)::date;


  /*
   * LOCK CURRENT MONTH CHARGE
   */
  select *
  into charge_record
  from public.membership_subscription_charges
  where membership_id = target_membership_id
    and billing_month = billing_month_value
  for update;


  if not found then
    raise exception
      'No subscription charge exists for this membership for the current month';
  end if;


  old_amount := charge_record.amount;


  /*
   * NEVER MODIFY WAIVED/CANCELLED CHARGES
   */
  if charge_record.status in ('waived', 'cancelled') then
    raise exception
      'A waived or cancelled charge cannot be adjusted';
  end if;


  /*
   * OFFICIAL PAYMENT = MONTH LOCKED
   */
  select count(*)
  into payment_count
  from public.membership_payments
  where charge_id = charge_record.id;


  if payment_count > 0 then
    raise exception
      'This month cannot be adjusted because a payment has already been recorded';
  end if;


  /*
   * ALSO PROTECT PENDING PAYMENT CONFIRMATIONS.
   *
   * We don't want:
   *
   * Member submits Rp300k
   * Admin changes bill to Rp200k
   * Old Rp300k confirmation remains pending.
   */
  select count(*)
  into pending_confirmation_count
  from public.membership_payment_confirmations
  where charge_id = charge_record.id
    and status = 'pending';


  if pending_confirmation_count > 0 then
    raise exception
      'Resolve the pending payment confirmation before adjusting this fee';
  end if;


  /*
   * UPDATE CURRENT MONTH
   */
  update public.membership_subscription_charges
  set
    amount = new_amount,

    status =
      case
        when new_amount = 0
          then 'paid'
        else 'unpaid'
      end

  where id = charge_record.id;


  return jsonb_build_object(
    'success', true,

    'membership_id',
      target_membership_id,

    'charge_id',
      charge_record.id,

    'billing_month',
      billing_month_value,

    'old_amount',
      old_amount,

    'new_amount',
      new_amount,

    'reason',
      nullif(trim(adjustment_reason), '')
  );

end;
$function$
;
CREATE OR REPLACE FUNCTION public.generate_dojo_monthly_subscription_charges(target_dojo_id uuid, target_month date DEFAULT CURRENT_DATE)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  membership_record public.class_memberships;
  rate_record record;

  billing_month_value date;

  generated_count integer := 0;
begin

  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;


  if not public.can_access_dojo_finance(
    target_dojo_id,
    auth.uid()
  ) then
    raise exception
      'You do not have financial access to this dojo';
  end if;


  billing_month_value :=
    date_trunc(
      'month',
      coalesce(target_month, current_date)
    )::date;


  /*
   * ACTIVE MEMBERS ONLY
   */
  for membership_record in
    select *
    from public.class_memberships cm
    where cm.dojo_id = target_dojo_id
      and cm.status = 'active'::public.membership_status
  loop


    /*
     * EXISTING CHARGE
     */
    if exists (
      select 1
      from public.membership_subscription_charges charge
      where charge.membership_id = membership_record.id
        and charge.billing_month = billing_month_value
    ) then
      continue;
    end if;


    /*
     * RATE
     */
    select *
    into rate_record
    from public.get_membership_subscription_rate(
      membership_record.id,
      billing_month_value
    );


    if not found then
      raise exception
        'No subscription rate found for membership %',
        membership_record.id;
    end if;


    if rate_record.amount is null
       or rate_record.amount < 0
    then
      raise exception
        'Invalid subscription rate for membership %',
        membership_record.id;
    end if;


    /*
     * CREATE CHARGE
     */
    insert into public.membership_subscription_charges (
      membership_id,
      dojo_id,
      class_id,
      billing_month,
      amount,
      currency,
      rate_source,
      status,
      generated_by
    )
    values (
      membership_record.id,
      target_dojo_id,
      membership_record.class_id,
      billing_month_value,
      rate_record.amount,
      rate_record.currency,
      rate_record.rate_source,

      case
        when rate_record.amount = 0
          then 'paid'
        else 'unpaid'
      end,

      auth.uid()
    );


    generated_count :=
      generated_count + 1;

  end loop;


  return generated_count;

end;
$function$
;
CREATE OR REPLACE FUNCTION public.system_generate_monthly_subscriptions(target_month date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  dojo_record record;
  membership_record public.class_memberships;
  rate_record record;

  billing_month_value date;

  generated_count integer := 0;
  notified_count integer := 0;

  charge_id uuid;
begin

  billing_month_value :=
    date_trunc(
      'month',
      coalesce(target_month, current_date)
    )::date;


  /*
   * ACTIVE DOJOS
   */
  for dojo_record in
    select
      d.id,
      d.name
    from public.dojos d
    where d.active = true
  loop


    /*
     * BILLABLE MEMBERS
     *
     * FINAL RULE:
     *
     * Active   = charged
     * Break 1  = not charged
     * Break 2  = not charged
     * Inactive = not charged
     */
    for membership_record in
      select *
      from public.class_memberships cm
      where cm.dojo_id = dojo_record.id
        and cm.status = 'active'::public.membership_status
    loop

      charge_id := null;


      /*
       * RESOLVE RATE
       */
      select *
      into rate_record
      from public.get_membership_subscription_rate(
        membership_record.id,
        billing_month_value
      );


      if not found then
        raise exception
          'No subscription rate found for membership %',
          membership_record.id;
      end if;


      if rate_record.amount is null
         or rate_record.amount < 0
      then
        raise exception
          'Invalid subscription rate for membership %',
          membership_record.id;
      end if;


      /*
       * CREATE MONTHLY CHARGE
       */
      insert into public.membership_subscription_charges (
        membership_id,
        dojo_id,
        class_id,
        billing_month,
        amount,
        currency,
        rate_source,
        status,
        generated_by,
        generated_at
      )
      values (
        membership_record.id,
        dojo_record.id,
        membership_record.class_id,
        billing_month_value,
        rate_record.amount,
        rate_record.currency,
        rate_record.rate_source,

        case
          when rate_record.amount = 0
            then 'paid'
          else 'unpaid'
        end,

        null,
        now()
      )

      on conflict (
        membership_id,
        billing_month
      )
      do nothing

      returning id
      into charge_id;


      if charge_id is null then
        continue;
      end if;


      generated_count :=
        generated_count + 1;


      /*
       * MEMBER NOTIFICATION
       */
      perform public.create_notification(
        membership_record.user_id,

        'monthly_subscription_generated',

        'Monthly subscription',

        case
          when rate_record.amount = 0 then
            'Your subscription for '
            ||
            to_char(
              billing_month_value,
              'FMMonth YYYY'
            )
            ||
            ' has been generated with no payment due.'

          else
            'Your subscription for '
            ||
            to_char(
              billing_month_value,
              'FMMonth YYYY'
            )
            ||
            ' is now available.'
        end,

        'membership_subscription_charge',

        charge_id,

        jsonb_build_object(
          'charge_id',
            charge_id,

          'membership_id',
            membership_record.id,

          'dojo_id',
            dojo_record.id,

          'dojo_name',
            dojo_record.name,

          'billing_month',
            billing_month_value,

          'amount',
            rate_record.amount,

          'currency',
            rate_record.currency,

          'rate_source',
            rate_record.rate_source
        )
      );


      notified_count :=
        notified_count + 1;

    end loop;

  end loop;


  return jsonb_build_object(
    'billing_month',
      billing_month_value,

    'generated',
      generated_count,

    'notified',
      notified_count
  );

end;
$function$
;
