-- Pending 068: appointed Member assessor at every grade. No member/history rewrites.
begin;
create or replace function public._require_active_grading_assessor(target_assessor_id uuid)
returns text language plpgsql security definer set search_path to pg_catalog
as $function$
declare assessor_name text;
begin
  select regexp_replace(btrim(p.full_name), '\s+', ' ', 'g') into assessor_name
  from public.profiles p
  where p.id=target_assessor_id and p.is_grading_assessor=true
    and p.account_status::text='active' and p.date_of_passing is null
  for share of p;
  if assessor_name is null or assessor_name='' then
    raise exception 'Select an active appointed Member grading assessor';
  end if;
  return assessor_name;
end;
$function$;
alter function public._require_active_grading_assessor(uuid) owner to postgres;
revoke all on function public._require_active_grading_assessor(uuid) from public,anon,authenticated,service_role;

-- Temporary helper refuses missing/duplicated markers; never changes unrelated code.
create function pg_temp.replace_assessor_marker(signature text, old_text text, new_text text)
returns void language plpgsql as $helper$
declare definition text;
begin
  definition:=replace(pg_get_functiondef(signature::regprocedure),E'\r\n',E'\n');
  if (length(definition)-length(replace(definition,old_text,'')))/length(old_text)<>1 then
    raise exception 'Unexpected assessor baseline: %',signature;
  end if;
  execute replace(definition,old_text,new_text);
end;
$helper$;

select pg_temp.replace_assessor_marker('public._apply_assessed_membership_promotion(uuid,date,uuid,text)',$old$  if promotion.next_level = 'yudansha' then
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

$old$,$new$  resolved_assessor_type := 'member';
  if nullif(btrim(external_assessor_name), '') is not null then
    raise exception 'Use the appointed Member assessor for every grade';
  end if;
  assessor_display_name := public._require_active_grading_assessor(assessor_member_id);

$new$);

select pg_temp.replace_assessor_marker('public.prepare_bulk_assessment(uuid,uuid,date,uuid,text,uuid,jsonb)',$old$    needs_member_assessor := needs_member_assessor or candidate.level_to = 'mudansha';
    needs_external_assessor := needs_external_assessor or candidate.level_to = 'yudansha';$old$,$new$    needs_member_assessor := true;$new$);

