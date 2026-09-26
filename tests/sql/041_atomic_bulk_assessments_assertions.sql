set role authenticated;
select set_config('app.current_uid', '00000000-0000-0000-0000-000000000002', false);

-- Candidate reads are limited to active, manageable, promotable rows and may
-- be narrowed to a home dojo.
do $candidate_scope$
declare
  candidate_count integer;
begin
  select count(*) into candidate_count
  from public.get_bulk_assessment_candidates(
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001'
  );

  if candidate_count <> 2 then
    raise exception 'Candidate RPC returned % rows instead of 2', candidate_count;
  end if;

  if not exists (
    select 1
    from public.get_bulk_assessment_candidates(
      '10000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000001'
    )
    where membership_id = '50000000-0000-0000-0000-000000000001'
      and full_name = 'Alice Candidate'
      and avatar_url = '/alice.png'
      and dojo_name = 'North Dojo'
      and rank_before_name = 'Sixth Kyu'
      and rank_to_name = 'Fifth Kyu'
      and sub_rank_to_name = 'Yellow Belt'
      and level_to = 'mudansha'
  ) then
    raise exception 'Candidate RPC did not return the required assessment details';
  end if;
end
$candidate_scope$;

-- Disabled or deceased profiles cannot be used as Member assessors, even when
-- the grading-assessor flag remains set.
reset role;
update public.profiles
set account_status = 'disabled'
where id = '00000000-0000-0000-0000-000000000004';
set role authenticated;

do $disabled_assessor_denied$
begin
  perform public.submit_bulk_assessment(
    '90000000-0000-0000-0000-000000000010',
    '10000000-0000-0000-0000-000000000001',
    date '2026-01-31',
    '00000000-0000-0000-0000-000000000004',
    null,
    '20000000-0000-0000-0000-000000000001',
    '[{"membership_id":"50000000-0000-0000-0000-000000000001","outcome":"pass","expected_rank_to_id":"60000000-0000-0000-0000-000000000002","expected_sub_rank_to_id":"70000000-0000-0000-0000-000000000002"}]'::jsonb
  );
  raise exception 'Disabled assessor unexpectedly accepted';
exception
  when others then
    if sqlerrm <> 'Selected Member is not an active Grading Assessor' then raise; end if;
end
$disabled_assessor_denied$;

reset role;
update public.profiles
set account_status = 'active', date_of_passing = date '2025-12-01'
where id = '00000000-0000-0000-0000-000000000004';
set role authenticated;

do $deceased_assessor_denied$
begin
  perform public.submit_bulk_assessment(
    '90000000-0000-0000-0000-000000000011',
    '10000000-0000-0000-0000-000000000001',
    date '2026-01-31',
    '00000000-0000-0000-0000-000000000004',
    null,
    '20000000-0000-0000-0000-000000000001',
    '[{"membership_id":"50000000-0000-0000-0000-000000000001","outcome":"pass","expected_rank_to_id":"60000000-0000-0000-0000-000000000002","expected_sub_rank_to_id":"70000000-0000-0000-0000-000000000002"}]'::jsonb
  );
  raise exception 'Deceased assessor unexpectedly accepted';
exception
  when others then
    if sqlerrm <> 'Selected Member is not an active Grading Assessor' then raise; end if;
end
$deceased_assessor_denied$;

reset role;
update public.profiles
set date_of_passing = null
where id = '00000000-0000-0000-0000-000000000004';
set role authenticated;

-- All candidates are prevalidated before any promotion, result, batch or
-- notification write survives.
do $atomic_rejection$
begin
  perform public.submit_bulk_assessment(
    '90000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    date '2026-02-01',
    '00000000-0000-0000-0000-000000000004',
    null,
    '20000000-0000-0000-0000-000000000001',
    '[
      {"membership_id":"50000000-0000-0000-0000-000000000001","outcome":"pass","expected_rank_to_id":"60000000-0000-0000-0000-000000000002","expected_sub_rank_to_id":"70000000-0000-0000-0000-000000000002"},
      {"membership_id":"50000000-0000-0000-0000-000000000003","outcome":"pass","expected_rank_to_id":"60000000-0000-0000-0000-000000000002","expected_sub_rank_to_id":"70000000-0000-0000-0000-000000000002"}
    ]'::jsonb
  );
  raise exception 'Invalid batch unexpectedly succeeded';
