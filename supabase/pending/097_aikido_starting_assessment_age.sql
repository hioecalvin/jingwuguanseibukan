-- Aikido starting assessments: age on assessment date, never today's age.
-- Ranked members retain 096's strictly higher same-class targets.
begin;

create function public._starting_assessment_target_allowed(class_name text,current_rank_id uuid,
 target_rank_name text,birth_date date,assessment_date date)
returns boolean language sql stable set search_path=pg_catalog as $$
 select case when lower(trim(class_name))<>'aikido' or current_rank_id is not null then true
 else coalesce(isfinite(assessment_date) and isfinite(birth_date)
  and birth_date<=current_date and birth_date<=assessment_date
  and (target_rank_name='5th Kyu' or
   (target_rank_name='9th Kyu' and extract(year from age(assessment_date,birth_date))<15)),false) end
$$;
alter function public._starting_assessment_target_allowed(text,uuid,text,date,date) owner to postgres;
revoke all on function public._starting_assessment_target_allowed(text,uuid,text,date,date) from public,anon,authenticated,service_role;

create function public._resolve_dated_assessment_target(target_membership_id uuid,target_rank_id uuid,assessment_date date)
returns table(next_rank_id uuid,next_rank_name text,next_sub_rank_id uuid,
 next_sub_rank_name text,next_level text,is_rank_promotion boolean)
language plpgsql security definer set search_path=pg_catalog as $$
declare destination record; m public.class_memberships%rowtype; birth_date date; class_name text;
begin
 if assessment_date is null or not isfinite(assessment_date) then raise exception 'Valid assessment date required';end if;
 select * into strict destination from public._resolve_assessment_rank_target(target_membership_id,target_rank_id);
 select * into strict m from public.class_memberships where id=target_membership_id;
 select name into strict class_name from public.classes where id=m.class_id;
 if m.rank_id is null and lower(trim(class_name))='aikido' then
  -- Hold the date used for validation through the preparation/submission transaction.
  select p.date_of_birth into strict birth_date from public.profiles p where p.id=m.user_id for share;
  if birth_date is null or not isfinite(birth_date) or birth_date>current_date or birth_date>assessment_date then
   raise exception 'Update the member date of birth before preparing an ungraded Aikido assessment';
  end if;
  if not public._starting_assessment_target_allowed(class_name,m.rank_id,destination.next_rank_name,birth_date,assessment_date) then
   raise exception 'Ungraded Aikido: age 15 or older can assess for 5th Kyu only; under 15 can choose 5th or 9th Kyu';
  end if;
 end if;
 return query select destination.next_rank_id,destination.next_rank_name,destination.next_sub_rank_id,
  destination.next_sub_rank_name,destination.next_level,destination.is_rank_promotion;
end;$$;
alter function public._resolve_dated_assessment_target(uuid,uuid,date) owner to postgres;
revoke all on function public._resolve_dated_assessment_target(uuid,uuid,date) from public,anon,authenticated,service_role;

create function public.get_dated_assessment_candidates(target_class_id uuid,target_dojo_id uuid,target_assessment_date date)
returns setof jsonb language plpgsql stable security definer set search_path=pg_catalog as $$
declare c record; options jsonb; row_data jsonb;
begin
 if not coalesce(public.is_active_super_admin(auth.uid()),false) then
  raise exception using errcode='42501',message='Only an active Super Admin can select assessment targets';
 end if;
 if target_assessment_date is null or not isfinite(target_assessment_date) then raise exception 'Valid assessment date required';end if;
 for c in select candidate.*,p.registration_number,p.date_of_birth
  from public.get_bulk_assessment_candidates(target_class_id,target_dojo_id) candidate
  join public.profiles p on p.id=candidate.user_id order by candidate.full_name,candidate.membership_id loop
  select coalesce(jsonb_agg(jsonb_build_object('rank_to_id',r.id,'rank_to_name',r.name,
   'sub_rank_to_id',null,'sub_rank_to_name',null,'level_to',r.level,'is_rank_promotion',true)
   order by r.sort_order,r.name,r.id),'[]'::jsonb) into options
  from public.ranks r left join public.ranks held on held.id=c.rank_before_id
  where r.class_id=c.class_id and (c.rank_before_id is null or r.sort_order>held.sort_order)
   and public._starting_assessment_target_allowed(c.class_name,c.rank_before_id,r.name,c.date_of_birth,target_assessment_date);
  row_data:=(to_jsonb(c)-'date_of_birth'-'registration_number')||jsonb_build_object(
   'member_id',c.registration_number,'target_options',options,'target_blocked_reason',
   case when options='[]'::jsonb then 'Update the member date of birth and starting-grade configuration before including this member.' else null end);
  -- Replace the sequential default too: adults must never retain the old 9th Kyu target.
  return next row_data||coalesce(options->0,jsonb_build_object('rank_to_id',null,'rank_to_name',null));
 end loop;
end;$$;
alter function public.get_dated_assessment_candidates(uuid,uuid,date) owner to postgres;
revoke all on function public.get_dated_assessment_candidates(uuid,uuid,date) from public,anon,authenticated,service_role;
grant execute on function public.get_dated_assessment_candidates(uuid,uuid,date) to authenticated;

-- Existing clients remain readable; mutations always validate their actual assessment date.
create or replace function public.get_bulk_assessment_candidates_with_member_ids(target_class_id uuid,target_dojo_id uuid default null)
returns setof jsonb language sql stable security definer set search_path=pg_catalog as $$
 select * from public.get_dated_assessment_candidates(target_class_id,target_dojo_id,(timezone('Asia/Jakarta',now()))::date)
$$;

create function pg_temp.replace_starting_age_marker(signature text,old_text text,new_text text,expected_count integer default 1)
returns void language plpgsql as $$
declare definition text;
begin
 definition:=replace(pg_get_functiondef(signature::regprocedure),E'\r\n',E'\n');
 if (length(definition)-length(replace(definition,old_text,'')))/length(old_text)<>expected_count then
  raise exception 'Unexpected starting assessment baseline: %',signature;
 end if;
 execute replace(definition,old_text,new_text);
end;$$;
select pg_temp.replace_starting_age_marker('public.prepare_bulk_assessment(uuid,uuid,date,uuid,text,uuid,jsonb)',
 'public._resolve_assessment_rank_target(selected.membership_id,selected.expected_rank_to_id)',
 'public._resolve_dated_assessment_target(selected.membership_id,selected.expected_rank_to_id,assessment_date)',2);
select pg_temp.replace_starting_age_marker('public.submit_bulk_assessment(uuid,uuid,date,uuid,text,uuid,jsonb)',
 'public._resolve_assessment_rank_target(decision.membership_id, decision.expected_rank_to_id)',
 'public._resolve_dated_assessment_target(decision.membership_id, decision.expected_rank_to_id,assessment_date)');
select pg_temp.replace_starting_age_marker('public._apply_assessed_membership_target(uuid,date,uuid,text,uuid)',
 'public._resolve_assessment_rank_target(target_membership_id, assessment_target_rank_id)',
 'public._resolve_dated_assessment_target(target_membership_id, assessment_target_rank_id,promotion_effective_date)');
notify pgrst,'reload schema';
commit;
