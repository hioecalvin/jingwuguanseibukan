-- Member-visible dojo business contacts, independent of personal profiles.
begin;
create schema dojo_contact_private;
revoke all on schema dojo_contact_private from public,anon,authenticated,service_role;
create table dojo_contact_private.details (
 dojo_id uuid primary key references public.dojos(id),
 contact_name text, contact_phone text, instagram_username text, address text, maps_url text,
 version integer not null check(version>0),
 updated_at timestamptz not null default clock_timestamp(),
 updated_by uuid not null references public.profiles(id)
);
create table dojo_contact_private.audit (
 id uuid primary key default gen_random_uuid(), dojo_id uuid not null references public.dojos(id),
 actor_id uuid not null references public.profiles(id), old_values jsonb not null, new_values jsonb not null,
 recorded_at timestamptz not null default clock_timestamp()
);
create index dojo_contact_audit_dojo_idx on dojo_contact_private.audit(dojo_id,recorded_at desc);
create function dojo_contact_private.immutable_audit() returns trigger
language plpgsql set search_path=pg_catalog as $$begin raise exception 'Dojo contact audit is immutable';end$$;
create trigger dojo_contact_audit_immutable before update or delete on dojo_contact_private.audit
for each row execute function dojo_contact_private.immutable_audit();

