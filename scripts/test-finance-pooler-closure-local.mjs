// Model backend retention on disposable loopback PG17. This is NOT Supavisor
// acceptance: the psql client intentionally stays open to model a pooled backend.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import path from 'node:path';
import {buildFinancePoolerMutationIdentitySql,buildFinancePoolerClosureSql,
  verifyFinancePoolerClosure} from './finance-pooler-rehearsal.mjs';

export async function testFinancePoolerClosureLocal({bin,psqlArgs,env,query}){
 if(psqlArgs[psqlArgs.indexOf('-h')+1]!=='127.0.0.1')throw Error('Synthetic loopback only');
 const child=spawn(path.join(bin,process.platform==='win32'?'psql.exe':'psql'),[...psqlArgs,'-qAt'],
  {env,windowsHide:true,stdio:['pipe','pipe','pipe']});
 let output='',waiting=null,failure=false;
 const reject=()=>{failure=true;if(waiting){waiting.reject(Error('Local pooler-model client failed'));waiting=null;}};
 child.stdout.on('data',chunk=>{
  output+=chunk;if(output.length>65536){reject();child.kill();return;}
  const newline=output.indexOf('\n');if(newline<0)return;
  const line=output.slice(0,newline);output=output.slice(newline+1);
  if(!waiting){reject();return;}
  const pending=waiting;waiting=null;
  try{pending.resolve(JSON.parse(line));}catch{failure=true;pending.reject(Error('Local model invalid JSON'));}
 });
 child.stderr.on('data',reject);child.on('error',reject);child.stdin.on('error',reject);
 const closed=new Promise(resolve=>child.once('close',code=>{if(waiting)reject();resolve(code);}));
 const timer=setTimeout(()=>{reject();child.kill();},20000);
 const command=sql=>new Promise((resolve,rejectRequest)=>{
  if(waiting||failure){rejectRequest(Error('Local model state invalid'));return;}
  waiting={resolve,reject:rejectRequest};child.stdin.write(sql+'\n');
 });
 try{
  const nonce=randomBytes(16).toString('hex');
  const identity=await command("begin;set local timezone='UTC';set local idle_in_transaction_session_timeout='15s';\n"+
    buildFinancePoolerMutationIdentitySql(nonce));
  const sql=buildFinancePoolerClosureSql(identity,{nonce,localProbe:true});
  const observe=()=>JSON.parse(query(sql));
  let observer=observe();
  assert.equal(observer.transactionStatus,'in progress');
  assert.throws(()=>verifyFinancePoolerClosure(identity,observer,{nonce,localProbe:true,clientFinishedAt:identity.capturedAt}));
  const retained=await command("rollback;select jsonb_build_object('pid',pg_backend_pid(),'releasedAt',clock_timestamp());");
  assert.equal(retained.pid,identity.backendPid);
  // This retained-client MODEL uses server-clock release witnesses. Mixing the
  // Windows JS wall clock with PostgreSQL timestamps can mask the intended state
  // assertion. Real transport clientFinishedAt checks are deliberately unchanged.
  const modelReleasedAt=retained.releasedAt;observer=observe();
  assert.ok(Date.parse(modelReleasedAt)>=Date.parse(identity.capturedAt));
  assert.ok(Date.parse(observer.capturedAt)>=Date.parse(modelReleasedAt));
  const options={nonce,localProbe:true,clientFinishedAt:modelReleasedAt};
  const result=verifyFinancePoolerClosure(identity,observer,options);
  assert.equal(result.transactionAborted,true);assert.equal(result.physicalBackendGone,false);
  assert.equal(result.rehearsalScopeClosed,true);
  // Even though the old transaction is aborted, a later open transaction on the
  // retained backend is uncertainty, not permission to infer clean release.
  await command("begin;select jsonb_build_object('pid',pg_backend_pid());");
  observer=observe();assert.equal(observer.transactionStatus,'aborted');
  assert.throws(()=>verifyFinancePoolerClosure(identity,observer,options),/quiescent/);
  await command("rollback;select jsonb_build_object('pid',pg_backend_pid());");
  const committedNonce=randomBytes(16).toString('hex');
  const committedIdentity=await command('begin;\n'+buildFinancePoolerMutationIdentitySql(committedNonce));
  const committed=await command("commit;select jsonb_build_object('pid',pg_backend_pid(),'releasedAt',clock_timestamp());");
  const committedOptions={nonce:committedNonce,localProbe:true,clientFinishedAt:committed.releasedAt};
  const committedObserver=JSON.parse(query(buildFinancePoolerClosureSql(committedIdentity,committedOptions)));
  assert.equal(committedObserver.transactionStatus,'committed');
  assert.ok(Date.parse(committed.releasedAt)>=Date.parse(committedIdentity.capturedAt));
  assert.ok(Date.parse(committedObserver.capturedAt)>=Date.parse(committed.releasedAt));
  assert.throws(()=>verifyFinancePoolerClosure(committedIdentity,committedObserver,committedOptions),/not proven aborted/);
  child.stdin.end();assert.equal(await closed,0);assert.equal(failure,false);
  console.log('PASS: real local PG17 pooler model accepts aborted/idle retained backend; rejects in-progress, committed and reused-open transactions; independent observer required');
 }finally{clearTimeout(timer);if(child.exitCode===null)child.kill();await closed;}
}
