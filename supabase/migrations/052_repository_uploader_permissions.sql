-- ============================================================
-- 052 REPOSITORY UPLOADER PERMISSIONS
-- ============================================================
-- Repository publishing is a separate, class-scoped appointment. General
-- Dojo/Class administration does not imply uploader access. Super Admin keeps
-- global authority and is the only role that may appoint or revoke uploaders.
-- ============================================================

begin;

do $preflight$
begin
  if pg_catalog.to_regclass('public.profiles') is null
     or pg_catalog.to_regclass('public.classes') is null
     or pg_catalog.to_regclass('public.content') is null
     or pg_catalog.to_regprocedure('public.is_super_admin(uuid)') is null
     or pg_catalog.to_regprocedure('public.is_active_app_user(uuid)') is null
     or pg_catalog.to_regprocedure(
       'public.create_repository_content(uuid,uuid,uuid,text,text,text,text,text,integer)'
     ) is null
     or pg_catalog.to_regprocedure(
       'public.update_repository_content(uuid,text,text,text,text,text,integer)'
     ) is null
     or pg_catalog.to_regprocedure('public.delete_repository_content(uuid)') is null
  then
    raise exception 'Required repository uploader objects are missing';
  end if;
end
$preflight$;

create table public.repository_uploader_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete restrict,
  active boolean not null default true,
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  revoked_by uuid references public.profiles(id) on delete set null,
  revoked_at timestamptz,
  constraint repository_uploader_user_class_unique unique (user_id, class_id),
  constraint repository_uploader_revocation_state_consistent check (
    (active and revoked_at is null and revoked_by is null)
    or
    (not active and revoked_at is not null)
  )
);

create index repository_uploader_active_class_idx
on public.repository_uploader_assignments (class_id, user_id)
where active;

create table public.repository_uploader_assignment_audit (
  id bigint generated always as identity primary key,
  assignment_id uuid not null,
  user_id uuid not null,
  class_id uuid not null,
  action text not null check (action in ('appointed', 'revoked')),
  actor_id uuid,
  occurred_at timestamptz not null default now()
);

alter table public.repository_uploader_assignments enable row level security;
alter table public.repository_uploader_assignments force row level security;
alter table public.repository_uploader_assignment_audit enable row level security;
alter table public.repository_uploader_assignment_audit force row level security;

revoke all on table
  public.repository_uploader_assignments,
  public.repository_uploader_assignment_audit
from public, anon, authenticated;

revoke all on sequence public.repository_uploader_assignment_audit_id_seq
from public, anon, authenticated;

grant select, insert, update, delete
on table public.repository_uploader_assignments
to service_role;

grant select, insert
on table public.repository_uploader_assignment_audit
to service_role;

grant usage, select
on sequence public.repository_uploader_assignment_audit_id_seq
to service_role;

