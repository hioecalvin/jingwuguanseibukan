-- ============================================================
-- 020 ENFORCE ADMIN TRANSFER BATCH ATOMICITY
-- ============================================================
--
-- Hosted staging acceptance proved that request_admin_dojo_transfer_batch
-- silently ignored missing or duplicate membership IDs and committed the
-- remaining subset. Route the UI-facing compatibility RPC through the newer
-- reviewed bulk implementation, which verifies that every supplied array
-- element resolves exactly once before inserting any request rows. That
-- implementation also emits one destination-dojo notification per batch.
-- ============================================================

begin;

do $preflight$
declare
  source_security_definer boolean;
begin
  select procedure_data.prosecdef
  into source_security_definer
  from pg_catalog.pg_proc as procedure_data
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = procedure_data.pronamespace
  where namespace.nspname = 'public'
    and procedure_data.proname = 'request_bulk_dojo_transfer'
    and pg_catalog.pg_get_function_identity_arguments(procedure_data.oid) =
      'target_membership_ids uuid[], destination_dojo_id uuid, transfer_effective_date date, transfer_reason text';

  if source_security_definer is distinct from true then
    raise exception
      'Required SECURITY DEFINER request_bulk_dojo_transfer function is missing';
  end if;

  if pg_catalog.to_regprocedure(
    'public.notify_dojo_admins(uuid,text,text,jsonb)'
  ) is null then
    raise exception 'Required notify_dojo_admins function is missing';
  end if;
end
$preflight$;


create or replace function public.request_admin_dojo_transfer_batch(
  target_membership_ids uuid[],
  destination_dojo_id uuid,
  transfer_effective_date date default current_date,
  transfer_reason text default null::text
)
returns uuid
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
begin
  return public.request_bulk_dojo_transfer(
    target_membership_ids,
    destination_dojo_id,
    coalesce(transfer_effective_date, current_date),
    transfer_reason
  );
end;
$function$;


comment on function public.request_admin_dojo_transfer_batch(
  uuid[], uuid, date, text
) is
  'Compatibility RPC for atomic Admin dojo-transfer batches; validates every supplied membership and emits one receiving-dojo notification.';


-- CREATE OR REPLACE retains the existing owner and ACLs, but restate the
-- reviewed browser contract explicitly so this repair cannot reintroduce the
-- default PUBLIC/anonymous EXECUTE exposure.
revoke execute on function public.request_admin_dojo_transfer_batch(
  uuid[], uuid, date, text
) from public, anon;

grant execute on function public.request_admin_dojo_transfer_batch(
  uuid[], uuid, date, text
) to authenticated, service_role;

commit;
