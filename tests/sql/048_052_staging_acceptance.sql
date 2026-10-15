-- Guarded staging-only semantic acceptance for migrations 048 through 052.
--
-- Supabase CLI `db query` sends this DO block as one statement. The exact final
-- exception is the success signal and rolls back every temporary schedule,
-- profile-contact, repository-assignment, audit and content write atomically.
do $acceptance$
declare
  super_id uuid;
  admin_id uuid;
  member_id uuid;
  schedule_scope record;
  test_start time without time zone;
  test_finish time without time zone;
  schedule_id uuid;
  schedule_audit_before bigint;
  old_phone text;
  old_instagram text;
  temporary_phone text;
  temporary_instagram text;
  contact_audit_before bigint;
  contact_result record;
  directory_count bigint;
  finance_caller_id uuid;
  finance_dojo_id uuid;
  finance_month date := date_trunc('month', current_date)::date;
  settlement_id uuid;
  target_class_id uuid;
  target_rank_id uuid;
  target_sub_rank_id uuid;
  other_class_id uuid;
  other_rank_id uuid;
  other_sub_rank_id uuid;
  used_real_other_class boolean := false;
  content_id uuid;
  uploader_audit_before bigint;
  signature text;
  internal_signature text;
  private_relation text;
  privilege_name text;
