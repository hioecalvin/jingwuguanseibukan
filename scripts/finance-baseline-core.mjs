// Pure shared public-schema SQL/content primitives. No connections or target authority.
// Local and staging callers MUST apply their own separate identity guards.
const ident=value=>'"'+value.replaceAll('"','""')+'"';
const literal=value=>"'"+value.replaceAll("'","''")+"'";
const digest=expression=>`encode(sha256(convert_to((${expression})::text,'UTF8')),'hex')`;
const inventorySql=`select coalesce(jsonb_agg(jsonb_build_object('name',c.relname,'kind',c.relkind) order by c.relname),'[]')
 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relkind in('r','p','S','f','m')`;

export const PUBLIC_FINANCE_INVENTORY_SQL=`begin isolation level repeatable read read only;
set local search_path=pg_catalog;set local timezone='UTC';set local standard_conforming_strings=on;
set local statement_timeout='15s';set local lock_timeout='3s';
select jsonb_build_object('capturedAt',clock_timestamp(),'sessionUser',session_user,
 'database',current_database(),'readOnly',current_setting('transaction_read_only'),
 'ssl',(select ssl from pg_stat_ssl where pid=pg_backend_pid()),
 'address',host(inet_server_addr()),'port',inet_server_port(),'backendPid',pg_backend_pid(),
 'clusterId',(select system_identifier::text from pg_control_system()),'inventory',(${inventorySql}));
commit;`;

export function buildPublicFinanceBaselineSql(plan) {
  if(!Array.isArray(plan?.inventory)||!plan.inventory.length)throw Error('Complete public inventory required');
  const names=new Set();
  for(const row of plan.inventory) {
    if(typeof row.name!=='string'||!row.name||row.name.includes('\0')||!['r','p','S'].includes(row.kind)||names.has(row.name))throw Error('Invalid inventory');
    names.add(row.name);
  }
  const tableSelects=plan.inventory.filter(r=>r.kind!=='S').map(r=>`select ${literal(r.name)} as name,
    count(*)::text as "rowCount",${digest("coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text collate \"C\"),'[]'::jsonb)")} as "rowDigest"
    from public.${ident(r.name)} t`);
  if(!tableSelects.length)throw Error('Table inventory required');
  const sequenceSelects=plan.inventory.filter(r=>r.kind==='S').map(r=>`select ${literal(r.name)} as name,
    last_value::text as "lastValue",is_called as "isCalled" from public.${ident(r.name)}`);
  const catalog=`jsonb_build_object(
    'relations',(select jsonb_agg(jsonb_build_array(c.relname,c.relkind,c.relowner,c.relacl,c.relrowsecurity,c.relforcerowsecurity,
      c.reloptions,c.relreplident,c.relpersistence,c.relispartition,c.relam,c.reltablespace) order by c.relname)
      from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'),
    'columns',(select jsonb_agg(jsonb_build_array(c.relname,a.attname,a.atttypid,a.atttypmod,a.attnotnull,a.attidentity,a.attgenerated,a.attacl,pg_get_expr(d.adbin,d.adrelid)) order by c.relname,a.attnum)
      from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace
      left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where n.nspname='public' and a.attnum>0 and not a.attisdropped),
    'constraints',(select jsonb_agg(jsonb_build_array(c.relname,k.conname,k.convalidated,pg_get_constraintdef(k.oid)) order by c.relname,k.conname)
      from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'),
    'indexes',(select jsonb_agg(to_jsonb(i) order by tablename,indexname) from pg_indexes i where schemaname='public'),
    'triggers',(select jsonb_agg(jsonb_build_array(c.relname,t.tgname,t.tgenabled,pg_get_triggerdef(t.oid)) order by c.relname,t.tgname)
      from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'),
    'routines',(select jsonb_agg(jsonb_build_array(n.nspname,p.proname,pg_get_function_identity_arguments(p.oid),p.proowner,p.proacl,p.proconfig,pg_get_functiondef(p.oid)) order by p.oid)
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','auth') and p.prokind in('f','p')),
    'policies',(select jsonb_agg(to_jsonb(p) order by tablename,policyname) from pg_policies p where schemaname='public'),
    'rules',(select jsonb_agg(to_jsonb(r) order by tablename,rulename) from pg_rules r where schemaname='public'),
    'views',(select jsonb_agg(jsonb_build_array(c.relname,pg_get_viewdef(c.oid,false)) order by c.relname)
      from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in('v','m')),
    'defaultPrivileges',(select jsonb_agg(to_jsonb(d) order by d.defaclrole,d.defaclnamespace,d.defaclobjtype)
      from pg_default_acl d),
    'databaseRoleSettings',(select jsonb_agg(to_jsonb(s) order by s.setdatabase,s.setrole)
      from pg_db_role_setting s where s.setdatabase=0 or s.setdatabase=(select oid from pg_database where datname=current_database())),
    'inheritance',(select jsonb_agg(to_jsonb(i) order by i.inhrelid,i.inhseqno)
      from pg_inherits i join pg_class c on c.oid=i.inhrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'),
    'enums',(select jsonb_agg(jsonb_build_array(t.typname,e.enumlabel,e.enumsortorder) order by t.typname,e.enumsortorder)
      from pg_type t join pg_namespace n on n.oid=t.typnamespace join pg_enum e on e.enumtypid=t.oid where n.nspname='public'),
    'sequenceDefinitions',(select jsonb_agg(to_jsonb(s) order by s.seqrelid) from pg_sequence s join pg_class c on c.oid=s.seqrelid
      join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'),
    'schemas',(select jsonb_agg(jsonb_build_array(nspname,nspowner,nspacl) order by nspname) from pg_namespace where nspname in('public','auth')),
    'roles',(select jsonb_agg(jsonb_build_array(rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolbypassrls,rolconfig,rolconnlimit,rolvaliduntil) order by rolname) from pg_roles),
    'roleMemberships',(select jsonb_agg(to_jsonb(m) order by roleid,member,grantor) from pg_auth_members m),
    'eventTriggers',(select jsonb_agg(jsonb_build_array(e.evtname,e.evtevent,e.evtenabled,e.evttags,
      e.evtowner,n.nspname,p.proname,p.proowner,p.proacl,p.proconfig,pg_get_functiondef(p.oid)) order by e.evtname)
      from pg_event_trigger e join pg_proc p on p.oid=e.evtfoid join pg_namespace n on n.oid=p.pronamespace))`;
  return `begin isolation level repeatable read read only;
set local search_path=pg_catalog;set local timezone='UTC';set local datestyle='ISO, YMD';set local standard_conforming_strings=on;
set local statement_timeout='15s';set local lock_timeout='3s';set local row_security=off;
select jsonb_build_object('capturedAt',clock_timestamp(),'sessionUser',session_user,
 'ssl',(select ssl from pg_stat_ssl where pid=pg_backend_pid()),
 'address',host(inet_server_addr()),'port',inet_server_port(),
 'database',current_database(),'clusterId',(select system_identifier::text from pg_control_system()),
 'backendPid',pg_backend_pid(),'readOnly',current_setting('transaction_read_only'),
 'inventory',(${inventorySql}),'catalogDigest',${digest(catalog)},
 'tables',(select jsonb_agg(to_jsonb(t) order by name) from (${tableSelects.join(' union all ')}) t),
 'sequences',${sequenceSelects.length?`(select jsonb_agg(to_jsonb(s) order by name) from (${sequenceSelects.join(' union all ')}) s)` : "'[]'::jsonb"});
commit;`;
}

