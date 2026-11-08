-- PENDING LOCAL CANDIDATE: apply only after catalog/ledger review and explicit approval.
-- Reuse existing monthly charges, rate resolver and official payment records.
-- No new tables, payment collection, jobs, provider calls or existing-data edits.
-- The existing confirmation table gains a nullable group ID for atomic review.
begin;

do $preflight$
begin
  if to_regprocedure('public.get_membership_subscription_rate(uuid,date)') is null
     or to_regprocedure('public.record_membership_payment(uuid,numeric,text,text,date,text)') is null
     or to_regprocedure('public.can_access_dojo_finance(uuid,uuid)') is null
     or to_regprocedure('public.notify_monthly_subscription_charges(uuid,date)') is null then
    raise exception 'Required subscription functions are missing';
  end if;
  if exists (select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in (
      'quote_advance_subscription_payment','record_advance_subscription_payment',
      'submit_advance_subscription_payment','review_advance_subscription_payment',
      'get_pending_advance_payment_groups')) then
    raise exception 'Advance-payment functions already exist; reconcile before applying';
  end if;
end
$preflight$;

-- Keep caller binding and dojo isolation; Super Admin oversees all dojos.
create or replace function public.can_access_dojo_finance(
  target_dojo_id uuid, target_user_id uuid default auth.uid()
)
returns boolean language sql stable security definer
set search_path to public, pg_temp
as $function$
  select target_user_id is not null
    and (target_user_id = auth.uid() or coalesce(auth.role(), '') = 'service_role')
    and exists (select 1 from public.profiles p where p.id = target_user_id
      and p.account_status::text = 'active' and p.date_of_passing is null
      and (p.is_super_admin or exists (
        select 1 from public.dojo_admin_assignments a
        where a.user_id = target_user_id and a.dojo_id = target_dojo_id and a.active)));
$function$;

-- Existing public SELECT only exposes active dojos. Finance staff must retain
-- scoped access to historical records after a dojo is deactivated. Keep the
-- public policy unchanged; this additional policy never grants write access.
create policy "finance staff read assigned or supervised dojos"
  on public.dojos for select to authenticated
  using (public.can_access_dojo_finance(id, auth.uid()));

alter table public.membership_payment_confirmations add column payment_group_id uuid;
create index membership_payment_confirmations_group_idx
  on public.membership_payment_confirmations(payment_group_id)
  where payment_group_id is not null;

