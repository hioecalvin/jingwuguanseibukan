-- LOCAL DESIGN CANDIDATE ONLY: NOT a deployable migration.
-- Keeps permanent member UUIDs equal to their eventual Auth UUID. Claim
-- provisioning is deliberately disabled until its provider/trigger proof exists.
begin;
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
commit;
