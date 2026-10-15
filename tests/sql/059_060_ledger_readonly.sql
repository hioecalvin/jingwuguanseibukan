-- Prepared read-only capture. Remote execution needs a staging-bound wrapper
-- and approval. Keep returned statement bodies in protected evidence, not logs.
begin isolation level repeatable read read only;
set local search_path=pg_catalog;
set local statement_timeout='15s';
set local lock_timeout='3s';
select jsonb_build_object(
 'capturedAt',clock_timestamp(),
 'database',current_database(),
 'sessionUser',session_user,
 'backendPid',pg_backend_pid(),
 'readOnly',current_setting('transaction_read_only'),
 'ssl',(select ssl from pg_stat_ssl where pid=pg_backend_pid()),
 'ledger',(select coalesce(jsonb_agg(jsonb_build_object(
   'version',version,'name',name,'statements',statements) order by version),'[]'::jsonb)
   from supabase_migrations.schema_migrations),
 'ledgerCatalogDigest',encode(sha256(convert_to(jsonb_build_object(
   'relation',(select jsonb_build_array(c.relkind,c.relowner,c.relacl,c.relrowsecurity,c.relforcerowsecurity)
     from pg_class c where c.oid='supabase_migrations.schema_migrations'::regclass),
   'columns',(select jsonb_agg(jsonb_build_array(a.attname,a.atttypid,a.atttypmod,a.attnotnull,a.attidentity,a.attgenerated,a.attacl,pg_get_expr(d.adbin,d.adrelid)) order by a.attnum)
     from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
     where a.attrelid='supabase_migrations.schema_migrations'::regclass and a.attnum>0 and not a.attisdropped),
   'constraints',(select jsonb_agg(jsonb_build_array(conname,convalidated,pg_get_constraintdef(oid)) order by conname)
     from pg_constraint where conrelid='supabase_migrations.schema_migrations'::regclass),
   'indexes',(select jsonb_agg(to_jsonb(i) order by indexname) from pg_indexes i
     where schemaname='supabase_migrations' and tablename='schema_migrations'),
   'triggers',(select jsonb_agg(jsonb_build_array(tgname,tgenabled,pg_get_triggerdef(oid)) order by tgname)
     from pg_trigger where tgrelid='supabase_migrations.schema_migrations'::regclass),
   'policies',(select jsonb_agg(to_jsonb(p) order by policyname) from pg_policies p
     where schemaname='supabase_migrations' and tablename='schema_migrations')
 )::text,'UTF8')),'hex')
);
commit;
