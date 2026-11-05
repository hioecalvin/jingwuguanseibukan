-- Super Admin personal-detail corrections; claimed email changes stay with Auth.
begin;
create schema personal_details_private;
revoke all on schema personal_details_private from public,anon,authenticated,service_role;
create function personal_details_private.can_manage(caller_id uuid) returns boolean
language sql stable security definer set search_path=pg_catalog as $$
 select coalesce(public.is_active_super_admin(caller_id),false) and exists(
  select 1 from public.profiles p join auth.users u on u.id=p.auth_user_id
  where p.id=caller_id and not p.must_change_password and u.email_confirmed_at is not null
  and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now())
 )
$$;
create table personal_details_private.audit (
 id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.profiles(id),
 actor_id uuid references public.profiles(id), old_values jsonb not null,new_values jsonb not null,
 change_source text not null default 'super_admin' check(change_source in('super_admin','approved_operator_correction')),
 constraint personal_audit_actor check((change_source='super_admin' and actor_id is not null) or (change_source='approved_operator_correction' and actor_id is null)),
 recorded_at timestamptz not null default clock_timestamp()
);
create table personal_details_private.email_requests (
 id uuid primary key default gen_random_uuid(),profile_id uuid not null references public.profiles(id),
 actor_id uuid not null references public.profiles(id),old_email text not null,new_email text not null,
 state text not null default 'pending' check(state in('pending','processing','sent','failed')),
 requested_at timestamptz not null default clock_timestamp(), processed_at timestamptz
);
create index personal_email_profile_idx on personal_details_private.email_requests(profile_id,requested_at desc);
create function personal_details_private.preserve_audit() returns trigger language plpgsql set search_path=pg_catalog as $$
begin raise exception 'Personal detail audit is immutable';end$$;
create trigger personal_details_audit_immutable before update or delete on personal_details_private.audit for each row execute function personal_details_private.preserve_audit();

