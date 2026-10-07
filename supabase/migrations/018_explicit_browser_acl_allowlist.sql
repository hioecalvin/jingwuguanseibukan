-- ============================================================
-- 018 EXPLICIT BROWSER ACL ALLOWLIST
-- ============================================================
--
-- A side-effect-minimized restore using pg_restore --no-acl exposed two
-- assumptions in the live schema:
-- - RLS-protected application relations relied on broad inherited defaults;
-- - browser-facing SECURITY DEFINER RPCs relied on pre-existing EXECUTE ACLs.
--
-- Make the browser contract explicit. Remove relation privileges that bypass
-- or sit outside row-level policy enforcement (including TRUNCATE, REFERENCES,
-- TRIGGER and MAINTAIN), then grant only policy-backed operations and the RPC
-- names referenced by the reviewed application. Service-role access remains
-- available to guarded server workers.
-- ============================================================

begin;


revoke all privileges
on all tables in schema public
from public, anon, authenticated;

revoke all privileges
on all sequences in schema public
from public, anon, authenticated;

revoke execute
on all functions in schema public
from public, anon, authenticated;

grant usage on schema public to anon, authenticated, service_role;


-- Unauthenticated registration needs only the active class and dojo catalogs.

grant select
on table public.classes, public.dojos
to anon;


-- Authenticated SELECT privileges are paired with existing RLS policies. The
-- two admin views use security_invoker and therefore also require SELECT on
-- their RLS-protected base relations.

grant select
on table
  public.admin_dojo_transfer_requests,
  public.admin_visible_members,
  public.admin_visible_requests,
  public.announcements,
  public.class_memberships,
  public.class_requests,
  public.classes,
  public.content,
  public.dojo_admin_assignments,
  public.dojo_migration_history,
  public.dojo_settlement_items,
  public.dojo_settlements,
  public.dojo_subscription_settings,
  public.dojo_transfer_requests,
  public.dojos,
  public.event_classes,
  public.events,
  public.membership_fee_adjustment_history,
  public.membership_grade_history,
  public.membership_payments,
  public.membership_status_history,
  public.membership_subscription_charges,
  public.membership_subscription_overrides,
  public.notifications,
  public.profiles,
  public.push_subscriptions,
  public.ranks,
  public.sub_ranks
to authenticated;


-- Direct browser mutations exist only on relations with matching RLS policy
-- commands. All other mutations remain RPC-only.

grant insert
on table
  public.admin_dojo_transfer_requests,
  public.announcements,
  public.classes,
  public.content,
  public.dojo_transfer_requests,
  public.dojos,
  public.event_classes,
  public.events,
  public.push_subscriptions,
  public.ranks,
  public.sub_ranks
to authenticated;

grant update
on table
  public.announcements,
  public.classes,
  public.content,
  public.dojos,
  public.event_classes,
  public.events,
  public.push_subscriptions,
  public.ranks,
  public.sub_ranks
to authenticated;

grant delete
on table
  public.announcements,
  public.event_classes,
  public.events,
  public.push_subscriptions,
  public.ranks,
  public.sub_ranks
to authenticated;


-- The admin member view reads grading dates through this table. The prior RLS
-- configuration had no SELECT policy, so security_invoker would otherwise
-- suppress the date even for the Member or a correctly scoped Admin.

drop policy if exists "grade history own or scoped admin"
on public.membership_grade_history;

create policy "grade history own or scoped admin"
on public.membership_grade_history
for select
to authenticated
using (
  exists (
    select 1
    from public.class_memberships as membership
    where membership.id = membership_grade_history.membership_id
      and (
        membership.user_id = auth.uid()
        or public.is_super_admin()
        or public.is_class_admin(
          membership.class_id,
          membership.dojo_id
        )
      )
  )
);


-- Grant every overload of each reviewed browser RPC name. The list is derived
-- from static application call sites plus helpers used by RLS and views. A
-- missing name aborts the migration so code/schema drift cannot silently pass.

