-- PREPARED ONLY: not executed. Staging eomubndonbetszdbhsrj only, after approval.
-- Invoke via a target-verified, server-enforced read-only metadata wrapper.
-- Full definitions must be saved privately: never print/commit raw output.
-- No Auth/member rows, sequence advancement/state changes, DDL, jobs or RPC calls.
select jsonb_build_object(
 'database',current_database(),'readOnly',current_setting('transaction_read_only'),'capturedAt',now(),
 'ledgerVersions',(select jsonb_agg(version order by version) from supabase_migrations.schema_migrations),
 'publicEnums',(select coalesce(jsonb_agg(jsonb_build_object('type',t.typname,'label',e.enumlabel,'order',e.enumsortorder)
   order by t.typname,e.enumsortorder),'[]') from pg_type t
   join pg_namespace n on n.oid=t.typnamespace join pg_enum e on e.enumtypid=t.oid where n.nspname='public'),
 'authHelpers',(select coalesce(jsonb_agg(jsonb_build_object('schema',n.nspname,'name',p.proname,
   'arguments',pg_get_function_identity_arguments(p.oid),'definition',pg_get_functiondef(p.oid),
   'owner',pg_get_userbyid(p.proowner),'acl',p.proacl,'language',l.lanname,
   'securityDefiner',p.prosecdef,'settings',p.proconfig) order by p.proname,p.oid),'[]')
   from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang
   where n.nspname='auth' and p.proname in('uid','role','jwt') and p.prokind in('f','p')),
 'eventTriggers',(select coalesce(jsonb_agg(jsonb_build_object('name',e.evtname,'event',e.evtevent,
   'enabled',e.evtenabled,'tags',e.evttags,'functionSchema',n.nspname,'functionName',p.proname,
   'definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),
   'securityDefiner',p.prosecdef,'settings',p.proconfig) order by e.evtname),'[]')
   from pg_event_trigger e join pg_proc p on p.oid=e.evtfoid join pg_namespace n on n.oid=p.pronamespace),
 'ownedPublicSequences',(select coalesce(jsonb_agg(jsonb_build_object('sequence',s.relname,
   'tableSchema',tn.nspname,'table',t.relname,'column',a.attname,'dependency',d.deptype)
   order by s.relname),'[]')
   from pg_class s join pg_namespace sn on sn.oid=s.relnamespace
   join pg_depend d on d.classid='pg_class'::regclass and d.objid=s.oid and d.refclassid='pg_class'::regclass and d.deptype in('a','i')
   join pg_class t on t.oid=d.refobjid join pg_namespace tn on tn.oid=t.relnamespace
   join pg_attribute a on a.attrelid=t.oid and a.attnum=d.refobjsubid
   where sn.nspname='public' and s.relkind='S')
) as remaining_metadata;
