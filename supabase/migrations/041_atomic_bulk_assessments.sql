-- Record and submit a whole grading assessment in one transaction. Every
-- candidate is validated before the first audit row is written; only passing
-- candidates are promoted, while failed attempts remain immutable audit facts.

begin;

do $preflight$
begin
  if to_regclass('public.profiles') is null
     or to_regclass('public.classes') is null
     or to_regclass('public.dojos') is null
     or to_regclass('public.ranks') is null
     or to_regclass('public.sub_ranks') is null
     or to_regclass('public.class_memberships') is null
     or to_regclass('public.membership_grade_history') is null
     or to_regclass('public.announcements') is null
     or to_regprocedure('public.can_manage_class(uuid,uuid)') is null
     or to_regprocedure('public.get_next_membership_promotion(uuid)') is null
     or to_regprocedure('public.promote_membership(uuid,date,uuid,text)') is null
     or to_regprocedure(
       'public.create_notification(uuid,text,text,text,text,uuid,jsonb)'
     ) is null then
    raise exception 'Required bulk assessment objects are missing';
  end if;
end
$preflight$;

-- Migration 040 introduced the constrained announcement discriminator. Bulk
-- grading results are a distinct published announcement type, not a memorial
-- or an administrator-authored general notice.
alter table public.announcements
  drop constraint announcements_type_check;

alter table public.announcements
  add constraint announcements_type_check
  check (announcement_type in (
    'general',
    'memorial_initial',
    'memorial_remembrance',
    'memorial_heavenly_birthday',
    'grading_results'
  ));

create table public.assessment_batches (
  id uuid primary key default gen_random_uuid(),
  submission_key uuid not null,
  class_id uuid not null references public.classes(id),
  dojo_id uuid references public.dojos(id),
  assessment_date date not null,
  member_assessor_id uuid references public.profiles(id),
  member_assessor_name_snapshot text,
  external_assessor_name_snapshot text,
  announcement_id uuid unique references public.announcements(id),
  status text not null default 'submitted'
    check (status = 'submitted'),
  candidate_count integer not null check (candidate_count > 0),
  passed_count integer not null check (passed_count >= 0),
  failed_count integer not null check (failed_count >= 0),
  request_payload jsonb not null,
  submitted_by uuid not null references public.profiles(id),
  submitted_at timestamptz not null default clock_timestamp(),
  constraint assessment_batches_count_check
    check (candidate_count = passed_count + failed_count),
  constraint assessment_batches_submission_key_unique
    unique (submitted_by, submission_key)
);

create table public.assessment_results (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.assessment_batches(id),
  membership_id uuid not null references public.class_memberships(id),
  member_user_id uuid not null references public.profiles(id),
  member_name_snapshot text not null,
  avatar_url_snapshot text,
  dojo_id_snapshot uuid,
  dojo_name_snapshot text,
  instructor_name_snapshot text,
  assessment_date date not null,
  outcome text not null check (outcome in ('pass', 'fail')),
  notes text,
  rank_before_id uuid references public.ranks(id),
  rank_before_name_snapshot text,
  sub_rank_before_id uuid references public.sub_ranks(id),
  sub_rank_before_name_snapshot text,
  rank_to_id uuid not null references public.ranks(id),
  rank_to_name_snapshot text not null,
  sub_rank_to_id uuid references public.sub_ranks(id),
  sub_rank_to_name_snapshot text,
  certificate_eligible boolean not null,
  level_to text not null check (level_to in ('mudansha', 'yudansha')),
  assessor_type text not null check (assessor_type in ('member', 'external')),
  assessor_member_id uuid references public.profiles(id),
  assessor_name_snapshot text not null,
  promotion_history_id uuid unique
    references public.membership_grade_history(id),
  recorded_by uuid not null references public.profiles(id),
  recorded_at timestamptz not null default clock_timestamp(),
  constraint assessment_results_batch_membership_unique
    unique (batch_id, membership_id),
  constraint assessment_results_membership_date_unique
    unique (membership_id, assessment_date),
  constraint assessment_results_promotion_check check (
    (outcome = 'pass' and promotion_history_id is not null)
    or (outcome = 'fail' and promotion_history_id is null)
  ),
  constraint assessment_results_assessor_check check (
    (assessor_type = 'member' and assessor_member_id is not null)
    or (assessor_type = 'external' and assessor_member_id is null)
  )
);

