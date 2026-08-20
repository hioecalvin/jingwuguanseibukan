-- ============================================================
-- JS APP
-- PRIVATE DOJO FINANCE MODULE
-- ============================================================
--
-- ACCESS MODEL
--
-- Member:
--   - sees own subscription/payment records only
--
-- Dojo Admin:
--   - manages rates for assigned dojo
--   - records payments
--   - sees dojo financial report
--   - exports dojo financial report
--
-- Super Admin:
--   - NO automatic dojo-finance access
--
-- Super Admin + Dojo Admin:
--   - has finance access because they are assigned
--     as Dojo Admin, not because they are Super Admin
--
-- ============================================================


-- ============================================================
-- 1. FINANCE ACCESS HELPER
-- ============================================================

create or replace function public.can_access_dojo_finance(
  target_dojo_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    target_user_id is not null
    and exists (
      select 1
      from public.dojo_admin_assignments daa
      where daa.user_id = target_user_id
        and daa.dojo_id = target_dojo_id
        and daa.active = true
    );
$$;


grant execute
on function public.can_access_dojo_finance(
  uuid,
  uuid
)
to authenticated;



-- ============================================================
-- 2. DOJO SUBSCRIPTION SETTINGS
-- ============================================================

create table if not exists public.dojo_subscription_settings (
  id uuid primary key default gen_random_uuid(),

  dojo_id uuid not null unique
    references public.dojos(id)
    on delete cascade,

  class_id uuid not null
    references public.classes(id)
    on delete cascade,

  default_fee numeric(14,2) not null,

  currency text not null default 'IDR',

  effective_from date not null default current_date,

  active boolean not null default true,

  created_by uuid
    references public.profiles(id)
    on delete set null,

  created_at timestamptz not null default now(),

  updated_by uuid
    references public.profiles(id)
    on delete set null,

  updated_at timestamptz not null default now(),

  check (
    default_fee >= 0
  )
);



-- ============================================================
-- 3. MEMBER SPECIAL RATE
-- ============================================================

create table if not exists public.membership_subscription_overrides (
  id uuid primary key default gen_random_uuid(),

  membership_id uuid not null unique
    references public.class_memberships(id)
    on delete cascade,

  special_fee numeric(14,2) not null,

  currency text not null default 'IDR',

  effective_from date not null default current_date,

  effective_until date,

  reason text,

  active boolean not null default true,

  created_by uuid
    references public.profiles(id)
    on delete set null,

  created_at timestamptz not null default now(),

  updated_by uuid
    references public.profiles(id)
    on delete set null,

  updated_at timestamptz not null default now(),

  check (
    special_fee >= 0
  ),

  check (
    effective_until is null
    or effective_until >= effective_from
  )
);



-- ============================================================
-- 4. MONTHLY SUBSCRIPTION CHARGES
-- ============================================================

create table if not exists public.membership_subscription_charges (
  id uuid primary key default gen_random_uuid(),

  membership_id uuid not null
    references public.class_memberships(id)
    on delete cascade,

  dojo_id uuid not null
    references public.dojos(id),

  class_id uuid not null
    references public.classes(id),

  billing_month date not null,

  amount numeric(14,2) not null,

  currency text not null default 'IDR',

  rate_source text not null
    check (
      rate_source in (
        'dojo_default',
        'member_special'
      )
    ),

  status text not null default 'unpaid'
    check (
      status in (
        'unpaid',
        'paid',
        'waived',
        'cancelled'
      )
    ),

  generated_at timestamptz not null default now(),

  generated_by uuid
    references public.profiles(id)
    on delete set null,

  unique (
    membership_id,
    billing_month
  ),

  check (
    amount >= 0
  )
);



-- ============================================================
-- 5. PAYMENT RECORDS
-- ============================================================

create table if not exists public.membership_payments (
  id uuid primary key default gen_random_uuid(),

  charge_id uuid not null
    references public.membership_subscription_charges(id)
    on delete cascade,

  membership_id uuid not null
    references public.class_memberships(id)
    on delete cascade,

  dojo_id uuid not null
    references public.dojos(id),

  amount numeric(14,2) not null,

  currency text not null default 'IDR',

  payment_method text,

  payment_reference text,

  payment_date date not null default current_date,

  recorded_by uuid
    references public.profiles(id)
    on delete set null,

  recorded_at timestamptz not null default now(),

  notes text,

  check (
    amount > 0
  )
);



-- ============================================================
-- 6. INDEXES
-- ============================================================

create index if not exists
dojo_subscription_settings_dojo_idx
on public.dojo_subscription_settings (
  dojo_id
);


create index if not exists
membership_subscription_overrides_membership_idx
on public.membership_subscription_overrides (
  membership_id,
  active
);


create index if not exists
membership_subscription_charges_dojo_month_idx
on public.membership_subscription_charges (
  dojo_id,
  billing_month,
  status
);


create index if not exists
membership_payments_dojo_date_idx
on public.membership_payments (
  dojo_id,
  payment_date
);



-- ============================================================
-- 7. SET DOJO DEFAULT RATE
-- ============================================================

create or replace function public.set_dojo_subscription_rate(
  target_dojo_id uuid,
  new_fee numeric,
  rate_effective_from date default current_date,
  new_currency text default 'IDR'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_class_id uuid;
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


  if new_fee is null
     or new_fee < 0
  then
    raise exception
      'Fee must be zero or greater';
  end if;


  select class_id
  into target_class_id
  from public.dojos
  where id = target_dojo_id;


  if target_class_id is null then
    raise exception
      'Dojo not found';
  end if;


  insert into public.dojo_subscription_settings (
    dojo_id,
    class_id,
    default_fee,
    currency,
    effective_from,
    active,
    created_by,
    updated_by
  )
  values (
    target_dojo_id,
    target_class_id,
    new_fee,
    upper(
      coalesce(
        nullif(
          trim(new_currency),
          ''
        ),
        'IDR'
      )
    ),
    coalesce(
      rate_effective_from,
      current_date
    ),
    true,
    auth.uid(),
    auth.uid()
  )

  on conflict (
    dojo_id
  )
  do update set
    class_id = excluded.class_id,
    default_fee = excluded.default_fee,
    currency = excluded.currency,
    effective_from = excluded.effective_from,
    active = true,
    updated_by = auth.uid(),
    updated_at = now();

end;
$$;



-- ============================================================
-- 8. SET MEMBER SPECIAL RATE
-- ============================================================

create or replace function public.set_member_subscription_rate(
  target_membership_id uuid,
  new_fee numeric,
  rate_effective_from date default current_date,
  rate_effective_until date default null,
  rate_reason text default null,
  new_currency text default 'IDR'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  membership_record public.class_memberships;
begin

  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;


  select *
  into membership_record
  from public.class_memberships
  where id = target_membership_id;


  if not found then
    raise exception
      'Membership not found';
  end if;


  if membership_record.dojo_id is null then
    raise exception
      'Membership has no dojo';
  end if;


  if not public.can_access_dojo_finance(
    membership_record.dojo_id,
    auth.uid()
  ) then
    raise exception
      'You do not have financial access to this dojo';
  end if;


  if new_fee is null
     or new_fee < 0
  then
    raise exception
      'Fee must be zero or greater';
  end if;


  insert into public.membership_subscription_overrides (
    membership_id,
    special_fee,
    currency,
    effective_from,
    effective_until,
    reason,
    active,
    created_by,
    updated_by
  )
  values (
    target_membership_id,
    new_fee,
    upper(
      coalesce(
        nullif(
          trim(new_currency),
          ''
        ),
        'IDR'
      )
    ),
    coalesce(
      rate_effective_from,
      current_date
    ),
    rate_effective_until,
    nullif(
      trim(rate_reason),
      ''
    ),
    true,
    auth.uid(),
    auth.uid()
  )

  on conflict (
    membership_id
  )
  do update set
    special_fee = excluded.special_fee,
    currency = excluded.currency,
    effective_from = excluded.effective_from,
    effective_until = excluded.effective_until,
    reason = excluded.reason,
    active = true,
    updated_by = auth.uid(),
    updated_at = now();

end;
$$;



-- ============================================================
-- 9. REMOVE SPECIAL RATE
-- ============================================================

create or replace function public.remove_member_subscription_rate(
  target_membership_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  membership_record public.class_memberships;
begin

  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;


  select *
  into membership_record
  from public.class_memberships
  where id = target_membership_id;


  if not found then
    raise exception
      'Membership not found';
  end if;


  if membership_record.dojo_id is null then
    raise exception
      'Membership has no dojo';
  end if;


  if not public.can_access_dojo_finance(
    membership_record.dojo_id,
    auth.uid()
  ) then
    raise exception
      'You do not have financial access to this dojo';
  end if;


  update public.membership_subscription_overrides
  set
    active = false,
    updated_by = auth.uid(),
    updated_at = now()
  where membership_id = target_membership_id
    and active = true;

end;
$$;



-- ============================================================
-- 10. GET EFFECTIVE MEMBER RATE
-- ============================================================

create or replace function public.get_membership_subscription_rate(
  target_membership_id uuid,
  rate_date date default current_date
)
returns table (
  amount numeric,
  currency text,
  rate_source text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  membership_record public.class_memberships;

  dojo_fee numeric;
  dojo_currency text;

  special_fee_value numeric;
  special_currency text;
begin

  select *
  into membership_record
  from public.class_memberships
  where id = target_membership_id;


  if not found then
    raise exception
      'Membership not found';
  end if;


  select
    mso.special_fee,
    mso.currency
  into
    special_fee_value,
    special_currency
  from public.membership_subscription_overrides mso
  where mso.membership_id = target_membership_id
    and mso.active = true
    and mso.effective_from <= coalesce(
      rate_date,
      current_date
    )
    and (
      mso.effective_until is null
      or mso.effective_until >= coalesce(
        rate_date,
        current_date
      )
    )
  limit 1;


  if special_fee_value is not null then
    return query
    select
      special_fee_value,
      coalesce(
        special_currency,
        'IDR'
      ),
      'member_special'::text;

    return;
  end if;


  select
    dss.default_fee,
    dss.currency
  into
    dojo_fee,
    dojo_currency
  from public.dojo_subscription_settings dss
  where dss.dojo_id =
    membership_record.dojo_id
    and dss.active = true
    and dss.effective_from <= coalesce(
      rate_date,
      current_date
    )
  limit 1;


  if dojo_fee is null then
    raise exception
      'No subscription rate configured for this member';
  end if;


  return query
  select
    dojo_fee,
    coalesce(
      dojo_currency,
      'IDR'
    ),
    'dojo_default'::text;

end;
$$;



-- ============================================================
-- 11. GENERATE MONTHLY CHARGES FOR ONE DOJO
-- ============================================================

create or replace function public.generate_dojo_monthly_subscription_charges(
  target_dojo_id uuid,
  target_month date default current_date
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
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
      coalesce(
        target_month,
        current_date
      )
    )::date;


  for membership_record in

    select *
    from public.class_memberships cm
    where cm.dojo_id = target_dojo_id
      and cm.status in (
        'active',
        'break_1',
        'break_2'
      )

  loop

    if exists (
      select 1
      from public.membership_subscription_charges charge
      where charge.membership_id = membership_record.id
        and charge.billing_month = billing_month_value
    )
    then
      continue;
    end if;


    select *
    into rate_record
    from public.get_membership_subscription_rate(
      membership_record.id,
      billing_month_value
    );


    insert into public.membership_subscription_charges (
      membership_id,
      dojo_id,
      class_id,
      billing_month,
      amount,
      currency,
      rate_source,
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
      auth.uid()
    );


    generated_count :=
      generated_count + 1;

  end loop;


  return generated_count;

end;
$$;



-- ============================================================
-- 12. RECORD PAYMENT
-- ============================================================

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
set search_path = public
as $$
declare
  charge_record public.membership_subscription_charges;

  payment_id uuid;

  total_paid numeric;
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
    raise exception
      'Subscription charge not found';
  end if;


  if not public.can_access_dojo_finance(
    charge_record.dojo_id,
    auth.uid()
  ) then
    raise exception
      'You do not have financial access to this dojo';
  end if;


  if payment_amount is null
     or payment_amount <= 0
  then
    raise exception
      'Payment amount must be greater than zero';
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
    nullif(
      trim(payment_method_value),
      ''
    ),
    nullif(
      trim(payment_reference_value),
      ''
    ),
    coalesce(
      payment_date_value,
      current_date
    ),
    auth.uid(),
    nullif(
      trim(payment_notes),
      ''
    )
  )
  returning id
  into payment_id;


  select
    coalesce(
      sum(amount),
      0
    )
  into total_paid
  from public.membership_payments
  where charge_id =
    target_charge_id;


  if total_paid >=
     charge_record.amount
  then

    update public.membership_subscription_charges
    set
      status =
        'paid'
    where id =
      target_charge_id;

  end if;


  return payment_id;

end;
$$;



-- ============================================================
-- 13. DOJO FINANCE REPORT
-- ============================================================

create or replace function public.get_dojo_financial_report(
  target_dojo_id uuid,
  report_month date default current_date
)
returns table (
  membership_id uuid,
  member_name text,
  member_id text,
  billing_month date,
  charge_amount numeric,
  paid_amount numeric,
  outstanding_amount numeric,
  currency text,
  payment_status text,
  rate_source text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  report_month_value date;
begin

  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;


  if not public.can_access_dojo_finance(
    target_dojo_id,
    auth.uid()
  ) then
    raise exception
      'You do not have permission to view this dojo financial report';
  end if;


  report_month_value :=
    date_trunc(
      'month',
      coalesce(
        report_month,
        current_date
      )
    )::date;


  return query

  select
    charge.membership_id,

    p.full_name,

    p.registration_number,

    charge.billing_month,

    charge.amount,

    coalesce(
      sum(payment.amount),
      0
    ),

    greatest(
      charge.amount -
      coalesce(
        sum(payment.amount),
        0
      ),
      0
    ),

    charge.currency,

    charge.status,

    charge.rate_source

  from public.membership_subscription_charges charge

  join public.class_memberships cm
    on cm.id =
      charge.membership_id

  join public.profiles p
    on p.id =
      cm.user_id

  left join public.membership_payments payment
    on payment.charge_id =
      charge.id

  where charge.dojo_id =
    target_dojo_id

    and charge.billing_month =
      report_month_value

  group by
    charge.membership_id,
    p.full_name,
    p.registration_number,
    charge.billing_month,
    charge.amount,
    charge.currency,
    charge.status,
    charge.rate_source

  order by
    p.full_name;

end;
$$;



-- ============================================================
-- 14. RLS
-- ============================================================

alter table public.dojo_subscription_settings
enable row level security;

alter table public.membership_subscription_overrides
enable row level security;

alter table public.membership_subscription_charges
enable row level security;

alter table public.membership_payments
enable row level security;



-- DOJO SETTINGS

drop policy if exists
"read dojo subscription settings"
on public.dojo_subscription_settings;


create policy
"read dojo subscription settings"
on public.dojo_subscription_settings
for select
to authenticated
using (
  public.can_access_dojo_finance(
    dojo_id,
    auth.uid()
  )
);



-- MEMBER SPECIAL RATE

drop policy if exists
"read member subscription overrides"
on public.membership_subscription_overrides;


create policy
"read member subscription overrides"
on public.membership_subscription_overrides
for select
to authenticated
using (
  exists (
    select 1
    from public.class_memberships cm
    where cm.id =
      membership_subscription_overrides.membership_id

      and (
        cm.user_id =
          auth.uid()

        or

        (
          cm.dojo_id is not null

          and

          public.can_access_dojo_finance(
            cm.dojo_id,
            auth.uid()
          )
        )
      )
  )
);



-- CHARGES

drop policy if exists
"read membership subscription charges"
on public.membership_subscription_charges;


create policy
"read membership subscription charges"
on public.membership_subscription_charges
for select
to authenticated
using (
  exists (
    select 1
    from public.class_memberships cm
    where cm.id =
      membership_subscription_charges.membership_id

      and (
        cm.user_id =
          auth.uid()

        or

        public.can_access_dojo_finance(
          membership_subscription_charges.dojo_id,
          auth.uid()
        )
      )
  )
);



-- PAYMENTS

drop policy if exists
"read membership payments"
on public.membership_payments;


create policy
"read membership payments"
on public.membership_payments
for select
to authenticated
using (
  exists (
    select 1
    from public.class_memberships cm
    where cm.id =
      membership_payments.membership_id

      and (
        cm.user_id =
          auth.uid()

        or

        public.can_access_dojo_finance(
          membership_payments.dojo_id,
          auth.uid()
        )
      )
  )
);



-- ============================================================
-- 15. PREVENT DIRECT CLIENT WRITES
-- ============================================================

revoke insert, update, delete
on public.dojo_subscription_settings
from authenticated;

revoke insert, update, delete
on public.membership_subscription_overrides
from authenticated;

revoke insert, update, delete
on public.membership_subscription_charges
from authenticated;

revoke insert, update, delete
on public.membership_payments
from authenticated;



-- ============================================================
-- 16. RPC PERMISSIONS
-- ============================================================

grant execute
on function public.set_dojo_subscription_rate(
  uuid,
  numeric,
  date,
  text
)
to authenticated;


grant execute
on function public.set_member_subscription_rate(
  uuid,
  numeric,
  date,
  date,
  text,
  text
)
to authenticated;


grant execute
on function public.remove_member_subscription_rate(
  uuid
)
to authenticated;


grant execute
on function public.get_membership_subscription_rate(
  uuid,
  date
)
to authenticated;


grant execute
on function public.generate_dojo_monthly_subscription_charges(
  uuid,
  date
)
to authenticated;


grant execute
on function public.record_membership_payment(
  uuid,
  numeric,
  text,
  text,
  date,
  text
)
to authenticated;


grant execute
on function public.get_dojo_financial_report(
  uuid,
  date
)
to authenticated;



-- ============================================================
-- DONE
-- ============================================================

select
  'PRIVATE DOJO FINANCE MODULE INSTALLED'
  as result;