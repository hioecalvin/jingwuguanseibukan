-- Persist an assessment roster before grading, reserve and print pending
-- certificates, then atomically issue or void them with the complete result set.

begin;

do $preflight$
begin
  if to_regclass('public.assessment_batches') is null
     or to_regclass('public.assessment_results') is null
     or to_regprocedure('public.is_super_admin(uuid)') is null
     or to_regprocedure('public.get_bulk_assessment_candidates(uuid,uuid)') is null
     or to_regprocedure(
       'public.submit_bulk_assessment(uuid,uuid,date,uuid,text,uuid,jsonb)'
     ) is null then
    raise exception 'Migration 041 bulk-assessment objects are required';
  end if;
end
$preflight$;

create sequence public.prepared_assessment_certificate_number_seq;
revoke all on sequence public.prepared_assessment_certificate_number_seq
  from public, anon, authenticated;

create table public.prepared_assessments (
  id uuid primary key default gen_random_uuid(),
  preparation_key uuid not null,
  class_id uuid not null references public.classes(id),
  dojo_id uuid references public.dojos(id),
  assessment_date date not null,
  member_assessor_id uuid references public.profiles(id),
  external_assessor_name text,
  status text not null default 'pending'
    check (status in ('pending', 'submitted')),
  candidate_count integer not null check (candidate_count > 0),
  request_payload jsonb not null,
  result_batch_id uuid unique references public.assessment_batches(id),
  finalization_key uuid,
  prepared_by uuid not null references public.profiles(id),
  prepared_at timestamptz not null default clock_timestamp(),
  submitted_by uuid references public.profiles(id),
  submitted_at timestamptz,
  constraint prepared_assessments_key_unique
    unique (prepared_by, preparation_key),
  constraint prepared_assessments_submission_check check (
    (status = 'pending' and result_batch_id is null and finalization_key is null
      and submitted_by is null and submitted_at is null)
    or
    (status = 'submitted' and result_batch_id is not null
      and finalization_key is not null and submitted_by is not null
      and submitted_at is not null)
  )
);

create table public.prepared_assessment_candidates (
  id uuid primary key default gen_random_uuid(),
  prepared_assessment_id uuid not null
    references public.prepared_assessments(id) on delete restrict,
  membership_id uuid not null references public.class_memberships(id),
  user_id uuid not null references public.profiles(id),
  member_name_snapshot text not null,
  avatar_url_snapshot text,
  member_id_snapshot text,
  aikikai_registration_number_snapshot text,
  class_id uuid not null references public.classes(id),
  class_name_snapshot text not null,
  class_logo_url_snapshot text,
  dojo_id uuid references public.dojos(id),
  dojo_name_snapshot text,
  rank_before_id uuid references public.ranks(id),
  rank_before_name_snapshot text,
  sub_rank_before_id uuid references public.sub_ranks(id),
  sub_rank_before_name_snapshot text,
  rank_to_id uuid not null references public.ranks(id),
  rank_to_name_snapshot text not null,
  sub_rank_to_id uuid references public.sub_ranks(id),
  sub_rank_to_name_snapshot text,
  is_rank_promotion boolean not null,
  level_to text not null check (level_to in ('mudansha', 'yudansha')),
  constraint prepared_assessment_candidates_unique
    unique (prepared_assessment_id, membership_id)
);

create table public.prepared_assessment_certificates (
  id uuid primary key default gen_random_uuid(),
  prepared_candidate_id uuid not null unique
    references public.prepared_assessment_candidates(id) on delete restrict,
  certificate_number text not null unique default (
    'JSG-' || to_char(current_date, 'YYYY') || '-'
    || lpad(nextval('public.prepared_assessment_certificate_number_seq')::text, 7, '0')
  ),
  status text not null default 'pending'
    check (status in ('pending', 'issued', 'voided')),
  promotion_history_id uuid unique references public.membership_grade_history(id),
  prepared_by uuid not null references public.profiles(id),
  prepared_at timestamptz not null default clock_timestamp(),
  issued_at timestamptz,
  voided_at timestamptz,
  print_count integer not null default 0 check (print_count >= 0),
  first_printed_at timestamptz,
  latest_printed_at timestamptz,
  constraint prepared_assessment_certificate_status_check check (
    (status = 'pending' and promotion_history_id is null
      and issued_at is null and voided_at is null)
    or
    (status = 'issued' and promotion_history_id is not null
      and issued_at is not null and voided_at is null)
    or
    (status = 'voided' and promotion_history_id is null
      and issued_at is null and voided_at is not null)
  )
);

