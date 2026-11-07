create role anon nologin;
create role authenticated nologin;
create role service_role nologin;

create schema if not exists public;

create table public.content (
  id uuid primary key,
  title text not null
);

create function public.create_repository_content(
  uuid, uuid, uuid, text, text, text, text, text, integer
) returns uuid language sql as $$ select null::uuid $$;

create function public.update_repository_content(
  uuid, text, text, text, text, text, integer
) returns void language sql as $$ select $$;

create function public.delete_repository_content(uuid)
returns void language sql as $$ select $$;

grant select, insert, update on public.content to authenticated;
grant all privileges on public.content to service_role;
grant execute on function
  public.create_repository_content(uuid,uuid,uuid,text,text,text,text,text,integer),
  public.update_repository_content(uuid,text,text,text,text,text,integer),
  public.delete_repository_content(uuid)
to authenticated;