exception
  when others then
    if sqlerrm not like 'Membership % is not active' then raise; end if;
end
$atomic_rejection$;

reset role;

do $atomic_rejection_assertions$
begin
  if exists (
    select 1 from public.assessment_batches
    where submission_key = '90000000-0000-0000-0000-000000000001'
  ) or exists (
    select 1 from public.assessment_results
  ) or exists (
    select 1 from public.notifications
  ) then
    raise exception 'Rejected batch left audit or notification rows';
  end if;

  if not exists (
    select 1 from public.class_memberships
    where id = '50000000-0000-0000-0000-000000000001'
      and rank_id = '60000000-0000-0000-0000-000000000001'
  ) then
    raise exception 'Rejected batch changed a candidate rank';
  end if;
end
$atomic_rejection_assertions$;

set role authenticated;

-- One submit records every outcome, but promotes and notifies passes only.
select public.submit_bulk_assessment(
  '90000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000001',
  date '2026-02-02',
  '00000000-0000-0000-0000-000000000004',
  null,
  '20000000-0000-0000-0000-000000000001',
  '[
    {
      "membership_id":"50000000-0000-0000-0000-000000000001",
      "outcome":"pass",
      "expected_rank_to_id":"60000000-0000-0000-0000-000000000002",
      "expected_sub_rank_to_id":"70000000-0000-0000-0000-000000000002",
      "notes":"Strong grading",
      "instructor_name":"  Sensei   One  "
    },
    {
      "membership_id":"50000000-0000-0000-0000-000000000002",
      "outcome":"fail",
      "expected_rank_to_id":"60000000-0000-0000-0000-000000000002",
      "expected_sub_rank_to_id":"70000000-0000-0000-0000-000000000002",
      "notes":"Re-assess later",
      "instructor_name":"Sensei Two"
    }
  ]'::jsonb
);

reset role;

do $successful_batch_assertions$
declare
  batch_record public.assessment_batches%rowtype;
begin
  select * into strict batch_record
  from public.assessment_batches
  where submission_key = '90000000-0000-0000-0000-000000000002';

  if batch_record.candidate_count <> 2
     or batch_record.passed_count <> 1
     or batch_record.failed_count <> 1
     or batch_record.member_assessor_name_snapshot <> 'Test Assessor'
     or batch_record.announcement_id is null then
    raise exception 'Batch summary or assessor snapshot is incorrect';
  end if;

  if (select count(*) from public.assessment_results
      where batch_id = batch_record.id) <> 2 then
    raise exception 'Not every assessment outcome was recorded';
  end if;

  if not exists (
    select 1 from public.assessment_results
    where batch_id = batch_record.id
      and membership_id = '50000000-0000-0000-0000-000000000001'
      and outcome = 'pass'
      and assessment_date = date '2026-02-02'
      and promotion_history_id is not null
      and instructor_name_snapshot = 'Sensei One'
      and rank_before_name_snapshot = 'Sixth Kyu'
      and rank_to_name_snapshot = 'Fifth Kyu'
      and assessor_type = 'member'
      and assessor_name_snapshot = 'Test Assessor'
  ) then
    raise exception 'Pass result snapshots are incorrect';
  end if;

  if not exists (
    select 1 from public.assessment_results
    where batch_id = batch_record.id
      and membership_id = '50000000-0000-0000-0000-000000000002'
      and outcome = 'fail'
      and promotion_history_id is null
      and notes = 'Re-assess later'
  ) then
    raise exception 'Fail result was not preserved without a promotion';
  end if;

  if not exists (
    select 1 from public.class_memberships
    where id = '50000000-0000-0000-0000-000000000001'
      and rank_id = '60000000-0000-0000-0000-000000000002'
      and sub_rank_id = '70000000-0000-0000-0000-000000000002'
  ) or not exists (
    select 1 from public.class_memberships
    where id = '50000000-0000-0000-0000-000000000002'
      and rank_id = '60000000-0000-0000-0000-000000000001'
      and sub_rank_id = '70000000-0000-0000-0000-000000000001'
  ) then
    raise exception 'Pass-only membership mutation is incorrect';
  end if;

  if (select count(*) from public.notifications) <> 1
     or not exists (
       select 1 from public.notifications
       where user_id = '30000000-0000-0000-0000-000000000001'
         and notification_type = 'grade_promoted'
         and reference_type = 'assessment_batch'
         and reference_id = batch_record.id
     ) then
    raise exception 'Pass-only grade notification is incorrect';
  end if;

  if (select count(*) from public.announcements) <> 1
     or not exists (
       select 1 from public.announcements
       where id = batch_record.announcement_id
         and class_id = '10000000-0000-0000-0000-000000000001'
         and published = true
         and announcement_type = 'grading_results'
         and message like '%Alice Candidate — Fifth Kyu - Yellow Belt%'
         and message not like '%Bob Candidate%'
     ) then
    raise exception 'The single pass summary announcement is incorrect';
  end if;
