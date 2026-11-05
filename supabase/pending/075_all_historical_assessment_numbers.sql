-- One-time, source-preserving renumber of the approved historical import.
-- Caller supplies an exact source/ledger baseline guard and an outer transaction.
lock table exam_import_private.records,public.assessment_results,public.assessment_year_counters in share row exclusive mode;
lock table exam_import_private.source_rows,exam_import_private.batches in share mode;
do $guard$
begin
 if current_user<>'postgres' then raise exception 'Historical numbering requires database owner';end if;
 if exists(select 1 from public.assessment_results) then raise exception 'Live assessment results exist; historical renumber requires reconciliation';end if;
 if (select count(*) from exam_import_private.records)<>766 then raise exception 'Expected exactly 766 approved historical facts';end if;
 if exists(select 1 from public.assessment_year_counters c full join
  (select recorded_year,max(annual_number) maximum from exam_import_private.records where annual_number is not null group by recorded_year) r
  on c.assessment_year=r.recorded_year where c.last_number is distinct from r.maximum) then
  raise exception 'Counter baseline differs from historical allocation';
 end if;
 if not exists(select 1 from pg_trigger where tgrelid='exam_import_private.records'::regclass
   and tgname='historical_exam_immutable' and tgenabled='O'
   and tgfoid='exam_import_private.guard_and_number_record()'::regprocedure) then raise exception 'Historical immutable guard differs';end if;
 if not exists(select 1 from pg_constraint where conrelid='public.assessment_year_counters'::regclass
   and conname='assessment_year_counters_assessment_year_check'
   and pg_get_constraintdef(oid)='CHECK (((assessment_year >= 1900) AND (assessment_year <= 2199)))') then
   raise exception 'Counter year constraint differs';end if;
 if not exists(select 1 from pg_constraint where conrelid='exam_import_private.records'::regclass
   and conname='records_check3' and pg_get_constraintdef(oid)=
   'CHECK (((assessment_number IS NULL) OR ((member_user_id IS NOT NULL) AND (entry_kind = ''recorded_grade''::text) AND (assessment_date IS NOT NULL) AND (assessment_number = (((recorded_year)::text || ''-''::text) || lpad((annual_number)::text, 4, ''0''::text))))))') then
   raise exception 'Historical numbering constraint differs';end if;
end $guard$;

create temp table assessment075_original on commit drop as
 select id,to_jsonb(r)-array['assessment_number','annual_number'] as source_fact
 from exam_import_private.records r;
create temp table assessment075_plan on commit drop as
 select r.id,coalesce(r.recorded_year,0) as numbering_year,
  row_number() over(partition by coalesce(r.recorded_year,0)
   order by r.assessment_date asc nulls last,r.recorded_month asc nulls last,
    r.grade_order,r.class_id,coalesce(r.member_id_snapshot,r.source_member_name) collate "C",
    s.sheet_name collate "C",s.source_row,r.source_cell collate "C",r.id)::integer as annual_number
 from exam_import_private.records r join exam_import_private.source_rows s on s.id=r.source_row_id;
do $$begin
 if (select count(*) from assessment075_plan)<>766 or exists(select 1 from assessment075_plan where annual_number>9999) then
  raise exception 'Historical annual sequence out of range';end if;
end$$;

create table exam_import_private.assessment_number_revisions (
 record_id uuid primary key references exam_import_private.records(id) on delete restrict,
 source_batch_id uuid not null references exam_import_private.batches(id) on delete restrict,
 source_row_id uuid not null references exam_import_private.source_rows(id) on delete restrict,
 source_cell text not null,
 previous_number text,
 previous_annual_number integer,
 new_number text not null unique,
 new_annual_number integer not null check(new_annual_number between 1 and 9999),
 numbering_year integer not null check(numbering_year=0 or numbering_year between 1900 and 2199),
 revised_at timestamptz not null default now(),
 database_actor name not null default current_user,
 check((previous_number is null)=(previous_annual_number is null)),
 check(new_number=lpad(numbering_year::text,4,'0')||'-'||lpad(new_annual_number::text,4,'0'))
);
alter table exam_import_private.assessment_number_revisions enable row level security;
alter table exam_import_private.assessment_number_revisions force row level security;
revoke all on exam_import_private.assessment_number_revisions from public,anon,authenticated,service_role;
create trigger assessment_number_revision_immutable before update or delete on exam_import_private.assessment_number_revisions
 for each row execute function exam_import_private.preserve_source();
insert into exam_import_private.assessment_number_revisions(record_id,source_batch_id,source_row_id,source_cell,previous_number,previous_annual_number,new_number,new_annual_number,numbering_year)
 select r.id,r.batch_id,r.source_row_id,r.source_cell,r.assessment_number,r.annual_number,
  lpad(p.numbering_year::text,4,'0')||'-'||lpad(p.annual_number::text,4,'0'),p.annual_number,p.numbering_year
 from exam_import_private.records r join assessment075_plan p on p.id=r.id;