create function public.quote_advance_subscription_payment(
  target_membership_id uuid, first_month date, month_count integer, requested_months date[] default null
)
returns jsonb
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  member_row public.class_memberships%rowtype;
  charge_row public.membership_subscription_charges%rowtype;
  rate_row record;
  today_month date := date_trunc('month', now() at time zone 'Asia/Jakarta')::date;
  billing_date date;
  fee numeric;
  paid numeric;
  fee_currency text;
  batch_currency text;
  source_value text;
  total_value numeric := 0;
  rows_value jsonb := '[]'::jsonb;
  selected_dates date[];
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select * into member_row from public.class_memberships where id = target_membership_id;
  if not found or member_row.dojo_id is null then raise exception 'Membership unavailable'; end if;
  if member_row.user_id <> auth.uid()
     and not public.can_access_dojo_finance(member_row.dojo_id, auth.uid()) then
    raise exception 'You do not have financial access to this dojo';
  end if;
  if member_row.status::text not in ('active', 'break_1', 'break_2')
     or not exists (select 1 from public.profiles p where p.id = member_row.user_id
       and p.account_status::text = 'active' and p.date_of_passing is null) then
    raise exception 'Membership is not eligible for advance billing';
  end if;
  if first_month is null or month_count is null or month_count not between 1 and 12
     or first_month <> date_trunc('month', first_month)::date
     or first_month > (today_month + interval '12 months')::date then
    raise exception 'Choose an existing overdue month or a month within the next year, and select 1 to 12 months';
  end if;

  if requested_months is null then
    select array_agg((first_month+make_interval(months=>n))::date order by n)
      into selected_dates from generate_series(0,month_count-1) n;
  else
    if array_ndims(requested_months) is distinct from 1 or cardinality(requested_months) <> month_count
      or array_position(requested_months,null) is not null
      or (select count(distinct m) from unnest(requested_months) m) <> month_count
      or first_month is distinct from (select min(m) from unnest(requested_months) m) then
      raise exception 'Select 1 to 12 distinct months and review a fresh quote';
    end if;
    select array_agg(m order by m) into selected_dates from unnest(requested_months) m;
  end if;
  foreach billing_date in array selected_dates loop
    if billing_date <> date_trunc('month',billing_date)::date
      or billing_date > (today_month+interval '23 months')::date then
      raise exception 'Invalid selected billing month';
    end if;
    select * into charge_row from public.membership_subscription_charges c
      where c.membership_id = target_membership_id and c.billing_month = billing_date;
    if found then
      if charge_row.dojo_id is distinct from member_row.dojo_id
         or charge_row.class_id is distinct from member_row.class_id then
        raise exception 'Existing charge belongs to a different dojo or class';
      end if;
      if charge_row.status in ('paid', 'waived', 'cancelled') then
        raise exception 'A selected month is already paid or closed; review payment history';
      end if;
      if exists (select 1 from public.membership_payment_confirmations pc
        where pc.charge_id = charge_row.id and pc.status = 'pending') then
        raise exception 'A selected month is awaiting receipt confirmation';
      end if;
      select coalesce(sum(p.amount), 0) into paid from public.membership_payments p
        where p.charge_id = charge_row.id;
      -- Do not absorb legacy part-payments into this new full-month workflow.
      if paid <> 0 then raise exception 'Use the existing balance workflow for previously paid amounts'; end if;
      fee := charge_row.amount; fee_currency := charge_row.currency; source_value := charge_row.rate_source;
    else
      if billing_date < today_month then
        raise exception 'No existing bill for a selected overdue month; historical debt cannot be created by a payment report';
      end if;
      select * into rate_row from public.get_membership_subscription_rate(target_membership_id, billing_date);
      fee := rate_row.amount; fee_currency := rate_row.currency; source_value := rate_row.rate_source;
    end if;
    if fee is null or fee <= 0 or fee::text in ('NaN', 'Infinity', '-Infinity')
       or fee_currency is null or fee_currency !~ '^[A-Z]{3}$' then
      raise exception 'Each selected month must have a positive configured fee and currency';
    end if;
    if batch_currency is not null and batch_currency <> fee_currency then
      raise exception 'Selected months use different currencies; record them separately';
    end if;
    batch_currency := fee_currency;
    total_value := total_value + fee;
    rows_value := rows_value || jsonb_build_array(jsonb_build_object(
      'month', billing_date, 'amount', fee::text, 'currency', fee_currency,
      'rate_source', source_value, 'charge_id', charge_row.id));
  end loop;
  return jsonb_build_object('membership_id', member_row.id, 'dojo_id', member_row.dojo_id,
    'class_id', member_row.class_id, 'months', rows_value, 'currency', batch_currency,
    'total', total_value::text);
end;
$function$;

