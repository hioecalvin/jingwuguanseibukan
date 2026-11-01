-- PENDING: numbering only, directly after 060. No Class Admin role or grants.
-- One immutable YYYY-XXXX annual sequence across ALL classes, for pass and fail.
begin;
lock table public.assessment_results in access exclusive mode;
create table public.assessment_year_counters (
  assessment_year integer primary key check (assessment_year between 1900 and 2199),
  last_number integer not null check (last_number between 1 and 9999)
);
alter table public.assessment_year_counters enable row level security;
revoke all on public.assessment_year_counters from public,anon,authenticated,service_role;
alter table public.assessment_results
  add column assessment_number text,
  add column assessment_year integer,
  add column annual_number integer,
  add column member_id_snapshot text;

-- Existing results keep UUIDs, certificates, QR targets and audit facts. Give
-- previously unnumbered results deterministic chronological numbers once only.
-- Sort order is configured grade order, then Member ID, with UUID final tie-break.
with ordered as (
  select r.id,extract(year from r.assessment_date)::integer as yr,
    row_number() over(partition by extract(year from r.assessment_date)
      order by r.assessment_date,rank_to.sort_order,sub_rank.sort_order nulls first,
      p.registration_number,r.recorded_at,r.id)::integer as seq,
    p.registration_number::text as member_id
  from public.assessment_results r
  join public.profiles p on p.id=r.member_user_id
  join public.ranks rank_to on rank_to.id=r.rank_to_id
  left join public.sub_ranks sub_rank on sub_rank.id=r.sub_rank_to_id
)
update public.assessment_results r set assessment_year=o.yr,annual_number=o.seq,
  assessment_number=o.yr::text||'-'||lpad(o.seq::text,4,'0'),
  member_id_snapshot=o.member_id from ordered o where o.id=r.id;

alter table public.assessment_results
  alter column assessment_number set not null,
  alter column assessment_year set not null,
  alter column annual_number set not null,
  add constraint assessment_annual_number_unique unique(assessment_year,annual_number),
  -- Four-digit years keep references unambiguous across supported centuries.
  add constraint assessment_number_unique unique(assessment_number),
  add constraint assessment_number_consistent check (
    assessment_year=extract(year from assessment_date)::integer
    and assessment_year between 1900 and 2199 and annual_number between 1 and 9999
    and assessment_number=assessment_year::text||'-'||lpad(annual_number::text,4,'0')
  );
insert into public.assessment_year_counters(assessment_year,last_number)
  select assessment_year,max(annual_number) from public.assessment_results group by assessment_year;

create function public.allocate_assessment_result_number()
returns trigger language plpgsql security definer set search_path to public, pg_temp
as $$
declare sequence_value integer; year_value integer;
begin
  if tg_op <> 'INSERT' then
    raise exception 'Submitted assessment records are immutable';
  end if;
  if new.assessment_number is not null or new.assessment_year is not null or new.annual_number is not null then
    raise exception 'Assessment numbers are allocated by the database';
  end if;
  year_value:=extract(year from new.assessment_date)::integer;
  if year_value is null or year_value not between 1900 and 2199 then raise exception 'Assessment year out of range'; end if;
  insert into public.assessment_year_counters(assessment_year,last_number) values(year_value,1)
    on conflict(assessment_year) do update set last_number=assessment_year_counters.last_number+1
    returning last_number into sequence_value;
  -- Counter constraint stops at 9999 instead of truncating/wrapping a reference.
  new.assessment_year:=year_value;
  new.annual_number:=sequence_value;
  new.assessment_number:=year_value::text||'-'||lpad(sequence_value::text,4,'0');
  select p.registration_number::text into new.member_id_snapshot
    from public.profiles p where p.id=new.member_user_id;
  return new;
end;
$$;
alter function public.allocate_assessment_result_number() owner to postgres;
revoke all on function public.allocate_assessment_result_number() from public,anon,authenticated,service_role;
create trigger assessment_result_number_before_insert before insert on public.assessment_results
  for each row execute function public.allocate_assessment_result_number();
create trigger assessment_result_immutable before update or delete on public.assessment_results
  for each row execute function public.allocate_assessment_result_number();

-- Reassessment is another result, not an overwrite. Batch/membership uniqueness
-- and existing submission idempotency still prevent duplicate request results.
alter table public.assessment_results drop constraint assessment_results_membership_date_unique;
do $submit$
declare definition text; marker text; replacement text;
begin
  definition:=pg_get_functiondef('public.submit_bulk_assessment(uuid,uuid,date,uuid,text,uuid,jsonb)'::regprocedure);
  marker:=E'    if exists (\n      select 1\n      from public.assessment_results as prior_result\n      where prior_result.membership_id = decision.membership_id\n        and prior_result.assessment_date = submit_bulk_assessment.assessment_date\n    ) then\n      raise exception ''Membership % already has an assessment recorded for %'',\n        decision.membership_id, assessment_date;\n    end if;';
  if (length(definition)-length(replace(definition,marker,'')))/length(marker) <> 1 then
    raise exception 'Unexpected assessment duplicate guard';
  end if;
  definition:=replace(definition,marker,'-- New submitted attempts receive distinct assessment numbers.');
  marker:=E'    order by item.value ->> ''membership_id''';
  replacement:=E'    order by (select r.sort_order from public.ranks r where r.id=(item.value ->> ''rank_to_id'')::uuid),\n      (select s.sort_order from public.sub_ranks s where s.id=(item.value ->> ''sub_rank_to_id'')::uuid) nulls first,\n      (select p.registration_number from public.profiles p where p.id=(item.value ->> ''member_user_id'')::uuid),\n      item.value ->> ''membership_id''';
  if (length(definition)-length(replace(definition,marker,'')))/length(marker) <> 1 then
    raise exception 'Unexpected assessment result iteration';
  end if;
  execute replace(definition,marker,replacement);
end;
$submit$;

create function public.get_assessment_result_history(target_member_id uuid default null)
returns table(result_id uuid,assessment_number text,member_id text,member_name text,
  assessment_date date,class_id uuid,class_name text,dojo_name text,
  rank_before text,rank_assessed text,outcome text,assessor_name text,notes text)
language sql stable security definer set search_path to public,pg_temp
as $$
  select r.id,r.assessment_number,r.member_id_snapshot,r.member_name_snapshot,
    r.assessment_date,b.class_id,c.name::text,r.dojo_name_snapshot,
    r.rank_before_name_snapshot,r.rank_to_name_snapshot,r.outcome,r.assessor_name_snapshot,r.notes
  from public.assessment_results r join public.assessment_batches b on b.id=r.batch_id
  join public.classes c on c.id=b.class_id
  where auth.uid() is not null and public.is_active_app_user(auth.uid())
    and (target_member_id is null or r.member_user_id=target_member_id)
    and (r.member_user_id=auth.uid() or public.is_active_super_admin(auth.uid())
      or (r.dojo_id_snapshot is not null and public.is_class_admin(b.class_id,r.dojo_id_snapshot,auth.uid())))
  order by r.assessment_date desc,r.annual_number desc,r.id;
$$;
alter function public.get_assessment_result_history(uuid) owner to postgres;
revoke all on function public.get_assessment_result_history(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_assessment_result_history(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
