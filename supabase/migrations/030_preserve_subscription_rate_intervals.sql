-- Preserve complete subscription-rate history when inserting bounded periods,
-- and keep dojo rate resolution valid when future or backdated rates are added.

begin;

do $preflight$
begin
  if to_regclass('public.membership_subscription_overrides') is null
     or to_regclass('public.dojo_subscription_settings') is null
     or to_regclass('public.dojo_subscription_rate_history') is null
     or to_regprocedure('public.can_access_dojo_finance(uuid,uuid)') is null then
    raise exception 'Required subscription-rate objects are missing';
  end if;
end
$preflight$;

create or replace function public.set_dojo_subscription_rate(
  target_dojo_id uuid,
  new_fee numeric,
  rate_effective_from date default current_date,
  new_currency text default 'IDR'
)
returns void
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  dojo_row public.dojos%rowtype;
  existing_setting public.dojo_subscription_settings%rowtype;
  effective_rate record;
  latest_rate record;
  previous_rate record;
  change_timestamp timestamptz;
  normalized_currency text;
  effective_date_value date;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.can_access_dojo_finance(target_dojo_id, auth.uid()) then
    raise exception 'You do not have financial access to this dojo';
  end if;

  if new_fee is null or new_fee < 0 then
    raise exception 'Fee must be zero or greater';
  end if;

  normalized_currency := upper(coalesce(nullif(trim(new_currency), ''), 'IDR'));
  effective_date_value := coalesce(rate_effective_from, current_date);

  -- The dojo row serializes all rate changes, including the first one when no
  -- settings row exists yet. Re-check scope after the lock closes the TOCTOU gap.
  select d.*
  into dojo_row
  from public.dojos d
  where d.id = target_dojo_id
  for update;

  if not found then
    raise exception 'Dojo not found';
  end if;

  if not public.can_access_dojo_finance(dojo_row.id, auth.uid()) then
    raise exception 'You do not have financial access to this dojo';
  end if;

  select s.*
  into existing_setting
  from public.dojo_subscription_settings s
  where s.dojo_id = target_dojo_id
  for update;

  -- Older installations may have a settings row with no matching baseline
  -- history. Preserve it before a future setting replaces the single-row cache.
  if existing_setting.id is not null
     and not exists (
       select 1
       from public.dojo_subscription_rate_history h
       where h.dojo_id = target_dojo_id
         and h.class_id = existing_setting.class_id
         and h.effective_from = existing_setting.effective_from
         and h.new_fee is not distinct from existing_setting.default_fee
         and h.new_currency is not distinct from existing_setting.currency
     ) then
    insert into public.dojo_subscription_rate_history (
      dojo_id, class_id, old_fee, new_fee, old_currency, new_currency,
      effective_from, changed_by, changed_at
    ) values (
      target_dojo_id, existing_setting.class_id, null,
      existing_setting.default_fee, null, existing_setting.currency,
      existing_setting.effective_from,
      coalesce(existing_setting.updated_by, existing_setting.created_by, auth.uid()),
      coalesce(existing_setting.updated_at, existing_setting.created_at, now())
    );
  end if;

  -- Only the latest change for an effective date is authoritative. Looking at
  -- every historical row would incorrectly make a deliberate A -> B -> A
  -- correction look idempotent because the first A row still exists.
  select h.new_fee, h.new_currency
  into effective_rate
    from public.dojo_subscription_rate_history h
    where h.dojo_id = target_dojo_id
      and h.class_id = dojo_row.class_id
      and h.effective_from = effective_date_value
    order by h.changed_at desc, h.id desc
    limit 1;

  if found
     and effective_rate.new_fee is not distinct from new_fee
     and effective_rate.new_currency is not distinct from normalized_currency then
    return;
  end if;

  -- now() is fixed at transaction start, so multiple calls in one transaction
  -- can tie. The dojo row lock lets us advance a per-dojo timestamp safely and
  -- preserve the actual serialized change order without relying on random UUIDs.
  select greatest(
    clock_timestamp(),
    coalesce(
      max(h.changed_at) + interval '1 microsecond',
      '-infinity'::timestamptz
    )
  )
  into change_timestamp
  from public.dojo_subscription_rate_history h
  where h.dojo_id = target_dojo_id
    and h.class_id = dojo_row.class_id;

  select h.new_fee, h.new_currency
  into previous_rate
  from public.dojo_subscription_rate_history h
  where h.dojo_id = target_dojo_id
    and h.class_id = dojo_row.class_id
    and h.effective_from <= effective_date_value
  order by h.effective_from desc, h.changed_at desc, h.id desc
  limit 1;

  insert into public.dojo_subscription_rate_history (
    dojo_id, class_id, old_fee, new_fee, old_currency, new_currency,
    effective_from, changed_by, changed_at
  ) values (
    target_dojo_id, dojo_row.class_id,
    previous_rate.new_fee, new_fee,
    previous_rate.new_currency, normalized_currency,
    effective_date_value, auth.uid(), change_timestamp
  );

  -- The settings table is a cache of the latest effective period. Selecting it
  -- from history prevents a backdated edit from hiding a later scheduled rate.
  select h.new_fee, h.new_currency, h.effective_from
  into latest_rate
  from public.dojo_subscription_rate_history h
  where h.dojo_id = target_dojo_id
    and h.class_id = dojo_row.class_id
  order by h.effective_from desc, h.changed_at desc, h.id desc
  limit 1;

  insert into public.dojo_subscription_settings (
    dojo_id, class_id, default_fee, currency, effective_from, active,
    created_by, updated_by
  ) values (
    target_dojo_id, dojo_row.class_id, latest_rate.new_fee,
    latest_rate.new_currency, latest_rate.effective_from, true,
    auth.uid(), auth.uid()
  )
  on conflict (dojo_id) do update set
    class_id = excluded.class_id,
    default_fee = excluded.default_fee,
    currency = excluded.currency,
    effective_from = excluded.effective_from,
    active = true,
    updated_by = auth.uid(),
    updated_at = now();
