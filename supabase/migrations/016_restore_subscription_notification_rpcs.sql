-- Restore three functions defined in verified migration 006 but absent from the
-- 2026-08-30 live catalog. Do NOT edit or replay migration 006.
-- The historical function bodies are retained except for explicit pg_temp
-- ordering, null-argument checks, and a shared transaction-level advisory lock.
-- Lock/daily-dedupe dates use explicit ISO formatting, independent of DateStyle;
-- this retains existing ISO-format dedupe keys without rewriting notifications.
-- Existing finance authorization and per-charge/day dedupe semantics are kept.
-- Staging must verify concurrent retries, charge totals, and notification counts.

begin;

create or replace function public.notify_monthly_subscription_charges(
  target_dojo_id uuid,
  target_month date
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller_id uuid;

  charge_record record;

  notification_count integer := 0;

  notification_key text;
begin

  if target_dojo_id is null or target_month is null then
    raise exception using errcode = '22004', message = 'Dojo and billing month are required';
  end if;

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


  -- Serialize generation/notification for this dojo/month before the existing
  -- dedupe checks. Concurrent calls through these RPCs must not double-notify.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'subscription-notifications:' || target_dojo_id::text || ':' ||
    to_char(date_trunc('month', target_month)::date, 'YYYY-MM-DD'), 0
  ));

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

create or replace function public.notify_unpaid_subscription_reminders(
  target_dojo_id uuid,
  target_month date
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller_id uuid;

  charge_record record;

  reminder_count integer := 0;

  notification_key text;

  paid_amount numeric;

  outstanding_amount numeric;
begin

  if target_dojo_id is null or target_month is null then
    raise exception using errcode = '22004', message = 'Dojo and billing month are required';
  end if;

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


  -- Serialize generation/notification for this dojo/month before the existing
  -- dedupe checks. Concurrent calls through these RPCs must not double-notify.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'subscription-notifications:' || target_dojo_id::text || ':' ||
    to_char(date_trunc('month', target_month)::date, 'YYYY-MM-DD'), 0
  ));

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
      to_char(current_date, 'YYYY-MM-DD');


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

create or replace function public.generate_and_notify_monthly_subscriptions(
  target_dojo_id uuid,
  target_month date
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  generated_count integer;

  notified_count integer;
begin

  if target_dojo_id is null or target_month is null then
    raise exception using errcode = '22004', message = 'Dojo and billing month are required';
  end if;

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

  -- Serialize generation/notification for this dojo/month before the existing
  -- dedupe checks. Concurrent calls through these RPCs must not double-notify.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'subscription-notifications:' || target_dojo_id::text || ':' ||
    to_char(date_trunc('month', target_month)::date, 'YYYY-MM-DD'), 0
  ));

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

revoke execute on function public.notify_monthly_subscription_charges(uuid, date) from public, anon;
grant execute on function public.notify_monthly_subscription_charges(uuid, date) to authenticated;

revoke execute on function public.notify_unpaid_subscription_reminders(uuid, date) from public, anon;
grant execute on function public.notify_unpaid_subscription_reminders(uuid, date) to authenticated;

revoke execute on function public.generate_and_notify_monthly_subscriptions(uuid, date) from public, anon;
grant execute on function public.generate_and_notify_monthly_subscriptions(uuid, date) to authenticated;

notify pgrst, 'reload schema';
commit;