create index assessment_batches_scope_submitted_idx
  on public.assessment_batches (class_id, dojo_id, submitted_at desc);

create index assessment_results_membership_recorded_idx
  on public.assessment_results (membership_id, recorded_at desc);

alter table public.assessment_batches enable row level security;
alter table public.assessment_results enable row level security;

revoke all on table public.assessment_batches
  from public, anon, authenticated;
revoke all on table public.assessment_results
  from public, anon, authenticated;
grant select on table public.assessment_batches to service_role;
grant select on table public.assessment_results to service_role;

comment on table public.assessment_batches is
  'Immutable audit header for one idempotent atomic grading assessment submission.';
comment on table public.assessment_results is
  'Immutable per-candidate pass/fail facts and grade snapshots for an assessment batch.';
comment on column public.assessment_results.instructor_name_snapshot is
  'Optional free-text home instructor snapshot; it is not a grading assessor.';

create or replace function public.get_bulk_assessment_candidates(
  target_class_id uuid,
  target_dojo_id uuid default null
)
returns table (
  membership_id uuid,
  user_id uuid,
  full_name text,
  avatar_url text,
  class_id uuid,
  class_name text,
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
  level_to text
)
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  candidate record;
  promotion record;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if target_class_id is null then
    raise exception 'Class is required';
  end if;

  if not public.can_manage_class(target_class_id, auth.uid()) then
    raise exception 'Not authorised to manage this class';
  end if;

  if not exists (
    select 1 from public.classes as class_record
    where class_record.id = target_class_id
  ) then
    raise exception 'Class not found';
  end if;

  if target_dojo_id is not null and not exists (
    select 1 from public.dojos as dojo_record
    where dojo_record.id = target_dojo_id
      and dojo_record.class_id = target_class_id
  ) then
    raise exception 'Dojo is not part of this class';
  end if;

  for candidate in
    select
      membership.id as membership_id,
      membership.user_id,
      profile.full_name::text as full_name,
      profile.avatar_url::text as avatar_url,
      membership.class_id,
      class_record.name::text as class_name,
      membership.dojo_id,
      dojo_record.name::text as dojo_name,
      membership.rank_id as rank_before_id,
      rank_before.name::text as rank_before_name,
      membership.sub_rank_id as sub_rank_before_id,
      sub_rank_before.name::text as sub_rank_before_name
    from public.class_memberships as membership
    join public.profiles as profile on profile.id = membership.user_id
    join public.classes as class_record on class_record.id = membership.class_id
    left join public.dojos as dojo_record on dojo_record.id = membership.dojo_id
    left join public.ranks as rank_before on rank_before.id = membership.rank_id
    left join public.sub_ranks as sub_rank_before
      on sub_rank_before.id = membership.sub_rank_id
    where membership.class_id = target_class_id
      and (target_dojo_id is null or membership.dojo_id = target_dojo_id)
      and membership.status::text = 'active'
      and profile.date_of_passing is null
      and profile.account_status::text = 'active'
    order by lower(profile.full_name), membership.id
  loop
    begin
      select * into promotion
      from public.get_next_membership_promotion(candidate.membership_id);
    exception
      when others then
        if lower(sqlerrm) like '%highest configured rank%'
           or lower(sqlerrm) like '%no next promotion%' then
          continue;
        end if;
        raise;
    end;

    if promotion.next_rank_id is null then
      continue;
    end if;

    membership_id := candidate.membership_id;
    user_id := candidate.user_id;
    full_name := candidate.full_name;
    avatar_url := candidate.avatar_url;
    class_id := candidate.class_id;
    class_name := candidate.class_name;
    dojo_id := candidate.dojo_id;
    dojo_name := candidate.dojo_name;
    rank_before_id := candidate.rank_before_id;
    rank_before_name := candidate.rank_before_name;
    sub_rank_before_id := candidate.sub_rank_before_id;
    sub_rank_before_name := candidate.sub_rank_before_name;
    rank_to_id := promotion.next_rank_id;
    sub_rank_to_id := promotion.next_sub_rank_id;
    is_rank_promotion := coalesce(promotion.is_rank_promotion, false);
    level_to := promotion.next_level::text;

    select destination_rank.name::text
    into rank_to_name
    from public.ranks as destination_rank
    where destination_rank.id = rank_to_id;

    select destination_sub_rank.name::text
    into sub_rank_to_name
    from public.sub_ranks as destination_sub_rank
    where destination_sub_rank.id = sub_rank_to_id;

    return next;
  end loop;
