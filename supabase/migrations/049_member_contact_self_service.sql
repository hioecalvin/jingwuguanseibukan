-- ============================================================
-- 049 MEMBER CONTACT SELF-SERVICE
-- ============================================================
-- Members may maintain their own phone and optional Instagram username.
-- Email replacement remains owned by Supabase Auth: the profile email is
-- synchronized only after Auth has accepted the verified replacement.
-- Every completed contact change is retained in a private append-only audit.
-- ============================================================

begin;

do $preflight$
begin
  if pg_catalog.to_regclass('public.profiles') is null
     or pg_catalog.to_regclass('auth.users') is null
     or pg_catalog.to_regprocedure('public.is_active_app_user(uuid)') is null
  then
    raise exception 'Required member contact objects are missing';
  end if;
end
$preflight$;

alter table public.profiles
  add column instagram_username text;

alter table public.profiles
  add constraint profiles_instagram_username_check
  check (
    instagram_username is null
    or (
      instagram_username = lower(instagram_username)
      and instagram_username ~ '^[a-z0-9_](?:[a-z0-9_.]{0,28}[a-z0-9_])?$'
      and instagram_username !~ '\.\.'
    )
  );

create table public.profile_contact_change_audit (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null
    references public.profiles(id) on delete restrict,
  field_name text not null
    check (field_name in ('email', 'phone', 'instagram_username')),
  previous_value text,
  new_value text,
  changed_by uuid not null
    references public.profiles(id) on delete restrict,
  change_source text not null
    check (change_source in ('member_self_service', 'auth_email_confirmation')),
  changed_at timestamptz not null default now(),
  constraint profile_contact_change_audit_changed_check
    check (previous_value is distinct from new_value)
);

create index profile_contact_change_audit_profile_idx
on public.profile_contact_change_audit (
  profile_id,
  changed_at desc,
  id desc
);

alter table public.profile_contact_change_audit enable row level security;
alter table public.profile_contact_change_audit force row level security;

revoke all privileges
on table public.profile_contact_change_audit
from public, anon, authenticated, service_role;

grant select
on table public.profile_contact_change_audit
to service_role;

create or replace function public.update_my_contact_details(
  new_phone text,
  new_instagram_username text
)
returns table (
  phone text,
  instagram_username text
)
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  caller_id uuid := auth.uid();
  profile_record public.profiles%rowtype;
  normalized_phone text;
  normalized_instagram text;
  phone_digits text;
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Not authenticated';
  end if;

  if not public.is_active_app_user(caller_id) then
    raise exception using errcode = '42501', message = 'Account access is disabled';
  end if;

  normalized_phone := regexp_replace(coalesce(btrim(new_phone), ''), '[[:space:]().-]+', '', 'g');

  if normalized_phone like '00%' then
    normalized_phone := '+' || substr(normalized_phone, 3);
  end if;

  phone_digits := regexp_replace(normalized_phone, '[^0-9]', '', 'g');

  if normalized_phone = ''
     or normalized_phone !~ '^\+?[0-9]+$'
     or length(phone_digits) < 7
     or length(phone_digits) > 15
  then
    raise exception using errcode = '22023', message = 'Enter a valid phone number containing 7 to 15 digits';
  end if;

  normalized_instagram := lower(
    regexp_replace(
      coalesce(btrim(new_instagram_username), ''),
      '^@+',
      ''
    )
  );
  normalized_instagram := nullif(normalized_instagram, '');

  if normalized_instagram is not null
     and (
       length(normalized_instagram) > 30
       or normalized_instagram !~ '^[a-z0-9_](?:[a-z0-9_.]{0,28}[a-z0-9_])?$'
       or normalized_instagram ~ '\.\.'
     )
  then
    raise exception using errcode = '22023', message = 'Enter a valid Instagram username';
  end if;

  select profile.*
  into profile_record
  from public.profiles as profile
  where profile.id = caller_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Profile not found';
  end if;

  if profile_record.phone is distinct from normalized_phone then
    insert into public.profile_contact_change_audit (
      profile_id,
      field_name,
      previous_value,
      new_value,
      changed_by,
      change_source
    ) values (
      caller_id,
      'phone',
      profile_record.phone,
      normalized_phone,
      caller_id,
      'member_self_service'
    );
  end if;

  if profile_record.instagram_username is distinct from normalized_instagram then
    insert into public.profile_contact_change_audit (
      profile_id,
      field_name,
      previous_value,
      new_value,
      changed_by,
      change_source
    ) values (
      caller_id,
      'instagram_username',
      profile_record.instagram_username,
      normalized_instagram,
      caller_id,
      'member_self_service'
    );
  end if;

  update public.profiles as profile
  set
    phone = normalized_phone,
    instagram_username = normalized_instagram
  where profile.id = caller_id
    and (
      profile.phone is distinct from normalized_phone
      or profile.instagram_username is distinct from normalized_instagram
    );

  return query
  select normalized_phone, normalized_instagram;
