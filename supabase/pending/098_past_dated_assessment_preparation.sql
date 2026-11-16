-- Completed exams may be recorded after the assessment day.
-- Keep finalization's future-date and latest-valid-promotion checks unchanged.
begin;

do $migration$
declare
  signature regprocedure := 'public.prepare_bulk_assessment(uuid,uuid,date,uuid,text,uuid,jsonb)'::regprocedure;
  definition text;
  old_guard text := $guard$  if assessment_date < (timezone('Asia/Jakarta', now()))::date then
    raise exception 'A new assessment cannot be prepared in the past';
  end if;$guard$;
  new_guard text := $guard$  if not isfinite(assessment_date) then
    raise exception 'Valid assessment date required';
  end if;$guard$;
begin
  definition := replace(pg_get_functiondef(signature), E'\r\n', E'\n');
  if (length(definition) - length(replace(definition, old_guard, ''))) / length(old_guard) <> 1 then
    raise exception 'Unexpected past-date assessment preparation baseline';
  end if;
  -- CREATE OR REPLACE preserves this routine's owner and execution permissions.
  execute replace(definition, old_guard, new_guard);
end;
$migration$;

notify pgrst, 'reload schema';
commit;
