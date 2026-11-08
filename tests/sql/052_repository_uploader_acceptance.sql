select set_config('app.current_role', 'authenticated', false);
set role authenticated;

-- An ordinary Admin receives no implicit repository publishing authority.
select set_config('app.current_uid', '00000000-0000-0000-0000-000000000003', false);

do $assert$
begin
  begin
    perform public.assign_repository_uploader(
      '00000000-0000-0000-0000-000000000002',
      '10000000-0000-0000-0000-000000000001'
    );
    raise exception 'Non-Super Admin unexpectedly appointed a Repository Uploader';
  exception when insufficient_privilege then
    null;
  end;

  begin
    perform public.create_repository_content(
      '10000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000001',
      '30000000-0000-0000-0000-000000000001',
      'Admin draft', null, 'youtube', 'admin-video', 'draft', 1
    );
    raise exception 'Unappointed Admin unexpectedly created repository content';
  exception when insufficient_privilege then
    null;
  end;
end
$assert$;

-- Only Super Admin appoints the ordinary Member for Aikido.
select set_config('app.current_uid', '00000000-0000-0000-0000-000000000001', false);

select public.assign_repository_uploader(
  '00000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000001'
);

do $assert$
begin
  if (select count(*) from public.get_repository_uploader_candidates()) <> 3 then
    raise exception 'Super Admin did not receive the active uploader candidates';
  end if;

  if not coalesce((
    select option.is_uploader
    from public.get_repository_uploader_options(
      '00000000-0000-0000-0000-000000000002'
    ) as option
    where option.class_id = '10000000-0000-0000-0000-000000000001'
  ), false) then
    raise exception 'Appointment was not visible in Super Admin options';
  end if;

  begin
    perform public.assign_repository_uploader(
      '00000000-0000-0000-0000-000000000002',
      '10000000-0000-0000-0000-000000000003'
    );
    raise exception 'Super Admin unexpectedly appointed an uploader to an inactive class';
  exception when others then
    if sqlerrm <> 'Active class not found' then
      raise;
    end if;
  end;
end
$assert$;

-- The appointed ordinary Member receives exactly the appointed class scope and can
-- create repository content through the RPC, while cross-class creation is denied.
select set_config('app.current_uid', '00000000-0000-0000-0000-000000000002', false);

do $assert$
begin
  if (select count(*) from public.get_my_repository_upload_scopes()) <> 1
     or not exists (
       select 1
       from public.get_my_repository_upload_scopes() as scope
       where scope.class_id = '10000000-0000-0000-0000-000000000001'
     )
  then
    raise exception 'Ordinary Member received an unexpected uploader scope';
  end if;

  if not public.is_repository_uploader(
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002'
  ) then
    raise exception 'Ordinary Member appointment was not authorized';
  end if;

  if public.is_repository_uploader(
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002'
  ) then
    raise exception 'Ordinary Member received cross-class uploader authority';
  end if;
end
$assert$;

select set_config(
  'app.member_content_id',
  public.create_repository_content(
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    'Member draft', 'First version', 'youtube', 'member-video', 'draft', 10
  )::text,
  false
);

do $assert$
begin
  begin
    perform public.create_repository_content(
      '10000000-0000-0000-0000-000000000002',
      '20000000-0000-0000-0000-000000000002',
      '30000000-0000-0000-0000-000000000002',
      'Cross-class draft', null, 'youtube', 'cross-video', 'draft', 1
    );
    raise exception 'Ordinary Member unexpectedly created cross-class content';
  exception when insufficient_privilege then
    null;
  end;
end
$assert$;

select public.update_repository_content(
  current_setting('app.member_content_id')::uuid,
  'Member draft updated', 'Updated version', 'youtube', 'member-video', 'draft', 20
);

do $assert$
begin
  if not exists (
    select 1 from public.content
    where title = 'Member draft updated'
      and sort_order = 20
  ) then
    raise exception 'Appointed ordinary Member could not update own-class content';
  end if;
end
$assert$;

-- Super Admin has global repository authority without a stored appointment.
select set_config('app.current_uid', '00000000-0000-0000-0000-000000000001', false);

select set_config(
  'app.super_content_id',
  public.create_repository_content(
    '10000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000002',
    'Super draft', null, 'youtube', 'super-video', 'draft', 5
  )::text,
  false
);

select public.update_repository_content(
  current_setting('app.super_content_id')::uuid,
  'Super draft updated', null, 'youtube', 'super-video', 'draft', 6
);

-- Neither the appointed Member outside their class nor the unappointed Admin may
-- update or delete the Super Admin's Karate draft.
select set_config('app.current_uid', '00000000-0000-0000-0000-000000000002', false);

do $assert$
begin
  begin
    perform public.update_repository_content(
      current_setting('app.super_content_id')::uuid,
      'Unauthorized update', null, 'youtube', 'super-video', 'draft', 7
    );
    raise exception 'Ordinary Member unexpectedly updated cross-class content';
  exception when insufficient_privilege then
    null;
  end;

  begin
    perform public.delete_repository_content(
      current_setting('app.super_content_id')::uuid
    );
    raise exception 'Ordinary Member unexpectedly deleted cross-class content';
  exception when insufficient_privilege then
    null;
  end;
