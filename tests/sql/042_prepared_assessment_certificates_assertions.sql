begin;

-- Add two transaction-local candidates so the result announcement proves both
-- dojo grouping and highest-to-lowest destination-rank ordering.
insert into public.profiles (
  id, full_name, avatar_url, is_grading_assessor, account_status
) values
  (
    '30000000-0000-0000-0000-000000000006',
    'High Rank Candidate', '/high-rank.png', false, 'active'
  ),
  (
    '30000000-0000-0000-0000-000000000007',
    'South Candidate', '/south.png', false, 'active'
  );

insert into public.class_memberships (
  id, user_id, class_id, dojo_id, status, rank_id, sub_rank_id, level
) values
  (
    '50000000-0000-0000-0000-000000000006',
    '30000000-0000-0000-0000-000000000006',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'active',
    '60000000-0000-0000-0000-000000000002',
    '70000000-0000-0000-0000-000000000002',
    'mudansha'
  ),
  (
    '50000000-0000-0000-0000-000000000007',
    '30000000-0000-0000-0000-000000000007',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000002',
    'active',
    '60000000-0000-0000-0000-000000000001',
    '70000000-0000-0000-0000-000000000001',
    'mudansha'
  );

insert into public.membership_grade_history (
  membership_id, rank_id, sub_rank_id, effective_date, created_by,
  assessor_type, assessor_member_id, assessor_name_snapshot
)
select membership.id, membership.rank_id, membership.sub_rank_id,
  date '2026-01-10', '00000000-0000-0000-0000-000000000001',
  'member', '00000000-0000-0000-0000-000000000004', 'Test Assessor'
from public.class_memberships as membership
where membership.id in (
  '50000000-0000-0000-0000-000000000006',
  '50000000-0000-0000-0000-000000000007'
);

set role authenticated;
select set_config('app.current_uid', '00000000-0000-0000-0000-000000000001', false);

do $incomplete_results_denied$
declare prepared_result jsonb;
begin
  prepared_result := public.prepare_bulk_assessment(
    '91000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    (timezone('Asia/Jakarta', now()))::date,
    '00000000-0000-0000-0000-000000000004',
    'External Sensei',
    null,
    '[
      {"membership_id":"50000000-0000-0000-0000-000000000001","expected_rank_to_id":"60000000-0000-0000-0000-000000000002","expected_sub_rank_to_id":"70000000-0000-0000-0000-000000000002"},
      {"membership_id":"50000000-0000-0000-0000-000000000002","expected_rank_to_id":"60000000-0000-0000-0000-000000000002","expected_sub_rank_to_id":"70000000-0000-0000-0000-000000000002"},
      {"membership_id":"50000000-0000-0000-0000-000000000006","expected_rank_to_id":"60000000-0000-0000-0000-000000000003","expected_sub_rank_to_id":null},
      {"membership_id":"50000000-0000-0000-0000-000000000007","expected_rank_to_id":"60000000-0000-0000-0000-000000000002","expected_sub_rank_to_id":"70000000-0000-0000-0000-000000000002"}
    ]'::jsonb
  );

  begin
    perform public.finalize_prepared_bulk_assessment(
      (prepared_result ->> 'prepared_assessment_id')::uuid,
      '92000000-0000-0000-0000-000000000001',
      '[{"membership_id":"50000000-0000-0000-0000-000000000001","outcome":"pass"}]'::jsonb
    );
    raise exception 'Incomplete result set unexpectedly succeeded';
  exception
    when others then
      if sqlerrm <> 'Every prepared candidate must receive exactly one Pass or Fail result' then
        raise;
      end if;
  end;
end
$incomplete_results_denied$;

reset role;

do $pending_preparation_assertions$
declare prepared_id uuid;
begin
  select id into strict prepared_id
  from public.prepared_assessments
  where preparation_key = '91000000-0000-0000-0000-000000000001';

  if (select count(*) from public.prepared_assessment_candidates
      where prepared_assessment_id = prepared_id) <> 4
     or (select count(*)
         from public.prepared_assessment_certificates as certificate
         join public.prepared_assessment_candidates as candidate
           on candidate.id = certificate.prepared_candidate_id
         where candidate.prepared_assessment_id = prepared_id
           and certificate.status = 'pending') <> 4 then
    raise exception 'Prepared roster or pending certificates are incomplete';
  end if;
end
$pending_preparation_assertions$;

set role authenticated;
select public.record_prepared_assessment_certificate_print(
  (select prepared_assessment_id
   from public.get_prepared_bulk_assessments()
   where status = 'pending'
   limit 1)
);

