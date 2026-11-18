-- Actual teaching identity is separate from the operator who records attendance.
-- Existing sessions are not backfilled from their creator: that would invent facts.
begin;
alter table training_private.sessions add column instructor_id uuid references public.profiles(id);
alter table training_private.sessions add column instructor_name_snapshot text;

create function public.get_training_instructor_options(target_dojo_id uuid,training_date date)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog as $$
declare primary_id uuid; candidates uuid[];
begin
 if not training_private.can_record(target_dojo_id) then raise exception using errcode='42501',message='Not authorised for this host dojo';end if;
 if training_date is null or not isfinite(training_date) then raise exception using errcode='22023',message='Training date required';end if;
 select array_agg(distinct s.instructor_id) into candidates from public.regular_class_schedules s
 join public.profiles p on p.id=s.instructor_id and p.account_status::text='active' and p.date_of_passing is null
 where s.dojo_id=target_dojo_id and s.is_active and s.day_of_week=extract(dow from training_date);
 if cardinality(candidates)=1 then primary_id:=candidates[1];end if;
 return jsonb_build_object('primary_instructor_id',primary_id,'instructors',coalesce((
 select jsonb_agg(jsonb_build_object('id',p.id,'name',p.full_name,'member_id',p.registration_number) order by p.full_name,p.id)
 from public.profiles p where p.account_status::text='active' and p.date_of_passing is null),'[]'::jsonb));
end$$;

-- Clone the installed attendance writer and retain all later validation and locks.
-- Only the instructor validation and persisted audit snapshot are added.
do $patch$
declare definition text; marker text;
begin
 definition:=replace(pg_get_functiondef('public.save_training_session(uuid,uuid,date,text,integer,uuid[],integer)'::regprocedure),chr(13),'');
 marker:='public.save_training_session(target_session_id uuid, target_dojo_id uuid, training_date date, training_details text, minutes integer, attendee_membership_ids uuid[], expected_version integer)';
 if cardinality(string_to_array(definition,marker))<>2 or position('training_private.can_record(target_dojo_id)' in definition)=0
 or position('pg_advisory_xact_lock_shared(860086)' in definition)=0 then raise exception 'Review changed training writer';end if;
 definition:=replace(definition,marker,'public.save_training_session_with_instructor(target_session_id uuid, target_dojo_id uuid, training_date date, training_details text, minutes integer, attendee_membership_ids uuid[], expected_version integer, target_instructor_id uuid)');
 marker:=' insert into training_private.session_audit(session_id,version,actor_id,previous_values,new_values)';
 if cardinality(string_to_array(definition,marker))<>2 then raise exception 'Review changed training audit writer';end if;
 definition:=replace(definition,marker,$addition$
 -- Same global training writer lock; lock/recheck identity before recording it.
 perform p.id from public.profiles p where p.id=target_instructor_id for share;
 if target_instructor_id is null or (not (old.instructor_id is not distinct from target_instructor_id and old.session_date=training_date)
 and not exists(select from public.profiles p where p.id=target_instructor_id
   and p.account_status::text='active' and p.date_of_passing is null)) then
  raise exception using errcode='22023',message='Select an active living member as instructor';
 end if;
 update training_private.sessions s set instructor_id=target_instructor_id,
 instructor_name_snapshot=case when old.instructor_id=target_instructor_id then old.instructor_name_snapshot else
 (select p.full_name from public.profiles p where p.id=target_instructor_id) end where s.id=target_session_id;
 insert into training_private.session_audit(session_id,version,actor_id,previous_values,new_values)$addition$);
 execute definition;
 -- Legacy sessions show no invented teacher; recorded_by remains available.
 definition:=pg_get_functiondef('public.get_training_sessions(date,uuid)'::regprocedure);
 marker:='''instructor_name'',p.full_name';
 if cardinality(string_to_array(definition,marker))<>2 then raise exception 'Review changed training reader';end if;
 execute replace(definition,marker,'''instructor_name'',s.instructor_name_snapshot,''recorded_by_name'',p.full_name');
end $patch$;

alter function public.get_training_instructor_options(uuid,date) owner to postgres;
alter function public.save_training_session_with_instructor(uuid,uuid,date,text,integer,uuid[],integer,uuid) owner to postgres;
revoke all on function public.get_training_instructor_options(uuid,date),public.save_training_session_with_instructor(uuid,uuid,date,text,integer,uuid[],integer,uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_training_instructor_options(uuid,date),public.save_training_session_with_instructor(uuid,uuid,date,text,integer,uuid[],integer,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
