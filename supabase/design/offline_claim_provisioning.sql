-- LOCAL INTEGRATION CANDIDATE ONLY. No exposed RPCs or provider calls.
-- Requires same-ID foundation and claim-scope prototype. All entry points are
-- owner-only until authenticated HTTP endpoints and abuse controls are reviewed.
begin;
create table member_claim_private.claims (
 id uuid primary key default gen_random_uuid(),
 member_id uuid not null references public.profiles(id),
 email text not null,
 proof_hash bytea not null,
 expires_at timestamptz not null default (clock_timestamp()+interval '24 hours'),
 state text not null default 'pending_email' check(state in ('pending_email','verified','approved','provisioning','binding','bound','cancelled')),
 verified_at timestamptz, approved_by uuid references public.profiles(id), approved_at timestamptz,
 ticket_hash bytea, ticket_expires_at timestamptz, binding_xid bigint, bound_at timestamptz,
 site_origin text, setup_hash bytea, setup_expires_at timestamptz
);
create unique index claim_open_member on member_claim_private.claims(member_id)
 where state not in ('bound','cancelled');
create unique index claim_open_email on member_claim_private.claims(email)
 where state not in ('bound','cancelled');
create table member_claim_private.claim_audit (
 id bigint generated always as identity primary key,
 claim_id uuid not null references member_claim_private.claims(id),
 event text not null, actor_id uuid, recorded_at timestamptz not null default clock_timestamp()
);
alter table member_claim_private.claims enable row level security;
alter table member_claim_private.claims force row level security;
alter table member_claim_private.claim_audit enable row level security;
alter table member_claim_private.claim_audit force row level security;
revoke all on all tables in schema member_claim_private from public,anon,authenticated,service_role;
revoke all on all sequences in schema member_claim_private from public,anon,authenticated,service_role;

create function member_claim_private.request_claim(target uuid, proposed_email text, proof_token text)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare result_id uuid; canonical_email text:=lower(btrim(proposed_email)); p public.profiles%rowtype;
begin
 if canonical_email is null or length(canonical_email)>254
   or canonical_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
   or proof_token is null or proof_token !~ '^[a-f0-9]{64}$' then
  raise exception using errcode='22023',message='Invalid claim request'; end if;
 select * into p from public.profiles where id=target for update;
 if not found or p.member_origin<>'import' or p.auth_user_id is not null
   or p.account_status::text<>'active' or p.date_of_passing is not null
   or p.is_super_admin or p.is_grading_assessor
   or exists(select 1 from auth.users where id=target or lower(btrim(email))=canonical_email)
   or exists(select 1 from public.profiles where id<>target and lower(btrim(email))=canonical_email) then
  raise exception using errcode='42501',message='Claim unavailable'; end if;
 insert into member_claim_private.claims(member_id,email,proof_hash)
 values(target,canonical_email,sha256(convert_to(proof_token,'UTF8'))) returning id into result_id;
 insert into member_claim_private.claim_audit(claim_id,event) values(result_id,'requested');
 return result_id;
end $$;

create function member_claim_private.verify_claim(claim_id uuid, proof_token text)
returns void language plpgsql security definer set search_path=pg_catalog as $$
declare c member_claim_private.claims%rowtype;
begin
 select * into c from member_claim_private.claims where id=claim_id for update;
 if not found or c.state<>'pending_email' or c.expires_at<=clock_timestamp()
   or proof_token is null or proof_token !~ '^[a-f0-9]{64}$'
   or c.proof_hash<>sha256(convert_to(proof_token,'UTF8')) then
  raise exception using errcode='42501',message='Verification unavailable'; end if;
 update member_claim_private.claims set state='verified',verified_at=clock_timestamp() where id=c.id;
 insert into member_claim_private.claim_audit(claim_id,event) values(c.id,'email_verified');
end $$;