end;
$function$;

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
set search_path to public, pg_temp
as $function$
declare
  membership_record public.class_memberships%rowtype;
  start_date_value date;
  end_date_value date;
  currency_value text;
  existing_record public.membership_subscription_overrides%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if new_fee is null or new_fee < 0 then
    raise exception 'Fee must be zero or greater';
  end if;

  start_date_value := coalesce(rate_effective_from, current_date);
  end_date_value := rate_effective_until;

  if end_date_value is not null and end_date_value < start_date_value then
    raise exception 'End date cannot be before start date';
  end if;

  currency_value := upper(coalesce(nullif(trim(new_currency), ''), 'IDR'));

  select cm.*
  into membership_record
  from public.class_memberships cm
  where cm.id = target_membership_id;

  if not found then
    raise exception 'Membership not found';
  end if;

  if membership_record.dojo_id is null then
    raise exception 'Membership has no dojo';
  end if;

  if not public.can_access_dojo_finance(membership_record.dojo_id, auth.uid()) then
    raise exception 'You do not have financial access to this dojo';
  end if;

  select cm.*
  into membership_record
  from public.class_memberships cm
  where cm.id = target_membership_id
  for update;

  if not found then
    raise exception 'Membership not found';
  end if;

  if membership_record.dojo_id is null then
    raise exception 'Membership has no dojo';
  end if;

  if not public.can_access_dojo_finance(membership_record.dojo_id, auth.uid()) then
    raise exception 'You do not have financial access to this dojo';
  end if;

  if exists (
    select 1
    from public.membership_subscription_overrides o
    where o.membership_id = target_membership_id
      and o.active = true
      and o.effective_from = start_date_value
      and o.effective_until is not distinct from end_date_value
      and o.special_fee is not distinct from new_fee
      and o.currency is not distinct from currency_value
      and o.reason is not distinct from nullif(trim(rate_reason), '')
  ) then
    return;
  end if;

  for existing_record in
    select o.*
    from public.membership_subscription_overrides o
    where o.membership_id = target_membership_id
      and o.active = true
      and (o.effective_until is null or o.effective_until >= start_date_value)
      and (end_date_value is null or o.effective_from <= end_date_value)
    order by o.effective_from, o.created_at, o.id
    for update
  loop
    if existing_record.effective_from < start_date_value then
      update public.membership_subscription_overrides
      set effective_until = start_date_value - 1,
          updated_by = auth.uid(),
          updated_at = now()
      where id = existing_record.id;

      -- A bounded edit inside a longer period splits rather than discards the
      -- original period's tail.
      if end_date_value is not null
         and (existing_record.effective_until is null
              or existing_record.effective_until > end_date_value) then
        insert into public.membership_subscription_overrides (
          membership_id, special_fee, currency, effective_from,
          effective_until, reason, active, created_by, updated_by,
          created_at, updated_at
        ) values (
          existing_record.membership_id, existing_record.special_fee,
          existing_record.currency, end_date_value + 1,
          existing_record.effective_until, existing_record.reason, true,
          existing_record.created_by, auth.uid(), existing_record.created_at, now()
        );
      end if;
    elsif end_date_value is not null
          and (existing_record.effective_until is null
               or existing_record.effective_until > end_date_value) then
      -- Only the leading overlap is replaced; move the untouched tail forward.
      update public.membership_subscription_overrides
      set effective_from = end_date_value + 1,
          updated_by = auth.uid(),
          updated_at = now()
      where id = existing_record.id;
    else
      update public.membership_subscription_overrides
      set active = false,
          updated_by = auth.uid(),
          updated_at = now()
      where id = existing_record.id;
    end if;
  end loop;

  insert into public.membership_subscription_overrides (
    membership_id, special_fee, currency, effective_from, effective_until,
    reason, active, created_by, updated_by, created_at, updated_at
  ) values (
    target_membership_id, new_fee, currency_value, start_date_value,
    end_date_value, nullif(trim(rate_reason), ''), true,
    auth.uid(), auth.uid(), now(), now()
  );
