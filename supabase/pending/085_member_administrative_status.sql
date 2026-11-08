BEGIN;
CREATE SCHEMA member_status_private;
REVOKE ALL ON SCHEMA member_status_private FROM public,anon,authenticated,service_role;
CREATE TABLE member_status_private.state (
 member_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE RESTRICT,
 status text NOT NULL CHECK(status IN ('active','inactive','terminated')),
 prior_ban timestamptz,
 owned_ban timestamptz,
 changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE member_status_private.audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
 actor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
 old_status text NOT NULL, new_status text NOT NULL,
 changed_at timestamptz NOT NULL DEFAULT now(),
 CHECK(old_status IN ('active','inactive','terminated')),
 CHECK(new_status IN ('active','inactive','terminated'))
);
ALTER TABLE member_status_private.state ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_status_private.state FORCE ROW LEVEL SECURITY;
ALTER TABLE member_status_private.audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_status_private.audit FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA member_status_private FROM public,anon,authenticated,service_role;
CREATE FUNCTION member_status_private.preserve_audit() RETURNS trigger
 LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN RAISE EXCEPTION 'Member status history is immutable'; END $$;
CREATE TRIGGER immutable_status_audit BEFORE UPDATE OR DELETE ON member_status_private.audit
 FOR EACH ROW EXECUTE FUNCTION member_status_private.preserve_audit();
CREATE FUNCTION public.get_member_administrative_status(target_member_id uuid) RETURNS text
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE result text;
BEGIN
 IF NOT public.is_active_super_admin(auth.uid()) THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Super Admin access required';
 END IF;
 SELECT CASE WHEN p.account_status='disabled' THEN 'terminated' ELSE coalesce(s.status,'active') END INTO result
 FROM public.profiles p LEFT JOIN member_status_private.state s ON s.member_id=p.id WHERE p.id=target_member_id;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='Member missing'; END IF;
 RETURN result;
END $$;
CREATE FUNCTION public.set_member_administrative_status(target_member_id uuid,expected_status text,new_status text) RETURNS text
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE actor public.profiles%rowtype; target public.profiles%rowtype;
 current_status text; saved member_status_private.state%rowtype; prior timestamptz; owned timestamptz;
BEGIN
 IF expected_status IS NULL OR new_status IS NULL OR
 expected_status NOT IN ('active','inactive','terminated') OR new_status NOT IN ('active','inactive','terminated') THEN
  RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Invalid member status';
 END IF;
 SELECT * INTO actor FROM public.profiles WHERE id=auth.uid() FOR SHARE;
 IF NOT FOUND OR NOT public.is_active_super_admin(actor.id) THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Super Admin access required';
 END IF;
 SELECT * INTO target FROM public.profiles WHERE id=target_member_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='Member missing'; END IF;
 IF target.id=actor.id OR target.is_super_admin THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Super Admin accounts require the administrator access workflow';
 END IF;
 IF target.date_of_passing IS NOT NULL THEN
  RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Use the deceased-member workflow for this member';
 END IF;
 SELECT * INTO saved FROM member_status_private.state WHERE member_id=target.id;
 current_status:=CASE WHEN target.account_status='disabled' THEN 'terminated' ELSE coalesce(saved.status,'active') END;
 IF current_status IS DISTINCT FROM expected_status THEN
  RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='Member status changed; reload before saving';
 END IF;
 IF current_status=new_status THEN RETURN current_status; END IF;
 prior:=saved.prior_ban; owned:=saved.owned_ban;
 IF new_status='terminated' AND target.auth_user_id IS NOT NULL THEN
  SELECT banned_until INTO prior FROM auth.users WHERE id=target.auth_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Linked login missing'; END IF;
  owned:='9999-12-31 00:00:00+00'::timestamptz;
 END IF;
 INSERT INTO member_status_private.state(member_id,status,prior_ban,owned_ban)
 VALUES(target.id,new_status,prior,owned)
 ON CONFLICT(member_id) DO UPDATE SET status=excluded.status,prior_ban=excluded.prior_ban,owned_ban=excluded.owned_ban,changed_at=now();
 UPDATE public.profiles SET account_status=CASE WHEN new_status='terminated' THEN 'disabled'::public.account_status ELSE 'active'::public.account_status END WHERE id=target.id;
 IF target.auth_user_id IS NOT NULL THEN
  IF new_status='terminated' THEN
   UPDATE auth.users SET banned_until=owned WHERE id=target.auth_user_id;
   DELETE FROM auth.refresh_tokens WHERE user_id=target.auth_user_id::text;
   DELETE FROM auth.sessions WHERE user_id=target.auth_user_id;
  ELSIF current_status='terminated' AND owned IS NOT NULL THEN
   UPDATE auth.users SET banned_until=prior WHERE id=target.auth_user_id AND banned_until=owned;
   UPDATE member_status_private.state SET prior_ban=null,owned_ban=null WHERE member_id=target.id;
  END IF;
 END IF;
 INSERT INTO member_status_private.audit(member_id,actor_id,old_status,new_status) VALUES(target.id,actor.id,current_status,new_status);
 RETURN new_status;