create function member_claim_private.approve_claim(claim_id uuid, actor uuid)
returns void language plpgsql security definer set search_path=pg_catalog as $$
declare c member_claim_private.claims%rowtype;
begin
 select * into c from member_claim_private.claims where id=claim_id for update;
 if not found or c.state<>'verified' or c.verified_at is null or c.expires_at<=clock_timestamp() then
  raise exception using errcode='42501',message='Approval unavailable'; end if;
 perform member_claim_private.lock_approval_scope(actor,c.member_id);
 update member_claim_private.claims set state='approved',approved_by=actor,approved_at=clock_timestamp() where id=c.id;
 insert into member_claim_private.claim_audit(claim_id,event,actor_id) values(c.id,'approved',actor);
end $$;

create function member_claim_private.begin_provision(claim_id uuid, ticket text)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare c member_claim_private.claims%rowtype;
begin
 select * into c from member_claim_private.claims where id=claim_id for update;
 if not found or c.state<>'approved' or c.expires_at<=clock_timestamp()
   or ticket is null or ticket !~ '^[a-f0-9]{64}$' then
  raise exception using errcode='42501',message='Provisioning unavailable'; end if;
 perform member_claim_private.lock_approval_scope(c.approved_by,c.member_id);
 update member_claim_private.claims set state='provisioning',ticket_hash=sha256(convert_to(ticket,'UTF8')),
   ticket_expires_at=least(expires_at,clock_timestamp()+interval '5 minutes') where id=c.id;
 insert into member_claim_private.claim_audit(claim_id,event,actor_id) values(c.id,'provisioning',c.approved_by);
 return c.member_id;
end $$;

create function member_claim_private.cancel_claim(claim_id uuid, actor uuid)
returns void language plpgsql security definer set search_path=pg_catalog as $$
declare c member_claim_private.claims%rowtype;
begin
 select * into c from member_claim_private.claims where id=claim_id for update;
 if not found or c.state in ('binding','bound','cancelled') then
  raise exception using errcode='42501',message='Cancellation unavailable'; end if;
 perform member_claim_private.lock_approval_scope(actor,c.member_id);
 update member_claim_private.claims set state='cancelled',ticket_hash=null where id=c.id;
 insert into member_claim_private.claim_audit(claim_id,event,actor_id) values(c.id,'cancelled',actor);
end $$;

create or replace function same_id_import_private.binding_allowed(old_row public.profiles,new_row public.profiles)
returns boolean language sql stable security definer set search_path=pg_catalog as $$
 select old_row.member_origin='import' and old_row.auth_user_id is null
 and new_row.auth_user_id=old_row.id and new_row.email_verified=false
 and (to_jsonb(old_row)-array['auth_user_id','email','updated_at'])=
     (to_jsonb(new_row)-array['auth_user_id','email','updated_at'])
 and exists(select 1 from member_claim_private.claims c where c.member_id=old_row.id
   and c.state='binding' and c.binding_xid=txid_current() and c.email=new_row.email);
$$;

-- Check private ticket before Auth INSERT and strip it before storage/JWT output.
-- User-editable raw_user_meta_data is intentionally ignored.
create function member_claim_private.authorize_auth_insert() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
declare c member_claim_private.claims%rowtype; ticket text:=new.raw_app_meta_data->>'member_claim_ticket';
begin
 if not exists(select 1 from public.profiles where id=new.id) then
  if ticket is not null then raise exception using errcode='42501',message='Claim identity mismatch'; end if;
  return new;
 end if;
 select * into c from member_claim_private.claims where member_id=new.id and state='provisioning' for update;
 if not found or c.verified_at is null or c.expires_at<=clock_timestamp()
   or c.ticket_expires_at<=clock_timestamp() or lower(btrim(new.email)) is distinct from c.email
   or ticket is null or ticket !~ '^[a-f0-9]{64}$'
   or c.ticket_hash is distinct from sha256(convert_to(ticket,'UTF8')) then
  raise exception using errcode='42501',message='Claim provisioning unavailable'; end if;
 perform member_claim_private.lock_approval_scope(c.approved_by,c.member_id);
 update member_claim_private.claims set state='binding',binding_xid=txid_current() where id=c.id;
 new.raw_app_meta_data:=new.raw_app_meta_data-'member_claim_ticket';
 return new;
