-- Class Admin can promote a membership in their class.
set role authenticated;
select set_config('app.current_uid', '00000000-0000-0000-0000-000000000002', false);
select public.promote_membership(
  '50000000-0000-0000-0000-000000000001',
  date '2026-01-11',
  '00000000-0000-0000-0000-000000000004',
  null
);

-- The next call must calculate from the newly committed membership state.
select public.promote_membership(
  '50000000-0000-0000-0000-000000000001',
  date '2026-01-12',
  null,
  '  External   Examiner  '
);

-- A backdated promotion must fail before progression is calculated or mutated.
do $$
begin
  perform public.promote_membership(
    '50000000-0000-0000-0000-000000000001',
    date '2026-01-09',
    '00000000-0000-0000-0000-000000000004',
    null
  );
  raise exception 'Backdated promotion unexpectedly succeeded';
exception
  when others then
    if sqlerrm <> 'Promotion date cannot be earlier than the latest valid promotion' then
      raise;
    end if;
end
$$;

-- A Class Admin cannot promote a membership from another class.
do $$
begin
  perform public.promote_membership(
    '50000000-0000-0000-0000-000000000002',
    date '2026-01-11',
    '00000000-0000-0000-0000-000000000004',
    null
  );
  raise exception 'Cross-class promotion unexpectedly succeeded';
exception
  when others then
    if sqlerrm <> 'Not authorised to manage this class' then raise; end if;
end
$$;

-- An ordinary Member cannot promote even within the Class Admin's class.
select set_config('app.current_uid', '00000000-0000-0000-0000-000000000005', false);
do $$
begin
  perform public.promote_membership(
    '50000000-0000-0000-0000-000000000002',
    date '2026-01-11',
    '00000000-0000-0000-0000-000000000004',
    null
  );
  raise exception 'Member promotion unexpectedly succeeded';
exception
  when others then
    if sqlerrm <> 'Not authorised to manage this class' then raise; end if;
end
$$;

-- An authenticated database role without an application identity is rejected.
select set_config('app.current_uid', '', false);
do $$
begin
  perform public.promote_membership(
    '50000000-0000-0000-0000-000000000002',
    date '2026-01-11',
    '00000000-0000-0000-0000-000000000004',
    null
  );
  raise exception 'Identity-free promotion unexpectedly succeeded';
exception
  when others then
    if sqlerrm <> 'Not authenticated' then raise; end if;
end
$$;
reset role;

-- Super Admin can manage the membership that was outside Class Admin scope.
set role authenticated;
select set_config('app.current_uid', '00000000-0000-0000-0000-000000000001', false);
select public.promote_membership(
  '50000000-0000-0000-0000-000000000002',
  date '2026-01-11',
  '00000000-0000-0000-0000-000000000004',
  null
);
reset role;

do $assertions$
declare
  definition text;
begin
  select pg_get_functiondef(
    'public.promote_membership(uuid,date,uuid,text)'::regprocedure
  ) into definition;

  if position('FOR UPDATE' in upper(definition)) = 0
     or position('FOR UPDATE' in upper(definition))
        > position('GET_NEXT_MEMBERSHIP_PROMOTION' in upper(definition)) then
    raise exception 'Membership row lock is missing or follows progression calculation';
  end if;

  if (select count(*) from public.promotion_lock_observations) <> 3
     or exists (
       select 1 from public.promotion_lock_observations
       where not row_lock_mode_seen
     ) then
    raise exception 'Runtime lock observations do not match successful promotions';
  end if;

  if not exists (
    select 1 from public.promotion_lock_observations
    where membership_id = '50000000-0000-0000-0000-000000000001'
      and rank_seen = '60000000-0000-0000-0000-000000000001'
  ) or not exists (
    select 1 from public.promotion_lock_observations
    where membership_id = '50000000-0000-0000-0000-000000000001'
      and rank_seen = '60000000-0000-0000-0000-000000000002'
  ) then
    raise exception 'Successive promotions did not calculate from serialized state';
  end if;

  if not exists (
    select 1 from public.class_memberships
    where id = '50000000-0000-0000-0000-000000000001'
      and rank_id = '60000000-0000-0000-0000-000000000003'
      and level = 'yudansha'
  ) then
    raise exception 'Authorized successive promotion result is incorrect';
  end if;

  if (select count(*) from public.membership_grade_history
      where membership_id = '50000000-0000-0000-0000-000000000001') <> 3
     or exists (
       select 1 from public.membership_grade_history
       where membership_id = '50000000-0000-0000-0000-000000000001'
         and effective_date = date '2026-01-09'
     ) then
    raise exception 'Backdated rejection changed promotion history';
  end if;

  if not exists (
    select 1 from public.membership_grade_history
    where membership_id = '50000000-0000-0000-0000-000000000001'
      and effective_date = date '2026-01-12'
      and assessor_type = 'external'
      and assessor_member_id is null
      and assessor_name_snapshot = 'External Examiner'
  ) then
    raise exception 'External assessor facts are incorrect';
  end if;

  if not exists (
    select 1 from public.class_memberships
    where id = '50000000-0000-0000-0000-000000000002'
      and rank_id = '60000000-0000-0000-0000-000000000002'
      and level = 'mudansha'
  ) or (select count(*) from public.membership_grade_history
        where membership_id = '50000000-0000-0000-0000-000000000002') <> 2 then
    raise exception 'Denied calls mutated the cross-class membership';
  end if;

  if has_function_privilege(
       'anon',
       'public.promote_membership(uuid,date,uuid,text)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'authenticated',
       'public.promote_membership(uuid,date,uuid,text)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'service_role',
       'public.promote_membership(uuid,date,uuid,text)',
       'EXECUTE'
     ) then
    raise exception 'Promotion function role grants are incorrect';
  end if;

  raise notice 'MIGRATION_029_RUNTIME_PASS';
end
$assertions$;

select json_build_object(
  'status', 'PASS',
  'checks', 8,
  'lockObservedBeforeProgression', true,
  'successiveStateObserved', true,
  'backdatedRejected', true,
  'classAdminScopeEnforced', true,
  'memberDenied', true,
  'anonymousDenied', true,
  'superAdminAllowed', true,
  'aclVerified', true
);