create index prepared_assessments_pending_idx
  on public.prepared_assessments (assessment_date, prepared_at desc)
  where status = 'pending';

alter table public.prepared_assessments enable row level security;
alter table public.prepared_assessment_candidates enable row level security;
alter table public.prepared_assessment_certificates enable row level security;

revoke all on table public.prepared_assessments,
  public.prepared_assessment_candidates,
  public.prepared_assessment_certificates
from public, anon, authenticated;

grant select on table public.prepared_assessments,
  public.prepared_assessment_candidates,
  public.prepared_assessment_certificates
to service_role;

create or replace function public.is_active_super_admin(caller_id uuid)
returns boolean
language sql
stable
security definer
set search_path to public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles as profile
    where profile.id = caller_id
      and public.is_super_admin(caller_id)
      and profile.account_status::text = 'active'
      and profile.date_of_passing is null
  )
$$;

alter function public.is_active_super_admin(uuid) owner to postgres;
revoke all on function public.is_active_super_admin(uuid)
  from public, anon, authenticated;
grant execute on function public.is_active_super_admin(uuid) to service_role;

create or replace function public.prepare_bulk_assessment(
  preparation_key uuid,
  target_class_id uuid,
  assessment_date date,
  assessor_member_id uuid default null,
  external_assessor_name text default null,
  target_dojo_id uuid default null,
  selected_candidates jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  existing_preparation public.prepared_assessments%rowtype;
  selected record;
  candidate record;
  profile_details record;
  class_logo text;
  normalized_external text := nullif(
    regexp_replace(btrim(external_assessor_name), '\s+', ' ', 'g'), ''
  );
  normalized_candidates jsonb;
  normalized_request jsonb;
  prepared_id uuid;
  prepared_candidate_id uuid;
  candidate_total integer;
  certificate_total integer := 0;
  needs_member_assessor boolean := false;
  needs_external_assessor boolean := false;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not public.is_active_super_admin(auth.uid()) then
    raise exception 'Only an active Super Admin can prepare assessments';
  end if;
  if preparation_key is null then raise exception 'Preparation key is required'; end if;
  if target_class_id is null then raise exception 'Class is required'; end if;
  if assessment_date is null then raise exception 'Assessment date is required'; end if;
  if assessment_date < (timezone('Asia/Jakarta', now()))::date then
    raise exception 'A new assessment cannot be prepared in the past';
  end if;
  if length(coalesce(external_assessor_name, '')) > 200 then
    raise exception 'External assessor name may contain at most 200 characters';
  end if;
  if jsonb_typeof(selected_candidates) <> 'array'
     or jsonb_array_length(selected_candidates) = 0
     or jsonb_array_length(selected_candidates) > 500 then
    raise exception 'Select between 1 and 500 assessment candidates';
  end if;
  if not public.can_manage_class(target_class_id, auth.uid()) then
    raise exception 'Not authorised to manage this class';
  end if;
  if target_dojo_id is not null and not exists (
    select 1 from public.dojos as dojo_record
    where dojo_record.id = target_dojo_id
      and dojo_record.class_id = target_class_id
  ) then
    raise exception 'Dojo is not part of this class';
  end if;
  if exists (
    select 1 from jsonb_array_elements(selected_candidates) as item(value)
    where jsonb_typeof(item.value) <> 'object'
       or jsonb_typeof(item.value -> 'membership_id') <> 'string'
       or jsonb_typeof(item.value -> 'expected_rank_to_id') <> 'string'
       or jsonb_typeof(item.value -> 'expected_sub_rank_to_id')
            not in ('string', 'null')
  ) then
    raise exception 'Each selected candidate requires membership_id and expected target grade IDs';
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'membership_id', parsed.membership_id,
      'expected_rank_to_id', parsed.expected_rank_to_id,
      'expected_sub_rank_to_id', parsed.expected_sub_rank_to_id
    ) order by parsed.membership_id
  )
  into normalized_candidates
  from jsonb_to_recordset(selected_candidates) as parsed(
    membership_id uuid,
    expected_rank_to_id uuid,
    expected_sub_rank_to_id uuid
  );

  if (select count(*) from jsonb_array_elements(normalized_candidates)) <>
     (select count(distinct (item ->> 'membership_id')::uuid)
      from jsonb_array_elements(normalized_candidates) as item) then
    raise exception 'A membership may appear only once';
  end if;

  normalized_request := jsonb_build_object(
    'class_id', target_class_id,
    'dojo_id', target_dojo_id,
    'assessment_date', assessment_date,
    'assessor_member_id', assessor_member_id,
    'external_assessor_name', normalized_external,
    'candidates', normalized_candidates
  );

  perform pg_advisory_xact_lock(
    hashtextextended(auth.uid()::text || ':' || preparation_key::text, 0)
  );
  select * into existing_preparation
  from public.prepared_assessments as prepared
  where prepared.prepared_by = auth.uid()
    and prepared.preparation_key = prepare_bulk_assessment.preparation_key;
  if found then
    if existing_preparation.request_payload is distinct from normalized_request then
      raise exception 'Preparation key was already used for a different roster';
    end if;
    return jsonb_build_object(
      'prepared_assessment_id', existing_preparation.id,
      'status', existing_preparation.status,
      'candidate_count', existing_preparation.candidate_count,
      'idempotent', true
    );
  end if;

  for selected in
    select parsed.*
    from jsonb_to_recordset(normalized_candidates) as parsed(
      membership_id uuid,
      expected_rank_to_id uuid,
      expected_sub_rank_to_id uuid
    )
    order by parsed.membership_id
  loop
    perform 1 from public.class_memberships as membership
    where membership.id = selected.membership_id
    for update;

    select * into candidate
    from public.get_bulk_assessment_candidates(target_class_id, target_dojo_id)
    where membership_id = selected.membership_id;
    if not found then
      raise exception 'Membership % is not eligible for this assessment', selected.membership_id;
    end if;
    if candidate.rank_to_id is distinct from selected.expected_rank_to_id
       or candidate.sub_rank_to_id is distinct from selected.expected_sub_rank_to_id then
      raise exception 'Assessment roster is stale for membership %; reload candidates',
        selected.membership_id;
    end if;
    needs_member_assessor := needs_member_assessor or candidate.level_to = 'mudansha';
    needs_external_assessor := needs_external_assessor or candidate.level_to = 'yudansha';
  end loop;

  if needs_member_assessor and not exists (
    select 1 from public.profiles as assessor
    where assessor.id = assessor_member_id
      and assessor.is_grading_assessor = true
      and assessor.account_status::text = 'active'
      and assessor.date_of_passing is null
  ) then
    raise exception 'Select an active Member grading assessor';
  end if;
  if needs_external_assessor and normalized_external is null then
    raise exception 'External assessor name is required for Yudansha grading';
  end if;

  candidate_total := jsonb_array_length(normalized_candidates);
  insert into public.prepared_assessments (
    preparation_key, class_id, dojo_id, assessment_date, member_assessor_id,
    external_assessor_name, candidate_count, request_payload, prepared_by
  ) values (
    preparation_key, target_class_id, target_dojo_id, assessment_date,
    case when needs_member_assessor then assessor_member_id else null end,
    case when needs_external_assessor then normalized_external else null end,
    candidate_total, normalized_request, auth.uid()
  ) returning id into prepared_id;

  select class_record.logo_url::text into class_logo
  from public.classes as class_record where class_record.id = target_class_id;

  for selected in
    select parsed.*
    from jsonb_to_recordset(normalized_candidates) as parsed(
      membership_id uuid,
      expected_rank_to_id uuid,
      expected_sub_rank_to_id uuid
    ) order by parsed.membership_id
  loop
    select * into strict candidate
    from public.get_bulk_assessment_candidates(target_class_id, target_dojo_id)
    where membership_id = selected.membership_id;
    select profile.member_id::text as member_id,
           profile.aikikai_registration_number::text as aikikai_registration_number
    into profile_details
    from public.profiles as profile where profile.id = candidate.user_id;

    insert into public.prepared_assessment_candidates (
      prepared_assessment_id, membership_id, user_id, member_name_snapshot,
      avatar_url_snapshot, member_id_snapshot,
      aikikai_registration_number_snapshot, class_id, class_name_snapshot,
      class_logo_url_snapshot, dojo_id, dojo_name_snapshot, rank_before_id,
      rank_before_name_snapshot, sub_rank_before_id, sub_rank_before_name_snapshot,
      rank_to_id, rank_to_name_snapshot, sub_rank_to_id, sub_rank_to_name_snapshot,
      is_rank_promotion, level_to
    ) values (
      prepared_id, candidate.membership_id, candidate.user_id, candidate.full_name,
      candidate.avatar_url, profile_details.member_id,
      profile_details.aikikai_registration_number, candidate.class_id,
      candidate.class_name, class_logo, candidate.dojo_id, candidate.dojo_name,
      candidate.rank_before_id, candidate.rank_before_name,
      candidate.sub_rank_before_id, candidate.sub_rank_before_name,
      candidate.rank_to_id, candidate.rank_to_name, candidate.sub_rank_to_id,
      candidate.sub_rank_to_name, candidate.is_rank_promotion, candidate.level_to
    ) returning id into prepared_candidate_id;

    if candidate.is_rank_promotion then
      insert into public.prepared_assessment_certificates (
        prepared_candidate_id, prepared_by
      ) values (prepared_candidate_id, auth.uid());
      certificate_total := certificate_total + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'prepared_assessment_id', prepared_id,
    'status', 'pending',
    'candidate_count', candidate_total,
    'certificate_count', certificate_total,
    'idempotent', false
  );
