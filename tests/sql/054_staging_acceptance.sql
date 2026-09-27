-- Guarded staging-only semantic acceptance for migration 054.
--
-- The exact final exception is the success signal. PostgreSQL rolls back every
-- temporary charge, payment and confirmation created by this block.
do $acceptance$
declare
  super_id uuid;
  member_user_id uuid;
  target_membership_id uuid;
  target_dojo_id uuid;
  target_class_id uuid;
  direct_charge_id uuid := gen_random_uuid();
  confirmation_charge_id uuid := gen_random_uuid();
  direct_billing_month date;
  confirmation_billing_month date;
begin
  select id into super_id
  from public.profiles
  where registration_number = '0001';

  select cm.id, cm.user_id, cm.dojo_id, cm.class_id
  into target_membership_id, member_user_id, target_dojo_id, target_class_id
  from public.class_memberships as cm
  join public.profiles as profile on profile.id = cm.user_id
  where profile.registration_number = '0101'
    and profile.account_status::text = 'active'
    and profile.date_of_passing is null
    and cm.status::text = 'active'
  order by cm.created_at, cm.id
  limit 1;

  if super_id is null or member_user_id is null
     or target_membership_id is null or target_dojo_id is null
     or target_class_id is null then
    raise exception 'Required staging identities or active membership are missing';
  end if;

  if exists (
    select 1
    from public.membership_subscription_charges
    where generated_at = timestamptz '1900-01-04 05:06:07+00'
  ) then
    raise exception 'Migration 054 acceptance marker already exists';
  end if;

  select candidate::date
  into direct_billing_month
  from generate_series(
    date '2090-01-01', date '2199-12-01', interval '1 month'
  ) as candidate
  where not exists (
    select 1 from public.membership_subscription_charges as charge
    where charge.membership_id = target_membership_id
      and charge.billing_month = candidate::date
  )
  order by candidate
  limit 1;

  select candidate::date
  into confirmation_billing_month
  from generate_series(
    date '2090-01-01', date '2199-12-01', interval '1 month'
  ) as candidate
  where candidate::date <> direct_billing_month
    and not exists (
      select 1 from public.membership_subscription_charges as charge
      where charge.membership_id = target_membership_id
        and charge.billing_month = candidate::date
    )
  order by candidate
  limit 1;

  if direct_billing_month is null or confirmation_billing_month is null then
    raise exception 'No isolated future billing months are available';
  end if;

  insert into public.membership_subscription_charges (
    id, membership_id, dojo_id, class_id, billing_month, amount, currency,
    rate_source, status, generated_at, generated_by
  ) values
    (
      direct_charge_id, target_membership_id, target_dojo_id, target_class_id,
      direct_billing_month, 100000, 'IDR', 'dojo_default', 'unpaid',
      timestamptz '1900-01-04 05:06:07+00', super_id
    ),
    (
      confirmation_charge_id, target_membership_id, target_dojo_id,
      target_class_id, confirmation_billing_month, 120000, 'IDR', 'dojo_default',
      'unpaid', timestamptz '1900-01-04 05:06:07+00', super_id
    );

  begin
    insert into public.membership_payments (
      charge_id, membership_id, dojo_id, amount, currency, payment_method,
      payment_date, recorded_by, notes
    ) values (
      direct_charge_id, target_membership_id, target_dojo_id, 50000, 'IDR',
      'Cash', direct_billing_month + 1, super_id, '__JWG_054_PARTIAL_PAYMENT__'
    );
    raise exception 'Partial direct payment unexpectedly succeeded';
  exception when others then
    if sqlerrm <> 'Payment must equal the full outstanding subscription balance' then
      raise;
    end if;
  end;

  if exists (
    select 1 from public.membership_payments
    where charge_id = direct_charge_id
  ) then
    raise exception 'Rejected partial direct payment left residue';
  end if;

  insert into public.membership_payments (
    charge_id, membership_id, dojo_id, amount, currency, payment_method,
    payment_date, recorded_by, notes
  ) values (
    direct_charge_id, target_membership_id, target_dojo_id, 100000, 'IDR',
    'Cash', direct_billing_month + 1, super_id, '__JWG_054_FULL_PAYMENT__'
  );

  begin
    insert into public.membership_payments (
      charge_id, membership_id, dojo_id, amount, currency, payment_method,
      payment_date, recorded_by, notes
    ) values (
      direct_charge_id, target_membership_id, target_dojo_id, 100000, 'IDR',
      'Cash', direct_billing_month + 2, super_id, '__JWG_054_DUPLICATE_PAYMENT__'
    );
    raise exception 'Second direct payment unexpectedly succeeded';
  exception when others then
    if sqlerrm <> 'This subscription charge is already fully paid' then
      raise;
    end if;
  end;

  begin
    insert into public.membership_payment_confirmations (
      charge_id, membership_id, dojo_id, submitted_by, amount,
      payment_method, transfer_date, member_note, status
    ) values (
      confirmation_charge_id, target_membership_id, target_dojo_id,
      member_user_id, 60000, 'Bank Transfer', confirmation_billing_month + 1,
      '__JWG_054_PARTIAL_CONFIRMATION__', 'pending'
    );
    raise exception 'Partial Member confirmation unexpectedly succeeded';
  exception when others then
    if sqlerrm <> 'Payment confirmation must equal the full outstanding subscription balance' then
      raise;
    end if;
  end;

  if exists (
    select 1 from public.membership_payment_confirmations
    where charge_id = confirmation_charge_id
  ) then
    raise exception 'Rejected partial Member confirmation left residue';
  end if;

  insert into public.membership_payment_confirmations (
    charge_id, membership_id, dojo_id, submitted_by, amount,
    payment_method, transfer_date, member_note, status
  ) values (
    confirmation_charge_id, target_membership_id, target_dojo_id,
    member_user_id, 120000, 'Bank Transfer', confirmation_billing_month + 1,
    '__JWG_054_FULL_CONFIRMATION__', 'pending'
  );

  if (select count(*) from public.membership_payments
      where charge_id = direct_charge_id and amount = 100000) <> 1
     or (select count(*) from public.membership_payment_confirmations
         where charge_id = confirmation_charge_id and amount = 120000
           and status = 'pending') <> 1 then
    raise exception 'Full-payment rows were not accepted exactly once';
  end if;

  raise exception 'ROLLBACK-CONTAINED PASS: migration 054 full-payment acceptance';
end
$acceptance$;
