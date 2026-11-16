begin;
select set_config('app.current_uid','00000000-0000-0000-0000-000000000001',false);

do $test$
declare
  c uuid := '10000000-0000-0000-0000-000000000001';
  assessor uuid := '00000000-0000-0000-0000-000000000004';
  fifth uuid := '60000000-0000-0000-0000-000000000003';
  fourth uuid := '60000000-0000-0000-0000-000000000004';
  today date := (timezone('Asia/Jakarta', now()))::date;
  member uuid; membership uuid; first_membership uuid;
  selections jsonb := '[]'; results jsonb := '[]'; answer jsonb;
  prepared_id uuid; future_id uuid; stale_id uuid;
  prepare_key uuid := gen_random_uuid(); submit_key uuid := gen_random_uuid();
  before_prepared bigint; bad_date date; rejected boolean; i integer;
begin
  -- Thirteen active fictional members exercise the user's actual bulk shape.
  for i in 1..13 loop
    member := gen_random_uuid(); membership := gen_random_uuid();
    if i=1 then first_membership := membership; end if;
    insert into public.profiles(id,full_name,registration_number,date_of_birth)
      values(member,'Past-date fixture '||i,'JS-PAST-'||i,'1990-01-01');
    insert into public.class_memberships(id,user_id,class_id,dojo_id,status,rank_id,level)
      select membership,member,c,dojo_id,'active','60000000-0000-0000-0000-000000000001','mudansha'
      from public.class_memberships where id='50000000-0000-0000-0000-000000000001';
    selections := selections || jsonb_build_array(jsonb_build_object('membership_id',membership,'expected_rank_to_id',fifth,'expected_sub_rank_to_id',null));
    results := results || jsonb_build_array(jsonb_build_object('membership_id',membership,'outcome','pass'));
  end loop;

  select count(*) into before_prepared from public.prepared_assessments;
  foreach bad_date in array array[null::date,'infinity'::date,'-infinity'::date] loop
    rejected := false;
    begin
      perform public.prepare_bulk_assessment(gen_random_uuid(),c,bad_date,assessor,null,null,selections);
    exception when others then
      if position('date' in sqlerrm)=0 then raise;end if;
      rejected := true;
    end;
    if not rejected then raise exception 'Invalid assessment date accepted';end if;
  end loop;
  if (select count(*) from public.prepared_assessments)<>before_prepared then raise exception 'Rejected date left a prepared roster';end if;

  perform set_config('app.current_uid','00000000-0000-0000-0000-000000000003',true);
  rejected := false;
  begin
    perform public.prepare_bulk_assessment(gen_random_uuid(),c,today-1,assessor,null,null,selections);
  exception when others then
    if position('Only an active Super Admin can prepare assessments' in sqlerrm)=0 then raise;end if;
    rejected := true;end;
  if not rejected then raise exception 'Ordinary member prepared an assessment';end if;
  perform set_config('app.current_uid','00000000-0000-0000-0000-000000000001',true);

  -- Future preparation remains allowed, but no result may be awarded early.
  answer := public.prepare_bulk_assessment(gen_random_uuid(),c,today+1,assessor,null,null,selections);
  future_id := (answer->>'prepared_assessment_id')::uuid;
  rejected := false;
  begin perform public.finalize_prepared_bulk_assessment(future_id,gen_random_uuid(),results);
  exception when others then
    if position('future' in sqlerrm)=0 then raise;end if;rejected := true;
  end;
  if not rejected or exists(select from public.assessment_results where membership_id=first_membership) then
    raise exception 'Future assessment finalization accepted';end if;

  -- Yesterday's completed assessment prepares and finalizes exactly once.
  answer := public.prepare_bulk_assessment(prepare_key,c,today-1,assessor,null,null,selections);
  prepared_id := (answer->>'prepared_assessment_id')::uuid;
  answer := public.prepare_bulk_assessment(prepare_key,c,today-1,assessor,null,null,selections);
  if not (answer->>'idempotent')::boolean then raise exception 'Past preparation retry duplicated';end if;
  if (select count(*) from public.prepared_assessment_candidates where prepared_assessment_id=prepared_id)<>13 then
    raise exception 'Past assessment omitted candidates';end if;
  answer := public.finalize_prepared_bulk_assessment(prepared_id,submit_key,results);
  answer := public.finalize_prepared_bulk_assessment(prepared_id,submit_key,results);
  if not (answer->>'idempotent')::boolean then raise exception 'Past finalization retry duplicated';end if;
  if (select count(distinct r.assessment_number) from public.assessment_results r
      join public.prepared_assessment_candidates p on p.membership_id=r.membership_id
      where p.prepared_assessment_id=prepared_id and r.assessment_date=today-1 and r.outcome='pass')<>13 then
    raise exception 'Past result dates or unique numbers incorrect';end if;
  if (select count(*) from public.prepared_assessment_certificates cert
      join public.prepared_assessment_candidates p on p.id=cert.prepared_candidate_id
      where p.prepared_assessment_id=prepared_id and cert.status='issued')<>13 then
    raise exception 'Past passing certificates not issued';end if;
  if exists(select from public.class_memberships m join public.prepared_assessment_candidates p on p.membership_id=m.id
      where p.prepared_assessment_id=prepared_id and m.rank_id<>fifth) then raise exception 'Past promotions not applied';end if;

  -- Removing the preparation date restriction must not allow out-of-order awards.
  answer := public.prepare_bulk_assessment(gen_random_uuid(),c,today-2,assessor,null,null,
    jsonb_build_array(jsonb_build_object('membership_id',first_membership,'expected_rank_to_id',fourth,'expected_sub_rank_to_id',null)));
  stale_id := (answer->>'prepared_assessment_id')::uuid;
  rejected := false;
  begin perform public.finalize_prepared_bulk_assessment(stale_id,gen_random_uuid(),
    jsonb_build_array(jsonb_build_object('membership_id',first_membership,'outcome','pass')));
  exception when others then
    if position('earlier than the latest valid promotion' in sqlerrm)=0 then raise;end if;rejected := true;
  end;
  if not rejected or (select rank_id from public.class_memberships where id=first_membership)<>fifth
    or (select count(*) from public.assessment_results where membership_id=first_membership)<>1 then
    raise exception 'Earlier conflicting promotion changed history';end if;
end;
$test$;
rollback;