end;
$function$;

alter function public.prepare_bulk_assessment(uuid,uuid,date,uuid,text,uuid,jsonb)
  owner to postgres;

create or replace function public.get_prepared_bulk_assessments()
returns table (
  prepared_assessment_id uuid,
  class_id uuid,
  class_name text,
  dojo_id uuid,
  dojo_name text,
  assessment_date date,
  status text,
  candidate_count integer,
  certificate_count bigint,
  prepared_at timestamptz
)
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
begin
  if not public.is_active_super_admin(auth.uid()) then
    raise exception 'Only an active Super Admin can view prepared assessments';
  end if;
  return query
  select prepared.id, prepared.class_id, class_record.name::text,
    prepared.dojo_id, dojo_record.name::text, prepared.assessment_date,
    prepared.status, prepared.candidate_count, count(certificate.id),
    prepared.prepared_at
  from public.prepared_assessments as prepared
  join public.classes as class_record on class_record.id = prepared.class_id
  left join public.dojos as dojo_record on dojo_record.id = prepared.dojo_id
  left join public.prepared_assessment_candidates as candidate
    on candidate.prepared_assessment_id = prepared.id
  left join public.prepared_assessment_certificates as certificate
    on certificate.prepared_candidate_id = candidate.id
  group by prepared.id, class_record.name, dojo_record.name
  order by (prepared.status = 'pending') desc, prepared.assessment_date desc,
    prepared.prepared_at desc;
