-- JS ID profile navigation; private detail remains limited to existing dojo scope.
begin;
create function public.get_member_profile_by_js_id(target_js_id text)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog as $$
declare target public.profiles%rowtype; matches integer; manager boolean; owner_view boolean;
begin
 if auth.uid() is null or not public.is_active_app_user(auth.uid()) then
  raise exception using errcode='42501',message='Not authenticated';
 end if;
 if target_js_id is null or length(target_js_id)>40 then return null; end if;
 select count(*) into matches from public.profiles p where
  upper(regexp_replace(p.registration_number,'[[:space:]-]','','g'))=upper(regexp_replace(target_js_id,'[[:space:]-]','','g'));
 if matches<>1 then return null; end if;
 select * into strict target from public.profiles p where
  upper(regexp_replace(p.registration_number,'[[:space:]-]','','g'))=upper(regexp_replace(target_js_id,'[[:space:]-]','','g'));
 owner_view:=target.id=auth.uid();
 manager:=public.is_active_super_admin(auth.uid()) or exists(
  select 1 from public.class_memberships m where m.user_id=target.id and m.dojo_id is not null
  and public.is_class_admin(m.class_id,m.dojo_id,auth.uid()));
 if not (owner_view or manager) and (target.account_status::text<>'active' or target.date_of_passing is not null
 or not exists(select 1 from public.class_memberships m join public.classes c on c.id=m.class_id
 where m.user_id=target.id and m.status::text in('active','break','break_1','break_2') and c.is_active)) then return null; end if;
 return jsonb_build_object('member_id',target.registration_number,'full_name',target.full_name,
 'avatar_url',target.avatar_url,'instagram_username',target.instagram_username,'is_self',owner_view,'can_manage',manager,
 'personal_edit_id',case when public.is_active_super_admin(auth.uid()) then target.id else null end,
 'private_details',case when owner_view or manager then jsonb_build_object('email',target.email,'phone',target.phone,
 'whatsapp',target.whatsapp_number,'date_of_birth',target.date_of_birth) else null end,
 'enrollments',coalesce((select jsonb_agg(jsonb_build_object('class_name',c.name,'home_dojo',d.name,'rank_name',r.name,
 'membership_id',case when owner_view or manager then m.id else null end,
 'joined_date',case when owner_view or manager then m.joined_date else null end,
 'status',case when owner_view or manager then m.status::text else null end,
 'last_training_date',case when owner_view or manager then m.last_training_session_date else null end)
 order by c.name,d.name,m.id)
 from public.class_memberships m join public.classes c on c.id=m.class_id left join public.dojos d on d.id=m.dojo_id
 left join public.ranks r on r.id=m.rank_id where m.user_id=target.id and (
 owner_view or public.is_active_super_admin(auth.uid())
 or (manager and m.dojo_id is not null and public.is_class_admin(m.class_id,m.dojo_id,auth.uid()))
 or (not manager and m.status::text in('active','break','break_1','break_2') and c.is_active))),'[]'::jsonb));
end $$;
alter function public.get_member_profile_by_js_id(text) owner to postgres;
revoke all on function public.get_member_profile_by_js_id(text) from public,anon,authenticated,service_role;
grant execute on function public.get_member_profile_by_js_id(text) to authenticated;
-- Add the navigable JS ID without broadening the old directory projection.
create function public.get_my_member_directory_v3()
returns table(member_id text,full_name text,avatar_url text,enrollments jsonb,instagram_username text)
language plpgsql stable security definer set search_path=pg_catalog as $$
begin
 if auth.uid() is null or not public.is_active_app_user(auth.uid()) then
  raise exception using errcode='42501',message='Not authenticated';
 end if;
 return query select p.registration_number::text,p.full_name::text,p.avatar_url::text,
  jsonb_agg(jsonb_build_object('class_name',c.name,'home_dojo',d.name,'current_rank',r.name)
   order by c.name,d.name,m.id),p.instagram_username::text
 from public.profiles p join public.class_memberships m on m.user_id=p.id
 join public.classes c on c.id=m.class_id left join public.dojos d on d.id=m.dojo_id
 left join public.ranks r on r.id=m.rank_id
 where p.account_status::text='active' and p.date_of_passing is null and c.is_active
 and m.status::text in('active','break','break_1','break_2')
 group by p.id,p.registration_number,p.full_name,p.avatar_url,p.instagram_username order by p.full_name,p.id;
end $$;
alter function public.get_my_member_directory_v3() owner to postgres;
revoke all on function public.get_my_member_directory_v3() from public,anon,authenticated,service_role;
grant execute on function public.get_my_member_directory_v3() to authenticated;
notify pgrst,'reload schema';
commit;