do $finalize_all_results$
declare prepared_id uuid;
declare finalized jsonb;
declare retry_result jsonb;
begin
  select prepared_assessment_id into strict prepared_id
  from public.get_prepared_bulk_assessments()
  where status = 'pending'
  limit 1;

  finalized := public.finalize_prepared_bulk_assessment(
    prepared_id,
    '92000000-0000-0000-0000-000000000002',
    '[
      {"membership_id":"50000000-0000-0000-0000-000000000001","outcome":"pass","instructor_name":"Sensei One","notes":"Passed"},
      {"membership_id":"50000000-0000-0000-0000-000000000002","outcome":"fail","instructor_name":"Sensei Two","notes":"Reassess"},
      {"membership_id":"50000000-0000-0000-0000-000000000006","outcome":"pass","instructor_name":"Senior Sensei","notes":"Passed"},
      {"membership_id":"50000000-0000-0000-0000-000000000007","outcome":"pass","instructor_name":"South Sensei","notes":"Passed"}
    ]'::jsonb
  );
  if finalized ->> 'idempotent' <> 'false'
     or (finalized ->> 'passed_count')::integer <> 3
     or (finalized ->> 'failed_count')::integer <> 1 then
    raise exception 'Prepared assessment final summary is incorrect';
  end if;

  retry_result := public.finalize_prepared_bulk_assessment(
    prepared_id,
    '92000000-0000-0000-0000-000000000002',
    '[]'::jsonb
  );
  if retry_result ->> 'idempotent' <> 'true' then
    raise exception 'Prepared assessment finalization is not idempotent';
  end if;
end
$finalize_all_results$;

reset role;

do $issued_voided_and_announcement$
declare prepared_id uuid;
declare result_batch uuid;
declare announcement_message text;
begin
  select id, result_batch_id into strict prepared_id, result_batch
  from public.prepared_assessments
  where preparation_key = '91000000-0000-0000-0000-000000000001'
    and status = 'submitted';

  if not exists (
    select 1
    from public.prepared_assessment_certificates as certificate
    join public.prepared_assessment_candidates as candidate
      on candidate.id = certificate.prepared_candidate_id
    where candidate.prepared_assessment_id = prepared_id
      and candidate.membership_id = '50000000-0000-0000-0000-000000000001'
      and certificate.status = 'issued'
      and certificate.promotion_history_id is not null
      and certificate.print_count = 1
  ) or not exists (
    select 1
    from public.prepared_assessment_certificates as certificate
    join public.prepared_assessment_candidates as candidate
      on candidate.id = certificate.prepared_candidate_id
    where candidate.prepared_assessment_id = prepared_id
      and candidate.membership_id = '50000000-0000-0000-0000-000000000002'
      and certificate.status = 'voided'
      and certificate.promotion_history_id is null
      and certificate.print_count = 1
  ) then
    raise exception 'Pass certificate was not issued or Fail certificate was not voided';
  end if;

  select announcement.message into strict announcement_message
    from public.assessment_batches as batch
    join public.announcements as announcement on announcement.id = batch.announcement_id
    where batch.id = result_batch
      and announcement.title like 'Congratulations — %'
      and announcement.message not like '%Bob Candidate%';

  if announcement_message not like '%North Dojo: High Rank Candidate, Fifth Kyu - Yellow Belt to First Dan%'
     or announcement_message not like '%North Dojo: Alice Candidate, Sixth Kyu - White Belt to Fifth Kyu - Yellow Belt%'
     or announcement_message not like '%South Dojo: South Candidate, Sixth Kyu - White Belt to Fifth Kyu - Yellow Belt%'
     or position('North Dojo: High Rank Candidate' in announcement_message)
          >= position('North Dojo: Alice Candidate' in announcement_message)
     or position('North Dojo: Alice Candidate' in announcement_message)
          >= position('South Dojo: South Candidate' in announcement_message) then
    raise exception 'Pass-only congratulations announcement is incorrect';
  end if;
end
$issued_voided_and_announcement$;

set role authenticated;
select set_config('app.current_uid', '00000000-0000-0000-0000-000000000002', false);
do $class_admin_denied$
begin
  perform public.prepare_bulk_assessment(
    '91000000-0000-0000-0000-000000000099',
    '10000000-0000-0000-0000-000000000001',
    (timezone('Asia/Jakarta', now()))::date,
    '00000000-0000-0000-0000-000000000004', null, null,
    '[{"membership_id":"50000000-0000-0000-0000-000000000001","expected_rank_to_id":"60000000-0000-0000-0000-000000000002","expected_sub_rank_to_id":"70000000-0000-0000-0000-000000000002"}]'::jsonb
  );
  raise exception 'Class Admin unexpectedly prepared an assessment';
exception
  when others then
    if sqlerrm <> 'Only an active Super Admin can prepare assessments' then raise; end if;
end
$class_admin_denied$;

reset role;

do $acl_assertions$
begin
  if has_table_privilege('authenticated', 'public.prepared_assessments', 'SELECT')
     or has_table_privilege('authenticated', 'public.prepared_assessment_candidates', 'SELECT')
     or has_table_privilege('authenticated', 'public.prepared_assessment_certificates', 'SELECT')
     or has_function_privilege(
       'authenticated',
       'public.submit_bulk_assessment(uuid,uuid,date,uuid,text,uuid,jsonb)',
       'EXECUTE'
     ) then
    raise exception 'Prepared assessment browser ACLs are not closed';
  end if;
end
$acl_assertions$;

select json_build_object(
  'status', 'PASS',
  'checks', 9,
  'completeRosterRequired', true,
  'pendingCertificatesPrepared', true,
  'printAuditedWhilePending', true,
  'passCertificateIssued', true,
  'failCertificateVoided', true,
  'promotionAndFailBoundary', true,
  'congratulationsPassOnlyAndOrderedByDojoRank', true,
  'idempotentFinalization', true,
  'superAdminAndAclBoundary', true
);

rollback;
