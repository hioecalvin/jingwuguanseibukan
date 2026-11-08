-- PREPARATION: executable ONLY by the disposable loopback test runner today.
-- No Auth/profile writes, existing-membership updates or shared generators.
-- Future staging execution requires a separately reviewed wrapper and approval.
do $guard$
begin
  if inet_server_addr() is distinct from '127.0.0.1'::inet
     or current_setting('jwg.fixture_context',true) is distinct from 'synthetic-local-only'
     or current_setting('transaction_read_only') <> 'off' then
    raise exception 'Finance fixture is restricted to the synthetic loopback runner';
  end if;
end $guard$;

-- Owner-only baseline: do not assume audit/outbox tables or sequences are unused.
create temporary table finance_fixture_baseline on commit drop as
select
 (select md5(coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text)::text,'[]')) from public.membership_status_history t) as status_digest,
 (select md5(coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text)::text,'[]')) from public.notification_outbox t) as outbox_digest,
 (select jsonb_build_array(last_value::text,is_called) from public.membership_status_history_id_seq) as status_sequence,
 (select jsonb_build_array(last_value::text,is_called) from public.notification_outbox_id_seq) as outbox_sequence,
 (select coalesce(jsonb_agg(id order by id),'[]') from public.notifications) as notification_ids,
 (select md5(coalesce(jsonb_agg(to_jsonb(t) order by t.id)::text,'[]')) from public.notifications t) as notification_digest;
create temporary table finance_fixture(ids jsonb not null, actors_before jsonb not null) on commit drop;
grant select on pg_temp.finance_fixture to authenticated;
do $fixture$
declare
  actors jsonb := current_setting('jwg.fixture_actors')::jsonb;
  member_id uuid := (actors->>'member')::uuid;
  admin_id uuid := (actors->>'admin')::uuid;
  super_id uuid := (actors->>'superAdmin')::uuid;
  class_a uuid := gen_random_uuid(); class_b uuid := gen_random_uuid();
  dojo_a uuid := gen_random_uuid(); dojo_b uuid := gen_random_uuid();
  member_a uuid := gen_random_uuid(); member_b uuid := gen_random_uuid(); admin_a uuid := gen_random_uuid();
  assignment_a uuid := gen_random_uuid(); setting_a uuid := gen_random_uuid(); setting_b uuid := gen_random_uuid();
  bill_waive uuid := gen_random_uuid(); bill_skip uuid := gen_random_uuid();
  bill_first uuid := gen_random_uuid(); bill_second uuid := gen_random_uuid();
  today_month date := date_trunc('month',now() at time zone 'Asia/Jakarta')::date;
  baseline jsonb;
begin
  if member_id is null or admin_id is null or super_id is null
     or member_id=admin_id or member_id=super_id or admin_id=super_id then
    raise exception 'Three distinct bound fixture actors are required';
  end if;
  if (select count(*) from public.profiles where id in(member_id,admin_id,super_id)
      and account_status::text='active' and date_of_passing is null
      and is_super_admin=(id=super_id)) <> 3 then
    raise exception 'Fixture actors are missing or have unexpected eligibility/roles';
  end if;
  select jsonb_agg(to_jsonb(p) order by p.id) into baseline
    from public.profiles p where p.id in(member_id,admin_id,super_id);
  insert into pg_temp.finance_fixture values(jsonb_build_object(
    'member',member_id,'admin',admin_id,'superAdmin',super_id,
    'classA',class_a,'classB',class_b,'dojoA',dojo_a,'dojoB',dojo_b,
    'memberA',member_a,'memberB',member_b,'adminA',admin_a,
    'assignmentA',assignment_a,'settingA',setting_a,'settingB',setting_b,
    'waive',bill_waive,'skip',bill_skip,'first',bill_first,'second',bill_second),baseline);
  insert into public.classes(id,name) values
    (class_a,'Finance Fixture A '||class_a),(class_b,'Finance Fixture B '||class_b);
  insert into public.dojos(id,class_id,name,active) values
    (dojo_a,class_a,'Finance Fixture A '||dojo_a,true),(dojo_b,class_b,'Finance Fixture B '||dojo_b,true);
  -- INSERT only: never transition an existing status (identity-backed audit/outbox).
  insert into public.class_memberships(id,user_id,class_id,dojo_id,status) values
    (member_a,member_id,class_a,dojo_a,'active'),
    (member_b,member_id,class_b,dojo_b,'active'),
    (admin_a,admin_id,class_a,dojo_a,'active');
  insert into public.dojo_admin_assignments(id,user_id,class_id,dojo_id,active,assigned_by)
    values(assignment_a,admin_id,class_a,dojo_a,true,super_id);
  insert into public.dojo_subscription_settings(id,dojo_id,class_id,default_fee,currency,effective_from,active)
    values(setting_a,dojo_a,class_a,300000,'IDR',(today_month-interval '4 months')::date,true),
      (setting_b,dojo_b,class_b,300000,'IDR',(today_month-interval '4 months')::date,true);
  insert into public.membership_subscription_charges(id,membership_id,dojo_id,class_id,billing_month,amount,currency,rate_source)
    values(bill_waive,member_a,dojo_a,class_a,(today_month-interval '3 months')::date,300000,'IDR','dojo_default'),
      (bill_skip,member_a,dojo_a,class_a,(today_month-interval '2 months')::date,300000,'IDR','dojo_default'),
      (bill_first,member_a,dojo_a,class_a,(today_month-interval '1 month')::date,300000,'IDR','dojo_default'),
      (bill_second,member_a,dojo_a,class_a,today_month,300000,'IDR','dojo_default');
end $fixture$;
