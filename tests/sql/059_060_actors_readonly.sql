-- Preparation only: a future staging-bound capture requires explicit approval.
-- Fixed three JS IDs. No Auth reads, helper calls, credentials or account writes.
-- Digests of existing rows are evidence, not permission to modify those rows.
begin isolation level repeatable read read only;
set local search_path=pg_catalog;
set local statement_timeout='15s';
set local lock_timeout='3s';
select jsonb_build_object(
 'capturedAt',clock_timestamp(),'database',current_database(),
 'sessionUser',session_user,'backendPid',pg_backend_pid(),
 'readOnly',current_setting('transaction_read_only'),
 'ssl',(select ssl from pg_stat_ssl where pid=pg_backend_pid()),
 'actors',(select coalesce(jsonb_agg(jsonb_build_object(
   'id',p.id,'jsId',p.registration_number,'accountStatus',p.account_status::text,
   'deceased',p.date_of_passing is not null,'superAdmin',p.is_super_admin,
   'activeAssignments',(select count(*) from public.dojo_admin_assignments a
     where a.user_id=p.id and a.active=true),
   'eligibleMemberships',(select count(*) from public.class_memberships m
     where m.user_id=p.id and m.status::text in('active','break')),
   'profileDigest',encode(sha256(convert_to(to_jsonb(p)::text,'UTF8')),'hex'),
   'membershipsDigest',(select encode(sha256(convert_to(
     coalesce(jsonb_agg(to_jsonb(m) order by to_jsonb(m)::text collate "C"),'[]'::jsonb)::text,'UTF8')),'hex')
     from public.class_memberships m where m.user_id=p.id),
   'assignmentsDigest',(select encode(sha256(convert_to(
     coalesce(jsonb_agg(to_jsonb(a) order by to_jsonb(a)::text collate "C"),'[]'::jsonb)::text,'UTF8')),'hex')
     from public.dojo_admin_assignments a where a.user_id=p.id)
 ) order by p.registration_number,p.id),'[]'::jsonb)
 from public.profiles p where p.registration_number in('0101','0002','0001'))
);
commit;
