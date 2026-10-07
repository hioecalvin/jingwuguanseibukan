-- Independent read-only ledger, zero-residue and security postflight for 054.
do $postflight$
declare
  versions text[];
  payment_definition text;
  confirmation_definition text;
begin
  select array_agg(version order by version)
  into versions
  from supabase_migrations.schema_migrations;

  if versions is distinct from array(
    select lpad(value::text, 3, '0')
    from generate_series(6, 54) as value
  ) then
    raise exception 'Migration ledger is not exactly 006 through 054';
  end if;

  if not exists (
    select 1
    from supabase_migrations.schema_migrations
    where version = '054'
      and name = 'full_payment_only'
  ) then
    raise exception 'Migration 054 ledger name is incorrect';
  end if;

  if exists (
    select 1 from public.membership_subscription_charges
    where generated_at = timestamptz '1900-01-04 05:06:07+00'
  ) or exists (
    select 1 from public.membership_payments
    where notes like '__JWG_054_%'
  ) or exists (
    select 1 from public.membership_payment_confirmations
    where member_note like '__JWG_054_%'
  ) then
    raise exception 'Migration 054 acceptance left marker residue';
  end if;

  if not exists (
    select 1 from pg_catalog.pg_trigger
    where tgrelid = 'public.membership_payments'::regclass
      and tgname = 'membership_payments_require_full_balance'
      and tgenabled = 'O'
      and not tgisinternal
  ) or not exists (
    select 1 from pg_catalog.pg_trigger
    where tgrelid = 'public.membership_payment_confirmations'::regclass
      and tgname = 'membership_payment_confirmations_require_full_balance'
      and tgenabled = 'O'
      and not tgisinternal
  ) then
    raise exception 'A migration 054 full-payment trigger is missing or disabled';
  end if;

  payment_definition := pg_catalog.pg_get_functiondef(
    'public.enforce_full_membership_payment()'::pg_catalog.regprocedure
  );
  confirmation_definition := pg_catalog.pg_get_functiondef(
    'public.enforce_full_payment_confirmation()'::pg_catalog.regprocedure
  );

  if payment_definition not ilike '%for update%'
     or payment_definition not ilike '%new.amount <> remaining_balance%'
     or confirmation_definition not ilike '%for update%'
     or confirmation_definition not ilike '%new.amount <> remaining_balance%'
  then
    raise exception 'Migration 054 serialized full-balance contract is absent';
  end if;

  if has_function_privilege(
       'anon', 'public.enforce_full_membership_payment()', 'EXECUTE'
     ) or has_function_privilege(
       'authenticated', 'public.enforce_full_membership_payment()', 'EXECUTE'
     ) or has_function_privilege(
       'anon', 'public.enforce_full_payment_confirmation()', 'EXECUTE'
     ) or has_function_privilege(
       'authenticated', 'public.enforce_full_payment_confirmation()', 'EXECUTE'
     )
  then
    raise exception 'Migration 054 private trigger-helper ACL is unsafe';
  end if;

  if not exists (
    select 1 from pg_catalog.pg_proc as routine
    join pg_catalog.pg_namespace as namespace on namespace.oid = routine.pronamespace
    where namespace.nspname = 'public'
      and routine.proname = 'enforce_full_membership_payment'
      and routine.proconfig @> array['search_path=public, pg_temp']
  ) or not exists (
    select 1 from pg_catalog.pg_proc as routine
    join pg_catalog.pg_namespace as namespace on namespace.oid = routine.pronamespace
    where namespace.nspname = 'public'
      and routine.proname = 'enforce_full_payment_confirmation'
      and routine.proconfig @> array['search_path=public, pg_temp']
  ) then
    raise exception 'Migration 054 trigger helper search_path is unsafe';
  end if;

  raise notice 'POSTFLIGHT PASS: exact 006-054 ledger, zero residue and migration 054 security contract';
end
$postflight$;
