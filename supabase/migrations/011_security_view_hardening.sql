-- ============================================================
-- 011 SECURITY VIEW HARDENING
-- ============================================================
--
-- PostgreSQL views execute with the view owner's privileges by default.
-- That allowed authenticated Members to bypass the RLS policies on the
-- underlying profile, membership, and archive tables.
--
-- Verified before this migration:
-- - a normal Member could read all rows from admin_visible_members;
-- - a scoped Admin could read Members from every class and dojo;
-- - a normal Member could read other Members' document_archive metadata.
-- ============================================================

begin;


-- The admin member view is used throughout the existing Admin UI. Make the
-- view obey the caller's base-table RLS policies and keep it unavailable to
-- anonymous clients.

alter view if exists public.admin_visible_members
set (security_invoker = true);

revoke all
on public.admin_visible_members
from public, anon;

grant select
on public.admin_visible_members
to authenticated, service_role;


-- Apply the same caller-policy semantics to the legacy request view.

alter view if exists public.admin_visible_requests
set (security_invoker = true);

revoke all
on public.admin_visible_requests
from public, anon;

grant select
on public.admin_visible_requests
to authenticated, service_role;


-- Archive views are implementation details behind scoped SECURITY DEFINER
-- search functions. They must not be directly queryable by browser roles.

revoke all
on public.document_archive
from public, anon, authenticated;

revoke all
on public.certificate_archive
from public, anon, authenticated;

grant select
on public.document_archive
to service_role;

grant select
on public.certificate_archive
to service_role;


-- Migration 010 creates trigger helpers. Triggers do not require browser
-- EXECUTE grants; leaving these helpers callable would let any authenticated
-- Member fan out notifications for arbitrary events or announcements.

-- The verified migration ledger records 010, but restored live-schema evidence
-- can legitimately lack one or more of these helpers. Revoke only signatures
-- that exist so hardening remains safe across that recorded schema drift.
do $$
declare
  function_signature text;
begin
  foreach function_signature in array array[
    'public.notify_announcement_published(uuid)',
    'public.notify_event_created(uuid)',
    'public.notify_event_updated(uuid)',
    'public.handle_announcement_notification()',
    'public.handle_event_notification()'
  ]
  loop
    if to_regprocedure(function_signature) is not null then
      execute format(
        'revoke execute on function %s from public, anon, authenticated',
        function_signature
      );
    end if;
  end loop;
end;
$$;


notify pgrst, 'reload schema';

commit;
