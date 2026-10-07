-- Independent read-only residue, ledger and ACL postflight after the deliberate
-- rollback signal from 048_052_staging_acceptance.sql.
do $postflight$
declare
  versions text[];
  signature text;
  internal_signature text;
  private_relation text;
  privilege_name text;
begin
  select array_agg(version order by version)
  into versions
  from supabase_migrations.schema_migrations;

  if versions is distinct from array(
    select lpad(value::text, 3, '0')
    from generate_series(6, 52) as value
  ) then
    raise exception 'Migration ledger is not exactly 006 through 052';
  end if;

  if exists (
    select 1
    from (
      values
        ('048', 'regular_class_schedules'),
        ('049', 'member_contact_self_service'),
        ('050', 'member_directory_privacy'),
        ('051', 'finance_late_payment_presentation'),
        ('052', 'repository_uploader_permissions')
    ) as expected(version, name)
    left join supabase_migrations.schema_migrations as applied
      on applied.version = expected.version
    where applied.name is distinct from expected.name
  ) then
    raise exception 'A migration ledger name from 048 through 052 is incorrect';
  end if;

  if exists (
    select 1 from public.regular_class_schedules
    where venue like '__JWG_STAGING_ACCEPTANCE_048%'
  ) or exists (
    select 1 from public.regular_class_schedule_audit
    where new_values::text like '%__JWG_STAGING_ACCEPTANCE_048%'
  ) or exists (
    select 1 from public.profiles
    where instagram_username like 'jwg_a_%'
       or phone like '+999000%'
  ) or exists (
    select 1 from public.profile_contact_change_audit
    where new_value like 'jwg_a_%'
       or new_value like '+999000%'
  ) or exists (
    select 1 from public.repository_uploader_assignments
    where assigned_at = timestamptz '1900-01-02 03:04:05+00'
  ) or exists (
    select 1 from public.content
    where title like '__JWG_%ACCEPTANCE%'
       or title in ('__JWG_CROSS_CLASS_DENIAL__', '__JWG_ADMIN_DENIAL__', '__JWG_REVOKED_DENIAL__')
  ) then
    raise exception 'Rollback-contained acceptance left marker residue';
  end if;

  if not exists (
    select 1 from pg_catalog.pg_class
    where oid = 'public.regular_class_schedules'::regclass
      and relrowsecurity and relforcerowsecurity
  ) or not exists (
    select 1 from pg_catalog.pg_class
    where oid = 'public.regular_class_schedule_audit'::regclass
      and relrowsecurity and relforcerowsecurity
  ) or not exists (
    select 1 from pg_catalog.pg_class
    where oid = 'public.profile_contact_change_audit'::regclass
      and relrowsecurity and relforcerowsecurity
  ) or not exists (
    select 1 from pg_catalog.pg_class
    where oid = 'public.repository_uploader_assignments'::regclass
      and relrowsecurity and relforcerowsecurity
  ) or not exists (
    select 1 from pg_catalog.pg_class
    where oid = 'public.repository_uploader_assignment_audit'::regclass
      and relrowsecurity and relforcerowsecurity
  ) then
    raise exception 'A new private relation is missing forced RLS';
  end if;

  foreach signature in array array[
    'public.get_regular_class_schedules(boolean)',
    'public.get_manageable_schedule_scopes()',
    'public.get_schedule_instructor_options(uuid)',
    'public.upsert_regular_class_schedule(uuid,smallint,time without time zone,time without time zone,uuid,text,text,boolean,uuid)',
    'public.update_my_contact_details(text,text)',
    'public.get_my_member_directory()',
    'public.get_settlement_eligible_payment_details(uuid,date)',
    'public.get_dojo_settlement_item_details(uuid)',
    'public.get_my_repository_upload_scopes()',
    'public.get_repository_uploader_candidates()',
    'public.get_repository_uploader_options(uuid)',
    'public.assign_repository_uploader(uuid,uuid)',
    'public.revoke_repository_uploader(uuid,uuid)',
    'public.is_repository_uploader(uuid,uuid)',
    'public.create_repository_content(uuid,uuid,uuid,text,text,text,text,text,integer)',
    'public.update_repository_content(uuid,text,text,text,text,text,integer)',
    'public.delete_repository_content(uuid)'
  ] loop
    if has_function_privilege('anon', signature, 'EXECUTE')
       or not has_function_privilege('authenticated', signature, 'EXECUTE') then
      raise exception 'Unsafe browser RPC ACL: %', signature;
    end if;
  end loop;

  foreach internal_signature in array array[
    'public.sync_profile_email_from_auth()',
    'public.audit_repository_uploader_assignment()'
  ] loop
    if has_function_privilege('anon', internal_signature, 'EXECUTE')
       or has_function_privilege('authenticated', internal_signature, 'EXECUTE') then
      raise exception 'Internal routine is browser-executable: %', internal_signature;
    end if;
  end loop;

  foreach private_relation in array array[
    'public.regular_class_schedules',
    'public.regular_class_schedule_audit',
    'public.profile_contact_change_audit',
    'public.repository_uploader_assignments',
    'public.repository_uploader_assignment_audit'
  ] loop
    foreach privilege_name in array array['SELECT', 'INSERT', 'UPDATE', 'DELETE'] loop
      if has_table_privilege('anon', private_relation, privilege_name)
         or has_table_privilege('authenticated', private_relation, privilege_name) then
        raise exception 'Private relation has unsafe browser privilege: % %',
          private_relation, privilege_name;
      end if;
    end loop;
  end loop;

  foreach privilege_name in array array['INSERT', 'UPDATE', 'DELETE'] loop
    if has_table_privilege('anon', 'public.content', privilege_name)
       or has_table_privilege('authenticated', 'public.content', privilege_name) then
      raise exception 'Repository content has unsafe browser write privilege: %', privilege_name;
    end if;
  end loop;

  if not exists (
    select 1
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'content'
      and policyname = 'repository uploaders read all class content'
      and cmd = 'SELECT'
      and qual ilike '%is_repository_uploader%'
  ) or exists (
    select 1
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'content'
      and policyname = 'repository managers read all content'
  ) then
    raise exception 'Repository Uploader content policy state is unsafe';
  end if;

  raise notice 'POSTFLIGHT PASS: exact 006-052 versions, 048-052 names, zero marker residue, forced RLS and browser ACLs';
end
$postflight$;
