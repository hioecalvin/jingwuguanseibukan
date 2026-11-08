-- 064: offline member identities, guarded claims, and source-bound conversion.
-- Execute only through the target-bound owner runner after backup and acceptance.
-- No source records, Auth accounts, emails or configuration are created here.
do $preflight$ declare item record; begin
 if current_user<>'postgres' or current_setting('jwg.offline_migration',true) is distinct from '064' then
  raise exception 'Explicit owner migration context required'; end if;
 if to_regnamespace('same_id_import_private') is not null or to_regnamespace('member_claim_private') is not null then
  raise exception 'Offline identity schema already exists; reconcile instead of replay'; end if;
 for item in select * from (values
 ('public.claim_next_email()','0241897e3d9b9061952355d803e14f66f266e8fdafcbefab2f89ad8d1765ea61'),
 ('public.handle_email_verified()','b2ea65aea91560a17d75c0527e5e1af4a59741ad7f07d5517be5a045b63fa071'),
 ('public.is_super_admin(uuid)','1cfa723f121a012706b9c88ceb68f393371a98c3b20810cdcfd50a59dd4b3b63'),
 ('public.handle_new_user()','d2db9a3f19030931edf11ab90b307053c11e0523e093a62e2d8bfbfa9124f02f'),
 ('public.is_active_app_user(uuid)','c15dd342f24fd29eef4de4754024239214e387dcf69422ad0fc4a41e1dbdd39a'),
 ('public.is_class_admin(uuid,uuid,uuid)','f34326e10a54d5e2108b50c0a34069195edeac6a95ff95e33d65ff97006a186a'),
 ('public.queue_email(text,text,text,jsonb,uuid,text,uuid,text)','24655840c9b2a857e049043fdfdd63acedc3e51c13cb1facbd5cefc7b6d1e987'),
 ('public.queue_event_email(uuid)','41e1c44b43e61205f43810351eae5a29d75bf7931933089dfd66ed5834dd70bd'),
 ('public.queue_event_notifications()','241c89f8bc02d9b077bec8cb761a66ae32a7ae5852455b10f6c098ced6c59d65'),
 ('public.route_legacy_notification_to_email_outbox()','c7c55cd141b43a48430eea80845ca35c240e1bef5195e306f4cc3dd832b11ad7')
 ) f(signature,hash) loop
  if to_regprocedure(item.signature) is null or encode(sha256(convert_to(replace(pg_get_functiondef(to_regprocedure(item.signature)),chr(13),''),'UTF8')),'hex')<>item.hash then
   raise exception 'Baseline routine differs: %',item.signature; end if;
 end loop;
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='own profile' and qual='((id = auth.uid()) AND (account_status = ''active''::account_status) AND (date_of_passing IS NULL))') then
  raise exception 'Profile policy baseline differs'; end if;
end $preflight$;

-- Source: offline_same_id_foundation
-- LOCAL DESIGN CANDIDATE ONLY: NOT a deployable migration.
-- Keeps permanent member UUIDs equal to their eventual Auth UUID. Claim
-- provisioning is deliberately disabled until its provider/trigger proof exists.

lock table public.profiles in share row exclusive mode;
lock table public.class_memberships in share row exclusive mode;
do $$ begin
  if exists(select 1 from public.profiles p left join auth.users u on u.id=p.id where u.id is null)
    or exists(select 1 from information_schema.columns where table_schema='public'
      and table_name='profiles' and column_name='auth_user_id') then
    raise exception 'Unexpected identity baseline';
  end if;
  if not exists(select 1 from pg_constraint where conrelid='public.profiles'::regclass
    and conname='profiles_id_fkey' and confrelid='auth.users'::regclass
    and pg_get_constraintdef(oid)='FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE') then
    raise exception 'Original Auth foreign key differs; review required';
  end if;
end $$;
create temporary table same_id_profile_baseline on commit drop as select id,to_jsonb(p) row_data from public.profiles p;
alter table public.profiles add column auth_user_id uuid, add column member_origin text not null default 'signup';
update public.profiles set auth_user_id=id;
do $$ begin
  if exists(select 1 from same_id_profile_baseline b full join public.profiles p using(id)
    where b.id is null or p.id is null or (to_jsonb(p)-array['auth_user_id','member_origin']) is distinct from b.row_data
      or p.auth_user_id is distinct from p.id) then raise exception 'Existing profile changed'; end if;
end $$;
alter table public.profiles
  drop constraint profiles_id_fkey,
  add constraint profiles_auth_user_id_key unique(auth_user_id),
  add constraint profiles_auth_user_id_fkey foreign key(auth_user_id) references auth.users(id) on delete restrict,
  add constraint profiles_same_auth_id check(auth_user_id is null or auth_user_id=id),
  add constraint profiles_origin check(member_origin in ('signup','import')),
  alter column email drop not null, alter column phone drop not null, alter column date_of_birth drop not null,
  add constraint profiles_signup_complete check(member_origin='import' or
    (auth_user_id is not null and email is not null and phone is not null and date_of_birth is not null));

-- Owner-only reservations stand in for the future reviewed intake converter.
-- No public RPC, request metadata or user-supplied session flag can reserve IDs.
create schema same_id_import_private;
revoke all on schema same_id_import_private from public,anon,authenticated,service_role;
create table same_id_import_private.reservations(
  profile_id uuid primary key,
  source_hash text not null check(source_hash ~ '^[a-f0-9]{64}$'),
  source_row integer not null check(source_row>0),
  expected_profile jsonb not null,
  consumed_at timestamptz,
  unique(source_hash,source_row)
);
alter table same_id_import_private.reservations enable row level security;
alter table same_id_import_private.reservations force row level security;
revoke all on same_id_import_private.reservations from public,anon,authenticated,service_role;

-- Closed by default. A reviewed claim integration may authorize one exact
-- profile transition from private state in the Auth-insert transaction only.
create function same_id_import_private.binding_allowed(old_row public.profiles,new_row public.profiles)
returns boolean language sql stable security definer set search_path=pg_catalog as $$select false$$;
revoke all on function same_id_import_private.binding_allowed(public.profiles,public.profiles)
from public,anon,authenticated,service_role;

