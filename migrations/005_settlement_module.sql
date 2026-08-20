-- ============================================================
-- JS APP
-- DOJO -> SUPER ADMIN SETTLEMENT MODULE
-- ============================================================
--
-- DEFAULT SHARE:
--   30% of eligible member payments
--
-- PRIVACY:
--   Super Admin cannot browse the dojo's private financial report.
--
--   Super Admin can only see:
--     - settlements submitted to them
--     - payment rows explicitly included in those settlements
--
-- FLOW:
--
--   Dojo Admin
--       ↓
--   Select monthly payments
--       ↓
--   Create Settlement
--       ↓
--   Submit Settlement
--       ↓
--   Super Admin Notification
--       ↓
--   Review
--       ├── Approve
--       └── Reject
--              ↓
--         Admin fixes/resubmits
--
-- ============================================================



-- ============================================================
-- 1. SETTLEMENT STATUS
-- ============================================================

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'dojo_settlement_status'
  ) then

    create type public.dojo_settlement_status
    as enum (
      'draft',
      'submitted',
      'approved',
      'rejected',
      'cancelled'
    );

  end if;
end
$$;



-- ============================================================
-- 2. DOJO SETTLEMENTS
-- ============================================================

create table if not exists public.dojo_settlements (
  id uuid primary key default gen_random_uuid(),

  dojo_id uuid not null
    references public.dojos(id)
    on delete restrict,

  class_id uuid not null
    references public.classes(id)
    on delete restrict,

  settlement_month date not null,

  share_percent numeric(5,2)
    not null
    default 30.00,

  gross_amount numeric(14,2)
    not null
    default 0,

  share_amount numeric(14,2)
    not null
    default 0,

  currency text
    not null
    default 'IDR',

  status public.dojo_settlement_status
    not null
    default 'draft',

  notes text,

  created_by uuid not null
    references public.profiles(id)
    on delete restrict,

  created_at timestamptz
    not null
    default now(),

  submitted_by uuid
    references public.profiles(id)
    on delete set null,

  submitted_at timestamptz,

  reviewed_by uuid
    references public.profiles(id)
    on delete set null,

  reviewed_at timestamptz,

  rejection_reason text,

  approved_at timestamptz,

  cancelled_by uuid
    references public.profiles(id)
    on delete set null,

  cancelled_at timestamptz,

  updated_at timestamptz
    not null
    default now(),

  check (
    share_percent >= 0
    and share_percent <= 100
  ),

  check (
    gross_amount >= 0
  ),

  check (
    share_amount >= 0
  )
);


create index if not exists
dojo_settlements_dojo_month_idx
on public.dojo_settlements (
  dojo_id,
  settlement_month,
  status
);


create index if not exists
dojo_settlements_status_idx
on public.dojo_settlements (
  status,
  submitted_at
);



-- ============================================================
-- 3. SETTLEMENT ITEMS
--
-- Each item points to a real payment record.
-- ============================================================

create table if not exists public.dojo_settlement_items (
  id uuid primary key default gen_random_uuid(),

  settlement_id uuid not null
    references public.dojo_settlements(id)
    on delete cascade,

  payment_id uuid not null
    references public.membership_payments(id)
    on delete restrict,

  membership_id uuid not null
    references public.class_memberships(id)
    on delete restrict,

  payment_amount numeric(14,2)
    not null,

  share_percent numeric(5,2)
    not null,

  share_amount numeric(14,2)
    not null,

  currency text
    not null
    default 'IDR',

  created_at timestamptz
    not null
    default now(),

  unique (
    settlement_id,
    payment_id
  ),

  check (
    payment_amount > 0
  ),

  check (
    share_percent >= 0
    and share_percent <= 100
  ),

  check (
    share_amount >= 0
  )
);


create index if not exists
dojo_settlement_items_settlement_idx
on public.dojo_settlement_items (
  settlement_id
);


create index if not exists
dojo_settlement_items_payment_idx
on public.dojo_settlement_items (
  payment_id
);



-- ============================================================
-- 4. PREVENT PAYMENT FROM BEING INCLUDED IN MULTIPLE
-- ACTIVE/APPROVED SETTLEMENTS
--
-- We enforce this through RPC checks below.
-- ============================================================