create function public.get_dojo_contact_details(target_dojo_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog as $$
begin
 if auth.uid() is null or not coalesce(public.is_active_app_user(auth.uid()),false) then
  raise exception using errcode='42501',message='Active member login required';end if;
 return coalesce((select jsonb_agg(jsonb_build_object(
  'dojo_id',d.id,'class_id',d.class_id,'dojo_name',d.name,'class_name',c.name,'active',d.active,
  'contact_name',v.contact_name,'contact_phone',v.contact_phone,'instagram_username',v.instagram_username,
  'address',v.address,'maps_url',v.maps_url,'version',coalesce(v.version,0),
  'can_manage',public.is_class_admin(d.class_id,d.id,auth.uid())) order by c.name,d.name,d.id)
 from public.dojos d join public.classes c on c.id=d.class_id
 left join dojo_contact_private.details v on v.dojo_id=d.id
 where target_dojo_id is null or d.id=target_dojo_id),'[]'::jsonb);
end$$;

create function public.update_dojo_contact_details(target_dojo_id uuid,new_contact_name text,new_contact_phone text,
 new_instagram_username text,new_address text,new_maps_url text,expected_version integer)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare actor uuid:=auth.uid(); dojo_class uuid; old dojo_contact_private.details%rowtype;
 next_values jsonb; previous_values jsonb; next_version integer;
 clean_name text:=nullif(regexp_replace(btrim(new_contact_name),'[[:space:]]+',' ','g'),'');
 clean_phone text:=nullif(btrim(new_contact_phone),'');
 clean_instagram text:=nullif(lower(regexp_replace(btrim(new_instagram_username),'^@','')),'');
 clean_address text:=nullif(regexp_replace(btrim(new_address),'[[:space:]]+',' ','g'),'');
 clean_maps text:=nullif(btrim(new_maps_url),'');
begin
 if actor is null or not coalesce(public.is_active_app_user(actor),false) then
  raise exception using errcode='42501',message='Active member login required';end if;
 perform p.id from public.profiles p where p.id=actor for share;
 -- Lock the parent, including when no contact record exists yet.
 select d.class_id into dojo_class from public.dojos d where d.id=target_dojo_id for update;
 if not found then raise exception using errcode='P0002',message='Dojo not found';end if;
 perform a.id from public.dojo_admin_assignments a where a.user_id=actor and a.dojo_id=target_dojo_id and a.class_id=dojo_class and a.active for share;
 if not coalesce(public.is_active_app_user(actor),false) or not coalesce(public.is_class_admin(dojo_class,target_dojo_id,actor),false) then
  raise exception using errcode='42501',message='Only Super Admin or an assigned Dojo Admin can edit these details';end if;
 select * into old from dojo_contact_private.details where dojo_id=target_dojo_id for update;
 if expected_version is null or expected_version<0 or expected_version<>coalesce(old.version,0) then
  raise exception using errcode='40001',message='Dojo details changed; reload before saving';end if;
 if (clean_name is not null and (length(clean_name)>200 or clean_name~'[[:cntrl:]]'))
 or (clean_phone is not null and (length(clean_phone)>32 or clean_phone !~ '^\+?[0-9 ()-]{3,32}$' or length(regexp_replace(clean_phone,'[^0-9]','','g'))<3))
 or (clean_instagram is not null and (length(clean_instagram)>30 or clean_instagram !~ '^[a-z0-9_](?:[a-z0-9_.]{0,28}[a-z0-9_])?$' or clean_instagram~'\.\.'))
 or (clean_address is not null and (length(clean_address)>1000 or clean_address~'[[:cntrl:]]'))
 or (clean_maps is not null and (length(clean_maps)>2048 or clean_maps~'[[:space:][:cntrl:]\\]' or clean_maps~*'/(?:\.|%2e){1,2}(?:[/?#]|$)' or clean_maps !~ '^https://(?:(?:www\.)?google\.com/maps(?:[/?#][^[:space:]\\]*)?|maps\.google\.com/(?:maps(?:[/?#][^[:space:]\\]*)?|[?#][^[:space:]\\]*)?|maps\.app\.goo\.gl/[A-Za-z0-9_-]+(?:\?[^[:space:]\\]*)?|goo\.gl/maps/[A-Za-z0-9_-]+(?:\?[^[:space:]\\]*)?)$'))
 then raise exception using errcode='22023',message='Check contact details and use a Google Maps HTTPS link';end if;
 next_values:=jsonb_build_object('contact_name',clean_name,'contact_phone',clean_phone,'instagram_username',clean_instagram,'address',clean_address,'maps_url',clean_maps);
 previous_values:=jsonb_build_object('contact_name',old.contact_name,'contact_phone',old.contact_phone,'instagram_username',old.instagram_username,'address',old.address,'maps_url',old.maps_url);
 if next_values=previous_values then return public.get_dojo_contact_details(target_dojo_id)->0;end if;
 next_version:=coalesce(old.version,0)+1;
 insert into dojo_contact_private.details(dojo_id,contact_name,contact_phone,instagram_username,address,maps_url,version,updated_by)
 values(target_dojo_id,clean_name,clean_phone,clean_instagram,clean_address,clean_maps,next_version,actor)
 on conflict(dojo_id) do update set contact_name=excluded.contact_name,contact_phone=excluded.contact_phone,
 instagram_username=excluded.instagram_username,address=excluded.address,maps_url=excluded.maps_url,
 version=excluded.version,updated_at=clock_timestamp(),updated_by=excluded.updated_by;
 insert into dojo_contact_private.audit(dojo_id,actor_id,old_values,new_values)
 values(target_dojo_id,actor,previous_values||jsonb_build_object('version',coalesce(old.version,0)),next_values||jsonb_build_object('version',next_version));
 return public.get_dojo_contact_details(target_dojo_id)->0;
end$$;

do $acl$ declare r record;begin
 for r in select c.oid::regclass rel from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='dojo_contact_private' and c.relkind='r' loop
  execute format('alter table %s owner to postgres',r.rel);
  execute format('alter table %s enable row level security',r.rel);execute format('alter table %s force row level security',r.rel);
  execute format('revoke all on %s from public,anon,authenticated,service_role',r.rel);
 end loop;
 for r in select p.oid::regprocedure fn,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='dojo_contact_private' or(n.nspname='public' and p.proname in('get_dojo_contact_details','update_dojo_contact_details')) loop
  execute format('alter function %s owner to postgres',r.fn);execute format('revoke all on function %s from public,anon,authenticated,service_role',r.fn);
  if r.proname in('get_dojo_contact_details','update_dojo_contact_details') then execute format('grant execute on function %s to authenticated',r.fn);end if;
 end loop;
end $acl$;
notify pgrst,'reload schema';
commit;
