-- ============================================================
-- 006 MONTHLY SUBSCRIPTION NOTIFICATIONS
-- ============================================================
--
-- Adds:
-- - monthly subscription notification to members
-- - unpaid reminder notification
-- - duplicate protection
--
-- Assumes existing:
-- - notifications
-- - class_memberships
-- - membership_subscription_charges
-- - profiles
-- - dojos
-- - create_notification(...)
-- ============================================================


-- ============================================================
-- 1. MONTHLY CHARGE NOTIFICATION
-- ============================================================

create or replace function public.notify_monthly_subscription_charges(
  target_dojo_id uuid,
  target_month date
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;

  charge_record record;

  notification_count integer := 0;

  notification_key text;
begin

  caller_id :=
    auth.uid();


  if caller_id is null then
    raise exception
      'Not authenticated';
  end if;


  if not public.can_access_dojo_finance(
    target_dojo_id,
    caller_id
  ) then
    raise exception
      'You do not have financial access to this dojo';
  end if;


  for charge_record in

    select
      c.id as charge_id,

      c.membership_id,

      c.dojo_id,

      c.billing_month,

      c.amount,

      c.currency,

      c.status,

      cm.user_id,

      p.full_name,

      d.name as dojo_name

    from public.membership_subscription_charges c

    join public.class_memberships cm
      on cm.id =
        c.membership_id

    join public.profiles p
      on p.id =
        cm.user_id

    join public.dojos d
      on d.id =
        c.dojo_id

    where c.dojo_id =
      target_dojo_id

      and c.billing_month =
        date_trunc(
          'month',
          target_month
        )::date

      and c.status not in (
        'cancelled',
        'waived'
      )

  loop

    notification_key :=
      charge_record.charge_id::text
      ||
      ':monthly_charge';


    if not exists (
      select 1

      from public.notifications n

      where n.user_id =
        charge_record.user_id

        and n.notification_type =
          'monthly_subscription_charge'

        and n.metadata->>'dedupe_key' =
          notification_key
    ) then

      perform public.create_notification(
        charge_record.user_id,

        'monthly_subscription_charge',

        'Monthly subscription due',

        charge_record.dojo_name
        ||
        ' subscription for '
        ||
        to_char(
          charge_record.billing_month,
          'FMMonth YYYY'
        )
        ||
        ' is '
        ||
        charge_record.currency
        ||
        ' '
        ||
        charge_record.amount::text
        ||
        '.',

        'membership_subscription_charge',

        charge_record.charge_id,

        jsonb_build_object(
          'dedupe_key',
            notification_key,

          'charge_id',
            charge_record.charge_id,

          'membership_id',
            charge_record.membership_id,

          'dojo_id',
            charge_record.dojo_id,

          'dojo_name',
            charge_record.dojo_name,

          'billing_month',
            charge_record.billing_month,

          'amount',
            charge_record.amount,

          'currency',
            charge_record.currency,

          'status',
            charge_record.status
        )
      );


      notification_count :=
        notification_count + 1;

    end if;

  end loop;


  return notification_count;

end;
$$;



-- ============================================================
-- 2. UNPAID REMINDER
-- ============================================================

create or replace function public.notify_unpaid_subscription_reminders(
  target_dojo_id uuid,
  target_month date
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;

  charge_record record;

  reminder_count integer := 0;

  notification_key text;

  paid_amount numeric;

  outstanding_amount numeric;
begin

  caller_id :=
    auth.uid();


  if caller_id is null then
    raise exception
      'Not authenticated';
  end if;


  if not public.can_access_dojo_finance(
    target_dojo_id,
    caller_id
  ) then
    raise exception
      'You do not have financial access to this dojo';
  end if;


  for charge_record in

    select
      c.id as charge_id,

      c.membership_id,

      c.dojo_id,

      c.billing_month,

      c.amount,

      c.currency,

      c.status,

      cm.user_id,

      p.full_name,

      d.name as dojo_name

    from public.membership_subscription_charges c

    join public.class_memberships cm
      on cm.id =
        c.membership_id

    join public.profiles p
      on p.id =
        cm.user_id

    join public.dojos d
      on d.id =
        c.dojo_id

    where c.dojo_id =
      target_dojo_id

      and c.billing_month =
        date_trunc(
          'month',
          target_month
        )::date

      and c.status not in (
        'cancelled',
        'waived'
      )

  loop

    select
      coalesce(
        sum(mp.amount),
        0
      )

    into
      paid_amount

    from public.membership_payments mp

    where mp.charge_id =
      charge_record.charge_id;


    outstanding_amount :=
      greatest(
        charge_record.amount -
        paid_amount,
        0
      );


    if outstanding_amount <=
      0
    then
      continue;
    end if;


    notification_key :=
      charge_record.charge_id::text
      ||
      ':unpaid_reminder:'
      ||
      current_date::text;


    /*
     * One reminder per charge per day.
     */

    if not exists (
      select 1

      from public.notifications n

      where n.user_id =
        charge_record.user_id

        and n.notification_type =
          'subscription_unpaid_reminder'

        and n.metadata->>'dedupe_key' =
          notification_key
    ) then

      perform public.create_notification(
        charge_record.user_id,

        'subscription_unpaid_reminder',

        'Subscription payment reminder',

        'You still have '
        ||
        charge_record.currency
        ||
        ' '
        ||
        outstanding_amount::text
        ||
        ' outstanding for '
        ||
        charge_record.dojo_name
        ||
        ' for '
        ||
        to_char(
          charge_record.billing_month,
          'FMMonth YYYY'
        )
        ||
        '.',

        'membership_subscription_charge',

        charge_record.charge_id,

        jsonb_build_object(
          'dedupe_key',
            notification_key,

          'charge_id',
            charge_record.charge_id,

          'membership_id',
            charge_record.membership_id,

          'dojo_id',
            charge_record.dojo_id,

          'dojo_name',
            charge_record.dojo_name,

          'billing_month',
            charge_record.billing_month,

          'charge_amount',
            charge_record.amount,

          'paid_amount',
            paid_amount,

          'outstanding_amount',
            outstanding_amount,

          'currency',
            charge_record.currency
        )
      );


      reminder_count :=
        reminder_count + 1;

    end if;

  end loop;


  return reminder_count;

end;
$$;



-- ============================================================
-- 3. GENERATE + NOTIFY
-- ============================================================

create or replace function public.generate_and_notify_monthly_subscriptions(
  target_dojo_id uuid,
  target_month date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  generated_count integer;

  notified_count integer;
begin

  if auth.uid() is null then
    raise exception
      'Not authenticated';
  end if;


  if not public.can_access_dojo_finance(
    target_dojo_id,
    auth.uid()
  ) then
    raise exception
      'You do not have financial access to this dojo';
  end if;


  /*
   * Generate charges first.
   */

  generated_count :=
    public.generate_dojo_monthly_subscription_charges(
      target_dojo_id,
      date_trunc(
        'month',
        target_month
      )::date
    );


  /*
   * Notify members.
   */

  notified_count :=
    public.notify_monthly_subscription_charges(
      target_dojo_id,
      date_trunc(
        'month',
        target_month
      )::date
    );


  return jsonb_build_object(
    'generated',
      generated_count,

    'notified',
      notified_count
  );

end;
$$;



-- ============================================================
-- 4. PERMISSIONS
-- ============================================================

grant execute
on function public.notify_monthly_subscription_charges(
  uuid,
  date
)
to authenticated;


grant execute
on function public.notify_unpaid_subscription_reminders(
  uuid,
  date
)
to authenticated;


grant execute
on function public.generate_and_notify_monthly_subscriptions(
  uuid,
  date
)
to authenticated;



-- ============================================================
-- 5. VERIFY
-- ============================================================

select
  routine_name

from information_schema.routines

where routine_schema =
  'public'

  and routine_name in (
    'notify_monthly_subscription_charges',
    'notify_unpaid_subscription_reminders',
    'generate_and_notify_monthly_subscriptions'
  )

order by
  routine_name;