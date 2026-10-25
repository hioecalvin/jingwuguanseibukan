// Synthetic local PostgreSQL only; no provider, credentials, real data or RPC tests.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync,openSync,closeSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createServer} from 'node:net';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const bin=process.argv[2];
if(!bin)throw Error('Pass local PostgreSQL 17 bin directory');
const repo=fileURLToPath(new URL('../',import.meta.url));
const root=mkdtempSync(join(tmpdir(),'jwg-mux-authoring-')),data=join(root,'data');
const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!/^(PG|SUPABASE|DATABASE|RESEND|MUX|EMAIL|PUSH|SECURITY_TEST)/i.test(k)));
const binary=name=>join(resolve(bin),name+(process.platform==='win32'?'.exe':''));
function run(name,args,input){
 const fd=name==='pg_ctl'?openSync(join(root,'control.log'),'a'):null;
 try{const p=spawnSync(binary(name),args,{env,input,encoding:'utf8',windowsHide:true,timeout:45000,...(fd===null?{}:{stdio:['ignore',fd,fd]})});
 if(p.error||p.status!==0)throw Error(`${name}: ${p.stderr||p.error||'See local log'}`);return p.stdout??'';
 }finally{if(fd!==null)closeSync(fd);}
}
assert.match(run('postgres',['--version']),/PostgreSQL\) 17\./);
const port=await new Promise((res,rej)=>{const s=createServer();s.once('error',rej);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(e=>e?rej(e):res(p));});});
const migration=readFileSync(join(repo,'supabase/pending/063_mux_only_repository_authoring.sql'),'utf8');
const migrationSha256=createHash('sha256').update(migration).digest('hex');
let attempted=false,stopped=false,passed=false,checks=0;
try{
 run('initdb',['-D',data,'--username=postgres','--auth-local=trust','--auth-host=trust','--no-locale','-E','UTF8']);attempted=true;
 run('pg_ctl',['-D',data,'-l',join(root,'server.log'),'-o',`-h 127.0.0.1 -p ${port}`,'-w','-t','30','start']);
 const args=['-X','-w','-qAt','-h','127.0.0.1','-p',String(port),'-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'];
 const q=input=>run('psql',args,input).trim();
 assert.equal(resolve(q('show data_directory;')).toLowerCase(),resolve(data).toLowerCase());
 q(readFileSync(join(repo,'tests/sql/063_mux_only_fixture.sql'),'utf8'));
 const snapshot=()=>q('select jsonb_agg(to_jsonb(c) order by id) from public.content c;');
 const baseline=snapshot();
 q(`begin;${migration}rollback;`);assert.equal(snapshot(),baseline);checks++;
 assert.equal(q("select to_regprocedure('public.enforce_mux_only_repository_authoring()') is null;"),'t');checks++;
 assert.equal(q("select count(*) from pg_trigger where tgname='enforce_mux_only_repository_authoring';"),'0');checks++;
 q(`begin;${migration}commit;`);assert.equal(snapshot(),baseline);checks++;
 const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
 const denied=(sql,pattern=/New repository videos must use Mux|YouTube video authoring is disabled|Publish this video through the Mux uploader/)=>{
  assert.throws(()=>q(`begin;${sql}commit;`),pattern);assert.equal(snapshot(),baseline,'Denied transaction residue');checks++;
 };
 const allowed=(sql,verification)=>{assert.equal(q(`begin;${sql}${verification}rollback;`),'t');assert.equal(snapshot(),baseline);checks++;};
 for(const role of ['postgres','authenticated','service_role']){
  const as=`set local role ${role};`;
  denied(`${as}insert into content values('${id(5)}','New YouTube',null,'draft','youtube','123456789ab',null);`);
  denied(`${as}update content set video_provider='youtube',video_id='123456789ab' where id='${id(3)}';`);
  denied(`${as}update content set video_id='123456789ab' where id='${id(1)}';`);
  denied(`${as}update content set status='published' where id='${id(2)}';`);
  denied(`${as}update content set video_provider='youtube',video_id='123456789ab',video_asset_id=null where id='${id(4)}';`);
  allowed(`${as}update content set title='Metadata edited',description='Updated' where id='${id(1)}';`,
   `select title='Metadata edited' and description='Updated' and status='published' and video_id='abcdefghijk' from content where id='${id(1)}';`);
  allowed(`${as}update content set title='Draft edited',status='archived' where id='${id(2)}';`,
   `select title='Draft edited' and status='archived' and video_id='lmnopqrstuv' from content where id='${id(2)}';`);
  allowed(`${as}insert into content values('${id(5)}','New empty',null,'draft',null,null,null);`,
   `select video_provider is null and video_id is null and video_asset_id is null from content where id='${id(5)}';`);
  allowed(`${as}insert into content values('${id(5)}','New Mux',null,'published','mux','newMuxPlayback','newMuxAsset');`,
   `select video_provider='mux' and status='published' from content where id='${id(5)}';`);
  allowed(`${as}update content set video_provider='mux',video_id='newMuxPlayback',video_asset_id='newMuxAsset',status='published' where id='${id(2)}';`,
   `select video_provider='mux' and status='published' from content where id='${id(2)}';`);
  allowed(`${as}update content set status='archived' where id='${id(1)}';`,
   `select video_id='abcdefghijk' and status='archived' from content where id='${id(1)}';`);
  assert.equal(q(`set role ${role};select count(*) from content where status='published';`),'2');checks++;
 }
 for(const role of ['anon','authenticated','service_role']){assert.equal(q(`select has_function_privilege('${role}','public.enforce_mux_only_repository_authoring()','EXECUTE');`),'f');checks++;}
 denied(`set local role anon;insert into content values('${id(5)}','Unauthorized',null,'draft',null,null,null);`,/permission denied/);
 q(`create function public.synthetic_before_video() returns trigger language plpgsql as $$begin
 if new.title='Inject YouTube' then new.video_provider:='youtube';new.video_id:='123456789ab';new.video_asset_id:=null;end if;
 if new.title='Inject publication' then new.status:='published';end if;return new;end $$;
 create trigger zz_synthetic_before_video before insert or update on content for each row execute function public.synthetic_before_video();`);
 denied(`set local role authenticated;insert into content values('${id(5)}','Inject YouTube',null,'draft',null,null,null);`);
 denied(`set local role service_role;update content set title='Inject YouTube' where id='${id(1)}';`);
 denied(`set local role authenticated;update content set title='Inject publication' where id='${id(2)}';`);
 denied(`update content set description='Must roll back' where id='${id(1)}';insert into content values('${id(5)}','Forbidden',null,'draft','youtube','123456789ab',null);`);
 assert.equal(snapshot(),baseline);checks++;passed=true;
}finally{
 if(attempted){run('pg_ctl',['-D',data,'-m','fast','-w','-t','30','stop']);stopped=true;}
 const result={passed,stopped,checks,localOnly:true,migrationSha256,evidenceDirectory:root,scope:'synthetic trigger/role acceptance; no RPC, live data, provider or playback verification'};
 writeFileSync(join(root,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}
