-- Keep the optional Aikikai number on the person, but only use it in Aikido.
-- Definitions below are patched in place to retain grants, auth/claim handling,
-- report/audit formats, assessor snapshots and the existing access checks.
begin;
set local search_path = pg_catalog;

do $migration$
declare
  item record;
  original text;
  updated text;
  options text[];
begin
  for item in select * from (values
    ('public.handle_new_user()', 'b97f87333b2bc6f964762543cccfed68',
      $old$coalesce(new.raw_user_meta_data ->> 'aikikai_registration_number', '')$old$,
      $new$case when exists (
          select 1 from public.classes as requested
          where requested.id::text = lower(new.raw_user_meta_data ->> 'requested_class_id')
            and lower(btrim(requested.name)) = 'aikido'
        ) then new.raw_user_meta_data ->> 'aikikai_registration_number' end$new$),
    ('public.normalize_member_application()', '8ff15618cf5d391f984f1643a3e15666',
      $old$public.clean_text(
          new.aikikai_registration_number
        )$old$,
      $new$case when exists (
            select 1 from public.member_invitations invitation
            join public.classes c on c.id = invitation.class_id
            where invitation.id = new.invitation_id and lower(btrim(c.name)) = 'aikido'
          ) then public.clean_text(new.aikikai_registration_number) end$new$),
    ('public.get_official_member_record(uuid)', '3389e5782d995bbb6378a57f073229d5',
      'p.aikikai_registration_number,', $new$case when lower(btrim(c.name)) = 'aikido' then p.aikikai_registration_number end,$new$),
    ('public.get_certificate_history()', '07559c45d269a0f0dac027d5a14f2aef',
      'p.aikikai_registration_number::text', $new$case when lower(btrim(c.name)) = 'aikido' then p.aikikai_registration_number::text end$new$),
    ('public.get_latest_valid_rank_promotion(uuid)', '05a59c1ef2794beecaf13ecaa9ccf273',
      'p.aikikai_registration_number::text', $new$case when lower(btrim(c.name)) = 'aikido' then p.aikikai_registration_number::text end$new$),
    ('public.create_member_report_audit(uuid)', '53619c8e49cab83b84c8739571d620a4',
      'member_profile.aikikai_registration_number,', $new$case when lower(btrim(class_row.name)) = 'aikido' then member_profile.aikikai_registration_number end,$new$),
    ('public.prepare_bulk_assessment(uuid,uuid,date,uuid,text,uuid,jsonb)', 'c0221737248c98145d6cc5e94a7978a7',
      'profile_details.aikikai_registration_number,', $new$case when lower(btrim(candidate.class_name)) = 'aikido' then profile_details.aikikai_registration_number end,$new$),
    ('public.get_prepared_bulk_assessment(uuid)', '4e74dd9d3e0e030cb6609431921e14cb',
      'candidate.aikikai_registration_number_snapshot,', $new$case when lower(btrim(candidate.class_name_snapshot)) = 'aikido' then candidate.aikikai_registration_number_snapshot end,$new$)
  ) as plan(signature, baseline, marker, replacement)
  loop
    original := replace(pg_get_functiondef(item.signature::regprocedure), E'\r\n', E'\n');
    if md5(original) <> item.baseline or cardinality(string_to_array(original, item.marker)) <> 2 then
      raise exception 'Unexpected Aikikai routine baseline for %', item.signature;
    end if;
    execute replace(original, item.marker, item.replacement);
  end loop;

  for item in select * from (values
    ('public.certificate_archive', '629ec847883d7dab097e2db8a7f51b6f', 'p.aikikai_registration_number', 'c.name', 2),
    ('public.document_archive', '6dce3a3516af2989c7dc57528b88bb82', 'ad.aikikai_registration_number', 'ad.class_name', 1),
    ('public.admin_visible_requests', '71745db05a26362bbb76521f8b71045b', 'profile_record.aikikai_registration_number', 'class_record.name', 1),
    ('public.admin_visible_members', 'dfbd2660faa94c516fe0644d125ab27a', 'p.aikikai_registration_number', 'c.name', 1)
  ) as plan(relation, baseline, marker, class_name, occurrences)
  loop
    original := pg_get_viewdef(item.relation::regclass);
    if md5(original) <> item.baseline or cardinality(string_to_array(original, item.marker)) <> item.occurrences + 1 then
      raise exception 'Unexpected Aikikai view baseline for %', item.relation;
    end if;
    select reloptions into options from pg_class where oid = item.relation::regclass;
    updated := replace(original, item.marker,
      format('case when lower(btrim(%s)) = ''aikido'' then %s end AS aikikai_registration_number', item.class_name, item.marker));
    execute format('create or replace view %s %s as %s', item.relation,
      case when options is null then '' else format('with (%s)', array_to_string(options, ', ')) end, updated);
  end loop;
end
$migration$;

commit;