end;
$function$;

alter function public.get_prepared_bulk_assessments() owner to postgres;

create or replace function public.get_prepared_bulk_assessment(
  target_prepared_assessment_id uuid
)
returns table (
  prepared_assessment_id uuid,
  status text,
  assessment_date date,
  member_assessor_id uuid,
  external_assessor_name text,
  membership_id uuid,
  user_id uuid,
  full_name text,
  avatar_url text,
  member_id text,
  aikikai_registration_number text,
  class_id uuid,
  class_name text,
  class_logo_url text,
  dojo_id uuid,
  dojo_name text,
  rank_before_id uuid,
  rank_before_name text,
  sub_rank_before_id uuid,
  sub_rank_before_name text,
  rank_to_id uuid,
  rank_to_name text,
  sub_rank_to_id uuid,
  sub_rank_to_name text,
  is_rank_promotion boolean,
  level_to text,
  certificate_id uuid,
  certificate_number text,
  certificate_status text,
  outcome text,
  notes text,
  instructor_name text,
  prepared_at timestamptz,
  prepared_by uuid,
  prepared_by_name text
)
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
begin
  if not public.is_active_super_admin(auth.uid()) then
    raise exception 'Only an active Super Admin can view prepared assessments';
  end if;
  return query
  select prepared.id, prepared.status, prepared.assessment_date,
    prepared.member_assessor_id, prepared.external_assessor_name,
    candidate.membership_id, candidate.user_id, candidate.member_name_snapshot,
    candidate.avatar_url_snapshot, candidate.member_id_snapshot,
    candidate.aikikai_registration_number_snapshot, candidate.class_id,
    candidate.class_name_snapshot, candidate.class_logo_url_snapshot,
    candidate.dojo_id, candidate.dojo_name_snapshot, candidate.rank_before_id,
    candidate.rank_before_name_snapshot, candidate.sub_rank_before_id,
    candidate.sub_rank_before_name_snapshot, candidate.rank_to_id,
    candidate.rank_to_name_snapshot, candidate.sub_rank_to_id,
    candidate.sub_rank_to_name_snapshot, candidate.is_rank_promotion,
    candidate.level_to, certificate.id, certificate.certificate_number,
    certificate.status, result_row.outcome, result_row.notes,
    result_row.instructor_name_snapshot, prepared.prepared_at, prepared.prepared_by,
    preparer.full_name::text
  from public.prepared_assessments as prepared
  join public.prepared_assessment_candidates as candidate
    on candidate.prepared_assessment_id = prepared.id
  join public.profiles as preparer on preparer.id = prepared.prepared_by
  left join public.prepared_assessment_certificates as certificate
    on certificate.prepared_candidate_id = candidate.id
  left join public.assessment_results as result_row
    on result_row.batch_id = prepared.result_batch_id
   and result_row.membership_id = candidate.membership_id
  where prepared.id = target_prepared_assessment_id
  order by lower(candidate.member_name_snapshot), candidate.membership_id;
