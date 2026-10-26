-- LOCAL PROTOTYPE ONLY. Not a deployable migration or full offline foundation.
-- Retain the exact captured production functions; change only offline routing.
begin;
do $guard$
declare definition text; marker text;
begin
 if current_setting('jwg.offline_delivery_local',true) is distinct from 'on'
    or inet_server_addr() is distinct from '127.0.0.1'::inet then
  raise exception 'Disposable loopback delivery lab required';
 end if;
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
commit;