end
$successful_batch_assertions$;

set role authenticated;

-- An identical retry returns the original batch without duplicating effects.
do $idempotent_retry$
declare
  retry_result jsonb;
begin
  retry_result := public.submit_bulk_assessment(
    '90000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    date '2026-02-02',
    '00000000-0000-0000-0000-000000000004',
    null,
    '20000000-0000-0000-0000-000000000001',
    '[
      {
        "membership_id":"50000000-0000-0000-0000-000000000002",
        "outcome":"fail",
        "expected_rank_to_id":"60000000-0000-0000-0000-000000000002",
        "expected_sub_rank_to_id":"70000000-0000-0000-0000-000000000002",
        "notes":"Re-assess later",
        "instructor_name":"Sensei Two"
      },
      {
        "membership_id":"50000000-0000-0000-0000-000000000001",
        "outcome":"pass",
        "expected_rank_to_id":"60000000-0000-0000-0000-000000000002",
        "expected_sub_rank_to_id":"70000000-0000-0000-0000-000000000002",
        "notes":"Strong grading",
        "instructor_name":"Sensei One"
      }
    ]'::jsonb
  );

  if retry_result ->> 'idempotent' <> 'true'
     or retry_result ->> 'announcement_id' is null then
    raise exception 'Idempotent retry did not return the original batch';
  end if;
end
$idempotent_retry$;

reset role;

do $idempotent_retry_assertions$
begin
  if (select count(*) from public.assessment_batches) <> 1
     or (select count(*) from public.assessment_results) <> 2
     or (select count(*) from public.notifications) <> 1
     or (select count(*) from public.announcements) <> 1 then
    raise exception 'Idempotent retry duplicated batch effects';
  end if;
end
$idempotent_retry_assertions$;

set role authenticated;

-- Reusing a key with different decisions is rejected.
do $idempotency_conflict$
begin
  perform public.submit_bulk_assessment(
    '90000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    date '2026-02-02',
    '00000000-0000-0000-0000-000000000004',
    null,
    '20000000-0000-0000-0000-000000000001',
    '[{"membership_id":"50000000-0000-0000-0000-000000000002","outcome":"pass","expected_rank_to_id":"60000000-0000-0000-0000-000000000002","expected_sub_rank_to_id":"70000000-0000-0000-0000-000000000002"}]'::jsonb
  );
  raise exception 'Conflicting idempotency payload unexpectedly succeeded';
exception
  when others then
    if sqlerrm <> 'Submission key was already used for a different assessment' then
      raise;
    end if;
end
$idempotency_conflict$;

-- A second key cannot assess the same membership twice on one date.
do $duplicate_member_date$
begin
  perform public.submit_bulk_assessment(
    '90000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    date '2026-02-02',
    '00000000-0000-0000-0000-000000000004',
    null,
    '20000000-0000-0000-0000-000000000001',
    '[{"membership_id":"50000000-0000-0000-0000-000000000002","outcome":"fail","expected_rank_to_id":"60000000-0000-0000-0000-000000000002","expected_sub_rank_to_id":"70000000-0000-0000-0000-000000000002"}]'::jsonb
  );
  raise exception 'Duplicate same-day assessment unexpectedly succeeded';