end;
$function$;

alter function public.get_prepared_bulk_assessment(uuid) owner to postgres;

create or replace function public.record_prepared_assessment_certificate_print(
  target_prepared_assessment_id uuid
)
returns integer
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare affected integer;
begin
  if not public.is_active_super_admin(auth.uid()) then
    raise exception 'Only an active Super Admin can print prepared certificates';
  end if;
  update public.prepared_assessment_certificates as certificate
  set print_count = certificate.print_count + 1,
      first_printed_at = coalesce(certificate.first_printed_at, clock_timestamp()),
      latest_printed_at = clock_timestamp()
  from public.prepared_assessment_candidates as candidate
  where candidate.id = certificate.prepared_candidate_id
    and candidate.prepared_assessment_id = target_prepared_assessment_id
    and certificate.status <> 'voided';
  get diagnostics affected = row_count;
  if affected = 0 then raise exception 'No printable certificates were found'; end if;
  return affected;
end;
$function$;

alter function public.record_prepared_assessment_certificate_print(uuid)
  owner to postgres;

create or replace function public.verify_prepared_assessment_certificate(
  target_certificate_id uuid
)
returns table (
  certificate_id uuid,
  certificate_number text,
  certificate_status text,
  member_name text,
  promoted_rank text,
  promotion_date date,
  assessor_name text,
  class_name text,
  dojo_name text
)
language sql
stable
security definer
set search_path to public, pg_temp
as $$
  select certificate.id,
    certificate.certificate_number,
    certificate.status,
    candidate.member_name_snapshot,
    candidate.rank_to_name_snapshot
      || case
        when candidate.sub_rank_to_name_snapshot is not null
          then ' - ' || candidate.sub_rank_to_name_snapshot
        else ''
      end,
    prepared.assessment_date,
    coalesce(prepared.external_assessor_name, member_assessor.full_name::text),
    candidate.class_name_snapshot,
    candidate.dojo_name_snapshot
  from public.prepared_assessment_certificates as certificate
  join public.prepared_assessment_candidates as candidate
    on candidate.id = certificate.prepared_candidate_id
  join public.prepared_assessments as prepared
    on prepared.id = candidate.prepared_assessment_id
  left join public.profiles as member_assessor
    on member_assessor.id = prepared.member_assessor_id
  where certificate.id = target_certificate_id
