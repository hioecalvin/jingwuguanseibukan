-- ============================================================
-- 040 DECEASED MEMBER + MEMORIAL LIFECYCLE
-- ============================================================
-- Preserve the member and all historical records while disabling online
-- access, add class-scoped memorial publishing, and provide an idempotent
-- service-only annual processor. This migration deliberately does not change
-- class_memberships.status and never deletes auth.users rows.
--
-- The annual processor defaults to the Asia/Jakarta business date. A 29-Feb
-- anniversary is observed on 28-Feb in non-leap years.
-- ============================================================

begin;

do $preflight$
declare
  configured_hook text;
begin
  if to_regclass('public.profiles') is null
     or to_regclass('public.class_memberships') is null
     or to_regclass('public.classes') is null
     or to_regclass('public.announcements') is null
     or to_regclass('public.notifications') is null
     or to_regclass('public.push_subscriptions') is null
     or to_regprocedure('public.is_super_admin(uuid)') is null
     or to_regprocedure('public.create_notification(uuid,text,text,text,text,uuid,jsonb)') is null then
    raise exception 'Required member, announcement, and authorization objects are missing';
  end if;

  -- is_super_admin() is a default-argument call to the uuid signature, not a
  -- separate zero-argument overload. Verify both the function and that call
  -- contract before policies below rely on the zero-argument form.
  if not exists (
    select 1
    from pg_proc
    where oid = 'public.is_super_admin(uuid)'::regprocedure
      and pronargdefaults = 1
  ) then
    raise exception 'is_super_admin(uuid) must retain its zero-argument default';
  end if;

  if not exists (select 1 from pg_roles where rolname = 'authenticator') then
    raise exception 'The PostgREST authenticator role is missing';
  end if;

  select setting
  into configured_hook
  from pg_roles as role_data
  cross join lateral unnest(coalesce(role_data.rolconfig, array[]::text[])) as configured(setting)
  where role_data.rolname = 'authenticator'
    and setting like 'pgrst.db_pre_request=%'
  limit 1;

  if configured_hook is not null
     and configured_hook <> 'pgrst.db_pre_request=public.enforce_active_account_request' then
    raise exception 'A different PostgREST pre-request hook is already configured: %', configured_hook;
  end if;
end
$preflight$;

alter table public.profiles
  add column date_of_passing date;

alter table public.profiles
  add constraint profiles_deceased_accounts_disabled
  check (
    date_of_passing is null
    or account_status = 'disabled'::public.account_status
  );

alter table public.announcements
  add column announcement_type text not null default 'general',
  add column subject_user_id uuid references public.profiles(id) on delete restrict;

alter table public.announcements
  add constraint announcements_type_check
  check (announcement_type in (
    'general',
    'memorial_initial',
    'memorial_remembrance',
    'memorial_heavenly_birthday'
  ));

create table public.member_memorial_settings (
  user_id uuid primary key references public.profiles(id) on delete restrict,
  remembrance_enabled boolean not null default true,
  heavenly_birthday_enabled boolean not null default true,
  remembrance_message text,
  heavenly_birthday_message text,
  prior_account_status public.account_status not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint memorial_remembrance_message_length
    check (remembrance_message is null or length(remembrance_message) between 1 and 10000),
  constraint memorial_heavenly_message_length
    check (heavenly_birthday_message is null or length(heavenly_birthday_message) between 1 and 10000)
);

