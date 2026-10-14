-- Deliberate negative control, ONLY in the disposable local synthetic cluster.
-- Never include in a staging rehearsal: these identity advances do NOT roll back.
do $negative$
declare f jsonb := (select ids from pg_temp.finance_fixture); b record; digest text;
begin
  if inet_server_addr() is distinct from '127.0.0.1'::inet
    or current_setting('jwg.fixture_context',true) is distinct from 'synthetic-local-only' then
    raise exception 'Sequence negative control is local-only';
  end if;
  begin
    update public.class_memberships set status='break_1' where id=(f->>'memberA')::uuid;
    raise exception 'Rollback deliberately consumed synthetic identities' using errcode='Z0591';
  exception when sqlstate 'Z0591' then null; end;
  assert (select status::text='active' from public.class_memberships where id=(f->>'memberA')::uuid);
  select * into strict b from pg_temp.finance_fixture_baseline;
  select md5(coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text)::text,'[]')) into digest from public.membership_status_history t;
  assert digest=b.status_digest,'Audit rows rolled back';
  select md5(coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text)::text,'[]')) into digest from public.notification_outbox t;
  assert digest=b.outbox_digest,'Outbox rows rolled back';
  assert (select jsonb_build_array(last_value::text,is_called)<>b.status_sequence from public.membership_status_history_id_seq),'Guard detects surviving audit identity advance';
  assert (select jsonb_build_array(last_value::text,is_called)<>b.outbox_sequence from public.notification_outbox_id_seq),'Guard detects surviving outbox identity advance';
  raise notice 'PASS: local negative control proves restored audit/outbox rows do not prove unchanged identity sequences';
end $negative$;
