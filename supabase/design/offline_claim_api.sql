-- LOCAL API INTEGRATION ONLY; not a migration. Production switch stays off.
begin;
create function public.request_member_claim(target_registration_number text, proposed_email text, proof_token text, site_origin text)
returns void language plpgsql security definer set search_path=pg_catalog as $$
declare target uuid; claim_id uuid; queued uuid;
begin
 if site_origin is null or site_origin !~ '^https://[a-zA-Z0-9.-]+(:[0-9]+)?$' then
  raise exception using errcode='22023',message='Secure site origin required'; end if;
 select p.id into target from public.profiles p
 where p.registration_number=upper(btrim(target_registration_number)) and p.member_origin='import'
   and p.auth_user_id is null and p.account_status::text='active' and p.date_of_passing is null
   and not p.is_super_admin and not p.is_grading_assessor for update;
 if target is null then return; end if;
 -- Only expired, unbound requests may be replaced without an Admin decision.
 with expired as (
   update member_claim_private.claims set state='cancelled',ticket_hash=null
   where member_id=target and expires_at<=clock_timestamp()
     and state in ('pending_email','verified','approved','provisioning') returning id
 ) insert into member_claim_private.claim_audit(claim_id,event) select id,'expired' from expired;
 begin
  claim_id:=member_claim_private.request_claim(target,proposed_email,proof_token);
 exception when insufficient_privilege or unique_violation then return;
 end;
 update member_claim_private.claims set site_origin=request_member_claim.site_origin where id=claim_id;
 queued:=public.queue_email(
  target_email=>lower(btrim(proposed_email)), target_email_type=>'member_claim_verification',
  target_subject=>'Verify your Jingwuguan Seibukan member claim',
  target_template_data=>jsonb_build_object('verification_url',site_origin||'/claim-id/verify#claim='||claim_id::text||'&token='||proof_token),
  target_user_id=>null, target_reference_type=>'member_claim',target_reference_id=>claim_id,
  target_dedupe_key=>'member-claim-verification/'||claim_id::text);
 if queued is null then raise exception 'Claim verification could not be queued'; end if;
end $$;

create function public.verify_member_claim(claim_id uuid, proof_token text)
returns void language plpgsql security definer set search_path=pg_catalog as $$
begin perform member_claim_private.verify_claim(claim_id,proof_token); end $$;

create function public.review_member_claim(claim_id uuid, approve boolean)
returns void language plpgsql security definer set search_path=pg_catalog as $$
declare actor uuid:=auth.uid(); c member_claim_private.claims%rowtype; setup_token text; queued uuid;
begin
 if actor is null or approve is null then raise exception using errcode='42501',message='Review unavailable'; end if;
 if approve then
  perform member_claim_private.approve_claim(claim_id,actor);
  select * into c from member_claim_private.claims where id=claim_id for update;
  if c.site_origin is null or c.site_origin !~ '^https://[a-zA-Z0-9.-]+(:[0-9]+)?$' then raise exception 'Claim origin unavailable'; end if;
  -- Database-generated token: the approving browser never chooses or receives it.
  setup_token:=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','');
  update member_claim_private.claims set setup_hash=sha256(convert_to(setup_token,'UTF8')),
    setup_expires_at=clock_timestamp()+interval '24 hours',expires_at=clock_timestamp()+interval '24 hours' where id=c.id;
  queued:=public.queue_email(target_email=>c.email,target_email_type=>'member_claim_setup',
    target_subject=>'Set your Jingwuguan Seibukan password',
    target_template_data=>jsonb_build_object('setup_url',c.site_origin||'/claim-id/setup#claim='||c.id::text||'&token='||setup_token),
    target_user_id=>null,target_reference_type=>'member_claim',target_reference_id=>c.id,
    target_dedupe_key=>'member-claim-setup/'||c.id::text);
  if queued is null then raise exception 'Claim setup could not be queued'; end if;
 else perform member_claim_private.cancel_claim(claim_id,actor); end if;
end $$;

create function public.get_reviewable_member_claims()
returns table(claim_id uuid,member_id text,full_name text,claimed_email text,state text,verified_at timestamptz)
language plpgsql security definer set search_path=pg_catalog as $$
declare actor uuid:=auth.uid(); c member_claim_private.claims%rowtype;
begin
 if actor is null then raise exception using errcode='42501',message='Review unavailable'; end if;
 for c in select request.* from member_claim_private.claims request
   where request.state in ('verified','approved') and request.expires_at>clock_timestamp()
   and (exists(select 1 from public.profiles where id=actor and is_super_admin)
     or exists(select 1 from public.class_memberships m join public.dojo_admin_assignments a
       on a.dojo_id=m.dojo_id and a.class_id=m.class_id
       where m.user_id=request.member_id and a.user_id=actor and a.active))
   order by request.verified_at,request.id limit 200
 loop
   begin
    perform member_claim_private.lock_approval_scope(actor,c.member_id);
   exception when insufficient_privilege then continue;
   end;
   return query select c.id,p.registration_number,p.full_name,c.email,c.state,c.verified_at
     from public.profiles p where p.id=c.member_id;
 end loop;
end $$;

revoke all on function public.request_member_claim(text,text,text,text),public.verify_member_claim(uuid,text),
 public.review_member_claim(uuid,boolean),public.get_reviewable_member_claims() from public,anon,authenticated,service_role;
grant execute on function public.request_member_claim(text,text,text,text),public.verify_member_claim(uuid,text) to service_role;
grant execute on function public.review_member_claim(uuid,boolean),public.get_reviewable_member_claims() to authenticated;
commit;