create table public.member_memorial_recipient_classes (
  user_id uuid not null references public.member_memorial_settings(user_id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (user_id, class_id)
);

create table public.member_memorial_audit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  action text not null check (action in (
    'marked_deceased',
    'settings_updated',
    'reversed_deceased',
    'initial_memorial_published',
    'annual_memorial_published'
  )),
  actor_user_id uuid references public.profiles(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.member_memorial_publications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  memorial_type text not null check (memorial_type in (
    'initial',
    'remembrance',
    'heavenly_birthday'
  )),
  occurrence_date date not null,
  announcement_id uuid not null references public.announcements(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (user_id, memorial_type, occurrence_date)
);

create unique index member_memorial_one_initial
on public.member_memorial_publications(user_id)
where memorial_type = 'initial';

create table public.announcement_recipient_classes (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (announcement_id, class_id)
);

create index announcement_recipient_classes_class_idx
on public.announcement_recipient_classes(class_id, announcement_id);

alter table public.member_memorial_settings enable row level security;
alter table public.member_memorial_recipient_classes enable row level security;
alter table public.member_memorial_audit enable row level security;
alter table public.member_memorial_publications enable row level security;
alter table public.announcement_recipient_classes enable row level security;

revoke all on table public.member_memorial_settings from public, anon, authenticated;
revoke all on table public.member_memorial_recipient_classes from public, anon, authenticated;
revoke all on table public.member_memorial_audit from public, anon, authenticated;
revoke all on table public.member_memorial_publications from public, anon, authenticated;
revoke all on table public.announcement_recipient_classes from public, anon, authenticated;

grant all on table public.member_memorial_settings to service_role;
grant all on table public.member_memorial_recipient_classes to service_role;
grant all on table public.member_memorial_audit to service_role;
grant all on table public.member_memorial_publications to service_role;
grant all on table public.announcement_recipient_classes to service_role;
grant select on table public.announcement_recipient_classes to authenticated;

create policy "eligible members read announcement recipient classes"
on public.announcement_recipient_classes
for select
to authenticated
using (
  public.is_super_admin()
  or exists (
    select 1
    from public.class_memberships as membership
    join public.profiles as caller on caller.id = membership.user_id
    where membership.user_id = auth.uid()
      and membership.class_id = announcement_recipient_classes.class_id
      and membership.status in ('active','break','break_1','break_2')
      and caller.account_status = 'active'
      and caller.date_of_passing is null
  )
);

create or replace function public.can_view_announcement(
  target_announcement_id uuid,
  target_legacy_class_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    exists (
      select 1
      from public.profiles as caller
      where caller.id = auth.uid()
        and caller.account_status = 'active'
        and caller.date_of_passing is null
    )
    and (
      exists (
        select 1
        from public.announcement_recipient_classes as recipient_class
        join public.class_memberships as membership
          on membership.class_id = recipient_class.class_id
        where recipient_class.announcement_id = target_announcement_id
          and membership.user_id = auth.uid()
          and membership.status in ('active','break','break_1','break_2')
      )
      or (
        not exists (
          select 1
          from public.announcement_recipient_classes as recipient_class
          where recipient_class.announcement_id = target_announcement_id
        )
        and (
          target_legacy_class_id is null
          or exists (
            select 1
            from public.class_memberships as membership
            where membership.user_id = auth.uid()
              and membership.class_id = target_legacy_class_id
              and membership.status in ('active','break','break_1','break_2')
          )
        )
      )
    );
$$;

revoke execute on function public.can_view_announcement(uuid,uuid)
from public, anon;
grant execute on function public.can_view_announcement(uuid,uuid)
to authenticated, service_role;

create or replace function public.guard_deceased_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.date_of_passing is distinct from old.date_of_passing
     and coalesce(auth.role(), '') <> 'service_role'
     and not public.is_super_admin(auth.uid()) then
    raise exception using errcode = '42501', message = 'Only a Super Admin can change deceased-member details';
  end if;

  if new.date_of_passing is not null then
    new.account_status := 'disabled'::public.account_status;
  end if;

  return new;
end;
$$;

create trigger guard_deceased_profile_fields_trigger
before update of date_of_passing, account_status on public.profiles
for each row execute function public.guard_deceased_profile_fields();

create or replace function public.is_active_app_user(
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    target_user_id is not null
    and (
      target_user_id = auth.uid()
      or coalesce(auth.role(), '') = 'service_role'
    )
    and exists (
      select 1
      from public.profiles as profile
      where profile.id = target_user_id
        and profile.account_status = 'active'
        and profile.date_of_passing is null
    );
$$;

create or replace function public.enforce_active_account_request()
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if coalesce(auth.role(), '') = 'authenticated'
     and not public.is_active_app_user(auth.uid()) then
    raise exception using
      errcode = '42501',
      message = 'Account access is disabled';
  end if;
end;
$$;

revoke execute on function public.guard_deceased_profile_fields() from public, anon, authenticated;
grant execute on function public.guard_deceased_profile_fields() to service_role;

revoke execute on function public.is_active_app_user(uuid) from public, anon;
grant execute on function public.is_active_app_user(uuid) to authenticated, service_role;

revoke execute on function public.enforce_active_account_request() from public;
grant execute on function public.enforce_active_account_request() to anon, authenticated, service_role;

alter role authenticator
set pgrst.db_pre_request = 'public.enforce_active_account_request';

drop policy if exists "own profile" on public.profiles;
create policy "own profile"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  and account_status = 'active'
  and date_of_passing is null
);

drop policy if exists "admin scoped profiles" on public.profiles;
create policy "admin scoped profiles"
on public.profiles
for select
to authenticated
using (
  public.is_super_admin()
  or (
    date_of_passing is null
    and exists (
      select 1
      from public.class_memberships as target
      where target.user_id = profiles.id
        and public.is_class_admin(target.class_id, target.dojo_id)
    )
  )
);

drop policy if exists "own memberships" on public.class_memberships;
create policy "own memberships"
on public.class_memberships
for select
to authenticated
using (
  user_id = auth.uid()
  and public.is_active_app_user(auth.uid())
);

drop policy if exists "admin scoped memberships" on public.class_memberships;
create policy "admin scoped memberships"
on public.class_memberships
for select
to authenticated
using (
  public.is_super_admin()
  or public.is_class_admin(class_id, dojo_id)
);

create or replace view public.admin_visible_members
with (security_invoker = true)
as
select
  m.id as membership_id,
  p.id as user_id,
  p.registration_number as member_id,
  p.registration_number,
  p.full_name,
  p.email,
  p.phone,
  p.whatsapp_number,
  p.avatar_url,
  p.date_of_birth,
  c.id as class_id,
  c.name as class_name,
  d.id as dojo_id,
  d.name as dojo_name,
  m.status as membership_status,
  m.break_count,
  m.level,
  m.role,
  m.rank_id,
  r.name as rank_name,
  m.sub_rank_id,
  sr.name as sub_rank_name,
  m.joined_date,
  (
    select history.effective_date
    from public.membership_grade_history as history
    where history.membership_id = m.id
      and history.revoked_at is null
    order by history.effective_date desc, history.created_at desc, history.id desc
    limit 1
  ) as last_grading_date,
  exists (
    select 1
    from public.dojo_admin_assignments as assignment
    where assignment.user_id = m.user_id
      and assignment.class_id = m.class_id
      and assignment.active = true
  ) as has_admin_access,
  p.is_grading_assessor,
  p.aikikai_registration_number,
  c.title_system,
  m.title_level,
  public.get_membership_title_name(c.id, m.title_level) as title_name,
  p.date_of_passing,
  p.account_status
from public.class_memberships as m
join public.profiles as p on p.id = m.user_id
join public.classes as c on c.id = m.class_id
left join public.dojos as d on d.id = m.dojo_id
left join public.ranks as r on r.id = m.rank_id
left join public.sub_ranks as sr on sr.id = m.sub_rank_id
where p.date_of_passing is null
   or public.is_super_admin();

revoke all on public.admin_visible_members from public, anon;
grant select on public.admin_visible_members to authenticated, service_role;

drop policy if exists "members can view announcements" on public.announcements;
create policy "members can view announcements"
on public.announcements
for select
to authenticated
using (
  published = true
  and (
    public.is_super_admin()
    or public.can_view_announcement(announcements.id, announcements.class_id)
  )
);

drop policy if exists "read own notifications" on public.notifications;
create policy "read own notifications"
on public.notifications
for select
to authenticated
using (
  user_id = auth.uid()
  and public.is_active_app_user(auth.uid())
);

drop policy if exists "users can view own push subscriptions" on public.push_subscriptions;
create policy "users can view own push subscriptions"
on public.push_subscriptions
for select
to authenticated
using (user_id = auth.uid() and public.is_active_app_user(auth.uid()));

drop policy if exists "users can create own push subscriptions" on public.push_subscriptions;
create policy "users can create own push subscriptions"
on public.push_subscriptions
for insert
to authenticated
with check (user_id = auth.uid() and public.is_active_app_user(auth.uid()));

drop policy if exists "users can update own push subscriptions" on public.push_subscriptions;
create policy "users can update own push subscriptions"
on public.push_subscriptions
for update
to authenticated
using (user_id = auth.uid() and public.is_active_app_user(auth.uid()))
with check (user_id = auth.uid() and public.is_active_app_user(auth.uid()));

drop policy if exists "users can delete own push subscriptions" on public.push_subscriptions;
create policy "users can delete own push subscriptions"
on public.push_subscriptions
for delete
to authenticated
using (user_id = auth.uid() and public.is_active_app_user(auth.uid()));

drop policy if exists "members can view class events" on public.events;
create policy "members can view class events"
on public.events
for select
to authenticated
using (
  public.is_super_admin()
  or (
    public.is_active_app_user(auth.uid())
    and exists (
      select 1
      from public.class_memberships as membership
      where membership.user_id = auth.uid()
        and membership.class_id = events.class_id
        and membership.status in ('active','break','break_1','break_2')
    )
  )
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
  target_classes jsonb;
begin
  select announcement.id, announcement.title, announcement.message,
         announcement.class_id, announcement.published, announcement.announcement_type,
         class_data.name as class_name
  into item
  from public.announcements as announcement
  left join public.classes as class_data on class_data.id = announcement.class_id
  where announcement.id = target_announcement_id;

  if not found then raise exception 'Announcement not found'; end if;
  if item.published is not true then return 0; end if;

  select coalesce(jsonb_agg(recipient_class.class_id order by recipient_class.class_id), '[]'::jsonb)
  into target_classes
  from public.announcement_recipient_classes as recipient_class
  where recipient_class.announcement_id = item.id;

  for recipient in
    select distinct membership.user_id
    from public.class_memberships as membership
    join public.profiles as profile on profile.id = membership.user_id
    where membership.status in ('active','break','break_1','break_2')
      and profile.account_status = 'active'
      and profile.date_of_passing is null
      and (
        (
          jsonb_array_length(target_classes) > 0
          and exists (
            select 1 from public.announcement_recipient_classes as recipient_class
            where recipient_class.announcement_id = item.id
              and recipient_class.class_id = membership.class_id
          )
        )
        or (
          jsonb_array_length(target_classes) = 0
          and (item.class_id is null or membership.class_id = item.class_id)
        )
      )
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
        jsonb_build_object(
          'announcement_id', item.id,
          'announcement_type', item.announcement_type,
          'class_id', item.class_id,
          'class_name', item.class_name,
          'recipient_class_ids', target_classes
        )
      );
      created_count := created_count + 1;
    end if;
  end loop;
  return created_count;
end;
$$;

revoke execute on function public.notify_announcement_published(uuid)
from public, anon, authenticated;
grant execute on function public.notify_announcement_published(uuid)
to service_role;

create or replace function public.memorial_anniversary_matches(
  source_date date,
  target_date date
)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select
    source_date is not null
    and target_date is not null
    and (
      (
        extract(month from source_date) = extract(month from target_date)
        and extract(day from source_date) = extract(day from target_date)
      )
      or (
        extract(month from source_date) = 2
        and extract(day from source_date) = 29
        and extract(month from target_date) = 2
        and extract(day from target_date) = 28
        and extract(day from (date_trunc('month', target_date) + interval '1 month - 1 day')) = 28
      )
    );
$$;

create or replace function public.get_member_memorial_settings(
  target_user_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  result jsonb;
begin
  if not public.is_super_admin(auth.uid()) then
    raise exception using errcode = '42501', message = 'Super Admin access required';
  end if;

  select jsonb_build_object(
    'user_id', profile.id,
    'full_name', profile.full_name,
    'date_of_birth', profile.date_of_birth,
    'date_of_passing', profile.date_of_passing,
    'is_deceased', profile.date_of_passing is not null,
    'account_status', profile.account_status,
    'remembrance_enabled', coalesce(settings.remembrance_enabled, true),
    'heavenly_birthday_enabled', coalesce(settings.heavenly_birthday_enabled, true),
    'remembrance_message', settings.remembrance_message,
    'heavenly_birthday_message', settings.heavenly_birthday_message,
    'recipient_class_ids', coalesce((
      select jsonb_agg(recipient.class_id order by recipient.class_id)
      from public.member_memorial_recipient_classes as recipient
      where recipient.user_id = profile.id
    ), '[]'::jsonb),
    'recipient_classes', coalesce((
      select jsonb_agg(
        jsonb_build_object('id', class_data.id, 'name', class_data.name)
        order by class_data.name, class_data.id
      )
      from public.member_memorial_recipient_classes as recipient
      join public.classes as class_data on class_data.id = recipient.class_id
      where recipient.user_id = profile.id
    ), '[]'::jsonb),
    'updated_at', settings.updated_at
  )
  into result
  from public.profiles as profile
  left join public.member_memorial_settings as settings on settings.user_id = profile.id
  where profile.id = target_user_id;

  if result is null then raise exception 'Member not found'; end if;
  return result;
end;
$$;

create or replace function public.set_member_deceased(
  target_user_id uuid,
  target_date_of_passing date,
  target_recipient_class_ids uuid[],
  target_remembrance_enabled boolean,
  target_heavenly_birthday_enabled boolean,
  target_remembrance_message text,
  target_heavenly_birthday_message text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  member_row public.profiles%rowtype;
  normalized_class_ids uuid[];
  previous_date date;
  action_name text;
begin
  if not public.is_super_admin(auth.uid()) then
    raise exception using errcode = '42501', message = 'Super Admin access required';
  end if;
  if target_user_id = auth.uid() then
    raise exception 'A Super Admin cannot mark their own account deceased';
  end if;

  select * into member_row
  from public.profiles
  where id = target_user_id
  for update;
  if not found then raise exception 'Member not found'; end if;
  previous_date := member_row.date_of_passing;

  if target_date_of_passing is not null
     and target_date_of_passing > (timezone('Asia/Jakarta', now()))::date then
    raise exception 'Date of Passing cannot be in the future';
  end if;
  if target_date_of_passing is not null
     and target_date_of_passing < member_row.date_of_birth then
    raise exception 'Date of Passing cannot be before Date of Birth';
  end if;
  if target_date_of_passing is null and previous_date is null then
    if exists (
      select 1
      from public.member_memorial_settings as existing_settings
      where existing_settings.user_id = target_user_id
    ) then
      -- A prior reversal may have committed before the server could restore
      -- Supabase Auth access. Keep reversal retry-safe so the API can finish
      -- the Auth unban without creating duplicate audit rows.
      return public.get_member_memorial_settings(target_user_id);
    end if;

    raise exception 'Member is not marked deceased';
  end if;

  select coalesce(array_agg(distinct class_id order by class_id), array[]::uuid[])
  into normalized_class_ids
  from unnest(coalesce(target_recipient_class_ids, array[]::uuid[])) as requested(class_id);

  if target_date_of_passing is not null and cardinality(normalized_class_ids) = 0 then
    raise exception 'At least one memorial recipient class is required';
  end if;
  if exists (
    select 1 from unnest(normalized_class_ids) as requested(class_id)
    left join public.classes as class_data on class_data.id = requested.class_id
    where class_data.id is null
  ) then
    raise exception 'One or more memorial recipient classes do not exist';
  end if;

  insert into public.member_memorial_settings as existing_settings (
    user_id, remembrance_enabled, heavenly_birthday_enabled,
    remembrance_message, heavenly_birthday_message, prior_account_status,
    created_by, updated_by
  ) values (
    target_user_id,
    coalesce(target_remembrance_enabled, false),
    coalesce(target_heavenly_birthday_enabled, false),
    nullif(btrim(target_remembrance_message), ''),
    nullif(btrim(target_heavenly_birthday_message), ''),
    member_row.account_status,
    auth.uid(), auth.uid()
  )
  on conflict (user_id) do update set
    remembrance_enabled = excluded.remembrance_enabled,
    heavenly_birthday_enabled = excluded.heavenly_birthday_enabled,
    remembrance_message = excluded.remembrance_message,
    heavenly_birthday_message = excluded.heavenly_birthday_message,
    prior_account_status = case
      when previous_date is null then member_row.account_status
      else existing_settings.prior_account_status
    end,
    updated_by = auth.uid(),
    updated_at = now();

  delete from public.member_memorial_recipient_classes
  where user_id = target_user_id;
  insert into public.member_memorial_recipient_classes(user_id, class_id)
  select target_user_id, requested.class_id
  from unnest(normalized_class_ids) as requested(class_id);

  if target_date_of_passing is null then
    update public.profiles as profile
    set date_of_passing = null,
        account_status = settings.prior_account_status,
        updated_at = now()
    from public.member_memorial_settings as settings
    where profile.id = target_user_id
      and settings.user_id = profile.id;
    action_name := 'reversed_deceased';
  else
    update public.profiles
    set date_of_passing = target_date_of_passing,
        account_status = 'disabled'::public.account_status,
        updated_at = now()
    where id = target_user_id;
    action_name := case when previous_date is null then 'marked_deceased' else 'settings_updated' end;
  end if;

  insert into public.member_memorial_audit(user_id, action, actor_user_id, details)
  values (
    target_user_id,
    action_name,
    auth.uid(),
    jsonb_build_object(
      'previous_date_of_passing', previous_date,
      'date_of_passing', target_date_of_passing,
      'recipient_class_ids', to_jsonb(normalized_class_ids),
      'remembrance_enabled', coalesce(target_remembrance_enabled, false),
      'heavenly_birthday_enabled', coalesce(target_heavenly_birthday_enabled, false)
    )
  );

  return public.get_member_memorial_settings(target_user_id);
end;
$$;

create or replace function public.publish_memorial_announcement(
  target_user_id uuid,
  target_memorial_type text,
  target_occurrence_date date,
  target_title text,
  target_message text,
  target_actor_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  announcement_id uuid;
  legacy_class_id uuid;
begin
  select case when count(*) = 1 then min(class_id) else null end
  into legacy_class_id
  from public.member_memorial_recipient_classes
  where user_id = target_user_id;

  if not exists (
    select 1 from public.member_memorial_recipient_classes
    where user_id = target_user_id
  ) then
    raise exception 'At least one memorial recipient class is required';
  end if;

  insert into public.announcements(
    title, message, class_id, created_by, published,
    announcement_type, subject_user_id
  ) values (
    target_title, target_message, legacy_class_id, target_actor_user_id, false,
    'memorial_' || target_memorial_type, target_user_id
  ) returning id into announcement_id;

  insert into public.announcement_recipient_classes(announcement_id, class_id)
  select announcement_id, recipient.class_id
  from public.member_memorial_recipient_classes as recipient
  where recipient.user_id = target_user_id;

  update public.announcements set published = true where id = announcement_id;

  insert into public.member_memorial_publications(
    user_id, memorial_type, occurrence_date, announcement_id
  ) values (
    target_user_id, target_memorial_type, target_occurrence_date, announcement_id
  );

  return announcement_id;
end;
$$;

create or replace function public.publish_initial_memorial(
  target_user_id uuid,
  target_title text,
  target_message text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  member_row record;
  existing_announcement_id uuid;
  new_announcement_id uuid;
begin
  if not public.is_super_admin(auth.uid()) then
    raise exception using errcode = '42501', message = 'Super Admin access required';
  end if;
  if nullif(btrim(target_title), '') is null or length(target_title) > 200 then
    raise exception 'A memorial title between 1 and 200 characters is required';
  end if;
  if nullif(btrim(target_message), '') is null or length(target_message) > 10000 then
    raise exception 'A memorial message between 1 and 10000 characters is required';
  end if;

  perform pg_advisory_xact_lock(hashtext('initial-memorial:' || target_user_id::text));
  select profile.id, profile.date_of_passing
  into member_row
  from public.profiles as profile
  where profile.id = target_user_id
  for update;
  if not found then raise exception 'Member not found'; end if;
  if member_row.date_of_passing is null then raise exception 'Member is not marked deceased'; end if;

  select publication.announcement_id into existing_announcement_id
  from public.member_memorial_publications as publication
  where publication.user_id = target_user_id
    and publication.memorial_type = 'initial';

  if existing_announcement_id is not null then
    return jsonb_build_object(
      'created', false,
      'announcement_id', existing_announcement_id,
      'memorial_type', 'initial',
      'occurrence_date', member_row.date_of_passing
    );
  end if;

  new_announcement_id := public.publish_memorial_announcement(
    target_user_id, 'initial', member_row.date_of_passing,
    btrim(target_title), btrim(target_message), auth.uid()
  );
  insert into public.member_memorial_audit(user_id, action, actor_user_id, details)
  values (
    target_user_id, 'initial_memorial_published', auth.uid(),
    jsonb_build_object('announcement_id', new_announcement_id)
  );

  return jsonb_build_object(
    'created', true,
    'announcement_id', new_announcement_id,
    'memorial_type', 'initial',
    'occurrence_date', member_row.date_of_passing
  );
end;
$$;

create or replace function public.process_memorial_anniversaries(
  target_date date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  business_date date := coalesce(target_date, (timezone('Asia/Jakarta', now()))::date);
  candidate record;
  announcement_id uuid;
  created_items jsonb := '[]'::jsonb;
  created_count integer := 0;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'Service role access required';
  end if;

  perform pg_advisory_xact_lock(hashtext('memorial-anniversaries:' || business_date::text));

  for candidate in
    select profile.id as user_id, profile.full_name,
           settings.updated_by as actor_user_id,
           'remembrance'::text as memorial_type,
           'Remembrance Day — ' || profile.full_name as title,
           coalesce(settings.remembrance_message, 'Today we remember ' || profile.full_name || '.') as message
    from public.profiles as profile
    join public.member_memorial_settings as settings on settings.user_id = profile.id
    where profile.date_of_passing is not null
      and profile.account_status = 'disabled'
      and settings.remembrance_enabled
      and business_date > profile.date_of_passing
      and public.memorial_anniversary_matches(profile.date_of_passing, business_date)
    union all
    select profile.id, profile.full_name, settings.updated_by,
           'heavenly_birthday'::text,
           'Heavenly Birthday — ' || profile.full_name,
           coalesce(settings.heavenly_birthday_message, 'Today we remember the birthday of ' || profile.full_name || '.')
    from public.profiles as profile
    join public.member_memorial_settings as settings on settings.user_id = profile.id
    where profile.date_of_passing is not null
      and profile.account_status = 'disabled'
      and settings.heavenly_birthday_enabled
      and business_date > profile.date_of_passing
      and public.memorial_anniversary_matches(profile.date_of_birth, business_date)
  loop
    if not exists (
      select 1 from public.member_memorial_publications as publication
      where publication.user_id = candidate.user_id
        and publication.memorial_type = candidate.memorial_type
        and publication.occurrence_date = business_date
    ) then
      announcement_id := public.publish_memorial_announcement(
        candidate.user_id, candidate.memorial_type, business_date,
        candidate.title, candidate.message, candidate.actor_user_id
      );
      insert into public.member_memorial_audit(user_id, action, actor_user_id, details)
      values (
        candidate.user_id, 'annual_memorial_published', null,
        jsonb_build_object(
          'announcement_id', announcement_id,
          'memorial_type', candidate.memorial_type,
          'occurrence_date', business_date
        )
      );
      created_items := created_items || jsonb_build_array(jsonb_build_object(
        'user_id', candidate.user_id,
        'announcement_id', announcement_id,
        'memorial_type', candidate.memorial_type
      ));
      created_count := created_count + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'target_date', business_date,
    'created_count', created_count,
    'created', created_items
  );
end;
$$;

revoke execute on function public.memorial_anniversary_matches(date,date)
from public, anon, authenticated;
revoke execute on function public.get_member_memorial_settings(uuid)
from public, anon;
revoke execute on function public.set_member_deceased(uuid,date,uuid[],boolean,boolean,text,text)
from public, anon;
revoke execute on function public.publish_initial_memorial(uuid,text,text)
from public, anon;
revoke execute on function public.publish_memorial_announcement(uuid,text,date,text,text,uuid)
from public, anon, authenticated;
revoke execute on function public.process_memorial_anniversaries(date)
from public, anon, authenticated;

grant execute on function public.get_member_memorial_settings(uuid) to authenticated, service_role;
grant execute on function public.set_member_deceased(uuid,date,uuid[],boolean,boolean,text,text) to authenticated, service_role;
grant execute on function public.publish_initial_memorial(uuid,text,text) to authenticated, service_role;
grant execute on function public.publish_memorial_announcement(uuid,text,date,text,text,uuid) to service_role;
grant execute on function public.process_memorial_anniversaries(date) to service_role;

do $postflight$
begin
  if to_regprocedure('public.get_member_memorial_settings(uuid)') is null
     or to_regprocedure('public.set_member_deceased(uuid,date,uuid[],boolean,boolean,text,text)') is null
     or to_regprocedure('public.publish_initial_memorial(uuid,text,text)') is null
     or to_regprocedure('public.process_memorial_anniversaries(date)') is null then
    raise exception 'Memorial RPC postflight failed';
  end if;

  if not exists (
    select 1
    from pg_roles as role_data
    cross join lateral unnest(coalesce(role_data.rolconfig, array[]::text[])) as configured(setting)
    where role_data.rolname = 'authenticator'
      and setting = 'pgrst.db_pre_request=public.enforce_active_account_request'
  ) then
    raise exception 'PostgREST active-account pre-request hook was not configured';
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.events'::regclass
      and tgname = 'trigger_queue_event_notifications'
      and not tgisinternal
  ) then
    raise exception 'Existing event email trigger was not preserved';
  end if;

  if has_function_privilege('authenticated', 'public.process_memorial_anniversaries(date)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.publish_memorial_announcement(uuid,text,date,text,text,uuid)', 'EXECUTE')
     or has_function_privilege('anon', 'public.is_active_app_user(uuid)', 'EXECUTE')
     or has_function_privilege('anon', 'public.can_view_announcement(uuid,uuid)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.is_active_app_user(uuid)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.can_view_announcement(uuid,uuid)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.process_memorial_anniversaries(date)', 'EXECUTE') then
    raise exception 'Memorial internal-function ACL postflight failed';
  end if;

  if not exists (
    select 1 from pg_class as relation
    join pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname in (
        'member_memorial_settings',
        'member_memorial_recipient_classes',
        'member_memorial_audit',
        'member_memorial_publications',
        'announcement_recipient_classes'
      )
      and relation.relrowsecurity
    group by namespace.nspname
    having count(*) = 5
  ) then
    raise exception 'Memorial table RLS postflight failed';
  end if;
end
$postflight$;

comment on column public.profiles.date_of_passing is
  'Authoritative deceased indicator. A value preserves the member history while disabling online access.';
comment on function public.process_memorial_anniversaries(date) is
  'Service-only idempotent publisher using Asia/Jakarta when target_date is null; observes 29-Feb anniversaries on 28-Feb in non-leap years.';
comment on function public.set_member_deceased(uuid,date,uuid[],boolean,boolean,text,text) is
  'Super-Admin deceased lifecycle update. A null Date of Passing reverses the deceased state without altering memberships or history.';

notify pgrst, 'reload schema';
notify pgrst, 'reload config';

commit;
