-- ============================================================
-- 019 ROUTE LEGACY NOTIFICATIONS TO EMAIL OUTBOX
-- ============================================================
--
-- Several restored trigger/RPC bodies still insert email work into the old
-- notification_outbox table. The application has only one supported delivery
-- worker, and it consumes email_outbox. Route every new legacy insert into that
-- durable queue without rewriting the large business functions that produced
-- the notification.
--
-- Existing notification_outbox rows are deliberately not backfilled here.
-- Automatically replaying an old queue could send stale or duplicate messages
-- to real recipients. Inventory and disposition of those rows is a separate,
-- recipient-reviewed staging/production operation.
-- ============================================================

begin;


create or replace function public.route_legacy_notification_to_email_outbox()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  queued_email_id uuid;
  legacy_template_data jsonb;
begin
  legacy_template_data :=
    jsonb_build_object(
      'title', new.subject,
      'message', coalesce(
        nullif(new.payload ->> 'message', ''),
        new.subject
      ),
      'legacy_notification_id', new.id
    )
    || coalesce(new.payload, '{}'::jsonb);

  queued_email_id := public.queue_email(
    target_email => new.recipient_email,
    target_email_type => new.event_type,
    target_subject => new.subject,
    target_template_data => legacy_template_data,
    target_user_id => new.user_id,
    target_reference_type => 'legacy_notification',
    target_reference_id => null,
    target_dedupe_key => 'notification-outbox/' || new.id::text
  );

  if queued_email_id is null then
    raise exception 'Legacy notification could not be queued';
  end if;

  -- Suppress the obsolete row. The email_outbox insert above is part of the
  -- same transaction, so the business action and notification remain atomic.
  return null;
end;
$$;


revoke execute
on function public.route_legacy_notification_to_email_outbox()
from public, anon, authenticated;

grant execute
on function public.route_legacy_notification_to_email_outbox()
to service_role;


drop trigger if exists route_legacy_notification_to_email_outbox_trigger
on public.notification_outbox;

create trigger route_legacy_notification_to_email_outbox_trigger
before insert on public.notification_outbox
for each row
execute function public.route_legacy_notification_to_email_outbox();


comment on function public.route_legacy_notification_to_email_outbox() is
  'Compatibility adapter that atomically routes legacy notification_outbox inserts into the durable email_outbox queue.';


notify pgrst, 'reload schema';

commit;
