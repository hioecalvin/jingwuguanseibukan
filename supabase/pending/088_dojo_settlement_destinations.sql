-- Each participating dojo nominates a separate account for its share. Bank
-- details are supplied through the application by an authorised finance admin.
BEGIN;
CREATE SCHEMA settlement_private AUTHORIZATION postgres;
REVOKE ALL ON SCHEMA settlement_private FROM public,anon,authenticated,service_role;

CREATE TABLE settlement_private.scopes (
  dojo_id uuid PRIMARY KEY REFERENCES public.dojos(id),
  effective_on date NOT NULL DEFAULT current_date,
  current_nomination uuid
);
CREATE TABLE settlement_private.nominations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dojo_id uuid NOT NULL REFERENCES settlement_private.scopes(dojo_id),
  bank_name text NOT NULL CHECK(length(btrim(bank_name)) BETWEEN 1 AND 120),
  account_holder_name text NOT NULL CHECK(length(btrim(account_holder_name)) BETWEEN 1 AND 150),
  account_number text NOT NULL CHECK(length(btrim(account_number)) BETWEEN 1 AND 100),
  nominated_by uuid NOT NULL REFERENCES public.profiles(id),
  nominated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(dojo_id,id)
);
ALTER TABLE settlement_private.scopes ADD FOREIGN KEY(dojo_id,current_nomination)
  REFERENCES settlement_private.nominations(dojo_id,id);
CREATE TABLE settlement_private.destinations (
  settlement_id uuid PRIMARY KEY REFERENCES public.dojo_settlements(id),
  nomination_id uuid NOT NULL REFERENCES settlement_private.nominations(id)
);
ALTER TABLE settlement_private.scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_private.nominations ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_private.destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_private.scopes FORCE ROW LEVEL SECURITY;
ALTER TABLE settlement_private.nominations FORCE ROW LEVEL SECURITY;
ALTER TABLE settlement_private.destinations FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA settlement_private FROM public,anon,authenticated,service_role;

-- Operator setup, on the verified production identities only. Fail on changed
-- identity, previous configuration, or finance history instead of overwriting it.
DO $setup$
DECLARE expected record; dojo public.dojos%rowtype;
BEGIN
  LOCK TABLE public.membership_payments, public.dojo_settlements IN SHARE MODE;
  FOR expected IN SELECT * FROM (VALUES
    ('849e3573-dc96-4a9a-9ea2-5d5051aef7e1'::uuid,'Aikido','Chushin',true),
    ('9e5f895c-4f2c-40df-ab64-0ce3fab226a0','Karate','Chushin',true),
    ('5efc11aa-dbf9-417f-aaaa-6c9799efb57e','Taijiquan','Zhongxin',true),
    ('881025c4-13d1-4ae8-9345-046a5d468cda','Xingyiquan','Zhongxin',true),
    ('6660e2bd-bcbf-4cca-9d30-f45475a1aeca','Kungfu Kids','Zhongxin',true),
    ('6662df61-5d54-47d6-9e9a-d1eeec8060c8','Aikido','Kagami',false),
    ('f2a2c754-2d0b-4f63-a6da-994e935e26e2','Aikido','Hayashitane',false),
    ('2eea0a4e-fafe-4020-a59b-37985fe52919','Aikido','UBM Aikido Club',false)
  ) AS target(id,class_name,dojo_name,shares) LOOP
    SELECT d.* INTO STRICT dojo FROM public.dojos d JOIN public.classes c ON c.id=d.class_id
    WHERE d.id=expected.id AND d.name=expected.dojo_name AND c.name=expected.class_name
      AND d.active AND c.is_active FOR UPDATE OF d;
    IF dojo.requires_superadmin_share IS DISTINCT FROM false OR dojo.superadmin_share_percent IS DISTINCT FROM 0 THEN
      RAISE EXCEPTION 'Unexpected prior rule for % / %',expected.class_name,expected.dojo_name;
    END IF;
    IF expected.shares THEN
      IF EXISTS(SELECT FROM public.membership_payments WHERE dojo_id=dojo.id)
        OR EXISTS(SELECT FROM public.dojo_settlements WHERE dojo_id=dojo.id) THEN
        RAISE EXCEPTION 'Settlement history requires review for % / %',expected.class_name,expected.dojo_name;
      END IF;
      INSERT INTO settlement_private.scopes(dojo_id) VALUES(dojo.id);
      INSERT INTO public.dojo_settlement_config_history
        (dojo_id,old_requires_share,new_requires_share,old_share_percent,new_share_percent,changed_by)
        VALUES(dojo.id,false,true,0,30,NULL);
      UPDATE public.dojos SET requires_superadmin_share=true,superadmin_share_percent=30 WHERE id=dojo.id;
    END IF;
  END LOOP;
