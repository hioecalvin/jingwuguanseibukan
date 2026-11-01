set role authenticated;
select set_config('app.current_uid', '00000000-0000-0000-0000-000000000002', false);

select public.review_class_request_with_level(
  '40000000-0000-0000-0000-000000000001',
  'approved',
  null,
  'yudansha'
);

select public.review_class_request_with_level(
  '40000000-0000-0000-0000-000000000002',
  'rejected',
  '  Incomplete documents  ',
  'mudansha'
);

select public.review_class_request_with_level(
  '40000000-0000-0000-0000-000000000005',
  'approved',
  null,
  'yudansha'
);

do $$
begin
  perform public.review_class_request_with_level(
    '40000000-0000-0000-0000-000000000003',
    'approved',
    null,
    'mudansha'
  );
  raise exception 'Wrong-scope approval unexpectedly succeeded';
exception
  when others then
    if sqlerrm <> 'Not authorised' then raise; end if;
end
$$;

select set_config('app.current_uid', '', false);
do $$
begin
  perform public.review_class_request_with_level(
    '40000000-0000-0000-0000-000000000004',
    'approved',
    null,
    'mudansha'
  );
  raise exception 'Anonymous approval unexpectedly succeeded';
exception
  when others then
    if sqlerrm <> 'Not authenticated' then raise; end if;
end
$$;

reset role;

create function public.fail_rollback_notification()
returns trigger
language plpgsql
as $$
begin
  if new.user_id = '30000000-0000-0000-0000-000000000004'::uuid then
    raise exception 'Synthetic downstream failure';
  end if;
  return new;
end
$$;

create trigger fail_rollback_notification
before insert on public.notification_outbox
for each row execute function public.fail_rollback_notification();

set role authenticated;
select set_config('app.current_uid', '00000000-0000-0000-0000-000000000002', false);
do $$
begin
  perform public.review_class_request_with_level(
    '40000000-0000-0000-0000-000000000004',
    'approved',
    null,
    'mudansha'
  );
  raise exception 'Failure-path approval unexpectedly succeeded';
exception
  when others then
    if sqlerrm <> 'Synthetic downstream failure' then raise; end if;
end
$$;
reset role;

do $assertions$
declare
  function_path text[];
begin
  if not exists (
    select 1 from public.class_requests
    where id = '40000000-0000-0000-0000-000000000001'
      and status = 'approved'
      and reviewed_by = '00000000-0000-0000-0000-000000000002'
      and reviewed_at is not null
      and rejection_reason is null
  ) then raise exception 'Approved request facts are incorrect'; end if;

  if not exists (
    select 1 from public.class_memberships
    where user_id = '30000000-0000-0000-0000-000000000001'
      and level = 'yudansha'
      and status = 'active'
  ) then raise exception 'Approved membership level is incorrect'; end if;

  if not exists (
    select 1 from public.class_requests
    where id = '40000000-0000-0000-0000-000000000002'
      and status = 'rejected'
      and rejection_reason = 'Incomplete documents'
  ) then raise exception 'Rejected request facts are incorrect'; end if;

  if exists (
    select 1 from public.class_memberships
    where user_id = '30000000-0000-0000-0000-000000000002'
  ) then raise exception 'Rejection created a membership'; end if;

  if not exists (
    select 1 from public.class_memberships
    where id = '50000000-0000-0000-0000-000000000005'
      and dojo_id = '20000000-0000-0000-0000-000000000002'
      and status = 'active'
      and level = 'yudansha'
      and role = 'user'
  ) then raise exception 'Existing membership upsert is incorrect'; end if;

  if (select count(*) from public.notification_outbox) <> 3 then
    raise exception 'Expected result notifications were not created';
  end if;

  if not exists (
    select 1 from public.class_requests
    where id = '40000000-0000-0000-0000-000000000003'
      and status = 'pending'
      and reviewed_by is null
  ) then raise exception 'Wrong-scope request was modified'; end if;

  if not exists (
    select 1 from public.class_requests
    where id = '40000000-0000-0000-0000-000000000004'
      and status = 'pending'
      and reviewed_by is null
  ) or exists (
    select 1 from public.class_memberships
    where user_id = '30000000-0000-0000-0000-000000000004'
  ) then raise exception 'Downstream failure did not roll back atomically'; end if;

  if has_function_privilege(
    'anon',
    'public.review_class_request_with_level(uuid,public.request_status,text,public.membership_level)',
    'EXECUTE'
  ) then raise exception 'Anon can execute the approval function'; end if;

  if not has_function_privilege(
    'authenticated',
    'public.review_class_request_with_level(uuid,public.request_status,text,public.membership_level)',
    'EXECUTE'
  ) then raise exception 'Authenticated execution grant is missing'; end if;

  select proconfig
  into function_path
  from pg_proc
  where oid = 'public.review_class_request_with_level(uuid,public.request_status,text,public.membership_level)'::regprocedure;

  if function_path <> array['search_path=public, pg_temp'] then
    raise exception 'Approval function search_path is not fixed';
  end if;
end
$assertions$;

select json_build_object(
  'status', 'PASS',
  'checks', 12,
  'approvedLevel', 'yudansha',
  'rejectionPreserved', true,
  'scopeDenied', true,
  'anonymousDenied', true,
  'rollbackProven', true,
  'aclVerified', true
);