const hex=value=>typeof value==='string'&&/^[0-9a-f]{64}$/.test(value);
const integer=value=>typeof value==='string'&&/^\d+$/.test(value);
export function verifyPublicFinanceBaselineContent(snapshot) {
  if(!snapshot||!hex(snapshot.catalogDigest)||!Array.isArray(snapshot.tables)||!Array.isArray(snapshot.sequences))
    throw Error('Incomplete public baseline content');
  buildPublicFinanceBaselineSql(snapshot);
  for(const [kind,rows] of [['tables',snapshot.tables],['sequences',snapshot.sequences]]) {
    const expected=snapshot.inventory.filter(r=>kind==='tables'?r.kind!=='S':r.kind==='S').map(r=>r.name).sort();
    if(JSON.stringify(rows.map(r=>r.name).sort())!==JSON.stringify(expected))throw Error('Inventory coverage mismatch');
    for(const row of rows) {
      if(kind==='tables'&&(!integer(row.rowCount)||!hex(row.rowDigest)))throw Error('Invalid table digest');
      if(kind==='sequences'&&(typeof row.lastValue!=='string'||! /^-?\d+$/.test(row.lastValue)||typeof row.isCalled!=='boolean'))throw Error('Invalid sequence state');
    }
  }
}

function stable(value) {
  if(Array.isArray(value))return value.map(stable);
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]));
  return value;
}

export function publicFinanceBaselineDifferences(before,after) {
  verifyPublicFinanceBaselineContent(before);verifyPublicFinanceBaselineContent(after);
  return ['inventory','catalogDigest','tables','sequences'].filter(key=>
    JSON.stringify(stable(before[key]))!==JSON.stringify(stable(after[key])));
}
