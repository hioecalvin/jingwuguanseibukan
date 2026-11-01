import test from 'node:test';
import assert from 'node:assert/strict';
import {buildFinanceMutationIdentitySql,buildFinanceSessionClosureSql,verifyFinanceSessionClosure} from './finance-session-closure.mjs';
import {createRollbackAttempt} from './finance-rollback-attempt.mjs';
const nonce='a'.repeat(32);
function evidence(){
  const now=Date.now(),start=new Date(now-2000).toISOString(),end=new Date(now-1000).toISOString();
  const identity={nonce,capturedAt:start,database:'postgres',sessionUser:'postgres',clusterId:'12345',
    address:'192.0.2.1',port:5432,backendPid:101,backendStart:start,transactionStart:start,
    applicationName:'jwg-finance-rehearsal-'+nonce,readOnly:'off',ssl:true};
  const observer={...identity,backendPid:102,readOnly:'on',capturedAt:new Date(now).toISOString(),
    targetBackendPid:101,targetApplicationName:identity.applicationName,remaining:[]};
  return {identity,observer,options:{nonce,clientFinishedAt:end,nowMs:now}};
}
test('closure requires independent fresh read-only absence, not just client process exit',()=>{
  const {identity,observer,options}=evidence();const result=verifyFinanceSessionClosure(identity,observer,options);
  assert.equal(result.sessionClosed,true);assert.equal(result.rollbackVerified,false);assert.equal(result.remoteContact,false);
});
test('surviving, idle, aborted or PID-reused backend cannot pass absence check',()=>{
  for(const state of ['active','idle','idle in transaction','idle in transaction (aborted)',null]){
    const {identity,observer,options}=evidence();observer.remaining=[{pid:101,state}];
    assert.throws(()=>verifyFinanceSessionClosure(identity,observer,options),/still present/);
  }
});
test('missing identity, weak TLS, same backend, wrong cluster and detached probe fail closed',()=>{
  for(const change of [{backendPid:101},{clusterId:'999'},{address:'192.0.2.2'},{ssl:false},
    {readOnly:'off'},{targetBackendPid:102},{targetApplicationName:'other'},{remaining:null},
    {capturedAt:'2020-01-01T00:00:00Z'},{nonce:'b'.repeat(32)}]){
    const {identity,observer,options}=evidence();assert.throws(()=>verifyFinanceSessionClosure(identity,{...observer,...change},options));
  }
  const {identity,observer,options}=evidence();
  assert.throws(()=>verifyFinanceSessionClosure(null,observer,options));
  assert.throws(()=>verifyFinanceSessionClosure({...identity,transactionStart:null},observer,options));
  assert.throws(()=>verifyFinanceSessionClosure(identity,observer,{...options,clientFinishedAt:undefined}));
  assert.throws(()=>verifyFinanceSessionClosure(identity,observer,{...options,clientFinishedAt:new Date(options.nowMs+1000).toISOString()}));
});
test('SQL binds both PID and nonce, never cancels or terminates, and rejects injection',()=>{
  const {identity,options}=evidence();const sql=buildFinanceSessionClosureSql(identity,options);
  assert.match(sql,/begin read only/);assert.match(sql,/where pid=101 or application_name=/);
  assert.match(sql,/statement_timeout='10s'/);assert.match(sql,/rollback;/);
  assert.doesNotMatch(sql,/pg_terminate_backend|pg_cancel_backend|pg_sleep|advisory/);
  assert.throws(()=>buildFinanceSessionClosureSql({...identity,backendPid:'101; select 1'},options));
  assert.throws(()=>buildFinanceMutationIdentitySql("';drop table profiles;"));
});
test('loopback mode must be explicit and cannot validate a remote address',()=>{
  const {identity,observer,options}=evidence();
  assert.throws(()=>verifyFinanceSessionClosure(identity,observer,{...options,localProbe:true}));
  identity.address=observer.address='127.0.0.1';identity.ssl=observer.ssl=false;
  assert.throws(()=>verifyFinanceSessionClosure(identity,observer,options));
  assert.equal(verifyFinanceSessionClosure(identity,observer,{...options,localProbe:true}).sessionClosed,true);
});
test('failed closure evidence still reconciles but cannot report verified rollback or retry',async()=>{
  const {identity,observer,options}=evidence();let reconciled=0,executed=0;
  observer.remaining=[{pid:101,state:'idle'}];
  const run=createRollbackAttempt({nonce,baseline:{hash:'synthetic'},executeOnce:()=>{
    executed++;return {status:3,stderr:`ERROR:  Z0590: JWG_FINANCE_ROLLBACK_${nonce}`};},
    verifySessionClosed:()=>verifyFinanceSessionClosure(identity,observer,options).sessionClosed,
    captureAfter:()=>{reconciled++;return {};},compare:()=>({independentSessions:true,unchanged:true,differences:[]})});
  const result=await run();assert.equal(result.verified,false);assert.equal(reconciled,1);
  assert.ok(result.failures.includes('mutation-session-closure-check-failed'));
  await assert.rejects(run);assert.equal(executed,1);
});
