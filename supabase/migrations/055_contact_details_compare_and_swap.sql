-- ============================================================
-- 055 CONTACT DETAILS COMPARE-AND-SWAP
-- ============================================================
-- Prevent a stale browser form from overwriting a newer phone or Instagram
-- value. The legacy two-argument RPC remains available during rollout; the
-- web client uses this new, explicitly versioned boundary.
-- ============================================================

begin;

do $preflight$
begin
  if pg_catalog.to_regclass('public.profiles') is null
     or pg_catalog.to_regclass('public.profile_contact_change_audit') is null
     or pg_catalog.to_regprocedure('public.is_active_app_user(uuid)') is null
     or pg_catalog.to_regprocedure('public.update_my_contact_details(text,text)') is null
  then
    raise exception 'Required member contact objects are missing';
  end if;
end
$preflight$;

create or replace function public.update_my_contact_details_if_unchanged(
  expected_phone text,
  expected_instagram_username text,
  new_phone text,
  new_instagram_username text
)
returns table (
  phone text,
  instagram_username text,
  changed boolean
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
  values_changed boolean;
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Not authenticated';
  end if;

  if not public.is_active_app_user(caller_id) then
    raise exception using errcode = '42501', message = 'Account access is disabled';
  end if;

  normalized_phone := regexp_replace(
    coalesce(btrim(new_phone), ''),
    '[[:space:]().-]+',
    '',
    'g'
  );

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

  if profile_record.phone is distinct from expected_phone
     or profile_record.instagram_username is distinct from expected_instagram_username
  then
    raise exception using
      errcode = '40001',
      message = 'Contact details changed; reload and try again';
  end if;

  values_changed := profile_record.phone is distinct from normalized_phone
    or profile_record.instagram_username is distinct from normalized_instagram;

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

  if values_changed then
    update public.profiles as profile
    set
      phone = normalized_phone,
      instagram_username = normalized_instagram
    where profile.id = caller_id;
  end if;

  return query
  select normalized_phone, normalized_instagram, values_changed;
end;
$function$;

alter function public.update_my_contact_details_if_unchanged(
  text,
  text,
  text,
  text
) owner to postgres;

revoke all
on function public.update_my_contact_details_if_unchanged(text, text, text, text)
from public, anon, authenticated, service_role;

grant execute
on function public.update_my_contact_details_if_unchanged(text, text, text, text)
to authenticated, service_role;

comment on function public.update_my_contact_details_if_unchanged(text, text, text, text) is
  'Active-member compare-and-swap boundary for phone and optional Instagram changes; rejects stale edit forms atomically.';

do $postflight$
begin
  if pg_catalog.to_regprocedure(
    'public.update_my_contact_details_if_unchanged(text,text,text,text)'
  ) is null then
    raise exception 'Contact compare-and-swap function is missing';
  end if;

  if has_function_privilege(
       'anon',
       'public.update_my_contact_details_if_unchanged(text,text,text,text)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'authenticated',
       'public.update_my_contact_details_if_unchanged(text,text,text,text)',
       'EXECUTE'
     )
     or not has_function_privilege(
       'service_role',
       'public.update_my_contact_details_if_unchanged(text,text,text,text)',
       'EXECUTE'
     )
  then
    raise exception 'Contact compare-and-swap function privileges are unsafe';
  end if;
end
$postflight$;

notify pgrst, 'reload schema';

commit;
