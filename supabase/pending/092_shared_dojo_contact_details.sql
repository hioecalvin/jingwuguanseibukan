-- Shared location links. Existing contact records, RPCs and per-discipline fields remain intact.
begin;

create function dojo_contact_private.group_key(dojo_id uuid, dojo_name text, class_name text)
returns text language sql immutable set search_path=pg_catalog as $$
 select case
  when n='chushin' and c in ('aikido','karate') then 'location-Chushin'
  when n='zhongxin' and c in ('taijiquan','taiji','xingyiquan','xingyi','kungfu kids','kungfukids') then 'location-Zhongxin'
  else dojo_id::text end
 from (select regexp_replace(btrim(regexp_replace(lower(dojo_name),'[[:space:]]+',' ','g')),' dojo$','') n,
              btrim(regexp_replace(lower(class_name),'[[:space:]]+',' ','g')) c) names;
$$;

create function public.get_shared_dojo_contact_details(target_dojo_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog as $$
begin
 if auth.uid() is null or not coalesce(public.is_active_app_user(auth.uid()),false) then
  raise exception using errcode='42501',message='Active member login required';end if;
 return (
  with members as (
   select d.id,d.class_id,d.name,c.name class_name,
    dojo_contact_private.group_key(d.id,d.name,c.name) group_key,
    v.maps_url,v.instagram_username,coalesce(v.version,0) version,
    coalesce(public.is_class_admin(d.class_id,d.id,auth.uid()),false) can_manage
   from public.dojos d join public.classes c on c.id=d.class_id
   left join dojo_contact_private.details v on v.dojo_id=d.id
  ), groups as (
   select group_key,jsonb_build_object(
    'group_key',group_key,'dojo_ids',jsonb_agg(id order by id),
    'maps_url',case when count(distinct maps_url)<=1 then min(maps_url) end,
    'instagram_username',case when count(distinct instagram_username)<=1 then min(instagram_username) end,
    'has_conflicts',count(distinct maps_url)>1 or count(distinct instagram_username)>1,
    'version_token',md5(jsonb_agg(jsonb_build_array(id,class_id,name,class_name,version) order by id)::text),
    'can_manage',bool_and(can_manage),
    'source_values',jsonb_agg(jsonb_build_object('dojo_id',id,'dojo_name',name,'class_name',class_name,
      'maps_url',maps_url,'instagram_username',instagram_username) order by id)
   ) value
   from members
   where target_dojo_id is null or group_key=(select m.group_key from members m where m.id=target_dojo_id)
   group by group_key
  ) select coalesce(jsonb_agg(value order by group_key),'[]'::jsonb) from groups
 );
end$$;

create function public.update_shared_dojo_contact_details(target_dojo_id uuid,
 new_instagram_username text,new_maps_url text,expected_version_token text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare actor uuid:=auth.uid(); shared jsonb; member record; old dojo_contact_private.details%rowtype;
begin
 if actor is null or not coalesce(public.is_active_app_user(actor),false) then
  raise exception using errcode='42501',message='Active member login required';end if;
 if target_dojo_id is null then raise exception using errcode='P0002',message='Dojo not found';end if;
 perform p.id from public.profiles p where p.id=actor for share;
 -- Freeze membership (including new or renamed dojos/classes), then lock parents in
 -- deterministic order. Legacy 087 writers also lock these parents before details.
 lock table public.classes,public.dojos in share mode;
 shared:=public.get_shared_dojo_contact_details(target_dojo_id)->0;
 if shared is null then raise exception using errcode='P0002',message='Dojo not found';end if;
 perform d.id from public.dojos d
  where d.id in (select value::uuid from jsonb_array_elements_text(shared->'dojo_ids'))
  order by d.id for update;
 perform a.id from public.dojo_admin_assignments a where a.user_id=actor and a.active
  and a.dojo_id in (select value::uuid from jsonb_array_elements_text(shared->'dojo_ids'))
  order by a.id for share;
 -- Re-read after waiting on writers; the token covers every member, including
 -- legacy edits to other fields, and any change in group membership or names.
 shared:=public.get_shared_dojo_contact_details(target_dojo_id)->0;
 if not coalesce(public.is_active_app_user(actor),false) or not (shared->>'can_manage')::boolean then
  raise exception using errcode='42501',message='Only Super Admin or a Dojo Admin assigned to every class at this location can edit shared details';end if;
 if expected_version_token is null or expected_version_token<>shared->>'version_token' then
  raise exception using errcode='40001',message='Shared dojo details changed; reload before saving';end if;
 for member in select value::uuid id from jsonb_array_elements_text(shared->'dojo_ids') order by value loop
  select * into old from dojo_contact_private.details where dojo_id=member.id;
  -- Keep the original caller identity, validation, CAS, no-op handling and immutable
  -- audit. A failure for any member rolls the whole shared update back.
  perform public.update_dojo_contact_details(member.id,old.contact_name,old.contact_phone,
   new_instagram_username,old.address,new_maps_url,coalesce(old.version,0));
 end loop;
 return public.get_shared_dojo_contact_details(target_dojo_id)->0;
end$$;

alter function dojo_contact_private.group_key(uuid,text,text) owner to postgres;
revoke all on function dojo_contact_private.group_key(uuid,text,text) from public,anon,authenticated,service_role;
alter function public.get_shared_dojo_contact_details(uuid) owner to postgres;
revoke all on function public.get_shared_dojo_contact_details(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_shared_dojo_contact_details(uuid) to authenticated;
alter function public.update_shared_dojo_contact_details(uuid,text,text,text) owner to postgres;
revoke all on function public.update_shared_dojo_contact_details(uuid,text,text,text) from public,anon,authenticated,service_role;
grant execute on function public.update_shared_dojo_contact_details(uuid,text,text,text) to authenticated;

notify pgrst,'reload schema';
commit;
