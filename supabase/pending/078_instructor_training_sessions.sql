-- Instructor attendance ledger. No deliveries, jobs or historical attendance invented.
begin;
create schema training_private;
revoke all on schema training_private from public,anon,authenticated,service_role;

create table training_private.sessions (
 id uuid primary key,
 class_id uuid not null references public.classes(id),
 dojo_id uuid not null references public.dojos(id),
 session_date date not null check(isfinite(session_date)),
 details text not null check(length(btrim(details)) between 1 and 4000),
 duration_minutes integer not null check(duration_minutes between 1 and 1440),
 version integer not null check(version>0),
 created_by uuid not null references public.profiles(id),
 updated_by uuid not null references public.profiles(id),
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp()
);
create table training_private.attendance (
 session_id uuid not null references training_private.sessions(id),
 membership_id uuid not null references public.class_memberships(id),
 rank_id uuid references public.ranks(id),
 rank_period text not null,
 primary key(session_id,membership_id)
);
create index attendance_membership_idx on training_private.attendance(membership_id,session_id);
create index sessions_scope_date_idx on training_private.sessions(dojo_id,session_date desc,id);
create table training_private.manual_dates (
 membership_id uuid primary key references public.class_memberships(id),
 training_date date
);
create table training_private.session_audit (
 session_id uuid not null references training_private.sessions(id),
 version integer not null,
 actor_id uuid not null references public.profiles(id),
 recorded_at timestamptz not null default clock_timestamp(),
 previous_values jsonb,
 new_values jsonb not null,
 primary key(session_id,version)
);
create function training_private.immutable_audit() returns trigger
language plpgsql set search_path=pg_catalog as $$
begin raise exception 'Training audit is immutable'; end $$;
create trigger immutable_training_audit before update or delete on training_private.session_audit
for each row execute function training_private.immutable_audit();

create function training_private.can_manage(target_dojo uuid) returns boolean
language sql stable security definer set search_path=pg_catalog as $$
 select coalesce(public.is_active_app_user(auth.uid()) and exists(
  select 1 from public.dojos d where d.id=target_dojo and
   (public.is_active_super_admin(auth.uid()) or public.is_class_admin(d.class_id,d.id,auth.uid()))
 ),false)
$$;

-- Snapshot the rank period, not a mutable accumulated counter. Same-rank legacy
-- tier changes do not reset the period. Unknown historical dates are not guessed.
create function training_private.rank_on(target_membership uuid,on_date date)
returns table(rank_id uuid,period_key text) language plpgsql stable security definer
set search_path=pg_catalog as $$
declare m public.class_memberships%rowtype; h record; source_date date; dates integer;
 today date := (now() at time zone 'Asia/Jakarta')::date;
begin
 select * into strict m from public.class_memberships where id=target_membership;
 if on_date is null or not isfinite(on_date) then raise exception 'A finite attendance date is required'; end if;
 if exists(select 1 from public.membership_grade_history g where g.membership_id=m.id and g.revoked_at is null) then
  with timeline as (
   select g.*,lag(g.rank_id) over(order by g.effective_date,g.created_at,g.id) previous_rank,
    row_number() over(order by g.effective_date,g.created_at,g.id) position
   from public.membership_grade_history g where g.membership_id=m.id and g.revoked_at is null
  ) select t.* into h from timeline t where t.effective_date<=on_date
     and (t.position=1 or t.rank_id is distinct from t.previous_rank)
     order by t.effective_date desc,t.created_at desc,t.id desc limit 1;
  if found and (on_date<today or h.rank_id is not distinct from m.rank_id) then
   return query select h.rank_id::uuid,'history:'||h.id::text; return;
  end if;
  -- Never use a current-grade import to guess a date preceding an authoritative
  -- timeline. A direct current-grade correction can only start an undated period today.
  if on_date<>today then raise exception 'Rank on this date is unknown; correct the rank history before backdating attendance'; end if;
  return query select m.rank_id,'undated:'||coalesce(m.rank_id::text,'ungraded'); return;
 end if;
 select count(distinct e.assessment_date),min(e.assessment_date) into dates,source_date
 from exam_import_private.records e where e.member_user_id=m.user_id and e.class_id=m.class_id
 and e.rank_id=m.rank_id and e.entry_kind='recorded_grade' and e.date_precision='date'
 and e.assessment_date<=today;
 if dates=1 and source_date<=on_date then
  return query select m.rank_id,'source:'||m.rank_id::text||':'||source_date::text; return;
 end if;
 if on_date<>today then raise exception 'Rank on this date is unknown; correct the rank history before backdating attendance'; end if;
 return query select m.rank_id,'undated:'||coalesce(m.rank_id::text,'ungraded');