begin
  select id into super_id from public.profiles where registration_number = '0001';
  select id into admin_id from public.profiles where registration_number = '0002';
  select id, phone, instagram_username
  into member_id, old_phone, old_instagram
  from public.profiles where registration_number = '0101';

  if super_id is null or admin_id is null or member_id is null then
    raise exception 'Required staging security-test identities are missing';
  end if;

  perform set_config('request.jwt.claim.role', 'authenticated', false);

  -- 048: Member-safe reads and exact scoped-Admin schedule mutation/audit.
  perform set_config('request.jwt.claim.sub', member_id::text, false);
  perform * from public.get_regular_class_schedules(false);
  if exists (
    select 1 from public.get_regular_class_schedules(false)
    where is_active is distinct from true
  ) then
    raise exception 'Member schedule read exposed an inactive row';
  end if;

  perform set_config('request.jwt.claim.sub', admin_id::text, false);
  select * into schedule_scope
  from public.get_manageable_schedule_scopes()
  order by class_name, dojo_name, dojo_id
  limit 1;
  if schedule_scope.dojo_id is null or schedule_scope.class_id is null then
    raise exception 'Scoped Admin has no active schedule scope';
  end if;

  select candidate.value::time,
         (candidate.value + interval '30 minutes')::time
  into test_start, test_finish
  from generate_series(
    timestamp '2000-01-01 00:07',
    timestamp '2000-01-01 22:57',
    interval '7 minutes'
  ) as candidate(value)
  where not exists (
    select 1 from public.regular_class_schedules as schedule
    where schedule.dojo_id = schedule_scope.dojo_id
      and schedule.day_of_week = 6
      and schedule.start_time = candidate.value::time
      and schedule.finish_time = (candidate.value + interval '30 minutes')::time
  )
  limit 1;
  if test_start is null then
    raise exception 'No collision-free temporary schedule slot is available';
  end if;

  select count(*) into schedule_audit_before
  from public.regular_class_schedule_audit;

  select public.upsert_regular_class_schedule(
    schedule_scope.dojo_id,
    6::smallint,
    test_start,
    test_finish,
    null,
    '__JWG_STAGING_ACCEPTANCE_048__',
    'rollback-contained',
    true,
    null
  ) into schedule_id;

  if not exists (
    select 1 from public.regular_class_schedules
    where id = schedule_id
      and class_id = schedule_scope.class_id
      and created_by = admin_id
  ) then
    raise exception 'Scoped Admin schedule creation did not persist inside the transaction';
  end if;

  perform public.upsert_regular_class_schedule(
    schedule_scope.dojo_id,
    6::smallint,
    test_start,
    test_finish,
    null,
    '__JWG_STAGING_ACCEPTANCE_048_UPDATED__',
    'rollback-contained update',
    true,
    schedule_id
  );

  if (select count(*) from public.regular_class_schedule_audit)
       <> schedule_audit_before + 2 then
    raise exception 'Schedule create/update did not append exactly two audit rows';
  end if;

  perform set_config('request.jwt.claim.sub', member_id::text, false);
  begin
    perform public.upsert_regular_class_schedule(
      schedule_scope.dojo_id,
      5::smallint,
      test_start,
      test_finish,
      null,
      '__JWG_MEMBER_DENIAL__',
      null,
      true,
      null
    );
    raise exception 'Member unexpectedly created a regular schedule';
  exception when insufficient_privilege then
    null;
  end;

  -- 049: caller-bound phone/Instagram normalization and private append-only audit.
  -- Reserved, randomized acceptance markers avoid relying on or colliding with
  -- the Member's pre-test contact values. The final raised exception rolls both
  -- profile changes and both audit rows back atomically.
  temporary_phone := '+999000' || substr(
    translate(replace(gen_random_uuid()::text, '-', ''), 'abcdef', '012345'),
    1,
    9
  );
  temporary_instagram := 'jwg_a_' || substr(
    replace(gen_random_uuid()::text, '-', ''),
    1,
    16
  );

  select count(*) into contact_audit_before
  from public.profile_contact_change_audit
  where profile_id = member_id
    and changed_by = member_id;

  select * into contact_result
  from public.update_my_contact_details(
    temporary_phone,
    '@' || temporary_instagram
  );

  if contact_result.phone is distinct from temporary_phone
     or contact_result.instagram_username is distinct from temporary_instagram
  then
    raise exception 'Contact normalization returned unexpected values';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = member_id
      and phone = temporary_phone
      and instagram_username = temporary_instagram
  ) then
    raise exception 'Contact self-service did not persist both normalized values inside the transaction';
  end if;

  if (select count(*)
      from public.profile_contact_change_audit
      where profile_id = member_id
        and changed_by = member_id) <> contact_audit_before + 2
     or not exists (
    select 1 from public.profile_contact_change_audit
    where profile_id = member_id
      and changed_by = member_id
      and field_name = 'phone'
      and previous_value is not distinct from old_phone
      and new_value = temporary_phone
      and change_source = 'member_self_service'
  ) or not exists (
    select 1 from public.profile_contact_change_audit
    where profile_id = member_id
      and changed_by = member_id
      and field_name = 'instagram_username'
      and previous_value is not distinct from old_instagram
      and new_value = temporary_instagram
      and change_source = 'member_self_service'
  ) then
    raise exception 'Contact self-service audit is incomplete';
  end if;

  -- 050: narrow same-class directory executes for the active Member.
  select count(*) into directory_count
  from public.get_my_member_directory();
  if directory_count < 1 then
    raise exception 'Member directory returned no same-class entries';
  end if;

  if exists (
    with actual as (
      select * from public.get_my_member_directory()
    ),
    expected as (
      select distinct
        class_data.name::text as class_name,
        profile.full_name::text as full_name,
        profile.avatar_url::text as avatar_url,
        nullif(
          concat_ws(
            ' · ',
            nullif(btrim(rank_data.name), ''),
            nullif(btrim(sub_rank_data.name), '')
          ),
          ''
        )::text as current_rank,
        dojo.name::text as home_dojo,
        profile.instagram_username::text as instagram_username
      from public.class_memberships as membership
      join public.profiles as profile
        on profile.id = membership.user_id
      join public.classes as class_data
        on class_data.id = membership.class_id
      left join public.dojos as dojo
        on dojo.id = membership.dojo_id
      left join public.ranks as rank_data
        on rank_data.id = membership.rank_id
      left join public.sub_ranks as sub_rank_data
        on sub_rank_data.id = membership.sub_rank_id
      where membership.status::text in ('active', 'break', 'break_1', 'break_2')
        and profile.account_status::text = 'active'
        and profile.date_of_passing is null
        and class_data.is_active = true
        and exists (
          select 1
          from public.class_memberships as caller_membership
          where caller_membership.user_id = member_id
            and caller_membership.class_id = membership.class_id
            and caller_membership.status::text in ('active', 'break', 'break_1', 'break_2')
        )
    )
    (
      select * from actual
      except
      select * from expected
    )
    union all
    (
      select * from expected
      except
      select * from actual
    )
  ) then
    raise exception 'Member directory differs from the exact eligible same-class projection';
  end if;

  if (
    select array_agg(argument.name order by argument.ordinality)
    from pg_catalog.pg_proc as routine
    cross join lateral unnest(routine.proargnames, routine.proargmodes)
      with ordinality as argument(name, mode, ordinality)
    where routine.oid = 'public.get_my_member_directory()'::regprocedure
      and argument.mode in ('o', 't')
  ) is distinct from array[
    'class_name', 'full_name', 'avatar_url', 'current_rank',
    'home_dojo', 'instagram_username'
  ]::text[] then
    raise exception 'Member directory exposed an unexpected projection';
  end if;

  -- 051: wrappers must exactly enrich, never change, the accounting source.
  perform set_config('request.jwt.claim.sub', admin_id::text, false);
  select dojo.id into finance_dojo_id
  from public.dojos as dojo
  where public.can_access_dojo_finance(dojo.id, admin_id)
  order by dojo.id
  limit 1;
  finance_caller_id := admin_id;

  if finance_dojo_id is null then
    perform set_config('request.jwt.claim.sub', super_id::text, false);
    select dojo.id into finance_dojo_id
    from public.dojos as dojo
    where public.can_access_dojo_finance(dojo.id, super_id)
    order by dojo.id
    limit 1;
    finance_caller_id := super_id;
  end if;
  if finance_dojo_id is null then
    raise exception 'No active dojo is available for finance acceptance';
  end if;
  perform set_config('request.jwt.claim.sub', finance_caller_id::text, false);

  if exists (
    select 1
    from public.get_settlement_eligible_payment_details(
      finance_dojo_id, finance_month
    ) as detail
    full join public.get_settlement_eligible_payments(
      finance_dojo_id, finance_month
    ) as base using (payment_id)
    where detail.payment_id is null
       or base.payment_id is null
       or detail.membership_id is distinct from base.membership_id
       or detail.member_name is distinct from base.member_name
       or detail.member_id is distinct from base.member_id
       or detail.payment_date is distinct from base.payment_date
       or detail.payment_amount is distinct from base.payment_amount
       or detail.currency is distinct from base.currency
       or detail.payment_method is distinct from base.payment_method
       or detail.payment_reference is distinct from base.payment_reference
       or detail.suggested_share is distinct from base.suggested_share
       or detail.billing_month is null
       or detail.is_late_payment is distinct from (
         date_trunc('month', detail.payment_date)::date
           > date_trunc('month', detail.billing_month)::date
       )
  ) then
    raise exception 'Eligible-payment detail wrapper changed accounting semantics';
  end if;

  if not exists (
    select 1 from public.get_settlement_eligible_payments(
      finance_dojo_id, finance_month
    )
  ) then
    raise notice 'FINANCE DATA NOTICE: no eligible payments exist for dojo % and month %; equivalence was checked on an empty set',
      finance_dojo_id, finance_month;
  end if;

  select id into settlement_id
  from public.dojo_settlements
  where dojo_id = finance_dojo_id
  order by created_at desc nulls last, id
  limit 1;
  if settlement_id is not null and exists (
    select 1
    from public.get_dojo_settlement_item_details(settlement_id) as detail
    full join public.get_dojo_settlement_items(settlement_id) as base
      using (item_id)
    where detail.item_id is null
       or base.item_id is null
       or detail.payment_id is distinct from base.payment_id
       or detail.membership_id is distinct from base.membership_id
       or detail.member_name is distinct from base.member_name
       or detail.member_id is distinct from base.member_id
       or detail.payment_date is distinct from base.payment_date
       or detail.payment_amount is distinct from base.payment_amount
       or detail.payment_method is distinct from base.payment_method
       or detail.payment_reference is distinct from base.payment_reference
       or detail.share_percent is distinct from base.share_percent
       or detail.share_amount is distinct from base.share_amount
       or detail.currency is distinct from base.currency
       or detail.billing_month is null
       or detail.is_late_payment is distinct from (
         date_trunc('month', detail.payment_date)::date
           > date_trunc('month', detail.billing_month)::date
       )
  ) then
    raise exception 'Settlement-item detail wrapper changed accounting semantics';
  end if;

  if settlement_id is null then
    raise notice 'FINANCE DATA NOTICE: no settlement exists for dojo %; settlement-item equivalence was not data-bearing',
      finance_dojo_id;
  elsif not exists (
    select 1 from public.get_dojo_settlement_items(settlement_id)
  ) then
    raise notice 'FINANCE DATA NOTICE: settlement % has no items; settlement-item equivalence was checked on an empty set',
      settlement_id;
  end if;

  -- 052: publishing permission is separate, exact-class, audited and revocable.
  select class_record.id, rank_record.id, tier.id
  into target_class_id, target_rank_id, target_sub_rank_id
  from public.classes as class_record
  join public.ranks as rank_record on rank_record.class_id = class_record.id
  join public.sub_ranks as tier on tier.rank_id = rank_record.id
  where class_record.is_active = true
    and not exists (
      select 1 from public.repository_uploader_assignments as assignment
      where assignment.user_id = member_id
        and assignment.class_id = class_record.id
    )
  order by class_record.name, rank_record.sort_order, tier.sort_order
  limit 1;

  if target_class_id is null then
    raise exception 'An active ranked class is required for uploader boundary acceptance';
  end if;
  select class_record.id, rank_record.id, tier.id
  into other_class_id, other_rank_id, other_sub_rank_id
  from public.classes as class_record
  join public.ranks as rank_record on rank_record.class_id = class_record.id
  join public.sub_ranks as tier on tier.rank_id = rank_record.id
  where class_record.is_active = true
    and class_record.id <> target_class_id
    and not exists (
      select 1 from public.repository_uploader_assignments as assignment
      where assignment.user_id = member_id
        and assignment.class_id = class_record.id
        and assignment.active = true
    )
  order by class_record.name, rank_record.sort_order, tier.sort_order
  limit 1;

  if other_class_id is null then
    -- A single-class staging catalog cannot exercise a real cross-class row.
    -- Retain a fail-closed helper/RPC denial and make the reduced coverage loud.
    other_class_id := 'ffffffff-ffff-4fff-8fff-ffffffffffff';
    other_rank_id := target_rank_id;
    other_sub_rank_id := target_sub_rank_id;
    raise notice 'REPOSITORY DATA NOTICE: no second eligible class exists; cross-class denial uses a nonexistent class fallback';
  else
    used_real_other_class := true;
  end if;

  select count(*) into uploader_audit_before
  from public.repository_uploader_assignment_audit;

  perform set_config('request.jwt.claim.sub', admin_id::text, false);
  begin
    perform public.assign_repository_uploader(member_id, target_class_id);
    raise exception 'Scoped Admin unexpectedly appointed a Repository Uploader';
  exception when insufficient_privilege then
    null;
  end;

  perform set_config('request.jwt.claim.sub', super_id::text, false);
  perform public.assign_repository_uploader(member_id, target_class_id);

  -- A reserved timestamp gives the independent postflight a deterministic
  -- residue marker if the enclosing rollback is ever defeated.
  update public.repository_uploader_assignments
  set assigned_at = timestamptz '1900-01-02 03:04:05+00'
  where user_id = member_id
    and class_id = target_class_id
    and active = true;

  perform set_config('request.jwt.claim.sub', member_id::text, false);
  if not public.is_repository_uploader(target_class_id, member_id) then
    raise exception 'Appointed Member did not receive exact-class upload authority';
  end if;
  if public.is_repository_uploader(other_class_id, member_id) then
    raise exception 'Repository Uploader authority crossed the class boundary';
  end if;
  if public.is_repository_uploader(target_class_id, super_id) then
    raise exception 'Repository Uploader helper accepted a spoofed caller identity';
  end if;

  select public.create_repository_content(
    target_class_id,
    target_rank_id,
    target_sub_rank_id,
    '__JWG_STAGING_ACCEPTANCE_052__',
    'rollback-contained',
    'youtube',
    'dQw4w9WgXcQ',
    'draft',
    99991
  ) into content_id;

  perform public.update_repository_content(
    content_id,
    '__JWG_STAGING_ACCEPTANCE_052_UPDATED__',
    'rollback-contained update',
    'youtube',
    'dQw4w9WgXcQ',
    'draft',
    99992
  );
  perform public.delete_repository_content(content_id);

  begin
    perform public.create_repository_content(
      other_class_id,
      other_rank_id,
      other_sub_rank_id,
      '__JWG_CROSS_CLASS_DENIAL__',
      null,
      'youtube',
      'dQw4w9WgXcQ',
      'draft',
      99993
    );
    raise exception 'Repository Uploader unexpectedly crossed the class boundary';
  exception when insufficient_privilege then
    null;
  end;

  perform set_config('request.jwt.claim.sub', admin_id::text, false);
  begin
    perform public.create_repository_content(
      target_class_id,
      target_rank_id,
      target_sub_rank_id,
      '__JWG_ADMIN_DENIAL__',
      null,
      'youtube',
      'dQw4w9WgXcQ',
      'draft',
      99994
    );
    raise exception 'Unappointed Admin unexpectedly published repository content';
  exception when insufficient_privilege then
    null;
  end;

  perform set_config('request.jwt.claim.sub', super_id::text, false);
  select public.create_repository_content(
    target_class_id,
    target_rank_id,
    target_sub_rank_id,
    '__JWG_SUPER_ACCEPTANCE_052__',
    null,
    'youtube',
    'dQw4w9WgXcQ',
    'draft',
    99995
  ) into content_id;
  perform public.delete_repository_content(content_id);
  perform public.revoke_repository_uploader(member_id, target_class_id);

  if (select count(*) from public.repository_uploader_assignment_audit)
       <> uploader_audit_before + 2 then
    raise exception 'Uploader appointment/revocation did not append exactly two audit rows';
  end if;

  perform set_config('request.jwt.claim.sub', member_id::text, false);
  begin
    perform public.create_repository_content(
      target_class_id,
      target_rank_id,
      target_sub_rank_id,
      '__JWG_REVOKED_DENIAL__',
      null,
      'youtube',
      'dQw4w9WgXcQ',
      'draft',
      99996
    );
    raise exception 'Revoked Repository Uploader retained write authority';
  exception when insufficient_privilege then
    null;
  end;

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

  if used_real_other_class then
    raise notice 'REPOSITORY DATA PASS: real cross-class denial exercised against class %', other_class_id;
  end if;

  raise exception using
    errcode = 'P0001',
    message = 'ROLLBACK-CONTAINED PASS: migrations 048-052 staging acceptance';
end
$acceptance$;