create function public.record_advance_subscription_payment(
  target_membership_id uuid, first_month date, month_count integer,
  expected_quote jsonb, received_amount numeric, payment_date_value date,
  payment_method_value text, payment_reference_value text default null,
  payment_notes text default null, requested_months date[] default null
)
returns jsonb
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  member_row public.class_memberships%rowtype;
  current_quote jsonb;
  entry jsonb;
  charge_row public.membership_subscription_charges%rowtype;
  billing_date date;
  payment_id uuid;
  payment_ids jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select * into member_row from public.class_memberships where id = target_membership_id;
  if not found or member_row.dojo_id is null then raise exception 'Membership unavailable'; end if;
  if not public.can_access_dojo_finance(member_row.dojo_id, auth.uid()) then
    raise exception 'You do not have financial access to this dojo';
  end if;
  if expected_quote is null or received_amount is null or received_amount <= 0
     or received_amount::text in ('NaN', 'Infinity', '-Infinity')
     or payment_date_value is null or payment_date_value > (now() at time zone 'Asia/Jakarta')::date
     or nullif(trim(payment_method_value), '') is null
     or length(payment_method_value) > 80 or length(payment_reference_value) > 200
     or length(payment_notes) > 1000 then
    raise exception 'Enter valid received-payment details; future payment dates are not allowed';
  end if;
  -- Validate scope, month bounds and rates before any mutation.
  current_quote := public.quote_advance_subscription_payment(target_membership_id, first_month, month_count, requested_months);
  -- Same lock keys/order as the existing monthly Generate & Notify RPC.
  for entry in select value from jsonb_array_elements(current_quote->'months') loop
    billing_date := (entry->>'month')::date;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
      'subscription-notifications:' || member_row.dojo_id::text || ':' || to_char(billing_date, 'YYYY-MM-DD'), 0));
  end loop;
  perform 1 from public.class_memberships where id = target_membership_id for update;
  -- Lock all existing selected bills before comparing the reviewed quote.
  perform 1 from public.membership_subscription_charges c
    where c.membership_id = target_membership_id
      and c.billing_month in (select (value->>'month')::date from jsonb_array_elements(current_quote->'months'))
    order by c.billing_month for update;
  current_quote := public.quote_advance_subscription_payment(target_membership_id, first_month, month_count, requested_months);
  if current_quote is distinct from expected_quote then
    raise exception 'Rates, membership or bills changed; review a fresh quote before recording';
  end if;
  if received_amount <> (current_quote->>'total')::numeric then
    raise exception 'Received amount must equal the full total of the selected months';
  end if;
  for entry in select value from jsonb_array_elements(current_quote->'months') loop
    billing_date := (entry->>'month')::date;
    if entry->>'charge_id' is null then
      insert into public.membership_subscription_charges
        (membership_id, dojo_id, class_id, billing_month, amount, currency, rate_source, generated_by)
      values (target_membership_id, (current_quote->>'dojo_id')::uuid,
        (current_quote->>'class_id')::uuid, billing_date, (entry->>'amount')::numeric,
        entry->>'currency', entry->>'rate_source', auth.uid())
      on conflict (membership_id, billing_month) do nothing;
    end if;
    select * into strict charge_row from public.membership_subscription_charges c
      where c.membership_id = target_membership_id and c.billing_month = billing_date for update;
    if charge_row.amount is distinct from (entry->>'amount')::numeric
       or charge_row.currency is distinct from entry->>'currency'
       or charge_row.dojo_id is distinct from (current_quote->>'dojo_id')::uuid
       or charge_row.class_id is distinct from (current_quote->>'class_id')::uuid
       or charge_row.rate_source is distinct from entry->>'rate_source' then
      raise exception 'Bill changed concurrently; review a fresh quote';
    end if;
    -- Reuse full-balance trigger, authorization, recorder attribution and history.
    payment_id := public.record_membership_payment(charge_row.id, charge_row.amount,
      payment_method_value, payment_reference_value, payment_date_value, payment_notes);
    payment_ids := payment_ids || jsonb_build_array(payment_id);
  end loop;
  -- One SQL transaction: failure on any month rolls back every charge/payment.
  -- Replays are rejected as already paid; they never create a second payment.
  return jsonb_build_object('recorded_months', month_count, 'payment_ids', payment_ids,
    'total', current_quote->>'total', 'currency', current_quote->>'currency');
end;
$function$;

-- An existing single-month review cannot split a grouped payment. The check runs
-- at transaction end so the group RPC can safely use the existing review routine.
create function public.enforce_payment_group_review()
returns trigger language plpgsql security definer
set search_path to public, pg_temp
as $function$
begin
  if new.payment_group_id is not null and exists (
    select 1 from public.membership_payment_confirmations pc
    where pc.payment_group_id = new.payment_group_id
    group by pc.payment_group_id having count(distinct pc.status) > 1
      or count(distinct pc.membership_id) <> 1
      or count(distinct pc.dojo_id) <> 1
  ) then
    raise exception 'Review all months of this payment together';
  end if;
  return new;
end;
$function$;
create constraint trigger payment_group_review_atomic
after insert or update on public.membership_payment_confirmations
deferrable initially deferred for each row execute function public.enforce_payment_group_review();