select pg_temp.replace_assessor_marker('public.prepare_bulk_assessment(uuid,uuid,date,uuid,text,uuid,jsonb)',$old$  if needs_member_assessor and not exists (
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

$old$,$new$  if normalized_external is not null then
    raise exception 'Use the appointed Member assessor for every grade';
  end if;
  perform public._require_active_grading_assessor(assessor_member_id);

$new$);

select pg_temp.replace_assessor_marker('public.submit_bulk_assessment(uuid,uuid,date,uuid,text,uuid,jsonb)',$old$  select regexp_replace(btrim(profile.full_name), '\s+', ' ', 'g')
  into normalized_member_assessor_name
  from public.profiles as profile
  where profile.id = assessor_member_id
    and profile.is_grading_assessor = true
    and profile.account_status = 'active'
    and profile.date_of_passing is null
  for share of profile;

$old$,$new$  if normalized_external_assessor_name is not null then
    raise exception 'Use the appointed Member assessor for every grade';
  end if;
  normalized_member_assessor_name := public._require_active_grading_assessor(assessor_member_id);

$new$);

select pg_temp.replace_assessor_marker('public.submit_bulk_assessment(uuid,uuid,date,uuid,text,uuid,jsonb)',$old$    if promotion.next_level::text = 'yudansha' then
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

$old$,$new$$new$);

select pg_temp.replace_assessor_marker('public.submit_bulk_assessment(uuid,uuid,date,uuid,text,uuid,jsonb)',$old$      'assessor_type', case
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
$old$,$new$      'assessor_type', 'member',
      'assessor_member_id', assessor_member_id,
      'assessor_name', normalized_member_assessor_name
$new$);


-- Preserve issued attribution when an assessor is renamed or no longer appointed.
select pg_temp.replace_assessor_marker('public.verify_prepared_assessment_certificate(uuid)',
 $old$  where certificate.id = target_certificate_id$old$,
 $new$  left join public.assessment_results as result_row
    on result_row.batch_id = prepared.result_batch_id
   and result_row.membership_id = candidate.membership_id
  where certificate.id = target_certificate_id$new$);

select pg_temp.replace_assessor_marker('public.verify_prepared_assessment_certificate(uuid)',
 $old$    coalesce(prepared.external_assessor_name, member_assessor.full_name::text),$old$,
 $new$    case when prepared.status='submitted' then result_row.assessor_name_snapshot
      else coalesce(prepared.external_assessor_name, member_assessor.full_name::text) end,$new$);
-- PostgreSQL requires recreation to append a TABLE output. RESTRICT refuses
-- unexpected dependants; the transaction restores everything on any failure.
do $snapshot_rpc$
declare definition text; old_oid oid; expected_acl text[]; actual_acl text[]; original_comment text; marker text;
begin
  old_oid:='public.get_prepared_bulk_assessment(uuid)'::regprocedure;
  original_comment:=obj_description(old_oid,'pg_proc');
  if not exists(select 1 from pg_proc where oid=old_oid and prosecdef
    and pg_get_userbyid(proowner)='postgres' and proconfig=array['search_path=public, pg_temp']) then
    raise exception 'Prepared reader security baseline changed';
  end if;
  select array_agg(grantee::text||':'||privilege_type||':'||is_grantable::text order by grantee,privilege_type,is_grantable)
    into expected_acl from aclexplode((select proacl from pg_proc where oid=old_oid));
  if has_function_privilege('anon',old_oid,'EXECUTE')
    or not has_function_privilege('authenticated',old_oid,'EXECUTE')
    or not has_function_privilege('service_role',old_oid,'EXECUTE') then raise exception 'Prepared reader ACL changed';end if;
  definition:=replace(pg_get_functiondef(old_oid),E'\r\n',E'\n');
  foreach marker in array array['prepared_by_name text)','    preparer.full_name::text'] loop
    if (length(definition)-length(replace(definition,marker,'')))/length(marker)<>1 then raise exception 'Prepared reader marker changed';end if;
  end loop;
  if position('prepared_by_name text)' in definition)=0 or position('    preparer.full_name::text' in definition)=0
    or position('public.is_active_super_admin(auth.uid())' in definition)=0 then raise exception 'Prepared reader definition changed';end if;
  definition:=replace(definition,'prepared_by_name text)','prepared_by_name text, assessor_name_snapshot text)');
  definition:=replace(definition,'    preparer.full_name::text','    preparer.full_name::text, result_row.assessor_name_snapshot::text');
  drop function public.get_prepared_bulk_assessment(uuid) restrict;
  execute definition;
  alter function public.get_prepared_bulk_assessment(uuid) owner to postgres;
  revoke all on function public.get_prepared_bulk_assessment(uuid) from public,anon,authenticated,service_role;
  grant execute on function public.get_prepared_bulk_assessment(uuid) to authenticated,service_role;
  if original_comment is not null then execute format('comment on function public.get_prepared_bulk_assessment(uuid) is %L',original_comment);end if;
  select array_agg(grantee::text||':'||privilege_type||':'||is_grantable::text order by grantee,privilege_type,is_grantable)
    into actual_acl from aclexplode((select proacl from pg_proc where oid='public.get_prepared_bulk_assessment(uuid)'::regprocedure));
  if actual_acl is distinct from expected_acl then raise exception 'Prepared reader exact ACL not preserved';end if;
end;
$snapshot_rpc$;

do $verify$
declare signature text; role_name text; definition text;
begin
  foreach signature in array array['public._apply_assessed_membership_promotion(uuid,date,uuid,text)','public._require_active_grading_assessor(uuid)'] loop
    foreach role_name in array array['anon','authenticated','service_role'] loop
      if has_function_privilege(role_name,signature,'EXECUTE') then raise exception 'Private assessor routine exposed'; end if;
    end loop;
  end loop;
  foreach signature in array array['public.prepare_bulk_assessment(uuid,uuid,date,uuid,text,uuid,jsonb)','public.submit_bulk_assessment(uuid,uuid,date,uuid,text,uuid,jsonb)'] loop
    definition:=pg_get_functiondef(signature::regprocedure);
    if position('public.is_active_super_admin(auth.uid())' in definition)=0
       or position('public._require_active_grading_assessor(assessor_member_id)' in definition)=0
       or has_function_privilege('anon',signature,'EXECUTE')
       or (signature like 'public.prepare_%' and not has_function_privilege('authenticated',signature,'EXECUTE'))
       or (signature like 'public.submit_%' and has_function_privilege('authenticated',signature,'EXECUTE')) then
      raise exception 'Assessment role/assessor boundary changed';
    end if;
  end loop;
  definition:=pg_get_functiondef('public.submit_bulk_assessment(uuid,uuid,date,uuid,text,uuid,jsonb)'::regprocedure);
  if position('New submitted attempts receive distinct assessment numbers.' in definition)=0
     or position('public._apply_assessed_membership_promotion(' in definition)=0
     or position('r.sort_order' in definition)=0 then raise exception 'Numbering or atomic progression baseline missing'; end if;
end;
$verify$;
drop function pg_temp.replace_assessor_marker(text,text,text);
notify pgrst,'reload schema';
commit;
