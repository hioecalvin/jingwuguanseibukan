-- Approved staging fix: tier-only progression; rank changes require Super Admin assessment.
begin;

do $preflight$
begin
  if to_regprocedure('public.promote_membership(uuid,date,uuid,text)') is null
     or to_regprocedure('public.get_next_membership_promotion(uuid)') is null
     or to_regprocedure('public.submit_bulk_assessment(uuid,uuid,date,uuid,text,uuid,jsonb)') is null
     or to_regprocedure('public.is_active_super_admin(uuid)') is null
     or to_regprocedure('public._apply_assessed_membership_promotion(uuid,date,uuid,text)') is not null
     or to_regprocedure('public._calculate_membership_promotion(uuid)') is not null then
    raise exception 'Unexpected promotion baseline';
  end if;
end
$preflight$;

-- Retain the reviewed calculation/audit implementation, but remove every API
-- role's ability to call it. Only owner-executed guarded wrappers can delegate.
alter function public.promote_membership(uuid,date,uuid,text)
  rename to _apply_assessed_membership_promotion;
alter function public.get_next_membership_promotion(uuid)
  rename to _calculate_membership_promotion;
revoke all on function public._apply_assessed_membership_promotion(uuid,date,uuid,text),
  public._calculate_membership_promotion(uuid)
  from public, anon, authenticated, service_role;

create or replace function public.assert_membership_progression_scope(target_membership_id uuid)
returns void language plpgsql stable security definer
set search_path to public, pg_temp
as $function$
declare
  membership public.class_memberships%rowtype;
begin
  if auth.uid() is null or not public.is_active_app_user(auth.uid()) then
    raise exception using errcode='42501', message='Account access is disabled';
  end if;
  select m.* into membership from public.class_memberships m
  join public.profiles p on p.id=m.user_id
  where m.id=target_membership_id and m.status::text='active'
    and p.account_status::text='active' and p.date_of_passing is null;
  if not found then
    raise exception using errcode='42501', message='Membership is not eligible for progression';
  end if;
  if not public.is_active_super_admin(auth.uid()) and not exists (
    select 1 from public.dojo_admin_assignments a
    where a.user_id=auth.uid() and a.active=true
      and a.class_id=membership.class_id and a.dojo_id=membership.dojo_id
      and a.dojo_id is not null
  ) then
    raise exception using errcode='42501', message='Not authorised for this dojo';
  end if;
end;
$function$;

-- Corrections must not let a dojo Admin undo an assessed rank or a foreign
-- dojo record. Preserve audited Super Admin corrections without enabling a
-- direct forward rank promotion.
alter function public.undo_last_membership_promotion(uuid,text)
  rename to _undo_membership_progression;
revoke all on function public._undo_membership_progression(uuid,text)
  from public,anon,authenticated,service_role;
create or replace function public.undo_last_membership_promotion(target_membership_id uuid,undo_reason text)
returns void language plpgsql security definer set search_path to public, pg_temp
as $function$
declare membership public.class_memberships%rowtype; previous_rank uuid; latest_rank uuid;
begin
  perform public.assert_membership_progression_scope(target_membership_id);
  select m.* into membership from public.class_memberships m where m.id=target_membership_id for update;
  perform public.assert_membership_progression_scope(target_membership_id);
  if not public.is_active_super_admin(auth.uid()) then
    select h.rank_id into latest_rank from public.membership_grade_history h
    where h.membership_id=target_membership_id and h.revoked_at is null
    order by h.effective_date desc,h.created_at desc limit 1;
    select h.rank_id into previous_rank from public.membership_grade_history h
    where h.membership_id=target_membership_id and h.revoked_at is null
    order by h.effective_date desc,h.created_at desc offset 1 limit 1;
    if previous_rank is null or previous_rank is distinct from membership.rank_id
       or latest_rank is distinct from membership.rank_id then
      raise exception using errcode='42501',message='Only Super Admin can correct a rank assessment';
    end if;
  end if;
  perform public._undo_membership_progression(target_membership_id,undo_reason);