create function public.submit_advance_subscription_payment(
  target_membership_id uuid, first_month date, month_count integer,
  expected_quote jsonb, transferred_amount numeric, transfer_date_value date,
  payment_method_value text, member_note_value text default null, requested_months date[] default null
)
returns uuid language plpgsql security definer
set search_path to public, pg_temp
as $function$
declare
  member_row public.class_memberships%rowtype;
  quote_value jsonb;
  entry jsonb;
  billing_date date;
  charge_row public.membership_subscription_charges%rowtype;
  group_id uuid := gen_random_uuid();
  confirmation_id uuid;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select * into member_row from public.class_memberships where id = target_membership_id;
  if not found or member_row.user_id <> auth.uid() then
    raise exception 'You can only report your own payment';
  end if;
  if expected_quote is null or transferred_amount is null or transferred_amount <= 0
     or transferred_amount::text in ('NaN', 'Infinity', '-Infinity')
     or transfer_date_value is null or transfer_date_value > (now() at time zone 'Asia/Jakarta')::date
     or nullif(trim(payment_method_value), '') is null or length(payment_method_value) > 80
     or length(member_note_value) > 1000 then raise exception 'Invalid payment report details'; end if;
  quote_value := public.quote_advance_subscription_payment(target_membership_id, first_month, month_count, requested_months);
  for entry in select value from jsonb_array_elements(quote_value->'months') loop
    billing_date := (entry->>'month')::date;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
      'subscription-notifications:' || member_row.dojo_id::text || ':' || to_char(billing_date, 'YYYY-MM-DD'), 0));
  end loop;
  perform 1 from public.class_memberships where id = target_membership_id for update;
  perform 1 from public.membership_subscription_charges c where c.membership_id = target_membership_id
    and c.billing_month in (select (value->>'month')::date from jsonb_array_elements(quote_value->'months'))
    order by c.billing_month for update;
  -- Ownership is rechecked after acquiring the membership lock.
  if not exists (select 1 from public.class_memberships
    where id = target_membership_id and user_id = auth.uid()) then raise exception 'Membership changed'; end if;
  quote_value := public.quote_advance_subscription_payment(target_membership_id, first_month, month_count, requested_months);
  if quote_value is distinct from expected_quote then raise exception 'Bills changed; review a fresh quote'; end if;
  if transferred_amount <> (quote_value->>'total')::numeric then raise exception 'Report the full total for the selected months'; end if;
  for entry in select value from jsonb_array_elements(quote_value->'months') loop
    billing_date := (entry->>'month')::date;
    if entry->>'charge_id' is null then
      insert into public.membership_subscription_charges
        (membership_id, dojo_id, class_id, billing_month, amount, currency, rate_source, generated_by)
      values (target_membership_id, (quote_value->>'dojo_id')::uuid, (quote_value->>'class_id')::uuid,
        billing_date, (entry->>'amount')::numeric, entry->>'currency', entry->>'rate_source', auth.uid())
      on conflict (membership_id, billing_month) do nothing;
    end if;
    select * into strict charge_row from public.membership_subscription_charges c
      where c.membership_id = target_membership_id and c.billing_month = billing_date for update;
    if charge_row.amount is distinct from (entry->>'amount')::numeric
       or charge_row.currency is distinct from entry->>'currency'
       or charge_row.dojo_id is distinct from (quote_value->>'dojo_id')::uuid
       or charge_row.class_id is distinct from (quote_value->>'class_id')::uuid
       or charge_row.rate_source is distinct from entry->>'rate_source' then
      raise exception 'Bill changed concurrently; review a fresh quote';
    end if;
    -- Existing RPC queues dojo-admin alerts and inserts ONLY a pending claim.
    confirmation_id := public.submit_membership_payment_confirmation(charge_row.id,
      charge_row.amount, payment_method_value, transfer_date_value, member_note_value);
    update public.membership_payment_confirmations set payment_group_id = group_id where id = confirmation_id;
  end loop;
  return group_id;
end;
$function$;

create function public.review_advance_subscription_payment(target_group_id uuid, decision text, rejection_note text default null)
returns integer language plpgsql security definer
set search_path to public, pg_temp
as $function$
declare item record; reviewed_count integer := 0;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if target_group_id is null or decision is null or decision not in ('approved', 'rejected') then
    raise exception 'Invalid review decision'; end if;
  if decision = 'rejected' and nullif(trim(rejection_note), '') is null then
    raise exception 'A rejection reason is required'; end if;
  if not exists (select 1 from public.membership_payment_confirmations where payment_group_id = target_group_id)
     or exists (select 1 from public.membership_payment_confirmations pc
       where pc.payment_group_id = target_group_id and not public.can_access_dojo_finance(pc.dojo_id, auth.uid())) then
    raise exception 'Not authorised to review this dojo payment'; end if;
  for item in select pc.id, pc.status from public.membership_payment_confirmations pc
    where pc.payment_group_id = target_group_id order by pc.id for update loop
    if item.status <> 'pending' then raise exception 'This payment group has already been reviewed'; end if;
    perform public.review_membership_payment_confirmation(item.id, decision, rejection_note);
    reviewed_count := reviewed_count + 1;
  end loop;
  return reviewed_count;
end;
$function$;

