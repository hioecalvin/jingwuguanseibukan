-- Private member-owned emergency contacts. No directory projection or delivery.
begin;
create schema emergency_contact_private;
revoke all on schema emergency_contact_private from public,anon,authenticated,service_role;
create table emergency_contact_private.contacts (
 profile_id uuid primary key references public.profiles(id),
 contact_name text, relation text, email text, phone text,
 version integer not null check(version>0),
 updated_at timestamptz not null default clock_timestamp()
);
create table emergency_contact_private.audit (
 id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.profiles(id),
 old_values jsonb, new_values jsonb not null, recorded_at timestamptz not null default clock_timestamp()
);
create index emergency_audit_profile_idx on emergency_contact_private.audit(profile_id,recorded_at desc);
create function emergency_contact_private.valid_caller() returns boolean
language sql stable security definer set search_path=pg_catalog as $$
 select coalesce(public.is_active_app_user(auth.uid()),false) and exists(
 select 1 from public.profiles p join auth.users u on u.id=p.auth_user_id
 where p.id=auth.uid() and p.must_change_password=false and u.email_confirmed_at is not null
 and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now()))
$$;
create function emergency_contact_private.immutable_audit() returns trigger
language plpgsql set search_path=pg_catalog as $$begin raise exception 'Emergency contact audit is immutable';end$$;
create trigger emergency_audit_immutable before update or delete on emergency_contact_private.audit
for each row execute function emergency_contact_private.immutable_audit();

create function public.get_my_emergency_contact() returns jsonb
language plpgsql stable security definer set search_path=pg_catalog as $$
begin
 if not emergency_contact_private.valid_caller() then raise exception using errcode='42501',message='Active verified member login required';end if;
 return coalesce((select jsonb_build_object('contact_name',c.contact_name,'relation',c.relation,'email',c.email,'phone',c.phone,'version',c.version)
 from emergency_contact_private.contacts c where c.profile_id=auth.uid()),
 jsonb_build_object('contact_name',null,'relation',null,'email',null,'phone',null,'version',0));
end$$;
create function public.update_my_emergency_contact(new_contact_name text,new_relation text,new_email text,new_phone text,expected_version integer)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare actor uuid:=auth.uid(); old emergency_contact_private.contacts%rowtype; next_values jsonb; previous_values jsonb;
 clean_name text:=nullif(regexp_replace(btrim(new_contact_name),'[[:space:]]+',' ','g'),'');
 clean_relation text:=nullif(regexp_replace(btrim(new_relation),'[[:space:]]+',' ','g'),'');
 clean_email text:=nullif(lower(btrim(new_email)),''); clean_phone text:=nullif(btrim(new_phone),''); next_version integer;
begin
 if not emergency_contact_private.valid_caller() then raise exception using errcode='42501',message='Active verified member login required';end if;
 -- Serialise this member's first insert and edits, including concurrent account changes.
 perform p.id from public.profiles p where p.id=actor for update;
 perform u.id from auth.users u join public.profiles p on p.auth_user_id=u.id where p.id=actor for share of u;
 if not emergency_contact_private.valid_caller() then raise exception using errcode='42501',message='Active verified member login required';end if;
 select * into old from emergency_contact_private.contacts where profile_id=actor for update;
 if expected_version is null or expected_version<0 or expected_version<>coalesce(old.version,0) then
  raise exception using errcode='40001',message='Emergency contact changed; reload before saving';end if;
 if (clean_name is not null and (length(clean_name)>200 or clean_name~'[[:cntrl:]]'))
 or (clean_relation is not null and (length(clean_relation)>100 or clean_relation~'[[:cntrl:]]'))
 or (clean_email is not null and (length(clean_email)>254 or clean_email !~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$'))
 or (clean_phone is not null and (length(clean_phone)>32 or clean_phone !~ '^\+?[0-9 ()-]{3,32}$' or length(regexp_replace(clean_phone,'[^0-9]','','g'))<3))
 then raise exception using errcode='22023',message='Check emergency contact details';end if;
 next_values:=jsonb_build_object('contact_name',clean_name,'relation',clean_relation,'email',clean_email,'phone',clean_phone);
 previous_values:=jsonb_build_object('contact_name',old.contact_name,'relation',old.relation,'email',old.email,'phone',old.phone);
 if next_values=previous_values then return next_values||jsonb_build_object('version',coalesce(old.version,0));end if;
 next_version:=coalesce(old.version,0)+1;
 insert into emergency_contact_private.contacts(profile_id,contact_name,relation,email,phone,version)
 values(actor,clean_name,clean_relation,clean_email,clean_phone,next_version)
 on conflict(profile_id) do update set contact_name=excluded.contact_name,relation=excluded.relation,
 email=excluded.email,phone=excluded.phone,version=excluded.version,updated_at=clock_timestamp();
 insert into emergency_contact_private.audit(profile_id,old_values,new_values)
 values(actor,previous_values||jsonb_build_object('version',coalesce(old.version,0)),next_values||jsonb_build_object('version',next_version));
 return next_values||jsonb_build_object('version',next_version);
end$$;
do $acl$ declare r record;begin
 for r in select c.oid::regclass rel from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='emergency_contact_private' and c.relkind='r' loop
  execute format('alter table %s enable row level security',r.rel);execute format('alter table %s force row level security',r.rel);
  execute format('revoke all on %s from public,anon,authenticated,service_role',r.rel);
 end loop;
 for r in select p.oid::regprocedure fn,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='emergency_contact_private' or(n.nspname='public' and p.proname in('get_my_emergency_contact','update_my_emergency_contact')) loop
  execute format('alter function %s owner to postgres',r.fn);execute format('revoke all on function %s from public,anon,authenticated,service_role',r.fn);
  if r.proname in('get_my_emergency_contact','update_my_emergency_contact') then execute format('grant execute on function %s to authenticated',r.fn);end if;
 end loop;
end $acl$;
notify pgrst,'reload schema';
commit;
