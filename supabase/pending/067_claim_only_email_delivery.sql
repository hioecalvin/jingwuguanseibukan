-- Claim-only delivery. Never selects ordinary notifications or processes memorials.
BEGIN;
CREATE FUNCTION public.claim_member_account_email(
  target_email_type text, registered_email text DEFAULT NULL,
  registered_date_of_birth date DEFAULT NULL, target_claim_id uuid DEFAULT NULL
) RETURNS TABLE(email_id uuid, recipient_email text, email_type text, subject text,
  template_data jsonb, reference_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE c member_claim_private.claims%rowtype; queued_id uuid;
BEGIN
  IF target_email_type='member_claim_verification' THEN
    IF target_claim_id IS NOT NULL OR registered_email IS NULL OR registered_date_of_birth IS NULL THEN RETURN; END IF;
    SELECT claim.* INTO c FROM member_claim_private.claims claim
      JOIN public.profiles p ON p.id=claim.member_id
      WHERE claim.state='pending_email' AND claim.email=lower(btrim(registered_email))
        AND lower(btrim(p.email))=claim.email AND p.date_of_birth=registered_date_of_birth
        AND claim.expires_at>clock_timestamp()
      ORDER BY claim.expires_at DESC LIMIT 1 FOR UPDATE OF claim SKIP LOCKED;
  ELSIF target_email_type='member_claim_setup' THEN
    IF target_claim_id IS NULL OR registered_email IS NOT NULL OR registered_date_of_birth IS NOT NULL THEN RETURN; END IF;
    SELECT claim.* INTO c FROM member_claim_private.claims claim
      WHERE claim.id=target_claim_id AND claim.state='approved'
        AND claim.expires_at>clock_timestamp() AND claim.setup_expires_at>clock_timestamp()
        AND claim.verified_at IS NOT NULL FOR UPDATE SKIP LOCKED;
  ELSE RETURN;
  END IF;
  IF c.id IS NULL THEN RETURN; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=c.member_id
    AND p.member_origin='import' AND p.auth_user_id IS NULL AND p.account_status::text='active'
    AND p.date_of_passing IS NULL AND NOT p.is_super_admin AND NOT p.is_grading_assessor
    AND lower(btrim(p.email))=c.email) THEN RETURN; END IF;
  IF target_email_type='member_claim_setup' THEN
    BEGIN PERFORM member_claim_private.lock_approval_scope(c.approved_by,c.member_id);
    EXCEPTION WHEN insufficient_privilege THEN RETURN; END;
  END IF;
  SELECT e.id INTO queued_id FROM public.email_outbox e
    WHERE e.reference_type='member_claim' AND e.reference_id=c.id
      AND e.email_type=target_email_type AND e.recipient_email=c.email
      AND e.recipient_user_id IS NULL
      AND e.dedupe_key=(CASE WHEN target_email_type='member_claim_verification'
        THEN 'member-claim-verification/' ELSE 'member-claim-setup/' END)||c.id::text
      -- Resend idempotency keys expire after 24h. Stop before that boundary.
      AND e.created_at>clock_timestamp()-interval '23 hours'
      AND e.attempts<e.max_attempts
      AND ((e.status IN ('pending','failed') AND (e.next_attempt_at IS NULL OR e.next_attempt_at<=clock_timestamp()))
        OR (e.status='processing' AND e.last_attempt_at<clock_timestamp()-interval '15 minutes'))
    ORDER BY e.created_at LIMIT 1 FOR UPDATE SKIP LOCKED;
  IF queued_id IS NULL THEN RETURN; END IF;
  UPDATE public.email_outbox e SET status='processing',attempts=e.attempts+1,
    last_attempt_at=clock_timestamp(),next_attempt_at=NULL,failed_at=NULL,updated_at=clock_timestamp()
    WHERE e.id=queued_id;
  RETURN QUERY SELECT e.id,e.recipient_email,e.email_type,e.subject,e.template_data,e.reference_id
    FROM public.email_outbox e WHERE e.id=queued_id;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_member_account_email(text,text,date,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.claim_member_account_email(text,text,date,uuid) TO service_role;
COMMIT;