end
$assert$;

select set_config('app.current_uid', '00000000-0000-0000-0000-000000000003', false);

do $assert$
begin
  begin
    perform public.update_repository_content(
      current_setting('app.super_content_id')::uuid,
      'Admin update', null, 'youtube', 'super-video', 'draft', 8
    );
    raise exception 'Unappointed Admin unexpectedly updated repository content';
  exception when insufficient_privilege then
    null;
  end;

  begin
    perform public.delete_repository_content(
      current_setting('app.super_content_id')::uuid
    );
    raise exception 'Unappointed Admin unexpectedly deleted repository content';
  exception when insufficient_privilege then
    null;
  end;

  if (select count(*) from public.content) <> 0 then
    raise exception 'Unappointed Admin read draft repository content through RLS';
  end if;

  begin
    insert into public.content (
      class_id, rank_id, sub_rank_id, title, status, sort_order, created_by
    ) values (
      '10000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000001',
      '30000000-0000-0000-0000-000000000001',
      'Direct write', 'draft', 0,
      '00000000-0000-0000-0000-000000000003'
    );
    raise exception 'Authenticated browser role unexpectedly inserted content directly';
  exception when insufficient_privilege then
    null;
  end;

  begin
    insert into public.repository_uploader_assignments (user_id, class_id)
    values (
      '00000000-0000-0000-0000-000000000003',
      '10000000-0000-0000-0000-000000000001'
    );
    raise exception 'Authenticated browser role unexpectedly inserted an appointment directly';
  exception when insufficient_privilege then
    null;
  end;
end
$assert$;

-- The appointed Member exercises own-class delete, then creates a row that remains
-- protected after Super Admin revokes the appointment.
select set_config('app.current_uid', '00000000-0000-0000-0000-000000000002', false);

select public.delete_repository_content(
  current_setting('app.member_content_id')::uuid
);

select set_config(
  'app.revocation_content_id',
  public.create_repository_content(
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    'Revocation draft', null, 'youtube', 'revoke-video', 'draft', 30
  )::text,
  false
);

select set_config('app.current_uid', '00000000-0000-0000-0000-000000000001', false);

select public.revoke_repository_uploader(
  '00000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000001'
);

select set_config('app.current_uid', '00000000-0000-0000-0000-000000000002', false);

do $assert$
begin
  if (select count(*) from public.get_my_repository_upload_scopes()) <> 0 then
    raise exception 'Revoked Member retained an uploader scope';
  end if;

  begin
    perform public.update_repository_content(
      current_setting('app.revocation_content_id')::uuid,
      'Post-revocation update', null, 'youtube', 'revoke-video', 'draft', 31
    );
    raise exception 'Revoked Member unexpectedly updated repository content';
  exception when insufficient_privilege then
    null;
  end;

  begin
    perform public.delete_repository_content(
      current_setting('app.revocation_content_id')::uuid
    );
    raise exception 'Revoked Member unexpectedly deleted repository content';
  exception when insufficient_privilege then
    null;
  end;
end
$assert$;

-- Super Admin can clean up globally and the private audit contains both actions.
select set_config('app.current_uid', '00000000-0000-0000-0000-000000000001', false);

select public.delete_repository_content(
  current_setting('app.revocation_content_id')::uuid
);

select public.delete_repository_content(
  current_setting('app.super_content_id')::uuid
);

reset role;

do $assert$
begin
  if (select count(*) from public.content) <> 0 then
    raise exception 'Repository acceptance rows were not cleaned up';
  end if;

  if (select count(*) from public.repository_uploader_assignment_audit) <> 2
     or (select count(*) from public.repository_uploader_assignment_audit where action = 'appointed') <> 1
     or (select count(*) from public.repository_uploader_assignment_audit where action = 'revoked') <> 1
     or exists (
       select 1
       from public.repository_uploader_assignment_audit
       where actor_id <> '00000000-0000-0000-0000-000000000001'
     )
  then
    raise exception 'Appointment audit does not contain the expected Super Admin actions';
  end if;

  if has_table_privilege('authenticated', 'public.repository_uploader_assignments', 'SELECT')
     or has_table_privilege('authenticated', 'public.repository_uploader_assignments', 'INSERT')
     or has_table_privilege('authenticated', 'public.repository_uploader_assignment_audit', 'SELECT')
     or has_table_privilege('authenticated', 'public.content', 'INSERT')
     or has_table_privilege('authenticated', 'public.content', 'UPDATE')
     or has_table_privilege('authenticated', 'public.content', 'DELETE')
  then
    raise exception 'Browser role has unsafe direct table privileges';
  end if;

  if has_function_privilege('anon', 'public.assign_repository_uploader(uuid,uuid)', 'EXECUTE')
     or has_function_privilege('anon', 'public.create_repository_content(uuid,uuid,uuid,text,text,text,text,text,integer)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.assign_repository_uploader(uuid,uuid)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.create_repository_content(uuid,uuid,uuid,text,text,text,text,text,integer)', 'EXECUTE')
  then
    raise exception 'Repository Uploader function ACL is unsafe';
  end if;
end
$assert$;
