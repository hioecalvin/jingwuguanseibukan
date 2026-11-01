-- Prefix is the existing synthetic request/verification/approval/setup fixture.
CREATE FUNCTION pg_temp.hosted_check(ok boolean,label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'Hosted transaction check: %',label; END IF; END $$;
CREATE FUNCTION pg_temp.provider_order_attempt(mode text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE uid uuid:='21000000-0000-4000-8000-000000000001';
BEGIN
 INSERT INTO auth.users(id,email,raw_app_meta_data,raw_user_meta_data,encrypted_password) VALUES
 (uid,'claim-original@example.invalid','{"provider":"email","providers":["email"]}',
 CASE WHEN mode='user-metadata' THEN jsonb_build_object('member_claim_ticket',repeat('f',64)) ELSE '{}'::jsonb END,
 CASE WHEN mode='missing-password' THEN NULL ELSE extensions.crypt('LocalSyntheticOnlyaA9!',extensions.gen_salt('bf',4)) END);
 IF mode='early-constraint' THEN SET CONSTRAINTS auth.zz_finish_claim_auth_transaction IMMEDIATE; END IF;
 IF mode<>'missing-identity' THEN
  INSERT INTO auth.identities(provider_id,user_id,identity_data,provider)
  VALUES(uid::text,uid,jsonb_build_object('sub',uid,'email',CASE WHEN mode='wrong-identity' THEN 'wrong@example.invalid' ELSE 'claim-original@example.invalid' END),'email');
 END IF;
 UPDATE auth.users SET role='authenticated' WHERE id=uid;
 IF mode NOT IN ('missing-ticket','user-metadata') THEN
  UPDATE auth.users SET raw_app_meta_data=jsonb_build_object('provider','email','providers',jsonb_build_array('email'),
    'member_claim_ticket',CASE WHEN mode='wrong-ticket' THEN repeat('a',64) ELSE repeat('f',64) END) WHERE id=uid;
 END IF;
 IF mode<>'missing-confirmation' THEN UPDATE auth.users SET email_confirmed_at=now() WHERE id=uid; END IF;
 SET CONSTRAINTS auth.zz_finish_claim_auth_transaction IMMEDIATE;
 SET CONSTRAINTS auth.zz_finish_claim_auth_transaction DEFERRED;
END $$;
DO $denials$ DECLARE mode text; BEGIN
 FOREACH mode IN ARRAY ARRAY['missing-ticket','user-metadata','wrong-ticket','missing-identity','missing-confirmation','wrong-identity','early-constraint','missing-password'] LOOP
  BEGIN
   PERFORM pg_temp.provider_order_attempt(mode);
   RAISE EXCEPTION 'Invalid provider flow accepted: %',mode;
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  PERFORM pg_temp.hosted_check(NOT EXISTS(SELECT 1 FROM auth.users WHERE id='21000000-0000-4000-8000-000000000001'),'failed attempt rolls back Auth');
  PERFORM pg_temp.hosted_check((SELECT auth_user_id IS NULL AND NOT email_verified FROM profiles WHERE id='21000000-0000-4000-8000-000000000001'),'failed attempt rolls back profile');
  PERFORM pg_temp.hosted_check((SELECT state='provisioning' FROM member_claim_private.claims WHERE member_id='21000000-0000-4000-8000-000000000001'),'failed attempt restores claim');
  PERFORM pg_temp.hosted_check(NOT EXISTS(SELECT 1 FROM member_claim_private.auth_insert_proofs),'failed attempt rolls back proof');
 END LOOP;
END $denials$;
-- A revoked approval still prevents even the initial insert.
DO $revoked$ BEGIN
 BEGIN
  UPDATE profiles SET must_change_password=true WHERE id='10000000-0000-4000-8000-000000000001';
  PERFORM pg_temp.provider_order_attempt('valid');RAISE EXCEPTION 'Revoked approver accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $revoked$;
SELECT pg_temp.provider_order_attempt('valid');
SELECT pg_temp.hosted_check(NOT EXISTS(SELECT 1 FROM member_claim_private.auth_insert_proofs),'commit proof consumed');
SELECT pg_temp.hosted_check((SELECT NOT(raw_app_meta_data ? 'member_claim_ticket') FROM auth.users WHERE id='21000000-0000-4000-8000-000000000001'),'stored ticket removed');
SELECT pg_temp.hosted_check((SELECT auth_user_id=id AND email_verified AND NOT is_super_admin FROM profiles WHERE id='21000000-0000-4000-8000-000000000001'),'same ID active and unprivileged');
SET LOCAL ROLE service_role;
SELECT pg_temp.hosted_check(public.member_claim_setup_complete(:'claim_id',:'setup_token'),'completed only after full provider transaction');
SELECT pg_temp.hosted_check((SELECT already_complete FROM public.prepare_member_claim_setup(:'claim_id',:'setup_token',repeat('a',64))),'repeat setup no reset');
RESET ROLE;
SELECT pg_temp.hosted_check(NOT has_table_privilege('service_role','member_claim_private.auth_insert_proofs','SELECT'),'service cannot read proof');
SELECT pg_temp.hosted_check(NOT has_table_privilege('authenticated','member_claim_private.auth_insert_proofs','UPDATE'),'member cannot forge proof');
SELECT 'HOSTED_TRANSACTION_COMPATIBILITY_PASSED';
ROLLBACK;
