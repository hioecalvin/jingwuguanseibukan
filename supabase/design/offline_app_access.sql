-- LOCAL DESIGN ONLY; requires same-ID foundation and full policy integration.
begin;
create or replace function public.is_active_app_user(target_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path to 'public','pg_temp' as $$
 select target_user_id is not null
 and (target_user_id=auth.uid() or coalesce(auth.role(),'')='service_role')
 and exists(select 1 from public.profiles profile where profile.id=target_user_id
   and profile.auth_user_id=profile.id and profile.account_status='active'
   and profile.date_of_passing is null);
$$;
alter policy "own profile" on public.profiles using (
 id=auth.uid() and auth_user_id=auth.uid()
 and account_status='active'::public.account_status and date_of_passing is null
);
commit;
