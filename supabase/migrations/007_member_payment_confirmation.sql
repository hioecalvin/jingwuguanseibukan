-- ============================================================
-- 007 MEMBER PAYMENT CONFIRMATION
-- ============================================================
--
-- Adds:
-- - dojo receiving account
-- - member "I Have Paid" submissions
-- - admin approve / decline
-- - member can resend after rejection
-- - admin notifications
-- - member notifications
--
-- Important:
-- - pending/rejected claims DO NOT count as paid
-- - approved claims create the actual payment
-- ============================================================


-- ============================================================
-- 1. DOJO RECEIVING ACCOUNT
-- ============================================================

create table if not exists public.dojo_receiving_accounts (
  id uuid primary key default gen_random_uuid(),

  dojo_id uuid not null
    references public.dojos(id)
    on delete cascade,

  bank_name text not null,

  account_holder_name text not null,

  account_number text not null,

  instructions text,

  active boolean not null default true,

  created_by uuid
    references public.profiles(id),

  created_at timestamptz not null default now(),

  updated_by uuid
    references public.profiles(id),

  updated_at timestamptz not null default now()
);


create unique index if not exists
dojo_receiving_accounts_one_active_idx
on public.dojo_receiving_accounts (
  dojo_id
)
where active = true;



-- ============================================================
-- 2. PAYMENT CONFIRMATION REQUESTS
-- ============================================================

create table if not exists public.membership_payment_confirmations (
  id uuid primary key default gen_random_uuid(),

  charge_id uuid not null
    references public.membership_subscription_charges(id)
    on delete cascade,

  membership_id uuid not null
    references public.class_memberships(id)
    on delete cascade,

  dojo_id uuid not null
    references public.dojos(id)
    on delete cascade,

  submitted_by uuid not null
    references public.profiles(id)
    on delete cascade,

  amount numeric not null
    check (amount > 0),

  payment_method text not null,

  transfer_date date not null,

  member_note text,

  status text not null default 'pending'
    check (
      status in (
        'pending',
        'approved',
        'rejected'
      )
    ),

  reviewed_by uuid
    references public.profiles(id),

  reviewed_at timestamptz,

  rejection_reason text,

  created_at timestamptz not null default now()
);


create index if not exists
membership_payment_confirmations_charge_idx
on public.membership_payment_confirmations (
  charge_id,
  status
);


create index if not exists
membership_payment_confirmations_dojo_idx
on public.membership_payment_confirmations (
  dojo_id,
  status,
  created_at desc
);



-- ============================================================
-- 3. PREVENT MULTIPLE PENDING REQUESTS
-- ============================================================

create unique index if not exists
membership_payment_confirmations_one_pending_per_charge_idx
on public.membership_payment_confirmations (
  charge_id
)
where status = 'pending';



-- ============================================================
-- 4. SET DOJO RECEIVING ACCOUNT
-- ============================================================

