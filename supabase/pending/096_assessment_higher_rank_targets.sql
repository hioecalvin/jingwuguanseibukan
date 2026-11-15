-- Explicit higher-rank assessment targets. Requires 061, 068, 071 and 085.
-- No existing member grades, results, certificates or history are rewritten.
begin;

create function public._resolve_assessment_rank_target(target_membership_id uuid, target_rank_id uuid)
returns table(next_rank_id uuid,next_rank_name text,next_sub_rank_id uuid,
 next_sub_rank_name text,next_level text,is_rank_promotion boolean)
language plpgsql stable security definer set search_path=pg_catalog as $$
declare m public.class_memberships%rowtype; held public.ranks%rowtype; destination public.ranks%rowtype;
begin
 if not coalesce(public.is_active_super_admin(auth.uid()),false) then
  raise exception using errcode='42501',message='Only an active Super Admin can select assessment targets';
 end if;
 perform public.assert_membership_progression_scope(target_membership_id);
 select * into strict m from public.class_memberships where id=target_membership_id;
 if m.rank_id is not null then
  select * into held from public.ranks where id=m.rank_id and class_id=m.class_id;
  if not found then raise exception 'Current rank configuration not found';end if;
 end if;
 select * into destination from public.ranks where id=target_rank_id and class_id=m.class_id;
 if not found then raise exception 'Target rank must belong to the member class';end if;
 if m.rank_id is not null and destination.sort_order<=held.sort_order then
  raise exception 'Assessment target must be strictly higher than the current rank';
 end if;
 return query select destination.id,destination.name::text,null::uuid,null::text,destination.level::text,true;
end;$$;
alter function public._resolve_assessment_rank_target(uuid,uuid) owner to postgres;
revoke all on function public._resolve_assessment_rank_target(uuid,uuid) from public,anon,authenticated,service_role;

-- Extend the existing roster contract. Ordering comes from the rank catalog,
-- never from parsing names such as 8th Kyu or 5th Kyu.
create or replace function public.get_bulk_assessment_candidates_with_member_ids(target_class_id uuid,target_dojo_id uuid default null)
returns setof jsonb language plpgsql stable security definer set search_path=pg_catalog as $$
begin
 if not coalesce(public.is_active_super_admin(auth.uid()),false) then
  raise exception using errcode='42501',message='Only an active Super Admin can select assessment targets';
 end if;
 return query
 select to_jsonb(c)||jsonb_build_object('member_id',p.registration_number,'target_options',(
  select coalesce(jsonb_agg(jsonb_build_object('rank_to_id',r.id,'rank_to_name',r.name,
   'sub_rank_to_id',null,'sub_rank_to_name',null,'level_to',r.level,'is_rank_promotion',true)
   order by r.sort_order,r.name,r.id),'[]'::jsonb)
  from public.ranks r left join public.ranks held on held.id=c.rank_before_id
  where r.class_id=c.class_id and (c.rank_before_id is null or r.sort_order>held.sort_order)
 ))
 from public.get_bulk_assessment_candidates(target_class_id,target_dojo_id) c
 join public.profiles p on p.id=c.user_id order by c.full_name,c.membership_id;
