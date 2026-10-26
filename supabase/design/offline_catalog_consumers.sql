-- LOCAL ONLY. Apply after the pinned complete schema and identity candidates.
begin;
do $patch$
declare definition text; routine text; marker text;
begin
 if inet_server_addr() is distinct from '127.0.0.1'::inet
   or current_setting('jwg.claim_local',true) is distinct from 'on' then
  raise exception 'Disposable local catalog integration required'; end if;
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
commit;