create or replace function public.is_repository_uploader(
  target_class_id uuid,
  caller_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path to public, pg_temp
as $function$
  select
    caller_id is not null
    and (
      caller_id = auth.uid()
      or coalesce(auth.role(), '') = 'service_role'
    )
    and public.is_active_app_user(caller_id)
    and (
      public.is_super_admin(caller_id)
      or exists (
        select 1
        from public.repository_uploader_assignments as assignment
        where assignment.user_id = caller_id
          and assignment.class_id = target_class_id
          and assignment.active = true
      )
    );
$function$;

create or replace function public.audit_repository_uploader_assignment()
returns trigger
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
begin
  if tg_op = 'INSERT' or (new.active and not old.active) then
    insert into public.repository_uploader_assignment_audit (
      assignment_id,
      user_id,
      class_id,
      action,
      actor_id
    ) values (
      new.id,
      new.user_id,
      new.class_id,
      'appointed',
      new.assigned_by
    );
  elsif old.active and not new.active then
    insert into public.repository_uploader_assignment_audit (
      assignment_id,
      user_id,
      class_id,
      action,
      actor_id
    ) values (
      new.id,
      new.user_id,
      new.class_id,
      'revoked',
      new.revoked_by
    );
  end if;

  return new;
end;
$function$;

create trigger audit_repository_uploader_assignment_trigger
after insert or update of active
on public.repository_uploader_assignments
for each row execute function public.audit_repository_uploader_assignment();

create or replace function public.assign_repository_uploader(
  target_user_id uuid,
  target_class_id uuid
)
returns void
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Not authenticated';
  end if;

  if not public.is_active_app_user(caller_id)
     or not public.is_super_admin(caller_id)
  then
    raise exception using
      errcode = '42501',
      message = 'Only Super Admin can appoint Repository Uploaders';
  end if;

  if not exists (
    select 1
    from public.profiles as profile
    where profile.id = target_user_id
      and profile.account_status::text = 'active'
      and profile.date_of_passing is null
  ) then
    raise exception 'Active member not found';
  end if;

  if not exists (
    select 1
    from public.classes as class_record
    where class_record.id = target_class_id
      and class_record.is_active = true
  ) then
    raise exception 'Active class not found';
  end if;

  insert into public.repository_uploader_assignments (
    user_id,
    class_id,
    active,
    assigned_by,
    assigned_at,
    revoked_by,
    revoked_at
  ) values (
    target_user_id,
    target_class_id,
    true,
    caller_id,
    now(),
    null,
    null
  )
  on conflict (user_id, class_id)
  do update set
    active = true,
    assigned_by = excluded.assigned_by,
    assigned_at = excluded.assigned_at,
    revoked_by = null,
    revoked_at = null;
end;
$function$;

create or replace function public.revoke_repository_uploader(
  target_user_id uuid,
  target_class_id uuid
)
returns void
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Not authenticated';
  end if;

  if not public.is_active_app_user(caller_id)
     or not public.is_super_admin(caller_id)
  then
    raise exception using
      errcode = '42501',
      message = 'Only Super Admin can revoke Repository Uploaders';
  end if;

  update public.repository_uploader_assignments
  set
    active = false,
    revoked_by = caller_id,
    revoked_at = now()
  where user_id = target_user_id
    and class_id = target_class_id
    and active = true;

  if not found then
    raise exception 'Active Repository Uploader appointment not found';
  end if;
end;
$function$;

create or replace function public.get_my_repository_upload_scopes()
returns table (
  class_id uuid,
  class_name text
)
language plpgsql
stable
security definer
set search_path to public, pg_temp
as $function$
declare
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Not authenticated';
  end if;

  if not public.is_active_app_user(caller_id) then
    raise exception using errcode = '42501', message = 'Account access is disabled';
  end if;

  return query
  select class_record.id, class_record.name::text
  from public.classes as class_record
  where public.is_repository_uploader(class_record.id, caller_id)
    and class_record.is_active = true
  order by class_record.name;
end;
$function$;

create or replace function public.get_repository_uploader_candidates()
returns table (
  user_id uuid,
  member_id text,
  full_name text
)
language plpgsql
stable
security definer
set search_path to public, pg_temp
as $function$
declare
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Not authenticated';
  end if;

  if not public.is_active_app_user(caller_id)
     or not public.is_super_admin(caller_id)
  then
    raise exception using
      errcode = '42501',
      message = 'Only Super Admin can manage Repository Uploaders';
  end if;

  return query
  select
    profile.id,
    profile.registration_number::text,
    profile.full_name::text
  from public.profiles as profile
  where profile.account_status::text = 'active'
    and profile.date_of_passing is null
  order by profile.full_name, profile.registration_number nulls last;
end;
$function$;

create or replace function public.get_repository_uploader_options(
  target_user_id uuid
)
returns table (
  class_id uuid,
  class_name text,
  is_uploader boolean
)
language plpgsql
stable
security definer
set search_path to public, pg_temp
as $function$
declare
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Not authenticated';
  end if;

  if not public.is_active_app_user(caller_id)
     or not public.is_super_admin(caller_id)
  then
    raise exception using
      errcode = '42501',
      message = 'Only Super Admin can manage Repository Uploaders';
  end if;

  if not exists (
    select 1 from public.profiles as profile where profile.id = target_user_id
  ) then
    raise exception 'Member not found';
  end if;

  return query
  select
    class_record.id,
    class_record.name::text,
    exists (
      select 1
      from public.repository_uploader_assignments as assignment
      where assignment.user_id = target_user_id
        and assignment.class_id = class_record.id
        and assignment.active = true
    )
  from public.classes as class_record
  where class_record.is_active = true
  order by class_record.name;
end;
$function$;

create or replace function public.create_repository_content(
  target_class uuid,
  target_rank uuid,
  target_sub_rank uuid,
  content_title text,
  content_description text,
  provider text,
  provider_video_id text,
  content_status text,
  content_sort_order integer
)
returns uuid
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  new_content_id uuid;
begin
  if not public.is_repository_uploader(target_class, auth.uid()) then
    raise exception using
      errcode = '42501',
      message = 'Not authorised to upload for this class';
  end if;

  if not exists (
    select 1 from public.ranks as rank_record
    where rank_record.id = target_rank
      and rank_record.class_id = target_class
  ) then
    raise exception 'Rank does not belong to selected class';
  end if;

  if not exists (
    select 1 from public.sub_ranks as tier
    where tier.id = target_sub_rank
      and tier.rank_id = target_rank
  ) then
    raise exception 'Tier does not belong to selected rank';
  end if;

  insert into public.content (
    class_id,
    rank_id,
    sub_rank_id,
    title,
    description,
    video_provider,
    video_id,
    status,
    sort_order,
    created_by
  ) values (
    target_class,
    target_rank,
    target_sub_rank,
    trim(content_title),
    nullif(trim(content_description), ''),
    nullif(trim(provider), ''),
    nullif(trim(provider_video_id), ''),
    content_status::public.content_status,
    content_sort_order,
    auth.uid()
  )
  returning id into new_content_id;

  return new_content_id;
end;
$function$;

create or replace function public.update_repository_content(
  target_content uuid,
  content_title text,
  content_description text,
  provider text,
  provider_video_id text,
  content_status text,
  content_sort_order integer
)
returns void
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  content_row public.content%rowtype;
begin
  select item.*
  into content_row
  from public.content as item
  where item.id = target_content
  for update;

  if not found then
    raise exception 'Content not found';
  end if;

  if not public.is_repository_uploader(content_row.class_id, auth.uid()) then
    raise exception using
      errcode = '42501',
      message = 'Not authorised to upload for this class';
  end if;

  update public.content
  set
    title = trim(content_title),
    description = nullif(trim(content_description), ''),
    video_provider = nullif(trim(provider), ''),
    video_id = nullif(trim(provider_video_id), ''),
    status = content_status::public.content_status,
    sort_order = content_sort_order,
    updated_at = now()
  where id = target_content;
end;
$function$;

create or replace function public.delete_repository_content(
  target_content uuid
)
returns void
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  target_class_id uuid;
begin
  select item.class_id
  into target_class_id
  from public.content as item
  where item.id = target_content
  for update;

  if not found then
    raise exception 'Content not found';
  end if;

  if not public.is_repository_uploader(target_class_id, auth.uid()) then
    raise exception using
      errcode = '42501',
      message = 'Not authorised to upload for this class';
  end if;

  delete from public.content where id = target_content;
end;
$function$;

drop policy if exists "repository managers read all content"
on public.content;

create policy "repository uploaders read all class content"
on public.content
for select
to authenticated
using (
  public.is_repository_uploader(class_id, auth.uid())
);

alter function public.is_repository_uploader(uuid, uuid) owner to postgres;
alter function public.audit_repository_uploader_assignment() owner to postgres;
alter function public.assign_repository_uploader(uuid, uuid) owner to postgres;
alter function public.revoke_repository_uploader(uuid, uuid) owner to postgres;
alter function public.get_my_repository_upload_scopes() owner to postgres;
alter function public.get_repository_uploader_candidates() owner to postgres;
alter function public.get_repository_uploader_options(uuid) owner to postgres;
alter function public.create_repository_content(uuid,uuid,uuid,text,text,text,text,text,integer) owner to postgres;
alter function public.update_repository_content(uuid,text,text,text,text,text,integer) owner to postgres;
alter function public.delete_repository_content(uuid) owner to postgres;

revoke all on function public.is_repository_uploader(uuid, uuid)
from public, anon, authenticated, service_role;
revoke all on function public.audit_repository_uploader_assignment()
from public, anon, authenticated, service_role;
revoke all on function public.assign_repository_uploader(uuid, uuid)
from public, anon, authenticated, service_role;
revoke all on function public.revoke_repository_uploader(uuid, uuid)
from public, anon, authenticated, service_role;
revoke all on function public.get_my_repository_upload_scopes()
from public, anon, authenticated, service_role;
revoke all on function public.get_repository_uploader_candidates()
from public, anon, authenticated, service_role;
revoke all on function public.get_repository_uploader_options(uuid)
from public, anon, authenticated, service_role;
revoke all on function public.create_repository_content(uuid,uuid,uuid,text,text,text,text,text,integer)
from public, anon, authenticated, service_role;
revoke all on function public.update_repository_content(uuid,text,text,text,text,text,integer)
from public, anon, authenticated, service_role;
revoke all on function public.delete_repository_content(uuid)
from public, anon, authenticated, service_role;

grant execute on function public.is_repository_uploader(uuid, uuid)
to authenticated, service_role;
grant execute on function public.assign_repository_uploader(uuid, uuid)
to authenticated, service_role;
grant execute on function public.revoke_repository_uploader(uuid, uuid)
to authenticated, service_role;
grant execute on function public.get_my_repository_upload_scopes()
to authenticated, service_role;
grant execute on function public.get_repository_uploader_candidates()
to authenticated, service_role;
grant execute on function public.get_repository_uploader_options(uuid)
to authenticated, service_role;
grant execute on function public.create_repository_content(uuid,uuid,uuid,text,text,text,text,text,integer)
to authenticated, service_role;
grant execute on function public.update_repository_content(uuid,text,text,text,text,text,integer)
to authenticated, service_role;
grant execute on function public.delete_repository_content(uuid)
to authenticated, service_role;
grant execute on function public.audit_repository_uploader_assignment()
to service_role;

do $postflight$
begin
  if has_table_privilege('authenticated', 'public.repository_uploader_assignments', 'SELECT')
     or has_table_privilege('authenticated', 'public.repository_uploader_assignments', 'INSERT')
     or has_table_privilege('authenticated', 'public.repository_uploader_assignments', 'UPDATE')
     or has_table_privilege('authenticated', 'public.repository_uploader_assignments', 'DELETE')
     or has_table_privilege('authenticated', 'public.repository_uploader_assignment_audit', 'SELECT')
  then
    raise exception 'Repository Uploader assignment tables have unsafe browser privileges';
  end if;

  if has_function_privilege('anon', 'public.is_repository_uploader(uuid,uuid)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.is_repository_uploader(uuid,uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.audit_repository_uploader_assignment()', 'EXECUTE')
  then
    raise exception 'Repository Uploader function privileges are unsafe';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'content'
      and policyname = 'repository uploaders read all class content'
      and cmd = 'SELECT'
      and qual ilike '%is_repository_uploader%'
  ) then
    raise exception 'Repository Uploader content policy is missing';
  end if;

  if has_table_privilege('authenticated', 'public.content', 'INSERT')
     or has_table_privilege('authenticated', 'public.content', 'UPDATE')
     or has_table_privilege('authenticated', 'public.content', 'DELETE')
  then
    raise exception 'Repository content browser writes were restored';
  end if;
end
$postflight$;

comment on table public.repository_uploader_assignments is
  'Class-scoped Repository Uploader appointments controlled only by Super Admin.';

comment on function public.is_repository_uploader(uuid, uuid) is
  'Caller-bound Repository Uploader authorization; active Super Admins have global authority.';

notify pgrst, 'reload schema';

commit;
