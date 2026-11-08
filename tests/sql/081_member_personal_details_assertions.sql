create function pg_temp.personal_values(target uuid) returns jsonb language sql as $$
 select jsonb_build_object('full_name',v->'full_name','date_of_birth',v->'date_of_birth','email',v->'email','phone',v->'phone') from (select public.get_member_personal_details(target)v)s
$$;
set local role authenticated;
select pg_temp.assert_true(public.get_member_personal_details('81000000-0000-0000-0000-000000000001')->>'has_login'='false','offline editor identified');
select pg_temp.assert_true(public.update_member_personal_details('81000000-0000-0000-0000-000000000001',' Corrected  Offline ','1990-01-02','NEW-OFFLINE@example.invalid','+62 81234567',pg_temp.personal_values('81000000-0000-0000-0000-000000000001'))->>'saved'='true','SA edits offline details');
select pg_temp.assert_true(public.get_member_personal_details('81000000-0000-0000-0000-000000000001')->>'email'='new-offline@example.invalid','offline email saved normalized');
select pg_temp.assert_true(public.get_member_personal_details('81000000-0000-0000-0000-000000000001')->>'full_name'='Corrected Offline','name normalization');
select pg_temp.assert_true(jsonb_array_length(public.get_member_personal_detail_audit('81000000-0000-0000-0000-000000000001'))=1,'personal detail audit recorded');
select public.update_member_personal_details('81000000-0000-0000-0000-000000000001','Corrected Offline','1990-01-02','new-offline@example.invalid','+62 81234567',pg_temp.personal_values('81000000-0000-0000-0000-000000000001'));
select pg_temp.assert_true(jsonb_array_length(public.get_member_personal_detail_audit('81000000-0000-0000-0000-000000000001'))=1,'no-op produces no duplicate audit');
do $$begin
 begin perform public.update_member_personal_details('81000000-0000-0000-0000-000000000001','Overwrite',null,null,null,'{}');raise exception 'stale overwrite';exception when serialization_failure then null;end;
 begin perform public.update_member_personal_details('81000000-0000-0000-0000-000000000001','Bad phone','1990-01-02',null,'( ) -',pg_temp.personal_values('81000000-0000-0000-0000-000000000001'));raise exception 'empty digits accepted';exception when invalid_parameter_value then null;end;
 begin perform public.update_member_personal_details('81000000-0000-0000-0000-000000000001','Future',current_date+2,null,null,pg_temp.personal_values('81000000-0000-0000-0000-000000000001'));raise exception 'future DOB accepted';exception when invalid_parameter_value then null;end;
 begin perform public.update_member_personal_details('81000000-0000-0000-0000-000000000001','Infinite','-infinity',null,null,pg_temp.personal_values('81000000-0000-0000-0000-000000000001'));raise exception 'infinite DOB accepted';exception when invalid_parameter_value then null;end;
 begin perform public.update_member_personal_details('81000000-0000-0000-0000-000000000001','Duplicate',null,'account1@example.invalid',null,pg_temp.personal_values('81000000-0000-0000-0000-000000000001'));raise exception 'duplicate email accepted';exception when raise_exception then if sqlerrm='duplicate email accepted' then raise;end if;end;
end$$;
-- Claimed account edits preserve current login and profile email pending verification.
select set_config('personal_test.request',public.update_member_personal_details('80000000-0000-0000-0000-000000000001','Claimed Corrected','1980-02-03','replacement@example.invalid','6281234567',pg_temp.personal_values('80000000-0000-0000-0000-000000000001'))->>'email_request_id',true);
select pg_temp.assert_true(public.get_member_personal_details('80000000-0000-0000-0000-000000000001')->>'email'='account1@example.invalid','claimed profile old email retained');
select pg_temp.assert_true(public.get_member_personal_details('80000000-0000-0000-0000-000000000001')->>'pending_email'='replacement@example.invalid','pending email shown');
reset role;
select pg_temp.assert_true((select email='account1@example.invalid' from auth.users where id='80000000-0000-0000-0000-000000000001'),'Auth email unchanged');
select pg_temp.assert_true((select registration_number='JS-8101' and auth_user_id=id and not is_super_admin from public.profiles where id='80000000-0000-0000-0000-000000000001'),'identity and role preserved');
set local role authenticated;
do $$begin
 begin perform public.claim_admin_email_change(current_setting('personal_test.request')::uuid,auth.uid());raise exception 'browser delivery claim';exception when insufficient_privilege then null;end;
 begin perform public.update_member_personal_details('80000000-0000-0000-0000-000000000001','Claimed Corrected','1980-02-03','second@example.invalid','6281234567',pg_temp.personal_values('80000000-0000-0000-0000-000000000001'));raise exception 'parallel pending request accepted';exception when raise_exception then if sqlerrm='parallel pending request accepted' then raise;end if;end;
