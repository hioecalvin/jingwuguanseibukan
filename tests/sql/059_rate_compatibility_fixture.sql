-- Synthetic rate tables only; load the unmodified resolver from migration 030.
-- This fixture does NOT restore the complete Supabase catalog, RLS or row data.
create table public.membership_subscription_overrides(
 id uuid primary key default gen_random_uuid(),membership_id uuid,special_fee numeric,currency text,
 effective_from date,effective_until date,active boolean default true,created_at timestamptz default now());
create table public.dojo_subscription_rate_history(
 id uuid primary key default gen_random_uuid(),dojo_id uuid,class_id uuid,new_fee numeric,new_currency text,
 old_fee numeric,old_currency text,effective_from date,changed_at timestamptz default now());
create table public.dojo_subscription_settings(
 id uuid primary key default gen_random_uuid(),dojo_id uuid,class_id uuid,default_fee numeric,currency text,
 effective_from date,active boolean default true,updated_at timestamptz default now());
-- The basic fixture's unnamed parameters cannot be replaced by named parameters.
drop function public.get_membership_subscription_rate(uuid,date);
