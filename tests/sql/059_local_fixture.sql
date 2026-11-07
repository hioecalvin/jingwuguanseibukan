-- Synthetic-only fixture. NOT a Supabase migration or live acceptance script.
create role anon; create role authenticated; create role service_role;
create schema auth;
grant usage on schema auth to anon, authenticated, service_role;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create function auth.role() returns text language sql stable as $$ select 'authenticated'::text $$;
create table public.profiles(id uuid primary key, full_name text, account_status text default 'active',
  date_of_passing date, is_super_admin boolean default false);
create table public.dojos(id uuid primary key, name text, active boolean default true);
alter table public.dojos enable row level security;
grant select on public.dojos to anon,authenticated;
create policy "public dojo list" on public.dojos for select using (active=true);
create table public.dojo_admin_assignments(user_id uuid, dojo_id uuid, active boolean);
create table public.class_memberships(id uuid primary key, user_id uuid, dojo_id uuid, class_id uuid, status text);
create table public.membership_subscription_charges(id uuid primary key default gen_random_uuid(),
  membership_id uuid, dojo_id uuid, class_id uuid, billing_month date, amount numeric, currency text,
  rate_source text, status text default 'unpaid', generated_by uuid, unique(membership_id,billing_month));
create table public.membership_payment_confirmations(id uuid primary key default gen_random_uuid(),
  charge_id uuid, membership_id uuid, dojo_id uuid, submitted_by uuid, amount numeric, payment_method text,
  transfer_date date, member_note text, status text, reviewed_by uuid, reviewed_at timestamptz,
  rejection_reason text, created_at timestamptz default now());
create unique index membership_payment_confirmations_one_pending_per_charge_idx
  on public.membership_payment_confirmations(charge_id) where status = 'pending';
create table public.membership_payments(id uuid primary key default gen_random_uuid(), confirmation_id uuid,
  charge_id uuid, membership_id uuid, dojo_id uuid, amount numeric, currency text, payment_method text,
  payment_reference text, payment_date date, recorded_by uuid, recorded_at timestamptz default now(), notes text);
create unique index membership_payments_confirmation_unique_idx on public.membership_payments(confirmation_id);
-- Test-only failure injection verifies final-month rollback, including alerts.
create function public.fixture_fail_final_month() returns trigger language plpgsql as $$
begin
  if exists (select 1 from public.membership_subscription_charges c where c.id=new.charge_id
    and c.billing_month::text=nullif(current_setting('fixture.fail_' || tg_table_name,true),'')) then
    raise exception 'Synthetic final-month failure';
  end if;
  return new;
end $$;
create trigger fixture_payment_failure before insert on public.membership_payments
for each row execute function public.fixture_fail_final_month();
create trigger fixture_report_failure before insert on public.membership_payment_confirmations
for each row execute function public.fixture_fail_final_month();
create table public.notifications(id uuid default gen_random_uuid(), user_id uuid,
  notification_type text, title text, body text, entity_type text, entity_id uuid, metadata jsonb);
create table public.membership_fee_adjustment_history(
  id uuid primary key default gen_random_uuid(), membership_id uuid,charge_id uuid,dojo_id uuid,class_id uuid,
  adjustment_type text,effective_from date,effective_until date,old_amount numeric,new_amount numeric,
  currency text,reason text,changed_by uuid,changed_at timestamptz,
  constraint membership_fee_adjustment_history_type_check
    check (adjustment_type in ('this_month_only','this_month_onward','next_month_onward')));
create function public.create_notification(uuid,text,text,text,text,uuid,jsonb) returns uuid language plpgsql as $$
declare result uuid;
begin
  if current_setting('fixture.fail_notification',true)='yes' then
    raise exception 'Synthetic notification failure';
  end if;
  insert into public.notifications(user_id,notification_type,title,body,entity_type,entity_id,metadata)
  values($1,$2,$3,$4,$5,$6,$7) returning id into result; return result;
end $$;
create table public.fixture_rate(amount numeric, currency text);
insert into public.fixture_rate values(300000,'IDR');
create function public.get_membership_subscription_rate(uuid,date) returns table(amount numeric,currency text,rate_source text)
language sql as $$ select amount,currency,'dojo_default'::text from public.fixture_rate $$;
create function public.can_access_dojo_finance(uuid,uuid default auth.uid()) returns boolean language sql as $$ select false $$;
create function public.generate_dojo_monthly_subscription_charges(uuid,date) returns integer language sql as $$ select 0 $$;
insert into public.profiles(id,full_name,is_super_admin) values
 ('10000000-0000-4000-8000-000000000001','Synthetic Member',false),
 ('10000000-0000-4000-8000-000000000002','Synthetic Dojo Admin',false),
 ('10000000-0000-4000-8000-000000000003','Synthetic Super Admin',true),
 ('10000000-0000-4000-8000-000000000004','Synthetic Other Admin',false);
insert into public.dojos(id,name) values ('20000000-0000-4000-8000-000000000001','Synthetic Dojo');
insert into public.dojo_admin_assignments values
 ('10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001',true);
insert into public.class_memberships values
 ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','active');
