-- Historical source facts are separate from complete live pass/fail assessments.
begin;
create schema exam_import_private authorization postgres;
revoke all on schema exam_import_private from public,anon,authenticated,service_role;
create table exam_import_private.batches (
 id uuid primary key,
 source_sha256 text not null unique check(source_sha256 ~ '^[a-f0-9]{64}$'),
 source_filename text not null,
 sheet_names text[] not null,
 imported_at timestamptz not null default now()
);
create table exam_import_private.source_rows (
 id uuid primary key,
 batch_id uuid not null references exam_import_private.batches(id),
 sheet_name text not null,
 source_row integer not null check(source_row>=4),
 source_name text,
 member_user_id uuid references public.profiles(id),
 class_id uuid references public.classes(id),
 raw_cells jsonb not null check(jsonb_typeof(raw_cells)='array'),
 match_status text not null check(match_status in ('matched','unmatched','empty_name')),
 match_evidence text,
 unique(batch_id,sheet_name,source_row),
 check((match_status='matched')=(member_user_id is not null))
);
create table exam_import_private.records (
 id uuid primary key,
 batch_id uuid not null references exam_import_private.batches(id),
 source_row_id uuid not null references exam_import_private.source_rows(id),
 source_cell text not null check(source_cell ~ '^[A-Z]+[0-9]+$'),
 member_user_id uuid references public.profiles(id),
 member_id_snapshot text,
 source_member_name text not null,
 class_id uuid not null references public.classes(id),
 rank_id uuid references public.ranks(id),
 rank_name text not null,
 grade_order integer not null check(grade_order>0),
 entry_kind text not null check(entry_kind in ('recorded_grade','lost_record','skipped_rank')),
 assessment_date date,
 date_precision text not null check(date_precision in ('date','month','year','unknown')),
 recorded_year integer check(recorded_year between 1900 and 2199),
 recorded_month integer check(recorded_month between 1 and 12),
 source_date_text text not null,
 assessor_name text,
 dojo_id uuid references public.dojos(id),
 dojo_name text,
 assessment_number text unique,
 annual_number integer check(annual_number between 1 and 9999),
 unique(batch_id,source_row_id,source_cell),
 check(case date_precision
  when 'date' then assessment_date is not null and recorded_year is not null and recorded_year=extract(year from assessment_date)::int and recorded_month is null
  when 'month' then assessment_date is null and recorded_year is not null and recorded_month is not null
  when 'year' then assessment_date is null and recorded_year is not null and recorded_month is null
  else assessment_date is null and recorded_year is null and recorded_month is null end),
 check(entry_kind='recorded_grade' or date_precision='unknown'),
 check((assessment_number is null)=(annual_number is null)),
 check(assessment_number is null or (member_user_id is not null and entry_kind='recorded_grade' and assessment_date is not null and assessment_number=recorded_year::text||'-'||lpad(annual_number::text,4,'0')))
);
create index historical_exam_member_class on exam_import_private.records(member_user_id,class_id);
alter table exam_import_private.batches enable row level security;
alter table exam_import_private.source_rows enable row level security;
alter table exam_import_private.records enable row level security;
revoke all on all tables in schema exam_import_private from public,anon,authenticated,service_role;

create function exam_import_private.guard_and_number_record()
returns trigger language plpgsql security definer set search_path to pg_catalog as $$
declare source_record exam_import_private.source_rows%rowtype; allocated integer;
begin
 if tg_op<>'INSERT' then raise exception 'Imported exam source facts are immutable';end if;
 select * into source_record from exam_import_private.source_rows where id=new.source_row_id;
 if not found or new.batch_id<>source_record.batch_id or new.member_user_id is distinct from source_record.member_user_id
   or new.class_id is distinct from source_record.class_id then raise exception 'Historical source binding mismatch';end if;
 if not exists(select 1 from exam_import_private.batches b where b.id=new.batch_id and source_record.sheet_name=any(b.sheet_names))
   or substring(new.source_cell from '[0-9]+$')::integer<>source_record.source_row
   or not exists(select 1 from jsonb_array_elements(source_record.raw_cells) cell where cell->>'address'=new.source_cell) then raise exception 'Historical source coordinate mismatch';end if;
 if new.rank_id is not null and not exists(select 1 from public.ranks where id=new.rank_id and class_id=new.class_id) then raise exception 'Historical rank class mismatch';end if;
 if new.dojo_id is not null and not exists(select 1 from public.dojos where id=new.dojo_id and class_id=new.class_id) then raise exception 'Historical dojo class mismatch';end if;
 if new.assessment_number is not null or new.annual_number is not null then raise exception 'Assessment numbers are database allocated';end if;
 if new.member_user_id is not null and new.entry_kind='recorded_grade' and new.assessment_date is not null then
  if new.recorded_year is distinct from extract(year from new.assessment_date)::int then raise exception 'Historical year mismatch';end if;
  insert into public.assessment_year_counters(assessment_year,last_number) values(new.recorded_year,1)
   on conflict(assessment_year) do update set last_number=assessment_year_counters.last_number+1 returning last_number into allocated;
  new.annual_number:=allocated;
  new.assessment_number:=new.recorded_year::text||'-'||lpad(allocated::text,4,'0');
 end if;
 return new;