end;
$function$;

alter function public.get_bulk_assessment_candidates(uuid, uuid)
  owner to postgres;
revoke all on function public.get_bulk_assessment_candidates(uuid, uuid)
  from public, anon;
grant execute on function public.get_bulk_assessment_candidates(uuid, uuid)
  to authenticated, service_role;

comment on function public.get_bulk_assessment_candidates(uuid, uuid) is
  'Returns only active, living, manageable members with a configured next grade in the requested class/dojo scope.';

create or replace function public.submit_bulk_assessment(
  submission_key uuid,
  target_class_id uuid,
  assessment_date date,
  assessor_member_id uuid default null,
  external_assessor_name text default null,
  target_dojo_id uuid default null,
  decisions jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  existing_batch public.assessment_batches%rowtype;
  membership_row public.class_memberships%rowtype;
  candidate record;
  decision record;
  promotion record;
  destination_rank_name text;
  destination_sub_rank_name text;
  normalized_member_assessor_name text;
  normalized_external_assessor_name text := nullif(
    regexp_replace(btrim(external_assessor_name), '\s+', ' ', 'g'),
    ''
  );
  normalized_decisions jsonb;
  normalized_request jsonb;
  validated_items jsonb := '[]'::jsonb;
  validated_item jsonb;
  new_batch_id uuid;
  new_announcement_id uuid;
  new_history_id uuid;
  pass_count integer;
  fail_count integer;
  total_count integer;
  latest_effective_date date;
  batch_submitted_at timestamptz;
  assessment_class_name text;
  assessment_dojo_name text;
  promoted_summary text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if submission_key is null then
    raise exception 'Submission key is required';
  end if;

  if target_class_id is null then
    raise exception 'Class is required';
  end if;

  if assessment_date is null then
    raise exception 'Assessment date is required';
  end if;

  if assessment_date > (timezone('Asia/Jakarta', now()))::date then
    raise exception 'Assessment date cannot be in the future';
  end if;

  if length(coalesce(external_assessor_name, '')) > 200 then
    raise exception 'External assessor name may contain at most 200 characters';
  end if;

  if jsonb_typeof(decisions) <> 'array' then
    raise exception 'Decisions must be a JSON array';
  end if;

  total_count := jsonb_array_length(decisions);
  if total_count = 0 then
    raise exception 'At least one assessment decision is required';
  end if;
  if total_count > 500 then
    raise exception 'A bulk assessment cannot contain more than 500 decisions';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(decisions) as item(value)
    where jsonb_typeof(item.value) <> 'object'
       or not (item.value ? 'membership_id')
       or not (item.value ? 'outcome')
       or not (item.value ? 'expected_rank_to_id')
       or not (item.value ? 'expected_sub_rank_to_id')
       or jsonb_typeof(item.value -> 'membership_id') <> 'string'
       or jsonb_typeof(item.value -> 'outcome') <> 'string'
       or jsonb_typeof(item.value -> 'expected_rank_to_id') <> 'string'
       or jsonb_typeof(item.value -> 'expected_sub_rank_to_id')
            not in ('string', 'null')
       or (
         item.value ? 'notes'
         and jsonb_typeof(item.value -> 'notes') not in ('string', 'null')
       )
       or (
         item.value ? 'instructor_name'
         and jsonb_typeof(item.value -> 'instructor_name') not in ('string', 'null')
       )
  ) then
    raise exception 'Each decision requires membership_id, pass/fail outcome, expected_rank_to_id and expected_sub_rank_to_id; notes and instructor_name must be strings or null';
  end if;

  begin
    if exists (
      select 1
      from jsonb_to_recordset(decisions) as parsed(
        membership_id uuid,
        outcome text,
        expected_rank_to_id uuid,
        expected_sub_rank_to_id uuid,
        notes text,
        instructor_name text
      )
      where parsed.outcome not in ('pass', 'fail')
    ) then
      raise exception 'Every outcome must be pass or fail';
    end if;
  exception
    when invalid_text_representation then
      raise exception 'Membership and expected destination rank IDs must be valid UUIDs';
  end;

  if (
    select count(distinct parsed.membership_id)
    from jsonb_to_recordset(decisions) as parsed(
      membership_id uuid,
      outcome text,
      expected_rank_to_id uuid,
      expected_sub_rank_to_id uuid,
      notes text,
      instructor_name text
    )
  ) <> total_count then
    raise exception 'A membership can appear only once in a batch';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(decisions) as parsed(
      membership_id uuid,
      outcome text,
      expected_rank_to_id uuid,
      expected_sub_rank_to_id uuid,
      notes text,
      instructor_name text
    )
    where length(coalesce(parsed.notes, '')) > 2000
       or length(coalesce(parsed.instructor_name, '')) > 200
  ) then
    raise exception 'Notes may contain at most 2000 characters and instructor_name at most 200 characters';
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'membership_id', parsed.membership_id,
      'outcome', parsed.outcome,
      'expected_rank_to_id', parsed.expected_rank_to_id,
      'expected_sub_rank_to_id', parsed.expected_sub_rank_to_id,
      'notes', nullif(btrim(parsed.notes), ''),
      'instructor_name', nullif(
        regexp_replace(btrim(parsed.instructor_name), '\s+', ' ', 'g'),
        ''
      )
    ) order by parsed.membership_id
  )
  into normalized_decisions
  from jsonb_to_recordset(decisions) as parsed(
    membership_id uuid,
    outcome text,
    expected_rank_to_id uuid,
    expected_sub_rank_to_id uuid,
    notes text,
    instructor_name text
  );

  normalized_request := jsonb_build_object(
    'class_id', target_class_id,
    'dojo_id', target_dojo_id,
    'assessment_date', assessment_date,
    'assessor_member_id', assessor_member_id,
    'external_assessor_name', normalized_external_assessor_name,
    'decisions', normalized_decisions
  );

  -- Serialize same-caller retries before looking for an existing audit row.
  -- This turns concurrent first submissions into an ordinary idempotent replay
  -- instead of exposing the unique constraint race to the client.
  perform pg_advisory_xact_lock(
    hashtextextended(
      auth.uid()::text || ':' || submission_key::text,
      0
    )
  );

  select batch.* into existing_batch
  from public.assessment_batches as batch
  where batch.submitted_by = auth.uid()
    and batch.submission_key = submit_bulk_assessment.submission_key
  for update;

  if found then
    if existing_batch.request_payload <> normalized_request then
      raise exception 'Submission key was already used for a different assessment';
    end if;

    return jsonb_build_object(
      'batch_id', existing_batch.id,
      'announcement_id', existing_batch.announcement_id,
      'idempotent', true,
      'candidate_count', existing_batch.candidate_count,
      'passed_count', existing_batch.passed_count,
      'failed_count', existing_batch.failed_count,
      'submitted_at', existing_batch.submitted_at
    );
  end if;

  if not public.can_manage_class(target_class_id, auth.uid()) then
    raise exception 'Not authorised to manage this class';
  end if;

  select class_record.name::text into assessment_class_name
  from public.classes as class_record
  where class_record.id = target_class_id;

  if not found then
    raise exception 'Class not found';
  end if;

  if target_dojo_id is not null and not exists (
    select 1 from public.dojos as dojo_record
    where dojo_record.id = target_dojo_id
      and dojo_record.class_id = target_class_id
  ) then
    raise exception 'Dojo is not part of this class';
  end if;

  if target_dojo_id is not null then
    select dojo_record.name::text into assessment_dojo_name
    from public.dojos as dojo_record
    where dojo_record.id = target_dojo_id;
  end if;

  -- The stable UUID order prevents two overlapping batches from acquiring
  -- their membership locks in opposite orders.
  perform 1
  from public.class_memberships as membership
  join (
    select parsed.membership_id
    from jsonb_to_recordset(normalized_decisions) as parsed(
      membership_id uuid,
      outcome text,
      expected_rank_to_id uuid,
      expected_sub_rank_to_id uuid,
      notes text,
      instructor_name text
    )
  ) as requested on requested.membership_id = membership.id
  order by membership.id
  for update of membership;

  if (
    select count(*)
    from public.class_memberships as membership
    join (
      select parsed.membership_id
      from jsonb_to_recordset(normalized_decisions) as parsed(
        membership_id uuid,
        outcome text,
        expected_rank_to_id uuid,
        expected_sub_rank_to_id uuid,
        notes text,
        instructor_name text
      )
    ) as requested on requested.membership_id = membership.id
  ) <> total_count then
    raise exception 'One or more memberships were not found';
  end if;

  select regexp_replace(btrim(profile.full_name), '\s+', ' ', 'g')
  into normalized_member_assessor_name
  from public.profiles as profile
  where profile.id = assessor_member_id
    and profile.is_grading_assessor = true
    and profile.account_status = 'active'
    and profile.date_of_passing is null
  for share of profile;

  for decision in
    select parsed.*
    from jsonb_to_recordset(normalized_decisions) as parsed(
      membership_id uuid,
      outcome text,
      expected_rank_to_id uuid,
      expected_sub_rank_to_id uuid,
      notes text,
      instructor_name text
    )
    order by parsed.membership_id
  loop
    select membership.* into membership_row
    from public.class_memberships as membership
    where membership.id = decision.membership_id;

    if membership_row.class_id <> target_class_id
       or (target_dojo_id is not null and membership_row.dojo_id is distinct from target_dojo_id) then
      raise exception 'Membership % is outside the assessment scope', decision.membership_id;
    end if;

    if not public.can_manage_class(membership_row.class_id, auth.uid()) then
      raise exception 'Not authorised to manage this class';
    end if;

    if membership_row.status::text <> 'active' then
      raise exception 'Membership % is not active', decision.membership_id;
    end if;

    select
      profile.id as member_user_id,
      regexp_replace(btrim(profile.full_name), '\s+', ' ', 'g') as member_name,
      profile.avatar_url::text as avatar_url,
      profile.date_of_passing,
      profile.account_status::text as account_status,
      dojo_record.name::text as dojo_name,
      rank_before.name::text as rank_before_name,
      sub_rank_before.name::text as sub_rank_before_name
    into candidate
    from public.profiles as profile
    left join public.dojos as dojo_record on dojo_record.id = membership_row.dojo_id
    left join public.ranks as rank_before on rank_before.id = membership_row.rank_id
    left join public.sub_ranks as sub_rank_before
      on sub_rank_before.id = membership_row.sub_rank_id
    where profile.id = membership_row.user_id;

    if not found or candidate.date_of_passing is not null
       or candidate.account_status <> 'active' then
      raise exception 'Membership % is not an eligible active member', decision.membership_id;
    end if;

    begin
      select * into promotion
      from public.get_next_membership_promotion(decision.membership_id);
    exception
      when others then
        raise exception 'Membership % does not have a valid next promotion: %',
          decision.membership_id, sqlerrm;
    end;

    if promotion.next_rank_id is null then
      raise exception 'Membership % has no next promotion', decision.membership_id;
    end if;

    if promotion.next_rank_id is distinct from decision.expected_rank_to_id
       or promotion.next_sub_rank_id is distinct from decision.expected_sub_rank_to_id then
      raise exception 'Assessment roster is stale for membership %; reload candidates before submitting',
        decision.membership_id;
    end if;

    if exists (
      select 1
      from public.assessment_results as prior_result
      where prior_result.membership_id = decision.membership_id
        and prior_result.assessment_date = submit_bulk_assessment.assessment_date
    ) then
      raise exception 'Membership % already has an assessment recorded for %',
        decision.membership_id, assessment_date;
    end if;

    if promotion.next_level::text = 'yudansha' then
      if normalized_external_assessor_name is null then
        raise exception 'External assessor name is required for Yudansha grading';
      end if;
    else
      if assessor_member_id is null then
        raise exception 'Member assessor is required for Mudansha grading';
      end if;
      if normalized_member_assessor_name is null
         or normalized_member_assessor_name = '' then
        raise exception 'Selected Member is not an active Grading Assessor';
      end if;
    end if;

    if decision.outcome = 'pass' then
      select max(history.effective_date)
      into latest_effective_date
      from public.membership_grade_history as history
      where history.membership_id = decision.membership_id
        and history.revoked_at is null;

      if latest_effective_date is not null
         and assessment_date < latest_effective_date then
        raise exception 'Assessment date cannot be earlier than the latest valid promotion for membership %',
          decision.membership_id;
      end if;
    end if;

    select destination_rank.name::text into destination_rank_name
    from public.ranks as destination_rank
    where destination_rank.id = promotion.next_rank_id;

    if destination_rank_name is null then
      raise exception 'Destination rank is not configured for membership %', decision.membership_id;
    end if;

    destination_sub_rank_name := null;
    if promotion.next_sub_rank_id is not null then
      select destination_sub_rank.name::text into destination_sub_rank_name
      from public.sub_ranks as destination_sub_rank
      where destination_sub_rank.id = promotion.next_sub_rank_id;

      if destination_sub_rank_name is null then
        raise exception 'Destination sub-rank is not configured for membership %', decision.membership_id;
      end if;
    end if;

    validated_items := validated_items || jsonb_build_array(jsonb_build_object(
      'membership_id', decision.membership_id,
      'member_user_id', candidate.member_user_id,
      'member_name', candidate.member_name,
      'avatar_url', candidate.avatar_url,
      'dojo_id', membership_row.dojo_id,
      'dojo_name', candidate.dojo_name,
      'instructor_name', decision.instructor_name,
      'outcome', decision.outcome,
      'notes', decision.notes,
      'rank_before_id', membership_row.rank_id,
      'rank_before_name', candidate.rank_before_name,
      'sub_rank_before_id', membership_row.sub_rank_id,
      'sub_rank_before_name', candidate.sub_rank_before_name,
      'rank_to_id', promotion.next_rank_id,
      'rank_to_name', destination_rank_name,
      'sub_rank_to_id', promotion.next_sub_rank_id,
      'sub_rank_to_name', destination_sub_rank_name,
      'certificate_eligible', coalesce(promotion.is_rank_promotion, false),
      'level_to', promotion.next_level::text,
      'assessor_type', case
        when promotion.next_level::text = 'yudansha' then 'external'
        else 'member'
      end,
      'assessor_member_id', case
        when promotion.next_level::text = 'yudansha' then null
        else assessor_member_id
      end,
      'assessor_name', case
        when promotion.next_level::text = 'yudansha'
          then normalized_external_assessor_name
        else normalized_member_assessor_name
      end
    ));
  end loop;

  select count(*) filter (where item ->> 'outcome' = 'pass'),
         count(*) filter (where item ->> 'outcome' = 'fail')
  into pass_count, fail_count
  from jsonb_array_elements(validated_items) as validated(item);

  insert into public.assessment_batches (
    submission_key,
    class_id,
    dojo_id,
    assessment_date,
    member_assessor_id,
    member_assessor_name_snapshot,
    external_assessor_name_snapshot,
    candidate_count,
    passed_count,
    failed_count,
    request_payload,
    submitted_by
  ) values (
    submission_key,
    target_class_id,
    target_dojo_id,
    assessment_date,
    case when normalized_member_assessor_name is null then null else assessor_member_id end,
    normalized_member_assessor_name,
    normalized_external_assessor_name,
    total_count,
    pass_count,
    fail_count,
    normalized_request,
    auth.uid()
  )
  returning id, submitted_at into new_batch_id, batch_submitted_at;

  for validated_item in
    select item.value
    from jsonb_array_elements(validated_items) as item(value)
    order by item.value ->> 'membership_id'
  loop
    new_history_id := null;

    if validated_item ->> 'outcome' = 'pass' then
      new_history_id := public.promote_membership(
        (validated_item ->> 'membership_id')::uuid,
        assessment_date,
        case when validated_item ->> 'assessor_type' = 'member'
          then (validated_item ->> 'assessor_member_id')::uuid
          else null
        end,
        case when validated_item ->> 'assessor_type' = 'external'
          then validated_item ->> 'assessor_name'
          else null
        end
      );

      if not exists (
        select 1
        from public.membership_grade_history as applied_history
        where applied_history.id = new_history_id
          and applied_history.membership_id =
            (validated_item ->> 'membership_id')::uuid
          and applied_history.rank_id =
            (validated_item ->> 'rank_to_id')::uuid
          and applied_history.sub_rank_id is not distinct from
            (validated_item ->> 'sub_rank_to_id')::uuid
          and applied_history.revoked_at is null
      ) then
        raise exception 'Promotion target changed while submitting membership %; reload candidates before retrying',
          validated_item ->> 'membership_id';
      end if;
    end if;

    insert into public.assessment_results (
      batch_id,
      membership_id,
      member_user_id,
      member_name_snapshot,
      avatar_url_snapshot,
      dojo_id_snapshot,
      dojo_name_snapshot,
      instructor_name_snapshot,
      assessment_date,
      outcome,
      notes,
      rank_before_id,
      rank_before_name_snapshot,
      sub_rank_before_id,
      sub_rank_before_name_snapshot,
      rank_to_id,
      rank_to_name_snapshot,
      sub_rank_to_id,
      sub_rank_to_name_snapshot,
      certificate_eligible,
      level_to,
      assessor_type,
      assessor_member_id,
      assessor_name_snapshot,
      promotion_history_id,
      recorded_by
    ) values (
      new_batch_id,
      (validated_item ->> 'membership_id')::uuid,
      (validated_item ->> 'member_user_id')::uuid,
      validated_item ->> 'member_name',
      validated_item ->> 'avatar_url',
      (validated_item ->> 'dojo_id')::uuid,
      validated_item ->> 'dojo_name',
      validated_item ->> 'instructor_name',
      assessment_date,
      validated_item ->> 'outcome',
      validated_item ->> 'notes',
      (validated_item ->> 'rank_before_id')::uuid,
      validated_item ->> 'rank_before_name',
      (validated_item ->> 'sub_rank_before_id')::uuid,
      validated_item ->> 'sub_rank_before_name',
      (validated_item ->> 'rank_to_id')::uuid,
      validated_item ->> 'rank_to_name',
      (validated_item ->> 'sub_rank_to_id')::uuid,
      validated_item ->> 'sub_rank_to_name',
      (validated_item ->> 'certificate_eligible')::boolean,
      validated_item ->> 'level_to',
      validated_item ->> 'assessor_type',
      (validated_item ->> 'assessor_member_id')::uuid,
      validated_item ->> 'assessor_name',
      new_history_id,
      auth.uid()
    );

    if validated_item ->> 'outcome' = 'pass' then
      perform public.create_notification(
        (validated_item ->> 'member_user_id')::uuid,
        'grade_promoted',
        'Rank promotion',
        'Congratulations! You have been promoted to '
          || (validated_item ->> 'rank_to_name')
          || case
            when nullif(validated_item ->> 'sub_rank_to_name', '') is not null
              then ' - ' || (validated_item ->> 'sub_rank_to_name')
            else ''
          end
          || '.',
        'assessment_batch',
        new_batch_id,
        jsonb_build_object(
          'batch_id', new_batch_id,
          'membership_id', validated_item ->> 'membership_id',
          'promotion_history_id', new_history_id,
          'assessment_date', assessment_date,
          'rank_id', validated_item ->> 'rank_to_id',
          'rank_name', validated_item ->> 'rank_to_name',
          'sub_rank_id', validated_item ->> 'sub_rank_to_id',
          'sub_rank_name', validated_item ->> 'sub_rank_to_name'
        )
      );
    end if;
  end loop;

  if pass_count > 0 then
    select string_agg(
      case
        when target_dojo_id is null then
          coalesce(nullif(item.value ->> 'dojo_name', ''), 'No dojo') || ': '
        else ''
      end
        || (item.value ->> 'member_name') || ', '
        || coalesce(nullif(item.value ->> 'rank_before_name', ''), 'Unranked')
        || case
          when nullif(item.value ->> 'sub_rank_before_name', '') is not null
            then ' - ' || (item.value ->> 'sub_rank_before_name')
          else ''
        end
        || ' to '
        || (item.value ->> 'rank_to_name')
        || case
          when nullif(item.value ->> 'sub_rank_to_name', '') is not null
            then ' - ' || (item.value ->> 'sub_rank_to_name')
          else ''
        end,
      E'\n' order by
        case
          when target_dojo_id is null then
            lower(coalesce(nullif(item.value ->> 'dojo_name', ''), 'No dojo'))
          else ''
        end,
        promoted_rank.sort_order desc,
        promoted_sub_rank.sort_order desc nulls last,
        lower(item.value ->> 'member_name'),
        item.value ->> 'membership_id'
    )
    into promoted_summary
    from jsonb_array_elements(validated_items) as item(value)
    join public.ranks as promoted_rank
      on promoted_rank.id = (item.value ->> 'rank_to_id')::uuid
    left join public.sub_ranks as promoted_sub_rank
      on promoted_sub_rank.id = (item.value ->> 'sub_rank_to_id')::uuid
    where item.value ->> 'outcome' = 'pass';

    insert into public.announcements (
      title,
      message,
      class_id,
      created_by,
      published,
      announcement_type,
      subject_user_id
    ) values (
      'Congratulations — ' || assessment_class_name
        || case
          when assessment_dojo_name is not null then ' — ' || assessment_dojo_name
          else ''
        end
        || ' grading results',
      'Congratulations to the members who passed and were promoted on '
        || to_char(assessment_date, 'FMDay, FMDD FMMonth YYYY')
        || E':\n\n'
        || promoted_summary,
      target_class_id,
      auth.uid(),
      true,
      'grading_results',
      null
    )
    returning id into new_announcement_id;

    update public.assessment_batches
    set announcement_id = new_announcement_id
    where id = new_batch_id;
  end if;

  return jsonb_build_object(
    'batch_id', new_batch_id,
    'announcement_id', new_announcement_id,
    'idempotent', false,
    'candidate_count', total_count,
    'passed_count', pass_count,
    'failed_count', fail_count,
    'submitted_at', batch_submitted_at
  );