end $$;

create function training_private.snapshot(target_session uuid) returns jsonb
language sql stable security definer set search_path=pg_catalog as $$
 select to_jsonb(s)||jsonb_build_object('attendees',coalesce((
  select jsonb_agg(to_jsonb(a) order by a.membership_id) from training_private.attendance a
  where a.session_id=s.id),'[]'::jsonb)) from training_private.sessions s where s.id=target_session
$$;
create function training_private.refresh_last_date(target_membership uuid) returns void
language sql security definer set search_path=pg_catalog as $$
 update public.class_memberships m set last_training_session_date=greatest(
  (select d.training_date from training_private.manual_dates d where d.membership_id=m.id),
  (select max(s.session_date) from training_private.attendance a join training_private.sessions s on s.id=a.session_id where a.membership_id=m.id)
 ) where m.id=target_membership
$$;

-- Preserve the existing correction authorization/validation and audit behavior.
alter function public.set_membership_last_training_session(uuid,date) rename to training_set_manual_legacy;
revoke all on function public.training_set_manual_legacy(uuid,date) from public,anon,authenticated,service_role;
create function public.set_membership_last_training_session(target_membership_id uuid,new_training_date date)
returns table(membership_id uuid,training_date date,days_ago integer)
language plpgsql security definer set search_path=pg_catalog as $$
declare manual_day date; projected date; today date;
begin
 if new_training_date is not null and not isfinite(new_training_date) then
  raise exception using errcode='22023',message='A finite training date is required';
 end if;
 -- The legacy routine locks membership and checks active caller, dojo and date.
 select r.training_date into manual_day from public.training_set_manual_legacy(target_membership_id,new_training_date) r;
 insert into training_private.manual_dates values(target_membership_id,manual_day)
 on conflict on constraint manual_dates_pkey do update set training_date=excluded.training_date;
 perform training_private.refresh_last_date(target_membership_id);
 select m.last_training_session_date into projected from public.class_memberships m where m.id=target_membership_id;
 today:=(clock_timestamp() at time zone 'Asia/Jakarta')::date;
 return query select target_membership_id,projected,today-projected;
end $$;

create function public.get_training_session_roster(target_dojo_id uuid)
returns table(membership_id uuid,member_id text,full_name text,dojo_name text,rank_name text)
language plpgsql stable security definer set search_path=pg_catalog as $$
begin
 if not training_private.can_manage(target_dojo_id) then raise exception using errcode='42501',message='Not authorised for this host dojo'; end if;
 return query select m.id,p.registration_number,p.full_name,d.name,r.name
 from public.class_memberships m join public.profiles p on p.id=m.user_id
 join public.dojos host on host.id=target_dojo_id
 left join public.dojos d on d.id=m.dojo_id left join public.ranks r on r.id=m.rank_id
 where m.class_id=host.class_id and m.status::text='active' and p.date_of_passing is null
 order by p.full_name,p.registration_number,m.id;
end $$;

create function public.save_training_session(target_session_id uuid,target_dojo_id uuid,
 training_date date,training_details text,minutes integer,attendee_membership_ids uuid[],expected_version integer)
returns integer language plpgsql security definer set search_path=pg_catalog as $$
declare caller uuid:=auth.uid(); old training_private.sessions%rowtype; host public.dojos%rowtype;
 affected uuid[]; roster uuid[]; mid uuid; old_snapshot jsonb; next_version integer; rank_snapshot record;
 today date; old_attendance jsonb;
