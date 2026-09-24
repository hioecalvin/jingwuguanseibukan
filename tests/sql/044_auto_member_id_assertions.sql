insert into public.profiles (id, registration_number, full_name, email, is_super_admin)
values
  ('10000000-0000-0000-0000-000000000001', null, 'New Member', 'new@example.invalid', false),
  ('10000000-0000-0000-0000-000000000002', 'LEGACY-7', 'Legacy Member', 'legacy@example.invalid', false),
  ('10000000-0000-0000-0000-000000000003', null, 'Rejected Member', 'reject@example.invalid', false),
  ('10000000-0000-0000-0000-000000000004', null, 'Legacy RPC Member', 'legacy-rpc@example.invalid', false),
  ('10000000-0000-0000-0000-000000000005', null, 'Five Digit Member', 'five-digit@example.invalid', false);

insert into public.class_requests (id, user_id, class_id)
values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001');

insert into auth.users (
  id,
  email,
  raw_user_meta_data
) values (
  '10000000-0000-0000-0000-000000000006',
  'aikikai-applicant@example.invalid',
  jsonb_build_object(
    'full_name', 'Aikikai Applicant',
    'phone', '123 456',
    'date_of_birth', '2000-01-01',
    'requested_class_id', '20000000-0000-0000-0000-000000000001',
    'aikikai_registration_number', '  AIKIKAI   123  '
  )
);

insert into public.class_requests (id, user_id, class_id)
values (
  '30000000-0000-0000-0000-000000000006',
  '10000000-0000-0000-0000-000000000006',
  '20000000-0000-0000-0000-000000000001'
);

insert into auth.users (
  id,
  email,
  raw_user_meta_data
) values (
  '10000000-0000-0000-0000-000000000007',
  'no-aikikai@example.invalid',
  jsonb_build_object(
    'full_name', 'No Aikikai Number',
    'date_of_birth', '2000-01-01',
    'requested_class_id', '20000000-0000-0000-0000-000000000001'
  )
);

do $assert_aikikai_signup$
begin
  if (
    select registration_number
    from public.profiles
    where id = '10000000-0000-0000-0000-000000000006'
  ) is not null then
    raise exception 'Signup assigned the JS Member ID before approval';
  end if;

  if (
    select aikikai_registration_number
    from public.profiles
    where id = '10000000-0000-0000-0000-000000000006'
  ) <> 'AIKIKAI 123' then
    raise exception 'Applicant Aikikai Registration Number was not normalized and retained';
  end if;

  if (
    select aikikai_registration_number
    from public.admin_visible_requests
    where request_id = '30000000-0000-0000-0000-000000000006'
  ) <> 'AIKIKAI 123' then
    raise exception 'Application review does not expose the applicant Aikikai number';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = '10000000-0000-0000-0000-000000000007'
      and registration_number is null
      and aikikai_registration_number is null
  ) then
    raise exception 'Blank optional Aikikai number was not accepted as NULL';
  end if;
end
$assert_aikikai_signup$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);

select public.review_class_request_with_level(
  '30000000-0000-0000-0000-000000000001',
  'approved',
  null,
  'yudansha'
);

do $assert_first_approval$
begin
  if (select registration_number from public.profiles where id = '10000000-0000-0000-0000-000000000001') <> '0102' then
    raise exception 'First generated Member ID is not 0102';
  end if;
  if not exists (
    select 1 from public.class_memberships
    where user_id = '10000000-0000-0000-0000-000000000001'
      and level = 'yudansha'
  ) then
    raise exception 'Approved membership was not created atomically';
  end if;
  if not exists (
    select 1 from public.notification_outbox
    where user_id = '10000000-0000-0000-0000-000000000001'
      and payload ->> 'member_id' = '0102'
  ) then
    raise exception 'Approval notification does not contain the generated Member ID';
  end if;
end
$assert_first_approval$;

select public.review_class_request_with_level(
  '30000000-0000-0000-0000-000000000002',
  'approved',
  null,
  'mudansha'
);

select public.review_class_request_with_level(
  '30000000-0000-0000-0000-000000000003',
  'rejected',
  'Incomplete',
  'mudansha'
);

do $assert_preservation$
begin
  if (select registration_number from public.profiles where id = '10000000-0000-0000-0000-000000000002') <> 'LEGACY-7' then
    raise exception 'Existing Member ID was overwritten';
  end if;
  if (select registration_number from public.profiles where id = '10000000-0000-0000-0000-000000000003') is not null then
    raise exception 'Rejected application received a Member ID';
  end if;
end
$assert_preservation$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', false);

do $assert_admin_denial$
begin
  begin
    perform public.review_class_request_with_level(
      '30000000-0000-0000-0000-000000000004',
      'approved',
      null,
      'mudansha'
    );
    raise exception 'Scoped Admin unexpectedly approved an initial application';
  exception
    when others then
      if sqlerrm <> 'Super Admin only' then
        raise;
      end if;
  end;
end
$assert_admin_denial$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);

select public.review_class_request(
  '30000000-0000-0000-0000-000000000004',
  'approved',
  null
);

do $assert_legacy_rpc$
begin
  if (select registration_number from public.profiles where id = '10000000-0000-0000-0000-000000000004') <> '0103' then
    raise exception 'Legacy approval RPC bypassed automatic JS Member ID assignment';
  end if;
  if has_sequence_privilege('authenticated', 'public.js_member_id_seq', 'USAGE') then
    raise exception 'Authenticated role can use the JS Member ID sequence directly';
  end if;
end
$assert_legacy_rpc$;

select pg_catalog.setval(
  'public.js_member_id_seq'::regclass,
  9999,
  true
);

select public.review_class_request_with_level(
  '30000000-0000-0000-0000-000000000005',
  'approved',
  null,
  'mudansha'
);

do $assert_five_digit_id$
begin
  if (select registration_number from public.profiles where id = '10000000-0000-0000-0000-000000000005') <> '10000' then
    raise exception 'Member ID was truncated after 9999';
  end if;
end
$assert_five_digit_id$;
