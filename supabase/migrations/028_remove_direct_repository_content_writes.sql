-- Repository content is managed through authorization-checking RPCs and guarded
-- server routes. Browser roles retain policy-filtered SELECT only.

begin;

revoke insert, update, delete
on table public.content
from public, anon, authenticated;

do $verify$
begin
  if has_table_privilege('authenticated', 'public.content', 'INSERT')
     or has_table_privilege('authenticated', 'public.content', 'UPDATE')
     or has_table_privilege('authenticated', 'public.content', 'DELETE') then
    raise exception 'Authenticated still has a direct repository content mutation privilege';
  end if;

  if not has_table_privilege('authenticated', 'public.content', 'SELECT') then
    raise exception 'Authenticated repository content read privilege was removed';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.create_repository_content(uuid,uuid,uuid,text,text,text,text,text,integer)',
    'EXECUTE'
  ) or not has_function_privilege(
    'authenticated',
    'public.update_repository_content(uuid,text,text,text,text,text,integer)',
    'EXECUTE'
  ) or not has_function_privilege(
    'authenticated',
    'public.delete_repository_content(uuid)',
    'EXECUTE'
  ) then
    raise exception 'A reviewed repository content RPC is not executable by authenticated';
  end if;
end
$verify$;

commit;
