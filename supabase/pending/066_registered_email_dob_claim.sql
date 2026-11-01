-- Prepared forward migration. Member claiming remains disabled until release acceptance.
BEGIN;
CREATE FUNCTION public.request_registered_member_claim(
  registered_email text, registered_date_of_birth date, proof_token text, site_origin text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE candidates uuid[]; target public.profiles%rowtype; normalized_email text;
BEGIN
  normalized_email:=lower(btrim(registered_email));
  IF normalized_email IS NULL OR length(normalized_email)>254
     OR normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
     OR registered_date_of_birth IS NULL OR NOT isfinite(registered_date_of_birth) OR registered_date_of_birth>current_date THEN
    RETURN;
  END IF;
  -- Ambiguous matches must never choose a member arbitrarily.
  SELECT array_agg(p.id) INTO candidates FROM public.profiles p
  WHERE lower(btrim(p.email))=normalized_email AND p.date_of_birth=registered_date_of_birth;
  IF coalesce(cardinality(candidates),0)<>1 THEN RETURN; END IF;
  SELECT * INTO target FROM public.profiles WHERE id=candidates[1] FOR UPDATE;
  IF NOT FOUND OR lower(btrim(target.email)) IS DISTINCT FROM normalized_email
     OR target.date_of_birth IS DISTINCT FROM registered_date_of_birth
     OR target.member_origin IS DISTINCT FROM 'import' OR target.auth_user_id IS NOT NULL
     OR target.account_status::text IS DISTINCT FROM 'active' OR target.date_of_passing IS NOT NULL
     OR target.is_super_admin IS DISTINCT FROM false OR target.is_grading_assessor IS DISTINCT FROM false THEN RETURN; END IF;
  -- Use the stored identity and verified-match address, never a caller-supplied JS ID.
  -- Existing proof, expiry, audit, queue, Dojo Admin review and setup rules remain in force.
  PERFORM public.request_member_claim(target.registration_number,normalized_email,proof_token,site_origin);
END;
$$;
REVOKE ALL ON FUNCTION public.request_registered_member_claim(text,date,text,text)
FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.request_registered_member_claim(text,date,text,text) TO service_role;
COMMIT;
