-- Read-only post-migration assertions. Run through psql with ON_ERROR_STOP=1
-- against the explicitly selected staging connection after migrations 040-045.
-- This is not a substitute for role-based API and authenticated workflow tests.
begin transaction read only;

do $verify$
declare
  target_name text;
  target_role text;
  target_signature text;
begin
  if exists (
    select 1 from unnest(array['011','012','013','014','015','016','017','018','040','041','042','043','044','045']) as expected(version)
    where not exists (
      select 1 from supabase_migrations.schema_migrations as applied
      where applied.version = expected.version
    )
  ) then raise exception 'Required security foundation and migrations 040-045 are not all recorded'; end if;

  if exists (
    select 1 from pg_proc as routine
    join pg_namespace as namespace on namespace.oid = routine.pronamespace
    where namespace.nspname = 'public' and routine.prosecdef
      and (
        not coalesce(routine.proconfig @> array['search_path=public, pg_temp'], false)
        or has_function_privilege('anon', routine.oid, 'EXECUTE')
      )
  ) then raise exception 'A public definer has an unsafe search path or anonymous/PUBLIC execution'; end if;

  if exists (
    select 1 from pg_proc as routine
    join pg_namespace as namespace on namespace.oid = routine.pronamespace
    where namespace.nspname = 'public' and routine.prosecdef
      and routine.prorettype = 'trigger'::regtype
      and has_function_privilege('authenticated', routine.oid, 'EXECUTE')
  ) then raise exception 'A definer trigger is executable by authenticated'; end if;

  foreach target_signature in array array[
    'public.apply_due_admin_dojo_transfers()',
    'public.apply_due_membership_breaks(date)',
    'public.create_notification(uuid,text,text,text,text,uuid,jsonb)',
    'public.claim_next_email()',
    'public.get_membership_grade_history(uuid)',
    'public.get_membership_subscription_rate(uuid,date)',
    'public.is_active_super_admin(uuid)',
    'public.mark_email_failed(uuid,text)',
    'public.mark_email_sent(uuid,text)',
    'public.mark_password_changed(uuid)',
    'public.mark_password_reset_applied(uuid)',
    'public.notify_dojo_admins(uuid,text,text,jsonb)',
    'public.process_memorial_anniversaries(date)',
    'public.process_monthly_membership_breaks(date)',
    'public.publish_memorial_announcement(uuid,text,date,text,text,uuid)',
    'public.queue_email(text,text,text,jsonb,uuid,text,uuid,text)',
    'public.verify_prepared_assessment_certificate(uuid)'
  ] loop
    if to_regprocedure(target_signature) is null then
      raise exception 'Missing internal routine: %', target_signature;
    end if;
    if has_function_privilege('authenticated', target_signature, 'EXECUTE') then
      raise exception 'Internal routine is browser-executable: %', target_signature;
    end if;
  end loop;

  foreach target_role in array array['anon','authenticated'] loop
    if has_schema_privilege(target_role, 'public', 'CREATE') then
      raise exception 'Untrusted role can create objects in public';
    end if;
    foreach target_name in array array[
      'document_archive',
      'certificate_archive',
      'dojo_receiving_accounts',
      'membership_payment_confirmations',
      'email_outbox',
      'member_memorial_settings',
      'member_memorial_recipient_classes',
      'member_memorial_audit',
      'member_memorial_publications',
      'assessment_batches',
      'assessment_results',
      'prepared_assessments',
      'prepared_assessment_candidates',
      'prepared_assessment_certificates',
      'membership_training_session_audit'
    ] loop
      if has_table_privilege(target_role, 'public.' || target_name, 'SELECT')
         or has_table_privilege(target_role, 'public.' || target_name, 'INSERT')
         or has_table_privilege(target_role, 'public.' || target_name, 'UPDATE')
         or has_table_privilege(target_role, 'public.' || target_name, 'DELETE') then
        raise exception 'Sensitive relation retains a browser privilege: %', target_name;
      end if;
    end loop;
  end loop;

  if exists (
    select 1
    from pg_class as relation
    join pg_namespace as namespace on namespace.oid = relation.relnamespace
    cross join lateral aclexplode(coalesce(
      relation.relacl,
      acldefault('r', relation.relowner)
    )) as privilege
    left join pg_roles as grantee on grantee.oid = privilege.grantee
    where namespace.nspname = 'public'
      and relation.relkind in ('r','p','v','m','f')
      and (privilege.grantee = 0 or grantee.rolname in ('anon','authenticated'))
      and privilege.privilege_type in ('TRUNCATE','REFERENCES','TRIGGER','MAINTAIN')
  ) then raise exception 'Browser role retains a non-RLS relation privilege'; end if;

  if exists (
    select 1
    from pg_class as sequence_data
    join pg_namespace as namespace on namespace.oid = sequence_data.relnamespace
    cross join lateral aclexplode(coalesce(
      sequence_data.relacl,
      acldefault('S', sequence_data.relowner)
    )) as privilege
    left join pg_roles as grantee on grantee.oid = privilege.grantee
    where namespace.nspname = 'public'
      and sequence_data.relkind = 'S'
      and (privilege.grantee = 0 or grantee.rolname in ('anon','authenticated'))
  ) then raise exception 'Browser role retains direct public-sequence privileges'; end if;

  foreach target_name in array array['admin_visible_members','admin_visible_requests'] loop
    if not exists (
      select 1 from pg_class where oid = to_regclass('public.' || target_name)
        and reloptions @> array['security_invoker=true']
    ) then raise exception 'View is not security_invoker: %', target_name; end if;
  end loop;

  if (select count(*) from pg_constraint
      where conrelid = 'public.profiles'::regclass and convalidated
        and conname in ('profiles_registration_number_not_blank','profiles_email_not_blank')) <> 2 then
    raise exception 'Profile identity constraints are not both validated';
  end if;

  foreach target_name in array array['notify_monthly_subscription_charges','notify_unpaid_subscription_reminders','generate_and_notify_monthly_subscriptions'] loop
    target_signature := 'public.' || target_name || '(uuid,date)';
    if to_regprocedure(target_signature) is null then
      raise exception 'Missing subscription RPC: %', target_name;
    end if;
    if not has_function_privilege('authenticated', target_signature, 'EXECUTE') then
      raise exception 'Subscription RPC lacks authenticated grant: %', target_name;
    end if;
  end loop;

  foreach target_signature in array array[
    'public.get_bulk_assessment_candidates(uuid,uuid)',
    'public.prepare_bulk_assessment(uuid,uuid,date,uuid,text,uuid,jsonb)',
    'public.get_prepared_bulk_assessments()',
    'public.get_prepared_bulk_assessment(uuid)',
    'public.record_prepared_assessment_certificate_print(uuid)',
    'public.finalize_prepared_bulk_assessment(uuid,uuid,jsonb)'
  ] loop
    if to_regprocedure(target_signature) is null then
      raise exception 'Missing bulk-assessment RPC: %', target_signature;
    end if;
    if has_function_privilege('anon', target_signature, 'EXECUTE')
       or not has_function_privilege('authenticated', target_signature, 'EXECUTE') then
      raise exception 'Bulk-assessment RPC ACL is unsafe: %', target_signature;
    end if;
  end loop;

  foreach target_signature in array array[
    'public.get_my_last_training_sessions()',
    'public.mark_membership_trained_today(uuid)',
    'public.set_membership_last_training_session(uuid,date)'
  ] loop
    if to_regprocedure(target_signature) is null then
      raise exception 'Missing last-training RPC: %', target_signature;
    end if;
    if has_function_privilege('anon', target_signature, 'EXECUTE')
       or not has_function_privilege('authenticated', target_signature, 'EXECUTE') then
      raise exception 'Last-training RPC ACL is unsafe: %', target_signature;
    end if;
  end loop;

  if has_function_privilege(
    'authenticated',
    'public.submit_bulk_assessment(uuid,uuid,date,uuid,text,uuid,jsonb)',
    'EXECUTE'
  ) then
    raise exception 'Direct bulk submission bypasses the prepared roster';
  end if;

  -- Per-schema ACLs ADD to the global ACL (or the built-in global default).
  -- Platform-owned defaults are intentionally a release gate, not silently
  -- ignored because postgres cannot alter the other owner's privileges.
  if exists (
    select 1 from pg_roles as owner_role
    cross join lateral aclexplode(coalesce(
      (select defaclacl from pg_default_acl where defaclrole = owner_role.oid
        and defaclnamespace = 0 and defaclobjtype = 'f'),
      acldefault('f', owner_role.oid)
    )) as privilege
    where owner_role.rolname in ('postgres','supabase_admin')
      and privilege.privilege_type = 'EXECUTE'
      and (privilege.grantee = 0 or privilege.grantee in (
        select oid from pg_roles where rolname in ('anon','authenticated')
      ))
  ) or exists (
    select 1 from pg_default_acl as defaults
    join pg_roles as owner_role on owner_role.oid = defaults.defaclrole
    join pg_namespace as namespace on namespace.oid = defaults.defaclnamespace
    cross join lateral aclexplode(defaults.defaclacl) as privilege
    where namespace.nspname = 'public'
      and owner_role.rolname in ('postgres','supabase_admin')
      and defaults.defaclobjtype in ('r','S','f')
      and (privilege.grantee = 0 or privilege.grantee in (
        select oid from pg_roles where rolname in ('anon','authenticated')
      ))
  ) then raise exception 'Unsafe postgres/supabase_admin global or public-schema defaults remain'; end if;
end
$verify$;

rollback;
