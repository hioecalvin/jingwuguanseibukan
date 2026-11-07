-- Rank Before on imported historical grades follows the configured class ladder.
-- Source cells, dates, outcomes, assessment numbers and live snapshots are preserved.
begin;
do $migration$
declare definition text; revised text; previous_acl aclitem[]; previous_owner oid;
begin
 select pg_get_functiondef(oid),proacl,proowner into definition,previous_acl,previous_owner
 from pg_proc where oid='public.get_assessment_result_history(uuid)'::regprocedure;
 if cardinality(string_to_array(definition,'null::text,r.rank_name,r.entry_kind,r.assessor_name,'))<>2
 or cardinality(string_to_array(definition,'from exam_import_private.records r join exam_import_private.source_rows s on s.id=r.source_row_id join public.classes c on c.id=r.class_id'))<>2 then
  raise exception 'Unexpected historical assessment function baseline';
 end if;
 revised:=replace(definition,'null::text,r.rank_name,r.entry_kind,r.assessor_name,',
  $replacement$case when r.entry_kind='recorded_grade' and assessed.id is not null then prior.name end,r.rank_name,r.entry_kind,r.assessor_name,$replacement$);
 revised:=replace(revised,
  $marker$case when r.member_user_id is null then E'\nMember match: awaiting review' else '' end,$marker$,
  $replacement$case when r.member_user_id is null then E'\nMember match: awaiting review' else '' end ||
    case when r.entry_kind='recorded_grade' and assessed.id is not null and prior.name is not null
     then E'\nRank Before derived from the class grade order.' else '' end,$replacement$);
 revised:=replace(revised,
  'from exam_import_private.records r join exam_import_private.source_rows s on s.id=r.source_row_id join public.classes c on c.id=r.class_id',
  $replacement$from exam_import_private.records r join exam_import_private.source_rows s on s.id=r.source_row_id join public.classes c on c.id=r.class_id
  left join public.ranks assessed on assessed.id=r.rank_id and assessed.class_id=r.class_id
  left join lateral (
   select case when count(*)=0 then 'Ungraded' when count(*)=1 then min(lower_rank.name)::text else null end as name
   from public.ranks lower_rank
   where lower_rank.class_id=r.class_id and lower_rank.sort_order=(
    select max(candidate.sort_order) from public.ranks candidate
    where candidate.class_id=r.class_id and candidate.sort_order<assessed.sort_order)
  ) prior on true$replacement$);
 if revised=definition or revised not like '%Rank Before derived from the class grade order.%' then raise exception 'Historical predecessor patch incomplete';end if;
 execute revised;
 if not exists(select 1 from pg_proc where oid='public.get_assessment_result_history(uuid)'::regprocedure
  and proacl is not distinct from previous_acl and proowner=previous_owner and prosecdef
  and proconfig @> array['search_path=pg_catalog']) then raise exception 'Historical history privileges changed';end if;
end $migration$;
notify pgrst,'reload schema';
commit;