end;
$function$;

alter function public.submit_bulk_assessment(
  uuid, uuid, date, uuid, text, uuid, jsonb
) owner to postgres;
revoke all on function public.submit_bulk_assessment(
  uuid, uuid, date, uuid, text, uuid, jsonb
) from public, anon;
grant execute on function public.submit_bulk_assessment(
  uuid, uuid, date, uuid, text, uuid, jsonb
) to authenticated, service_role;

comment on function public.submit_bulk_assessment(
  uuid, uuid, date, uuid, text, uuid, jsonb
) is
  'Idempotently validates and records an entire assessment, promotes pass rows only and creates their notifications atomically.';

do $postflight$
declare
  definition text;
begin
  select pg_get_functiondef(
    'public.submit_bulk_assessment(uuid,uuid,date,uuid,text,uuid,jsonb)'::regprocedure
  ) into definition;

  if position('ORDER BY MEMBERSHIP.ID' in upper(definition)) = 0
     or position('ORDER BY MEMBERSHIP.ID' in upper(definition))
        > position('FOR UPDATE OF MEMBERSHIP' in upper(definition)) then
    raise exception 'Bulk assessment membership locks are not deterministic';
  end if;

  if has_function_privilege(
       'anon',
       'public.get_bulk_assessment_candidates(uuid,uuid)',
       'EXECUTE'
     )
     or has_function_privilege(
       'anon',
       'public.submit_bulk_assessment(uuid,uuid,date,uuid,text,uuid,jsonb)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'authenticated',
       'public.get_bulk_assessment_candidates(uuid,uuid)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'authenticated',
       'public.submit_bulk_assessment(uuid,uuid,date,uuid,text,uuid,jsonb)',
       'EXECUTE'
     ) then
    raise exception 'Bulk assessment RPC grants do not match the reviewed boundary';
  end if;
end
$postflight$;

notify pgrst, 'reload schema';

commit;