create function public.guard_same_id_profile() returns trigger language plpgsql security definer
set search_path=pg_catalog as $$
declare reservation same_id_import_private.reservations%rowtype;
begin
  if tg_op='UPDATE' then
    if new.id is distinct from old.id
      or (new.auth_user_id is distinct from old.auth_user_id
        and same_id_import_private.binding_allowed(old,new) is not true)
      or new.member_origin is distinct from old.member_origin
      or (old.member_origin='import' and new.registration_number is distinct from old.registration_number) then
      raise exception using errcode='23514',message='Identity linking is not enabled';
    end if;
    if old.member_origin='import' and old.auth_user_id is null
      and (new.is_super_admin or new.is_grading_assessor or new.email_verified) then
      raise exception using errcode='23514',message='Offline identities cannot gain online privileges';
    end if;
    return new;
  end if;
  if new.member_origin='signup' then
    if new.auth_user_id is null then new.auth_user_id:=new.id; end if;
    if new.auth_user_id is distinct from new.id then raise exception using errcode='23514',message='Auth identity mismatch'; end if;
    return new;
  end if;
  select * into reservation from same_id_import_private.reservations where profile_id=new.id for update;
  if not found or reservation.consumed_at is not null or new.auth_user_id is not null
    or exists(select 1 from auth.users where id=new.id)
    or new.is_super_admin or new.is_grading_assessor or new.email_verified
    or jsonb_build_object('registration_number',new.registration_number,'full_name',new.full_name,
      'email',new.email,'phone',new.phone,'date_of_birth',new.date_of_birth,
      'account_status',new.account_status) is distinct from reservation.expected_profile then
    raise exception using errcode='23514',message='Reviewed offline import reservation required';
  end if;
  update same_id_import_private.reservations set consumed_at=clock_timestamp() where profile_id=new.id;
  return new;
end $$;
revoke all on function public.guard_same_id_profile() from public,anon,authenticated,service_role;
create trigger zz_guard_same_id_profile before insert or update on public.profiles
for each row execute function public.guard_same_id_profile();

-- BEFORE ordering alone is insufficient: a later BEFORE trigger can rewrite
-- NEW after validation. Recheck the actual final tuple, without consuming twice.
create function public.check_same_id_profile_final() returns trigger language plpgsql security definer
set search_path=pg_catalog as $$
declare reservation same_id_import_private.reservations%rowtype;
begin
  if tg_op='UPDATE' then
    if new.id is distinct from old.id
      or (new.auth_user_id is distinct from old.auth_user_id
        and same_id_import_private.binding_allowed(old,new) is not true)
      or new.member_origin is distinct from old.member_origin
      or (old.member_origin='import' and new.registration_number is distinct from old.registration_number) then
      raise exception using errcode='23514',message='Final identity tuple changed';
    end if;
  end if;
  if new.member_origin='import' and new.auth_user_id is null
    and (new.is_super_admin is distinct from false or new.is_grading_assessor is distinct from false or new.email_verified is distinct from false) then
    raise exception using errcode='23514',message='Offline identities cannot gain online privileges';
  end if;
  if tg_op='INSERT' and new.member_origin='import' then
    select * into reservation from same_id_import_private.reservations where profile_id=new.id for update;
    if not found or reservation.consumed_at is null or new.auth_user_id is not null
      or exists(select 1 from auth.users where id=new.id)
      or jsonb_build_object('registration_number',new.registration_number,'full_name',new.full_name,
        'email',new.email,'phone',new.phone,'date_of_birth',new.date_of_birth,
        'account_status',new.account_status) is distinct from reservation.expected_profile then
      raise exception using errcode='23514',message='Final import tuple differs from reviewed source';
    end if;
  end if;
  return null;
end $$;
revoke all on function public.check_same_id_profile_final() from public,anon,authenticated,service_role;
create trigger zz_check_same_id_profile_final after insert or update on public.profiles
for each row execute function public.check_same_id_profile_final();

-- Detect a late trigger swapping the entire reserved tuple to another UUID or
-- origin; a row trigger seeing only NEW cannot reconstruct the original UUID.
create function public.check_consumed_import_reservations() returns trigger language plpgsql security definer
set search_path=pg_catalog as $$
begin
  if exists(select 1 from same_id_import_private.reservations r
    left join public.profiles p on p.id=r.profile_id
    where r.consumed_at is not null and (p.id is null or p.member_origin<>'import'
      or p.registration_number is distinct from r.expected_profile->>'registration_number')) then
    raise exception using errcode='23514',message='Consumed import reservation lost its member identity';
  end if;
  return null;
end $$;
revoke all on function public.check_consumed_import_reservations() from public,anon,authenticated,service_role;
create trigger zz_check_consumed_import_reservations after insert or update on public.profiles
for each statement execute function public.check_consumed_import_reservations();

alter table public.class_memberships alter column joined_date drop not null;
create function public.guard_imported_membership() returns trigger language plpgsql security definer
set search_path=pg_catalog as $$
declare target public.profiles%rowtype;
begin
  select * into target from public.profiles where id=new.user_id for share;
  if not found then raise exception using errcode='23503',message='Member missing'; end if;
  if new.joined_date is null and target.member_origin<>'import' then
    raise exception using errcode='23514',message='Joining date required for non-imported member';
  end if;
  if target.member_origin='import' and target.auth_user_id is null and new.role::text<>'user' then
    raise exception using errcode='23514',message='Offline import cannot appoint administrators';
  end if;
  return new;
end $$;
revoke all on function public.guard_imported_membership() from public,anon,authenticated,service_role;
create trigger zz_guard_imported_membership before insert or update on public.class_memberships
for each row execute function public.guard_imported_membership();
create trigger zz_check_imported_membership_final after insert or update on public.class_memberships
for each row execute function public.guard_imported_membership();

-- Both current appointment tables use user_id/active. Hold the member row lock
-- until transaction end, so a future provisioning UPDATE cannot race an insert
-- or reactivation. The final-row trigger also catches late BEFORE rewrites.
create function public.guard_offline_appointment() returns trigger language plpgsql security definer
set search_path=pg_catalog as $$
declare target public.profiles%rowtype;
begin
  select * into target from public.profiles where id=new.user_id for share;
  if not found then raise exception using errcode='23503',message='Member missing'; end if;
  if new.active and (target.auth_user_id is null or target.auth_user_id is distinct from target.id) then
    raise exception using errcode='23514',message='Offline member cannot receive an appointment';
  end if;
  return new;
end $$;
revoke all on function public.guard_offline_appointment() from public,anon,authenticated,service_role;
create trigger zz_guard_offline_dojo_appointment before insert or update on public.dojo_admin_assignments
for each row execute function public.guard_offline_appointment();
create trigger zz_check_offline_dojo_appointment_final after insert or update on public.dojo_admin_assignments
for each row execute function public.guard_offline_appointment();
create trigger zz_guard_offline_uploader_appointment before insert or update on public.repository_uploader_assignments
for each row execute function public.guard_offline_appointment();
create trigger zz_check_offline_uploader_appointment_final after insert or update on public.repository_uploader_assignments
for each row execute function public.guard_offline_appointment();

-- Source: offline_claim_scope
-- LOCAL DESIGN ONLY: not a migration or an exposed approval endpoint.
-- The eventual decision AND Auth-insert trigger must call this in the same
-- transaction as their state transition. Never cache its result across API calls.

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

-- Source: offline_claim_provisioning
-- LOCAL INTEGRATION CANDIDATE ONLY. No exposed RPCs or provider calls.
-- Requires same-ID foundation and claim-scope prototype. All entry points are
-- owner-only until authenticated HTTP endpoints and abuse controls are reviewed.