begin
 -- Serialize attendance writers, then lock memberships in deterministic order.
 perform pg_advisory_xact_lock(780078);
 if not training_private.can_manage(target_dojo_id) then raise exception using errcode='42501',message='Not authorised for this host dojo'; end if;
 select * into strict host from public.dojos where id=target_dojo_id for share;
 if not host.active or not exists(select 1 from public.classes c where c.id=host.class_id and c.is_active) then raise exception 'Host dojo or class is inactive'; end if;
 today:=(clock_timestamp() at time zone 'Asia/Jakarta')::date;
 if target_session_id is null or training_date is null or not isfinite(training_date) or training_date>today
 or training_details is null or length(btrim(training_details)) not between 1 and 4000
 or minutes is null or minutes not between 1 and 1440 or expected_version is null or expected_version<0
 or attendee_membership_ids is null or cardinality(attendee_membership_ids)>1000
 or array_position(attendee_membership_ids,null) is not null then raise exception 'Invalid session details'; end if;
 select array_agg(distinct x order by x) into roster from unnest(attendee_membership_ids) x;
 roster:=coalesce(roster,'{}'::uuid[]);
 select * into old from training_private.sessions where id=target_session_id for update;
 if found then
  if old.dojo_id<>target_dojo_id then raise exception 'An existing session cannot change host dojo'; end if;
  if old.version<>expected_version then raise exception using errcode='40001',message='Session changed; reload before editing'; end if;
  old_snapshot:=training_private.snapshot(target_session_id);
 else
  if expected_version<>0 then raise exception 'Session not found'; end if;
  if cardinality(roster)=0 then raise exception 'Select at least one attendee'; end if;
 end if;
 select array_agg(distinct x order by x) into affected from (
  select unnest(roster) x union select a.membership_id from training_private.attendance a where a.session_id=target_session_id
 ) all_ids;
 perform m.id from public.class_memberships m where m.id=any(affected) order by m.id for update;
 perform p.id from public.profiles p join public.class_memberships m on m.user_id=p.id where m.id=any(affected) order by p.id for share of p;
 if (select count(*) from public.class_memberships m join public.profiles p on p.id=m.user_id
     where m.id=any(roster) and m.class_id=host.class_id and p.date_of_passing is null
     and (m.joined_date is null or m.joined_date<=training_date)
     and (m.status::text='active' or (old.id is not null and old.session_date=training_date
       and exists(select 1 from training_private.attendance a where a.session_id=old.id and a.membership_id=m.id)))) <> cardinality(roster)
 then raise exception 'Attendance requires eligible memberships in the same class and cannot precede joining'; end if;
 insert into training_private.manual_dates select m.id,m.last_training_session_date from public.class_memberships m where m.id=any(affected)
 on conflict(membership_id) do nothing;
 next_version:=expected_version+1;
 if old.id is null then
  insert into training_private.sessions(id,class_id,dojo_id,session_date,details,duration_minutes,version,created_by,updated_by)
  values(target_session_id,host.class_id,host.id,training_date,btrim(training_details),minutes,next_version,caller,caller);
 else
  update training_private.sessions set session_date=training_date,details=btrim(training_details),duration_minutes=minutes,
   version=next_version,updated_by=caller,updated_at=clock_timestamp() where id=target_session_id;
 end if;
 -- Existing attendance retains its captured rank if only notes/duration/roster change.
 foreach mid in array roster loop
  if old.id is not null and old.session_date=training_date and exists(
   select 1 from training_private.attendance a where a.session_id=old.id and a.membership_id=mid) then continue; end if;
  select * into strict rank_snapshot from training_private.rank_on(mid,training_date);
  insert into training_private.attendance values(target_session_id,mid,rank_snapshot.rank_id,rank_snapshot.period_key)
  on conflict(session_id,membership_id) do update set rank_id=excluded.rank_id,rank_period=excluded.rank_period;
 end loop;
 delete from training_private.attendance a where a.session_id=target_session_id and not(a.membership_id=any(roster));
 foreach mid in array coalesce(affected,'{}'::uuid[]) loop perform training_private.refresh_last_date(mid); end loop;
 insert into training_private.session_audit(session_id,version,actor_id,previous_values,new_values)
 values(target_session_id,next_version,caller,old_snapshot,training_private.snapshot(target_session_id));
 return next_version;
end $$;