end $$;
create trigger zz_authorize_member_claim before insert on auth.users
for each row execute function member_claim_private.authorize_auth_insert();

create function member_claim_private.attach_existing_member(target uuid, auth_email text)
returns boolean language plpgsql security definer set search_path=pg_catalog as $$
declare c member_claim_private.claims%rowtype;
begin
 if not exists(select 1 from public.profiles where id=target) then return false; end if;
 select * into c from member_claim_private.claims where member_id=target and state='binding'
   and binding_xid=txid_current() and email=lower(btrim(auth_email)) for update;
 if not found then raise exception using errcode='42501',message='Claim attachment unavailable'; end if;
 update public.profiles set auth_user_id=id,email=c.email where id=target;
 update member_claim_private.claims set state='bound',bound_at=clock_timestamp(),ticket_hash=null where id=c.id;
 insert into member_claim_private.claim_audit(claim_id,event,actor_id) values(c.id,'bound',c.approved_by);
 return true;
end $$;

create function member_claim_private.check_binding_consumed() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
begin
 if exists(select 1 from member_claim_private.claims where state='binding' and binding_xid=txid_current()) then
  raise exception using errcode='23514',message='Auth insert abandoned a claim binding'; end if;
 return null;
end $$;
create trigger zz_check_member_claim_binding after insert on auth.users
for each statement execute function member_claim_private.check_binding_consumed();

-- The runner installs exact catalog definitions, then integrates only these two
-- branches. Retain ordinary signup, but never enroll an imported member using
-- requested_class_id supplied in signup metadata.
do $patch$
declare definition text; marker text:=E'begin\n';
begin
 if inet_server_addr() is distinct from '127.0.0.1'::inet
   or current_setting('jwg.claim_local',true) is distinct from 'on' then
  raise exception 'Disposable local claim integration required'; end if;
 definition:=replace(pg_get_functiondef('public.handle_new_user()'::regprocedure),E'\r\n',E'\n');
 if position(marker in definition)=0 then raise exception 'Signup definition marker missing'; end if;
 definition:=replace(definition,marker,marker || E'  if member_claim_private.attach_existing_member(new.id,new.email) then return new; end if;\n');
 execute definition;
 definition:=replace(pg_get_functiondef('public.handle_email_verified()'::regprocedure),E'\r\n',E'\n');
 if position(marker in definition)=0 then raise exception 'Confirmation definition marker missing'; end if;
 definition:=replace(definition,marker,marker || $branch$
 if exists(select 1 from public.profiles where id=new.id and member_origin='import') then
   if not exists(select 1 from public.profiles where id=new.id and auth_user_id=new.id
     and (email=lower(btrim(new.email)) or (
       old.email_confirmed_at is not null and email=lower(btrim(old.email))
     ))) then raise exception 'Imported Auth identity mismatch'; end if;
   -- Initial claim confirmation must still match its bound email. Once already
   -- confirmed, Auth may change email and confirmation together; the existing
   -- later email-sync trigger updates the profile and writes its contact audit.
   -- Do not require that later trigger's result before it has executed.
   if old.email_confirmed_at is null and new.email_confirmed_at is not null then
     update public.profiles set email_verified=true,updated_at=now() where id=new.id;
   end if;
   return new;
 end if;
$branch$);
 execute definition;
end $patch$;
revoke all on all functions in schema member_claim_private from public,anon,authenticated,service_role;
revoke all on function same_id_import_private.binding_allowed(public.profiles,public.profiles)
from public,anon,authenticated,service_role;
commit;
