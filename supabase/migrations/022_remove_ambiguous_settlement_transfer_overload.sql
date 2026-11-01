begin;

do $preflight$
declare
  legacy_defaults integer;
begin
  if to_regprocedure('public.set_dojo_settlement_transfer(uuid,date,text,text)') is null then
    raise exception 'Required four-argument settlement transfer function is missing';
  end if;

  select procedure_data.pronargdefaults
  into legacy_defaults
  from pg_proc as procedure_data
  join pg_namespace as namespace
    on namespace.oid = procedure_data.pronamespace
  where namespace.nspname = 'public'
    and procedure_data.oid = to_regprocedure(
      'public.set_dojo_settlement_transfer(uuid,date,text,text,text)'
    );

  if legacy_defaults is distinct from 2 then
    raise exception
      'Unexpected five-argument settlement transfer overload defaults: %',
      legacy_defaults;
  end if;
end
$preflight$;

-- The legacy five-argument overload gives both trailing arguments defaults.
-- That makes the four-field browser RPC request match both overloads. Keep the
-- application-used four-argument contract and remove only the ambiguous legacy
-- signature.
drop function public.set_dojo_settlement_transfer(uuid, date, text, text, text);

alter function public.set_dojo_settlement_transfer(uuid, date, text, text)
  owner to postgres;
alter function public.set_dojo_settlement_transfer(uuid, date, text, text)
  set search_path to public, pg_temp;

revoke all privileges
  on function public.set_dojo_settlement_transfer(uuid, date, text, text)
  from public, anon, authenticated, service_role;
grant execute
  on function public.set_dojo_settlement_transfer(uuid, date, text, text)
  to authenticated, service_role;

do $postflight$
begin
  if to_regprocedure('public.set_dojo_settlement_transfer(uuid,date,text,text)') is null then
    raise exception 'Four-argument settlement transfer function was not preserved';
  end if;

  if to_regprocedure('public.set_dojo_settlement_transfer(uuid,date,text,text,text)') is not null then
    raise exception 'Ambiguous five-argument settlement transfer overload remains';
  end if;
end
$postflight$;

commit;
