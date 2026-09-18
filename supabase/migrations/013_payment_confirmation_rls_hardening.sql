-- ============================================================
-- 013 PAYMENT CONFIRMATION RLS HARDENING
-- ============================================================
-- Migration 007 exposes all payment-confirmation operations through scoped
-- SECURITY DEFINER RPCs, but did not enable RLS or revoke the table privileges
-- Supabase commonly grants to browser roles through default privileges.
-- Keep these tables RPC-only so account numbers, transfer notes, and review
-- history cannot be queried or changed directly from a browser client.
-- ============================================================

begin;


alter table if exists public.dojo_receiving_accounts
enable row level security;

alter table if exists public.membership_payment_confirmations
enable row level security;


revoke all
on table public.dojo_receiving_accounts
from public, anon, authenticated;

revoke all
on table public.membership_payment_confirmations
from public, anon, authenticated;


grant all
on table public.dojo_receiving_accounts
to service_role;

grant all
on table public.membership_payment_confirmations
to service_role;


-- PostgreSQL grants function execution to PUBLIC by default. Authentication is
-- also checked inside every RPC, but these explicit grants make the API surface
-- least-privilege and prevent anonymous calls from reaching the function body.

revoke execute
on function public.set_dojo_receiving_account(uuid, text, text, text, text)
from public, anon;

revoke execute
on function public.get_my_charge_receiving_account(uuid)
from public, anon;

revoke execute
on function public.submit_membership_payment_confirmation(uuid, numeric, text, date, text)
from public, anon;

revoke execute
on function public.get_dojo_payment_confirmations(uuid, text)
from public, anon;

revoke execute
on function public.review_membership_payment_confirmation(uuid, text, text)
from public, anon;

revoke execute
on function public.get_my_payment_confirmations()
from public, anon;

revoke execute
on function public.get_dojo_receiving_account(uuid)
from public, anon;


grant execute
on function public.set_dojo_receiving_account(uuid, text, text, text, text)
to authenticated;

grant execute
on function public.get_my_charge_receiving_account(uuid)
to authenticated;

grant execute
on function public.submit_membership_payment_confirmation(uuid, numeric, text, date, text)
to authenticated;

grant execute
on function public.get_dojo_payment_confirmations(uuid, text)
to authenticated;

grant execute
on function public.review_membership_payment_confirmation(uuid, text, text)
to authenticated;

grant execute
on function public.get_my_payment_confirmations()
to authenticated;

grant execute
on function public.get_dojo_receiving_account(uuid)
to authenticated;


notify pgrst, 'reload schema';

commit;