create function public.get_pending_advance_payment_groups(target_dojo_id uuid)
returns jsonb language plpgsql stable security definer
set search_path to public, pg_temp
as $function$
begin
  if auth.uid() is null or not public.can_access_dojo_finance(target_dojo_id,auth.uid()) then
    raise exception 'Not authorised to view this dojo payment'; end if;
  return coalesce((select jsonb_agg(to_jsonb(g) order by g.first_month) from (
    select pc.payment_group_id, p.full_name, min(c.billing_month) as first_month,
      max(c.billing_month) as last_month, count(*) as month_count,
      jsonb_agg(c.billing_month order by c.billing_month) as months,
      sum(pc.amount)::text as total, min(c.currency) as currency,
      min(pc.payment_method) as payment_method, min(pc.transfer_date) as transfer_date,
      min(pc.member_note) as member_note
    from public.membership_payment_confirmations pc
    join public.membership_subscription_charges c on c.id=pc.charge_id
    join public.profiles p on p.id=pc.submitted_by
    where pc.dojo_id=target_dojo_id and pc.status='pending' and pc.payment_group_id is not null
    group by pc.payment_group_id,p.full_name
  ) g), '[]'::jsonb);
end;
$function$;

-- Keep the existing notification format/dedupe/ACL; suppress already-settled bills.
-- Refuse to guess when the installed function differs from the reviewed body.
do $notification_guard$
declare
  definition text := pg_get_functiondef('public.notify_monthly_subscription_charges(uuid,date)'::regprocedure);
  needle text := $needle$and c.status not in (
        'cancelled',
        'waived'
      )$needle$;
  replacement text := $replacement$and c.status not in ('cancelled', 'waived', 'paid')
      and c.amount > (select coalesce(sum(mp.amount), 0)
        from public.membership_payments mp where mp.charge_id = c.id)$replacement$;
begin
  definition := replace(definition, E'\r\n', E'\n');
  if length(definition) - length(replace(definition, needle, '')) <> length(needle) then
    raise exception 'Monthly notification body differs; reconcile before applying migration 059';
  end if;
  execute replace(definition, needle, replacement);
end
$notification_guard$;

do $pending_copy$
declare
  definition text := pg_get_functiondef('public.submit_membership_payment_confirmation(uuid,numeric,text,date,text)'::regprocedure);
begin
  if position(' marked their ' in definition) = 0 or position(' subscription as paid.' in definition) = 0 then
    raise exception 'Payment-report notification body differs; reconcile before applying';
  end if;
  execute replace(replace(definition, ' marked their ', ' reported their '),
    ' subscription as paid.', ' subscription payment. Please confirm receipt before marking it Paid.');
end
$pending_copy$;

alter function public.quote_advance_subscription_payment(uuid,date,integer,date[]) owner to postgres;
alter function public.record_advance_subscription_payment(uuid,date,integer,jsonb,numeric,date,text,text,text,date[]) owner to postgres;
revoke all on function public.quote_advance_subscription_payment(uuid,date,integer,date[]) from public, anon, authenticated, service_role;
revoke all on function public.record_advance_subscription_payment(uuid,date,integer,jsonb,numeric,date,text,text,text,date[]) from public, anon, authenticated, service_role;
grant execute on function public.quote_advance_subscription_payment(uuid,date,integer,date[]) to authenticated;
grant execute on function public.record_advance_subscription_payment(uuid,date,integer,jsonb,numeric,date,text,text,text,date[]) to authenticated;
alter function public.can_access_dojo_finance(uuid,uuid) owner to postgres;
alter function public.enforce_payment_group_review() owner to postgres;
alter function public.submit_advance_subscription_payment(uuid,date,integer,jsonb,numeric,date,text,text,date[]) owner to postgres;
alter function public.review_advance_subscription_payment(uuid,text,text) owner to postgres;
revoke all on function public.enforce_payment_group_review() from public, anon, authenticated, service_role;
revoke all on function public.submit_advance_subscription_payment(uuid,date,integer,jsonb,numeric,date,text,text,date[]) from public, anon, authenticated, service_role;
revoke all on function public.review_advance_subscription_payment(uuid,text,text) from public, anon, authenticated, service_role;
grant execute on function public.submit_advance_subscription_payment(uuid,date,integer,jsonb,numeric,date,text,text,date[]) to authenticated;
grant execute on function public.review_advance_subscription_payment(uuid,text,text) to authenticated;
alter function public.get_pending_advance_payment_groups(uuid) owner to postgres;
revoke all on function public.get_pending_advance_payment_groups(uuid) from public, anon, authenticated, service_role;
grant execute on function public.get_pending_advance_payment_groups(uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
