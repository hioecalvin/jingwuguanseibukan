-- ============================================================
-- 043 REPAIR MEMORIAL AND PREPARED-ASSESSMENT RUNTIME LOOKUPS
-- ============================================================
-- Staging semantic acceptance exposed two catalog compatibility errors:
--   1. PostgreSQL has no min(uuid) aggregate.
--   2. Member IDs are stored in profiles.registration_number, not
--      profiles.member_id.
--
-- Patch only the two previously deployed SECURITY DEFINER bodies. Exact-text
-- guards make this migration fail closed if an unexpected definition is live.
-- ============================================================

begin;

do $preflight$
begin
  if to_regprocedure(
       'public.publish_memorial_announcement(uuid,text,date,text,text,uuid)'
     ) is null
     or to_regprocedure(
       'public.prepare_bulk_assessment(uuid,uuid,date,uuid,text,uuid,jsonb)'
     ) is null then
    raise exception 'Required migration 040/042 functions are unavailable';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'registration_number'
  ) then
    raise exception 'profiles.registration_number is unavailable';
  end if;
end
$preflight$;

do $repair$
declare
  function_definition text;
  repaired_definition text;
begin
  select pg_get_functiondef(
    'public.publish_memorial_announcement(uuid,text,date,text,text,uuid)'::regprocedure
  ) into function_definition;
  if function_definition not like '%min(class_id)%' then
    raise exception 'Unexpected publish_memorial_announcement definition';
  end if;
  repaired_definition := replace(
    function_definition,
    'min(class_id)',
    'min(class_id::text)::uuid'
  );
  if repaired_definition = function_definition
     or repaired_definition like '%min(class_id)%' then
    raise exception 'Memorial UUID aggregate repair did not apply exactly';
  end if;
  execute repaired_definition;

  select pg_get_functiondef(
    'public.prepare_bulk_assessment(uuid,uuid,date,uuid,text,uuid,jsonb)'::regprocedure
  ) into function_definition;
  if function_definition not like '%profile.member_id::text as member_id%' then
    raise exception 'Unexpected prepare_bulk_assessment member-ID lookup';
  end if;
  repaired_definition := replace(
    function_definition,
    'profile.member_id::text as member_id',
    'profile.registration_number::text as member_id'
  );
  if repaired_definition = function_definition
     or repaired_definition like '%profile.member_id::text as member_id%' then
    raise exception 'Prepared-assessment member-ID repair did not apply exactly';
  end if;
  execute repaired_definition;
end
$repair$;

alter function public.publish_memorial_announcement(uuid,text,date,text,text,uuid)
  owner to postgres;
alter function public.prepare_bulk_assessment(uuid,uuid,date,uuid,text,uuid,jsonb)
  owner to postgres;

revoke all on function public.publish_memorial_announcement(uuid,text,date,text,text,uuid)
from public, anon, authenticated;
grant execute on function public.publish_memorial_announcement(uuid,text,date,text,text,uuid)
to service_role;

revoke all on function public.prepare_bulk_assessment(uuid,uuid,date,uuid,text,uuid,jsonb)
from public, anon;
grant execute on function public.prepare_bulk_assessment(uuid,uuid,date,uuid,text,uuid,jsonb)
to authenticated, service_role;

do $postflight$
declare
  memorial_definition text := pg_get_functiondef(
    'public.publish_memorial_announcement(uuid,text,date,text,text,uuid)'::regprocedure
  );
  preparation_definition text := pg_get_functiondef(
    'public.prepare_bulk_assessment(uuid,uuid,date,uuid,text,uuid,jsonb)'::regprocedure
  );
begin
  if memorial_definition not like '%min(class_id::text)::uuid%'
     or memorial_definition like '%min(class_id)%' then
    raise exception 'Memorial UUID aggregate postflight failed';
  end if;
  if preparation_definition not like '%profile.registration_number::text as member_id%'
     or preparation_definition like '%profile.member_id::text as member_id%' then
    raise exception 'Prepared-assessment member-ID postflight failed';
  end if;

  if has_function_privilege(
       'authenticated',
       'public.publish_memorial_announcement(uuid,text,date,text,text,uuid)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'service_role',
       'public.publish_memorial_announcement(uuid,text,date,text,text,uuid)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'authenticated',
       'public.prepare_bulk_assessment(uuid,uuid,date,uuid,text,uuid,jsonb)',
       'EXECUTE'
     ) then
    raise exception 'Repaired function ACL postflight failed';
  end if;
end
$postflight$;

commit;
