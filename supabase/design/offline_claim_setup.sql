-- LOCAL ONLY: complete migration/provider acceptance still required.
begin;
create function member_claim_private.setup_claim(claim_id uuid, setup_token text)
returns member_claim_private.claims language plpgsql security definer set search_path=pg_catalog as $$
declare c member_claim_private.claims%rowtype;
begin
 select * into c from member_claim_private.claims where id=claim_id for update;
 if not found or c.setup_hash is null or setup_token is null or setup_token !~ '^[a-f0-9]{64}$'
   or c.setup_hash is distinct from sha256(convert_to(setup_token,'UTF8'))
   or c.setup_expires_at is null or c.setup_expires_at<=clock_timestamp()
   or c.expires_at<=clock_timestamp() or c.state not in ('approved','provisioning','bound') then
  raise exception using errcode='42501',message='Setup unavailable'; end if;
 return c;
end $$;

create function public.member_claim_setup_complete(claim_id uuid, setup_token text)
returns boolean language plpgsql security definer set search_path=pg_catalog as $$
declare c member_claim_private.claims%rowtype;
begin
 c:=member_claim_private.setup_claim(claim_id,setup_token);
 return c.state='bound' and exists(select 1 from public.profiles p join auth.users u on u.id=p.auth_user_id
  where p.id=c.member_id and p.auth_user_id=p.id and p.email=c.email and lower(btrim(u.email))=c.email
    and p.email_verified and u.email_confirmed_at is not null and u.deleted_at is null
    and (u.banned_until is null or u.banned_until<=clock_timestamp())
    and p.account_status::text='active' and p.date_of_passing is null);
end $$;

create function public.prepare_member_claim_setup(claim_id uuid, setup_token text, ticket text)
returns table(member_uuid uuid,verified_email text,already_complete boolean)
language plpgsql security definer set search_path=pg_catalog as $$
declare c member_claim_private.claims%rowtype;
begin
 c:=member_claim_private.setup_claim(claim_id,setup_token);
 if c.state='bound' then
  if not public.member_claim_setup_complete(claim_id,setup_token) then
    raise exception using errcode='42501',message='Setup unavailable'; end if;
  return query select c.member_id,c.email,true;return;
 end if;
 perform member_claim_private.lock_approval_scope(c.approved_by,c.member_id);
 if exists(select 1 from auth.users where id=c.member_id or lower(btrim(email))=c.email) then
  raise exception using errcode='42501',message='Setup unavailable'; end if;
 if c.state='provisioning' then
  if c.ticket_expires_at is null or c.ticket_expires_at>clock_timestamp() then
    raise exception using errcode='55P03',message='Setup in progress'; end if;
  -- A timed-out attempt may retry only after its old ticket expires and no Auth
  -- account exists. Never reset/delete an account to recover an ambiguous result.
  update member_claim_private.claims set state='approved',ticket_hash=null where id=c.id;
  insert into member_claim_private.claim_audit(claim_id,event) values(c.id,'provisioning_retry');
 end if;
 perform member_claim_private.begin_provision(c.id,ticket);
 return query select c.member_id,c.email,false;
end $$;
revoke all on function member_claim_private.setup_claim(uuid,text),public.prepare_member_claim_setup(uuid,text,text),
 public.member_claim_setup_complete(uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.prepare_member_claim_setup(uuid,text,text),public.member_claim_setup_complete(uuid,text) to service_role;
commit;
