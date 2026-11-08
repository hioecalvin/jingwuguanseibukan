begin;

create function public.get_regular_schedules_with_whatsapp(include_inactive boolean default false)
returns table (
  schedule_id uuid,
  dojo_id uuid,
  dojo_name text,
  class_id uuid,
  class_name text,
  day_of_week smallint,
  start_time time without time zone,
  finish_time time without time zone,
  instructor_id uuid,
  instructor_name text,
  venue text,
  notes text,
  is_active boolean,
  can_manage boolean,
  updated_at timestamptz,
  instructor_rank text,
  instructor_phone text,
  instructor_whatsapp text
)
language sql stable security definer set search_path = pg_catalog as $$
  select schedule.*, (
    select profile.whatsapp_number
    from public.profiles as profile
    where profile.id = schedule.instructor_id
      and instructor_private.is_appointed(profile.id, schedule.class_id)
  )
  from public.get_regular_schedules_with_instructor(include_inactive) as schedule;
$$;

alter function public.get_regular_schedules_with_whatsapp(boolean) owner to postgres;
revoke all on function public.get_regular_schedules_with_whatsapp(boolean) from public, anon, authenticated, service_role;
grant execute on function public.get_regular_schedules_with_whatsapp(boolean) to authenticated;

notify pgrst, 'reload schema';
commit;
