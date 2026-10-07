-- Supabase CLI `db query` executes one prepared statement. Keep this suite in
-- one DO block and deliberately raise the pass marker at the end: PostgreSQL
-- then rolls back every write made by the statement, including audit rows.
do $acceptance$
declare
  super_id uuid;
  admin_id uuid;
  member_id uuid;
  target_membership_id uuid;
  out_of_scope_membership_id uuid;
  result_row record;
  before_count bigint;
  after_count bigint;
  target_joined date;
  target_status text;
  expected_today date := (clock_timestamp() at time zone 'Asia/Jakarta')::date;
  correction_date date;
  signature text;
begin
  select id into super_id
  from public.profiles where registration_number = '0001';
  select id into admin_id
  from public.profiles where registration_number = '0002';
  select id into member_id
  from public.profiles where registration_number = '0101';
  select membership.id into target_membership_id
  from public.class_memberships as membership
  join public.profiles as profile on profile.id = membership.user_id
  where profile.registration_number = '0101'
    and membership.status::text = 'active'
  limit 1;
  select membership.id into out_of_scope_membership_id
  from public.class_memberships as membership
  join public.profiles as profile on profile.id = membership.user_id
  where profile.registration_number = '0001'
    and membership.status::text = 'active'
  limit 1;

  if super_id is null or admin_id is null or member_id is null
     or target_membership_id is null or out_of_scope_membership_id is null then
    raise exception 'Required staging security-test identities or memberships are missing';
  end if;
  if target_membership_id = out_of_scope_membership_id then
    raise exception 'Acceptance targets are not distinct';
  end if;

  -- A Member cannot record attendance, including on their own membership.
  perform set_config('request.jwt.claim.sub', member_id::text, false);
  begin
    perform * from public.mark_membership_trained_today(target_membership_id);
    raise exception 'Member unexpectedly recorded training';
  exception when insufficient_privilege then null;
  end;

  -- The scoped Admin can mark the assigned active member using Jakarta time.
  perform set_config('request.jwt.claim.sub', admin_id::text, false);
  select count(*) into before_count
  from public.membership_training_session_audit
  where membership_id = target_membership_id;

  select * into result_row
  from public.mark_membership_trained_today(target_membership_id);

  if result_row.training_date is distinct from expected_today
     or result_row.days_ago is distinct from 0 then
    raise exception 'Mark-today did not use the Jakarta server date';
  end if;
  if (select last_training_session_date from public.class_memberships
      where id = target_membership_id) <> expected_today then
    raise exception 'Membership last-training date was not updated';
  end if;

  select count(*) into after_count
  from public.membership_training_session_audit
  where membership_id = target_membership_id;
  if after_count <> before_count + 1 then
    raise exception 'First attendance mark did not append exactly one audit row';
  end if;
  if not exists (
    select 1 from public.membership_training_session_audit
    where membership_id = target_membership_id
      and recorded_by = admin_id
      and previous_training_date is null
      and new_training_date = expected_today
  ) then
    raise exception 'Audit row did not retain the original Admin caller';
  end if;

  perform * from public.mark_membership_trained_today(target_membership_id);
  if (select count(*) from public.membership_training_session_audit
      where membership_id = target_membership_id) <> after_count then
    raise exception 'Same-day retry created a duplicate audit row';
  end if;

  -- Member getter returns only the caller's memberships.
  perform set_config('request.jwt.claim.sub', member_id::text, false);
  if not exists (
    select 1 from public.get_my_last_training_sessions()
    where membership_id = target_membership_id and days_ago = 0
  ) then
    raise exception 'Member getter did not return the caller training status';
  end if;
  if exists (
    select 1 from public.get_my_last_training_sessions()
    where membership_id = out_of_scope_membership_id
  ) then
    raise exception 'Member getter leaked another user membership';
  end if;

  -- A valid correction stores the resolved date and complete audit transition.
  perform set_config('request.jwt.claim.sub', admin_id::text, false);
  select joined_date into target_joined
  from public.class_memberships where id = target_membership_id;
  correction_date := expected_today - 1;
  if target_joined is not null and correction_date < target_joined then
    raise exception 'Staging target has no valid backdate available for acceptance';
  end if;

  select count(*) into before_count
  from public.membership_training_session_audit
  where membership_id = target_membership_id;

  select * into result_row
  from public.set_membership_last_training_session(
    target_membership_id,
    correction_date
  );
  if result_row.training_date is distinct from correction_date
     or result_row.days_ago is distinct from 1 then
    raise exception 'Valid correction did not return the expected date and recency';
  end if;

  select count(*) into after_count
  from public.membership_training_session_audit
  where membership_id = target_membership_id;
  if after_count <> before_count + 1 then
    raise exception 'Valid correction did not append exactly one audit row';
  end if;
  if not exists (
    select 1 from public.membership_training_session_audit
    where membership_id = target_membership_id
      and recorded_by = admin_id
      and previous_training_date = expected_today
      and new_training_date = correction_date
  ) then
    raise exception 'Correction audit did not retain the complete transition';
  end if;

  perform * from public.set_membership_last_training_session(
    target_membership_id,
    correction_date
  );
  if (select count(*) from public.membership_training_session_audit
      where membership_id = target_membership_id) <> after_count then
    raise exception 'Repeated correction created a duplicate audit row';
  end if;

  -- Scoped Admin is denied outside the assigned dojo and rejects future dates.
  perform set_config('request.jwt.claim.sub', admin_id::text, false);
  begin
    perform * from public.mark_membership_trained_today(out_of_scope_membership_id);
    raise exception 'Scoped Admin unexpectedly crossed the dojo boundary';
  exception when insufficient_privilege then null;
  end;
  begin
    perform * from public.set_membership_last_training_session(
      target_membership_id,
      expected_today + 1
    );
    raise exception 'Future training date unexpectedly succeeded';
  exception when invalid_parameter_value then null;
  end;

  -- Super Admin remains org-wide; invalid target states fail.
  perform set_config('request.jwt.claim.sub', super_id::text, false);
  perform * from public.mark_membership_trained_today(out_of_scope_membership_id);

  select joined_date, status::text into target_joined, target_status
  from public.class_memberships where id = target_membership_id;

  update public.class_memberships set status = 'break'
  where id = target_membership_id;
  begin
    perform * from public.mark_membership_trained_today(target_membership_id);
    raise exception 'Inactive membership unexpectedly recorded training';
  exception when invalid_parameter_value then null;
  end;
  update public.class_memberships set status = target_status::public.membership_status
  where id = target_membership_id;

  update public.class_memberships set joined_date = expected_today + 1
  where id = target_membership_id;
  begin
    perform * from public.mark_membership_trained_today(target_membership_id);
    raise exception 'Pre-join training date unexpectedly succeeded';
  exception when invalid_parameter_value then null;
  end;
  update public.class_memberships set joined_date = target_joined
  where id = target_membership_id;

  update public.profiles set date_of_passing = expected_today
  where id = member_id;
  begin
    perform * from public.mark_membership_trained_today(target_membership_id);
    raise exception 'Deceased member unexpectedly recorded training';
  exception when invalid_parameter_value then null;
  end;

  foreach signature in array array[
    'public.get_my_last_training_sessions()',
    'public.mark_membership_trained_today(uuid)',
    'public.set_membership_last_training_session(uuid,date)'
  ] loop
    if has_function_privilege('anon', signature, 'EXECUTE')
       or has_function_privilege('service_role', signature, 'EXECUTE')
       or not has_function_privilege('authenticated', signature, 'EXECUTE') then
      raise exception 'Unsafe last-training RPC ACL: %', signature;
    end if;
  end loop;
  if has_table_privilege('anon', 'public.membership_training_session_audit', 'SELECT')
     or has_table_privilege('anon', 'public.membership_training_session_audit', 'INSERT')
     or has_table_privilege('anon', 'public.membership_training_session_audit', 'UPDATE')
     or has_table_privilege('anon', 'public.membership_training_session_audit', 'DELETE')
     or has_table_privilege('authenticated', 'public.membership_training_session_audit', 'SELECT')
     or has_table_privilege('authenticated', 'public.membership_training_session_audit', 'INSERT')
     or has_table_privilege('authenticated', 'public.membership_training_session_audit', 'UPDATE')
     or has_table_privilege('authenticated', 'public.membership_training_session_audit', 'DELETE')
     or has_table_privilege('service_role', 'public.membership_training_session_audit', 'INSERT')
     or has_table_privilege('service_role', 'public.membership_training_session_audit', 'UPDATE')
     or has_table_privilege('service_role', 'public.membership_training_session_audit', 'DELETE')
     or not has_table_privilege('service_role', 'public.membership_training_session_audit', 'SELECT') then
    raise exception 'Training audit relation ACL is unsafe';
  end if;

  -- This exact exception is the success signal and atomically rolls back the
  -- statement. Any other error indicates a failed assertion or runtime defect.
  raise exception using
    errcode = 'P0001',
    message = 'ROLLBACK-CONTAINED PASS: migrations 045-046 last-training acceptance';
end
$acceptance$;