create or replace function public.set_dojo_receiving_account(
  target_dojo_id uuid,
  new_bank_name text,
  new_account_holder_name text,
  new_account_number text,
  new_instructions text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  account_id uuid;
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


  if nullif(trim(new_bank_name), '') is null then
    raise exception
      'Bank name is required';
  end if;


  if nullif(trim(new_account_holder_name), '') is null then
    raise exception
      'Account holder name is required';
  end if;


  if nullif(trim(new_account_number), '') is null then
    raise exception
      'Account number is required';
  end if;


  update public.dojo_receiving_accounts
  set
    active = false,
    updated_by = auth.uid(),
    updated_at = now()
  where dojo_id = target_dojo_id
    and active = true;


  insert into public.dojo_receiving_accounts (
    dojo_id,
    bank_name,
    account_holder_name,
    account_number,
    instructions,
    active,
    created_by,
    updated_by
  )
  values (
    target_dojo_id,
    trim(new_bank_name),
    trim(new_account_holder_name),
    trim(new_account_number),
    nullif(trim(new_instructions), ''),
    true,
    auth.uid(),
    auth.uid()
  )
  returning id
  into account_id;


  return account_id;

end;
$$;



-- ============================================================
-- 5. GET MY ACTIVE RECEIVING ACCOUNT
-- MEMBER SAFE
-- ============================================================

create or replace function public.get_my_charge_receiving_account(
  target_charge_id uuid
)
returns table (
  bank_name text,
  account_holder_name text,
  account_number text,
  instructions text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  target_membership_id uuid;
  target_user_id uuid;
  target_dojo_id uuid;
begin

  if auth.uid() is null then
    raise exception
      'Not authenticated';
  end if;


  select
    c.membership_id,
    cm.user_id,
    c.dojo_id
  into
    target_membership_id,
    target_user_id,
    target_dojo_id
  from public.membership_subscription_charges c
  join public.class_memberships cm
    on cm.id = c.membership_id
  where c.id = target_charge_id;


  if not found then
    raise exception
      'Subscription charge not found';
  end if;


  if target_user_id <> auth.uid() then
    raise exception
      'You cannot access this payment instruction';
  end if;


  return query

  select
    a.bank_name,
    a.account_holder_name,
    a.account_number,
    a.instructions

  from public.dojo_receiving_accounts a

  where a.dojo_id = target_dojo_id
    and a.active = true

  limit 1;

end;
$$;



-- ============================================================
-- 6. MEMBER SUBMITS "I HAVE PAID"
-- ============================================================

create or replace function public.submit_membership_payment_confirmation(
  target_charge_id uuid,
  transferred_amount numeric,
  payment_method_value text,
  transfer_date_value date,
  member_note_value text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  charge_record record;

  confirmation_id uuid;

  admin_record record;
begin

  if auth.uid() is null then
    raise exception
      'Not authenticated';
  end if;


  select
    c.id,
    c.membership_id,
    c.dojo_id,
    c.amount,
    c.currency,
    c.billing_month,
    cm.user_id,
    p.full_name as member_name,
    d.name as dojo_name

  into charge_record

  from public.membership_subscription_charges c

  join public.class_memberships cm
    on cm.id = c.membership_id

  join public.profiles p
    on p.id = cm.user_id

  join public.dojos d
    on d.id = c.dojo_id

  where c.id = target_charge_id;


  if not found then
    raise exception
      'Subscription charge not found';
  end if;


  if charge_record.user_id <> auth.uid() then
    raise exception
      'You cannot submit payment for this charge';
  end if;


  if transferred_amount is null
     or transferred_amount <= 0
  then
    raise exception
      'Transfer amount must be greater than zero';
  end if;


  if nullif(
    trim(
      payment_method_value
    ),
    ''
  ) is null
  then
    raise exception
      'Payment method is required';
  end if;


  if transfer_date_value is null then
    raise exception
      'Transfer date is required';
  end if;


  if exists (
    select 1

    from public.membership_payment_confirmations pc

    where pc.charge_id =
      target_charge_id

      and pc.status =
        'pending'
  ) then
    raise exception
      'A payment confirmation is already awaiting review';
  end if;


  insert into public.membership_payment_confirmations (
    charge_id,
    membership_id,
    dojo_id,
    submitted_by,
    amount,
    payment_method,
    transfer_date,
    member_note,
    status
  )
  values (
    target_charge_id,
    charge_record.membership_id,
    charge_record.dojo_id,
    auth.uid(),
    transferred_amount,
    trim(payment_method_value),
    transfer_date_value,
    nullif(
      trim(
        member_note_value
      ),
      ''
    ),
    'pending'
  )
  returning id
  into confirmation_id;


  /*
   * Notify every Admin assigned
   * to this dojo.
   */

  for admin_record in

    select distinct
      daa.user_id

    from public.dojo_admin_assignments daa

    where daa.dojo_id =
      charge_record.dojo_id

      and daa.active =
        true

  loop

    perform public.create_notification(
      admin_record.user_id,

      'membership_payment_confirmation_pending',

      'Payment confirmation awaiting review',

      charge_record.member_name
      ||
      ' marked their '
      ||
      to_char(
        charge_record.billing_month,
        'FMMonth YYYY'
      )
      ||
      ' subscription as paid.',

      'membership_payment_confirmation',

      confirmation_id,

      jsonb_build_object(
        'confirmation_id',
          confirmation_id,

        'charge_id',
          target_charge_id,

        'membership_id',
          charge_record.membership_id,

        'dojo_id',
          charge_record.dojo_id,

        'dojo_name',
          charge_record.dojo_name,

        'member_name',
          charge_record.member_name,

        'amount',
          transferred_amount,

        'currency',
          charge_record.currency,

        'billing_month',
          charge_record.billing_month,

        'transfer_date',
          transfer_date_value,

        'payment_method',
          trim(
            payment_method_value
          )
      )
    );

  end loop;


  return confirmation_id;

end;
$$;



-- ============================================================
-- 7. ADMIN GET PENDING CONFIRMATIONS
-- ============================================================

create or replace function public.get_dojo_payment_confirmations(
  target_dojo_id uuid,
  requested_status text default 'pending'
)
returns table (
  confirmation_id uuid,

  charge_id uuid,

  membership_id uuid,

  member_id text,

  member_name text,

  billing_month date,

  charge_amount numeric,

  transferred_amount numeric,

  currency text,

  payment_method text,

  transfer_date date,

  member_note text,

  status text,

  created_at timestamptz,

  reviewed_at timestamptz,

  reviewed_by_name text,

  rejection_reason text
)
language plpgsql
stable
security definer
set search_path = public
as $$
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


  return query

  select
    pc.id,

    pc.charge_id,

    pc.membership_id,

    p.registration_number,

    p.full_name,

    c.billing_month,

    c.amount,

    pc.amount,

    c.currency,

    pc.payment_method,

    pc.transfer_date,

    pc.member_note,

    pc.status,

    pc.created_at,

    pc.reviewed_at,

    reviewer.full_name,

    pc.rejection_reason

  from public.membership_payment_confirmations pc

  join public.membership_subscription_charges c
    on c.id =
      pc.charge_id

  join public.class_memberships cm
    on cm.id =
      pc.membership_id

  join public.profiles p
    on p.id =
      cm.user_id

  left join public.profiles reviewer
    on reviewer.id =
      pc.reviewed_by

  where pc.dojo_id =
    target_dojo_id

    and (
      requested_status is null

      or pc.status =
        requested_status
    )

  order by
    pc.created_at desc;

end;
$$;



-- ============================================================
-- 8. ADMIN APPROVE / DECLINE
-- ============================================================

create or replace function public.review_membership_payment_confirmation(
  target_confirmation_id uuid,
  decision text,
  rejection_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  confirmation_record record;

  payment_id uuid;
begin

  if auth.uid() is null then
    raise exception
      'Not authenticated';
  end if;


  if decision not in (
    'approved',
    'rejected'
  ) then
    raise exception
      'Decision must be approved or rejected';
  end if;


  select
    pc.*,

    c.currency,

    c.billing_month,

    cm.user_id,

    p.full_name as member_name,

    d.name as dojo_name

  into confirmation_record

  from public.membership_payment_confirmations pc

  join public.membership_subscription_charges c
    on c.id =
      pc.charge_id

  join public.class_memberships cm
    on cm.id =
      pc.membership_id

  join public.profiles p
    on p.id =
      cm.user_id

  join public.dojos d
    on d.id =
      pc.dojo_id

  where pc.id =
    target_confirmation_id

  for update;


  if not found then
    raise exception
      'Payment confirmation not found';
  end if;


  if confirmation_record.status <>
    'pending'
  then
    raise exception
      'This payment confirmation has already been reviewed';
  end if;


  if not public.can_access_dojo_finance(
    confirmation_record.dojo_id,
    auth.uid()
  ) then
    raise exception
      'You do not have financial access to this dojo';
  end if;


  if decision =
    'rejected'
  then

    if nullif(
      trim(
        rejection_note
      ),
      ''
    ) is null
    then
      raise exception
        'Rejection reason is required';
    end if;


    update public.membership_payment_confirmations
    set
      status =
        'rejected',

      reviewed_by =
        auth.uid(),

      reviewed_at =
        now(),

      rejection_reason =
        trim(
          rejection_note
        )

    where id =
      target_confirmation_id;


    perform public.create_notification(
      confirmation_record.user_id,

      'membership_payment_confirmation_rejected',

      'Payment confirmation declined',

      'Your payment confirmation for '
      ||
      to_char(
        confirmation_record.billing_month,
        'FMMonth YYYY'
      )
      ||
      ' was declined. You can submit it again.',

      'membership_payment_confirmation',

      target_confirmation_id,

      jsonb_build_object(
        'confirmation_id',
          target_confirmation_id,

        'charge_id',
          confirmation_record.charge_id,

        'dojo_id',
          confirmation_record.dojo_id,

        'dojo_name',
          confirmation_record.dojo_name,

        'billing_month',
          confirmation_record.billing_month,

        'rejection_reason',
          trim(
            rejection_note
          )
      )
    );


    return;

  end if;


  /*
   * APPROVED:
   * create the real payment.
   */

  payment_id :=
    public.record_membership_payment(
      confirmation_record.charge_id,
      confirmation_record.amount,
      confirmation_record.payment_method,
      null,
      confirmation_record.transfer_date,
      confirmation_record.member_note
    );


  update public.membership_payment_confirmations
  set
    status =
      'approved',

    reviewed_by =
      auth.uid(),

    reviewed_at =
      now(),

    rejection_reason =
      null

  where id =
    target_confirmation_id;


  perform public.create_notification(
    confirmation_record.user_id,

    'membership_payment_confirmation_approved',

    'Payment confirmed',

    'Your '
    ||
    to_char(
      confirmation_record.billing_month,
      'FMMonth YYYY'
    )
    ||
    ' subscription payment has been confirmed.',

    'membership_subscription_charge',

    confirmation_record.charge_id,

    jsonb_build_object(
      'confirmation_id',
        target_confirmation_id,

      'charge_id',
        confirmation_record.charge_id,

      'payment_id',
        payment_id,

      'dojo_id',
        confirmation_record.dojo_id,

      'dojo_name',
        confirmation_record.dojo_name,

      'billing_month',
        confirmation_record.billing_month,

      'amount',
        confirmation_record.amount,

      'currency',
        confirmation_record.currency
    )
  );

end;
$$;



-- ============================================================
-- 9. MEMBER GET OWN CONFIRMATIONS
-- ============================================================

create or replace function public.get_my_payment_confirmations()
returns table (
  confirmation_id uuid,

  charge_id uuid,

  billing_month date,

  amount numeric,

  currency text,

  payment_method text,

  transfer_date date,

  member_note text,

  status text,

  created_at timestamptz,

  reviewed_at timestamptz,

  rejection_reason text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin

  if auth.uid() is null then
    raise exception
      'Not authenticated';
  end if;


  return query

  select
    pc.id,

    pc.charge_id,

    c.billing_month,

    pc.amount,

    c.currency,

    pc.payment_method,

    pc.transfer_date,

    pc.member_note,

    pc.status,

    pc.created_at,

    pc.reviewed_at,

    pc.rejection_reason

  from public.membership_payment_confirmations pc

  join public.membership_subscription_charges c
    on c.id =
      pc.charge_id

  where pc.submitted_by =
    auth.uid()

  order by
    pc.created_at desc;

end;
$$;



-- ============================================================
-- 10. PERMISSIONS
-- ============================================================

grant execute
on function public.set_dojo_receiving_account(
  uuid,
  text,
  text,
  text,
  text
)
to authenticated;


grant execute
on function public.get_my_charge_receiving_account(
  uuid
)
to authenticated;


grant execute
on function public.submit_membership_payment_confirmation(
  uuid,
  numeric,
  text,
  date,
  text
)
to authenticated;


grant execute
on function public.get_dojo_payment_confirmations(
  uuid,
  text
)
to authenticated;


grant execute
on function public.review_membership_payment_confirmation(
  uuid,
  text,
  text
)
to authenticated;


grant execute
on function public.get_my_payment_confirmations()
to authenticated;



-- ============================================================
-- 11. VERIFY
-- ============================================================

select
  routine_name
from information_schema.routines
where routine_schema =
  'public'
  and routine_name in (
    'set_dojo_receiving_account',
    'get_my_charge_receiving_account',
    'submit_membership_payment_confirmation',
    'get_dojo_payment_confirmations',
    'review_membership_payment_confirmation',
    'get_my_payment_confirmations'
  )
order by
  routine_name;