create table member_claim_private.claims (
 id uuid primary key default gen_random_uuid(),
 member_id uuid not null references public.profiles(id),
 email text not null,
 proof_hash bytea not null,
 expires_at timestamptz not null default (clock_timestamp()+interval '24 hours'),
 state text not null default 'pending_email' check(state in ('pending_email','verified','approved','provisioning','binding','bound','cancelled')),
 verified_at timestamptz, approved_by uuid references public.profiles(id), approved_at timestamptz,
 ticket_hash bytea, ticket_expires_at timestamptz, binding_xid bigint, bound_at timestamptz,
 site_origin text, setup_hash bytea, setup_expires_at timestamptz
);
create unique index claim_open_member on member_claim_private.claims(member_id)
 where state not in ('bound','cancelled');
create unique index claim_open_email on member_claim_private.claims(email)
 where state not in ('bound','cancelled');
create table member_claim_private.claim_audit (
 id bigint generated always as identity primary key,
 claim_id uuid not null references member_claim_private.claims(id),
 event text not null, actor_id uuid, recorded_at timestamptz not null default clock_timestamp()
);
alter table member_claim_private.claims enable row level security;
alter table member_claim_private.claims force row level security;
alter table member_claim_private.claim_audit enable row level security;
alter table member_claim_private.claim_audit force row level security;
revoke all on all tables in schema member_claim_private from public,anon,authenticated,service_role;
revoke all on all sequences in schema member_claim_private from public,anon,authenticated,service_role;

create function member_claim_private.request_claim(target uuid, proposed_email text, proof_token text)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare result_id uuid; canonical_email text:=lower(btrim(proposed_email)); p public.profiles%rowtype;
begin
 if canonical_email is null or length(canonical_email)>254
   or canonical_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
   or proof_token is null or proof_token !~ '^[a-f0-9]{64}$' then
  raise exception using errcode='22023',message='Invalid claim request'; end if;
 select * into p from public.profiles where id=target for update;
 if not found or p.member_origin<>'import' or p.auth_user_id is not null
   or p.account_status::text<>'active' or p.date_of_passing is not null
   or p.is_super_admin or p.is_grading_assessor
   or exists(select 1 from auth.users where id=target or lower(btrim(email))=canonical_email)
   or exists(select 1 from public.profiles where id<>target and lower(btrim(email))=canonical_email) then
  raise exception using errcode='42501',message='Claim unavailable'; end if;
 insert into member_claim_private.claims(member_id,email,proof_hash)
 values(target,canonical_email,sha256(convert_to(proof_token,'UTF8'))) returning id into result_id;
 insert into member_claim_private.claim_audit(claim_id,event) values(result_id,'requested');
 return result_id;
end $$;

create function member_claim_private.verify_claim(claim_id uuid, proof_token text)
returns void language plpgsql security definer set search_path=pg_catalog as $$
declare c member_claim_private.claims%rowtype;
begin
 select * into c from member_claim_private.claims where id=claim_id for update;
 if not found or c.state<>'pending_email' or c.expires_at<=clock_timestamp()
   or proof_token is null or proof_token !~ '^[a-f0-9]{64}$'
   or c.proof_hash<>sha256(convert_to(proof_token,'UTF8')) then
  raise exception using errcode='42501',message='Verification unavailable'; end if;
 update member_claim_private.claims set state='verified',verified_at=clock_timestamp() where id=c.id;
 insert into member_claim_private.claim_audit(claim_id,event) values(c.id,'email_verified');
end $$;

create function member_claim_private.approve_claim(claim_id uuid, actor uuid)
returns void language plpgsql security definer set search_path=pg_catalog as $$
declare c member_claim_private.claims%rowtype;
begin
 select * into c from member_claim_private.claims where id=claim_id for update;
 if not found or c.state<>'verified' or c.verified_at is null or c.expires_at<=clock_timestamp() then
  raise exception using errcode='42501',message='Approval unavailable'; end if;
 perform member_claim_private.lock_approval_scope(actor,c.member_id);
 update member_claim_private.claims set state='approved',approved_by=actor,approved_at=clock_timestamp() where id=c.id;
 insert into member_claim_private.claim_audit(claim_id,event,actor_id) values(c.id,'approved',actor);
end $$;

create function member_claim_private.begin_provision(claim_id uuid, ticket text)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare c member_claim_private.claims%rowtype;
begin
 select * into c from member_claim_private.claims where id=claim_id for update;
 if not found or c.state<>'approved' or c.expires_at<=clock_timestamp()
   or ticket is null or ticket !~ '^[a-f0-9]{64}$' then
  raise exception using errcode='42501',message='Provisioning unavailable'; end if;
 perform member_claim_private.lock_approval_scope(c.approved_by,c.member_id);
 update member_claim_private.claims set state='provisioning',ticket_hash=sha256(convert_to(ticket,'UTF8')),
   ticket_expires_at=least(expires_at,clock_timestamp()+interval '5 minutes') where id=c.id;
 insert into member_claim_private.claim_audit(claim_id,event,actor_id) values(c.id,'provisioning',c.approved_by);
 return c.member_id;
end $$;

create function member_claim_private.cancel_claim(claim_id uuid, actor uuid)
returns void language plpgsql security definer set search_path=pg_catalog as $$
declare c member_claim_private.claims%rowtype;
begin
 select * into c from member_claim_private.claims where id=claim_id for update;
 if not found or c.state in ('binding','bound','cancelled') then
  raise exception using errcode='42501',message='Cancellation unavailable'; end if;
 perform member_claim_private.lock_approval_scope(actor,c.member_id);
 update member_claim_private.claims set state='cancelled',ticket_hash=null where id=c.id;
 insert into member_claim_private.claim_audit(claim_id,event,actor_id) values(c.id,'cancelled',actor);
end $$;

create or replace function same_id_import_private.binding_allowed(old_row public.profiles,new_row public.profiles)
returns boolean language sql stable security definer set search_path=pg_catalog as $$
 select old_row.member_origin='import' and old_row.auth_user_id is null
 and new_row.auth_user_id=old_row.id and new_row.email_verified=false
 and (to_jsonb(old_row)-array['auth_user_id','email','updated_at'])=
     (to_jsonb(new_row)-array['auth_user_id','email','updated_at'])
 and exists(select 1 from member_claim_private.claims c where c.member_id=old_row.id
   and c.state='binding' and c.binding_xid=txid_current() and c.email=new_row.email);
$$;

