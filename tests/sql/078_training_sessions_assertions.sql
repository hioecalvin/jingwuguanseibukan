create function pg_temp.assert_true(value boolean,label text) returns void language plpgsql as $$begin if value is distinct from true then raise exception 'FAILED: %',label; end if; perform set_config('training_test.checks',(coalesce(nullif(current_setting('training_test.checks',true),''),'0')::int+1)::text,true);end$$;
-- All fixture identities are synthetic and every operation rolls back.
update public.class_memberships set joined_date='2000-01-01' where id::text like '50000000%';
insert into public.dojo_admin_assignments(user_id,class_id,dojo_id,active)
values('00000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.assert_true((select count(*)>1 from public.get_training_session_roster('20000000-0000-0000-0000-000000000001')),'scoped roster');
select pg_temp.assert_true(exists(select 1 from public.get_training_session_roster('20000000-0000-0000-0000-000000000001') where membership_id='50000000-0000-0000-0000-000000000005'),'same class visitor');
select pg_temp.assert_true(not exists(select 1 from public.get_training_session_roster('20000000-0000-0000-0000-000000000001') where membership_id='50000000-0000-0000-0000-000000000004'),'other class excluded');
select pg_temp.assert_true(public.save_training_session('78000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',(now() at time zone 'Asia/Jakarta')::date,'Footwork',60,array['50000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000005']::uuid[],0)=1,'atomic submit with visitor');
do $$begin
 begin perform public.save_training_session('78000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',current_date,'stale',60,'{}',0);raise exception 'stale accepted';exception when serialization_failure then null;end;
 begin perform public.get_training_session_roster('20000000-0000-0000-0000-000000000002');raise exception 'foreign scope accepted';exception when insufficient_privilege then null;end;
end$$;
reset role;
select pg_temp.assert_true((select last_training_session_date=(now() at time zone 'Asia/Jakarta')::date from public.class_memberships where id='50000000-0000-0000-0000-000000000005'),'visitor recency updated');
set local role authenticated;
select pg_temp.assert_true((public.get_membership_training_totals('50000000-0000-0000-0000-000000000001')->>'current_training_days')::int=1,'current days');
select public.save_training_session('78000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001',(now() at time zone 'Asia/Jakarta')::date,'Second session',30,array['50000000-0000-0000-0000-000000000001']::uuid[],0);
select pg_temp.assert_true((public.get_membership_training_totals('50000000-0000-0000-0000-000000000001')->>'current_training_days')::int=1,'distinct days not sessions');
select public.save_training_session('78000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',(now() at time zone 'Asia/Jakarta')::date,'Corrected footwork',55,array['50000000-0000-0000-0000-000000000001']::uuid[],1);
select pg_temp.assert_true(jsonb_array_length(public.get_training_session_audit('78000000-0000-0000-0000-000000000001'))=2,'revision history');
reset role;
select pg_temp.assert_true((select last_training_session_date is null from public.class_memberships where id='50000000-0000-0000-0000-000000000005'),'removed visitor restored baseline');
-- Promotion changes the period; earlier attendance is retained at its captured rank.
update public.class_memberships set rank_id='60000000-0000-0000-0000-000000000004' where id='50000000-0000-0000-0000-000000000001';
insert into public.membership_grade_history(membership_id,rank_id,effective_date,created_by,assessor_type,assessor_member_id,assessor_name_snapshot)
values('50000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000004',(now() at time zone 'Asia/Jakarta')::date,'00000000-0000-0000-0000-000000000001','member','00000000-0000-0000-0000-000000000001','Synthetic Assessor');
set local role authenticated;
select pg_temp.assert_true((public.get_membership_training_totals('50000000-0000-0000-0000-000000000001')->>'current_training_days')::int=0,'promotion resets current days');
select pg_temp.assert_true(jsonb_array_length(public.get_membership_training_totals('50000000-0000-0000-0000-000000000001')->'history')=1,'past rank retained');
select public.save_training_session('78000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',(now() at time zone 'Asia/Jakarta')::date,'Notes edit after promotion',50,array['50000000-0000-0000-0000-000000000001']::uuid[],2);
select pg_temp.assert_true((public.get_membership_training_totals('50000000-0000-0000-0000-000000000001')->>'current_training_days')::int=0,'notes do not reattribute old rank');
select public.save_training_session('78000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000001',(now() at time zone 'Asia/Jakarta')::date,'New grade session',60,array['50000000-0000-0000-0000-000000000001']::uuid[],0);
select pg_temp.assert_true((public.get_membership_training_totals('50000000-0000-0000-0000-000000000001')->>'current_training_days')::int=1,'new rank accrues');
select pg_temp.assert_true(jsonb_array_length(public.get_training_sessions())=3,'history list');
do $$begin
 begin perform public.save_training_session('78000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000001',(now() at time zone 'Asia/Jakarta')::date,'Wrong class',60,array['50000000-0000-0000-0000-000000000004']::uuid[],0);raise exception 'bad roster accepted';exception when raise_exception then if sqlerrm='bad roster accepted' then raise;end if;end;
 begin perform public.save_training_session('78000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000001',(now() at time zone 'Asia/Jakarta')::date+1,'Future',60,array['50000000-0000-0000-0000-000000000001']::uuid[],0);raise exception 'future accepted';exception when raise_exception then if sqlerrm='future accepted' then raise;end if;end;
end$$;
reset role;
select pg_temp.assert_true(not exists(select 1 from training_private.sessions where id='78000000-0000-0000-0000-000000000004'),'failed save residue');
select pg_temp.assert_true(not has_schema_privilege('authenticated','training_private','USAGE'),'private schema ACL');
select pg_temp.assert_true(not has_function_privilege('anon','public.get_training_sessions(date,uuid)','EXECUTE'),'anon denied');
select pg_temp.assert_true(not has_function_privilege('authenticated','public.training_set_manual_legacy(uuid,date)','EXECUTE'),'legacy helper private');
select pg_temp.assert_true(not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='training_private' and c.relkind='r' and not(c.relrowsecurity and c.relforcerowsecurity)),'RLS forced');
do $$begin begin delete from training_private.session_audit;raise exception 'audit writable';exception when raise_exception then if sqlerrm='audit writable' then raise;end if;end;end$$;
update public.dojo_admin_assignments set active=false where user_id='00000000-0000-0000-0000-000000000002';
set local role authenticated;
do $$begin begin perform public.get_training_session_roster('20000000-0000-0000-0000-000000000001');raise exception 'revoked allowed';exception when insufficient_privilege then null;end;end$$;
reset role;
