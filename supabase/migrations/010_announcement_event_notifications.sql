-- ============================================================
-- 010 ANNOUNCEMENT + EVENT IN-APP NOTIFICATIONS
-- ============================================================
--
-- Adds automatic in-app notifications for:
-- - published announcements
-- - newly created events
-- - meaningful event updates
--
-- Class-specific items notify members of that class.
-- General announcements notify active/break members across classes.
--
-- This uses the existing public.create_notification(...) helper.
-- ============================================================


-- ============================================================
-- 1. NOTIFY A PUBLISHED ANNOUNCEMENT
-- ============================================================

create or replace function public.notify_announcement_published(
  target_announcement_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  announcement_record record;
  member_record record;
  notification_count integer := 0;
begin

  select
    a.id,
    a.title,
    a.message,
    a.class_id,
    a.published,
    c.name as class_name
  into announcement_record
  from public.announcements a
  left join public.classes c
    on c.id = a.class_id
  where a.id = target_announcement_id;


  if not found then
    raise exception
      'Announcement not found';
  end if;


  if announcement_record.published is not true then
    return 0;
  end if;


  for member_record in

    select distinct
      cm.user_id

    from public.class_memberships cm

    where cm.status in (
      'active',
      'break_1',
      'break_2'
    )

      and (
        announcement_record.class_id is null
        or cm.class_id =
          announcement_record.class_id
      )

  loop

    /*
     * Avoid duplicating the original
     * published notification for the same
     * announcement and member.
     */

    if not exists (
      select 1
      from public.notifications n
      where n.user_id =
        member_record.user_id
        and n.notification_type =
          'announcement_published'
        and n.reference_type =
          'announcement'
        and n.reference_id =
          announcement_record.id
    ) then

      perform public.create_notification(
        member_record.user_id,

        'announcement_published',

        announcement_record.title,

        announcement_record.message,

        'announcement',

        announcement_record.id,

        jsonb_build_object(
          'announcement_id',
            announcement_record.id,

          'class_id',
            announcement_record.class_id,

          'class_name',
            announcement_record.class_name
        )
      );


      notification_count :=
        notification_count + 1;

    end if;

  end loop;


  return notification_count;

end;
$$;



-- ============================================================
-- 2. ANNOUNCEMENT TRIGGER
-- ============================================================

create or replace function public.handle_announcement_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin

  /*
   * Inserted already published,
   * OR changed from unpublished to published.
   */

  if (
    tg_op = 'INSERT'
    and new.published is true
  )
  or (
    tg_op = 'UPDATE'
    and new.published is true
    and coalesce(old.published, false) is false
  ) then

    perform public.notify_announcement_published(
      new.id
    );

  end if;


  return new;

end;
$$;


drop trigger if exists
announcement_in_app_notification_trigger
on public.announcements;


create trigger
announcement_in_app_notification_trigger
after insert or update of published
on public.announcements
for each row
execute function
public.handle_announcement_notification();



-- ============================================================
-- 3. NOTIFY EVENT CREATED
-- ============================================================

create or replace function public.notify_event_created(
  target_event_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  event_record record;
  member_record record;
  notification_count integer := 0;
  notification_message text;
begin

  select
    e.id,
    e.class_id,
    e.title,
    e.description,
    e.location,
    e.starts_at,
    e.end_at,
    c.name as class_name
  into event_record
  from public.events e
  join public.classes c
    on c.id = e.class_id
  where e.id = target_event_id;


  if not found then
    raise exception
      'Event not found';
  end if;


  notification_message :=
    'New '
    ||
    coalesce(
      event_record.class_name,
      'class'
    )
    ||
    ' event: '
    ||
    event_record.title
    ||
    ' · '
    ||
    to_char(
      event_record.starts_at,
      'DD Mon YYYY HH24:MI'
    );


  if event_record.location is not null then
    notification_message :=
      notification_message
      ||
      ' · '
      ||
      event_record.location;
  end if;


  for member_record in

    select distinct
      cm.user_id

    from public.class_memberships cm

    where cm.class_id =
      event_record.class_id

      and cm.status in (
        'active',
        'break_1',
        'break_2'
      )

  loop

    if not exists (
      select 1
      from public.notifications n
      where n.user_id =
        member_record.user_id
        and n.notification_type =
          'event_created'
        and n.reference_type =
          'event'
        and n.reference_id =
          event_record.id
    ) then

      perform public.create_notification(
        member_record.user_id,

        'event_created',

        event_record.title,

        notification_message,

        'event',

        event_record.id,

        jsonb_build_object(
          'event_id',
            event_record.id,

          'class_id',
            event_record.class_id,

          'class_name',
            event_record.class_name,

          'starts_at',
            event_record.starts_at,

          'end_at',
            event_record.end_at,

          'location',
            event_record.location
        )
      );


      notification_count :=
        notification_count + 1;

    end if;

  end loop;


  return notification_count;

end;
$$;



-- ============================================================
-- 4. NOTIFY EVENT UPDATED
-- ============================================================

create or replace function public.notify_event_updated(
  target_event_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  event_record record;
  member_record record;
  notification_count integer := 0;
  notification_message text;
begin

  select
    e.id,
    e.class_id,
    e.title,
    e.description,
    e.location,
    e.starts_at,
    e.end_at,
    c.name as class_name
  into event_record
  from public.events e
  join public.classes c
    on c.id = e.class_id
  where e.id = target_event_id;


  if not found then
    raise exception
      'Event not found';
  end if;


  notification_message :=
    'Event details were updated: '
    ||
    event_record.title
    ||
    ' · '
    ||
    to_char(
      event_record.starts_at,
      'DD Mon YYYY HH24:MI'
    );


  if event_record.location is not null then
    notification_message :=
      notification_message
      ||
      ' · '
      ||
      event_record.location;
  end if;


  for member_record in

    select distinct
      cm.user_id

    from public.class_memberships cm

    where cm.class_id =
      event_record.class_id

      and cm.status in (
        'active',
        'break_1',
        'break_2'
      )

  loop

    perform public.create_notification(
      member_record.user_id,

      'event_updated',

      event_record.title,

      notification_message,

      'event',

      event_record.id,

      jsonb_build_object(
        'event_id',
          event_record.id,

        'class_id',
          event_record.class_id,

        'class_name',
          event_record.class_name,

        'starts_at',
          event_record.starts_at,

        'end_at',
          event_record.end_at,

        'location',
          event_record.location
      )
    );


    notification_count :=
      notification_count + 1;

  end loop;


  return notification_count;

end;
$$;



-- ============================================================
-- 5. EVENT TRIGGER
-- ============================================================

create or replace function public.handle_event_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin

  if tg_op = 'INSERT' then

    perform public.notify_event_created(
      new.id
    );

    return new;

  end if;


  /*
   * Send an update notification only when
   * member-facing event details changed.
   */

  if
    new.title is distinct from old.title
    or new.description is distinct from old.description
    or new.location is distinct from old.location
    or new.starts_at is distinct from old.starts_at
    or new.end_at is distinct from old.end_at
    or new.class_id is distinct from old.class_id
  then

    perform public.notify_event_updated(
      new.id
    );

  end if;


  return new;

end;
$$;


drop trigger if exists
event_in_app_notification_trigger
on public.events;


create trigger
event_in_app_notification_trigger
after insert or update
on public.events
for each row
execute function
public.handle_event_notification();



-- ============================================================
-- 6. PERMISSIONS
-- ============================================================

grant execute
on function public.notify_announcement_published(uuid)
to authenticated;


grant execute
on function public.notify_event_created(uuid)
to authenticated;


grant execute
on function public.notify_event_updated(uuid)
to authenticated;



-- ============================================================
-- 7. RELOAD POSTGREST SCHEMA
-- ============================================================

notify pgrst, 'reload schema';



-- ============================================================
-- 8. VERIFY
-- ============================================================

select
  routine_name
from information_schema.routines
where routine_schema =
  'public'
  and routine_name in (
    'notify_announcement_published',
    'notify_event_created',
    'notify_event_updated',
    'handle_announcement_notification',
    'handle_event_notification'
  )
order by
  routine_name;