-- Check private ticket before Auth INSERT and strip it before storage/JWT output.
-- User-editable raw_user_meta_data is intentionally ignored.
create function member_claim_private.authorize_auth_insert() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
declare c member_claim_private.claims%rowtype; ticket text:=new.raw_app_meta_data->>'member_claim_ticket';
begin
 if not exists(select 1 from public.profiles where id=new.id) then
  if ticket is not null then raise exception using errcode='42501',message='Claim identity mismatch'; end if;
  return new;
 end if;
 select * into c from member_claim_private.claims where member_id=new.id and state='provisioning' for update;
 if not found or c.verified_at is null or c.expires_at<=clock_timestamp()
   or c.ticket_expires_at<=clock_timestamp() or lower(btrim(new.email)) is distinct from c.email
   or ticket is null or ticket !~ '^[a-f0-9]{64}$'
   or c.ticket_hash is distinct from sha256(convert_to(ticket,'UTF8')) then
  raise exception using errcode='42501',message='Claim provisioning unavailable'; end if;
 perform member_claim_private.lock_approval_scope(c.approved_by,c.member_id);
 update member_claim_private.claims set state='binding',binding_xid=txid_current() where id=c.id;
 new.raw_app_meta_data:=new.raw_app_meta_data-'member_claim_ticket';
 return new;
end $$;
create trigger zz_authorize_member_claim before insert on auth.users
for each row execute function member_claim_private.authorize_auth_insert();

create function member_claim_private.attach_existing_member(target uuid, auth_email text)
returns boolean language plpgsql security definer set search_path=pg_catalog as $$
declare c member_claim_private.claims%rowtype;
begin
 if not exists(select 1 from public.profiles where id=target) then return false; end if;
 select * into c from member_claim_private.claims where member_id=target and state='binding'
   and binding_xid=txid_current() and email=lower(btrim(auth_email)) for update;
 if not found then raise exception using errcode='42501',message='Claim attachment unavailable'; end if;
 update public.profiles set auth_user_id=id,email=c.email where id=target;
 update member_claim_private.claims set state='bound',bound_at=clock_timestamp(),ticket_hash=null where id=c.id;
 insert into member_claim_private.claim_audit(claim_id,event,actor_id) values(c.id,'bound',c.approved_by);
 return true;
end $$;

create function member_claim_private.check_binding_consumed() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
begin
 if exists(select 1 from member_claim_private.claims where state='binding' and binding_xid=txid_current()) then
  raise exception using errcode='23514',message='Auth insert abandoned a claim binding'; end if;
 return null;
end $$;
create trigger zz_check_member_claim_binding after insert on auth.users
for each statement execute function member_claim_private.check_binding_consumed();

-- The runner installs exact catalog definitions, then integrates only these two
-- branches. Retain ordinary signup, but never enroll an imported member using
-- requested_class_id supplied in signup metadata.
do $patch$
declare definition text; marker text:=E'begin\n';
begin
 -- Installation context and exact routine fingerprints verified above.
 definition:=replace(pg_get_functiondef('public.handle_new_user()'::regprocedure),E'\r\n',E'\n');
 if position(marker in definition)=0 then raise exception 'Signup definition marker missing'; end if;
 definition:=replace(definition,marker,marker || E'  if member_claim_private.attach_existing_member(new.id,new.email) then return new; end if;\n');
 execute definition;
 definition:=replace(pg_get_functiondef('public.handle_email_verified()'::regprocedure),E'\r\n',E'\n');
 if position(marker in definition)=0 then raise exception 'Confirmation definition marker missing'; end if;
 definition:=replace(definition,marker,marker || $branch$
 if exists(select 1 from public.profiles where id=new.id and member_origin='import') then
   if not exists(select 1 from public.profiles where id=new.id and auth_user_id=new.id
     and (email=lower(btrim(new.email)) or (
       old.email_confirmed_at is not null and email=lower(btrim(old.email))
     ))) then raise exception 'Imported Auth identity mismatch'; end if;
   -- Initial claim confirmation must still match its bound email. Once already
   -- confirmed, Auth may change email and confirmation together; the existing
   -- later email-sync trigger updates the profile and writes its contact audit.
   -- Do not require that later trigger's result before it has executed.
   if old.email_confirmed_at is null and new.email_confirmed_at is not null then
     update public.profiles set email_verified=true,updated_at=now() where id=new.id;
   end if;
   return new;
 end if;
$branch$);
 execute definition;
end $patch$;
revoke all on all functions in schema member_claim_private from public,anon,authenticated,service_role;
revoke all on function same_id_import_private.binding_allowed(public.profiles,public.profiles)
from public,anon,authenticated,service_role;

-- Source: offline_claim_api
-- LOCAL API INTEGRATION ONLY; not a migration. Production switch stays off.

create function public.request_member_claim(target_registration_number text, proposed_email text, proof_token text, site_origin text)
returns void language plpgsql security definer set search_path=pg_catalog as $$
declare target uuid; claim_id uuid; queued uuid;
begin
 if site_origin is null or site_origin !~ '^https://[a-zA-Z0-9.-]+(:[0-9]+)?$' then
  raise exception using errcode='22023',message='Secure site origin required'; end if;
 select p.id into target from public.profiles p
 where p.registration_number=upper(btrim(target_registration_number)) and p.member_origin='import'
   and p.auth_user_id is null and p.account_status::text='active' and p.date_of_passing is null
   and not p.is_super_admin and not p.is_grading_assessor for update;
 if target is null then return; end if;
 -- Only expired, unbound requests may be replaced without an Admin decision.
 with expired as (
   update member_claim_private.claims set state='cancelled',ticket_hash=null
   where member_id=target and expires_at<=clock_timestamp()
     and state in ('pending_email','verified','approved','provisioning') returning id
 ) insert into member_claim_private.claim_audit(claim_id,event) select id,'expired' from expired;
 begin
  claim_id:=member_claim_private.request_claim(target,proposed_email,proof_token);
 exception when insufficient_privilege or unique_violation then return;
 end;
 update member_claim_private.claims set site_origin=request_member_claim.site_origin where id=claim_id;
 queued:=public.queue_email(
  target_email=>lower(btrim(proposed_email)), target_email_type=>'member_claim_verification',
  target_subject=>'Verify your Jingwuguan Seibukan member claim',
  target_template_data=>jsonb_build_object('verification_url',site_origin||'/claim-id/verify#claim='||claim_id::text||'&token='||proof_token),
  target_user_id=>null, target_reference_type=>'member_claim',target_reference_id=>claim_id,
  target_dedupe_key=>'member-claim-verification/'||claim_id::text);
 if queued is null then raise exception 'Claim verification could not be queued'; end if;
end $$;

create function public.verify_member_claim(claim_id uuid, proof_token text)
returns void language plpgsql security definer set search_path=pg_catalog as $$
begin perform member_claim_private.verify_claim(claim_id,proof_token); end $$;