end;
$$;
alter function exam_import_private.guard_and_number_record() owner to postgres;
revoke all on function exam_import_private.guard_and_number_record() from public,anon,authenticated,service_role;
create trigger historical_exam_number before insert on exam_import_private.records for each row execute function exam_import_private.guard_and_number_record();
create trigger historical_exam_immutable before update or delete on exam_import_private.records for each row execute function exam_import_private.guard_and_number_record();
create function exam_import_private.preserve_source() returns trigger language plpgsql set search_path to pg_catalog as $$
begin raise exception 'Imported exam source facts are immutable';end;$$;
revoke all on function exam_import_private.preserve_source() from public,anon,authenticated,service_role;
create trigger exam_batch_immutable before update or delete on exam_import_private.batches for each row execute function exam_import_private.preserve_source();
create trigger exam_row_immutable before update or delete on exam_import_private.source_rows for each row execute function exam_import_private.preserve_source();

-- Existing signature and active-user / own-member / exact-dojo boundaries retained.
create or replace function public.get_assessment_result_history(target_member_id uuid default null)
returns table(result_id uuid,assessment_number text,member_id text,member_name text,
 assessment_date date,class_id uuid,class_name text,dojo_name text,
 rank_before text,rank_assessed text,outcome text,assessor_name text,notes text)
language sql stable security definer set search_path to pg_catalog as $$
 select h.result_id,h.assessment_number,h.member_id,h.member_name,h.assessment_date,h.class_id,h.class_name,h.dojo_name,h.rank_before,h.rank_assessed,h.outcome,h.assessor_name,h.notes
 from (
  select r.id result_id,r.assessment_number,r.member_id_snapshot member_id,r.member_name_snapshot member_name,
   r.assessment_date,b.class_id,c.name::text class_name,r.dojo_name_snapshot dojo_name,
   r.rank_before_name_snapshot rank_before,r.rank_to_name_snapshot rank_assessed,r.outcome,r.assessor_name_snapshot assessor_name,r.notes,
   r.member_user_id,r.dojo_id_snapshot dojo_id,r.assessment_year sort_year,r.annual_number
  from public.assessment_results r join public.assessment_batches b on b.id=r.batch_id join public.classes c on c.id=b.class_id
  union all
  select r.id,r.assessment_number,r.member_id_snapshot,r.source_member_name,r.assessment_date,r.class_id,c.name::text,r.dojo_name,
   null::text,r.rank_name,r.entry_kind,r.assessor_name,
   'Historical Excel record. Source: '||s.sheet_name||'!'||r.source_cell||E'\nRecorded value: '||r.source_date_text||E'\nDate precision: '||r.date_precision||
    case when r.member_user_id is null then E'\nMember match: awaiting review' else '' end,
   r.member_user_id,r.dojo_id,r.recorded_year,r.annual_number
  from exam_import_private.records r join exam_import_private.source_rows s on s.id=r.source_row_id join public.classes c on c.id=r.class_id
 ) h
 where auth.uid() is not null and public.is_active_app_user(auth.uid())
  and (target_member_id is null or h.member_user_id=target_member_id)
  and (h.member_user_id=auth.uid() or public.is_active_super_admin(auth.uid())
    or (h.dojo_id is not null and public.is_class_admin(h.class_id,h.dojo_id,auth.uid())))
 order by h.sort_year desc nulls last,h.assessment_date desc nulls last,h.annual_number desc nulls last,h.result_id;
$$;
alter function public.get_assessment_result_history(uuid) owner to postgres;
revoke all on function public.get_assessment_result_history(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_assessment_result_history(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
