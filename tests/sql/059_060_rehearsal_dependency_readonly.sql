-- PREPARED ONLY. Needs read-only staging authorization before execution.
-- Metadata and schema definitions only: no member rows, jobs, Auth, provider APIs
-- or application function invocation. Use the pinned staging read-only wrapper.
-- Definitions may contain sensitive literals: save to protected evidence, never
-- print raw definitions or commit them without inspection/redaction.
SELECT jsonb_build_object(
 'readOnly',current_setting('transaction_read_only'),'database',current_database(),'capturedAt',now(),
 'ledgerVersions',(select jsonb_agg(version order by version) from supabase_migrations.schema_migrations),
 'functions',(select coalesce(jsonb_agg(jsonb_build_object(
   'schema',n.nspname,'name',p.proname,'arguments',pg_get_function_identity_arguments(p.oid),
   'language',l.lanname,'securityDefiner',p.prosecdef,'settings',p.proconfig,
   'owner',pg_get_userbyid(p.proowner),'definition',pg_get_functiondef(p.oid)
 ) order by n.nspname,p.proname,p.oid),'[]')
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang
 where p.prokind in ('f','p') and (n.nspname='public' or p.oid in (
   select tgfoid from pg_trigger t join pg_class c on c.oid=t.tgrelid
   join pg_namespace tn on tn.oid=c.relnamespace where tn.nspname='public' and not t.tgisinternal))),
 'foreignTables',(select coalesce(jsonb_agg(jsonb_build_object('schema',n.nspname,'table',c.relname)),'[]')
   from pg_foreign_table f join pg_class c on c.oid=f.ftrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'),
 'rules',(select coalesce(jsonb_agg(jsonb_build_object('schema',schemaname,'table',tablename,'name',rulename,'definition',definition)),'[]')
   from pg_rules where schemaname='public'),
 'triggers',(select coalesce(jsonb_agg(jsonb_build_object('schema',n.nspname,'table',c.relname,'name',t.tgname,'enabled',t.tgenabled,
   'functionSchema',fn.nspname,'functionName',p.proname,'definition',pg_get_triggerdef(t.oid)) order by c.relname,t.tgname),'[]')
   from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
   join pg_proc p on p.oid=t.tgfoid join pg_namespace fn on fn.oid=p.pronamespace where n.nspname='public' and not t.tgisinternal),
 'defaults',(select coalesce(jsonb_agg(jsonb_build_object('table',table_name,'column',column_name,'default',column_default,
   'identity',is_identity,'generation',generation_expression) order by table_name,ordinal_position),'[]')
   from information_schema.columns where table_schema='public' and (column_default is not null or is_identity='YES' or generation_expression is not null)),
 'policies',(select coalesce(jsonb_agg(to_jsonb(p) order by tablename,policyname),'[]') from pg_policies p where schemaname='public'),
 'extensions',(select coalesce(jsonb_agg(jsonb_build_object('name',e.extname,'schema',n.nspname,'version',e.extversion) order by e.extname),'[]')
   from pg_extension e join pg_namespace n on n.oid=e.extnamespace)
) as dependency_catalog;
