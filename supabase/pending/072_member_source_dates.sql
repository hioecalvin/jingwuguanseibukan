-- Preserve imported date evidence without inventing promotions or changing ranks.
begin;

create table member_import_private.membership_joined_date_updates (
 source_sha256 text not null check(source_sha256 ~ '^[a-f0-9]{64}$'),
 source_filename text not null,
 source_row integer not null check(source_row >= 4),
 membership_id uuid not null references public.class_memberships(id) on delete restrict,
 member_id_snapshot text not null,
 previous_joined_date date,
 new_joined_date date not null,
 changed_at timestamptz not null default now(),
 database_actor name not null default current_user,
 primary key(source_sha256,membership_id),
 check(previous_joined_date is distinct from new_joined_date)
);
alter table member_import_private.membership_joined_date_updates enable row level security;
alter table member_import_private.membership_joined_date_updates force row level security;
revoke all on member_import_private.membership_joined_date_updates from public,anon,authenticated,service_role;
create function member_import_private.preserve_membership_date_evidence()
returns trigger language plpgsql set search_path=pg_catalog as $$
begin raise exception 'Imported date evidence is immutable'; end;
$$;
revoke all on function member_import_private.preserve_membership_date_evidence() from public,anon,authenticated,service_role;
create trigger immutable_membership_date_evidence before update or delete
 on member_import_private.membership_joined_date_updates
 for each row execute function member_import_private.preserve_membership_date_evidence();

create function public.get_membership_current_rank_date(target_membership_id uuid)
returns date language plpgsql stable security definer set search_path=pg_catalog as $$
declare caller uuid:=auth.uid(); m public.class_memberships%rowtype; result_date date; date_count integer;
begin
 if caller is null or not public.is_active_app_user(caller) then return null; end if;
 select * into m from public.class_memberships where id=target_membership_id;
 if not found or m.rank_id is null then return null; end if;
 if not (m.user_id=caller or public.is_active_super_admin(caller)
   or public.is_class_admin(m.class_id,m.dojo_id,caller)) then return null; end if;

 -- Prefer the most recent rank transition in authoritative, unrevoked history.
 -- Same-rank legacy tier promotions do not move the rank's start date.
 if exists(select 1 from public.membership_grade_history h where h.membership_id=m.id and h.revoked_at is null) then
  with history as (
   select h.*,lag(h.rank_id) over(order by h.effective_date,h.created_at,h.id) previous_rank,
    row_number() over(order by h.effective_date desc,h.created_at desc,h.id desc) latest
   from public.membership_grade_history h where h.membership_id=m.id and h.revoked_at is null
  )
  select h.effective_date into result_date from history h
  where h.rank_id=m.rank_id and h.rank_id is distinct from h.previous_rank
   and exists(select 1 from history current_history where current_history.latest=1 and current_history.rank_id=m.rank_id)
  order by h.effective_date desc,h.created_at desc,h.id desc limit 1;
  return result_date;
 end if;

 -- Historical Excel evidence is usable only for this member's current class
 -- and exact rank, with one unambiguous full date. X, > and partial dates stay unknown.
 select count(distinct r.assessment_date),min(r.assessment_date)
 into date_count,result_date from exam_import_private.records r
 where r.member_user_id=m.user_id and r.class_id=m.class_id and r.rank_id=m.rank_id
   and r.entry_kind='recorded_grade' and r.date_precision='date'
   and r.assessment_date <= (now() at time zone 'Asia/Jakarta')::date;
 return case when date_count=1 then result_date else null end;
end;
$$;
alter function public.get_membership_current_rank_date(uuid) owner to postgres;
revoke all on function public.get_membership_current_rank_date(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_membership_current_rank_date(uuid) to authenticated;

do $view$
declare definition text; old_expression text;
begin
 select pg_get_viewdef('public.admin_visible_members'::regclass,true) into definition;
 old_expression:=substring(definition from '(?s)\( SELECT history\.effective_date.*?LIMIT 1\) AS last_grading_date');
 if old_expression is null or position('history.membership_id = m.id' in old_expression)=0
   or position('history.revoked_at IS NULL' in old_expression)=0 then
   raise exception 'Current member date expression differs; review before replacing';
 end if;
 definition:=replace(definition,old_expression,'public.get_membership_current_rank_date(m.id) AS last_grading_date');
 execute 'create or replace view public.admin_visible_members with (security_invoker=true) as '||definition;
end $view$;

comment on function public.get_membership_current_rank_date(uuid) is
 'Scoped current-rank date: authoritative rank transition first, otherwise one exact matched historical exam date. Never creates a promotion.';
commit;