end$$;
reset role;
set local role service_role;
select pg_temp.assert_true(public.claim_admin_email_change(current_setting('personal_test.request')::uuid,'00000000-0000-0000-0000-000000000002') is null,'wrong actor delivery refused');
select pg_temp.assert_true(public.claim_admin_email_change(current_setting('personal_test.request')::uuid,'00000000-0000-0000-0000-000000000001')->>'new_email'='replacement@example.invalid','authorized service claim');
select pg_temp.assert_true(public.claim_admin_email_change(current_setting('personal_test.request')::uuid,'00000000-0000-0000-0000-000000000001') is null,'delivery claim once only');
select public.finish_admin_email_change(current_setting('personal_test.request')::uuid,true);
reset role;
select pg_temp.assert_true((select state='sent' from personal_details_private.email_requests where id=current_setting('personal_test.request')::uuid),'delivery result recorded');
-- Editing the identifying details invalidates an unconsumed offline claim.
insert into member_claim_private.claims(id,member_id,email,proof_hash,state,setup_hash,ticket_hash)
values('81000000-0000-0000-0000-000000000002','81000000-0000-0000-0000-000000000001','new-offline@example.invalid',decode('abcd','hex'),'verified',decode('abcd','hex'),decode('abcd','hex'));
set local role authenticated;
select public.update_member_personal_details('81000000-0000-0000-0000-000000000001','Corrected Offline','1990-01-03','new-offline@example.invalid','+62 81234567',pg_temp.personal_values('81000000-0000-0000-0000-000000000001'));
reset role;
select pg_temp.assert_true((select state='cancelled' and setup_hash is null and ticket_hash is null from member_claim_private.claims where id='81000000-0000-0000-0000-000000000002'),'old identity claim cancelled');
select pg_temp.assert_true(exists(select 1 from member_claim_private.claim_audit where claim_id='81000000-0000-0000-0000-000000000002' and event='personal_details_corrected'),'claim cancellation audited');
insert into member_claim_private.claims(id,member_id,email,proof_hash,state)
values('81000000-0000-0000-0000-000000000003','81000000-0000-0000-0000-000000000001','new-offline@example.invalid',decode('abcd','hex'),'provisioning');
set local role authenticated;
do $$begin begin perform public.update_member_personal_details('81000000-0000-0000-0000-000000000001','No change','1990-01-04','new-offline@example.invalid',null,pg_temp.personal_values('81000000-0000-0000-0000-000000000001'));raise exception 'in-flight identity changed';exception when raise_exception then if sqlerrm='in-flight identity changed' then raise;end if;end;end$$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
set local role authenticated;
do $$begin
 begin perform public.get_member_personal_details('81000000-0000-0000-0000-000000000001');raise exception 'admin editor access';exception when insufficient_privilege then null;end;
 begin perform public.update_member_personal_details('81000000-0000-0000-0000-000000000001','Unauthorized',null,null,null,'{}');raise exception 'admin edit allowed';exception when insufficient_privilege then null;end;
 begin perform public.get_member_personal_detail_audit('81000000-0000-0000-0000-000000000001');raise exception 'admin audit access';exception when insufficient_privilege then null;end;
end$$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
update auth.users set banned_until=now()+interval '1 day' where id='00000000-0000-0000-0000-000000000001';
set local role authenticated;
do $$begin begin perform public.get_member_personal_details('81000000-0000-0000-0000-000000000001');raise exception 'banned SA allowed';exception when insufficient_privilege then null;end;end$$;
reset role;
update auth.users set banned_until=null where id='00000000-0000-0000-0000-000000000001';
select pg_temp.assert_true(not has_schema_privilege('authenticated','personal_details_private','USAGE'),'personal private schema closed');
select pg_temp.assert_true(not has_function_privilege('authenticated','personal_details_private.can_manage(uuid)','EXECUTE'),'personal helper closed');
select pg_temp.assert_true(not has_function_privilege('anon','public.update_member_personal_details(uuid,text,date,text,text,jsonb)','EXECUTE'),'anonymous edit denied');
select pg_temp.assert_true(not has_function_privilege('service_role','public.update_member_personal_details(uuid,text,date,text,text,jsonb)','EXECUTE'),'service direct edit denied');
select pg_temp.assert_true(not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='personal_details_private' and c.relkind='r' and not(c.relrowsecurity and c.relforcerowsecurity)),'personal RLS forced');
do $$begin begin delete from personal_details_private.audit;raise exception 'personal audit mutable';exception when raise_exception then if sqlerrm='personal audit mutable' then raise;end if;end;end$$;
