CREATE FUNCTION pg_temp.assert_status(ok boolean,label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'Status test failed: %',label; END IF; END $$;
CREATE TEMP TABLE status_fixture(actor uuid,member uuid);
INSERT INTO status_fixture SELECT id,'85000000-0000-4000-8000-000000000001' FROM public.profiles WHERE is_super_admin AND account_status='active' AND auth_user_id=id ORDER BY id LIMIT 1;
SELECT pg_temp.assert_status((SELECT count(*)=1 FROM status_fixture),'actor');
SELECT set_config('request.jwt.claim.sub','',true);
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('85000000-0000-4000-8000-000000000001','status085@example.invalid','{"full_name":"Synthetic Status Test","phone":"08123456789","date_of_birth":"1990-01-01"}');
UPDATE public.profiles SET email_verified=true WHERE id='85000000-0000-4000-8000-000000000001';
INSERT INTO auth.sessions(id,user_id) VALUES('85000000-0000-4000-8000-000000000002','85000000-0000-4000-8000-000000000001');
INSERT INTO auth.refresh_tokens(token,user_id,session_id) VALUES('synthetic-status085','85000000-0000-4000-8000-000000000001','85000000-0000-4000-8000-000000000002');
GRANT SELECT ON status_fixture TO authenticated;
SELECT set_config('request.jwt.claim.sub',(SELECT actor::text FROM status_fixture),true);
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_status(public.get_member_administrative_status((SELECT member FROM status_fixture))='active','initial active');
SELECT pg_temp.assert_status(public.set_member_administrative_status((SELECT member FROM status_fixture),'active','inactive')='inactive','inactive');
RESET ROLE;
SELECT pg_temp.assert_status((SELECT account_status='active' FROM public.profiles WHERE id=(SELECT member FROM status_fixture)),'inactive retains access');
SELECT pg_temp.assert_status((SELECT count(*)=1 FROM auth.sessions WHERE user_id=(SELECT member FROM status_fixture)),'inactive retains session');
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN PERFORM public.set_member_administrative_status((SELECT member FROM status_fixture),'active','terminated'); RAISE EXCEPTION 'stale edit accepted';
 EXCEPTION WHEN serialization_failure THEN NULL; END;
END $$;
SELECT public.set_member_administrative_status((SELECT member FROM status_fixture),'inactive','terminated');
RESET ROLE;
SELECT pg_temp.assert_status((SELECT account_status='disabled' FROM public.profiles WHERE id=(SELECT member FROM status_fixture)),'disabled');
SELECT pg_temp.assert_status((SELECT banned_until>'9990-01-01' FROM auth.users WHERE id=(SELECT member FROM status_fixture)),'auth banned');
SELECT pg_temp.assert_status(NOT EXISTS(SELECT 1 FROM auth.sessions WHERE user_id=(SELECT member FROM status_fixture)),'sessions revoked');
SELECT pg_temp.assert_status(NOT EXISTS(SELECT 1 FROM auth.refresh_tokens WHERE user_id=(SELECT member::text FROM status_fixture)),'refresh tokens revoked');
DO $$ BEGIN
 BEGIN INSERT INTO auth.sessions(id,user_id) VALUES(gen_random_uuid(),(SELECT member FROM status_fixture)); RAISE EXCEPTION 'terminated login accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN UPDATE public.profiles SET account_status='active' WHERE id=(SELECT member FROM status_fixture); RAISE EXCEPTION 'profile bypass accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
UPDATE auth.users SET banned_until=null WHERE id=(SELECT member FROM status_fixture);
SELECT pg_temp.assert_status((SELECT banned_until>'9990-01-01' FROM auth.users WHERE id=(SELECT member FROM status_fixture)),'independent unban blocked');
SET LOCAL ROLE authenticated;
SELECT public.set_member_administrative_status((SELECT member FROM status_fixture),'terminated','inactive');
RESET ROLE;
SELECT pg_temp.assert_status((SELECT banned_until IS NULL FROM auth.users WHERE id=(SELECT member FROM status_fixture)),'ban restored');
INSERT INTO auth.sessions(id,user_id) VALUES(gen_random_uuid(),(SELECT member FROM status_fixture));
SELECT pg_temp.assert_status((SELECT account_status='active' FROM public.profiles WHERE id=(SELECT member FROM status_fixture)),'restored inactive access');
SET LOCAL ROLE authenticated;
SELECT public.set_member_administrative_status((SELECT member FROM status_fixture),'inactive','active');
DO $$ BEGIN
 BEGIN PERFORM public.set_member_administrative_status((SELECT actor FROM status_fixture),'active','terminated'); RAISE EXCEPTION 'self termination accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.set_member_administrative_status((SELECT member FROM status_fixture),'active','invalid'); RAISE EXCEPTION 'invalid status accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub',(SELECT member::text FROM status_fixture),true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN PERFORM public.set_member_administrative_status((SELECT member FROM status_fixture),'active','terminated'); RAISE EXCEPTION 'member mutation accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.get_member_administrative_status((SELECT actor FROM status_fixture)); RAISE EXCEPTION 'member read accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SELECT pg_temp.assert_status((SELECT count(*)=4 FROM member_status_private.audit WHERE member_id=(SELECT member FROM status_fixture)),'four audited transitions');
SELECT pg_temp.assert_status(NOT has_function_privilege('anon','public.set_member_administrative_status(uuid,text,text)','execute'),'anon denied');
SELECT pg_temp.assert_status(NOT has_function_privilege('service_role','public.set_member_administrative_status(uuid,text,text)','execute'),'service caller denied');
-- An unrelated Auth ban must survive a terminate/reactivate roundtrip.
UPDATE auth.users SET banned_until='2099-01-01' WHERE id=(SELECT member FROM status_fixture);
SELECT set_config('request.jwt.claim.sub',(SELECT actor::text FROM status_fixture),true);
SET LOCAL ROLE authenticated;
SELECT public.set_member_administrative_status((SELECT member FROM status_fixture),'active','terminated');
SELECT public.set_member_administrative_status((SELECT member FROM status_fixture),'terminated','active');
RESET ROLE;
SELECT pg_temp.assert_status((SELECT banned_until='2099-01-01'::timestamptz FROM auth.users WHERE id=(SELECT member FROM status_fixture)),'independent ban preserved');
UPDATE public.profiles SET date_of_passing='2020-01-01' WHERE id=(SELECT member FROM status_fixture);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN PERFORM public.set_member_administrative_status((SELECT member FROM status_fixture),'terminated','active'); RAISE EXCEPTION 'deceased reactivation accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
RESET ROLE;
SELECT 'STATUS085_ASSERTIONS_PASSED';