end;
$function$;

create or replace function public.remove_member_subscription_rate(
  target_membership_id uuid
)
returns void
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  membership_record public.class_memberships%rowtype;
  today_value date := current_date;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select cm.*
  into membership_record
  from public.class_memberships cm
  where cm.id = target_membership_id;

  if not found then
    raise exception 'Membership not found';
  end if;

  if membership_record.dojo_id is null then
    raise exception 'Membership has no dojo';
  end if;

  if not public.can_access_dojo_finance(membership_record.dojo_id, auth.uid()) then
    raise exception 'You do not have financial access to this dojo';
  end if;

  select cm.*
  into membership_record
  from public.class_memberships cm
  where cm.id = target_membership_id
  for update;

  if not found then
    raise exception 'Membership not found';
  end if;

  if membership_record.dojo_id is null then
    raise exception 'Membership has no dojo';
  end if;

  if not public.can_access_dojo_finance(membership_record.dojo_id, auth.uid()) then
    raise exception 'You do not have financial access to this dojo';
  end if;

  update public.membership_subscription_overrides
  set active = false,
      updated_by = auth.uid(),
      updated_at = now()
  where membership_id = target_membership_id
    and active = true
    and effective_from > today_value;

  -- A rate already used today remains valid through today so charges generated
  -- for today cannot change underneath the administrator.
  update public.membership_subscription_overrides
  set effective_until = today_value,
      updated_by = auth.uid(),
      updated_at = now()
  where membership_id = target_membership_id
    and active = true
    and effective_from <= today_value
    and (effective_until is null or effective_until > today_value);
end;
$function$;

