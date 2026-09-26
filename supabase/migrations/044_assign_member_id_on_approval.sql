-- Keep the optional applicant-supplied Aikikai Registration Number separate from the
-- permanent JS Member ID. Assign the JS Member ID only when a Super Admin
-- approves the initial membership application. Existing JS IDs are preserved.
-- The sequence is seeded
-- above every existing numeric ID and never rewinds, so deleted or corrected
-- records cannot cause an old generated number to be reused.

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
     or pg_catalog.to_regclass('public.admin_visible_requests') is null
     or pg_catalog.to_regclass('auth.users') is null
     or pg_catalog.to_regprocedure('public.handle_new_user()') is null
     or pg_catalog.to_regprocedure(
       'public.review_class_request_with_level(uuid,public.request_status,text,public.membership_level)'
     ) is null
     or pg_catalog.to_regprocedure(
       'public.review_class_request(uuid,public.request_status,text)'
     ) is null
     or pg_catalog.to_regprocedure('public.is_super_admin(uuid)') is null
  then
    raise exception 'Required automatic JS Member ID objects are missing';
  end if;

  -- is_super_admin() is the default-argument call to the uuid signature, not
  -- a separate zero-argument overload. Preserve that existing contract.
  if not exists (
    select 1
    from pg_catalog.pg_proc
    where oid = 'public.is_super_admin(uuid)'::regprocedure
      and pronargdefaults = 1
  ) then
    raise exception 'is_super_admin(uuid) must retain its zero-argument default';
  end if;

  if pg_catalog.to_regclass('public.js_member_id_seq') is not null then
    raise exception 'JS Member ID sequence already exists';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'registration_number'
      and data_type = 'text'
  ) then
    raise exception 'profiles.registration_number text column is unavailable';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'aikikai_registration_number'
      and data_type = 'text'
  ) then
    raise exception 'profiles.aikikai_registration_number text column is unavailable';
  end if;
end
$preflight$;

do $signup_definition_guard$
declare
  signup_definition text;
begin
  select pg_catalog.pg_get_functiondef(
    'public.handle_new_user()'::regprocedure
  ) into signup_definition;

  if signup_definition not ilike '%insert into public.profiles%'
     or signup_definition !~* 'id\s*,\s*full_name\s*,\s*email\s*,\s*phone\s*,\s*date_of_birth\s*,\s*email_verified'
     or signup_definition !~* 'new\.raw_user_meta_data\s*->>\s*''full_name'''
     or signup_definition ilike '%aikikai_registration_number%'
  then
    raise exception 'Unexpected handle_new_user() definition; review before replacing it';
  end if;
end
$signup_definition_guard$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  normalized_aikikai_registration_number text;
begin
  normalized_aikikai_registration_number := nullif(
    pg_catalog.regexp_replace(
      pg_catalog.btrim(
        coalesce(new.raw_user_meta_data ->> 'aikikai_registration_number', '')
      ),
      '\s+',
      ' ',
      'g'
    ),
    ''
  );

  if pg_catalog.length(normalized_aikikai_registration_number) > 100 then
    raise exception 'Aikikai Registration Number is too long';
  end if;

  insert into public.profiles (
    id,
    full_name,
    email,
    phone,
    date_of_birth,
    email_verified,
    aikikai_registration_number
  ) values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.email,
    new.raw_user_meta_data ->> 'phone',
    (new.raw_user_meta_data ->> 'date_of_birth')::date,
    (new.email_confirmed_at is not null),
    normalized_aikikai_registration_number
  );

  return new;
end
$function$;

alter function public.handle_new_user() owner to postgres;
revoke all on function public.handle_new_user()
  from public, anon, authenticated;
grant execute on function public.handle_new_user()
  to service_role;

comment on function public.handle_new_user() is
  'Creates a pending profile from Auth metadata, retaining an optional applicant Aikikai number while leaving the JS Member ID unassigned.';

create or replace view public.admin_visible_requests
with (security_invoker = true)
as
select
  request_record.id as request_id,
  profile_record.id as user_id,
  profile_record.registration_number as member_id,
  profile_record.full_name,
  profile_record.email,
  profile_record.phone,
  profile_record.date_of_birth,
  class_record.id as class_id,
  class_record.name as class_name,
  dojo_record.id as dojo_id,
  dojo_record.name as dojo_name,
  request_record.status,
  request_record.rejection_reason,
  request_record.created_at,
  profile_record.aikikai_registration_number
from public.class_requests as request_record
join public.profiles as profile_record
  on profile_record.id = request_record.user_id
join public.classes as class_record
  on class_record.id = request_record.class_id
