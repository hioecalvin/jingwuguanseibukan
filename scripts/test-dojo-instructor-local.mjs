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
const root=mkdtempSync(join(tmpdir(),'jwg-dojo-instructor-'));const data=join(root,'data');
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
const migration=readFileSync(join(repo,'supabase/pending/090_schedule_instructor_details.sql'),'utf8');
const fixture=readFileSync(join(repo,'tests/sql/090_dojo_instructor_fixture.sql'),'utf8');
const assertions=readFileSync(join(repo,'tests/sql/090_dojo_instructor_assertions.sql'),'utf8');
const whatsappMigration=readFileSync(join(repo,'supabase/pending/091_schedule_instructor_whatsapp.sql'),'utf8');
const whatsappAssertions=readFileSync(join(repo,'tests/sql/091_schedule_instructor_whatsapp_assertions.sql'),'utf8');
const schedule048=readFileSync(join(repo,'supabase/migrations/048_regular_class_schedules.sql'),'utf8');
const appointment086=readFileSync(join(repo,'supabase/pending/086_class_instructor_appointments.sql'),'utf8');
function routine(sql,name){
 const found=sql.match(new RegExp(`create(?: or replace)? function ${name.replaceAll('.','\\.')}\\([\\s\\S]*?\\bas\\s+(\\$[a-zA-Z_]*\\$)[\\s\\S]*?\\1;`,'i'));
 assert.ok(found,`Missing real routine ${name}`);return found[0].replaceAll('\r\n','\n');
}
for(const [source,name] of [[schedule048,'public.get_regular_class_schedules'],[appointment086,'public.upsert_regular_class_schedule']]){
 assert.equal(routine(fixture,name),routine(source,name),`Fixture drift in ${name}`);
}
try {
 run('initdb',['-D',data,'--username=postgres','--auth-local=trust','--auth-host=trust','--no-locale','-E','UTF8']);
 started=true;run('pg_ctl',['-D',data,'-l',join(root,'server.log'),'-o',`-h 127.0.0.1 -p ${port}`,'-w','-t','30','start']);
 const args=['-X','-w','-qAt','-h','127.0.0.1','-p',String(port),'-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'];
 const q=input=>run('psql',args,input).stdout.trim();
 const eq=(actual,expected,label)=>{assert.equal(actual,expected,label);checks++;};
 const denied=(input,pattern)=>{const r=run('psql',args,input,true);assert.notEqual(r.status,0);assert.match(r.stderr,pattern);checks++;};
 q(readFileSync(join(repo,'tests/sql/087_dojo_contact_fixture.sql'),'utf8'));
 q(readFileSync(join(repo,'supabase/pending/087_dojo_contact_details.sql'),'utf8'));
 q(fixture);
 for(const name of ['public.get_schedule_instructor_options','public.get_class_instructor_appointments','public.set_class_instructor_appointment','instructor_private.validate_schedule_instructor']) q(routine(appointment086,name));
 q(`create trigger validate_regular_schedule_instructor before insert or update on public.regular_class_schedules for each row execute function instructor_private.validate_schedule_instructor();
 revoke all on function instructor_private.validate_schedule_instructor() from public,anon,authenticated,service_role;
 revoke all on function public.get_regular_class_schedules(boolean),public.get_schedule_instructor_options(uuid),public.get_class_instructor_appointments(),public.set_class_instructor_appointment(uuid,uuid,boolean,boolean),public.upsert_regular_class_schedule(uuid,smallint,time,time,uuid,text,text,boolean,uuid) from public,anon,authenticated,service_role;
 grant execute on function public.get_regular_class_schedules(boolean),public.get_schedule_instructor_options(uuid),public.get_class_instructor_appointments(),public.set_class_instructor_appointment(uuid,uuid,boolean,boolean),public.upsert_regular_class_schedule(uuid,smallint,time,time,uuid,text,text,boolean,uuid) to authenticated;`);
 const oldEligibility=q("select pg_get_functiondef('instructor_private.is_eligible(uuid,uuid)'::regprocedure);");
 const oldPicker=q("select pg_get_functiondef('public.get_schedule_instructor_options(uuid)'::regprocedure);");
 const oldGetter=q("select pg_get_functiondef('public.get_regular_class_schedules(boolean)'::regprocedure);");
 const rollbackChecks=()=>{
  eq(q("select to_regclass('instructor_private.enrollment_exceptions') is null and to_regprocedure('public.get_regular_schedules_with_instructor(boolean)') is null;"),'t','Rollback removes new objects');
  eq(q("select pg_get_functiondef('instructor_private.is_eligible(uuid,uuid)'::regprocedure);"),oldEligibility,'Rollback restores eligibility');
  eq(q("select pg_get_functiondef('public.get_schedule_instructor_options(uuid)'::regprocedure);"),oldPicker,'Rollback restores picker');
 };
 q(migration.replace(/commit;\s*$/i,'rollback;'));
 rollbackChecks();
 denied(migration.replace(/commit;\s*$/i,"select 1/0; commit;"),/division by zero/);
 rollbackChecks();
 q(migration);
 eq(q("select pg_get_functiondef('public.get_regular_class_schedules(boolean)'::regprocedure);"),oldGetter,'Original getter remains unchanged');
 q('alter table public.profiles add column whatsapp_number text;');
 const instructorDefinition=q("select pg_get_functiondef('public.get_regular_schedules_with_instructor(boolean)'::regprocedure);");
 q(whatsappMigration.replace(/commit;\s*$/i,'rollback;'));
 eq(q("select to_regprocedure('public.get_regular_schedules_with_whatsapp(boolean)') is null;"),'t','Rollback removes WhatsApp reader');
 q(whatsappMigration);
 eq(q("select pg_get_functiondef('public.get_regular_schedules_with_instructor(boolean)'::regprocedure);"),instructorDefinition,'Original instructor reader unchanged');
 const output=q(assertions+'\n'+whatsappAssertions);
 assert.match(output,/INSTRUCTOR090_PASS checks=\d+/,'Missing 090 SQL pass marker');
 const marker=output.match(/SCHEDULE091_PASS checks=(\d+)/);assert.ok(marker,'Missing 091 SQL pass marker');
 checks+=Number(marker[1]);passed=true;
} finally {
 if(started){run('pg_ctl',['-D',data,'-m','fast','-w','-t','30','stop']);stopped=true;}
 const receipt={passed,checks,stopped,scope:'fresh local synthetic PostgreSQL 17 cluster; auth helpers stubbed; original 048 getter and 086 picker/upsert/appointment/trigger routines',migrationSha256:createHash('sha256').update(migration).digest('hex'),whatsappMigrationSha256:createHash('sha256').update(whatsappMigration).digest('hex'),testSha256:createHash('sha256').update(readFileSync(fileURLToPath(import.meta.url))).update(fixture).update(assertions).update(whatsappAssertions).update(schedule048).update(appointment086).digest('hex'),root};
 writeFileSync(join(root,'receipt.json'),JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
}
