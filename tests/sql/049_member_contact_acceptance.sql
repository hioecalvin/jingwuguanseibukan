\set ON_ERROR_STOP on

select set_config('app.current_uid', '00000000-0000-0000-0000-000000000001', false);

select *
from public.update_my_contact_details(
  '00 62 (812) 345-6789',
  '@Example.Name'
);

do $assert$
declare
  member_record record;
begin
  select profile.phone, profile.instagram_username
  into member_record
  from public.profiles as profile
  where profile.id = '00000000-0000-0000-0000-000000000001';

  if member_record.phone is distinct from '+628123456789'
     or member_record.instagram_username is distinct from 'example.name'
  then
    raise exception 'Contact normalization failed';
  end if;

  if (
    select count(*)
    from public.profile_contact_change_audit
    where profile_id = '00000000-0000-0000-0000-000000000001'
      and change_source = 'member_self_service'
  ) <> 2 then
    raise exception 'Phone and Instagram audit rows were not created';
  end if;
end
$assert$;

do $assert$
begin
  begin
    perform public.update_my_contact_details('123', 'valid_name');
    raise exception 'Invalid phone was accepted';
  exception when invalid_parameter_value then
    null;
  end;

  begin
    perform public.update_my_contact_details('+628123456789', '.invalid');
    raise exception 'Invalid Instagram username was accepted';
  exception when invalid_parameter_value then
    null;
  end;
end
$assert$;

update auth.users
set email = 'Verified.New@Example.Test'
where id = '00000000-0000-0000-0000-000000000001';

do $assert$
begin
  if (
    select email
    from public.profiles
    where id = '00000000-0000-0000-0000-000000000001'
  ) is distinct from 'verified.new@example.test' then
    raise exception 'Verified Auth email did not synchronize';
  end if;

  if (
    select count(*)
    from public.profile_contact_change_audit
    where profile_id = '00000000-0000-0000-0000-000000000001'
      and field_name = 'email'
      and change_source = 'auth_email_confirmation'
  ) <> 1 then
    raise exception 'Verified email audit row was not created';
  end if;

  begin
    update auth.users
    set email = 'OTHER@example.test'
    where id = '00000000-0000-0000-0000-000000000001';
    raise exception 'Duplicate profile email was accepted';
  exception when unique_violation then
    null;
  end;
end
$assert$;

select set_config('app.current_uid', '00000000-0000-0000-0000-000000000003', false);

do $assert$
begin
  begin
    perform public.update_my_contact_details('+628765432100', 'disabled_member');
    raise exception 'Disabled member changed contact details';
  exception when insufficient_privilege then
    null;
  end;

  if has_table_privilege('authenticated', 'public.profile_contact_change_audit', 'SELECT')
     or has_table_privilege('authenticated', 'public.profile_contact_change_audit', 'INSERT')
     or has_table_privilege('authenticated', 'public.profiles', 'UPDATE')
     or has_function_privilege('anon', 'public.update_my_contact_details(text,text)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.update_my_contact_details(text,text)', 'EXECUTE')
  then
    raise exception 'Contact self-service privileges are unsafe';
  end if;
end
$assert$;
