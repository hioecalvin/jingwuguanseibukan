-- Guarded staging-only semantic acceptance for migration 053.
--
-- The exact final exception is the success signal. It rolls back every
-- temporary assignment and audit write atomically.
do $acceptance$
declare
  super_id uuid;
  admin_id uuid;
  member_id uuid;
  target_class_id uuid;
  audit_before bigint;
  audit_after_repeat bigint;
  assignment_before record;
  assignment_after record;
begin
  select id into super_id
  from public.profiles
  where registration_number = '0001';

  select id into admin_id
  from public.profiles
  where registration_number = '0002';

  select id into member_id
  from public.profiles
  where registration_number = '0101'
    and account_status::text = 'active'
    and date_of_passing is null;

  select id into target_class_id
  from public.classes
  where is_active = true
  order by name, id
  limit 1;

  if super_id is null or admin_id is null or member_id is null
     or target_class_id is null then
    raise exception 'Required staging identities or active class are missing';
  end if;

  perform set_config('request.jwt.claim.role', 'authenticated', false);

  perform set_config('request.jwt.claim.sub', admin_id::text, false);
  begin
    perform public.assign_repository_uploader(member_id, target_class_id);
    raise exception 'Scoped Admin unexpectedly appointed a Repository Uploader';
  exception when insufficient_privilege then
    null;
  end;

  perform set_config('request.jwt.claim.sub', super_id::text, false);
  perform public.assign_repository_uploader(member_id, target_class_id);

  -- Use a deterministic provenance marker so migration 052's old overwrite
  -- behavior would be observable even though now() is transaction-stable.
  update public.repository_uploader_assignments
  set assigned_at = timestamptz '1900-01-03 04:05:06+00'
  where user_id = member_id
    and class_id = target_class_id
    and active = true;

  select assigned_by, assigned_at, revoked_by, revoked_at
  into assignment_before
  from public.repository_uploader_assignments
  where user_id = member_id
    and class_id = target_class_id;

  select count(*) into audit_before
  from public.repository_uploader_assignment_audit;

  perform public.assign_repository_uploader(member_id, target_class_id);

  select assigned_by, assigned_at, revoked_by, revoked_at
  into assignment_after
  from public.repository_uploader_assignments
  where user_id = member_id
    and class_id = target_class_id;

  select count(*) into audit_after_repeat
  from public.repository_uploader_assignment_audit;

  if assignment_after.assigned_by is distinct from assignment_before.assigned_by
     or assignment_after.assigned_at is distinct from assignment_before.assigned_at
     or assignment_after.revoked_by is distinct from assignment_before.revoked_by
     or assignment_after.revoked_at is distinct from assignment_before.revoked_at
     or audit_after_repeat <> audit_before then
    raise exception 'Active Repository Uploader retry changed provenance or audit';
  end if;

  perform public.revoke_repository_uploader(member_id, target_class_id);
  perform public.assign_repository_uploader(member_id, target_class_id);

  if not exists (
    select 1
    from public.repository_uploader_assignments
    where user_id = member_id
      and class_id = target_class_id
      and active = true
      and assigned_by = super_id
      and assigned_at <> timestamptz '1900-01-03 04:05:06+00'
      and revoked_by is null
      and revoked_at is null
  ) then
    raise exception 'Inactive Repository Uploader assignment did not reactivate safely';
  end if;

  if (select count(*) from public.repository_uploader_assignment_audit)
       <> audit_before + 2 then
    raise exception 'Revocation/reactivation did not append exactly two audit rows';
  end if;

  raise exception 'ROLLBACK-CONTAINED PASS: migration 053 staging acceptance';
end
$acceptance$;