create function public.review_member_claim(claim_id uuid, approve boolean)
returns void language plpgsql security definer set search_path=pg_catalog as $$
declare actor uuid:=auth.uid(); c member_claim_private.claims%rowtype; setup_token text; queued uuid;
begin
 if actor is null or approve is null then raise exception using errcode='42501',message='Review unavailable'; end if;
 if approve then
  perform member_claim_private.approve_claim(claim_id,actor);
  select * into c from member_claim_private.claims where id=claim_id for update;
  if c.site_origin is null or c.site_origin !~ '^https://[a-zA-Z0-9.-]+(:[0-9]+)?$' then raise exception 'Claim origin unavailable'; end if;
  -- Database-generated token: the approving browser never chooses or receives it.
  setup_token:=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','');
  update member_claim_private.claims set setup_hash=sha256(convert_to(setup_token,'UTF8')),
    setup_expires_at=clock_timestamp()+interval '24 hours',expires_at=clock_timestamp()+interval '24 hours' where id=c.id;
  queued:=public.queue_email(target_email=>c.email,target_email_type=>'member_claim_setup',
    target_subject=>'Set your Jingwuguan Seibukan password',
    target_template_data=>jsonb_build_object('setup_url',c.site_origin||'/claim-id/setup#claim='||c.id::text||'&token='||setup_token),
    target_user_id=>null,target_reference_type=>'member_claim',target_reference_id=>c.id,
    target_dedupe_key=>'member-claim-setup/'||c.id::text);
  if queued is null then raise exception 'Claim setup could not be queued'; end if;
 else perform member_claim_private.cancel_claim(claim_id,actor); end if;
end $$;

create function public.get_reviewable_member_claims()
returns table(claim_id uuid,member_id text,full_name text,claimed_email text,state text,verified_at timestamptz)
language plpgsql security definer set search_path=pg_catalog as $$
declare actor uuid:=auth.uid(); c member_claim_private.claims%rowtype;
begin
 if actor is null then raise exception using errcode='42501',message='Review unavailable'; end if;
 for c in select request.* from member_claim_private.claims request
   where request.state in ('verified','approved') and request.expires_at>clock_timestamp()
   and (exists(select 1 from public.profiles where id=actor and is_super_admin)
     or exists(select 1 from public.class_memberships m join public.dojo_admin_assignments a
       on a.dojo_id=m.dojo_id and a.class_id=m.class_id
       where m.user_id=request.member_id and a.user_id=actor and a.active))
   order by request.verified_at,request.id limit 200
 loop
   begin
    perform member_claim_private.lock_approval_scope(actor,c.member_id);
   exception when insufficient_privilege then continue;
   end;
   return query select c.id,p.registration_number,p.full_name,c.email,c.state,c.verified_at
     from public.profiles p where p.id=c.member_id;
 end loop;
end $$;

revoke all on function public.request_member_claim(text,text,text,text),public.verify_member_claim(uuid,text),
 public.review_member_claim(uuid,boolean),public.get_reviewable_member_claims() from public,anon,authenticated,service_role;
grant execute on function public.request_member_claim(text,text,text,text),public.verify_member_claim(uuid,text) to service_role;
grant execute on function public.review_member_claim(uuid,boolean),public.get_reviewable_member_claims() to authenticated;

-- Source: offline_claim_setup
-- LOCAL ONLY: complete migration/provider acceptance still required.

create function member_claim_private.setup_claim(claim_id uuid, setup_token text)
returns member_claim_private.claims language plpgsql security definer set search_path=pg_catalog as $$
declare c member_claim_private.claims%rowtype;
begin
 select * into c from member_claim_private.claims where id=claim_id for update;
 if not found or c.setup_hash is null or setup_token is null or setup_token !~ '^[a-f0-9]{64}$'
   or c.setup_hash is distinct from sha256(convert_to(setup_token,'UTF8'))
   or c.setup_expires_at is null or c.setup_expires_at<=clock_timestamp()
   or c.expires_at<=clock_timestamp() or c.state not in ('approved','provisioning','bound') then
  raise exception using errcode='42501',message='Setup unavailable'; end if;
 return c;
end $$;

create function public.member_claim_setup_complete(claim_id uuid, setup_token text)
returns boolean language plpgsql security definer set search_path=pg_catalog as $$
declare c member_claim_private.claims%rowtype;
begin
 c:=member_claim_private.setup_claim(claim_id,setup_token);
 return c.state='bound' and exists(select 1 from public.profiles p join auth.users u on u.id=p.auth_user_id
  where p.id=c.member_id and p.auth_user_id=p.id and p.email=c.email and lower(btrim(u.email))=c.email
    and p.email_verified and u.email_confirmed_at is not null and u.deleted_at is null
    and (u.banned_until is null or u.banned_until<=clock_timestamp())
    and p.account_status::text='active' and p.date_of_passing is null);
end $$;

create function public.prepare_member_claim_setup(claim_id uuid, setup_token text, ticket text)
returns table(member_uuid uuid,verified_email text,already_complete boolean)
language plpgsql security definer set search_path=pg_catalog as $$
declare c member_claim_private.claims%rowtype;
begin
 c:=member_claim_private.setup_claim(claim_id,setup_token);
 if c.state='bound' then
  if not public.member_claim_setup_complete(claim_id,setup_token) then
    raise exception using errcode='42501',message='Setup unavailable'; end if;
  return query select c.member_id,c.email,true;return;
 end if;
 perform member_claim_private.lock_approval_scope(c.approved_by,c.member_id);
 if exists(select 1 from auth.users where id=c.member_id or lower(btrim(email))=c.email) then
  raise exception using errcode='42501',message='Setup unavailable'; end if;
 if c.state='provisioning' then
  if c.ticket_expires_at is null or c.ticket_expires_at>clock_timestamp() then
    raise exception using errcode='55P03',message='Setup in progress'; end if;
  -- A timed-out attempt may retry only after its old ticket expires and no Auth
  -- account exists. Never reset/delete an account to recover an ambiguous result.
  update member_claim_private.claims set state='approved',ticket_hash=null where id=c.id;
  insert into member_claim_private.claim_audit(claim_id,event) values(c.id,'provisioning_retry');
 end if;
 perform member_claim_private.begin_provision(c.id,ticket);
 return query select c.member_id,c.email,false;
