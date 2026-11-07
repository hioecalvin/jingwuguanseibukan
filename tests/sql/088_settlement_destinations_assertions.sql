DO $$ BEGIN
 IF (SELECT count(*) FROM public.dojos WHERE requires_superadmin_share AND superadmin_share_percent=30)<>5
 OR (SELECT count(*) FROM settlement_private.scopes)<>5
 OR (SELECT count(*) FROM public.dojo_settlement_config_history)<>5 THEN RAISE EXCEPTION 'Five-dojo setup failed'; END IF;
 IF EXISTS(SELECT FROM public.dojos WHERE name IN ('Kagami Dojo','Hayashitane Dojo','UBM Aikido Club')
 AND (requires_superadmin_share OR superadmin_share_percent<>0)) THEN RAISE EXCEPTION 'Independent administration changed'; END IF;
 IF has_schema_privilege('authenticated','settlement_private','USAGE')
 OR has_function_privilege('anon','public.nominate_settlement_destination(uuid,uuid,text,text,text)','EXECUTE')
 THEN RAISE EXCEPTION 'Private banking ACL failed'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',false);
SET ROLE authenticated;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.get_my_settlement_destinations())<>1 THEN RAISE EXCEPTION 'Scoped dojo list failed'; END IF;
 BEGIN
 PERFORM public.nominate_settlement_destination('9e5f895c-4f2c-40df-ab64-0ce3fab226a0',NULL,'TEST BANK','TEST HOLDER','TEST-OTHER');
 RAISE EXCEPTION 'Cross-dojo nomination allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
DO $$
DECLARE dojo uuid:='849e3573-dc96-4a9a-9ea2-5d5051aef7e1'; independent uuid:='6662df61-5d54-47d6-9e9a-d1eeec8060c8';
 payment uuid; charge uuid; first_id uuid; second_id uuid; draft uuid; later_draft uuid; output_account text; denied boolean;
BEGIN
 INSERT INTO public.membership_subscription_charges(billing_month) VALUES(current_date) RETURNING id INTO charge;
 INSERT INTO public.membership_payments(charge_id,membership_id,dojo_id,amount,currency,payment_date)
 VALUES(charge,gen_random_uuid(),dojo,101.01,'IDR',current_date) RETURNING id INTO payment;
 denied:=false;
 BEGIN PERFORM public.create_dojo_settlement(dojo,current_date,ARRAY[payment]); EXCEPTION WHEN OTHERS THEN
   IF SQLERRM NOT LIKE 'Nominate%' THEN RAISE; END IF; denied:=true; END;
 IF NOT denied OR EXISTS(SELECT FROM public.dojo_settlements) THEN RAISE EXCEPTION 'Missing destination created partial draft'; END IF;
 INSERT INTO public.dojo_receiving_accounts(dojo_id,bank_name,account_holder_name,account_number)
 VALUES(dojo,'TEST BANK','TEST HOLDER','TEST-COLLECTION');
 denied:=false;
 BEGIN PERFORM public.nominate_settlement_destination(dojo,NULL,'TEST BANK','TEST HOLDER','TEST COLLECTION');
 EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE 'Nominate a different%' THEN RAISE; END IF; denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Collection/destination collision allowed'; END IF;
 first_id:=public.nominate_settlement_destination(dojo,NULL,'TEST BANK','TEST HOLDER','TEST-DESTINATION-A');
 IF public.nominate_settlement_destination(dojo,first_id,'TEST BANK','TEST HOLDER','TEST-DESTINATION-A')<>first_id THEN
   RAISE EXCEPTION 'Idempotent nomination failed'; END IF;
 draft:=public.create_dojo_settlement(dojo,current_date,ARRAY[payment]);
 IF (SELECT share_amount FROM public.dojo_settlements WHERE id=draft)<>30.30 THEN RAISE EXCEPTION 'Thirty percent rounding failed'; END IF;
 PERFORM public.set_dojo_settlement_transfer(draft,current_date,'Bank Transfer',NULL);
 IF (SELECT transfer_amount FROM public.dojo_settlements WHERE id=draft)<>30.30 THEN RAISE EXCEPTION 'Automatic transfer amount failed'; END IF;
 second_id:=public.nominate_settlement_destination(dojo,first_id,'TEST BANK','TEST HOLDER','TEST-DESTINATION-B');
 SELECT account_number INTO output_account FROM public.get_settlement_destination_account(dojo,draft);
 IF output_account<>'TEST-DESTINATION-A' THEN RAISE EXCEPTION 'Historical destination changed'; END IF;
 SELECT account_number INTO output_account FROM public.get_settlement_destination_account(dojo,NULL);
 IF output_account<>'TEST-DESTINATION-B' THEN RAISE EXCEPTION 'Current destination missing'; END IF;
 denied:=false;
 BEGIN PERFORM public.nominate_settlement_destination(dojo,first_id,'TEST BANK','TEST HOLDER','TEST-STALE');
 EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE 'The destination changed%' THEN RAISE; END IF; denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Stale overwrite allowed'; END IF;
 denied:=false;
 BEGIN UPDATE settlement_private.nominations SET bank_name='CORRUPT' WHERE id=first_id;
 EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE 'Recorded settlement%' THEN RAISE; END IF; denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'History mutable'; END IF;
 denied:=false;
 BEGIN INSERT INTO public.dojo_receiving_accounts(dojo_id,bank_name,account_holder_name,account_number)
 VALUES(dojo,'TEST BANK','TEST HOLDER','TEST DESTINATION B');
 EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE 'The member collection%' THEN RAISE; END IF; denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Collection switch collision allowed'; END IF;
 INSERT INTO public.membership_payments(charge_id,membership_id,dojo_id,amount,currency,payment_date)
 VALUES(charge,gen_random_uuid(),dojo,101.01,'IDR',current_date-1) RETURNING id INTO payment;
 UPDATE public.dojos SET superadmin_share_percent=25 WHERE id=dojo;
 IF (SELECT share_percent FROM public.get_my_settlement_destinations() WHERE dojo_id=dojo)<>25 THEN
   RAISE EXCEPTION 'Changed percentage hidden from nomination setup'; END IF;
 later_draft:=public.create_dojo_settlement(dojo,current_date-1,ARRAY[payment]);
 IF (SELECT share_amount FROM public.dojo_settlements WHERE id=later_draft) IS DISTINCT FROM 25.25 THEN
   RAISE EXCEPTION 'New share percentage not applied'; END IF;
 IF (SELECT count(*) FROM public.dojo_settlements)<>2 THEN RAISE EXCEPTION 'Backdated payment was excluded'; END IF;
 IF (SELECT share_amount FROM public.dojo_settlements WHERE id=draft)<>30.30 THEN RAISE EXCEPTION 'Historical amount changed'; END IF;
 PERFORM set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',false);
 denied:=false;
 BEGIN PERFORM public.create_dojo_settlement(independent,current_date,ARRAY[payment]);
 EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE 'This dojo does not require%' THEN RAISE; END IF; denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Independent dojo created settlement'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',false);
SET ROLE authenticated;
DO $$ BEGIN
 IF EXISTS(SELECT FROM public.get_my_settlement_destinations()) THEN RAISE EXCEPTION 'Member sees destination setup'; END IF;
 BEGIN PERFORM public.get_settlement_destination_account('849e3573-dc96-4a9a-9ea2-5d5051aef7e1',NULL);
 RAISE EXCEPTION 'Member sees banking data';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SELECT 'SETTLEMENT088_PASS';
