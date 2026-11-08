-- Fixture-only setup: no hosted Auth, messages, real accounts or data.
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
update public.profiles set account_status='active',must_change_password=false where id in('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002');
update auth.users set email_confirmed_at=now(),banned_until=null where id in('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002');
-- Suppress signup/import provisioning only while installing synthetic list fixtures.
set local session_replication_role=replica;
insert into auth.users(id,email,email_confirmed_at)
select ('80000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,'account'||i||'@example.invalid',now() from generate_series(1,53)i;
insert into public.profiles(id,auth_user_id,registration_number,full_name,email,member_origin)
select u.id,u.id,case when i=52 then 'JS-8124A' when i=53 then 'JS-8124B' else 'JS-'||(8100+i)::text end,
 'Synthetic verified '||i,u.email,'import'
from generate_series(1,53)i join auth.users u on u.id=('80000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid;
insert into public.profiles(id,registration_number,full_name,email,member_origin)
values('81000000-0000-0000-0000-000000000001','JS-8199','Synthetic offline','offline@example.invalid','import');
set local session_replication_role=origin;
set local role authenticated;
select pg_temp.assert_true(jsonb_array_length(public.get_verified_member_accounts(1)->'accounts')=50,'verified list 50/page');
select pg_temp.assert_true((public.get_verified_member_accounts(1)->>'total')::int>53,'verified list total includes existing accounts');
select pg_temp.assert_true(not exists(select 1 from jsonb_array_elements(public.get_verified_member_accounts(2)->'accounts')a where a->>'member_id'='JS-8199'),'offline profile excluded from verified list');
select pg_temp.assert_true((public.get_verified_member_accounts(1)->>'page_size')::int=50,'fixed verified page size');
select pg_temp.assert_true(jsonb_array_length(public.get_verified_member_accounts(100000)->'accounts')=0,'beyond final page empty');
do $$begin begin perform public.get_verified_member_accounts(0);raise exception 'invalid page accepted';exception when raise_exception then if sqlerrm='invalid page accepted' then raise;end if;end;end$$;
reset role;
select pg_temp.assert_true((select array_position(array_agg(a->>'member_id' order by n),'JS-8124A')<array_position(array_agg(a->>'member_id' order by n),'JS-8124B') from jsonb_array_elements(public.get_verified_member_accounts(1)->'accounts')with ordinality t(a,n)),'JS suffix order deterministic');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.assert_true(not exists(select 1 from jsonb_array_elements(public.get_verified_member_accounts(1)->'accounts')a where a->>'member_id' like 'JS-81%'),'Dojo Admin excludes unrelated verified accounts');
reset role;
update public.dojo_admin_assignments set active=false where user_id='00000000-0000-0000-0000-000000000002';
set local role authenticated;
do $$begin begin perform public.get_verified_member_accounts(1);raise exception 'revoked admin list access';exception when insufficient_privilege then null;end;end$$;
reset role;
select pg_temp.assert_true(not has_function_privilege('anon','public.get_verified_member_accounts(integer)','EXECUTE'),'verified list anonymous denied');
select pg_temp.assert_true(not has_function_privilege('service_role','public.get_verified_member_accounts(integer)','EXECUTE'),'verified list service denied');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
