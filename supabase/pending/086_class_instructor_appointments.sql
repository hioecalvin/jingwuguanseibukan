-- Explicit teaching appointments. No identity seeds, grades, titles or administrator grants.
BEGIN;
CREATE SCHEMA instructor_private AUTHORIZATION postgres;
REVOKE ALL ON SCHEMA instructor_private FROM public,anon,authenticated,service_role;
CREATE TABLE instructor_private.appointments (
 member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
 class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
 active boolean NOT NULL,
 changed_by uuid REFERENCES public.profiles(id) ON DELETE RESTRICT,
 changed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(member_id,class_id)
);
CREATE TABLE instructor_private.audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
 class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
 actor_id uuid REFERENCES public.profiles(id) ON DELETE RESTRICT,
 operator_reason text,
 previous_active boolean NOT NULL,
 new_active boolean NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK(previous_active <> new_active),
 CHECK((actor_id IS NOT NULL AND operator_reason IS NULL) OR
 (actor_id IS NULL AND length(btrim(operator_reason)) BETWEEN 1 AND 500 AND operator_reason IS NOT NULL))
);
ALTER TABLE instructor_private.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructor_private.appointments FORCE ROW LEVEL SECURITY;
ALTER TABLE instructor_private.audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructor_private.audit FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA instructor_private FROM public,anon,authenticated,service_role;
CREATE FUNCTION instructor_private.preserve_audit() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN RAISE EXCEPTION 'Instructor appointment audit is immutable'; END $$;
CREATE TRIGGER immutable_instructor_audit BEFORE UPDATE OR DELETE ON instructor_private.audit
FOR EACH ROW EXECUTE FUNCTION instructor_private.preserve_audit();

