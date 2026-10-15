-- Serialize grading progression so concurrent requests cannot calculate and
-- record the same next grade from one stale membership state.

begin;

do $preflight$
begin
  if to_regprocedure('public.promote_membership(uuid,date,uuid,text)') is null
     or to_regprocedure('public.get_next_membership_promotion(uuid)') is null then
    raise exception 'Required grading functions are missing';
  end if;
end
$preflight$;

create or replace function public.promote_membership(
  target_membership_id uuid,
  promotion_effective_date date,
  assessor_member_id uuid default null,
  external_assessor_name text default null
)
returns uuid
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  membership_row public.class_memberships%rowtype;
  promotion record;
  new_history_id uuid;
  latest_effective_date date;
  assessor_display_name text;
  resolved_assessor_type text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if promotion_effective_date is null then
    raise exception 'Promotion date is required';
  end if;

  select cm.*
  into membership_row
  from public.class_memberships cm
  where cm.id = target_membership_id;

  if not found then
    raise exception 'Membership not found';
  end if;

  if not public.can_manage_class(membership_row.class_id, auth.uid()) then
    raise exception 'Not authorised to manage this class';
  end if;

  -- Authorize before taking a lock, then reload and re-check scope under the
  -- lock so denied callers cannot hold another class's grading row and a
  -- concurrent class reassignment cannot create a time-of-check/time-of-use gap.
  select cm.*
  into membership_row
  from public.class_memberships cm
  where cm.id = target_membership_id
  for update;

  if not found then
    raise exception 'Membership not found';
  end if;

  if not public.can_manage_class(membership_row.class_id, auth.uid()) then
    raise exception 'Not authorised to manage this class';
  end if;

  select max(history.effective_date)
  into latest_effective_date
  from public.membership_grade_history history
  where history.membership_id = target_membership_id
    and history.revoked_at is null;

  if latest_effective_date is not null
     and promotion_effective_date < latest_effective_date then
    raise exception 'Promotion date cannot be earlier than the latest valid promotion';
  end if;

  select *
  into promotion
  from public.get_next_membership_promotion(target_membership_id);

  if promotion.next_rank_id is null then
    raise exception 'No next promotion is available';
  end if;

  if promotion.next_level = 'yudansha' then
    resolved_assessor_type := 'external';
    if external_assessor_name is null or trim(external_assessor_name) = '' then
      raise exception 'External assessor name is required for Yudansha grading';
    end if;
    if assessor_member_id is not null then
      raise exception 'Yudansha grading must use an external assessor';
    end if;
    assessor_display_name := regexp_replace(trim(external_assessor_name), '\s+', ' ', 'g');
  else
    resolved_assessor_type := 'member';
    if assessor_member_id is null then
      raise exception 'Member assessor is required for Mudansha grading';
    end if;
    select regexp_replace(trim(p.full_name), '\s+', ' ', 'g')
    into assessor_display_name
    from public.profiles p
    where p.id = assessor_member_id
      and p.is_grading_assessor = true;
    if not found then
      raise exception 'Selected Member is not an active Grading Assessor';
    end if;
    if assessor_display_name is null or assessor_display_name = '' then
      raise exception 'Selected assessor does not have a valid name';
    end if;
    if external_assessor_name is not null and trim(external_assessor_name) <> '' then
      raise exception 'Mudansha grading must use a Member assessor';
    end if;
  end if;

  update public.class_memberships
  set rank_id = promotion.next_rank_id,
      sub_rank_id = promotion.next_sub_rank_id,
      level = case
        when promotion.next_level = 'yudansha'
          then 'yudansha'::public.membership_level
        else 'mudansha'::public.membership_level
      end
  where id = target_membership_id;

  if not found then
    raise exception 'Membership could not be updated';
  end if;

  insert into public.membership_grade_history (
    membership_id, rank_id, sub_rank_id, effective_date, created_by,
    assessor_type, assessor_member_id, assessor_name_snapshot
  ) values (
    target_membership_id, promotion.next_rank_id, promotion.next_sub_rank_id,
    promotion_effective_date, auth.uid(), resolved_assessor_type,
    case when resolved_assessor_type = 'member' then assessor_member_id else null end,
    assessor_display_name
  )
  returning id into new_history_id;

  return new_history_id;
end;
$function$;

alter function public.promote_membership(uuid, date, uuid, text) owner to postgres;
revoke all on function public.promote_membership(uuid, date, uuid, text)
  from public, anon;
grant execute on function public.promote_membership(uuid, date, uuid, text)
  to authenticated, service_role;

do $verify$
declare
  definition text;
begin
  select pg_get_functiondef('public.promote_membership(uuid,date,uuid,text)'::regprocedure)
  into definition;

  if position('FOR UPDATE' in upper(definition)) = 0
     or position('FOR UPDATE' in upper(definition)) > position('GET_NEXT_MEMBERSHIP_PROMOTION' in upper(definition)) then
    raise exception 'Promotion row lock is missing or occurs after progression calculation';
  end if;
  if has_function_privilege('anon', 'public.promote_membership(uuid,date,uuid,text)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.promote_membership(uuid,date,uuid,text)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.promote_membership(uuid,date,uuid,text)', 'EXECUTE') then
    raise exception 'Promotion function grants do not match the reviewed boundary';
  end if;
end
$verify$;

commit;