end;
$function$;

alter function public.update_my_contact_details(text, text)
  owner to postgres;

revoke all
on function public.update_my_contact_details(text, text)
from public, anon, authenticated, service_role;

grant execute
on function public.update_my_contact_details(text, text)
to authenticated, service_role;

create or replace function public.sync_profile_email_from_auth()
returns trigger
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  profile_record public.profiles%rowtype;
  normalized_email text := lower(btrim(new.email::text));
begin
  if normalized_email is null
     or normalized_email = ''
     or length(normalized_email) > 254
     or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  then
    raise exception using errcode = '22023', message = 'Auth supplied an invalid email address';
  end if;

  select profile.*
  into profile_record
  from public.profiles as profile
  where profile.id = new.id
  for update;

  -- Auth maintenance can legitimately update a user before the signup-profile
  -- trigger has created the application profile. There is nothing to sync yet.
  if not found then
    return new;
  end if;

  if profile_record.email is distinct from normalized_email then
    update public.profiles as profile
    set email = normalized_email
    where profile.id = new.id;

    insert into public.profile_contact_change_audit (
      profile_id,
      field_name,
      previous_value,
      new_value,
      changed_by,
      change_source
    ) values (
      new.id,
      'email',
      profile_record.email,
      normalized_email,
      new.id,
      'auth_email_confirmation'
    );
  end if;

  return new;
end;
$function$;

alter function public.sync_profile_email_from_auth()
  owner to postgres;

revoke all
on function public.sync_profile_email_from_auth()
from public, anon, authenticated, service_role;

grant execute
on function public.sync_profile_email_from_auth()
to service_role;

create trigger jwg_profile_email_on_auth_email_changed
after update of email on auth.users
for each row
when (old.email is distinct from new.email)
execute function public.sync_profile_email_from_auth();

comment on column public.profiles.instagram_username is
  'Optional normalized Instagram username stored without a leading @.';

comment on table public.profile_contact_change_audit is
  'Private append-only history of completed member email, phone and Instagram changes.';

comment on function public.update_my_contact_details(text, text) is
  'Active member self-service boundary for validated phone and optional Instagram changes.';

comment on function public.sync_profile_email_from_auth() is
  'Synchronizes a completed Supabase Auth email replacement into the application profile and audit.';

do $postflight$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'instagram_username'
  )
     or pg_catalog.to_regclass('public.profile_contact_change_audit') is null
     or pg_catalog.to_regprocedure('public.update_my_contact_details(text,text)') is null
     or pg_catalog.to_regprocedure('public.sync_profile_email_from_auth()') is null
  then
    raise exception 'Member contact self-service objects are incomplete';
  end if;

  if (
    select count(*)
    from pg_catalog.pg_trigger as trigger_record
    where trigger_record.tgrelid = 'auth.users'::regclass
      and not trigger_record.tgisinternal
      and trigger_record.tgenabled <> 'D'
      and trigger_record.tgfoid = 'public.sync_profile_email_from_auth()'::regprocedure
  ) <> 1 then
    raise exception 'Exactly one enabled Auth email synchronization trigger is required';
  end if;

  if has_table_privilege('anon', 'public.profile_contact_change_audit', 'SELECT')
     or has_table_privilege('authenticated', 'public.profile_contact_change_audit', 'SELECT')
     or has_table_privilege('authenticated', 'public.profile_contact_change_audit', 'INSERT')
     or has_table_privilege('authenticated', 'public.profile_contact_change_audit', 'UPDATE')
     or has_table_privilege('authenticated', 'public.profile_contact_change_audit', 'DELETE')
     or has_table_privilege('service_role', 'public.profile_contact_change_audit', 'INSERT')
     or has_table_privilege('service_role', 'public.profile_contact_change_audit', 'UPDATE')
     or has_table_privilege('service_role', 'public.profile_contact_change_audit', 'DELETE')
  then
    raise exception 'Contact audit table has unsafe privileges';
  end if;

  if has_function_privilege('anon', 'public.update_my_contact_details(text,text)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.update_my_contact_details(text,text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.sync_profile_email_from_auth()', 'EXECUTE')
  then
    raise exception 'Member contact function privileges are unsafe';
  end if;
end
$postflight$;

notify pgrst, 'reload schema';

commit;