left join public.dojos as dojo_record
  on dojo_record.id = request_record.dojo_id;

alter view public.admin_visible_requests owner to postgres;
revoke all on public.admin_visible_requests from public, anon;
grant select on public.admin_visible_requests to authenticated, service_role;

create sequence public.js_member_id_seq
  as bigint
  minvalue 1
  start with 1
  increment by 1
  no cycle;

alter sequence public.js_member_id_seq owner to postgres;
revoke all on sequence public.js_member_id_seq
  from public, anon, authenticated, service_role;

do $seed$
declare
  highest_numeric_js_member_id bigint;
begin
  select max(profile.registration_number::bigint)
  into highest_numeric_js_member_id
  from public.profiles as profile
  where profile.registration_number ~ '^[0-9]{1,18}$';

  if highest_numeric_js_member_id is null then
    perform pg_catalog.setval(
      'public.js_member_id_seq'::regclass,
      1,
      false
    );
  else
    perform pg_catalog.setval(
      'public.js_member_id_seq'::regclass,
      highest_numeric_js_member_id,
      true
    );
  end if;
end
$seed$;

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
  generated_member_id text := null;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_super_admin() then
    raise exception 'Super Admin only';
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

  select *
  into profile_record
  from public.profiles
  where id = request_record.user_id
  for update;

  if not found then
    raise exception 'Registration profile not found';
  end if;

  if decision = 'approved' then
    generated_member_id := nullif(btrim(profile_record.registration_number), '');

    if generated_member_id is null then
      loop
        generated_member_id := pg_catalog.nextval(
          'public.js_member_id_seq'::regclass
        )::text;

        if pg_catalog.length(generated_member_id) < 4 then
          generated_member_id := pg_catalog.lpad(
            generated_member_id,
            4,
            '0'
          );
        end if;

        exit when not exists (
          select 1
          from public.profiles as existing_profile
          where upper(regexp_replace(
            btrim(existing_profile.registration_number),
            '\s+',
            '',
            'g'
          )) = upper(generated_member_id)
        );
      end loop;

      update public.profiles
      set
        registration_number = generated_member_id,
        updated_at = clock_timestamp()
      where id = request_record.user_id;

      profile_record.registration_number := generated_member_id;
    end if;
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
      'reason', normalized_reason,
      'member_id', case
        when decision = 'approved' then profile_record.registration_number
        else null
      end
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
  'Super-Admin-only initial registration review that atomically assigns a permanent JS Member ID on approval.';

-- Preserve the legacy RPC signature for older clients, but route it through
-- the same Super-Admin-only transaction so it cannot bypass ID assignment.
create or replace function public.review_class_request(
  request_id uuid,
  decision public.request_status,
  reason text default null
)
returns void
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
begin
  perform public.review_class_request_with_level(
    request_id,
    decision,
    reason,
    'mudansha'
  );
end;
$function$;

alter function public.review_class_request(
  uuid,
  public.request_status,
  text
) owner to postgres;

revoke all on function public.review_class_request(
  uuid,
  public.request_status,
  text
) from public, anon;

grant execute on function public.review_class_request(
  uuid,
  public.request_status,
  text
) to authenticated, service_role;

do $postflight$
declare
  signup_definition text;
begin
  select pg_catalog.pg_get_functiondef(
    'public.handle_new_user()'::regprocedure
  ) into signup_definition;

  if signup_definition not ilike '%aikikai_registration_number%'
     or signup_definition ilike '%registration_number,%aikikai_registration_number%'
  then
    raise exception 'Signup identity separation postflight failed';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'admin_visible_requests'
      and column_name = 'aikikai_registration_number'
  ) then
    raise exception 'Aikikai application-review column postflight failed';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_class
    where oid = 'public.admin_visible_requests'::regclass
      and reloptions @> array['security_invoker=true']
  ) then
    raise exception 'Application-review view security postflight failed';
  end if;

  if pg_catalog.has_function_privilege(
       'anon',
       'public.handle_new_user()',
       'EXECUTE'
     )
     or pg_catalog.has_function_privilege(
       'authenticated',
       'public.handle_new_user()',
       'EXECUTE'
     )
     or pg_catalog.has_sequence_privilege(
       'authenticated',
       'public.js_member_id_seq',
       'USAGE'
     )
     or pg_catalog.has_sequence_privilege(
       'service_role',
       'public.js_member_id_seq',
       'USAGE'
     )
  then
    raise exception 'Signup or JS Member ID ACL postflight failed';
  end if;
end
$postflight$;

notify pgrst, 'reload schema';

commit;
