begin;
-- Preserve the public active-class list; only active Super Admin gains the
-- missing inactive-class SELECT needed by the existing management screens.
create policy "active super admin reads all classes"
on public.classes for select to authenticated
using (public.is_super_admin(auth.uid()) and public.is_active_app_user(auth.uid()));

-- Dojo names are entered intentionally. Normalize whitespace without forcing
-- acronym capitalization (KAC, UBM) back to title case on every update.
create or replace function public.normalize_dojo_fields()
returns trigger language plpgsql set search_path to pg_catalog as $$
begin
 if new.name is not null then
  new.name:=regexp_replace(trim(new.name),'\s+',' ','g');
 end if;
 return new;
end;
$$;
alter function public.normalize_dojo_fields() owner to postgres;
revoke all on function public.normalize_dojo_fields() from public,anon,authenticated,service_role;
notify pgrst,'reload schema';
commit;