END $setup$;

CREATE FUNCTION public.get_my_settlement_destinations()
RETURNS TABLE(dojo_id uuid,dojo_name text,class_name text,share_percent numeric,nomination_id uuid,collection_configured boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT s.dojo_id,d.name::text,c.name::text,d.superadmin_share_percent,s.current_nomination,
    EXISTS(SELECT FROM public.dojo_receiving_accounts a WHERE a.dojo_id=d.id AND a.active)
  FROM settlement_private.scopes s JOIN public.dojos d ON d.id=s.dojo_id
  JOIN public.classes c ON c.id=d.class_id
  WHERE d.active AND c.is_active AND d.requires_superadmin_share AND public.can_access_dojo_finance(d.id,auth.uid())
  ORDER BY c.name,d.name
$$;

CREATE FUNCTION public.nominate_settlement_destination(target_dojo_id uuid,expected_nomination_id uuid,
  new_bank_name text,new_account_holder_name text,new_account_number text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE current_id uuid; next_id uuid; bank text:=btrim(new_bank_name);
  holder text:=btrim(new_account_holder_name); number_value text:=btrim(new_account_number);
BEGIN
  IF public.can_access_dojo_finance(target_dojo_id,auth.uid()) IS NOT TRUE THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Dojo finance access required';
  END IF;
  SELECT s.current_nomination INTO current_id FROM settlement_private.scopes s
  JOIN public.dojos d ON d.id=s.dojo_id JOIN public.classes c ON c.id=d.class_id
  WHERE s.dojo_id=target_dojo_id AND d.active AND c.is_active AND d.requires_superadmin_share
  FOR UPDATE OF s FOR SHARE OF d,c;
  IF NOT FOUND THEN RAISE EXCEPTION 'This dojo has no nominated share destination'; END IF;
  -- Serialise the final access decision with changes to the actor's status,
  -- Super Admin flag and dojo assignment. Recheck after any lock wait.
  PERFORM 1 FROM public.profiles p WHERE p.id=auth.uid() FOR SHARE;
  PERFORM 1 FROM public.dojo_admin_assignments a
  WHERE a.user_id=auth.uid() AND a.dojo_id=target_dojo_id AND a.active FOR SHARE;
  IF public.can_access_dojo_finance(target_dojo_id,auth.uid()) IS NOT TRUE THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Dojo finance access required';
  END IF;
  IF current_id IS DISTINCT FROM expected_nomination_id THEN
    RAISE EXCEPTION 'The destination changed. Refresh before saving.';
  END IF;
  IF coalesce(length(bank),0) NOT BETWEEN 1 AND 120 OR coalesce(length(holder),0) NOT BETWEEN 1 AND 150
     OR coalesce(length(number_value),0) NOT BETWEEN 1 AND 100 OR number_value !~ '[[:alnum:]]' THEN
    RAISE EXCEPTION 'Enter a bank, account holder and account number';
  END IF;
  IF EXISTS(SELECT FROM public.dojo_receiving_accounts a WHERE a.dojo_id=target_dojo_id AND a.active
    AND lower(btrim(a.bank_name))=lower(bank)
    AND regexp_replace(lower(a.account_number),'[[:space:]-]','','g')=regexp_replace(lower(number_value),'[[:space:]-]','','g')) THEN
    RAISE EXCEPTION 'Nominate a different account from the member collection account';
  END IF;
  IF EXISTS(SELECT FROM settlement_private.nominations n WHERE n.id=current_id AND
    (n.bank_name,n.account_holder_name,n.account_number)=(bank,holder,number_value)) THEN RETURN current_id; END IF;
  INSERT INTO settlement_private.nominations(dojo_id,bank_name,account_holder_name,account_number,nominated_by)
  VALUES(target_dojo_id,bank,holder,number_value,auth.uid()) RETURNING id INTO next_id;
  UPDATE settlement_private.scopes SET current_nomination=next_id WHERE dojo_id=target_dojo_id;
  RETURN next_id;
END $$;

CREATE FUNCTION public.get_settlement_destination_account(target_dojo_id uuid,target_settlement_id uuid DEFAULT NULL)
RETURNS TABLE(nomination_id uuid,bank_name text,account_holder_name text,account_number text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF public.can_access_dojo_finance(target_dojo_id,auth.uid()) IS NOT TRUE THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Dojo finance access required';
  END IF;
  RETURN QUERY SELECT n.id,n.bank_name,n.account_holder_name,n.account_number
  FROM settlement_private.nominations n WHERE n.dojo_id=target_dojo_id AND n.id=CASE WHEN target_settlement_id IS NULL
    THEN (SELECT s.current_nomination FROM settlement_private.scopes s WHERE s.dojo_id=target_dojo_id)
    ELSE (SELECT h.nomination_id FROM settlement_private.destinations h JOIN public.dojo_settlements d
      ON d.id=h.settlement_id WHERE d.id=target_settlement_id AND d.dojo_id=target_dojo_id) END;
END $$;

CREATE FUNCTION settlement_private.pin_destination() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE destination uuid;
BEGIN
  SELECT current_nomination INTO destination FROM settlement_private.scopes WHERE dojo_id=NEW.dojo_id FOR SHARE;
  IF NOT FOUND THEN RETURN NEW; END IF;
  IF destination IS NULL THEN RAISE EXCEPTION 'Nominate the share destination before creating a settlement'; END IF;
  INSERT INTO settlement_private.destinations(settlement_id,nomination_id) VALUES(NEW.id,destination);
  RETURN NEW;
END $$;
CREATE TRIGGER pin_dojo_settlement_destination AFTER INSERT ON public.dojo_settlements
FOR EACH ROW EXECUTE FUNCTION settlement_private.pin_destination();

CREATE FUNCTION settlement_private.check_collection() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE destination uuid;
BEGIN
  SELECT current_nomination INTO destination FROM settlement_private.scopes WHERE dojo_id=NEW.dojo_id FOR UPDATE;
  IF EXISTS(SELECT FROM settlement_private.nominations n WHERE n.id=destination AND lower(n.bank_name)=lower(btrim(NEW.bank_name))
    AND regexp_replace(lower(n.account_number),'[[:space:]-]','','g')=regexp_replace(lower(NEW.account_number),'[[:space:]-]','','g')) THEN
    RAISE EXCEPTION 'The member collection account must differ from the nominated share account';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER separate_settlement_collection BEFORE INSERT OR UPDATE ON public.dojo_receiving_accounts
FOR EACH ROW WHEN(NEW.active) EXECUTE FUNCTION settlement_private.check_collection();

CREATE FUNCTION settlement_private.preserve_history() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN RAISE EXCEPTION 'Recorded settlement destinations are immutable'; END $$;
CREATE TRIGGER immutable_nominations BEFORE UPDATE OR DELETE ON settlement_private.nominations
FOR EACH ROW EXECUTE FUNCTION settlement_private.preserve_history();
CREATE TRIGGER immutable_destinations BEFORE UPDATE OR DELETE ON settlement_private.destinations
FOR EACH ROW EXECUTE FUNCTION settlement_private.preserve_history();

CREATE FUNCTION settlement_private.preserve_scope() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
  IF TG_OP='DELETE' OR (NEW.dojo_id,NEW.effective_on) IS DISTINCT FROM (OLD.dojo_id,OLD.effective_on) THEN
    RAISE EXCEPTION 'Settlement rule activation is immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER immutable_scope_activation BEFORE UPDATE OR DELETE ON settlement_private.scopes
FOR EACH ROW EXECUTE FUNCTION settlement_private.preserve_scope();

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA settlement_private FROM public,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.get_my_settlement_destinations(),public.nominate_settlement_destination(uuid,uuid,text,text,text),
  public.get_settlement_destination_account(uuid,uuid) FROM public,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_my_settlement_destinations(),public.nominate_settlement_destination(uuid,uuid,text,text,text),
  public.get_settlement_destination_account(uuid,uuid) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