exception
  when others then
    if sqlerrm not like 'Membership % already has an assessment recorded for %' then
      raise;
    end if;
end
$duplicate_member_date$;

-- An all-fail re-assessment is audited but does not create an announcement,
-- promotion, personal grade notification or membership mutation.
do $all_fail$
declare
  result jsonb;
begin
  result := public.submit_bulk_assessment(
    '90000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000001',
    date '2026-02-03',
    '00000000-0000-0000-0000-000000000004',
    null,
    '20000000-0000-0000-0000-000000000001',
    '[{"membership_id":"50000000-0000-0000-0000-000000000002","outcome":"fail","expected_rank_to_id":"60000000-0000-0000-0000-000000000002","expected_sub_rank_to_id":"70000000-0000-0000-0000-000000000002"}]'::jsonb
  );

  if result ->> 'announcement_id' is not null then
    raise exception 'All-fail submission returned an announcement';
  end if;
end
$all_fail$;

reset role;

do $all_fail_assertions$
begin
  if (select count(*) from public.announcements) <> 1
     or (select count(*) from public.notifications) <> 1
     or not exists (
       select 1 from public.class_memberships
       where id = '50000000-0000-0000-0000-000000000002'
         and rank_id = '60000000-0000-0000-0000-000000000001'
     ) then
    raise exception 'All-fail submission produced a promotion or announcement side effect';
  end if;
end
$all_fail_assertions$;

set role authenticated;

-- Class scope applies to both read and submit RPCs.
select set_config('app.current_uid', '00000000-0000-0000-0000-000000000003', false);
do $ordinary_member_denied$
begin
  perform public.get_bulk_assessment_candidates(
    '10000000-0000-0000-0000-000000000001', null
  );
  raise exception 'Ordinary Member unexpectedly read assessment candidates';
exception
  when others then
    if sqlerrm <> 'Not authorised to manage this class' then raise; end if;
end
$ordinary_member_denied$;

reset role;

do $acl_and_shape$
declare
  definition text;
begin
  select pg_get_functiondef(
    'public.submit_bulk_assessment(uuid,uuid,date,uuid,text,uuid,jsonb)'::regprocedure
  ) into definition;

  if position('ORDER BY MEMBERSHIP.ID' in upper(definition)) = 0
     or position('ORDER BY MEMBERSHIP.ID' in upper(definition))
        > position('FOR UPDATE OF MEMBERSHIP' in upper(definition)) then
    raise exception 'Submit RPC does not take deterministic row locks';
  end if;

  if has_table_privilege('authenticated', 'public.assessment_batches', 'SELECT')
     or has_table_privilege('authenticated', 'public.assessment_results', 'SELECT')
     or has_function_privilege(
       'anon', 'public.get_bulk_assessment_candidates(uuid,uuid)', 'EXECUTE'
     )
     or has_function_privilege(
       'anon',
       'public.submit_bulk_assessment(uuid,uuid,date,uuid,text,uuid,jsonb)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'authenticated', 'public.get_bulk_assessment_candidates(uuid,uuid)', 'EXECUTE'
     )
     or not has_function_privilege(
       'authenticated',
       'public.submit_bulk_assessment(uuid,uuid,date,uuid,text,uuid,jsonb)',
       'EXECUTE'
     ) then
    raise exception 'Bulk assessment ACLs are incorrect';
  end if;

  raise notice 'MIGRATION_041_RUNTIME_PASS';
end
$acl_and_shape$;

select json_build_object(
  'status', 'PASS',
  'checks', 14,
  'candidateScope', true,
  'requiredDetails', true,
  'disabledAssessorDenied', true,
  'deceasedAssessorDenied', true,
  'fullPrevalidation', true,
  'passOnlyPromotion', true,
  'failPersistence', true,
  'passOnlyNotification', true,
  'singlePublishedAnnouncement', true,
  'sameDayDuplicateRejected', true,
  'allFailNoAnnouncement', true,
  'idempotentRetry', true,
  'idempotencyConflict', true,
  'aclAndLocks', true
);
