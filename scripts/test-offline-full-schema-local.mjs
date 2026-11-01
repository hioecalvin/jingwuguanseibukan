// Isolated PostgreSQL 17 lab only; no real credentials, providers or network hosts.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { closeSync, mkdtempSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
const repo=fileURLToPath(new URL('../',import.meta.url));
const pgBin=process.argv[2];
if(!pgBin) throw new Error('Absolute PostgreSQL 17 bin directory required');
const catalogPath=process.argv[3];
let catalog;
if(catalogPath){
 const raw=readFileSync(catalogPath);
 assert.equal(createHash('sha256').update(raw).digest('hex'),'560b93a53c3097262c5d8f4338d4b625be497c48a71ac9ecaff0c0acbc7f97b2','Captured catalog hash differs');
 catalog=JSON.parse(raw.toString('utf8').replace(/^\uFEFF/,''));
 assert.deepEqual(catalog.enums.filter(e=>e.type==='membership_role').map(e=>e.value),['user','admin']);
}
const root=mkdtempSync(join(tmpdir(),'jwg-offline-full-schema-'));
const data=join(root,'data');
const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!/^PG/i.test(key)));
const binary=name=>join(resolve(pgBin),`${name}${process.platform==='win32'?'.exe':''}`);
function run(name,args,input){
 const fd=name==='pg_ctl'?openSync(join(root,'control.log'),'a'):null;
 try {
  const result=spawnSync(binary(name),args,{env,input,encoding:'utf8',windowsHide:true,timeout:45000,
   ...(fd===null?{}:{stdio:['ignore',fd,fd]})});
  if(result.error||result.status!==0) throw new Error(`${name}: ${result.stderr||result.error||'See control.log'}`);
  return result.stdout??'';
 } finally {if(fd!==null)closeSync(fd);}
}
assert.ok(catalog, 'Pass the pinned production catalog as the third argument');
assert.match(run('postgres',['--version']),/PostgreSQL\) 17\./);
const port=await new Promise((resolvePort,reject)=>{
 const socket=createServer();socket.once('error',reject);socket.listen(0,'127.0.0.1',()=>{
  const value=socket.address().port;socket.close(error=>error?reject(error):resolvePort(value));});
});
const schemaPath=process.argv[4];
assert.ok(schemaPath,'Pass the protected schema-only export');
const schemaBytes=readFileSync(schemaPath);
assert.equal(createHash('sha256').update(schemaBytes).digest('hex'),'bc5e6bb9dc7d042e47bcf27ab618e40601bd5a463c904ebb01cf16201199332b');
const schema=schemaBytes.toString('utf8');
assert.ok(!/^COPY |^INSERT INTO |^CREATE (?:SERVER|SUBSCRIPTION|EVENT TRIGGER)/m.test(schema),'Unexpected data or external execution');
let started=false,stopped=false,passed=false,checks=0,behaviorChecks=0,conversionChecks=0;
try {
 run('initdb',['-D',data,'--username=postgres','--auth-local=trust','--auth-host=trust','--no-locale','-E','UTF8']);
 started=true;run('pg_ctl',['-D',data,'-l',join(root,'server.log'),'-o',`-h 127.0.0.1 -p ${port}`,'-w','-t','30','start']);
 const args=['-X','-w','-qAt','-h','127.0.0.1','-p',String(port),'-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'];
 const q=input=>run('psql',args,input).trim();
 const sql=file=>readFileSync(join(repo,file),'utf8');
 const equal=(a,b,label)=>{assert.equal(a,b,label);checks++;};
 equal(resolve(q('show data_directory;')).toLowerCase(),resolve(data).toLowerCase());
 q(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;
 create role supabase_auth_admin nologin;create role supabase_storage_admin nologin;create role dashboard_user nologin;create role supabase_admin nologin;
 create schema extensions;create extension pgcrypto with schema extensions;
 drop schema public;`);
 q(schema);
 q('begin;'+sql('supabase/pending/063_mux_only_repository_authoring.sql')+'commit;');
 // Compare the complete saved public routine/policy sets against the later
 // production catalog. Schema export is pre-063; apply exactly 063 locally.
 const actual=JSON.parse(q(`select json_agg(json_build_object('name',p.proname,'definition',pg_get_functiondef(p.oid))) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind='f';`));
 equal(actual.length,catalog.routines.length,'Complete public routine count');
 const normalize=s=>s.replaceAll('\r\n','\n').trim();
 for(const routine of catalog.routines){
  const match=actual.find(r=>r.name===routine.name&&normalize(r.definition)===normalize(routine.definition));
  assert.ok(match,'Routine differs from captured catalog: '+routine.name);checks++;
 }
 const policies=JSON.parse(q(`select json_agg(p) from pg_policies p where schemaname='public';`));
 equal(policies.length,catalog.policies.length,'Full policy count');
 for(const expected of catalog.policies){const found=policies.find(p=>p.tablename===expected.tablename&&p.policyname===expected.policyname);
  assert.ok(found,expected.policyname);for(const key of ['cmd','qual','with_check','permissive'])equal(found[key],expected[key],expected.policyname+':'+key);
 }
 const profileCount=q('select count(*) from profiles;');equal(profileCount,'0');
 const uid=n=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
 // Seed only fictional Auth users through actual captured signup triggers.
 for(const n of [1,2,3])q(`insert into auth.users(id,email,raw_user_meta_data,raw_app_meta_data) values('${uid(n)}','fixture${n}@example.invalid',
 '{"full_name":"Fixture Member ${n}","phone":"000000","date_of_birth":"2000-01-01"}','{}');
 update auth.users set email_confirmed_at=now() where id='${uid(n)}';`);
 q(`update profiles set is_super_admin=true where id='${uid(1)}';`);
 const baseline=q('select jsonb_agg(to_jsonb(p) order by id) from profiles p;');
 const designs=['offline_same_id_foundation','offline_claim_scope','offline_claim_provisioning','offline_claim_api','offline_claim_setup','offline_app_access','offline_delivery_guards','offline_catalog_consumers','offline_member_conversion'];
 const usePackaged=process.argv[5]==='--packaged';
 const combined=usePackaged ? sql('supabase/pending/064_offline_members_and_claims.sql') : designs.map(name=>sql('supabase/design/'+name+'.sql').replace(/^begin;$/m,'').replace(/commit;\s*$/i,'')).join('\n');
 if(usePackaged)q("set jwg.offline_migration='064';");
 q("set jwg.offline_migration='064';set jwg.claim_local='on';set jwg.offline_delivery_local='on';begin;"+combined+'rollback;');
 equal(q('select jsonb_agg(to_jsonb(p) order by id) from profiles p;'),baseline,'Full candidate rollback preserves original profiles');
 equal(q("select to_regnamespace('member_claim_private') is null;"),'t');
 q("set jwg.offline_migration='064';set jwg.claim_local='on';set jwg.offline_delivery_local='on';begin;"+combined+'commit;');
 equal(q("select jsonb_agg(to_jsonb(p)-array['auth_user_id','member_origin'] order by id) from profiles p;"),baseline,'Backfill preserves every original profile field');
 const acceptance=sql('tests/sql/offline_full_schema_assertions.sql');
 const tables=JSON.parse(q(`select json_agg(format('%I.%I',schemaname,tablename) order by schemaname,tablename) from pg_tables where schemaname in ('public','auth','storage','supabase_migrations','member_import_private','same_id_import_private','member_claim_private');`));
 const snapshot=()=>q(tables.map(table=>`select jsonb_build_object('table','${table}','rows',count(*),'hash',md5(coalesce(string_agg(to_jsonb(r)::text,E'\\n' order by to_jsonb(r)::text),''))) from ${table} r;`).join('\n'));
 const beforeAcceptance=snapshot();
 behaviorChecks=(acceptance.match(/select pg_temp\.check_true\(/g)||[]).length;
 assert.match(q(acceptance),/FULL_SCHEMA_ACCEPTANCE_PASSED/);checks++;
 equal(snapshot(),beforeAcceptance,'Acceptance rollback preserves complete public/Auth/Storage/private row hashes and counts');
 const conversionSql=sql('tests/sql/offline_conversion_assertions.sql');
 conversionChecks=(conversionSql.match(/perform pg_temp\.conversion_check\(/g)||[]).length;
 const conversionBaseline=snapshot();
 assert.match(q(conversionSql),/CONVERSION_ACCEPTANCE_PASSED/);checks++;
 equal(snapshot(),conversionBaseline,'Conversion tests preserve complete row baseline');
 const emailChangeBaseline=snapshot();
 assert.match(q(sql('tests/sql/offline_claim_email_change_assertions.sql')),/CLAIM_EMAIL_CHANGE_ACCEPTANCE_PASSED/);checks++;
 equal(snapshot(),emailChangeBaseline,'Claim email-change tests preserve complete row baseline');
 passed=true;
} finally {
 if(started){run('pg_ctl',['-D',data,'-m','fast','-w','-t','30','stop']);stopped=true;}
 const result={passed,stopped,checks,behaviorChecks,conversionChecks,packagedMigration:process.argv[5]==='--packaged',scope:'complete-exported-schema-synthetic-rows',managedServicesRestored:false,ownerMapping:'all restored objects owned by local postgres; schema grants retained',sourceBackupPreserved:true,evidenceDirectory:root};
 writeFileSync(join(root,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}
