-- ============================================================
-- 037 ALIGN BREAK STATES AND DOJO-TRANSFER BOUNDARIES
-- ============================================================
-- Preserve the legacy `break` state while treating the current `break_1` and
-- `break_2` states as the same eligible membership class. Route dojo-scoped
-- notifications through the assignment model used by can_manage_dojo, and
-- remove the direct INSERT path that bypassed request_dojo_transfer validation.
-- ============================================================

begin;

do $preflight$
declare
  required_signature text;
begin
  foreach required_signature in array array[
    'public.can_manage_class(uuid,uuid)',
    'public.assign_dojo_admin(uuid,uuid)',
    'public.get_available_dojo_admin_assignments(uuid)',
    'public.request_dojo_transfer(uuid,text)',
    'public.request_class_access(uuid,uuid)',
    'public.record_membership_break(uuid)',
    'public.notify_dojo_admins(uuid,text,text,jsonb)',
    'public.on_new_class_request()',
    'public.on_new_dojo_transfer()',
    'public.validate_dojo_admin_assignment()'
  ] loop
    if pg_catalog.to_regprocedure(required_signature) is null then
      raise exception 'Required routine is missing: %', required_signature;
    end if;
  end loop;

  if pg_catalog.to_regclass('public.dojo_transfer_requests') is null
     or pg_catalog.to_regclass('public.dojo_admin_assignments') is null
  then
    raise exception 'Required dojo-transfer relations are missing';
  end if;
end
$preflight$;


