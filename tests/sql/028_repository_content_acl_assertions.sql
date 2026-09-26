do $assertions$
begin
  if has_table_privilege('authenticated', 'public.content', 'INSERT')
     or has_table_privilege('authenticated', 'public.content', 'UPDATE')
     or has_table_privilege('authenticated', 'public.content', 'DELETE') then
    raise exception 'Authenticated retained a direct content mutation privilege';
  end if;

  if not has_table_privilege('authenticated', 'public.content', 'SELECT') then
    raise exception 'Authenticated lost SELECT on content';
  end if;

  if not has_table_privilege('service_role', 'public.content', 'INSERT,UPDATE,DELETE') then
    raise exception 'Service role content mutation access changed';
  end if;

  if has_table_privilege('anon', 'public.content', 'INSERT,UPDATE,DELETE') then
    raise exception 'Anonymous gained content mutation access';
  end if;

  raise notice 'MIGRATION_028_RUNTIME_PASS';
end
$assertions$;