do $acl$
declare
  routine_name text;
  routine_record record;
  routine_count integer;
  browser_routines constant text[] := array[
    'apply_membership_fee_adjustment',
    'assign_dojo_admin',
    'can_access_dojo_finance',
    'can_manage_class',
    'can_manage_dojo',
    'cancel_admin_dojo_transfer',
    'cancel_admin_dojo_transfer_batch',
    'cancel_class_enrollment_request',
    'cancel_dojo_settlement',
    'cancel_failed_admin_dojo_transfer',
    'cancel_failed_admin_dojo_transfer_batch',
    'cancel_my_membership_break_request',
    'create_class',
    'create_dojo_settlement',
    'create_grade_certificate',
    'create_member_report_audit',
    'create_repository_content',
    'delete_repository_content',
    'disable_my_push_subscription',
    'generate_and_notify_monthly_subscriptions',
    'get_active_grading_assessors',
    'get_admin_class_enrollment_requests',
    'get_admin_dojo_transfer_requests',
    'get_admin_member_subscription_summary',
    'get_available_dojo_admin_assignments',
    'get_certificate_history',
    'get_certificate_print_log',
    'get_dojo_admin_settlements',
    'get_dojo_financial_report',
    'get_dojo_migration_history',
    'get_dojo_monthly_payment_summary',
    'get_dojo_payment_confirmations',
    'get_dojo_receiving_account',
    'get_dojo_settlement_configs',
    'get_dojo_settlement_items',
    'get_latest_valid_rank_promotion',
    'get_latest_valid_title_appointment',
    'get_manageable_membership_break_requests',
    'get_member_report_history',
    'get_membership_grade_history_with_assessor',
    'get_membership_title_history',
    'get_membership_title_name',
    'get_my_available_class_enrollments',
    'get_my_charge_receiving_account',
    'get_my_class_enrollment_requests',
    'get_my_dojo_settlement_config',
    'get_my_membership_break_requests',
    'get_my_notifications',
    'get_my_payment_confirmations',
    'get_my_unread_notification_count',
    'get_next_membership_promotion',
    'get_official_member_record',
    'get_or_create_title_certificate',
    'get_settlement_eligible_payments',
    'get_super_admin_settlements',
    'grant_membership_title',
    'has_repository_access',
    'is_class_admin',
    'is_super_admin',
    'log_title_certificate_print',
    'mark_all_notifications_read',
    'mark_notification_read',
    'notify_monthly_subscription_charges',
    'notify_unpaid_subscription_reminders',
    'promote_membership',
    'queue_event_email',
    'record_membership_break',
    'record_membership_payment',
    'remove_member_subscription_rate',
    'rename_class',
    'request_admin_dojo_transfer_batch',
    'request_class_enrollment',
    'request_dojo_transfer',
    'request_membership_break',
    'retry_failed_admin_dojo_transfer',
    'retry_failed_admin_dojo_transfer_batch',
    'return_membership_active',
    'review_admin_dojo_transfer',
    'review_admin_dojo_transfer_batch',
    'review_class_enrollment_request',
    'review_class_request',
    'review_dojo_settlement',
    'review_dojo_transfer',
    'review_membership_break_request',
    'review_membership_payment_confirmation',
    'revoke_dojo_admin',
    'revoke_membership_title',
    'save_my_push_subscription',
    'search_document_archive',
    'set_aikikai_registration_number',
    'set_class_active',
    'set_class_logo',
    'set_class_title_system',
    'set_dojo_receiving_account',
    'set_dojo_settlement_transfer',
    'set_dojo_subscription_rate',
    'set_grading_assessor_status',
    'set_member_id',
    'set_member_subscription_rate',
    'set_membership_inactive',
    'set_membership_joined_date',
    'set_membership_level',
    'submit_dojo_settlement',
    'submit_membership_payment_confirmation',
    'undo_last_membership_promotion',
    'update_my_avatar',
    'update_my_whatsapp',
    'update_repository_content'
  ];
begin
  foreach routine_name in array browser_routines
  loop
    select count(*)
    into routine_count
    from pg_proc as procedure_data
    join pg_namespace as namespace
      on namespace.oid = procedure_data.pronamespace
    where namespace.nspname = 'public'
      and procedure_data.proname = routine_name
      and procedure_data.prokind = 'f';

    if routine_count = 0 then
      raise exception 'Missing reviewed browser routine: %', routine_name;
    end if;

    for routine_record in
      select
        procedure_data.proname,
        pg_get_function_identity_arguments(
          procedure_data.oid
        ) as identity_arguments
      from pg_proc as procedure_data
      join pg_namespace as namespace
        on namespace.oid = procedure_data.pronamespace
      where namespace.nspname = 'public'
        and procedure_data.proname = routine_name
        and procedure_data.prokind = 'f'
    loop
      execute format(
        'grant execute on function public.%I(%s) to authenticated',
        routine_record.proname,
        routine_record.identity_arguments
      );
    end loop;
  end loop;
end
$acl$;


-- Guarded server routes use the service role. Keep their database access
-- explicit after the blanket revokes above.

grant all privileges
on all tables in schema public
to service_role;

grant all privileges
on all sequences in schema public
to service_role;

grant execute
on all functions in schema public
to service_role;


notify pgrst, 'reload schema';

commit;