create or replace function public.can_manage_class(
  target_class uuid,
  uid uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path to public, pg_temp
as $function$
  select
    uid is not null
    and (
      uid = auth.uid()
      or coalesce(auth.role(), '') = 'service_role'
    )
    and (
      public.is_super_admin(uid)
      or exists (
        select 1
        from public.class_memberships as membership
        where membership.user_id = uid
          and membership.class_id = target_class
          and membership.role = 'admin'
          and membership.status in (
            'active'::public.membership_status,
            'break'::public.membership_status,
            'break_1'::public.membership_status,
            'break_2'::public.membership_status
          )
      )
    );
$function$;


create or replace function public.assign_dojo_admin(
  target_user_id uuid,
  target_dojo_id uuid
)
returns void
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  target_class_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_super_admin() then
    raise exception 'Only Super Admin can assign dojo administrators';
  end if;

  select dojo.class_id
  into target_class_id
  from public.dojos as dojo
  where dojo.id = target_dojo_id
    and dojo.active = true;

  if target_class_id is null then
    raise exception 'Active dojo not found';
  end if;

  if not exists (
    select 1
    from public.class_memberships as membership
    where membership.user_id = target_user_id
      and membership.class_id = target_class_id
      and membership.status in (
        'active'::public.membership_status,
        'break'::public.membership_status,
        'break_1'::public.membership_status,
        'break_2'::public.membership_status
      )
  ) then
    raise exception 'Member must have a membership in this class';
  end if;

  insert into public.dojo_admin_assignments (
    user_id,
    class_id,
    dojo_id,
    active,
    assigned_by,
    assigned_at,
    revoked_by,
    revoked_at
  )
  values (
    target_user_id,
    target_class_id,
    target_dojo_id,
    true,
    auth.uid(),
    now(),
    null,
    null
  )
  on conflict (user_id, dojo_id)
  do update set
    active = true,
    class_id = excluded.class_id,
    assigned_by = auth.uid(),
    assigned_at = now(),
    revoked_by = null,
    revoked_at = null;
end;
$function$;


create or replace function public.get_available_dojo_admin_assignments(
  target_user_id uuid
)
returns table(
  class_id uuid,
  class_name text,
  dojo_id uuid,
  dojo_name text,
  member_dojo_id uuid,
  is_member_dojo boolean,
  is_admin boolean
)
language plpgsql
stable
security definer
set search_path to public, pg_temp
as $function$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_super_admin() then
    raise exception 'Only Super Admin can manage Administrator assignments';
  end if;

  return query
  select
    class_record.id,
    class_record.name::text,
    dojo.id,
    dojo.name::text,
    membership.dojo_id,
    membership.dojo_id = dojo.id,
    exists (
      select 1
      from public.dojo_admin_assignments as assignment
      where assignment.user_id = target_user_id
        and assignment.dojo_id = dojo.id
        and assignment.active = true
    )
  from public.class_memberships as membership
  join public.classes as class_record
    on class_record.id = membership.class_id
  join public.dojos as dojo
    on dojo.class_id = membership.class_id
  where membership.user_id = target_user_id
    and membership.status in (
      'active'::public.membership_status,
      'break'::public.membership_status,
      'break_1'::public.membership_status,
      'break_2'::public.membership_status
    )
    and dojo.active = true
  order by class_record.name, dojo.name;
end;
$function$;


create or replace function public.request_dojo_transfer(
  target_dojo uuid,
  transfer_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  membership_record public.class_memberships%rowtype;
  aikido_id uuid;
  target_class uuid;
  request_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select class_record.id
  into aikido_id
  from public.classes as class_record
  where class_record.name = 'Aikido'
    and class_record.is_active = true;

  if aikido_id is null then
    raise exception 'Active Aikido class not found';
  end if;

  select membership.*
  into membership_record
  from public.class_memberships as membership
  where membership.user_id = auth.uid()
    and membership.class_id = aikido_id
    and membership.status in (
      'active'::public.membership_status,
      'break'::public.membership_status,
      'break_1'::public.membership_status,
      'break_2'::public.membership_status
    )
  for update;

  if not found then
    raise exception 'Active or Break Aikido membership required';
  end if;

  if membership_record.dojo_id is null then
    raise exception 'Current Aikido dojo is missing';
  end if;

  if membership_record.dojo_id = target_dojo then
    raise exception 'Target dojo is already your current dojo';
  end if;

  select dojo.class_id
  into target_class
  from public.dojos as dojo
  where dojo.id = target_dojo
    and dojo.active = true;

  if target_class is distinct from aikido_id then
    raise exception 'Target dojo must be an active Aikido dojo';
  end if;

  if exists (
    select 1
    from public.dojo_transfer_requests as transfer_request
    where transfer_request.user_id = auth.uid()
      and transfer_request.status = 'pending'
  ) then
    raise exception 'A dojo transfer request is already pending';
  end if;

  insert into public.dojo_transfer_requests (
    user_id,
    class_id,
    from_dojo_id,
    to_dojo_id,
    reason
  )
  values (
    auth.uid(),
    aikido_id,
    membership_record.dojo_id,
    target_dojo,
    nullif(trim(transfer_reason), '')
  )
  returning id into request_id;

  return request_id;
end;
$function$;


create or replace function public.request_class_access(
  target_class uuid,
  target_dojo uuid default null
)
returns uuid
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  request_id uuid;
  class_name text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if exists (
    select 1
    from public.class_memberships as membership
    where membership.user_id = auth.uid()
      and membership.class_id = target_class
      and membership.status in (
        'active'::public.membership_status,
        'break'::public.membership_status,
        'break_1'::public.membership_status,
        'break_2'::public.membership_status
      )
  ) then
    raise exception 'Already has class access';
  end if;

  select class_record.name
  into class_name
  from public.classes as class_record
  where class_record.id = target_class
    and class_record.is_active = true;

  if class_name is null then
    raise exception 'Class not found or inactive';
  end if;

  if class_name = 'Aikido' and target_dojo is null then
    raise exception 'Aikido dojo is required';
  end if;

  insert into public.class_requests (user_id, class_id, dojo_id)
  values (auth.uid(), target_class, target_dojo)
  returning id into request_id;

  return request_id;
end;
$function$;


create or replace function public.record_membership_break(
  membership_id uuid
)
returns void
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  membership_record public.class_memberships%rowtype;
  current_month date;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  current_month := date_trunc('month', current_date)::date;

  select membership.*
  into membership_record
  from public.class_memberships as membership
  where membership.id = membership_id
  for update;

  if not found then
    raise exception 'Membership not found';
  end if;

  if not (
    public.is_super_admin()
    or public.is_class_admin(
      membership_record.class_id,
      membership_record.dojo_id
    )
  ) then
    raise exception 'Not authorised';
  end if;

  if membership_record.status = 'inactive'::public.membership_status then
    raise exception 'Inactive membership must be reactivated before being placed on Break';
  end if;

  if membership_record.status in (
    'break'::public.membership_status,
    'break_1'::public.membership_status,
    'break_2'::public.membership_status
  ) then
    raise exception 'Membership is already on Break';
  end if;

  update public.class_memberships as membership
  set
    status = 'break_1'::public.membership_status,
    break_count = 1,
    break_last_processed_month = current_month
  where membership.id = membership_id;
end;
$function$;


create or replace function public.notify_dojo_admins(
  target_dojo_id uuid,
  target_event_type text,
  target_subject text,
  target_payload jsonb
)
returns void
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
begin
  insert into public.notification_outbox (
    user_id,
    recipient_email,
    event_type,
    subject,
    payload
  )
  select distinct
    assignment.user_id,
    profile.email,
    target_event_type,
    target_subject,
    coalesce(target_payload, '{}'::jsonb)
  from public.dojo_admin_assignments as assignment
  join public.profiles as profile
    on profile.id = assignment.user_id
  where assignment.dojo_id = target_dojo_id
    and assignment.active = true
    and profile.account_status = 'active'
    and profile.email is not null;
end;
$function$;


create or replace function public.on_new_class_request()
returns trigger
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  applicant public.profiles%rowtype;
  requested_class public.classes%rowtype;
  requested_dojo public.dojos%rowtype;
  administrator record;
begin
  select profile.*
  into applicant
  from public.profiles as profile
  where profile.id = new.user_id;

  select class_record.*
  into requested_class
  from public.classes as class_record
  where class_record.id = new.class_id;

  if new.dojo_id is not null then
    select dojo.*
    into requested_dojo
    from public.dojos as dojo
    where dojo.id = new.dojo_id;
  end if;

  insert into public.notification_outbox (
    user_id,
    recipient_email,
    event_type,
    subject,
    payload
  )
  values (
    new.user_id,
    applicant.email,
    'class_request_received',
    requested_class.name || ' registration received',
    jsonb_build_object(
      'class', requested_class.name,
      'dojo', requested_dojo.name,
      'request_id', new.id
    )
  );

  for administrator in
    select distinct recipient.id, recipient.email
    from public.class_memberships as membership
    join public.profiles as recipient
      on recipient.id = membership.user_id
    where membership.class_id = new.class_id
      and membership.role = 'admin'
      and membership.status in (
        'active'::public.membership_status,
        'break'::public.membership_status,
        'break_1'::public.membership_status,
        'break_2'::public.membership_status
      )
      and (
        requested_class.name <> 'Aikido'
        or membership.dojo_id = new.dojo_id
      )
      and recipient.account_status = 'active'
      and recipient.email is not null

    union

    select distinct recipient.id, recipient.email
    from public.dojo_admin_assignments as assignment
    join public.profiles as recipient
      on recipient.id = assignment.user_id
    where new.dojo_id is not null
      and assignment.dojo_id = new.dojo_id
      and assignment.active = true
      and recipient.account_status = 'active'
      and recipient.email is not null

    union

    select recipient.id, recipient.email
    from public.profiles as recipient
    where recipient.is_super_admin = true
      and recipient.account_status = 'active'
      and recipient.email is not null
  loop
    insert into public.notification_outbox (
      user_id,
      recipient_email,
      event_type,
      subject,
      payload
    )
    values (
      administrator.id,
      administrator.email,
      'admin_new_class_request',
      'New ' || requested_class.name || ' registration pending',
      jsonb_build_object(
        'applicant', applicant.full_name,
        'registration_number', applicant.registration_number,
        'class', requested_class.name,
        'dojo', requested_dojo.name,
        'request_id', new.id
      )
    );
  end loop;

  return new;
end;
$function$;


create or replace function public.on_new_dojo_transfer()
returns trigger
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  applicant public.profiles%rowtype;
  destination text;
  administrator record;
begin
  select profile.*
  into applicant
  from public.profiles as profile
  where profile.id = new.user_id;

  select dojo.name
  into destination
  from public.dojos as dojo
  where dojo.id = new.to_dojo_id;

  for administrator in
    select distinct recipient.id, recipient.email
    from public.dojo_admin_assignments as assignment
    join public.profiles as recipient
      on recipient.id = assignment.user_id
    where assignment.dojo_id = new.to_dojo_id
      and assignment.active = true
      and recipient.account_status = 'active'
      and recipient.email is not null

    union

    select recipient.id, recipient.email
    from public.profiles as recipient
    where recipient.is_super_admin = true
      and recipient.account_status = 'active'
      and recipient.email is not null
  loop
    insert into public.notification_outbox (
      user_id,
      recipient_email,
      event_type,
      subject,
      payload
    )
    values (
      administrator.id,
      administrator.email,
      'admin_new_dojo_transfer',
      'New Aikido dojo transfer request',
      jsonb_build_object(
        'applicant', applicant.full_name,
        'member_id', applicant.registration_number,
        'destination_dojo', destination,
        'request_id', new.id
      )
    );
  end loop;

  return new;
end;
$function$;


create or replace function public.validate_dojo_admin_assignment()
returns trigger
language plpgsql
set search_path to public, pg_temp
as $function$
declare
  actual_class_id uuid;
begin
  select dojo.class_id
  into actual_class_id
  from public.dojos as dojo
  where dojo.id = new.dojo_id;

  if actual_class_id is null then
    raise exception 'Dojo not found';
  end if;

  if actual_class_id <> new.class_id then
    raise exception 'The selected dojo does not belong to the selected class';
  end if;

  if not exists (
    select 1
    from public.class_memberships as membership
    where membership.user_id = new.user_id
      and membership.class_id = new.class_id
      and membership.status in (
        'active'::public.membership_status,
        'break'::public.membership_status,
        'break_1'::public.membership_status,
        'break_2'::public.membership_status
      )
  ) then
    raise exception 'The Member must have a membership in this class before becoming an Admin';
  end if;

  return new;
end;
$function$;


-- The application uses request_dojo_transfer for validated writes and reads the
-- table directly under RLS. Keep SELECT, remove the bypassing INSERT capability.
revoke insert on table public.dojo_transfer_requests from anon, authenticated;
drop policy if exists "member can create own dojo transfer request"
  on public.dojo_transfer_requests;


revoke execute on function public.can_manage_class(uuid, uuid)
  from public, anon;
grant execute on function public.can_manage_class(uuid, uuid)
  to authenticated, service_role;

revoke execute on function public.assign_dojo_admin(uuid, uuid)
  from public, anon;
revoke execute on function public.get_available_dojo_admin_assignments(uuid)
  from public, anon;
revoke execute on function public.request_dojo_transfer(uuid, text)
  from public, anon;
revoke execute on function public.record_membership_break(uuid)
  from public, anon;
grant execute on function public.assign_dojo_admin(uuid, uuid)
  to authenticated, service_role;
grant execute on function public.get_available_dojo_admin_assignments(uuid)
  to authenticated, service_role;
grant execute on function public.request_dojo_transfer(uuid, text)
  to authenticated, service_role;
grant execute on function public.record_membership_break(uuid)
  to authenticated, service_role;

revoke execute on function public.request_class_access(uuid, uuid)
  from public, anon, authenticated;
revoke execute on function public.notify_dojo_admins(uuid, text, text, jsonb)
  from public, anon, authenticated;
revoke execute on function public.on_new_class_request()
  from public, anon, authenticated;
revoke execute on function public.on_new_dojo_transfer()
  from public, anon, authenticated;
revoke execute on function public.validate_dojo_admin_assignment()
  from public, anon, authenticated;
grant execute on function public.request_class_access(uuid, uuid)
  to service_role;
grant execute on function public.notify_dojo_admins(uuid, text, text, jsonb)
  to service_role;
grant execute on function public.on_new_class_request()
  to service_role;
grant execute on function public.on_new_dojo_transfer()
  to service_role;
grant execute on function public.validate_dojo_admin_assignment()
  to service_role;


do $postflight$
declare
  status_routine regprocedure;
begin
  foreach status_routine in array array[
    'public.can_manage_class(uuid,uuid)'::regprocedure,
    'public.assign_dojo_admin(uuid,uuid)'::regprocedure,
    'public.get_available_dojo_admin_assignments(uuid)'::regprocedure,
    'public.request_dojo_transfer(uuid,text)'::regprocedure,
    'public.request_class_access(uuid,uuid)'::regprocedure,
    'public.record_membership_break(uuid)'::regprocedure,
    'public.on_new_class_request()'::regprocedure,
    'public.validate_dojo_admin_assignment()'::regprocedure
  ] loop
    if pg_catalog.pg_get_functiondef(status_routine) not ilike '%break_1%'
       or pg_catalog.pg_get_functiondef(status_routine) not ilike '%break_2%'
    then
      raise exception 'Current Break states are missing from %', status_routine;
    end if;
  end loop;

  if pg_catalog.pg_get_functiondef(
       'public.on_new_dojo_transfer()'::regprocedure
     ) not ilike '%dojo_admin_assignments%'
     or pg_catalog.pg_get_functiondef(
       'public.notify_dojo_admins(uuid,text,text,jsonb)'::regprocedure
     ) not ilike '%dojo_admin_assignments%'
  then
    raise exception 'Dojo notification routing is not assignment-scoped';
  end if;

  if pg_catalog.has_table_privilege(
       'authenticated',
       'public.dojo_transfer_requests',
       'INSERT'
     )
     or exists (
       select 1
       from pg_catalog.pg_policies
       where schemaname = 'public'
         and tablename = 'dojo_transfer_requests'
         and policyname = 'member can create own dojo transfer request'
     )
  then
    raise exception 'Direct browser dojo-transfer INSERT remains enabled';
  end if;

  if not pg_catalog.has_table_privilege(
       'authenticated',
       'public.dojo_transfer_requests',
       'SELECT'
     )
  then
    raise exception 'Authenticated dojo-transfer history SELECT was removed';
  end if;

  if pg_catalog.has_function_privilege(
       'authenticated',
       'public.on_new_dojo_transfer()',
       'EXECUTE'
     )
     or pg_catalog.has_function_privilege(
       'authenticated',
       'public.notify_dojo_admins(uuid,text,text,jsonb)',
       'EXECUTE'
     )
     or not pg_catalog.has_function_privilege(
       'authenticated',
       'public.request_dojo_transfer(uuid,text)',
       'EXECUTE'
     )
     or not pg_catalog.has_function_privilege(
       'authenticated',
       'public.record_membership_break(uuid)',
       'EXECUTE'
     )
  then
    raise exception 'Dojo-transfer routine ACL boundary mismatch';
  end if;
end
$postflight$;

commit;
