-- Hosted Auth transaction compatibility. Pending; production claims remain off.
-- 064 is immutable. Apply once under an externally verified target/ledger guard.
DO $claim_065_guard$ BEGIN
 IF current_setting('jwg.claim_hosted_migration',true) IS DISTINCT FROM '065' THEN
  RAISE EXCEPTION 'Explicit 065 migration guard required';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_roles r ON r.oid=p.proowner
  WHERE n.nspname='member_claim_private' AND p.proname='authorize_auth_insert' AND r.rolname='postgres' AND r.rolbypassrls) THEN
  RAISE EXCEPTION 'Expected trusted 064 function owner missing';
 END IF;
END $claim_065_guard$;
CREATE TABLE member_claim_private.auth_insert_proofs (
 member_id uuid PRIMARY KEY REFERENCES public.profiles(id),
 claim_id uuid NOT NULL REFERENCES member_claim_private.claims(id),
 binding_xid bigint NOT NULL,
 expected_ticket_hash bytea NOT NULL,
 ticket_validated boolean NOT NULL DEFAULT false
);
ALTER TABLE member_claim_private.auth_insert_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_claim_private.auth_insert_proofs FORCE ROW LEVEL SECURITY;
REVOKE ALL ON member_claim_private.auth_insert_proofs FROM public,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION member_claim_private.authorize_auth_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE c member_claim_private.claims%rowtype; ticket text:=new.raw_app_meta_data->>'member_claim_ticket';
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=new.id) THEN
  IF ticket IS NOT NULL THEN RAISE EXCEPTION USING errcode='42501',message='Claim identity mismatch'; END IF;
  RETURN new;
 END IF;
 SELECT * INTO c FROM member_claim_private.claims WHERE member_id=new.id AND state='provisioning' FOR UPDATE;
 IF NOT FOUND OR c.verified_at IS NULL OR c.expires_at<=clock_timestamp()
 OR c.ticket_expires_at IS NULL OR c.ticket_expires_at<=clock_timestamp() OR c.ticket_hash IS NULL
 OR lower(btrim(new.email)) IS DISTINCT FROM c.email THEN
  RAISE EXCEPTION USING errcode='42501',message='Claim provisioning unavailable';
 END IF;
 PERFORM member_claim_private.lock_approval_scope(c.approved_by,c.member_id);
 IF ticket IS NOT NULL AND (ticket !~ '^[a-f0-9]{64}$' OR c.ticket_hash IS DISTINCT FROM sha256(convert_to(ticket,'UTF8'))) THEN
  RAISE EXCEPTION USING errcode='42501',message='Claim provisioning unavailable';
 END IF;
 INSERT INTO member_claim_private.auth_insert_proofs(member_id,claim_id,binding_xid,expected_ticket_hash,ticket_validated)
 VALUES(new.id,c.id,txid_current(),c.ticket_hash,ticket IS NOT NULL);
 UPDATE member_claim_private.claims SET state='binding',binding_xid=txid_current() WHERE id=c.id;
 new.raw_app_meta_data:=new.raw_app_meta_data-'member_claim_ticket';
 RETURN new;
END $$;

CREATE FUNCTION member_claim_private.validate_auth_update_ticket() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE ticket text:=new.raw_app_meta_data->>'member_claim_ticket'; proof member_claim_private.auth_insert_proofs%rowtype;
BEGIN
 IF ticket IS NULL THEN RETURN new; END IF;
 SELECT * INTO proof FROM member_claim_private.auth_insert_proofs WHERE member_id=new.id AND binding_xid=txid_current() FOR UPDATE;
 IF NOT FOUND OR ticket !~ '^[a-f0-9]{64}$'
 OR proof.expected_ticket_hash IS DISTINCT FROM sha256(convert_to(ticket,'UTF8'))
 OR NOT EXISTS(SELECT 1 FROM member_claim_private.claims c WHERE c.id=proof.claim_id
   AND c.state='bound' AND c.member_id=new.id AND c.binding_xid=txid_current() AND c.email=lower(btrim(new.email))) THEN
  RAISE EXCEPTION USING errcode='42501',message='Claim transaction ticket unavailable';
 END IF;
 UPDATE member_claim_private.auth_insert_proofs SET ticket_validated=true WHERE member_id=new.id AND binding_xid=txid_current();
 new.raw_app_meta_data:=new.raw_app_meta_data-'member_claim_ticket';
 RETURN new;
END $$;
CREATE TRIGGER zz_validate_claim_update_ticket BEFORE UPDATE OF raw_app_meta_data ON auth.users
FOR EACH ROW EXECUTE FUNCTION member_claim_private.validate_auth_update_ticket();

CREATE FUNCTION member_claim_private.finish_auth_insert_proof() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE proof member_claim_private.auth_insert_proofs%rowtype;
BEGIN
 SELECT * INTO proof FROM member_claim_private.auth_insert_proofs WHERE member_id=new.id AND binding_xid=txid_current() FOR UPDATE;
 IF NOT FOUND THEN
  IF EXISTS(SELECT 1 FROM public.profiles WHERE id=new.id AND member_origin='import') THEN
   RAISE EXCEPTION USING errcode='42501',message='Claim transaction proof missing';
  END IF;
  RETURN null;
 END IF;
 IF NOT proof.ticket_validated OR NOT EXISTS(
  SELECT 1 FROM member_claim_private.claims c JOIN public.profiles p ON p.id=c.member_id
  JOIN auth.users u ON u.id=p.auth_user_id
  WHERE c.id=proof.claim_id AND c.state='bound' AND c.binding_xid=txid_current()
   AND p.id=new.id AND p.auth_user_id=p.id AND p.email=c.email AND p.email_verified
   AND u.email=c.email AND u.email_confirmed_at IS NOT NULL AND u.deleted_at IS NULL
   AND coalesce(u.encrypted_password,'')<>''
   AND NOT (u.raw_app_meta_data ? 'member_claim_ticket')
   AND EXISTS(SELECT 1 FROM auth.identities i WHERE i.user_id=p.id AND i.provider='email' AND i.email=c.email)
 ) THEN RAISE EXCEPTION USING errcode='42501',message='Claim transaction proof incomplete'; END IF;
 DELETE FROM member_claim_private.auth_insert_proofs WHERE member_id=new.id AND binding_xid=txid_current();
 RETURN null;
END $$;
CREATE CONSTRAINT TRIGGER zz_finish_claim_auth_transaction AFTER INSERT ON auth.users
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION member_claim_private.finish_auth_insert_proof();
REVOKE ALL ON FUNCTION member_claim_private.validate_auth_update_ticket(),member_claim_private.finish_auth_insert_proof()
FROM public,anon,authenticated,service_role;
