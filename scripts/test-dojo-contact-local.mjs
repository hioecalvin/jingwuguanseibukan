// Fresh loopback-only synthetic PostgreSQL cluster. No external services.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { closeSync, mkdtempSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
const repo=fileURLToPath(new URL('../',import.meta.url));
const pgBin=process.argv[2];assert.ok(pgBin,'Absolute PostgreSQL 17 bin directory required');
const root=mkdtempSync(join(tmpdir(),'jwg-dojo-contact-'));const data=join(root,'data');
const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!/^PG/i.test(key)));
function run(name,args,input,allowFailure=false){
 const fd=name==='pg_ctl'?openSync(join(root,'control.log'),'a'):null;
 try {const result=spawnSync(join(resolve(pgBin),`${name}${process.platform==='win32'?'.exe':''}`),args,{env,input,encoding:'utf8',windowsHide:true,timeout:45000,...(fd===null?{}:{stdio:['ignore',fd,fd]})});
 if(result.error||(!allowFailure&&result.status!==0)) throw new Error(`${name}: ${result.stderr||result.error||'See control.log'}`);return result;
 }finally{if(fd!==null)closeSync(fd);}
}
assert.match(run('postgres',['--version']).stdout,/PostgreSQL\) 17\./);
const port=await new Promise((resolvePort,reject)=>{const socket=createServer();socket.once('error',reject);socket.listen(0,'127.0.0.1',()=>{const value=socket.address().port;socket.close(error=>error?reject(error):resolvePort(value));});});
let started=false,stopped=false,passed=false,checks=0;
const migration=readFileSync(join(repo,'supabase/pending/087_dojo_contact_details.sql'),'utf8');
try {
 run('initdb',['-D',data,'--username=postgres','--auth-local=trust','--auth-host=trust','--no-locale','-E','UTF8']);
 started=true;run('pg_ctl',['-D',data,'-l',join(root,'server.log'),'-o',`-h 127.0.0.1 -p ${port}`,'-w','-t','30','start']);
 const args=['-X','-w','-qAt','-h','127.0.0.1','-p',String(port),'-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'];
 const q=input=>run('psql',args,input).stdout.trim();
 const eq=(actual,expected,label)=>{assert.equal(actual,expected,label);checks++;};
 const denied=(input,pattern)=>{const r=run('psql',args,input,true);assert.notEqual(r.status,0);assert.match(r.stderr,pattern);checks++;};
 const uid=n=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
 const dojo=n=>`30000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
 const jwt=n=>`set role authenticated;set request.jwt.claim.sub='${uid(n)}';`;
 const edit=(n,version=0,maps='https://maps.app.goo.gl/Ab12',name='Fixture Contact')=>`select public.update_dojo_contact_details('${dojo(n)}','${name}','+62 (812) 345','@Fixture.Dojo','Fixture address','${maps}',${version})->>'version';`;
 eq(resolve(q('show data_directory;')).toLowerCase(),resolve(data).toLowerCase());
 q(readFileSync(join(repo,'tests/sql/087_dojo_contact_fixture.sql'),'utf8'));
 q(migration.replace(/commit;\s*$/i,'rollback;'));
 eq(q("select to_regnamespace('dojo_contact_private') is null;"),'t','Migration rollback');
 q(migration);
 eq(q("select has_schema_privilege('anon','dojo_contact_private','usage') or has_schema_privilege('authenticated','dojo_contact_private','usage');"),'f');
 eq(q("select has_function_privilege('anon','public.get_dojo_contact_details(uuid)','execute');"),'f');
 denied('set role anon;select public.get_dojo_contact_details();',/permission denied/);
 denied('set role authenticated;select public.get_dojo_contact_details();',/Active member login required/);
 denied(jwt(4)+'select public.get_dojo_contact_details();',/Active member login required/);
 eq(q(jwt(3)+'select jsonb_array_length(public.get_dojo_contact_details());'),'2','All dojos, including inactive');
 eq(q(jwt(3)+`select public.get_dojo_contact_details('${dojo(1)}')->0->>'version';`),'0','Unconfigured dojo');
 denied(jwt(3)+edit(1),/Only Super Admin/);
 denied(jwt(2)+edit(2),/Only Super Admin/);
 denied(jwt(4)+edit(1),/Active member login required/);
 eq(q(jwt(2)+edit(1)),'1','Assigned admin writes');
 eq(q(jwt(2)+edit(1,1)),'1','No-op retains version');
 eq(q('select count(*) from dojo_contact_private.audit;'),'1','No-op creates no audit');
 denied(jwt(1)+edit(1,0),/changed; reload/);
 eq(q(jwt(1)+edit(2)),'1','Super Admin writes inactive dojo');
 eq(q(jwt(3)+`select public.get_dojo_contact_details('${dojo(1)}')->0->>'instagram_username';`),'fixture.dojo');
 for(const url of ['https://google.com/maps?q=dojo','https://www.google.com/maps/place/Dojo','https://maps.google.com/?q=dojo','https://goo.gl/maps/Ab12']) {
  const v=Number(q(`select version from dojo_contact_private.details where dojo_id='${dojo(1)}';`));
  eq(q(jwt(2)+edit(1,v,url)),String(v+1),'Allowed Maps URL');
 }
 for(const url of ['javascript:alert(1)','http://google.com/maps','https://google.com.evil.example/maps','https://google.com@evil.example/maps','https://evil.example@google.com/maps','https://google.com:443/maps','https://google.com/search?q=dojo','https://google.com/mapsfoo','https://google.com\\@evil.example/maps','https://goo.gl/Ab12']) {
  const v=Number(q(`select version from dojo_contact_private.details where dojo_id='${dojo(1)}';`));
  denied(jwt(2)+edit(1,v,url),/Check contact details/);
 }
 denied(jwt(2)+"select * from dojo_contact_private.details;",/permission denied/);
 denied("update dojo_contact_private.audit set old_values='{}';",/immutable/);
 const v=Number(q(`select version from dojo_contact_private.details where dojo_id='${dojo(1)}';`));
 eq(q(jwt(2)+`select public.update_dojo_contact_details('${dojo(1)}',null,null,null,null,null,${v})->>'version';`),String(v+1),'Optional fields can be cleared');
 q("update dojo_admin_assignments set active=false;");
 denied(jwt(2)+edit(1,v+1),/Only Super Admin/);
 passed=true;
} finally {
 if(started){run('pg_ctl',['-D',data,'-m','fast','-w','-t','30','stop']);stopped=true;}
 const receipt={passed,checks,stopped,scope:'fresh local synthetic PostgreSQL 17 cluster; auth helpers stubbed',migrationSha256:createHash('sha256').update(migration).digest('hex'),root};
 writeFileSync(join(root,'receipt.json'),JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
}
