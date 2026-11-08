-- LOCAL ONLY: captured SELECT policies and helpers from 8 October staging metadata.
-- Simplified synthetic tables; not complete live RLS, grants, Auth, or schema evidence.
do $$ begin if inet_server_addr() is distinct from '127.0.0.1'::inet then raise exception 'Local only';end if;end $$;
CREATE OR REPLACE FUNCTION public.is_super_admin(uid uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$
;
CREATE OR REPLACE FUNCTION public.is_active_app_user(target_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select
    target_user_id is not null
    and (
      target_user_id = auth.uid()
      or coalesce(auth.role(), '') = 'service_role'
    )
    and exists (
      select 1
      from public.profiles as profile
      where profile.id = target_user_id
        and profile.account_status = 'active'
        and profile.date_of_passing is null
    );
$function$
;
CREATE OR REPLACE FUNCTION public.is_class_admin(target_class uuid, target_dojo uuid DEFAULT NULL::uuid, uid uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$
;
alter table public.profiles enable row level security;
grant select on public.profiles to authenticated;
alter table public.class_memberships enable row level security;
grant select on public.class_memberships to authenticated;
alter table public.dojo_admin_assignments enable row level security;
grant select on public.dojo_admin_assignments to authenticated;
alter table public.membership_subscription_charges enable row level security;
grant select on public.membership_subscription_charges to authenticated;
alter table public.membership_payments enable row level security;
grant select on public.membership_payments to authenticated;
alter table public.membership_fee_adjustment_history enable row level security;
grant select on public.membership_fee_adjustment_history to authenticated;
create policy "admin scoped memberships" on public.class_memberships for select to authenticated using ((is_super_admin() OR is_class_admin(class_id, dojo_id)));
create policy "own memberships" on public.class_memberships for select to authenticated using (((user_id = auth.uid()) AND is_active_app_user(auth.uid())));
create policy "read authorised dojo admin assignments" on public.dojo_admin_assignments for select to authenticated using ((is_super_admin() OR (user_id = auth.uid())));
create policy "finance admin read fee adjustment history" on public.membership_fee_adjustment_history for select to authenticated using (can_access_dojo_finance(dojo_id, auth.uid()));
create policy "member read own fee adjustment history" on public.membership_fee_adjustment_history for select to authenticated using ((EXISTS ( SELECT 1
   FROM class_memberships cm
  WHERE ((cm.id = membership_fee_adjustment_history.membership_id) AND (cm.user_id = auth.uid())))));
create policy "read membership payments" on public.membership_payments for select to authenticated using ((EXISTS ( SELECT 1
   FROM class_memberships cm
  WHERE ((cm.id = membership_payments.membership_id) AND ((cm.user_id = auth.uid()) OR can_access_dojo_finance(membership_payments.dojo_id, auth.uid()))))));
create policy "read membership subscription charges" on public.membership_subscription_charges for select to authenticated using ((EXISTS ( SELECT 1
   FROM class_memberships cm
  WHERE ((cm.id = membership_subscription_charges.membership_id) AND ((cm.user_id = auth.uid()) OR can_access_dojo_finance(membership_subscription_charges.dojo_id, auth.uid()))))));
create policy "admin scoped profiles" on public.profiles for select to authenticated using ((is_super_admin() OR ((date_of_passing IS NULL) AND (EXISTS ( SELECT 1
   FROM class_memberships target
  WHERE ((target.user_id = profiles.id) AND is_class_admin(target.class_id, target.dojo_id)))))));
create policy "own profile" on public.profiles for select to authenticated using (((id = auth.uid()) AND (account_status = 'active'::account_status) AND (date_of_passing IS NULL)));
