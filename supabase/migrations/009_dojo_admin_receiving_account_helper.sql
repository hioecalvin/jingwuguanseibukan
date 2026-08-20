-- ============================================================
-- 009 DOJO ADMIN RECEIVING ACCOUNT HELPER
-- ============================================================

create or replace function public.get_dojo_receiving_account(
  target_dojo_id uuid
)
returns table (
  bank_name text,
  account_holder_name text,
  account_number text,
  instructions text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin

  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.can_access_dojo_finance(
    target_dojo_id,
    auth.uid()
  ) then
    raise exception 'You do not have financial access to this dojo';
  end if;

  return query
  select
    a.bank_name,
    a.account_holder_name,
    a.account_number,
    a.instructions
  from public.dojo_receiving_accounts a
  where a.dojo_id = target_dojo_id
    and a.active = true
  order by a.created_at desc
  limit 1;

end;
$$;

grant execute
on function public.get_dojo_receiving_account(uuid)
to authenticated;

select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name = 'get_dojo_receiving_account';
