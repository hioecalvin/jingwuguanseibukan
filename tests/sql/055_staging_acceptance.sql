-- Guarded staging-only semantic acceptance for migration 055.
--
-- The exact final exception is the success signal. PostgreSQL rolls back every
-- temporary profile and audit change made by this block.
do $acceptance$
declare
  member_id uuid;
  original_phone text;
  original_instagram text;
  temporary_phone text;
  temporary_instagram text := 'jwg055temporary';
  rejected_phone text := '+61234567999';
  audit_before bigint;
  audit_after_change bigint;
  result_record record;
begin
  select profile.id, profile.phone, profile.instagram_username
  into member_id, original_phone, original_instagram
  from public.profiles as profile
  where profile.registration_number = '0101'
    and profile.account_status::text = 'active'
    and profile.date_of_passing is null;

  if member_id is null then
    raise exception 'Required active staging Member 0101 is missing';
  end if;

  temporary_phone := case
    when original_phone is distinct from '+61234567890' then '+61234567890'
    else '+61234567891'
  end;
  if original_instagram is not distinct from temporary_instagram then
    temporary_instagram := 'jwg055temporary2';
  end if;

  select count(*) into audit_before
  from public.profile_contact_change_audit
  where profile_id = member_id;

  perform set_config('request.jwt.claim.sub', member_id::text, false);

  select * into strict result_record
  from public.update_my_contact_details_if_unchanged(
    original_phone,
    original_instagram,
    original_phone,
    original_instagram
  );

  if result_record.changed is distinct from false
     or result_record.phone is distinct from original_phone
     or result_record.instagram_username is distinct from original_instagram
     or (select count(*) from public.profile_contact_change_audit
         where profile_id = member_id) <> audit_before
  then
    raise exception 'Exact no-op changed profile or audit state';
  end if;

  select * into strict result_record
  from public.update_my_contact_details_if_unchanged(
    original_phone,
    original_instagram,
    temporary_phone,
    temporary_instagram
  );

  if result_record.changed is distinct from true
     or result_record.phone is distinct from temporary_phone
     or result_record.instagram_username is distinct from temporary_instagram
  then
    raise exception 'Legitimate contact compare-and-swap did not return the new values';
  end if;

  select count(*) into audit_after_change
  from public.profile_contact_change_audit
  where profile_id = member_id;

  if audit_after_change <> audit_before + 2 then
    raise exception 'Legitimate two-field change did not create exactly two audit rows';
  end if;

  begin
    perform public.update_my_contact_details_if_unchanged(
      original_phone,
      original_instagram,
      rejected_phone,
      null
    );
    raise exception 'Stale contact compare-and-swap unexpectedly succeeded';
  exception when serialization_failure then
    null;
  end;

  if (select phone from public.profiles where id = member_id)
       is distinct from temporary_phone
     or (select instagram_username from public.profiles where id = member_id)
       is distinct from temporary_instagram
     or (select count(*) from public.profile_contact_change_audit
         where profile_id = member_id) <> audit_after_change
  then
    raise exception 'Rejected stale change modified profile or audit state';
  end if;

  begin
    perform public.update_my_contact_details_if_unchanged(
      temporary_phone,
      original_instagram,
      rejected_phone,
      null
    );
    raise exception 'One stale field did not reject the whole update';
  exception when serialization_failure then
    null;
  end;

  select * into strict result_record
  from public.update_my_contact_details_if_unchanged(
    temporary_phone,
    temporary_instagram,
    temporary_phone,
    null
  );

  if result_record.changed is distinct from true
     or result_record.instagram_username is not null
     or (select count(*) from public.profile_contact_change_audit
         where profile_id = member_id) <> audit_after_change + 1
  then
    raise exception 'NULL Instagram compare-and-swap contract failed';
  end if;

  begin
    perform public.update_my_contact_details_if_unchanged(
      temporary_phone,
      null,
      '123',
      null
    );
    raise exception 'Invalid phone unexpectedly succeeded';
  exception when invalid_parameter_value then
    null;
  end;

  perform set_config('request.jwt.claim.sub', '', false);
  begin
    perform public.update_my_contact_details_if_unchanged(
      temporary_phone,
      null,
      temporary_phone,
      null
    );
    raise exception 'Unauthenticated contact compare-and-swap unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;

  raise exception 'ROLLBACK-CONTAINED PASS: migration 055 contact compare-and-swap acceptance';
end
$acceptance$;
