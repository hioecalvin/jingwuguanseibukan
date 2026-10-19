-- OFFLINE PROPOSAL. No live authorization or application implied.
-- First create the two buckets through the Storage API using bucket-plan.json.
-- One-shot install: any existing Storage policy (including this proposal) aborts.
-- No Storage metadata INSERT/UPDATE/DELETE, no bucket creation, no table grants.
begin;
lock table storage.objects in access exclusive mode;
do $guard$
begin
  if not (select relrowsecurity from pg_catalog.pg_class
          where oid = 'storage.objects'::regclass) then
    raise exception 'Storage RLS must already be enabled';
  end if;
  if exists (select 1 from pg_catalog.pg_policy
             where polrelid = 'storage.objects'::regclass) then
    raise exception 'Existing Storage policies require a separate review';
  end if;
  if pg_catalog.to_regprocedure('public.launch_image_can_write(text,text)') is not null then
    raise exception 'Existing helper requires a separate review';
  end if;
  if pg_catalog.to_regprocedure('public.is_active_app_user(uuid)') is null
     or pg_catalog.to_regprocedure('public.is_super_admin(uuid)') is null then
    raise exception 'Required authorization helpers missing';
  end if;
  if (select count(*) from storage.buckets
      where id in ('avatars','class-logos') and name = id and public = true
        and file_size_limit = 5242880
        and allowed_mime_types @> array['image/jpeg','image/png','image/webp']::text[]
        and allowed_mime_types <@ array['image/jpeg','image/png','image/webp']::text[]
        and cardinality(allowed_mime_types) = 3) <> 2 then
    raise exception 'Storage API bucket configuration must match reviewed plan';
  end if;
end;
$guard$;

create function public.launch_image_can_write(target_bucket text, object_name text)
returns boolean
language sql stable security definer
set search_path = pg_catalog
as $body$
  select coalesce(
    auth.role() = 'authenticated'
    and public.is_active_app_user(auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.must_change_password = false
    )
    and (
      (target_bucket = 'avatars'
       and object_name ~ '^[0-9a-f-]{36}/avatar\.(jpg|jpeg|png|webp)$'
       and split_part(object_name, '/', 1) = auth.uid()::text)
      or
      (target_bucket = 'class-logos'
       and public.is_super_admin(auth.uid())
       and object_name ~ '^[0-9a-f-]{36}/logo\.(jpg|jpeg|png|webp)$'
       and exists (
         select 1 from public.classes c
         where c.id::text = split_part(object_name, '/', 1)
       ))
    ), false
  );
$body$;
alter function public.launch_image_can_write(text,text) owner to postgres;
revoke all on function public.launch_image_can_write(text,text)
  from public, anon, authenticated, service_role;
grant execute on function public.launch_image_can_write(text,text) to authenticated;

create policy launch_avatar_select on storage.objects for select to authenticated
using (bucket_id = 'avatars' and public.launch_image_can_write(bucket_id, name));
create policy launch_avatar_insert on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and public.launch_image_can_write(bucket_id, name));
create policy launch_avatar_update on storage.objects for update to authenticated
using (bucket_id = 'avatars' and public.launch_image_can_write(bucket_id, name))
with check (bucket_id = 'avatars' and public.launch_image_can_write(bucket_id, name));
create policy launch_logo_select on storage.objects for select to authenticated
using (bucket_id = 'class-logos' and public.launch_image_can_write(bucket_id, name));
create policy launch_logo_insert on storage.objects for insert to authenticated
with check (bucket_id = 'class-logos' and public.launch_image_can_write(bucket_id, name));
create policy launch_logo_update on storage.objects for update to authenticated
using (bucket_id = 'class-logos' and public.launch_image_can_write(bucket_id, name))
with check (bucket_id = 'class-logos' and public.launch_image_can_write(bucket_id, name));
commit;