$$;

alter function public.verify_prepared_assessment_certificate(uuid)
  owner to postgres;
revoke all on function public.verify_prepared_assessment_certificate(uuid)
  from public, anon, authenticated;
grant execute on function public.verify_prepared_assessment_certificate(uuid)
  to service_role;

create or replace function public.finalize_prepared_bulk_assessment(
  target_prepared_assessment_id uuid,
  submission_key uuid,
  decisions jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  prepared public.prepared_assessments%rowtype;
  normalized_decisions jsonb;
  submission_payload jsonb;
  result jsonb;
  created_result_batch_id uuid;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not public.is_active_super_admin(auth.uid()) then
    raise exception 'Only an active Super Admin can submit prepared assessments';
  end if;
  if submission_key is null then raise exception 'Submission key is required'; end if;
  if jsonb_typeof(decisions) <> 'array' then
    raise exception 'Decisions must be a JSON array';
  end if;

  select * into prepared
  from public.prepared_assessments as item
  where item.id = target_prepared_assessment_id
  for update;
  if not found then raise exception 'Prepared assessment not found'; end if;

  if prepared.status = 'submitted' then
    if prepared.finalization_key is distinct from submission_key then
      raise exception 'Prepared assessment was already submitted with a different key';
    end if;
    select jsonb_build_object(
      'batch_id', batch.id,
      'prepared_assessment_id', prepared.id,
      'announcement_id', batch.announcement_id,
      'candidate_count', batch.candidate_count,
      'passed_count', batch.passed_count,
      'failed_count', batch.failed_count,
      'submitted_at', batch.submitted_at,
      'idempotent', true
    ) into result
    from public.assessment_batches as batch
    where batch.id = prepared.result_batch_id;
    return result;
  end if;

  if jsonb_array_length(decisions) <> prepared.candidate_count then
    raise exception 'Every prepared candidate must receive exactly one Pass or Fail result';
  end if;
  if exists (
    select 1 from jsonb_array_elements(decisions) as item(value)
    where jsonb_typeof(item.value) <> 'object'
       or jsonb_typeof(item.value -> 'membership_id') <> 'string'
       or lower(item.value ->> 'outcome') not in ('pass', 'fail')
       or (item.value ? 'notes'
         and jsonb_typeof(item.value -> 'notes') not in ('string', 'null'))
       or (item.value ? 'instructor_name'
         and jsonb_typeof(item.value -> 'instructor_name') not in ('string', 'null'))
  ) then
    raise exception 'Every decision requires membership_id and a Pass or Fail outcome';
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'membership_id', parsed.membership_id,
      'outcome', lower(parsed.outcome),
      'notes', nullif(btrim(parsed.notes), ''),
      'instructor_name', nullif(regexp_replace(btrim(parsed.instructor_name), '\s+', ' ', 'g'), '')
    ) order by parsed.membership_id
  ) into normalized_decisions
  from jsonb_to_recordset(decisions) as parsed(
    membership_id uuid, outcome text, notes text, instructor_name text
  );

  if (select count(distinct (item ->> 'membership_id')::uuid)
      from jsonb_array_elements(normalized_decisions) as item)
     <> prepared.candidate_count
     or exists (
       select 1 from jsonb_array_elements(normalized_decisions) as item
       where not exists (
         select 1 from public.prepared_assessment_candidates as candidate
         where candidate.prepared_assessment_id = prepared.id
           and candidate.membership_id = (item ->> 'membership_id')::uuid
       )
     ) then
    raise exception 'Results must match the complete prepared roster';
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'membership_id', candidate.membership_id,
      'outcome', decision.outcome,
      'expected_rank_to_id', candidate.rank_to_id,
      'expected_sub_rank_to_id', candidate.sub_rank_to_id,
      'notes', decision.notes,
      'instructor_name', decision.instructor_name
    ) order by candidate.membership_id
  ) into submission_payload
  from public.prepared_assessment_candidates as candidate
  join jsonb_to_recordset(normalized_decisions) as decision(
    membership_id uuid, outcome text, notes text, instructor_name text
  ) on decision.membership_id = candidate.membership_id
  where candidate.prepared_assessment_id = prepared.id;

  result := public.submit_bulk_assessment(
    submission_key,
    prepared.class_id,
    prepared.assessment_date,
    prepared.member_assessor_id,
    prepared.external_assessor_name,
    prepared.dojo_id,
    submission_payload
  );
  created_result_batch_id := (result ->> 'batch_id')::uuid;

  update public.prepared_assessment_certificates as certificate
  set status = case when result_row.outcome = 'pass' then 'issued' else 'voided' end,
      promotion_history_id = case
        when result_row.outcome = 'pass' then result_row.promotion_history_id
        else null
      end,
      issued_at = case when result_row.outcome = 'pass' then clock_timestamp() else null end,
      voided_at = case when result_row.outcome = 'fail' then clock_timestamp() else null end
  from public.prepared_assessment_candidates as candidate
  join public.assessment_results as result_row
    on result_row.batch_id = created_result_batch_id
   and result_row.membership_id = candidate.membership_id
  where certificate.prepared_candidate_id = candidate.id
    and candidate.prepared_assessment_id = prepared.id
    and certificate.status = 'pending';

  if exists (
    select 1
    from public.prepared_assessment_certificates as certificate
    join public.prepared_assessment_candidates as candidate
      on candidate.id = certificate.prepared_candidate_id
    where candidate.prepared_assessment_id = prepared.id
      and certificate.status = 'pending'
  ) then
    raise exception 'Not every pending certificate was finalized';
  end if;

  update public.prepared_assessments
  set status = 'submitted', result_batch_id = created_result_batch_id,
      finalization_key = submission_key, submitted_by = auth.uid(),
      submitted_at = clock_timestamp()
  where id = prepared.id;

  return result || jsonb_build_object(
    'prepared_assessment_id', prepared.id,
    'idempotent', false
  );