end;
$function$;
alter function public.undo_last_membership_promotion(uuid,text) owner to postgres;
revoke all on function public.undo_last_membership_promotion(uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.undo_last_membership_promotion(uuid,text) to authenticated;

create or replace function public.get_next_membership_promotion(target_membership_id uuid)
returns table(next_rank_id uuid,next_rank_name text,next_sub_rank_id uuid,
  next_sub_rank_name text,next_level text,is_rank_promotion boolean)
language plpgsql stable security definer set search_path to public, pg_temp
as $function$
begin
  perform public.assert_membership_progression_scope(target_membership_id);
  return query select * from public._calculate_membership_promotion(target_membership_id);
end;
$function$;

create or replace function public.promote_membership(
  target_membership_id uuid, promotion_effective_date date,
  assessor_member_id uuid default null, external_assessor_name text default null
)
returns uuid language plpgsql security definer set search_path to public, pg_temp
as $function$
declare
  membership public.class_memberships%rowtype;
  next_step record;
begin
  -- Check before and after locking: no foreign lock and no stale progression.
  perform public.assert_membership_progression_scope(target_membership_id);
  select m.* into membership from public.class_memberships m
  where m.id=target_membership_id for update;
  perform public.assert_membership_progression_scope(target_membership_id);
  select * into next_step from public.get_next_membership_promotion(target_membership_id);
  if membership.rank_id is null
     or next_step.next_rank_id is distinct from membership.rank_id
     or next_step.is_rank_promotion is distinct from false
     or next_step.next_level is distinct from membership.level::text
     or next_step.next_sub_rank_id is null
     or next_step.next_sub_rank_id is not distinct from membership.sub_rank_id then
    raise exception using errcode='42501', message='Rank promotion requires a Super Admin assessment';
  end if;
  return public._apply_assessed_membership_promotion(target_membership_id,
    promotion_effective_date,assessor_member_id,external_assessor_name);
end;
$function$;

-- Preserve assessment validation, atomic results, certificate and announcement
-- handling. Gate even the legacy unprepared submit endpoint before all work.
do $assessment$
declare
  original text;
  patched text;
  marker text := E'begin\n  if auth.uid() is null then';
  replacement text := E'begin\n  if not public.is_active_super_admin(auth.uid()) then\n    raise exception using errcode=''42501'', message=''Only an active Super Admin can submit assessments'';\n  end if;\n  if auth.uid() is null then';
begin
  original := replace(pg_get_functiondef(
    'public.submit_bulk_assessment(uuid,uuid,date,uuid,text,uuid,jsonb)'::regprocedure),E'\r\n',E'\n');
  if (length(original)-length(replace(original,marker,'')))/length(marker) <> 1
     or (length(original)-length(replace(original,'public.promote_membership(','')))/length('public.promote_membership(') <> 1 then
    raise exception 'Unexpected assessment submission definition';
  end if;
  patched := replace(replace(original,marker,replacement),
    'public.promote_membership(','public._apply_assessed_membership_promotion(');
  execute patched;
end
$assessment$;

alter function public.assert_membership_progression_scope(uuid) owner to postgres;
alter function public.get_next_membership_promotion(uuid) owner to postgres;
alter function public.promote_membership(uuid,date,uuid,text) owner to postgres;
revoke all on function public.assert_membership_progression_scope(uuid)
  from public,anon,authenticated,service_role;
revoke all on function public.get_next_membership_promotion(uuid),
  public.promote_membership(uuid,date,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.get_next_membership_promotion(uuid),
  public.promote_membership(uuid,date,uuid,text) to authenticated;

do $postflight$
declare signature text; role_name text;
begin
  foreach signature in array array[
    'public._apply_assessed_membership_promotion(uuid,date,uuid,text)',
    'public._calculate_membership_promotion(uuid)',
    'public._undo_membership_progression(uuid,text)',
    'public.assert_membership_progression_scope(uuid)'
  ] loop
    foreach role_name in array array['anon','authenticated','service_role'] loop
      if has_function_privilege(role_name,signature,'EXECUTE') then
        raise exception 'Internal progression routine exposed: %',signature;
      end if;
    end loop;
  end loop;
  if not has_function_privilege('authenticated','public.promote_membership(uuid,date,uuid,text)','EXECUTE')
     or has_function_privilege('anon','public.promote_membership(uuid,date,uuid,text)','EXECUTE') then
    raise exception 'Unsafe tier endpoint ACL';
  end if;
end
$postflight$;
notify pgrst,'reload schema';
commit;
