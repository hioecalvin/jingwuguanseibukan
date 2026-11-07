-- Synthetic local cluster only, with deliberately narrow auth helper stubs.
create role anon nologin; create role authenticated nologin; create role service_role nologin;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table public.profiles(id uuid primary key, active boolean not null, is_super_admin boolean not null default false);
create table public.classes(id uuid primary key,name text);
create table public.dojos(id uuid primary key,class_id uuid references classes(id),name text,active boolean);
create table public.dojo_admin_assignments(id uuid primary key, user_id uuid references profiles(id),class_id uuid references classes(id),dojo_id uuid references dojos(id),active boolean);
create function public.is_active_app_user(actor uuid) returns boolean language sql stable security definer set search_path=pg_catalog as $$select coalesce((select p.active from public.profiles p where p.id=actor and actor=auth.uid()),false)$$;
create function public.is_class_admin(target_class uuid,target_dojo uuid,actor uuid) returns boolean language sql stable security definer set search_path=pg_catalog as $$select actor=auth.uid() and ((select p.is_super_admin from public.profiles p where p.id=actor) or exists(select 1 from public.dojo_admin_assignments a where a.user_id=actor and a.class_id=target_class and a.dojo_id=target_dojo and a.active))$$;
grant usage on schema public,auth to anon,authenticated,service_role;
insert into profiles values('10000000-0000-4000-8000-000000000001',true,true),('10000000-0000-4000-8000-000000000002',true,false),('10000000-0000-4000-8000-000000000003',true,false),('10000000-0000-4000-8000-000000000004',false,true);
insert into classes values('20000000-0000-4000-8000-000000000001','Fixture Class');
insert into dojos values('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Fixture Dojo One',true),('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','Fixture Dojo Two',false);
insert into dojo_admin_assignments values('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',true);
