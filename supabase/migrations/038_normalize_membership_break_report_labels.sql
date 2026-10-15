begin;

-- Keep the two administrative report RPCs aligned with the membership states
-- retained by migration 037.  Transform the catalog definitions in place so
-- every unrelated field, join, ordering rule, authorization check and function
-- attribute remains semantically equivalent to the installed predecessor.
do $migration$
declare
  routine_oid oid;
  routine_definition text;
  repaired_definition text;
  match_count integer;
begin
  routine_oid := pg_catalog.to_regprocedure(
    'public.get_member_report_history()'
  );

  if routine_oid is null then
    raise exception 'Missing function public.get_member_report_history()';
  end if;

  select pg_catalog.pg_get_functiondef(routine_oid)
  into routine_definition;

  if routine_definition ~* $pattern$when\s+membership[.]status\s+in\s*\(\s*'break'\s*,\s*'break_1'\s*,\s*'break_2'\s*\)\s+then\s+'Break'$pattern$ then
    repaired_definition := routine_definition;
  else
    select count(*)
    into match_count
    from pg_catalog.regexp_matches(
      routine_definition,
      $pattern$when\s+membership[.]status\s*=\s*'break'\s+then\s+'Break'$pattern$,
      'gi'
    );

    if match_count <> 1 then
      raise exception
        'Unexpected get_member_report_history status mapping (% matches)',
        match_count;
    end if;

    repaired_definition := pg_catalog.regexp_replace(
      routine_definition,
      $pattern$when\s+membership[.]status\s*=\s*'break'\s+then\s+'Break'$pattern$,
      $replacement$when membership.status in ('break', 'break_1', 'break_2') then 'Break'$replacement$,
      'i'
    );
  end if;

  execute repaired_definition;

  routine_oid := pg_catalog.to_regprocedure(
    'public.get_official_member_record(uuid)'
  );

  if routine_oid is null then
    raise exception
      'Missing function public.get_official_member_record(uuid)';
  end if;

  select pg_catalog.pg_get_functiondef(routine_oid)
  into routine_definition;

  if routine_definition ~* $pattern$when\s+m[.]status\s+in\s*\(\s*'break'\s*,\s*'break_1'\s*,\s*'break_2'\s*\)\s+then\s+'Break'$pattern$ then
    repaired_definition := routine_definition;
  else
    select count(*)
    into match_count
    from pg_catalog.regexp_matches(
      routine_definition,
      $pattern$when\s+m[.]status\s+in\s*\(\s*'break_1'\s*,\s*'break_2'\s*\)\s+then\s+'Break'$pattern$,
      'gi'
    );

    if match_count <> 1 then
      raise exception
        'Unexpected get_official_member_record status mapping (% matches)',
        match_count;
    end if;

    repaired_definition := pg_catalog.regexp_replace(
      routine_definition,
      $pattern$when\s+m[.]status\s+in\s*\(\s*'break_1'\s*,\s*'break_2'\s*\)\s+then\s+'Break'$pattern$,
      $replacement$when m.status in ('break', 'break_1', 'break_2') then 'Break'$replacement$,
      'i'
    );
  end if;

  execute repaired_definition;
end;
$migration$;

-- Fail the migration if either replacement did not produce the intended
-- semantic mapping.  CREATE OR REPLACE preserves the routines' existing ACLs.
do $postflight$
declare
  report_definition text;
  official_definition text;
begin
  select pg_catalog.pg_get_functiondef(
    pg_catalog.to_regprocedure('public.get_member_report_history()')
  )
  into report_definition;

  select pg_catalog.pg_get_functiondef(
    pg_catalog.to_regprocedure('public.get_official_member_record(uuid)')
  )
  into official_definition;

  if report_definition !~* $pattern$when\s+membership[.]status\s+in\s*\(\s*'break'\s*,\s*'break_1'\s*,\s*'break_2'\s*\)\s+then\s+'Break'$pattern$ then
    raise exception
      'get_member_report_history does not normalize every Break state';
  end if;

  if official_definition !~* $pattern$when\s+m[.]status\s+in\s*\(\s*'break'\s*,\s*'break_1'\s*,\s*'break_2'\s*\)\s+then\s+'Break'$pattern$ then
    raise exception
      'get_official_member_record does not normalize every Break state';
  end if;
end;
$postflight$;

commit;
