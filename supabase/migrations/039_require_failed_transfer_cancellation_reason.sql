begin;

do $guard$
declare
  single_definition text;
  batch_definition text;
begin
  select pg_get_functiondef(
    'public.cancel_failed_admin_dojo_transfer(uuid,text)'::regprocedure
  ) into strict single_definition;
  select pg_get_functiondef(
    'public.cancel_failed_admin_dojo_transfer_batch(uuid,text)'::regprocedure
  ) into strict batch_definition;

  if single_definition not ilike '%nullif(%trim(%cancellation_reason%'
     or batch_definition not ilike '%nullif(%trim(%cancellation_reason%' then
    raise exception 'Migration 039 drift guard failed';
  end if;
end
$guard$;

create or replace function public.cancel_failed_admin_dojo_transfer(
  target_request_id uuid,
  cancellation_reason text default null
)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  normalized_reason text := nullif(trim(cancellation_reason), '');
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if not public.is_super_admin() then
    raise exception 'Only Super Admin can cancel failed transfers';
  end if;
  if normalized_reason is null then
    raise exception 'Cancellation reason is required';
  end if;

  update public.admin_dojo_transfer_requests
  set status = 'cancelled',
      cancelled_by = auth.uid(),
      cancelled_at = now(),
      rejection_reason = normalized_reason,
      apply_error = null,
      apply_failed_at = null
  where id = target_request_id
    and status = 'approved'
    and applied_at is null
    and apply_error is not null;

  if not found then
    raise exception 'Failed transfer not found';
  end if;
end;
$function$;

create or replace function public.cancel_failed_admin_dojo_transfer_batch(
  target_batch_id uuid,
  cancellation_reason text default null
)
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  cancelled_count integer;
  normalized_reason text := nullif(trim(cancellation_reason), '');
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if not public.is_super_admin() then
    raise exception 'Only Super Admin can cancel failed transfer batches';
  end if;
  if normalized_reason is null then
    raise exception 'Cancellation reason is required';
  end if;

  update public.admin_dojo_transfer_requests
  set status = 'cancelled',
      cancelled_by = auth.uid(),
      cancelled_at = now(),
      rejection_reason = normalized_reason,
      apply_error = null,
      apply_failed_at = null
  where batch_id = target_batch_id
    and status = 'approved'
    and applied_at is null
    and apply_error is not null;

  get diagnostics cancelled_count = row_count;
  if cancelled_count = 0 then
    raise exception 'No failed transfers found';
  end if;
  return cancelled_count;
end;
$function$;

revoke all on function public.cancel_failed_admin_dojo_transfer(uuid, text)
  from public, anon;
revoke all on function public.cancel_failed_admin_dojo_transfer_batch(uuid, text)
  from public, anon;
grant execute on function public.cancel_failed_admin_dojo_transfer(uuid, text)
  to authenticated, service_role;
grant execute on function public.cancel_failed_admin_dojo_transfer_batch(uuid, text)
  to authenticated, service_role;

do $postflight$
begin
  if pg_get_functiondef(
       'public.cancel_failed_admin_dojo_transfer(uuid,text)'::regprocedure
     ) not ilike '%Cancellation reason is required%'
     or pg_get_functiondef(
       'public.cancel_failed_admin_dojo_transfer_batch(uuid,text)'::regprocedure
     ) not ilike '%Cancellation reason is required%' then
    raise exception 'Migration 039 postflight failed';
  end if;
end
$postflight$;

commit;