create function public.get_member_personal_details(target_member_id uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog as $$
begin
 if not personal_details_private.can_manage(auth.uid()) then raise exception using errcode='42501',message='Super Admin access required';end if;
 return (select jsonb_build_object('id',p.id,'full_name',p.full_name,'date_of_birth',p.date_of_birth,
  'email',p.email,'phone',p.phone,'has_login',p.auth_user_id is not null,
  'pending_email',(select e.new_email from personal_details_private.email_requests e where e.profile_id=p.id
    and e.state in('pending','processing','sent') and e.new_email is distinct from p.email and e.requested_at>now()-interval '24 hours' order by e.requested_at desc limit 1))
  from public.profiles p where p.id=target_member_id);
end $$;
create function public.update_member_personal_details(target_member_id uuid,new_full_name text,new_date_of_birth date,
 new_email text,new_phone text,expected_values jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare p public.profiles%rowtype; actor uuid:=auth.uid(); before_values jsonb; next_values jsonb;
 clean_name text:=regexp_replace(btrim(new_full_name),'[[:space:]]+',' ','g');
 clean_email text:=nullif(lower(btrim(new_email)),'');clean_phone text:=nullif(btrim(new_phone),'');
 request_id uuid; c record;
begin
 if not personal_details_private.can_manage(actor) then raise exception using errcode='42501',message='Super Admin access required';end if;
 -- Lock actor and target consistently; recheck authority after lock acquisition.
 perform x.id from public.profiles x where x.id in(actor,target_member_id) order by x.id for update;
 if not personal_details_private.can_manage(actor) then raise exception using errcode='42501',message='Super Admin access required';end if;
 select * into strict p from public.profiles where id=target_member_id;
 before_values:=jsonb_build_object('full_name',p.full_name,'date_of_birth',p.date_of_birth,'email',p.email,'phone',p.phone);
 if before_values is distinct from expected_values then raise exception using errcode='40001',message='Personal details changed; reload before saving';end if;
 if clean_name is null or length(clean_name) not between 1 and 200 or clean_name ~ '[[:cntrl:]]'
 or (new_date_of_birth is not null and (not isfinite(new_date_of_birth) or new_date_of_birth>(clock_timestamp() at time zone 'Asia/Jakarta')::date))
 or (clean_email is not null and (length(clean_email)>254 or clean_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'))
 or (clean_phone is not null and (length(clean_phone)>32 or clean_phone !~ '^\+?[0-9 ()-]{5,32}$' or length(regexp_replace(clean_phone,'[^0-9]','','g'))<5))
 then raise exception using errcode='22023',message='Check name, date of birth, email and phone';end if;
 if p.auth_user_id is not null and clean_email is null then raise exception 'An account login email cannot be cleared';end if;
 if clean_email is distinct from p.email and clean_email is not null and (
 exists(select 1 from public.profiles x where x.id<>p.id and lower(btrim(x.email))=clean_email)
 or exists(select 1 from auth.users u where u.id<>p.id and lower(btrim(u.email))=clean_email and u.deleted_at is null)) then raise exception 'Email is already assigned';end if;
 if p.auth_user_id is null and (p.email is distinct from clean_email or p.date_of_birth is distinct from new_date_of_birth) then
  for c in select * from member_claim_private.claims where member_id=p.id and state not in('bound','cancelled') order by id for update loop
   if c.state in('provisioning','binding') then raise exception 'Account setup is in progress; retry after it completes';end if;
   update member_claim_private.claims set state='cancelled',setup_hash=null,ticket_hash=null where id=c.id;
   insert into member_claim_private.claim_audit(claim_id,event,actor_id) values(c.id,'personal_details_corrected',actor);
  end loop;
 end if;
 if p.auth_user_id is not null and clean_email is distinct from p.email then
  if exists(select 1 from personal_details_private.email_requests e where e.profile_id=p.id and e.state in('pending','processing','sent') and e.requested_at>clock_timestamp()-interval '30 minutes') then
   raise exception 'An email change was recently requested; allow confirmation or retry later';end if;
  insert into personal_details_private.email_requests(profile_id,actor_id,old_email,new_email) values(p.id,actor,p.email,clean_email) returning id into request_id;
 end if;
 update public.profiles set full_name=clean_name,date_of_birth=new_date_of_birth,phone=clean_phone,
 email=case when p.auth_user_id is null then clean_email else p.email end where id=p.id;
 next_values:=jsonb_build_object('full_name',clean_name,'date_of_birth',new_date_of_birth,'phone',clean_phone,
 'email',case when p.auth_user_id is null then clean_email else p.email end,'requested_email',case when request_id is not null then clean_email end);
 if before_values is distinct from (next_values-'requested_email') or request_id is not null then
 insert into personal_details_private.audit(profile_id,actor_id,old_values,new_values) values(p.id,actor,before_values,next_values);end if;
 return jsonb_build_object('saved',true,'email_request_id',request_id,'email_pending',request_id is not null);
end $$;

-- Service-only one-shot delivery claim; caller identity must match the audited request.
create function public.claim_admin_email_change(request_id uuid,actor_id uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare e personal_details_private.email_requests%rowtype; p public.profiles%rowtype;
begin
 select * into e from personal_details_private.email_requests where id=request_id for update;
 if not found or e.actor_id<>actor_id or e.state<>'pending' or e.requested_at<clock_timestamp()-interval '10 minutes'
 or not personal_details_private.can_manage(actor_id) then return null;end if;
 select * into p from public.profiles where id=e.profile_id for share;
 if p.auth_user_id is distinct from p.id or p.email is distinct from e.old_email or p.date_of_passing is not null then return null;end if;
 update personal_details_private.email_requests set state='processing' where id=e.id;
 return jsonb_build_object('profile_id',p.id,'old_email',e.old_email,'new_email',e.new_email,'request_id',e.id);
end $$;
create function public.finish_admin_email_change(request_id uuid,delivered boolean) returns void
language sql security definer set search_path=pg_catalog as $$
 update personal_details_private.email_requests set state=case when delivered then 'sent' else 'failed' end,processed_at=clock_timestamp()
 where id=request_id and state='processing'
$$;
create function public.get_member_personal_detail_audit(target_member_id uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog as $$
begin
 if not personal_details_private.can_manage(auth.uid()) then raise exception using errcode='42501',message='Super Admin access required';end if;
 return coalesce((select jsonb_agg(to_jsonb(x) order by x.recorded_at desc,x.id) from (
  select a.*,coalesce(p.full_name,'Approved data correction') actor_name from personal_details_private.audit a left join public.profiles p on p.id=a.actor_id
  where a.profile_id=target_member_id order by a.recorded_at desc,a.id limit 100)x),'[]'::jsonb);
end $$;
do $acl$ declare r record;begin
 for r in select c.oid::regclass rel from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='personal_details_private' and c.relkind='r' loop
  execute format('alter table %s enable row level security',r.rel);execute format('alter table %s force row level security',r.rel);
  execute format('revoke all on %s from public,anon,authenticated,service_role',r.rel);
 end loop;
 for r in select p.oid::regprocedure fn,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='personal_details_private'
 or(n.nspname='public' and p.proname in('get_member_personal_details','update_member_personal_details','claim_admin_email_change','finish_admin_email_change','get_member_personal_detail_audit')) loop
 execute format('alter function %s owner to postgres',r.fn);execute format('revoke all on function %s from public,anon,authenticated,service_role',r.fn);
 if r.proname in('get_member_personal_details','update_member_personal_details','get_member_personal_detail_audit') then execute format('grant execute on function %s to authenticated',r.fn);
 elsif r.proname in('claim_admin_email_change','finish_admin_email_change') then execute format('grant execute on function %s to service_role',r.fn);end if;
 end loop;
end $acl$;
notify pgrst,'reload schema';
commit;
