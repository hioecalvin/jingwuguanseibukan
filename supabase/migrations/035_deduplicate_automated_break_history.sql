-- ============================================================
-- 035 DEDUPLICATE AUTOMATED BREAK STATUS HISTORY
-- ============================================================
--
-- The membership_status_change trigger is the canonical writer for
-- membership_status_history whenever class_memberships.status changes.
-- The two service-only monthly processors also inserted the same transition
-- explicitly, producing duplicate audit rows. Keep the trigger as the sole
-- history writer, as migration 019 already does for the interactive Break
-- review/reactivation paths. Existing history is deliberately left unchanged.
-- ============================================================

begin;

do $preflight$
begin
  if not exists (
    select 1
    from pg_catalog.pg_trigger as trigger_record
    join pg_catalog.pg_class as relation
      on relation.oid = trigger_record.tgrelid
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = 'class_memberships'
      and trigger_record.tgname = 'membership_status_change'
      and not trigger_record.tgisinternal
      and trigger_record.tgenabled <> 'D'
  ) then
    raise exception
      'Required membership_status_change trigger is missing or disabled';
  end if;

  if pg_catalog.to_regprocedure(
    'public.apply_due_membership_breaks(date)'
  ) is null then
    raise exception 'Required apply_due_membership_breaks(date) function is missing';
  end if;

  if pg_catalog.to_regprocedure(
    'public.process_monthly_membership_breaks(date)'
  ) is null then
    raise exception 'Required process_monthly_membership_breaks(date) function is missing';
  end if;
end
$preflight$;


create or replace function public.apply_due_membership_breaks(
  target_date date default current_date
)
returns jsonb
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  processing_date date;
  processing_month date;
  request_record record;
  changed_count integer := 0;
  skipped_count integer := 0;
begin
  processing_date := coalesce(target_date, current_date);
  processing_month := date_trunc('month', processing_date)::date;

  for request_record in
    select
      break_request.id as request_id,
      break_request.membership_id,
      membership.status as current_status
    from public.membership_break_requests as break_request
    join public.class_memberships as membership
      on membership.id = break_request.membership_id
    where break_request.status = 'approved'
      and break_request.activation_type = 'next_month'
      and break_request.effective_from is not null
      and break_request.effective_from <= processing_date
      and break_request.applied_at is null
    order by
      break_request.effective_from,
      break_request.requested_at
    for update of break_request, membership
  loop
    if request_record.current_status <>
       'active'::public.membership_status
    then
      update public.membership_break_requests
      set
        applied_at = now(),
        updated_at = now()
      where id = request_record.request_id;

      skipped_count := skipped_count + 1;
      continue;
    end if;

    update public.class_memberships
    set
      status = 'break_1'::public.membership_status,
      break_count = 1,
      break_last_processed_month = processing_month,
      updated_at = now()
    where id = request_record.membership_id;

    -- membership_status_change is the sole history writer.

    update public.membership_break_requests
    set
      applied_at = now(),
      updated_at = now()
    where id = request_record.request_id;

    changed_count := changed_count + 1;
  end loop;

  return jsonb_build_object(
    'processing_date', processing_date,
    'breaks_started', changed_count,
    'skipped', skipped_count
  );
end;
$function$;


create or replace function public.process_monthly_membership_breaks(
  target_month date default current_date
)
returns table(
  membership_id uuid,
  previous_status text,
  new_status text
)
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  processing_month date;
  changed_record record;
begin
  processing_month := date_trunc(
    'month',
    coalesce(target_month, current_date)
  )::date;

  -- Process Break 2 first so a Break 1 row cannot advance twice in one run.
  for changed_record in
    update public.class_memberships as membership
    set
      status = 'inactive'::public.membership_status,
      break_count = 0,
      break_last_processed_month = processing_month,
      updated_at = now()
    where membership.status = 'break_2'::public.membership_status
      and (
        membership.break_last_processed_month is null
        or membership.break_last_processed_month < processing_month
      )
    returning membership.id
  loop
    -- membership_status_change is the sole history writer.
    membership_id := changed_record.id;
    previous_status := 'break_2';
    new_status := 'inactive';
    return next;
  end loop;

  for changed_record in
    update public.class_memberships as membership
    set
      status = 'break_2'::public.membership_status,
      break_count = 2,
      break_last_processed_month = processing_month,
      updated_at = now()
    where membership.status = 'break_1'::public.membership_status
      and (
        membership.break_last_processed_month is null
        or membership.break_last_processed_month < processing_month
      )
    returning membership.id
  loop
    -- membership_status_change is the sole history writer.
    membership_id := changed_record.id;
    previous_status := 'break_1';
    new_status := 'break_2';
    return next;
  end loop;

  return;
end;
$function$;


-- Both routines are scheduler/internal operations, never browser RPCs.
revoke execute on function public.apply_due_membership_breaks(date)
  from public, anon, authenticated;
revoke execute on function public.process_monthly_membership_breaks(date)
  from public, anon, authenticated;

grant execute on function public.apply_due_membership_breaks(date)
  to service_role;
grant execute on function public.process_monthly_membership_breaks(date)
  to service_role;

commit;