create function public.get_training_sessions(before_date date default null,after_session_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog as $$
begin
 if auth.uid() is null or not public.is_active_app_user(auth.uid()) then raise exception using errcode='42501',message='Not authenticated'; end if;
 return coalesce((select jsonb_agg(x.payload order by x.session_date desc,x.id) from (
 select s.id,s.session_date,training_private.snapshot(s.id)||jsonb_build_object('dojo_name',d.name,'class_name',c.name,'instructor_name',p.full_name,
 'participants',coalesce((select jsonb_agg(jsonb_build_object('membership_id',m.id,'member_id',mp.registration_number,'full_name',mp.full_name,'dojo_name',md.name,'rank_name',r.name) order by mp.full_name,m.id)
 from training_private.attendance a join public.class_memberships m on m.id=a.membership_id
 join public.profiles mp on mp.id=m.user_id left join public.dojos md on md.id=m.dojo_id left join public.ranks r on r.id=a.rank_id
 where a.session_id=s.id),'[]'::jsonb)) payload
 from training_private.sessions s join public.dojos d on d.id=s.dojo_id join public.classes c on c.id=s.class_id
 join public.profiles p on p.id=s.created_by
 where training_private.can_manage(s.dojo_id) and (before_date is null or s.session_date<=before_date)
 and (after_session_id is null or s.session_date<before_date or (s.session_date=before_date and s.id>after_session_id))
 order by s.session_date desc,s.id limit 200) x),'[]'::jsonb);
end $$;
create function public.get_training_session_audit(target_session_id uuid)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog as $$
begin
 if not exists(select 1 from training_private.sessions s where s.id=target_session_id and training_private.can_manage(s.dojo_id)) then raise exception using errcode='42501',message='Not authorised'; end if;
 return coalesce((select jsonb_agg(to_jsonb(a) order by a.version desc) from training_private.session_audit a where a.session_id=target_session_id),'[]'::jsonb);
end $$;
create function public.get_membership_training_totals(target_membership_id uuid)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog as $$
declare m public.class_memberships%rowtype; current_period record;
begin
 select * into m from public.class_memberships where id=target_membership_id;
 if not found or not coalesce(public.is_active_app_user(auth.uid()) and
 (m.user_id=auth.uid() or public.is_active_super_admin(auth.uid()) or
 (m.dojo_id is not null and training_private.can_manage(m.dojo_id))),false)
 then raise exception using errcode='42501',message='Not authorised'; end if;
 select * into current_period from training_private.rank_on(m.id,(now() at time zone 'Asia/Jakarta')::date);
 return jsonb_build_object('current_training_days',(select count(distinct s.session_date) from training_private.attendance a
 join training_private.sessions s on s.id=a.session_id where a.membership_id=m.id and a.rank_period=current_period.period_key),
 'history',coalesce((select jsonb_agg(to_jsonb(t)) from (
 select a.rank_id,r.name rank_name,a.rank_period,count(distinct s.session_date) training_days,
 sum(s.duration_minutes) duration_minutes,min(s.session_date) first_session,max(s.session_date) last_session
 from training_private.attendance a join training_private.sessions s on s.id=a.session_id left join public.ranks r on r.id=a.rank_id
 where a.membership_id=m.id group by a.rank_id,r.name,a.rank_period order by min(s.session_date),a.rank_period)t),'[]'::jsonb));
end $$;

do $security$
declare obj record;
begin
 for obj in select c.oid::regclass rel from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='training_private' and c.relkind='r' loop
  execute format('alter table %s enable row level security',obj.rel);
  execute format('alter table %s force row level security',obj.rel);
  execute format('revoke all on %s from public,anon,authenticated,service_role',obj.rel);
 end loop;
 for obj in select p.oid::regprocedure fn,n.nspname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='training_private' or (n.nspname='public' and p.proname in (
 'set_membership_last_training_session','get_training_session_roster','save_training_session','get_training_sessions','get_training_session_audit','get_membership_training_totals')) loop
  execute format('alter function %s owner to postgres',obj.fn);
  execute format('revoke all on function %s from public,anon,authenticated,service_role',obj.fn);
  if obj.nspname='public' then execute format('grant execute on function %s to authenticated',obj.fn); end if;
 end loop;
end $security$;
notify pgrst,'reload schema';
commit;