-- Eligibility deliberately does not require a linked login or an active class:
-- offline identities can be appointed and inactive classes can be prepared.
CREATE FUNCTION instructor_private.is_eligible(target_member uuid,target_class uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT EXISTS(SELECT 1 FROM public.profiles p JOIN public.class_memberships m ON m.user_id=p.id
 WHERE p.id=target_member AND m.class_id=target_class AND m.status::text='active'
 AND p.account_status::text='active' AND p.date_of_passing IS NULL)
$$;
CREATE FUNCTION instructor_private.is_appointed(target_member uuid,target_class uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT instructor_private.is_eligible(target_member,target_class) AND EXISTS(
 SELECT 1 FROM instructor_private.appointments a
 WHERE a.member_id=target_member AND a.class_id=target_class AND a.active)
$$;

CREATE FUNCTION public.get_class_instructor_appointments()
RETURNS TABLE(member_id uuid,member_name text,js_id text,class_id uuid,class_name text,is_appointed boolean,eligible boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF NOT public.is_active_super_admin(auth.uid()) THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Super Admin access required';
 END IF;
 RETURN QUERY SELECT p.id,p.full_name::text,p.registration_number::text,c.id,c.name::text,coalesce(a.active,false),
 instructor_private.is_eligible(p.id,c.id)
 FROM (SELECT m.user_id,m.class_id FROM public.class_memberships m
 WHERE m.status::text='active'
 UNION SELECT ap.member_id,ap.class_id FROM instructor_private.appointments ap) candidates
 JOIN public.profiles p ON p.id=candidates.user_id
 JOIN public.classes c ON c.id=candidates.class_id
 LEFT JOIN instructor_private.appointments a ON a.member_id=p.id AND a.class_id=c.id
 WHERE (p.account_status::text='active' AND p.date_of_passing IS NULL) OR a.member_id IS NOT NULL
 ORDER BY p.full_name,c.name,p.id,c.id;
END $$;

CREATE FUNCTION public.set_class_instructor_appointment(target_member_id uuid,target_class_id uuid,expected_active boolean,new_active boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE current_active boolean; actor uuid:=auth.uid();
BEGIN
 IF NOT public.is_active_super_admin(actor) THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Super Admin access required';
 END IF;
 IF target_member_id IS NULL OR target_class_id IS NULL OR expected_active IS NULL OR new_active IS NULL THEN
  RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Member, class and appointment states are required';
 END IF;
 -- Serializes first appointment, revocation and schedule/training writes.
 PERFORM pg_advisory_xact_lock(860086);
 PERFORM m.id FROM public.class_memberships m
 WHERE m.user_id=target_member_id AND m.class_id=target_class_id ORDER BY m.id FOR SHARE;
 PERFORM p.id FROM public.profiles p WHERE p.id=target_member_id FOR SHARE;
 SELECT a.active INTO current_active FROM instructor_private.appointments a
 WHERE a.member_id=target_member_id AND a.class_id=target_class_id FOR UPDATE;
 current_active:=coalesce(current_active,false);
 IF current_active IS DISTINCT FROM expected_active THEN
  RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='Instructor appointment changed; reload before saving';
 END IF;
 IF new_active AND NOT instructor_private.is_eligible(target_member_id,target_class_id) THEN
  RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Instructor requires an active class membership and active living member profile';
 END IF;
 IF current_active=new_active THEN RETURN current_active; END IF;
 INSERT INTO instructor_private.appointments(member_id,class_id,active,changed_by)
 VALUES(target_member_id,target_class_id,new_active,actor)
 ON CONFLICT(member_id,class_id) DO UPDATE SET active=excluded.active,changed_by=actor,changed_at=clock_timestamp();
 INSERT INTO instructor_private.audit(member_id,class_id,actor_id,previous_active,new_active)
 VALUES(target_member_id,target_class_id,actor,current_active,new_active);
 RETURN new_active;
END $$;

CREATE FUNCTION instructor_private.validate_schedule_instructor() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 PERFORM pg_advisory_xact_lock_shared(860086);
 PERFORM m.id FROM public.class_memberships m
 WHERE m.user_id=new.instructor_id AND m.class_id=new.class_id ORDER BY m.id FOR SHARE;
 PERFORM p.id FROM public.profiles p WHERE p.id=new.instructor_id FOR SHARE;
 -- An existing schedule may be retired with its historical instructor intact.
 IF TG_OP='UPDATE' AND NOT new.is_active AND new.instructor_id IS NOT DISTINCT FROM old.instructor_id
 AND new.class_id=old.class_id AND new.dojo_id=old.dojo_id THEN RETURN new; END IF;
 IF new.instructor_id IS NOT NULL AND (NOT instructor_private.is_appointed(new.instructor_id,new.class_id)
 OR NOT EXISTS(SELECT 1 FROM public.classes c WHERE c.id=new.class_id AND c.is_active)) THEN
  RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Select an appointed active instructor for this class';
 END IF;
 RETURN new;
END $$;
CREATE TRIGGER validate_regular_schedule_instructor BEFORE INSERT OR UPDATE ON public.regular_class_schedules
FOR EACH ROW EXECUTE FUNCTION instructor_private.validate_schedule_instructor();

-- Preserve can_manage for historical reads, audit and training totals.
CREATE FUNCTION training_private.can_record(target_dojo uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT training_private.can_manage(target_dojo) AND
 (public.is_active_super_admin(auth.uid()) OR EXISTS(SELECT 1 FROM public.dojos d
 WHERE d.id=target_dojo AND instructor_private.is_appointed(auth.uid(),d.class_id)))
$$;
CREATE FUNCTION public.get_manageable_training_scopes()
RETURNS TABLE(dojo_id uuid,dojo_name text,class_id uuid,class_name text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF NOT public.is_active_app_user(auth.uid()) THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Account access is disabled';
 END IF;
 RETURN QUERY SELECT d.id,d.name::text,c.id,c.name::text
 FROM public.dojos d JOIN public.classes c ON c.id=d.class_id
 WHERE d.active AND c.is_active AND training_private.can_record(d.id)
 ORDER BY c.name,d.name,d.id;
END $$;

-- Existing routines are reproduced below to keep their scope checks, validation,
-- optimistic versions and audit behavior while tightening instructor eligibility.

create or replace function public.get_schedule_instructor_options(
  target_dojo_id uuid
)
returns table (
  instructor_id uuid,
  instructor_name text
)
language plpgsql
stable
security definer
set search_path to public, pg_temp
as $function$
declare
  caller_id uuid := auth.uid();
  target_class_id uuid;
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Not authenticated';
  end if;

  if not public.is_active_app_user(caller_id) then
    raise exception using errcode = '42501', message = 'Account access is disabled';
  end if;

  select dojo.class_id
  into target_class_id
  from public.dojos as dojo
  where dojo.id = target_dojo_id
    and dojo.active = true
    and exists(select 1 from public.classes c where c.id=dojo.class_id and c.is_active);

  if target_class_id is null then
    raise exception using errcode = 'P0002', message = 'Active dojo not found';
  end if;

  if not public.is_class_admin(target_class_id, target_dojo_id, caller_id) then
    raise exception using errcode = '42501', message = 'Not authorised for this dojo and class';
  end if;

  return query
  select distinct
    profile.id,
    profile.full_name
  from public.class_memberships as membership
  join public.profiles as profile
    on profile.id = membership.user_id
  where membership.class_id = target_class_id
    and membership.status::text = 'active'
    and instructor_private.is_appointed(profile.id,target_class_id)
    and profile.account_status::text = 'active'
    and profile.date_of_passing is null
  order by profile.full_name, profile.id;
end;
$function$;

create or replace function public.upsert_regular_class_schedule(
  target_dojo_id uuid,
  target_day_of_week smallint,
  target_start_time time without time zone,
  target_finish_time time without time zone,
  target_instructor_id uuid default null,
  target_venue text default null,
  target_notes text default null,
  target_is_active boolean default true,
  target_schedule_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  caller_id uuid := auth.uid();
  target_class_id uuid;
  dojo_is_active boolean;
  existing_record public.regular_class_schedules%rowtype;
  saved_record public.regular_class_schedules%rowtype;
  clean_venue text := nullif(btrim(target_venue), '');
  clean_notes text := nullif(btrim(target_notes), '');
begin
  perform pg_catalog.pg_advisory_xact_lock_shared(860086);
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Not authenticated';
  end if;

  if not public.is_active_app_user(caller_id) then
    raise exception using errcode = '42501', message = 'Account access is disabled';
  end if;

  select dojo.class_id, dojo.active
  into target_class_id, dojo_is_active
  from public.dojos as dojo
  where dojo.id = target_dojo_id;

  if target_class_id is null then
    raise exception using errcode = 'P0002', message = 'Dojo not found';
  end if;

  if target_is_active is null then
    raise exception using errcode = '22023', message = 'Active status is required';
  end if;

  if target_is_active and not dojo_is_active then
    raise exception using errcode = '22023', message = 'An active schedule requires an active dojo';
  end if;

  if not public.is_class_admin(target_class_id, target_dojo_id, caller_id) then
    raise exception using errcode = '42501', message = 'Not authorised for this dojo and class';
  end if;

  if target_day_of_week is null or target_day_of_week not between 0 and 6 then
    raise exception using errcode = '22023', message = 'Day of week must be between 0 and 6';
  end if;

  if target_start_time is null or target_finish_time is null
     or target_finish_time <= target_start_time
  then
    raise exception using errcode = '22023', message = 'Finish time must be after start time';
  end if;

  if length(coalesce(clean_venue, '')) > 200 then
    raise exception using errcode = '22023', message = 'Venue must contain 200 characters or fewer';
  end if;

  if length(coalesce(clean_notes, '')) > 1000 then
    raise exception using errcode = '22023', message = 'Notes must contain 1000 characters or fewer';
  end if;

  if target_instructor_id is not null and not (
    not target_is_active and target_schedule_id is not null and exists (
      select 1 from public.regular_class_schedules s where s.id=target_schedule_id
      and s.dojo_id=target_dojo_id and s.class_id=target_class_id and s.instructor_id=target_instructor_id)
  ) and (not instructor_private.is_appointed(target_instructor_id,target_class_id)
    or not exists(select 1 from public.classes c where c.id=target_class_id and c.is_active)) then
    raise exception using errcode='22023',message='Select an appointed active instructor for this class';
  end if;

  if target_schedule_id is null then
    insert into public.regular_class_schedules (
      dojo_id,
      class_id,
      day_of_week,
      start_time,
      finish_time,
      instructor_id,
      venue,
      notes,
      is_active,
      created_by,
      updated_by
    ) values (
      target_dojo_id,
      target_class_id,
      target_day_of_week,
      target_start_time,
      target_finish_time,
      target_instructor_id,
      clean_venue,
      clean_notes,
      target_is_active,
      caller_id,
      caller_id
    )
    returning * into saved_record;

    insert into public.regular_class_schedule_audit (
      schedule_id,
      action,
      actor_user_id,
      previous_values,
      new_values
    ) values (
      saved_record.id,
      'created',
      caller_id,
      null,
      to_jsonb(saved_record)
    );
  else
    select schedule.*
    into existing_record
    from public.regular_class_schedules as schedule
    where schedule.id = target_schedule_id
    for update;

    if not found then
      raise exception using errcode = 'P0002', message = 'Schedule not found';
    end if;

    if not public.is_class_admin(
      existing_record.class_id,
      existing_record.dojo_id,
      caller_id
    ) then
      raise exception using errcode = '42501', message = 'Not authorised for the existing schedule';
    end if;

    update public.regular_class_schedules as schedule
    set
      dojo_id = target_dojo_id,
      class_id = target_class_id,
      day_of_week = target_day_of_week,
      start_time = target_start_time,
      finish_time = target_finish_time,
      instructor_id = target_instructor_id,
      venue = clean_venue,
      notes = clean_notes,
      is_active = target_is_active,
      updated_by = caller_id,
      updated_at = now()
    where schedule.id = target_schedule_id
    returning * into saved_record;

    if to_jsonb(existing_record) is distinct from to_jsonb(saved_record) then
      insert into public.regular_class_schedule_audit (
        schedule_id,
        action,
        actor_user_id,
        previous_values,
        new_values
      ) values (
        saved_record.id,
        'updated',
        caller_id,
        to_jsonb(existing_record),
        to_jsonb(saved_record)
      );
    end if;
  end if;

  return saved_record.id;
exception
  when unique_violation then
    raise exception using
      errcode = '23505',
      message = 'This dojo already has a schedule at the same day and time';
end;
$function$;

create or replace function public.get_training_session_roster(target_dojo_id uuid)
returns table(membership_id uuid,member_id text,full_name text,dojo_name text,rank_name text)
language plpgsql stable security definer set search_path=pg_catalog as $$
begin
 if not training_private.can_record(target_dojo_id) then raise exception using errcode='42501',message='Not authorised for this host dojo'; end if;
 return query select m.id,p.registration_number,p.full_name,d.name,r.name
 from public.class_memberships m join public.profiles p on p.id=m.user_id
 join public.dojos host on host.id=target_dojo_id
 left join public.dojos d on d.id=m.dojo_id left join public.ranks r on r.id=m.rank_id
 where m.class_id=host.class_id and m.status::text='active' and p.date_of_passing is null
 order by p.full_name,p.registration_number,m.id;
end $$;

create or replace function public.save_training_session(target_session_id uuid,target_dojo_id uuid,
 training_date date,training_details text,minutes integer,attendee_membership_ids uuid[],expected_version integer)
returns integer language plpgsql security definer set search_path=pg_catalog as $$
declare caller uuid:=auth.uid(); old training_private.sessions%rowtype; host public.dojos%rowtype;
 affected uuid[]; roster uuid[]; mid uuid; old_snapshot jsonb; next_version integer; rank_snapshot record;
 today date; old_attendance jsonb;
begin
 perform pg_advisory_xact_lock_shared(860086);
 -- Serialize attendance writers, then lock memberships in deterministic order.
 perform pg_advisory_xact_lock(780078);
 perform m.id from public.class_memberships m join public.dojos d on d.class_id=m.class_id
 where m.user_id=caller and d.id=target_dojo_id order by m.id for share of m;
 perform p.id from public.profiles p where p.id=caller for share;
 if not training_private.can_record(target_dojo_id) then raise exception using errcode='42501',message='Not authorised for this host dojo'; end if;
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

DO $security$
DECLARE f record;
BEGIN
 FOR f IN SELECT p.oid::regprocedure signature,n.nspname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='instructor_private'
 OR (n.nspname='training_private' AND p.proname='can_record')
 OR (n.nspname='public' AND p.proname IN ('get_class_instructor_appointments','set_class_instructor_appointment',
 'get_manageable_training_scopes','get_schedule_instructor_options','upsert_regular_class_schedule',
 'get_training_session_roster','save_training_session')) LOOP
  EXECUTE format('ALTER FUNCTION %s OWNER TO postgres',f.signature);
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM public,anon,authenticated,service_role',f.signature);
  IF f.nspname='public' THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',f.signature); END IF;
 END LOOP;
END $security$;
COMMENT ON FUNCTION public.get_schedule_instructor_options(uuid) IS
 'Returns explicitly appointed active class members for a scoped active class and dojo.';
NOTIFY pgrst,'reload schema';
COMMIT;