alter table public.assessment_year_counters drop constraint assessment_year_counters_assessment_year_check;
alter table public.assessment_year_counters add constraint assessment_year_counters_assessment_year_check
 check(assessment_year=0 or assessment_year between 1900 and 2199);
alter table exam_import_private.records drop constraint records_check3;
alter table exam_import_private.records add constraint records_number_consistent
 check(assessment_number is null or assessment_number=lpad(coalesce(recorded_year,0)::text,4,'0')||'-'||lpad(annual_number::text,4,'0'));

-- Only the immutable update trigger is suspended, under held write-blocking locks.
-- Clearing both allocation fields avoids transient collisions between old/new references.
alter table exam_import_private.records disable trigger historical_exam_immutable;
update exam_import_private.records set assessment_number=null,annual_number=null;
update exam_import_private.records r set assessment_number=a.new_number,annual_number=a.new_annual_number
 from exam_import_private.assessment_number_revisions a where a.record_id=r.id;
alter table exam_import_private.records enable trigger historical_exam_immutable;
alter table exam_import_private.records alter column assessment_number set not null,alter column annual_number set not null;
insert into public.assessment_year_counters(assessment_year,last_number)
 select numbering_year,max(annual_number) from assessment075_plan group by numbering_year
 on conflict(assessment_year) do update set last_number=excluded.last_number;

-- Preserve source binding, source coordinate, class/rank/dojo and immutable guards.
-- Only allocation eligibility changes; all future imported facts share the live counter.
do $allocator$
declare definition text; before_acl aclitem[]; before_owner oid;
 marker text := $old$ if new.member_user_id is not null and new.entry_kind='recorded_grade' and new.assessment_date is not null then
  if new.recorded_year is distinct from extract(year from new.assessment_date)::int then raise exception 'Historical year mismatch';end if;
  insert into public.assessment_year_counters(assessment_year,last_number) values(new.recorded_year,1)
   on conflict(assessment_year) do update set last_number=assessment_year_counters.last_number+1 returning last_number into allocated;
  new.annual_number:=allocated;
  new.assessment_number:=new.recorded_year::text||'-'||lpad(allocated::text,4,'0');
 end if;$old$;
 replacement text := $new$ if new.assessment_date is not null and new.recorded_year is distinct from extract(year from new.assessment_date)::int then raise exception 'Historical year mismatch';end if;
 insert into public.assessment_year_counters(assessment_year,last_number) values(coalesce(new.recorded_year,0),1)
  on conflict(assessment_year) do update set last_number=assessment_year_counters.last_number+1 returning last_number into allocated;
 new.annual_number:=allocated;
 new.assessment_number:=lpad(coalesce(new.recorded_year,0)::text,4,'0')||'-'||lpad(allocated::text,4,'0');$new$;
begin
 select pg_get_functiondef(oid),proacl,proowner into definition,before_acl,before_owner
 from pg_proc where oid='exam_import_private.guard_and_number_record()'::regprocedure;
 definition:=replace(definition,E'\r\n',E'\n');
 marker:=replace(marker,E'\r\n',E'\n');
 replacement:=replace(replacement,E'\r\n',E'\n');
 if (length(definition)-length(replace(definition,marker,'')))/length(marker)<>1 then raise exception 'Historical allocation body differs';end if;
 execute replace(definition,marker,replacement);
 if not exists(select 1 from pg_proc where oid='exam_import_private.guard_and_number_record()'::regprocedure
   and proacl is not distinct from before_acl and proowner=before_owner and prosecdef
   and proconfig @> array['search_path=pg_catalog']) then raise exception 'Historical allocator ACL changed';end if;
end $allocator$;

do $verify$
begin
 if exists(select 1 from exam_import_private.records r full join assessment075_original o on o.id=r.id
   where o.source_fact is distinct from to_jsonb(r)-array['assessment_number','annual_number']) then
   raise exception 'Historical source facts changed';end if;
 if (select count(*) from exam_import_private.assessment_number_revisions)<>766
   or (select count(distinct assessment_number) from exam_import_private.records)<>766
   or exists(select 1 from exam_import_private.records r join exam_import_private.assessment_number_revisions a on a.record_id=r.id
    where r.assessment_number<>a.new_number or r.annual_number<>a.new_annual_number) then raise exception 'Historical numbering verification failed';end if;
 if exists(select 1 from public.assessment_results) then raise exception 'Unexpected live result';end if;
 if exists(select 1 from public.assessment_year_counters c full join
  (select coalesce(recorded_year,0) yr,max(annual_number) maximum from exam_import_private.records group by coalesce(recorded_year,0))r
   on c.assessment_year=r.yr where c.last_number is distinct from r.maximum) then raise exception 'Shared annual counters differ';end if;
 if not exists(select 1 from pg_trigger where tgrelid='exam_import_private.records'::regclass and tgname='historical_exam_immutable' and tgenabled='O') then
  raise exception 'Immutable source trigger not restored';end if;
end $verify$;