create or replace function public.get_membership_subscription_rate(
  target_membership_id uuid,
  rate_date date default current_date
)
returns table (amount numeric, currency text, rate_source text)
language plpgsql
stable
security definer
set search_path to public, pg_temp
as $function$
declare
  membership_row public.class_memberships%rowtype;
  effective_date_value date;
  override_row public.membership_subscription_overrides%rowtype;
  history_row record;
  current_dojo_rate public.dojo_subscription_settings%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  effective_date_value := coalesce(rate_date, current_date);

  select cm.* into membership_row
  from public.class_memberships cm
  where cm.id = target_membership_id;

  if not found then
    raise exception 'Membership not found';
  end if;

  if membership_row.dojo_id is null then
    raise exception 'Membership has no dojo';
  end if;

  select o.* into override_row
  from public.membership_subscription_overrides o
  where o.membership_id = target_membership_id
    and o.active = true
    and o.effective_from <= effective_date_value
    and (o.effective_until is null or o.effective_until >= effective_date_value)
  order by o.effective_from desc, o.created_at desc, o.id desc
  limit 1;

  if found then
    return query select override_row.special_fee::numeric,
      override_row.currency::text, 'member_special'::text;
    return;
  end if;

  select h.new_fee, h.new_currency, h.class_id into history_row
  from public.dojo_subscription_rate_history h
  where h.dojo_id = membership_row.dojo_id
    and h.effective_from <= effective_date_value
  order by h.effective_from desc, h.changed_at desc, h.id desc
  limit 1;

  if found then
    if history_row.class_id is distinct from membership_row.class_id then
      raise exception 'Dojo subscription configuration does not match membership class';
    end if;
    return query select history_row.new_fee::numeric,
      history_row.new_currency::text, 'dojo_default'::text;
    return;
  end if;

  select s.* into current_dojo_rate
  from public.dojo_subscription_settings s
  where s.dojo_id = membership_row.dojo_id
    and s.active = true
    and s.effective_from <= effective_date_value
  order by s.effective_from desc, s.updated_at desc, s.id desc
  limit 1;

  if found then
    if current_dojo_rate.class_id is distinct from membership_row.class_id then
      raise exception 'Dojo subscription configuration does not match membership class';
    end if;
    return query select current_dojo_rate.default_fee::numeric,
      current_dojo_rate.currency::text, 'dojo_default'::text;
    return;
  end if;

  -- Repair the historical gap left by an already-scheduled future rate from an
  -- older function: its old_* values are the rate that preceded that change.
  select h.old_fee as new_fee, h.old_currency as new_currency, h.class_id
  into history_row
  from public.dojo_subscription_rate_history h
  where h.dojo_id = membership_row.dojo_id
    and h.effective_from > effective_date_value
    and h.old_fee is not null
    and h.old_currency is not null
  order by h.effective_from asc, h.changed_at asc, h.id asc
  limit 1;

  if not found then
    raise exception 'No subscription rate configured for this dojo on the requested date';
  end if;

  if history_row.class_id is distinct from membership_row.class_id then
    raise exception 'Dojo subscription configuration does not match membership class';
  end if;

  return query select history_row.new_fee::numeric,
    history_row.new_currency::text, 'dojo_default'::text;
end;
$function$;

alter function public.set_dojo_subscription_rate(uuid, numeric, date, text) owner to postgres;
alter function public.set_member_subscription_rate(uuid, numeric, date, date, text, text) owner to postgres;
alter function public.remove_member_subscription_rate(uuid) owner to postgres;
alter function public.get_membership_subscription_rate(uuid, date) owner to postgres;

revoke all on function public.set_dojo_subscription_rate(uuid, numeric, date, text) from public, anon;
revoke all on function public.set_member_subscription_rate(uuid, numeric, date, date, text, text) from public, anon;
revoke all on function public.remove_member_subscription_rate(uuid) from public, anon;
revoke all on function public.get_membership_subscription_rate(uuid, date) from public, anon, authenticated;

grant execute on function public.set_dojo_subscription_rate(uuid, numeric, date, text) to authenticated, service_role;
grant execute on function public.set_member_subscription_rate(uuid, numeric, date, date, text, text) to authenticated, service_role;
grant execute on function public.remove_member_subscription_rate(uuid) to authenticated, service_role;
grant execute on function public.get_membership_subscription_rate(uuid, date) to service_role;

do $verify$
declare
  member_definition text;
  dojo_definition text;
begin
  select pg_get_functiondef('public.set_member_subscription_rate(uuid,numeric,date,date,text,text)'::regprocedure)
  into member_definition;
  select pg_get_functiondef('public.set_dojo_subscription_rate(uuid,numeric,date,text)'::regprocedure)
  into dojo_definition;

  if position('END_DATE_VALUE + 1' in upper(member_definition)) = 0
     or position('FOR UPDATE' in upper(member_definition)) = 0 then
    raise exception 'Member rate interval preservation was not installed';
  end if;
  if position('DOJO_SUBSCRIPTION_RATE_HISTORY' in upper(dojo_definition)) = 0
     or position('FOR UPDATE' in upper(dojo_definition)) = 0 then
    raise exception 'Dojo rate history preservation was not installed';
  end if;
  if has_function_privilege('anon', 'public.set_member_subscription_rate(uuid,numeric,date,date,text,text)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.set_member_subscription_rate(uuid,numeric,date,date,text,text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.get_membership_subscription_rate(uuid,date)', 'EXECUTE') then
    raise exception 'Subscription function grants do not match the reviewed boundary';
  end if;
end
$verify$;

commit;
