-- ============================================================
-- 036 RESTORE AUTH REGISTRATION TRIGGERS
-- ============================================================
--
-- Staging retained the hardened trigger functions but had no non-internal
-- triggers on auth.users. Restore exactly one signup-profile trigger and one
-- email-confirmation trigger without duplicating an equivalent trigger that a
-- recovered environment may already contain under a different name.
-- ============================================================

begin;

do $preflight$
begin
  if pg_catalog.to_regclass('auth.users') is null
     or pg_catalog.to_regclass('public.profiles') is null
     or pg_catalog.to_regclass('public.class_requests') is null
     or pg_catalog.to_regprocedure('public.handle_new_user()') is null
     or pg_catalog.to_regprocedure('public.handle_email_verified()') is null
  then
    raise exception 'Required Auth registration objects are missing';
  end if;

  if (
    select count(*)
    from pg_catalog.pg_trigger as trigger_record
    where trigger_record.tgrelid = 'auth.users'::regclass
      and not trigger_record.tgisinternal
      and trigger_record.tgfoid = 'public.handle_new_user()'::regprocedure
  ) > 1 then
    raise exception 'Multiple signup profile triggers already exist';
  end if;

  if (
    select count(*)
    from pg_catalog.pg_trigger as trigger_record
    where trigger_record.tgrelid = 'auth.users'::regclass
      and not trigger_record.tgisinternal
      and trigger_record.tgfoid = 'public.handle_email_verified()'::regprocedure
  ) > 1 then
    raise exception 'Multiple email verification triggers already exist';
  end if;
end
$preflight$;


do $restore$
begin
  if not exists (
    select 1
    from pg_catalog.pg_trigger as trigger_record
    where trigger_record.tgrelid = 'auth.users'::regclass
      and not trigger_record.tgisinternal
      and trigger_record.tgfoid = 'public.handle_new_user()'::regprocedure
  ) then
    create trigger jwg_profile_on_auth_user_created
      after insert on auth.users
      for each row
      execute function public.handle_new_user();
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_trigger as trigger_record
    where trigger_record.tgrelid = 'auth.users'::regclass
      and not trigger_record.tgisinternal
      and trigger_record.tgfoid = 'public.handle_email_verified()'::regprocedure
  ) then
    create trigger jwg_class_request_on_email_verified
      after update of email_confirmed_at on auth.users
      for each row
      execute function public.handle_email_verified();
  end if;
end
$restore$;


-- Trigger helpers are never direct browser RPCs.
revoke execute on function public.handle_new_user()
  from public, anon, authenticated;
revoke execute on function public.handle_email_verified()
  from public, anon, authenticated;

grant execute on function public.handle_new_user()
  to service_role;
grant execute on function public.handle_email_verified()
  to service_role;


do $postflight$
begin
  if (
    select count(*)
    from pg_catalog.pg_trigger as trigger_record
    where trigger_record.tgrelid = 'auth.users'::regclass
      and not trigger_record.tgisinternal
      and trigger_record.tgenabled <> 'D'
      and trigger_record.tgfoid = 'public.handle_new_user()'::regprocedure
  ) <> 1 then
    raise exception 'Exactly one enabled signup profile trigger is required';
  end if;

  if (
    select count(*)
    from pg_catalog.pg_trigger as trigger_record
    where trigger_record.tgrelid = 'auth.users'::regclass
      and not trigger_record.tgisinternal
      and trigger_record.tgenabled <> 'D'
      and trigger_record.tgfoid = 'public.handle_email_verified()'::regprocedure
  ) <> 1 then
    raise exception 'Exactly one enabled email verification trigger is required';
  end if;
end
$postflight$;

commit;
