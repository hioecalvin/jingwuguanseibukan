-- ============================================================
-- 008 MEMBER SUBSCRIPTION HISTORY
-- ============================================================
--
-- Adds:
-- - member-safe subscription history
-- - only returns the logged-in user's own charges
-- - includes confirmed paid amount and outstanding balance
--
-- Assumes existing:
-- - membership_subscription_charges
-- - membership_payments
-- - class_memberships
-- - classes
-- - dojos
-- ============================================================


create or replace function public.get_my_subscription_history()
returns table (
  charge_id uuid,
  membership_id uuid,
  class_name text,
  dojo_name text,
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
begin

  if auth.uid() is null then
    raise exception
      'Not authenticated';
  end if;


  return query

  select
    c.id as charge_id,

    c.membership_id,

    cl.name as class_name,

    d.name as dojo_name,

    c.billing_month,

    c.amount as charge_amount,

    coalesce(
      sum(p.amount),
      0
    ) as paid_amount,

    greatest(
      c.amount -
      coalesce(
        sum(p.amount),
        0
      ),
      0
    ) as outstanding_amount,

    c.currency,

    case
      when greatest(
        c.amount -
        coalesce(
          sum(p.amount),
          0
        ),
        0
      ) <= 0
      then 'paid'

      when coalesce(
        sum(p.amount),
        0
      ) > 0
      then 'partial'

      else 'unpaid'
    end as payment_status,

    c.rate_source::text

  from public.membership_subscription_charges c

  join public.class_memberships m
    on m.id =
      c.membership_id

  join public.classes cl
    on cl.id =
      c.class_id

  left join public.dojos d
    on d.id =
      c.dojo_id

  left join public.membership_payments p
    on p.charge_id =
      c.id

  where m.user_id =
    auth.uid()

    and c.status not in (
      'cancelled',
      'waived'
    )

  group by
    c.id,
    c.membership_id,
    cl.name,
    d.name,
    c.billing_month,
    c.amount,
    c.currency,
    c.rate_source

  order by
    c.billing_month desc,
    cl.name asc;

end;
$$;



grant execute
on function public.get_my_subscription_history()
to authenticated;



-- ============================================================
-- VERIFY
-- ============================================================

select
  routine_name

from information_schema.routines

where routine_schema =
  'public'

  and routine_name =
    'get_my_subscription_history';