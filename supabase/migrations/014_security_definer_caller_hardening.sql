-- ============================================================
-- 014 SECURITY DEFINER CALLER HARDENING
-- ============================================================
--
-- Live catalog review found that the database default privileges expose new
-- tables, sequences, and functions to both browser roles. It also found 149
-- SECURITY DEFINER routines, including caller-identity helpers that accept an
-- arbitrary user UUID and internal processors reachable through PUBLIC/anon.
--
-- Bind identity helpers to the JWT caller, remove browser access from internal
-- processors/trigger helpers, and disable unsafe future default privileges.
-- ============================================================

begin;


create or replace function public.is_super_admin(
  uid uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    uid is not null
    and (
      uid = auth.uid()
      or coalesce(auth.role(), '') = 'service_role'
    )
    and coalesce(
      (
        select profile.is_super_admin
        from public.profiles as profile
        where profile.id = uid
      ),
      false
    );
$$;


create or replace function public.can_manage_dojo(
  target_dojo_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    target_user_id is not null
    and (
      target_user_id = auth.uid()
      or coalesce(auth.role(), '') = 'service_role'
    )
    and (
      public.is_super_admin(target_user_id)
      or exists (
        select 1
        from public.dojo_admin_assignments as assignment
        where assignment.user_id = target_user_id
          and assignment.dojo_id = target_dojo_id
          and assignment.active = true
      )
    );
$$;


create or replace function public.can_access_dojo_finance(
  target_dojo_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    target_user_id is not null
    and (
      target_user_id = auth.uid()
      or coalesce(auth.role(), '') = 'service_role'
    )
    and exists (
      select 1
      from public.dojo_admin_assignments as assignment
      where assignment.user_id = target_user_id
        and assignment.dojo_id = target_dojo_id
        and assignment.active = true
    );
$$;


create or replace function public.can_manage_class(
  target_class uuid,
  uid uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    uid is not null
    and (
      uid = auth.uid()
      or coalesce(auth.role(), '') = 'service_role'
    )
    and (
      public.is_super_admin(uid)
      or exists (
        select 1
        from public.class_memberships as membership
        where membership.user_id = uid
          and membership.class_id = target_class
          and membership.role = 'admin'
          and membership.status in ('active', 'break')
      )
    );
$$;


create or replace function public.is_class_admin(
  target_class uuid,
  target_dojo uuid default null,
  uid uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    uid is not null
    and (
      uid = auth.uid()
      or coalesce(auth.role(), '') = 'service_role'
    )
    and (
      public.is_super_admin(uid)
      or exists (
        select 1
        from public.dojo_admin_assignments as assignment
        where assignment.user_id = uid
          and assignment.class_id = target_class
          and assignment.active = true
          and (
            target_dojo is null
            or assignment.dojo_id = target_dojo
          )
      )
    );
$$;


create or replace function public.has_repository_access(
  target_class uuid,
  uid uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    uid is not null
    and (
      uid = auth.uid()
      or coalesce(auth.role(), '') = 'service_role'
    )
    and exists (
      select 1
      from public.class_memberships as membership
      join public.profiles as profile
        on profile.id = membership.user_id
      where membership.user_id = uid
        and membership.class_id = target_class
        and membership.status in ('active', 'break')
        and profile.account_status = 'active'
    );
$$;


-- Remove PUBLIC/anonymous access from every existing SECURITY DEFINER routine.
-- Authenticated grants already present on scoped application RPCs are retained.
-- Make pg_temp explicit and last so temporary objects cannot shadow public
-- relations. The reviewed public schema has no browser CREATE privilege.

do $$
declare
  routine_record record;
begin
  for routine_record in
    select
      namespace.nspname as schema_name,
      procedure_data.proname as routine_name,
      pg_get_function_identity_arguments(
        procedure_data.oid
      ) as identity_arguments
    from pg_proc as procedure_data
    join pg_namespace as namespace
      on namespace.oid = procedure_data.pronamespace
    where namespace.nspname = 'public'
      and procedure_data.prosecdef
  loop
    execute format(
      'alter function %I.%I(%s) set search_path = public, pg_temp',
      routine_record.schema_name,
      routine_record.routine_name,
      routine_record.identity_arguments
    );
    execute format(
      'revoke execute on function %I.%I(%s) from public, anon',
      routine_record.schema_name,
      routine_record.routine_name,
      routine_record.identity_arguments
    );
  end loop;
end
$$;


-- Trigger functions and these system/internal helpers are never browser RPCs.

do $$
declare
  routine_record record;
  routine_signature text;
  internal_routines constant text[] := array[
    'public.apply_due_admin_dojo_transfers()',
    'public.apply_due_membership_breaks(date)',
    'public.create_notification(uuid,text,text,text,text,uuid,jsonb)',
    'public.get_membership_grade_history(uuid)',
    'public.get_membership_subscription_rate(uuid,date)',
    'public.notify_dojo_admins(uuid,text,text,jsonb)',
    'public.process_monthly_membership_breaks(date)'
  ];
begin
  for routine_record in
    select
      namespace.nspname as schema_name,
      procedure_data.proname as routine_name,
      pg_get_function_identity_arguments(
        procedure_data.oid
      ) as identity_arguments
    from pg_proc as procedure_data
    join pg_namespace as namespace
      on namespace.oid = procedure_data.pronamespace
    where namespace.nspname = 'public'
      and procedure_data.prosecdef
      and procedure_data.prorettype = 'trigger'::regtype
  loop
    execute format(
      'revoke execute on function %I.%I(%s) from authenticated',
      routine_record.schema_name,
      routine_record.routine_name,
      routine_record.identity_arguments
    );
  end loop;

  foreach routine_signature in array internal_routines
  loop
    if to_regprocedure(routine_signature) is not null then
      execute format(
        'revoke execute on function %s from authenticated',
        routine_signature
      );
      execute format(
        'grant execute on function %s to service_role',
        routine_signature
      );
    end if;
  end loop;
end
$$;


-- New browser-facing relations and RPCs must receive explicit grants in their
-- own migration. PostgreSQL adds per-schema defaults to GLOBAL defaults:
-- an IN SCHEMA revoke cannot remove the built-in global PUBLIC EXECUTE grant.
-- This global revoke applies to future postgres-owned functions in ALL schemas;
-- it does not change existing function ACLs or another owner's defaults.

alter default privileges for role postgres
revoke execute on functions from public, anon, authenticated;

alter default privileges for role postgres in schema public
revoke all on tables from anon, authenticated;

alter default privileges for role postgres in schema public
revoke all on sequences from anon, authenticated;

alter default privileges for role postgres in schema public
revoke execute on functions from public, anon, authenticated;

-- The hosted `postgres` role is not a member of `supabase_admin`, so it cannot
-- alter that platform-owned role's defaults. Do not add those statements here:
-- they would abort the migration. Objects created by application migrations
-- must be owned by postgres and receive explicit grants.



notify pgrst, 'reload schema';

commit;
