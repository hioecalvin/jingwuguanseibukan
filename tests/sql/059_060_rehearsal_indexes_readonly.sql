-- PREPARED ONLY: not executed against staging. Requires separate read-only approval.
-- Only eomubndonbetszdbhsrj, through a target-verified read-only wrapper.
-- Save definitions privately; do not print raw output. No application tables read.
-- Catalog presence/dependencies are review input, NOT proof of transitive safety.
with target_names(name) as (values
 ('classes'),('dojos'),('class_memberships'),('dojo_admin_assignments'),
 ('dojo_subscription_settings'),('membership_subscription_charges'),
 ('membership_payment_confirmations'),('membership_payments'),
 ('membership_fee_adjustment_history'),('notifications')
), targets as (
 select c.oid,c.relname,c.relkind,c.relowner,c.relrowsecurity,c.relforcerowsecurity,c.relispartition
 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 join target_names t on t.name=c.relname where n.nspname='public'
), indexes as (
 select i.*,c.relname as index_name from pg_index i
 join targets t on t.oid=i.indrelid join pg_class c on c.oid=i.indexrelid
), object_dependencies as (
 select d.refobjid as function_oid from pg_depend d
 where d.refclassid='pg_proc'::regclass and (
   (d.classid='pg_class'::regclass and d.objid in(select indexrelid from indexes))
   or (d.classid='pg_constraint'::regclass and d.objid in(
     select k.oid from pg_constraint k where k.conrelid in(select oid from targets)))
   or (d.classid='pg_attrdef'::regclass and d.objid in(
     select a.oid from pg_attrdef a where a.adrelid in(select oid from targets)))
   or (d.classid='pg_policy'::regclass and d.objid in(
     select p.oid from pg_policy p where p.polrelid in(select oid from targets)))
 )
)
select jsonb_build_object(
 'database',current_database(),'readOnly',current_setting('transaction_read_only'),'capturedAt',now(),
 'ledgerVersions',(select jsonb_agg(version order by version) from supabase_migrations.schema_migrations),
 'expectedTableCount',10,
 'tables',(select coalesce(jsonb_agg(jsonb_build_object('name',relname,'kind',relkind,
   'owner',pg_get_userbyid(relowner),'rls',relrowsecurity,'forceRls',relforcerowsecurity,
   'partition',relispartition) order by relname),'[]') from targets),
 'indexes',(select coalesce(jsonb_agg(jsonb_build_object('table',t.relname,'name',i.index_name,
   'definition',pg_get_indexdef(i.indexrelid),'predicate',pg_get_expr(i.indpred,i.indrelid),
   'expressions',pg_get_expr(i.indexprs,i.indrelid),'valid',i.indisvalid,'ready',i.indisready,
   'unique',i.indisunique,'live',i.indislive) order by t.relname,i.index_name),'[]')
   from indexes i join targets t on t.oid=i.indrelid),
 'dependencyFunctions',(select coalesce(jsonb_agg(jsonb_build_object('schema',n.nspname,'name',p.proname,
   'arguments',pg_get_function_identity_arguments(p.oid),'language',l.lanname,
   'securityDefiner',p.prosecdef,'settings',p.proconfig,'owner',pg_get_userbyid(p.proowner),
   'definition',case when p.prokind in('f','p') then pg_get_functiondef(p.oid) else null end)
   order by n.nspname,p.proname,p.oid),'[]') from pg_proc p
   join pg_namespace n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang
   where p.oid in(select function_oid from object_dependencies)),
 'dependencyLimitation','Catalog dependencies do not discover dynamic SQL or every PL/pgSQL function-body call; manual review remains required.'
);
