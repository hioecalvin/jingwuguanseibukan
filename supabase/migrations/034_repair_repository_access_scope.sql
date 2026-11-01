-- ============================================================
-- 034 REPAIR REPOSITORY ACCESS SCOPE
-- ============================================================
-- The Member repository UI treats active, legacy break, break_1 and break_2
-- memberships as eligible. The hardened helper introduced in migration 014
-- retained only active/legacy-break, causing current break members to pass the
-- page guard but receive no ranks, tiers or published content through RLS.
--
-- Content management also reads public.content directly. Migration 028 removed
-- browser writes correctly, but the remaining SELECT policy only exposes
-- published rows to Members. Add a separate management policy aligned with the
-- same can_manage_class() boundary used by the mutation RPCs.
--
-- The recorded migration ledger also contains migration 010 while the restored
-- live schema lacks its event/announcement notification helpers and triggers.
-- Restore those objects here with trigger-only browser access and current
-- account/membership eligibility rules.
-- ============================================================

begin;

do $preflight$
begin
  if to_regprocedure('public.has_repository_access(uuid,uuid)') is null
     or to_regprocedure('public.can_manage_class(uuid,uuid)') is null
     or to_regprocedure('public.create_notification(uuid,text,text,text,text,uuid,jsonb)') is null
     or to_regclass('public.content') is null
     or to_regclass('public.events') is null
     or to_regclass('public.announcements') is null then
    raise exception 'Required repository authorization objects are missing';
  end if;
end
$preflight$;

