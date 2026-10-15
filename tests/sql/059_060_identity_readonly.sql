-- Approved scope must be exactly these three dedicated staging test identities.
-- No passwords, tokens, raw emails or unrelated Auth users are returned.
begin isolation level repeatable read read only;
set local search_path=pg_catalog;
set local statement_timeout='15s';
set local lock_timeout='3s';
with expected(role,js_id,email) as (values
 ('member','0101','0101@dummy.jingwuguan.test'),
 ('admin','0002','0002@dummy.jingwuguan.test'),
 ('superAdmin','0001','0001@dummy.jingwuguan.test'))
select jsonb_build_object(
 'capturedAt',clock_timestamp(),'database',current_database(),'sessionUser',session_user,
 'backendPid',pg_backend_pid(),'readOnly',current_setting('transaction_read_only'),
 'ssl',(select ssl from pg_stat_ssl where pid=pg_backend_pid()),
 'identities',(select jsonb_agg(jsonb_build_object(
   'role',e.role,'jsId',e.js_id,
   'authIds',(select coalesce(jsonb_agg(u.id order by u.id),'[]'::jsonb)
     from auth.users u where lower(u.email)=e.email),
   'profiles',(select coalesce(jsonb_agg(jsonb_build_object(
     'id',p.id,'accountStatus',p.account_status::text,
     'deceased',p.date_of_passing is not null,'superAdmin',p.is_super_admin,
     'activeAssignments',(select count(*) from public.dojo_admin_assignments a where a.user_id=p.id and a.active=true)
   ) order by p.id),'[]'::jsonb) from public.profiles p where p.registration_number=e.js_id)
 ) order by e.role) from expected e)
);
commit;
