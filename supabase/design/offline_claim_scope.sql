-- LOCAL DESIGN ONLY: not a migration or an exposed approval endpoint.
-- The eventual decision AND Auth-insert trigger must call this in the same
-- transaction as their state transition. Never cache its result across API calls.
begin;
create schema member_claim_private;
revoke all on schema member_claim_private from public, anon, authenticated, service_role;

create function member_claim_private.lock_approval_scope(actor_id uuid, target_id uuid)
returns uuid language plpgsql security definer set search_path = pg_catalog as $$
declare
  actor public.profiles%rowtype;
  target public.profiles%rowtype;
  scoped_dojo uuid;
begin
  -- A fixed ordering avoids approvers locking each other's profiles backwards.
  perform 1 from public.profiles p where p.id in (actor_id, target_id)
    order by p.id for share;
  select * into actor from public.profiles where id = actor_id;
  select * into target from public.profiles where id = target_id;
  if actor.id is null or actor.auth_user_id is distinct from actor.id
    or actor.account_status::text is distinct from 'active' or actor.date_of_passing is not null
    or actor.must_change_password is distinct from false then
    raise exception using errcode = '42501', message = 'Claim approval unavailable';
  end if;
  perform 1 from auth.users u where u.id = actor.auth_user_id
    and u.email_confirmed_at is not null and u.deleted_at is null
    and (u.banned_until is null or u.banned_until <= clock_timestamp()) for share;
  if not found then
    raise exception using errcode = '42501', message = 'Claim approval unavailable';
  end if;
  if target.id is null or target.auth_user_id is not null or target.is_super_admin is distinct from false
    or target.is_grading_assessor is distinct from false
    or target.account_status::text is distinct from 'active' or target.date_of_passing is not null then
    raise exception using errcode = '42501', message = 'Claim approval unavailable';
  end if;
  -- Companion appointment guards must lock this profile before any grant.
  -- Row locks alone cannot prevent a concurrent insert of a previously absent
  -- appointment; provisioning must hold the profile lock through its commit.
  if exists(select 1 from public.dojo_admin_assignments where user_id=target.id and active)
    or exists(select 1 from public.repository_uploader_assignments where user_id=target.id and active)
    or exists(select 1 from public.class_memberships where user_id=target.id and role::text is distinct from 'user') then
    raise exception using errcode = '42501', message = 'Claim approval unavailable';
  end if;
  if actor.is_super_admin then return null; end if;

  -- A class role alone is insufficient. Both the appointment and its class
  -- membership must still be valid, and the target's confirmed dojo must match.
  select d.id into scoped_dojo
  from public.dojo_admin_assignments a
  join public.dojos d on d.id = a.dojo_id and d.class_id = a.class_id
  join public.classes c on c.id = d.class_id
  join public.class_memberships am on am.user_id = actor.id and am.class_id = c.id
  join public.class_memberships tm on tm.user_id = target.id
    and tm.class_id = c.id and tm.dojo_id = d.id
  where a.user_id = actor.id and a.active and d.active and c.is_active
    and am.status::text in ('active', 'break', 'break_1', 'break_2')
    and tm.status::text in ('active', 'break', 'break_1', 'break_2', 'inactive')
  order by d.id, am.id, tm.id limit 1
  for share of a, d, c, am, tm;
  if scoped_dojo is null then
    raise exception using errcode = '42501', message = 'Claim approval unavailable';
  end if;
  return scoped_dojo;
end;
$$;
revoke all on function member_claim_private.lock_approval_scope(uuid,uuid)
  from public, anon, authenticated, service_role;
comment on function member_claim_private.lock_approval_scope(uuid,uuid) is
  'Internal transaction-scoped authority check; actor must come from verified JWT or private approved claim, never public input. No account binding or grants.';
commit;