end $$;
revoke all on function member_claim_private.setup_claim(uuid,text),public.prepare_member_claim_setup(uuid,text,text),
 public.member_claim_setup_complete(uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.prepare_member_claim_setup(uuid,text,text),public.member_claim_setup_complete(uuid,text) to service_role;

-- Source: offline_app_access
-- LOCAL DESIGN ONLY; requires same-ID foundation and full policy integration.

create or replace function public.is_active_app_user(target_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path to 'public','pg_temp' as $$
 select target_user_id is not null
 and (target_user_id=auth.uid() or coalesce(auth.role(),'')='service_role')
 and exists(select 1 from public.profiles profile where profile.id=target_user_id
   and profile.auth_user_id=profile.id and profile.account_status='active'
   and profile.date_of_passing is null);
$$;
alter policy "own profile" on public.profiles using (
 id=auth.uid() and auth_user_id=auth.uid()
 and account_status='active'::public.account_status and date_of_passing is null
);

-- Source: offline_delivery_guards
-- LOCAL PROTOTYPE ONLY. Not a deployable migration or full offline foundation.
-- Retain the exact captured production functions; change only offline routing.

do $guard$
declare definition text; marker text;
begin
 -- Installation context and exact routine fingerprints verified above.
 definition := pg_get_functiondef('public.queue_email(text,text,text,jsonb,uuid,text,uuid,text)'::regprocedure);
 definition := replace(definition,E'\r\n',E'\n');
 marker := E'begin\n';
 if position(marker in definition)=0 then raise exception 'Queue definition marker missing'; end if;
 definition := replace(definition,marker,marker || $body$
  -- Known offline identities have no delivery destination, even with source email.
  if target_user_id is not null and exists (
    select 1 from public.profiles p
    where p.id=target_user_id and p.auth_user_id is null
  ) then return null; end if;
$body$);
 execute definition;
 definition := pg_get_functiondef('public.route_legacy_notification_to_email_outbox()'::regprocedure);
 definition := replace(definition,E'\r\n',E'\n');
 if position(marker in definition)=0 then raise exception 'Bridge definition marker missing'; end if;
 definition := replace(definition,marker,marker || $body$
  -- Suppress before queue_email: its NULL result is an error for online delivery.
  if new.user_id is not null and exists (
    select 1 from public.profiles p
    where p.id=new.user_id and p.auth_user_id is null
  ) then return null; end if;
$body$);
 execute definition;
end $guard$;

-- Source: offline_catalog_consumers
-- LOCAL ONLY. Apply after the pinned complete schema and identity candidates.

do $patch$
declare definition text; routine text; marker text;
begin
 -- Installation context and exact routine fingerprints verified above.
 foreach routine in array array['queue_event_email(uuid)','queue_event_notifications()'] loop
  definition:=replace(pg_get_functiondef(('public.'||routine)::regprocedure),E'\r\n',E'\n');
  marker:='and p.email is not null';
  if position(marker in definition)=0 then raise exception 'Event recipient marker missing'; end if;
  definition:=replace(definition,marker,marker||' and p.auth_user_id=p.id');
  execute definition;
 end loop;
 definition:=replace(pg_get_functiondef('public.claim_next_email()'::regprocedure),E'\r\n',E'\n');
 marker:=E'begin\n';
 if position(marker in definition)=0 then raise exception 'Worker marker missing'; end if;
 definition:=replace(definition,marker,marker||$body$
  -- Do not deliver old queued notifications to unclaimed identities. Preserve
  -- explicit verification/setup mail, whose recipient_user_id is deliberately NULL.
  update public.email_outbox e set status='cancelled',next_attempt_at=null,
    last_error='Recipient account is not linked',updated_at=now()
  where e.status in ('pending','failed') and e.recipient_user_id is not null
    and exists(select 1 from public.profiles p where p.id=e.recipient_user_id and p.auth_user_id is null);
$body$);
 -- Also exclude stale processing rows recovered later in this function.
 marker:=E'  order by\n    e.created_at asc';
 if position(marker in definition)=0 then raise exception 'Worker candidate marker missing'; end if;
 definition:=replace(definition,marker,$body$
    and (e.recipient_user_id is null or not exists(
      select 1 from public.profiles p where p.id=e.recipient_user_id and p.auth_user_id is null))
$body$||marker);
 execute definition;
end $patch$;

create or replace function public.is_super_admin(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path='public','pg_temp' as $$
 select uid is not null and (uid=auth.uid() or coalesce(auth.role(),'')='service_role')
 and coalesce((select p.is_super_admin from public.profiles p where p.id=uid and p.auth_user_id=p.id),false);
$$;
create or replace function public.is_class_admin(target_class uuid,target_dojo uuid default null,uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path='public','pg_temp' as $$
 select uid is not null and (uid=auth.uid() or coalesce(auth.role(),'')='service_role')
 and exists(select 1 from public.profiles p where p.id=uid and p.auth_user_id=p.id)
 and (public.is_super_admin(uid) or exists(select 1 from public.dojo_admin_assignments assignment
   where assignment.user_id=uid and assignment.class_id=target_class and assignment.active
   and (target_dojo is null or assignment.dojo_id=target_dojo)));
$$;

-- Source: offline_member_conversion
-- Local candidate only. Reviewed source conversion; never an exposed RPC.

do $$ begin
 -- Installation context and exact routine fingerprints verified above.
end $$;
-- The reviewed configuration mapping belongs to the immutable source batch.
-- Labels are canonical source aliases, not database display names.
create table member_import_private.conversion_class_map(
 source_sha256 text not null references member_import_private.batches(source_sha256) on delete restrict,
 source_index smallint not null check(source_index between 0 and 5),
 source_name text not null,
 class_id uuid not null references public.classes(id) on delete restrict,
 primary key(source_sha256,source_index), unique(source_sha256,class_id),
 check(source_name=(array['Aikido','Taijiquan','Xingyiquan','Karate','Kungfu Kids','Bagua'])[source_index+1])
);
create table member_import_private.conversion_dojo_map(
 source_sha256 text not null, source_index smallint not null,
 source_label text not null check(source_label=lower(btrim(source_label)) and source_label<>''),
 dojo_id uuid not null references public.dojos(id) on delete restrict,
 primary key(source_sha256,source_index,source_label),
 foreign key(source_sha256,source_index) references member_import_private.conversion_class_map(source_sha256,source_index) on delete restrict
);
create table member_import_private.conversion_rank_map(
 source_sha256 text not null, source_index smallint not null,
 source_label text not null check(source_label=lower(btrim(source_label)) and source_label not in ('','unranked')),
 rank_id uuid not null references public.ranks(id) on delete restrict,
 primary key(source_sha256,source_index,source_label),
 foreign key(source_sha256,source_index) references member_import_private.conversion_class_map(source_sha256,source_index) on delete restrict
);
alter table member_import_private.conversion_class_map enable row level security;
alter table member_import_private.conversion_class_map force row level security;
alter table member_import_private.conversion_dojo_map enable row level security;
alter table member_import_private.conversion_dojo_map force row level security;
alter table member_import_private.conversion_rank_map enable row level security;
alter table member_import_private.conversion_rank_map force row level security;
revoke all on member_import_private.conversion_class_map,member_import_private.conversion_dojo_map,
 member_import_private.conversion_rank_map from public,anon,authenticated,service_role;

create function member_import_private.source_text(cells jsonb, cell_index integer)
returns text language plpgsql immutable set search_path=pg_catalog as $$
declare cell jsonb:=cells->cell_index;
begin
 if jsonb_typeof(cell) is distinct from 'object' or jsonb_typeof(cell->'type') is distinct from 'string' or not(cell ?& array['type','value'])
  or (cell-array['type','value'])<>'{}'::jsonb then
  raise exception using errcode='23514',message='Invalid typed source cell'; end if;
 if cell->'value'='null'::jsonb then
  if cell->>'type' not in ('n','s','inlineStr','date') then
   raise exception using errcode='23514',message='Unexpected empty source cell type'; end if;
  return null;
 end if;
 if cell->>'type' not in ('s','inlineStr') or jsonb_typeof(cell->'value')<>'string' then
  raise exception using errcode='23514',message='Source text must be stored as text'; end if;
 return nullif(btrim(cell->>'value'),'');
end $$;
create function member_import_private.source_date(cells jsonb, cell_index integer)
returns date language plpgsql immutable set search_path=pg_catalog as $$
declare cell jsonb:=cells->cell_index; value text;
begin
 if jsonb_typeof(cell) is distinct from 'object' or jsonb_typeof(cell->'type') is distinct from 'string' or not(cell ?& array['type','value'])
  or (cell-array['type','value'])<>'{}'::jsonb then
  raise exception using errcode='23514',message='Invalid typed date cell'; end if;
 if cell->'value'='null'::jsonb then
  if cell->>'type' not in ('n','s','inlineStr','date') then
   raise exception using errcode='23514',message='Unexpected empty date type'; end if;
  return null;
 end if;
 value:=btrim(cell->>'value');
 if cell->>'type' in ('s','inlineStr') and jsonb_typeof(cell->'value')='string' and value='' then return null; end if;
 if jsonb_typeof(cell->'value')<>'string'
  or not((cell->>'type'='date' and value ~ '^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{1,6})?)?$')
    or (cell->>'type' in ('s','inlineStr') and value ~ '^\d{4}-\d{2}-\d{2}$')) then
  raise exception using errcode='23514',message='Source date requires explicit ISO date'; end if;
 return value::timestamp::date;
end $$;
revoke all on function member_import_private.source_text(jsonb,integer),member_import_private.source_date(jsonb,integer)
 from public,anon,authenticated,service_role;

create function member_import_private.derive_member_plan(source_hash text,cells jsonb)
returns jsonb language plpgsql security invoker set search_path=pg_catalog as $$
declare profile jsonb; memberships jsonb:='[]'; c integer; start_at integer;
 class_uuid uuid; dojo_uuid uuid; rank_uuid uuid;
 dojo_label text; grade_label text; status_label text; termination text; inactive_since date;
begin
 if jsonb_typeof(cells) is distinct from 'array' or jsonb_array_length(cells)<>31 then
  raise exception using errcode='23514',message='Expected 31 typed source cells'; end if;
 termination:=lower(coalesce(member_import_private.source_text(cells,5),''));
 if termination not in ('','yes','no') then
  raise exception using errcode='23514',message='Unexpected termination flag'; end if;
 profile:=jsonb_build_object(
  'registration_number',member_import_private.source_text(cells,0),
  'full_name',initcap(regexp_replace(member_import_private.source_text(cells,1),'\s+',' ','g')),
  'email',lower(member_import_private.source_text(cells,3)),
  'phone',regexp_replace(member_import_private.source_text(cells,4),'\s+',' ','g'),
  'date_of_birth',member_import_private.source_date(cells,2),
  'account_status',case termination when 'yes' then 'disabled' else 'active' end);
 for c in 0..5 loop
  start_at:=6+4*c;
  dojo_label:=lower(member_import_private.source_text(cells,start_at));
  grade_label:=lower(regexp_replace(member_import_private.source_text(cells,start_at+1),'^(Kyu|Dan)[ -]+(\d+)$','\1 \2','i'));
  status_label:=lower(member_import_private.source_text(cells,start_at+2));
  inactive_since:=member_import_private.source_date(cells,start_at+3);
  if dojo_label is null and grade_label is null and status_label is null and inactive_since is null then continue; end if;
  if dojo_label is null or grade_label is null or status_label is null
    or status_label not in ('active','inactive','break_1','break_2') then
   raise exception using errcode='23514',message='Source membership needs explicit dojo, grade and status'; end if;
  select m.class_id into class_uuid from member_import_private.conversion_class_map m
   where m.source_sha256=source_hash and m.source_index=c;
  if not found then raise exception using errcode='23514',message='Source class mapping missing'; end if;
  select m.dojo_id into dojo_uuid from member_import_private.conversion_dojo_map m
   where m.source_sha256=source_hash and m.source_index=c and m.source_label=dojo_label;
  if not found then raise exception using errcode='23514',message='Source dojo mapping missing'; end if;
  rank_uuid:=null;
  if grade_label<>'unranked' then
   select m.rank_id into rank_uuid from member_import_private.conversion_rank_map m
    where m.source_sha256=source_hash and m.source_index=c and m.source_label=grade_label;
   if not found then raise exception using errcode='23514',message='Source approved grade mapping missing'; end if;
  end if;
  memberships:=memberships||jsonb_build_array(jsonb_build_object('class_id',class_uuid,'dojo_id',dojo_uuid,
   'rank_id',rank_uuid,'status',status_label,'joined_date',null,'inactive_since',inactive_since));
 end loop;
 return jsonb_build_object('profile',profile,'memberships',memberships);
end $$;
revoke all on function member_import_private.derive_member_plan(text,jsonb) from public,anon,authenticated,service_role;

create table member_import_private.conversions (
 source_sha256 text not null,
 sheet_name text not null default 'MEMBER DATA' check(sheet_name='MEMBER DATA'),
 row_number integer not null,
 row_sha256 text not null,
 reviewed_plan jsonb not null,
 profile_id uuid not null unique references public.profiles(id) on delete restrict,
 membership_ids uuid[] not null,
 converted_at timestamptz not null default now(),
 converted_by name not null default current_user,
 primary key(source_sha256,sheet_name,row_number),
 foreign key(source_sha256,sheet_name,row_number)
  references member_import_private.source_rows(source_sha256,sheet_name,row_number) on delete restrict
);
alter table member_import_private.conversions enable row level security;
alter table member_import_private.conversions force row level security;
revoke all on member_import_private.conversions from public,anon,authenticated,service_role;

create function member_import_private.convert_reviewed_member(
 source_hash text, source_row integer, expected_row_hash text, reviewed_plan jsonb
) returns uuid language plpgsql security invoker set search_path=pg_catalog as $$
declare
 source member_import_private.source_rows%rowtype;
 receipt member_import_private.conversions%rowtype;
 profile jsonb; membership jsonb; profile_uuid uuid; member_uuid uuid; expected_plan jsonb; field_name text;
 created_memberships uuid[]:='{}'; seen_classes uuid[]:='{}';
 class_uuid uuid; dojo_uuid uuid; rank_uuid uuid; membership_level public.membership_level;
begin
 if current_user<>'postgres' or session_user<>'postgres' then
  raise exception using errcode='42501',message='Reviewed owner conversion only'; end if;
 -- Serialize imports and ordinary profile/Auth writes. Never merge a collision.
 perform pg_advisory_xact_lock(620251026);
 lock table auth.users in share row exclusive mode;
 lock table public.profiles in share row exclusive mode;
 lock table member_import_private.conversion_class_map,member_import_private.conversion_dojo_map,
  member_import_private.conversion_rank_map in share mode;
 select * into source from member_import_private.source_rows s
 where s.source_sha256=source_hash and s.sheet_name='MEMBER DATA' and s.row_number=source_row for update;
 if not found or source.disposition<>'pending_member_conversion'
  or source.row_sha256 is distinct from expected_row_hash
  or source.row_sha256<>encode(sha256(convert_to(source.source_json,'UTF8')),'hex') then
  raise exception using errcode='23514',message='Source is not an eligible verified row'; end if;
 select * into receipt from member_import_private.conversions c
 where c.source_sha256=source_hash and c.sheet_name='MEMBER DATA' and c.row_number=source_row;
 if found then
  if receipt.reviewed_plan is distinct from reviewed_plan or receipt.row_sha256<>expected_row_hash then
   raise exception using errcode='23514',message='Converted source plan differs; do not overwrite'; end if;
  return receipt.profile_id;
 end if;
 if jsonb_typeof(reviewed_plan) is distinct from 'object'
  or (reviewed_plan-array['profile','memberships'])<>'{}'::jsonb
  or jsonb_typeof(reviewed_plan->'profile') is distinct from 'object'
  or jsonb_typeof(reviewed_plan->'memberships') is distinct from 'array'
  or jsonb_array_length(reviewed_plan->'memberships') not between 1 and 6 then
  raise exception using errcode='23514',message='Explicit reviewed profile and memberships required'; end if;
 profile:=reviewed_plan->'profile';
 if (profile-array['registration_number','full_name','email','phone','date_of_birth','account_status'])<>'{}'::jsonb
  or not(profile ?& array['registration_number','full_name','email','phone','date_of_birth','account_status'])
  or nullif(btrim(profile->>'registration_number'),'') is null
  or nullif(btrim(profile->>'full_name'),'') is null
  or (profile->>'account_status') not in ('active','disabled') then
  raise exception using errcode='23514',message='Invalid reviewed profile fields'; end if;
 foreach field_name in array array['registration_number','full_name','email','phone','date_of_birth','account_status'] loop
  if jsonb_typeof(profile->field_name) not in ('string','null') then
   raise exception using errcode='23514',message='Reviewed scalar has unexpected JSON type'; end if;
 end loop;
 -- Use exactly the application's existing name/contact normalization before
 -- reserving the tuple. The receipt retains the original reviewed values.
 profile:=profile||jsonb_build_object(
  'full_name',initcap(regexp_replace(btrim(profile->>'full_name'),'\s+',' ','g')),
  'email',lower(btrim(profile->>'email')),
  'phone',nullif(regexp_replace(btrim(profile->>'phone'),'\s+',' ','g'),''));
 expected_plan:=member_import_private.derive_member_plan(source_hash,source.source_json::jsonb);
 if jsonb_set(reviewed_plan,'{profile}',profile) is distinct from expected_plan then
  raise exception using errcode='23514',message='Reviewed plan differs from original source row and reference mappings'; end if;
 if (profile->>'date_of_birth')::date>current_date then
  raise exception using errcode='23514',message='Future birth date is invalid'; end if;
 -- Owner identities can never be recreated from the historic workbook.
 if upper(profile->>'registration_number') in ('JS-0103','SUPERADMIN')
  or exists(select 1 from public.profiles p where lower(p.registration_number)=lower(profile->>'registration_number')
    or (profile->>'email' is not null and lower(p.email)=lower(profile->>'email')))
  or exists(select 1 from auth.users u where profile->>'email' is not null and lower(u.email)=lower(profile->>'email')) then
  raise exception using errcode='23505',message='Existing identity must be reconciled, not overwritten'; end if;
 profile_uuid:=gen_random_uuid();
 insert into same_id_import_private.reservations(profile_id,source_hash,source_row,expected_profile)
 values(profile_uuid,source_hash,source_row,profile);
 insert into public.profiles(id,member_origin,registration_number,full_name,email,phone,date_of_birth,account_status)
 values(profile_uuid,'import',profile->>'registration_number',profile->>'full_name',profile->>'email',
  profile->>'phone',(profile->>'date_of_birth')::date,(profile->>'account_status')::public.account_status);
 for membership in select value from jsonb_array_elements(reviewed_plan->'memberships') order by value->>'class_id' loop
  if jsonb_typeof(membership)<>'object'
   or (membership-array['class_id','dojo_id','rank_id','status','joined_date','inactive_since'])<>'{}'::jsonb
   or not(membership ?& array['class_id','dojo_id','rank_id','status','joined_date','inactive_since'])
   or (membership->>'status') not in ('active','inactive','break_1','break_2')
   or membership->>'status' is null then
   raise exception using errcode='23514',message='Invalid reviewed membership fields'; end if;
  class_uuid:=(membership->>'class_id')::uuid;dojo_uuid:=(membership->>'dojo_id')::uuid;rank_uuid:=(membership->>'rank_id')::uuid;
  if class_uuid is null or dojo_uuid is null or class_uuid=any(seen_classes) then
   raise exception using errcode='23514',message='One membership per explicit class required'; end if;
  seen_classes:=array_append(seen_classes,class_uuid);
  perform 1 from public.classes c where c.id=class_uuid and (c.is_active or membership->>'status'='inactive') for share;
  if not found then raise exception using errcode='23514',message='Class missing or inactive for requested status'; end if;
  perform 1 from public.dojos d where d.id=dojo_uuid and d.class_id=class_uuid for share;
  if not found then raise exception using errcode='23514',message='Dojo/class mismatch'; end if;
  membership_level:='mudansha';
  if rank_uuid is not null then
   select r.level into membership_level from public.ranks r where r.id=rank_uuid and r.class_id=class_uuid for share;
   if not found or membership_level is null then raise exception using errcode='23514',message='Grade/class mismatch or classification missing'; end if;
  end if;
  if (membership->>'joined_date')::date>current_date
   or (membership->>'inactive_since')::date>current_date
   or ((membership->>'inactive_since') is not null and membership->>'status'<>'inactive')
   or (membership->>'inactive_since')::date<(membership->>'joined_date')::date then
   raise exception using errcode='23514',message='Invalid historical dates'; end if;
  member_uuid:=gen_random_uuid();
  insert into public.class_memberships(id,user_id,class_id,dojo_id,rank_id,level,role,status,joined_date,break_count)
  values(member_uuid,profile_uuid,class_uuid,dojo_uuid,rank_uuid,membership_level,'user',
   (membership->>'status')::public.membership_status,(membership->>'joined_date')::date,
   case membership->>'status' when 'break_1' then 1 when 'break_2' then 2 else 0 end);
  created_memberships:=array_append(created_memberships,member_uuid);
 end loop;
 -- Keep source bytes/dispositions unchanged. The receipt preserves historical
 -- inactive-since values without inventing a status transition or assessment.
 insert into member_import_private.conversions(source_sha256,row_number,row_sha256,reviewed_plan,profile_id,membership_ids)
 values(source_hash,source_row,expected_row_hash,reviewed_plan,profile_uuid,created_memberships);
 return profile_uuid;
end $$;
revoke all on function member_import_private.convert_reviewed_member(text,integer,text,jsonb)
 from public,anon,authenticated,service_role;
