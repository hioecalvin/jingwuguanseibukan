-- ============================================================
-- JS APP
-- SUBSCRIPTION MODULE
-- ============================================================
--
-- Fee priority:
--
-- MEMBER SPECIAL RATE
--       ↓
-- DOJO DEFAULT RATE
--       ↓
-- CLASS DEFAULT RATE
--
-- Example:
--
-- Aikido regular fee = Rp200,000
--
-- 80 members:
--   use Rp200,000
--
-- 20 members:
--   can each have their own special fee
--
-- Admin:
--   manages members/rates in their dojo
--
-- Super Admin:
--   manages everything
--
-- ============================================================



-- ============================================================
-- 1. CLASS DEFAULT SUBSCRIPTION
-- ============================================================

create table if not exists public.class_subscription_settings (
  id uuid primary key default gen_random_uuid(),

  class_id uuid not null unique
    references public.classes(id)
    on delete cascade,

  default_fee numeric(14,2) not null default 0,

  currency text not null default 'IDR',

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
-- 2. DOJO DEFAULT SUBSCRIPTION
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

  active boolean not null default true,

  effective_from date not null default current_date,

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
-- 3. MEMBER SPECIAL SUBSCRIPTION RATE
-- ============================================================

create table if not exists public.membership_subscription_overrides (
  id uuid primary key default gen_random_uuid(),

  membership_id uuid not null unique
    references public.class_memberships(id)
    on delete cascade,

  special_fee numeric(14,2) not null,

  currency text not null default 'IDR',

  active boolean not null default true,

  effective_from date not null default current_date,

  effective_until date,

  reason text,

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

  class_id uuid not null
    references public.classes(id),

  dojo_id uuid
    references public.dojos(id),

  billing_month date not null,

  amount numeric(14,2) not null,

  currency text not null default 'IDR',

  rate_source text not null
    check (
      rate_source in (
        'member_special',
        'dojo_default',
        'class_default'
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

  paid_at timestamptz,

  notes text,

  unique (
    membership_id,
    billing_month
  ),

  check (
    amount >= 0
  )
);



-- ============================================================
-- 5. INDEXES
-- ============================================================

create index if not exists
class_subscription_settings_class_idx
on public.class_subscription_settings (
  class_id
);


create index if not exists
dojo_subscription_settings_dojo_idx
on public.dojo_subscription_settings (
  dojo_id
);


create index if not exists
membership_subscription_override_membership_idx
on public.membership_subscription_overrides (
  membership_id,
  active
);


create index if not exists
membership_subscription_charges_month_idx
on public.membership_subscription_charges (
  billing_month,
  status
);


create index if not exists
membership_subscription_charges_membership_idx
on public.membership_subscription_charges (
  membership_id,
  billing_month desc
);



-- ============================================================
-- 6. NORMALISE BILLING MONTH
-- ============================================================

create or replace function public.normalise_subscription_billing_month()
returns trigger
language plpgsql
set search_path = public
as $$
begin

  new.billing_month :=
    date_trunc(
      'month',
      new.billing_month
    )::date;

  return new;

end;
$$;


drop trigger if exists
normalise_subscription_billing_month_trigger
on public.membership_subscription_charges;


create trigger
normalise_subscription_billing_month_trigger
before insert or update
on public.membership_subscription_charges
for each row
execute function
public.normalise_subscription_billing_month();



-- ============================================================
-- 7. GET EFFECTIVE RATE
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

  class_fee numeric;
  class_currency text;

  dojo_fee numeric;
  dojo_currency text;

  special_fee numeric;
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


  -- MEMBER SPECIAL RATE

  select
    special_fee,
    currency
  into
    special_fee,
    special_currency
  from public.membership_subscription_overrides
  where membership_id =
    target_membership_id

    and active = true

    and effective_from <=
      coalesce(
        rate_date,
        current_date
      )

    and (
      effective_until is null

      or effective_until >=
        coalesce(
          rate_date,
          current_date
        )
    )

  limit 1;


  if special_fee is not null then

    return query

    select
      special_fee,
      coalesce(
        special_currency,
        'IDR'
      ),
      'member_special'::text;

    return;

  end if;


  -- DOJO DEFAULT

  if membership_record.dojo_id
     is not null
  then

    select
      default_fee,
      currency
    into
      dojo_fee,
      dojo_currency
    from public.dojo_subscription_settings
    where dojo_id =
      membership_record.dojo_id

      and active = true

      and effective_from <=
        coalesce(
          rate_date,
          current_date
        )

    limit 1;

  end if;


  if dojo_fee is not null then

    return query

    select
      dojo_fee,
      coalesce(
        dojo_currency,
        'IDR'
      ),
      'dojo_default'::text;

    return;

  end if;


  -- CLASS DEFAULT

  select
    default_fee,
    currency
  into
    class_fee,
    class_currency
  from public.class_subscription_settings
  where class_id =
    membership_record.class_id

    and active = true

  limit 1;


  if class_fee is not null then

    return query

    select
      class_fee,
      coalesce(
        class_currency,
        'IDR'
      ),
      'class_default'::text;

    return;

  end if;


  raise exception
    'No subscription rate configured for this membership';

end;
$$;



-- ============================================================
-- 8. SET CLASS DEFAULT RATE
-- SUPER ADMIN ONLY
-- ============================================================

create or replace function public.set_class_subscription_rate(
  target_class_id uuid,
  new_fee numeric,
  new_currency text default 'IDR'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin

  if auth.uid() is null then
    raise exception
      'Not authenticated';
  end if;


  if not public.is_super_admin() then
    raise exception
      'Only Super Admin can change the class default rate';
  end if;


  if new_fee is null
     or new_fee < 0
  then
    raise exception
      'Fee must be zero or greater';
  end if;


  insert into public.class_subscription_settings (
    class_id,
    default_fee,
    currency,
    active,
    created_by,
    updated_by
  )

  values (
    target_class_id,
    new_fee,
    upper(
      coalesce(
        nullif(
          trim(
            new_currency
          ),
          ''
        ),
        'IDR'
      )
    ),
    true,
    auth.uid(),
    auth.uid()
  )

  on conflict (
    class_id
  )

  do update set
    default_fee =
      excluded.default_fee,

    currency =
      excluded.currency,

    active =
      true,

    updated_by =
      auth.uid(),

    updated_at =
      now();

end;
$$;



-- ============================================================
-- 9. SET DOJO DEFAULT RATE
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
    raise exception
      'Not authenticated';
  end if;


  if not public.can_manage_dojo(
    target_dojo_id,
    auth.uid()
  ) then
    raise exception
      'You do not administer this dojo';
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
  where id =
    target_dojo_id;


  if target_class_id is null then
    raise exception
      'Dojo not found';
  end if;


  insert into public.dojo_subscription_settings (
    dojo_id,
    class_id,
    default_fee,
    currency,
    active,
    effective_from,
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
          trim(
            new_currency
          ),
          ''
        ),
        'IDR'
      )
    ),
    true,
    coalesce(
      rate_effective_from,
      current_date
    ),
    auth.uid(),
    auth.uid()
  )

  on conflict (
    dojo_id
  )

  do update set
    class_id =
      excluded.class_id,

    default_fee =
      excluded.default_fee,

    currency =
      excluded.currency,

    active =
      true,

    effective_from =
      excluded.effective_from,

    updated_by =
      auth.uid(),

    updated_at =
      now();

end;
$$;



-- ============================================================
-- 10. SET MEMBER SPECIAL RATE
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
    raise exception
      'Not authenticated';
  end if;


  select *
  into membership_record
  from public.class_memberships
  where id =
    target_membership_id;


  if not found then
    raise exception
      'Membership not found';
  end if;


  if membership_record.dojo_id
     is null
  then
    raise exception
      'Membership has no dojo';
  end if;


  if not public.can_manage_dojo(
    membership_record.dojo_id,
    auth.uid()
  ) then
    raise exception
      'You do not administer this member''s dojo';
  end if;


  if new_fee is null
     or new_fee < 0
  then
    raise exception
      'Fee must be zero or greater';
  end if;


  if rate_effective_until is not null
     and rate_effective_until <
       coalesce(
         rate_effective_from,
         current_date
       )
  then
    raise exception
      'End date cannot be before start date';
  end if;


  insert into public.membership_subscription_overrides (
    membership_id,
    special_fee,
    currency,
    active,
    effective_from,
    effective_until,
    reason,
    created_by,
    updated_by
  )

  values (
    target_membership_id,

    new_fee,

    upper(
      coalesce(
        nullif(
          trim(
            new_currency
          ),
          ''
        ),
        'IDR'
      )
    ),

    true,

    coalesce(
      rate_effective_from,
      current_date
    ),

    rate_effective_until,

    nullif(
      trim(
        rate_reason
      ),
      ''
    ),

    auth.uid(),

    auth.uid()
  )

  on conflict (
    membership_id
  )

  do update set
    special_fee =
      excluded.special_fee,

    currency =
      excluded.currency,

    active =
      true,

    effective_from =
      excluded.effective_from,

    effective_until =
      excluded.effective_until,

    reason =
      excluded.reason,

    updated_by =
      auth.uid(),

    updated_at =
      now();

end;
$$;



-- ============================================================
-- 11. REMOVE MEMBER SPECIAL RATE
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
    raise exception
      'Not authenticated';
  end if;


  select *
  into membership_record
  from public.class_memberships
  where id =
    target_membership_id;


  if not found then
    raise exception
      'Membership not found';
  end if;


  if membership_record.dojo_id
     is null
  then
    raise exception
      'Membership has no dojo';
  end if;


  if not public.can_manage_dojo(
    membership_record.dojo_id,
    auth.uid()
  ) then
    raise exception
      'You do not administer this member''s dojo';
  end if;


  update public.membership_subscription_overrides
  set
    active = false,

    updated_by =
      auth.uid(),

    updated_at =
      now()

  where membership_id =
    target_membership_id

    and active = true;

end;
$$;



-- ============================================================
-- 12. GENERATE MONTHLY CHARGES
-- SUPER ADMIN
-- ============================================================

create or replace function public.generate_monthly_subscription_charges(
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
    raise exception
      'Not authenticated';
  end if;


  if not public.is_super_admin() then
    raise exception
      'Only Super Admin can generate organisation-wide charges';
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
    from public.class_memberships
    where status in (
      'active',
      'break_1',
      'break_2'
    )

  loop

    if exists (
      select 1
      from public.membership_subscription_charges
      where membership_id =
        membership_record.id

        and billing_month =
          billing_month_value
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
      class_id,
      dojo_id,
      billing_month,
      amount,
      currency,
      rate_source,
      status,
      generated_by
    )

    values (
      membership_record.id,
      membership_record.class_id,
      membership_record.dojo_id,
      billing_month_value,
      rate_record.amount,
      rate_record.currency,
      rate_record.rate_source,
      'unpaid',
      auth.uid()
    );


    generated_count :=
      generated_count + 1;

  end loop;


  return generated_count;

end;
$$;



-- ============================================================
-- 13. GENERATE ONE DOJO'S MONTHLY CHARGES
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
    raise exception
      'Not authenticated';
  end if;


  if not public.can_manage_dojo(
    target_dojo_id,
    auth.uid()
  ) then
    raise exception
      'You do not administer this dojo';
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
    from public.class_memberships
    where dojo_id =
      target_dojo_id

      and status in (
        'active',
        'break_1',
        'break_2'
      )

  loop

    if exists (
      select 1
      from public.membership_subscription_charges
      where membership_id =
        membership_record.id

        and billing_month =
          billing_month_value
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
      class_id,
      dojo_id,
      billing_month,
      amount,
      currency,
      rate_source,
      status,
      generated_by
    )

    values (
      membership_record.id,
      membership_record.class_id,
      membership_record.dojo_id,
      billing_month_value,
      rate_record.amount,
      rate_record.currency,
      rate_record.rate_source,
      'unpaid',
      auth.uid()
    );


    generated_count :=
      generated_count + 1;

  end loop;


  return generated_count;

end;
$$;



-- ============================================================
-- 14. PERMISSIONS
-- ============================================================

grant execute
on function public.get_membership_subscription_rate(
  uuid,
  date
)
to authenticated;


grant execute
on function public.set_class_subscription_rate(
  uuid,
  numeric,
  text
)
to authenticated;


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
on function public.generate_monthly_subscription_charges(
  date
)
to authenticated;


grant execute
on function public.generate_dojo_monthly_subscription_charges(
  uuid,
  date
)
to authenticated;



-- ============================================================
-- 15. RLS
-- ============================================================

alter table public.class_subscription_settings
enable row level security;

alter table public.dojo_subscription_settings
enable row level security;

alter table public.membership_subscription_overrides
enable row level security;

alter table public.membership_subscription_charges
enable row level security;



-- ============================================================
-- CLASS SETTINGS POLICY
-- ============================================================

drop policy if exists
"read class subscription settings"
on public.class_subscription_settings;


create policy
"read class subscription settings"
on public.class_subscription_settings
for select
to authenticated
using (
  true
);



-- ============================================================
-- DOJO SETTINGS POLICY
-- ============================================================

drop policy if exists
"read dojo subscription settings"
on public.dojo_subscription_settings;


create policy
"read dojo subscription settings"
on public.dojo_subscription_settings
for select
to authenticated
using (
  true
);



-- ============================================================
-- MEMBER SPECIAL RATE POLICY
-- ============================================================

drop policy if exists
"read membership subscription overrides"
on public.membership_subscription_overrides;


create policy
"read membership subscription overrides"
on public.membership_subscription_overrides
for select
to authenticated
using (

  exists (

    select 1

    from public.class_memberships cm

    where cm.id =
      membership_id

      and (

        cm.user_id =
          auth.uid()

        or

        public.is_super_admin()

        or

        (
          cm.dojo_id is not null

          and

          public.can_manage_dojo(
            cm.dojo_id,
            auth.uid()
          )
        )

      )

  )

);



-- ============================================================
-- MONTHLY CHARGES POLICY
-- ============================================================

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
      membership_id

      and (

        cm.user_id =
          auth.uid()

        or

        public.is_super_admin()

        or

        (
          cm.dojo_id is not null

          and

          public.can_manage_dojo(
            cm.dojo_id,
            auth.uid()
          )
        )

      )

  )

);



-- ============================================================
-- 16. PREVENT DIRECT BROWSER WRITES
-- ============================================================

revoke insert, update, delete
on public.class_subscription_settings
from authenticated;


revoke insert, update, delete
on public.dojo_subscription_settings
from authenticated;


revoke insert, update, delete
on public.membership_subscription_overrides
from authenticated;


revoke insert, update, delete
on public.membership_subscription_charges
from authenticated;



-- ============================================================
-- DONE
-- ============================================================

select
  'SUBSCRIPTION MODULE INSTALLED'
  as result;