END $$;
-- Preserve termination when independent profile and memorial operations run.
CREATE FUNCTION member_status_private.guard_profile_access() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF new.account_status='active' AND EXISTS(SELECT 1 FROM member_status_private.state WHERE member_id=new.id AND status='terminated') THEN
  RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Restore member status before enabling account access';
 END IF;
 RETURN new;
END $$;
CREATE TRIGGER administrative_status_profile_guard BEFORE UPDATE OF account_status ON public.profiles
 FOR EACH ROW EXECUTE FUNCTION member_status_private.guard_profile_access();
CREATE FUNCTION member_status_private.guard_auth_ban() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE owned timestamptz;
BEGIN
 SELECT s.owned_ban INTO owned FROM member_status_private.state s JOIN public.profiles p ON p.id=s.member_id
 WHERE p.auth_user_id=new.id AND s.status='terminated';
 IF owned IS NOT NULL AND (new.banned_until IS NULL OR new.banned_until<owned) THEN new.banned_until:=owned; END IF;
 RETURN new;
END $$;
CREATE TRIGGER administrative_status_auth_ban_guard BEFORE UPDATE OF banned_until ON auth.users
 FOR EACH ROW EXECUTE FUNCTION member_status_private.guard_auth_ban();
CREATE FUNCTION member_status_private.guard_session() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE target public.profiles%rowtype;
BEGIN
 SELECT * INTO target FROM public.profiles WHERE auth_user_id=new.user_id FOR SHARE;
 IF FOUND AND (target.account_status='disabled' OR target.date_of_passing IS NOT NULL) THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Account access is disabled';
 END IF;
 RETURN new;
END $$;
CREATE TRIGGER administrative_status_session_guard BEFORE INSERT OR UPDATE OF user_id ON auth.sessions
 FOR EACH ROW EXECUTE FUNCTION member_status_private.guard_session();
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA member_status_private FROM public,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.get_member_administrative_status(uuid) FROM public,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.set_member_administrative_status(uuid,text,text) FROM public,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_member_administrative_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_member_administrative_status(uuid,text,text) TO authenticated;
CREATE FUNCTION public.get_bulk_assessment_candidates_with_member_ids(target_class_id uuid,target_dojo_id uuid DEFAULT null)
 RETURNS SETOF jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF NOT public.is_active_app_user(auth.uid()) THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Active account required';
 END IF;
 RETURN QUERY
 SELECT to_jsonb(c)||jsonb_build_object('member_id',p.registration_number)
 FROM public.get_bulk_assessment_candidates(target_class_id,target_dojo_id) c
 JOIN public.profiles p ON p.id=c.user_id
 ORDER BY c.full_name,c.membership_id;
END $$;
REVOKE ALL ON FUNCTION public.get_bulk_assessment_candidates_with_member_ids(uuid,uuid) FROM public,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_bulk_assessment_candidates_with_member_ids(uuid,uuid) TO authenticated;
COMMIT;