end;$$;
alter function public.get_bulk_assessment_candidates_with_member_ids(uuid,uuid) owner to postgres;
revoke all on function public.get_bulk_assessment_candidates_with_member_ids(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_bulk_assessment_candidates_with_member_ids(uuid,uuid) to authenticated;

create function pg_temp.replace_assessment_target_marker(signature text,old_text text,new_text text,expected_count integer default 1)
returns void language plpgsql as $$
declare definition text;
begin
 definition:=replace(pg_get_functiondef(signature::regprocedure),E'\r\n',E'\n');
 if (length(definition)-length(replace(definition,old_text,'')))/length(old_text)<>expected_count then
  raise exception 'Unexpected assessment target baseline: %',signature;
 end if;
 execute replace(definition,old_text,new_text);
end;$$;

-- Reuse the audited single promotion implementation with an explicit target.
-- The existing sequential progression entry points keep their existing contract.
do $$
declare definition text; old_header text; new_header text;
begin
 definition:=replace(pg_get_functiondef('public._apply_assessed_membership_promotion(uuid,date,uuid,text)'::regprocedure),E'\r\n',E'\n');
 if position('public._require_active_grading_assessor(assessor_member_id)' in definition)=0
  or position('for update' in lower(definition))=0 then raise exception 'Appointed-assessor promotion baseline required';end if;
 old_header:=substring(definition from '^CREATE OR REPLACE FUNCTION [^\n]+');
 new_header:=replace(old_header,'_apply_assessed_membership_promotion(','_apply_assessed_membership_target(');
 new_header:=left(new_header,length(new_header)-1)||', assessment_target_rank_id uuid DEFAULT NULL::uuid)';
 definition:=replace(definition,old_header,new_header);
 if (length(definition)-length(replace(definition,'public.get_next_membership_promotion(target_membership_id)','')))/length('public.get_next_membership_promotion(target_membership_id)')<>1 then
  raise exception 'Unexpected assessed promotion resolver';end if;
 definition:=replace(definition,'public.get_next_membership_promotion(target_membership_id)',
  'public._resolve_assessment_rank_target(target_membership_id, assessment_target_rank_id)');
 execute definition;
end;$$;
alter function public._apply_assessed_membership_target(uuid,date,uuid,text,uuid) owner to postgres;
revoke all on function public._apply_assessed_membership_target(uuid,date,uuid,text,uuid) from public,anon,authenticated,service_role;

-- Both validation and persisted preparation snapshots must resolve the chosen
-- target. This runs with the existing membership lock held in the first loop.
select pg_temp.replace_assessment_target_marker('public.prepare_bulk_assessment(uuid,uuid,date,uuid,text,uuid,jsonb)',
 $old$    where membership_id = selected.membership_id;$old$,
 $new$    where membership_id = selected.membership_id;
    if not found then
      raise exception 'Membership % is not eligible for this assessment', selected.membership_id;
    end if;
    if selected.expected_sub_rank_to_id is not null then
      raise exception 'Assessment targets must be ranks, not tiers';
    end if;
    select next_rank_id,next_rank_name,next_sub_rank_id,next_sub_rank_name,next_level,is_rank_promotion
    into candidate.rank_to_id,candidate.rank_to_name,candidate.sub_rank_to_id,
      candidate.sub_rank_to_name,candidate.level_to,candidate.is_rank_promotion
    from public._resolve_assessment_rank_target(selected.membership_id,selected.expected_rank_to_id);$new$,2);

select pg_temp.replace_assessment_target_marker('public.submit_bulk_assessment(uuid,uuid,date,uuid,text,uuid,jsonb)',
 'public.get_next_membership_promotion(decision.membership_id)',
 'public._resolve_assessment_rank_target(decision.membership_id, decision.expected_rank_to_id)');
select pg_temp.replace_assessment_target_marker('public.submit_bulk_assessment(uuid,uuid,date,uuid,text,uuid,jsonb)',
 $old$public._apply_assessed_membership_promotion(
        (validated_item ->> 'membership_id')::uuid,$old$,
 $new$public._apply_assessed_membership_target(
        (validated_item ->> 'membership_id')::uuid,$new$);
select pg_temp.replace_assessment_target_marker('public.submit_bulk_assessment(uuid,uuid,date,uuid,text,uuid,jsonb)',
 $old$          else null
        end
      );$old$,
 $new$          else null
        end,
        (validated_item ->> 'rank_to_id')::uuid
      );$new$);

-- A prepared certificate's starting grade cannot silently change. Lock in the
-- same membership order as submission, then compare the saved starting facts.
select pg_temp.replace_assessment_target_marker('public.finalize_prepared_bulk_assessment(uuid,uuid,jsonb)',
 $old$  result := public.submit_bulk_assessment($old$,
 $new$  perform membership.id
  from public.class_memberships membership
  join public.prepared_assessment_candidates candidate on candidate.membership_id=membership.id
  where candidate.prepared_assessment_id=prepared.id
  order by membership.id for update of membership;
  if exists (
    select 1 from public.prepared_assessment_candidates candidate
    join public.class_memberships membership on membership.id=candidate.membership_id
    where candidate.prepared_assessment_id=prepared.id
      and (membership.rank_id is distinct from candidate.rank_before_id
        or membership.sub_rank_id is distinct from candidate.sub_rank_before_id)
  ) then
    raise exception 'Prepared assessment starting grade changed; prepare a new roster';
  end if;
  result := public.submit_bulk_assessment($new$);

do $$declare definition text;begin
 definition:=pg_get_functiondef('public.submit_bulk_assessment(uuid,uuid,date,uuid,text,uuid,jsonb)'::regprocedure);
 if position('New submitted attempts receive distinct assessment numbers.' in definition)=0
  or position('public._apply_assessed_membership_target(' in definition)=0
  or position('if validated_item ->> ''outcome'' = ''pass'' then' in definition)=0 then
  raise exception 'Numbered attempts and pass-only atomic promotion are required';end if;
 if has_function_privilege('authenticated','public._apply_assessed_membership_target(uuid,date,uuid,text,uuid)','execute')
  or has_function_privilege('authenticated','public.submit_bulk_assessment(uuid,uuid,date,uuid,text,uuid,jsonb)','execute') then
  raise exception 'Private assessment mutation must not be directly callable';end if;
end;$$;
notify pgrst,'reload schema';
commit;
