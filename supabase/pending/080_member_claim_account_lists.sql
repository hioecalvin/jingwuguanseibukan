-- Read-only administration list. Does not verify, provision or message accounts.
begin;
create function public.get_verified_member_accounts(page_number integer default 1)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog as $$
declare caller uuid:=auth.uid(); result jsonb;
begin
 if caller is null or not public.is_active_app_user(caller) or not exists(
  select 1 from public.profiles p join auth.users u on u.id=p.auth_user_id where p.id=caller
  and p.must_change_password=false and u.email_confirmed_at is not null and u.deleted_at is null
  and (u.banned_until is null or u.banned_until<=now())
  and (p.is_super_admin or exists(select 1 from public.dojo_admin_assignments a
   join public.dojos d on d.id=a.dojo_id and d.class_id=a.class_id join public.classes c on c.id=a.class_id
   join public.class_memberships m on m.user_id=p.id and m.class_id=a.class_id
   where a.user_id=p.id and a.active and d.active and c.is_active and m.status::text in('active','break','break_1','break_2')))
 ) then raise exception using errcode='42501',message='Account list unavailable'; end if;
 if page_number is null or page_number not between 1 and 100000 then raise exception 'Invalid page'; end if;
 with eligible as (
 select p.id,p.registration_number member_id,p.full_name,u.email, u.email_confirmed_at verified_at,
 p.account_status::text account_status
 from public.profiles p join auth.users u on u.id=p.auth_user_id
 where u.email_confirmed_at is not null and u.deleted_at is null
 and (public.is_active_super_admin(caller) or exists(
  select 1 from public.class_memberships tm join public.dojo_admin_assignments a on a.dojo_id=tm.dojo_id and a.class_id=tm.class_id
  join public.dojos d on d.id=a.dojo_id and d.class_id=a.class_id join public.classes c on c.id=a.class_id
  join public.class_memberships am on am.user_id=caller and am.class_id=a.class_id
  where tm.user_id=p.id and a.user_id=caller and a.active and d.active and c.is_active
  and am.status::text in('active','break','break_1','break_2')
  and tm.status::text in('active','break','break_1','break_2','inactive')))
 ), ordered as (
 select e.*, row_number() over(order by
  case when e.member_id ~ '[0-9]+' then substring(e.member_id from '[0-9]+')::numeric end nulls last,
  upper(e.member_id), e.id) sort_order from eligible e
 ), page as (select * from ordered order by sort_order limit 50 offset ((page_number-1)*50))
 select jsonb_build_object('total',(select count(*) from eligible),'page',page_number,'page_size',50,
 'accounts',coalesce((select jsonb_agg(jsonb_build_object('member_id',p.member_id,'full_name',p.full_name,
  'email',p.email,'verified_at',p.verified_at,'account_status',p.account_status) order by p.sort_order) from page p),'[]'::jsonb)) into result;
 return result;
end $$;
alter function public.get_verified_member_accounts(integer) owner to postgres;
revoke all on function public.get_verified_member_accounts(integer) from public,anon,authenticated,service_role;
grant execute on function public.get_verified_member_accounts(integer) to authenticated;
notify pgrst,'reload schema';
commit;