create or replace function public.has_repository_access(
  target_class uuid,
  uid uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    uid is not null
    and (
      uid = auth.uid()
      or coalesce(auth.role(), '') = 'service_role'
    )
    and exists (
      select 1
      from public.class_memberships as membership
      join public.profiles as profile
        on profile.id = membership.user_id
      where membership.user_id = uid
        and membership.class_id = target_class
        and membership.status in (
          'active',
          'break',
          'break_1',
          'break_2'
        )
        and profile.account_status = 'active'
    );
$$;

revoke execute on function public.has_repository_access(uuid, uuid)
from public, anon;

grant execute on function public.has_repository_access(uuid, uuid)
to authenticated, service_role;

drop policy if exists "repository managers read all content"
on public.content;

create policy "repository managers read all content"
on public.content
for select
to authenticated
using (
  public.can_manage_class(class_id, auth.uid())
);

create or replace function public.notify_announcement_published(
  target_announcement_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  item record;
  recipient record;
  created_count integer := 0;
begin
  select announcement.id, announcement.title, announcement.message,
         announcement.class_id, announcement.published, class_data.name as class_name
  into item
  from public.announcements as announcement
  left join public.classes as class_data on class_data.id = announcement.class_id
  where announcement.id = target_announcement_id;

  if not found then raise exception 'Announcement not found'; end if;
  if item.published is not true then return 0; end if;

  for recipient in
    select distinct membership.user_id
    from public.class_memberships as membership
    join public.profiles as profile on profile.id = membership.user_id
    where membership.status in ('active','break','break_1','break_2')
      and profile.account_status = 'active'
      and (item.class_id is null or membership.class_id = item.class_id)
  loop
    if not exists (
      select 1 from public.notifications as notification
      where notification.user_id = recipient.user_id
        and notification.notification_type = 'announcement_published'
        and notification.reference_type = 'announcement'
        and notification.reference_id = item.id
    ) then
      perform public.create_notification(
        recipient.user_id, 'announcement_published', item.title, item.message,
        'announcement', item.id,
        jsonb_build_object('announcement_id',item.id,'class_id',item.class_id,'class_name',item.class_name)
      );
      created_count := created_count + 1;
    end if;
  end loop;
  return created_count;
end;
$$;

create or replace function public.handle_announcement_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (tg_op = 'INSERT' and new.published is true)
     or (tg_op = 'UPDATE' and new.published is true and coalesce(old.published,false) is false) then
    perform public.notify_announcement_published(new.id);
  end if;
  return new;
end;
$$;

create or replace function public.notify_event_created(target_event_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  item record;
  recipient record;
  created_count integer := 0;
  body text;
begin
  select event_data.id, event_data.class_id, event_data.title, event_data.description,
         event_data.location, event_data.starts_at, event_data.end_at,
         class_data.name as class_name
  into item
  from public.events as event_data
  join public.classes as class_data on class_data.id = event_data.class_id
  where event_data.id = target_event_id;
  if not found then raise exception 'Event not found'; end if;

  body := 'New ' || coalesce(item.class_name,'class') || ' event: ' || item.title ||
    ' · ' || to_char(item.starts_at,'DD Mon YYYY HH24:MI') ||
    case when item.location is null then '' else ' · ' || item.location end;

  for recipient in
    select distinct membership.user_id
    from public.class_memberships as membership
    join public.profiles as profile on profile.id = membership.user_id
    where membership.class_id = item.class_id
      and membership.status in ('active','break','break_1','break_2')
      and profile.account_status = 'active'
  loop
    if not exists (
      select 1 from public.notifications as notification
      where notification.user_id = recipient.user_id
        and notification.notification_type = 'event_created'
        and notification.reference_type = 'event'
        and notification.reference_id = item.id
    ) then
      perform public.create_notification(
        recipient.user_id,'event_created',item.title,body,'event',item.id,
        jsonb_build_object('event_id',item.id,'class_id',item.class_id,'class_name',item.class_name,
          'starts_at',item.starts_at,'end_at',item.end_at,'location',item.location)
      );
      created_count := created_count + 1;
    end if;
  end loop;
  return created_count;
end;
$$;

create or replace function public.notify_event_updated(target_event_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  item record;
  recipient record;
  created_count integer := 0;
  body text;
begin
  select event_data.id, event_data.class_id, event_data.title, event_data.description,
         event_data.location, event_data.starts_at, event_data.end_at,
         class_data.name as class_name
  into item
  from public.events as event_data
  join public.classes as class_data on class_data.id = event_data.class_id
  where event_data.id = target_event_id;
  if not found then raise exception 'Event not found'; end if;

  body := 'Event details were updated: ' || item.title || ' · ' ||
    to_char(item.starts_at,'DD Mon YYYY HH24:MI') ||
    case when item.location is null then '' else ' · ' || item.location end;

  for recipient in
    select distinct membership.user_id
    from public.class_memberships as membership
    join public.profiles as profile on profile.id = membership.user_id
    where membership.class_id = item.class_id
      and membership.status in ('active','break','break_1','break_2')
      and profile.account_status = 'active'
  loop
    perform public.create_notification(
      recipient.user_id,'event_updated',item.title,body,'event',item.id,
      jsonb_build_object('event_id',item.id,'class_id',item.class_id,'class_name',item.class_name,
        'starts_at',item.starts_at,'end_at',item.end_at,'location',item.location)
    );
    created_count := created_count + 1;
  end loop;
  return created_count;
end;
$$;

create or replace function public.handle_event_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    perform public.notify_event_created(new.id);
  elsif new.title is distinct from old.title
     or new.description is distinct from old.description
     or new.location is distinct from old.location
     or new.starts_at is distinct from old.starts_at
     or new.end_at is distinct from old.end_at
     or new.class_id is distinct from old.class_id then
    perform public.notify_event_updated(new.id);
  end if;
  return new;
end;
$$;

revoke execute on function public.notify_announcement_published(uuid) from public, anon, authenticated;
revoke execute on function public.notify_event_created(uuid) from public, anon, authenticated;
revoke execute on function public.notify_event_updated(uuid) from public, anon, authenticated;
revoke execute on function public.handle_announcement_notification() from public, anon, authenticated;
revoke execute on function public.handle_event_notification() from public, anon, authenticated;

grant execute on function public.notify_announcement_published(uuid) to service_role;
grant execute on function public.notify_event_created(uuid) to service_role;
grant execute on function public.notify_event_updated(uuid) to service_role;
grant execute on function public.handle_announcement_notification() to service_role;
grant execute on function public.handle_event_notification() to service_role;

drop trigger if exists announcement_in_app_notification_trigger on public.announcements;
create trigger announcement_in_app_notification_trigger
after insert or update of published on public.announcements
for each row execute function public.handle_announcement_notification();

drop trigger if exists event_in_app_notification_trigger on public.events;
create trigger event_in_app_notification_trigger
after insert or update on public.events
for each row execute function public.handle_event_notification();

do $postflight$
declare
  helper_definition text;
begin
  select pg_get_functiondef(
    'public.has_repository_access(uuid,uuid)'::regprocedure
  ) into helper_definition;

  if position('BREAK_1' in upper(helper_definition)) = 0
     or position('BREAK_2' in upper(helper_definition)) = 0
     or position('UID = AUTH.UID()' in upper(helper_definition)) = 0 then
    raise exception 'Repository-access helper postflight failed';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'content'
      and policyname = 'repository managers read all content'
      and cmd = 'SELECT'
      and roles = array['authenticated']::name[]
      and qual ilike '%can_manage_class%'
  ) then
    raise exception 'Repository management SELECT policy postflight failed';
  end if;

  if to_regprocedure('public.notify_event_created(uuid)') is null
     or to_regprocedure('public.notify_event_updated(uuid)') is null
     or to_regprocedure('public.notify_announcement_published(uuid)') is null
     or not exists (
       select 1 from pg_trigger
       where tgrelid = 'public.events'::regclass
         and tgname = 'event_in_app_notification_trigger'
         and not tgisinternal
     )
     or not exists (
       select 1 from pg_trigger
       where tgrelid = 'public.announcements'::regclass
         and tgname = 'announcement_in_app_notification_trigger'
         and not tgisinternal
     ) then
    raise exception 'Event notification restoration postflight failed';
  end if;

  if has_function_privilege('authenticated','public.notify_event_created(uuid)','EXECUTE')
     or has_function_privilege('authenticated','public.notify_event_updated(uuid)','EXECUTE')
     or has_function_privilege('authenticated','public.notify_announcement_published(uuid)','EXECUTE') then
    raise exception 'Event notification helper ACL postflight failed';
  end if;

  if has_function_privilege(
       'anon',
       'public.has_repository_access(uuid,uuid)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'authenticated',
       'public.has_repository_access(uuid,uuid)',
       'EXECUTE'
     ) then
    raise exception 'Repository-access helper ACL postflight failed';
  end if;

  if has_table_privilege('authenticated', 'public.content', 'INSERT')
     or has_table_privilege('authenticated', 'public.content', 'UPDATE')
     or has_table_privilege('authenticated', 'public.content', 'DELETE')
     or not has_table_privilege('authenticated', 'public.content', 'SELECT') then
    raise exception 'Repository content table ACL postflight failed';
  end if;
end
$postflight$;

comment on function public.has_repository_access(uuid, uuid) is
  'Returns repository eligibility for the bound caller across active and supported break membership states.';

comment on policy "repository managers read all content" on public.content is
  'Allows Super Admins and class managers to read draft and published repository content without restoring direct browser writes.';

notify pgrst, 'reload schema';

commit;