end;
$function$;

alter function public.finalize_prepared_bulk_assessment(uuid,uuid,jsonb)
  owner to postgres;

-- The direct submission RPC remains available to service_role for controlled
-- repair tooling, but browser callers must use the persisted prepared workflow.
revoke execute on function public.submit_bulk_assessment(
  uuid,uuid,date,uuid,text,uuid,jsonb
) from authenticated;

revoke all on function public.prepare_bulk_assessment(uuid,uuid,date,uuid,text,uuid,jsonb),
  public.get_prepared_bulk_assessments(),
  public.get_prepared_bulk_assessment(uuid),
  public.record_prepared_assessment_certificate_print(uuid),
  public.finalize_prepared_bulk_assessment(uuid,uuid,jsonb)
from public, anon;

grant execute on function public.prepare_bulk_assessment(uuid,uuid,date,uuid,text,uuid,jsonb),
  public.get_prepared_bulk_assessments(),
  public.get_prepared_bulk_assessment(uuid),
  public.record_prepared_assessment_certificate_print(uuid),
  public.finalize_prepared_bulk_assessment(uuid,uuid,jsonb)
to authenticated, service_role;

do $postflight$
begin
  if has_table_privilege('authenticated', 'public.prepared_assessments', 'SELECT')
     or has_table_privilege('authenticated', 'public.prepared_assessment_candidates', 'SELECT')
     or has_table_privilege('authenticated', 'public.prepared_assessment_certificates', 'SELECT')
     or has_function_privilege(
       'authenticated',
       'public.submit_bulk_assessment(uuid,uuid,date,uuid,text,uuid,jsonb)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'authenticated', 'public.prepare_bulk_assessment(uuid,uuid,date,uuid,text,uuid,jsonb)', 'EXECUTE'
     )
     or not has_function_privilege(
       'authenticated', 'public.finalize_prepared_bulk_assessment(uuid,uuid,jsonb)', 'EXECUTE'
     )
     or has_function_privilege(
       'authenticated', 'public.verify_prepared_assessment_certificate(uuid)', 'EXECUTE'
     ) then
    raise exception 'Prepared assessment ACLs are incorrect';
  end if;
end
$postflight$;

commit;
