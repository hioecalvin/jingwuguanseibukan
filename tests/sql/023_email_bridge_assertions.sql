set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

insert into public.notification_outbox (
  user_id,
  recipient_email,
  event_type,
  subject,
  payload
) values (
  '11111111-1111-4111-8111-111111111111',
  '  MEMBER@EXAMPLE.INVALID  ',
  'class_request_approved',
  'Class registration approved',
  '{"class":"Aikido","status":"approved"}'::jsonb
);

do $$
declare
  queued public.email_outbox%rowtype;
begin
  if (select count(*) from public.notification_outbox) <> 0 then
    raise exception 'Legacy row was not suppressed';
  end if;

  if (select count(*) from public.email_outbox) <> 1 then
    raise exception 'Expected exactly one durable email row';
  end if;

  select * into strict queued from public.email_outbox;

  if queued.recipient_email <> 'member@example.invalid'
     or queued.email_type <> 'class_request_approved'
     or queued.subject <> 'Class registration approved'
     or queued.status <> 'pending'
     or queued.created_by <> '11111111-1111-4111-8111-111111111111'::uuid
     or queued.template_data ->> 'title' <> 'Class registration approved'
     or queued.template_data ->> 'message' <> 'Class registration approved'
     or queued.template_data ->> 'class' <> 'Aikido'
     or queued.template_data ->> 'status' <> 'approved'
     or queued.template_data ->> 'legacy_notification_id' <> '1'
     or queued.dedupe_key <> 'notification-outbox/1'
  then
    raise exception 'Durable email row did not preserve the legacy notification';
  end if;

  if has_function_privilege('anon', 'public.route_legacy_notification_to_email_outbox()', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.route_legacy_notification_to_email_outbox()', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.route_legacy_notification_to_email_outbox()', 'EXECUTE')
  then
    raise exception 'Email bridge function grants are unsafe';
  end if;
end;
$$;
