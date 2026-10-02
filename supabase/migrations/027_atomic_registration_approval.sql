-- Approve an initial class registration and assign its membership level in one
-- database transaction. The legacy three-argument RPC remains available for
-- older clients, while the application uses this explicit atomic entry point.

begin;

do $preflight$
begin
  if pg_catalog.to_regtype('public.request_status') is null
     or pg_catalog.to_regtype('public.membership_level') is null
     or pg_catalog.to_regclass('public.class_requests') is null
     or pg_catalog.to_regclass('public.class_memberships') is null
     or pg_catalog.to_regclass('public.profiles') is null
     or pg_catalog.to_regclass('public.classes') is null
     or pg_catalog.to_regclass('public.notification_outbox') is null
     or pg_catalog.to_regprocedure(
       'public.review_class_request(uuid,public.request_status,text)'
     ) is null
  then
    raise exception 'Required registration approval objects are missing';
  end if;
end
$preflight$;

create or replace function public.review_class_request_with_level(
  target_request_id uuid,
  decision public.request_status,
  reason text default null,
  selected_level public.membership_level default 'mudansha'
)
returns uuid
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  request_record public.class_requests%rowtype;
  profile_record public.profiles%rowtype;
  class_record public.classes%rowtype;
  membership_id uuid := null;
  normalized_reason text := nullif(btrim(reason), '');
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if decision not in ('approved', 'rejected') then
    raise exception 'Decision must be approved or rejected';
  end if;

  if decision = 'approved' and selected_level is null then
    raise exception 'Membership level is required for approval';
  end if;

  select *
  into request_record
  from public.class_requests
  where id = target_request_id
    and status = 'pending'
  for update;

  if not found then
    raise exception 'Pending request not found';
  end if;

  if not (
    public.is_super_admin()
    or public.is_class_admin(
      request_record.class_id,
      request_record.dojo_id
    )
  ) then
    raise exception 'Not authorised';
  end if;

  update public.class_requests
  set
    status = decision,
    reviewed_by = auth.uid(),
    reviewed_at = clock_timestamp(),
    rejection_reason = case
      when decision = 'rejected' then normalized_reason
      else null
    end
  where id = target_request_id;

  if decision = 'approved' then
    insert into public.class_memberships (
      user_id,
      class_id,
      dojo_id,
      status,
      level,
      role
    ) values (
      request_record.user_id,
      request_record.class_id,
      request_record.dojo_id,
      'active',
      selected_level,
      'user'
    )
    on conflict (user_id, class_id) do update
    set
      dojo_id = excluded.dojo_id,
      status = 'active',
      level = excluded.level,
      updated_at = clock_timestamp()
    returning id into membership_id;
  end if;

  select *
  into profile_record
  from public.profiles
  where id = request_record.user_id;

  if not found then
    raise exception 'Registration profile not found';
  end if;

  select *
  into class_record
  from public.classes
  where id = request_record.class_id;

  if not found then
    raise exception 'Registration class not found';
  end if;

  insert into public.notification_outbox (
    user_id,
    recipient_email,
    event_type,
    subject,
    payload
  ) values (
    request_record.user_id,
    profile_record.email,
    'class_request_' || decision::text,
    class_record.name || ' registration ' || decision::text,
    jsonb_build_object(
      'class', class_record.name,
      'status', decision,
      'reason', normalized_reason
    )
  );

  return membership_id;
end;
$function$;

alter function public.review_class_request_with_level(
  uuid,
  public.request_status,
  text,
  public.membership_level
) owner to postgres;

revoke all on function public.review_class_request_with_level(
  uuid,
  public.request_status,
  text,
  public.membership_level
) from public, anon;

grant execute on function public.review_class_request_with_level(
  uuid,
  public.request_status,
  text,
  public.membership_level
) to authenticated, service_role;

comment on function public.review_class_request_with_level(
  uuid,
  public.request_status,
  text,
  public.membership_level
) is
  'Atomically reviews an initial class request, assigns the approved membership level and queues the result notification.';

notify pgrst, 'reload schema';

commit;
