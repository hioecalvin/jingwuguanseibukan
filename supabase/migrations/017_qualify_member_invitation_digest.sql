-- ============================================================
-- 017 QUALIFY MEMBER INVITATION DIGEST
-- ============================================================
-- Migration 015 intentionally fixes SECURITY DEFINER search paths to
-- public, pg_temp. pgcrypto is installed in Supabase's extensions schema,
-- so its digest function must be schema-qualified under that hardened path.

begin;

create or replace function public.create_member_invitation(
  target_class_id uuid,
  target_dojo_id uuid,
  target_date_joined date,
  target_starting_level text default null::text,
  target_starting_rank_id uuid default null::uuid,
  target_starting_sub_rank_id uuid default null::uuid,
  target_invitation_type text default 'new_member'::text,
  target_admin_note text default null::text,
  expiry_days integer default 14
)
returns table(
  invitation_id uuid,
  invitation_token text,
  expires_at timestamp with time zone
)
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  raw_token text;
  token_hash_value text;
  expiration_time timestamptz;
  new_invitation_id uuid;
  dojo_class_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.can_manage_class(target_class_id, auth.uid()) then
    raise exception 'You are not authorised to create invitations for this class';
  end if;

  if target_dojo_id is not null then
    select d.class_id
    into dojo_class_id
    from public.dojos as d
    where d.id = target_dojo_id;

    if not found then
      raise exception 'Dojo not found';
    end if;

    if dojo_class_id is distinct from target_class_id then
      raise exception 'Selected dojo does not belong to selected class';
    end if;
  end if;

  if target_date_joined is null then
    raise exception 'Date joined is required';
  end if;

  if target_invitation_type not in ('new_member', 'transferred_member') then
    raise exception 'Invalid invitation type';
  end if;

  if expiry_days is null or expiry_days < 1 or expiry_days > 60 then
    raise exception 'Invitation expiry must be between 1 and 60 days';
  end if;

  raw_token := encode(extensions.gen_random_bytes(32), 'hex');
  token_hash_value := encode(extensions.digest(raw_token, 'sha256'), 'hex');
  expiration_time := now() + make_interval(days => expiry_days);

  insert into public.member_invitations (
    token_hash,
    class_id,
    dojo_id,
    date_joined,
    starting_level,
    starting_rank_id,
    starting_sub_rank_id,
    invitation_type,
    admin_note,
    created_by,
    expires_at
  )
  values (
    token_hash_value,
    target_class_id,
    target_dojo_id,
    target_date_joined,
    nullif(trim(target_starting_level), ''),
    target_starting_rank_id,
    target_starting_sub_rank_id,
    target_invitation_type,
    public.clean_text(target_admin_note),
    auth.uid(),
    expiration_time
  )
  returning id into new_invitation_id;

  return query
  select new_invitation_id, raw_token, expiration_time;
end;
$function$;

notify pgrst, 'reload schema';

commit;