-- ============================================================
-- 5. CREATE DRAFT SETTLEMENT
-- ============================================================

create or replace function public.create_dojo_settlement(
  target_dojo_id uuid,
  target_month date,
  payment_ids uuid[],
  settlement_share_percent numeric default 30,
  settlement_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  settlement_id uuid;

  target_class_id uuid;

  month_value date;

  payment_record public.membership_payments;

  item_share numeric(14,2);

  total_gross numeric(14,2) := 0;

  total_share numeric(14,2) := 0;
begin

  if auth.uid() is null then
    raise exception
      'Not authenticated';
  end if;


  /*
   * Only Dojo Admin finance access qualifies.
   *
   * Super Admin alone does NOT qualify.
   */
  if not public.can_access_dojo_finance(
    target_dojo_id,
    auth.uid()
  ) then
    raise exception
      'You do not have financial access to this dojo';
  end if;


  if target_month is null then
    raise exception
      'Settlement month is required';
  end if;


  if settlement_share_percent is null
     or settlement_share_percent < 0
     or settlement_share_percent > 100
  then
    raise exception
      'Share percentage must be between 0 and 100';
  end if;


  if payment_ids is null
     or cardinality(payment_ids) = 0
  then
    raise exception
      'Select at least one payment';
  end if;


  month_value :=
    date_trunc(
      'month',
      target_month
    )::date;


  select class_id
  into target_class_id
  from public.dojos
  where id = target_dojo_id;


  if target_class_id is null then
    raise exception
      'Dojo not found';
  end if;


  /*
   * Create draft.
   */

  insert into public.dojo_settlements (
    dojo_id,
    class_id,
    settlement_month,
    share_percent,
    currency,
    status,
    notes,
    created_by
  )
  values (
    target_dojo_id,
    target_class_id,
    month_value,
    settlement_share_percent,
    'IDR',
    'draft',
    nullif(
      trim(settlement_notes),
      ''
    ),
    auth.uid()
  )
  returning id
  into settlement_id;


  /*
   * Validate and attach each payment.
   */

  for payment_record in

    select *
    from public.membership_payments
    where id = any(payment_ids)
    for update

  loop

    if payment_record.dojo_id
       is distinct from
       target_dojo_id
    then
      raise exception
        'One or more payments belong to another dojo';
    end if;


    /*
     * Payment date must fall in target month.
     */

    if date_trunc(
         'month',
         payment_record.payment_date
       )::date
       is distinct from
       month_value
    then
      raise exception
        'One or more payments are outside the selected settlement month';
    end if;


    /*
     * Block payments already attached to an active settlement.
     */

    if exists (
      select 1

      from public.dojo_settlement_items dsi

      join public.dojo_settlements ds
        on ds.id =
          dsi.settlement_id

      where dsi.payment_id =
        payment_record.id

        and ds.status in (
          'draft',
          'submitted',
          'approved'
        )
    ) then
      raise exception
        'One or more selected payments are already included in another settlement';
    end if;


    item_share :=
      round(
        (
          payment_record.amount *
          settlement_share_percent /
          100
        )::numeric,
        2
      );


    insert into public.dojo_settlement_items (
      settlement_id,
      payment_id,
      membership_id,
      payment_amount,
      share_percent,
      share_amount,
      currency
    )
    values (
      settlement_id,
      payment_record.id,
      payment_record.membership_id,
      payment_record.amount,
      settlement_share_percent,
      item_share,
      payment_record.currency
    );


    total_gross :=
      total_gross +
      payment_record.amount;


    total_share :=
      total_share +
      item_share;

  end loop;


  /*
   * Ensure all requested IDs existed.
   */

  if (
    select count(*)
    from public.dojo_settlement_items
    where settlement_id =
      create_dojo_settlement.settlement_id
  ) <>
  cardinality(payment_ids)
  then
    raise exception
      'One or more selected payments were not found';
  end if;


  update public.dojo_settlements
  set
    gross_amount =
      total_gross,

    share_amount =
      total_share,

    updated_at =
      now()

  where id =
    settlement_id;


  return settlement_id;

end;
$$;


grant execute
on function public.create_dojo_settlement(
  uuid,
  date,
  uuid[],
  numeric,
  text
)
to authenticated;



-- ============================================================
-- 6. SUBMIT SETTLEMENT
-- ============================================================

create or replace function public.submit_dojo_settlement(
  target_settlement_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  settlement_record public.dojo_settlements;
begin

  if auth.uid() is null then
    raise exception
      'Not authenticated';
  end if;


  select *
  into settlement_record
  from public.dojo_settlements
  where id =
    target_settlement_id
  for update;


  if not found then
    raise exception
      'Settlement not found';
  end if;


  if not public.can_access_dojo_finance(
    settlement_record.dojo_id,
    auth.uid()
  ) then
    raise exception
      'You do not have financial access to this dojo';
  end if;


  if settlement_record.status not in (
    'draft',
    'rejected'
  ) then
    raise exception
      'Only draft or rejected settlements can be submitted';
  end if;


  if not exists (
    select 1
    from public.dojo_settlement_items
    where settlement_id =
      target_settlement_id
  ) then
    raise exception
      'Settlement contains no payments';
  end if;


  update public.dojo_settlements
  set
    status =
      'submitted',

    submitted_by =
      auth.uid(),

    submitted_at =
      now(),

    reviewed_by =
      null,

    reviewed_at =
      null,

    rejection_reason =
      null,

    updated_at =
      now()

  where id =
    target_settlement_id;


  /*
   * Notification to Super Admin(s).
   *
   * Uses notification_outbox if it already exists.
   */

  if to_regclass(
    'public.notification_outbox'
  ) is not null then

    insert into public.notification_outbox (
      user_id,
      recipient_email,
      event_type,
      subject,
      payload
    )

    select
      p.id,

      p.email,

      'dojo_settlement_submitted',

      'Dojo settlement submitted',

      jsonb_build_object(
        'settlement_id',
          settlement_record.id,

        'dojo_id',
          settlement_record.dojo_id,

        'settlement_month',
          settlement_record.settlement_month,

        'gross_amount',
          settlement_record.gross_amount,

        'share_amount',
          settlement_record.share_amount,

        'currency',
          settlement_record.currency
      )

    from public.profiles p

    where p.is_super_admin =
      true;

  end if;

end;
$$;


grant execute
on function public.submit_dojo_settlement(
  uuid
)
to authenticated;



-- ============================================================
-- 7. REVIEW SETTLEMENT
-- SUPER ADMIN ONLY
-- ============================================================

create or replace function public.review_dojo_settlement(
  target_settlement_id uuid,
  decision text,
  rejection_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  settlement_record public.dojo_settlements;
begin

  if auth.uid() is null then
    raise exception
      'Not authenticated';
  end if;


  if not public.is_super_admin() then
    raise exception
      'Only Super Admin can review submitted settlements';
  end if;


  if decision not in (
    'approved',
    'rejected'
  ) then
    raise exception
      'Decision must be approved or rejected';
  end if;


  select *
  into settlement_record
  from public.dojo_settlements
  where id =
    target_settlement_id
    and status =
      'submitted'
  for update;


  if not found then
    raise exception
      'Submitted settlement not found';
  end if;


  if decision = 'approved' then

    update public.dojo_settlements
    set
      status =
        'approved',

      reviewed_by =
        auth.uid(),

      reviewed_at =
        now(),

      approved_at =
        now(),

      rejection_reason =
        null,

      updated_at =
        now()

    where id =
      target_settlement_id;

  else

    update public.dojo_settlements
    set
      status =
        'rejected',

      reviewed_by =
        auth.uid(),

      reviewed_at =
        now(),

      rejection_reason =
        nullif(
          trim(rejection_note),
          ''
        ),

      updated_at =
        now()

    where id =
      target_settlement_id;

  end if;


  /*
   * Notify the Dojo Admin who submitted it.
   */

  if to_regclass(
    'public.notification_outbox'
  ) is not null then

    insert into public.notification_outbox (
      user_id,
      recipient_email,
      event_type,
      subject,
      payload
    )

    select
      settlement_record.submitted_by,

      p.email,

      case
        when decision = 'approved'
          then 'dojo_settlement_approved'
        else 'dojo_settlement_rejected'
      end,

      case
        when decision = 'approved'
          then 'Dojo settlement approved'
        else 'Dojo settlement rejected'
      end,

      jsonb_build_object(
        'settlement_id',
          settlement_record.id,

        'dojo_id',
          settlement_record.dojo_id,

        'settlement_month',
          settlement_record.settlement_month,

        'share_amount',
          settlement_record.share_amount,

        'decision',
          decision,

        'rejection_reason',
          rejection_note
      )

    from public.profiles p

    where p.id =
      settlement_record.submitted_by;

  end if;

end;
$$;


grant execute
on function public.review_dojo_settlement(
  uuid,
  text,
  text
)
to authenticated;



-- ============================================================
-- 8. CANCEL DRAFT / REJECTED SETTLEMENT
-- ============================================================

create or replace function public.cancel_dojo_settlement(
  target_settlement_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  settlement_record public.dojo_settlements;
begin

  if auth.uid() is null then
    raise exception
      'Not authenticated';
  end if;


  select *
  into settlement_record
  from public.dojo_settlements
  where id =
    target_settlement_id
  for update;


  if not found then
    raise exception
      'Settlement not found';
  end if;


  if not public.can_access_dojo_finance(
    settlement_record.dojo_id,
    auth.uid()
  ) then
    raise exception
      'You do not have financial access to this dojo';
  end if;


  if settlement_record.status not in (
    'draft',
    'rejected'
  ) then
    raise exception
      'Only draft or rejected settlements can be cancelled';
  end if;


  update public.dojo_settlements
  set
    status =
      'cancelled',

    cancelled_by =
      auth.uid(),

    cancelled_at =
      now(),

    updated_at =
      now()

  where id =
    target_settlement_id;

end;
$$;


grant execute
on function public.cancel_dojo_settlement(
  uuid
)
to authenticated;



-- ============================================================
-- 9. DOJO ADMIN SETTLEMENT LIST
-- ============================================================

create or replace function public.get_dojo_admin_settlements(
  target_dojo_id uuid default null
)
returns table (
  settlement_id uuid,

  dojo_id uuid,
  dojo_name text,

  class_id uuid,
  class_name text,

  settlement_month date,

  share_percent numeric,

  gross_amount numeric,

  share_amount numeric,

  currency text,

  status text,

  notes text,

  created_by uuid,
  created_by_name text,
  created_at timestamptz,

  submitted_by uuid,
  submitted_by_name text,
  submitted_at timestamptz,

  reviewed_by uuid,
  reviewed_by_name text,
  reviewed_at timestamptz,

  rejection_reason text,

  approved_at timestamptz,

  item_count bigint
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
    ds.id,

    ds.dojo_id,
    d.name,

    ds.class_id,
    c.name,

    ds.settlement_month,

    ds.share_percent,

    ds.gross_amount,

    ds.share_amount,

    ds.currency,

    ds.status::text,

    ds.notes,

    ds.created_by,
    creator.full_name,
    ds.created_at,

    ds.submitted_by,
    submitter.full_name,
    ds.submitted_at,

    ds.reviewed_by,
    reviewer.full_name,
    ds.reviewed_at,

    ds.rejection_reason,

    ds.approved_at,

    (
      select count(*)
      from public.dojo_settlement_items item
      where item.settlement_id =
        ds.id
    )

  from public.dojo_settlements ds

  join public.dojos d
    on d.id =
      ds.dojo_id

  join public.classes c
    on c.id =
      ds.class_id

  left join public.profiles creator
    on creator.id =
      ds.created_by

  left join public.profiles submitter
    on submitter.id =
      ds.submitted_by

  left join public.profiles reviewer
    on reviewer.id =
      ds.reviewed_by

  where
    public.can_access_dojo_finance(
      ds.dojo_id,
      auth.uid()
    )

    and (
      target_dojo_id is null
      or ds.dojo_id =
        target_dojo_id
    )

  order by
    ds.settlement_month desc,
    ds.created_at desc;

end;
$$;


grant execute
on function public.get_dojo_admin_settlements(
  uuid
)
to authenticated;



-- ============================================================
-- 10. SUPER ADMIN SETTLEMENT LIST
--
-- IMPORTANT:
-- This does NOT expose normal dojo financial reports.
-- ============================================================

create or replace function public.get_super_admin_settlements()
returns table (
  settlement_id uuid,

  dojo_id uuid,
  dojo_name text,

  class_id uuid,
  class_name text,

  settlement_month date,

  share_percent numeric,

  gross_amount numeric,

  share_amount numeric,

  currency text,

  status text,

  notes text,

  submitted_by uuid,
  submitted_by_name text,
  submitted_at timestamptz,

  reviewed_by uuid,
  reviewed_by_name text,
  reviewed_at timestamptz,

  rejection_reason text,

  approved_at timestamptz,

  item_count bigint
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


  if not public.is_super_admin() then
    raise exception
      'Super Admin access required';
  end if;


  return query

  select
    ds.id,

    ds.dojo_id,
    d.name,

    ds.class_id,
    c.name,

    ds.settlement_month,

    ds.share_percent,

    ds.gross_amount,

    ds.share_amount,

    ds.currency,

    ds.status::text,

    ds.notes,

    ds.submitted_by,
    submitter.full_name,
    ds.submitted_at,

    ds.reviewed_by,
    reviewer.full_name,
    ds.reviewed_at,

    ds.rejection_reason,

    ds.approved_at,

    (
      select count(*)
      from public.dojo_settlement_items item
      where item.settlement_id =
        ds.id
    )

  from public.dojo_settlements ds

  join public.dojos d
    on d.id =
      ds.dojo_id

  join public.classes c
    on c.id =
      ds.class_id

  left join public.profiles submitter
    on submitter.id =
      ds.submitted_by

  left join public.profiles reviewer
    on reviewer.id =
      ds.reviewed_by

  /*
   * Super Admin sees submitted/history only.
   *
   * Draft internal finance remains private.
   */

  where ds.status in (
    'submitted',
    'approved',
    'rejected'
  )

  order by

    case
      when ds.status =
        'submitted'
      then 0

      when ds.status =
        'rejected'
      then 1

      else 2
    end,

    ds.submitted_at desc nulls last,
    ds.created_at desc;

end;
$$;


grant execute
on function public.get_super_admin_settlements()
to authenticated;



-- ============================================================
-- 11. SETTLEMENT DETAIL
--
-- This is the ONLY financial detail Super Admin receives.
--
-- It shows only payments explicitly included in this
-- submitted settlement.
-- ============================================================

create or replace function public.get_dojo_settlement_items(
  target_settlement_id uuid
)
returns table (
  item_id uuid,

  payment_id uuid,

  membership_id uuid,

  member_name text,

  member_id text,

  payment_date date,

  payment_amount numeric,

  payment_method text,

  payment_reference text,

  share_percent numeric,

  share_amount numeric,

  currency text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  settlement_record public.dojo_settlements;
begin

  if auth.uid() is null then
    raise exception
      'Not authenticated';
  end if;


  select *
  into settlement_record
  from public.dojo_settlements
  where id =
    target_settlement_id;


  if not found then
    raise exception
      'Settlement not found';
  end if;


  /*
   * Access:
   *
   * Dojo Admin:
   *   can see their own dojo's settlement
   *
   * Super Admin:
   *   only if settlement has been submitted/history
   */

  if not (
    public.can_access_dojo_finance(
      settlement_record.dojo_id,
      auth.uid()
    )

    or

    (
      public.is_super_admin()

      and settlement_record.status in (
        'submitted',
        'approved',
        'rejected'
      )
    )
  ) then
    raise exception
      'Not authorised to view this settlement';
  end if;


  return query

  select
    item.id,

    item.payment_id,

    item.membership_id,

    p.full_name,

    p.registration_number,

    mp.payment_date,

    item.payment_amount,

    mp.payment_method,

    mp.payment_reference,

    item.share_percent,

    item.share_amount,

    item.currency

  from public.dojo_settlement_items item

  join public.membership_payments mp
    on mp.id =
      item.payment_id

  join public.class_memberships cm
    on cm.id =
      item.membership_id

  join public.profiles p
    on p.id =
      cm.user_id

  where item.settlement_id =
    target_settlement_id

  order by
    p.full_name,
    mp.payment_date;

end;
$$;


grant execute
on function public.get_dojo_settlement_items(
  uuid
)
to authenticated;



-- ============================================================
-- 12. ELIGIBLE PAYMENTS
--
-- Dojo Admin uses this to choose which member payments
-- are included in the settlement.
-- ============================================================

create or replace function public.get_settlement_eligible_payments(
  target_dojo_id uuid,
  target_month date
)
returns table (
  payment_id uuid,

  membership_id uuid,

  member_name text,

  member_id text,

  payment_date date,

  payment_amount numeric,

  currency text,

  payment_method text,

  payment_reference text,

  suggested_share numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  month_value date;
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


  month_value :=
    date_trunc(
      'month',
      target_month
    )::date;


  return query

  select
    mp.id,

    mp.membership_id,

    p.full_name,

    p.registration_number,

    mp.payment_date,

    mp.amount,

    mp.currency,

    mp.payment_method,

    mp.payment_reference,

    round(
      (
        mp.amount *
        30 /
        100
      )::numeric,
      2
    )

  from public.membership_payments mp

  join public.class_memberships cm
    on cm.id =
      mp.membership_id

  join public.profiles p
    on p.id =
      cm.user_id

  where mp.dojo_id =
    target_dojo_id

    and date_trunc(
      'month',
      mp.payment_date
    )::date =
      month_value

    /*
     * Exclude payments already included in
     * active or approved settlements.
     */

    and not exists (
      select 1

      from public.dojo_settlement_items dsi

      join public.dojo_settlements ds
        on ds.id =
          dsi.settlement_id

      where dsi.payment_id =
        mp.id

        and ds.status in (
          'draft',
          'submitted',
          'approved'
        )
    )

  order by
    mp.payment_date,
    p.full_name;

end;
$$;


grant execute
on function public.get_settlement_eligible_payments(
  uuid,
  date
)
to authenticated;



-- ============================================================
-- 13. RLS
-- ============================================================

alter table public.dojo_settlements
enable row level security;

alter table public.dojo_settlement_items
enable row level security;



-- ============================================================
-- SETTLEMENT POLICY
-- ============================================================

drop policy if exists
"read dojo settlements"
on public.dojo_settlements;


create policy
"read dojo settlements"
on public.dojo_settlements
for select
to authenticated
using (
  /*
   * Dojo Admin:
   * full settlement access for their dojo.
   */

  public.can_access_dojo_finance(
    dojo_id,
    auth.uid()
  )

  or

  /*
   * Super Admin:
   * submitted/history only.
   */

  (
    public.is_super_admin()

    and status in (
      'submitted',
      'approved',
      'rejected'
    )
  )
);



-- ============================================================
-- SETTLEMENT ITEM POLICY
-- ============================================================

drop policy if exists
"read dojo settlement items"
on public.dojo_settlement_items;


create policy
"read dojo settlement items"
on public.dojo_settlement_items
for select
to authenticated
using (
  exists (
    select 1

    from public.dojo_settlements ds

    where ds.id =
      dojo_settlement_items.settlement_id

      and (
        public.can_access_dojo_finance(
          ds.dojo_id,
          auth.uid()
        )

        or

        (
          public.is_super_admin()

          and ds.status in (
            'submitted',
            'approved',
            'rejected'
          )
        )
      )
  )
);



-- ============================================================
-- 14. NO DIRECT CLIENT WRITES
-- ============================================================

revoke insert, update, delete
on public.dojo_settlements
from authenticated;


revoke insert, update, delete
on public.dojo_settlement_items
from authenticated;



-- ============================================================
-- 15. FINAL PERMISSIONS
-- ============================================================

grant execute
on function public.create_dojo_settlement(
  uuid,
  date,
  uuid[],
  numeric,
  text
)
to authenticated;


grant execute
on function public.submit_dojo_settlement(
  uuid
)
to authenticated;


grant execute
on function public.review_dojo_settlement(
  uuid,
  text,
  text
)
to authenticated;


grant execute
on function public.cancel_dojo_settlement(
  uuid
)
to authenticated;


grant execute
on function public.get_dojo_admin_settlements(
  uuid
)
to authenticated;


grant execute
on function public.get_super_admin_settlements()
to authenticated;


grant execute
on function public.get_dojo_settlement_items(
  uuid
)
to authenticated;


grant execute
on function public.get_settlement_eligible_payments(
  uuid,
  date
)
to authenticated;



-- ============================================================
-- DONE
-- ============================================================

select
  'DOJO SETTLEMENT MODULE INSTALLED'
  as result;