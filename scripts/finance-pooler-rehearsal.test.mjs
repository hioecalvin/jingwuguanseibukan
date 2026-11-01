import test from 'node:test';
import assert from 'node:assert/strict';
import {financeReadOnlyStagingTarget} from './finance-staging-baseline.mjs';
import {validateFinanceRehearsalTarget} from './finance-rehearsal-target.mjs';
import {prepareFinancePoolerRehearsalTarget,buildFinancePoolerMutationIdentitySql,
  buildFinancePoolerClosureSql,verifyFinancePoolerClosure} from './finance-pooler-rehearsal.mjs';
const nonce='a'.repeat(32);
function evidence(){
 const nowMs=Date.now(),start=new Date(nowMs-2000).toISOString();
 const identity={nonce,capturedAt:start,database:'postgres',sessionUser:'postgres',clusterId:'12345',
  address:'192.0.2.1',port:5432,backendPid:101,backendStart:start,transactionStart:start,
  applicationName:'jwg-finance-rehearsal-'+nonce,readOnly:'off',ssl:true,transactionId:'123456'};
 const observer={...identity,backendPid:102,readOnly:'on',capturedAt:new Date(nowMs).toISOString(),
  targetBackendPid:101,targetApplicationName:identity.applicationName,transactionStatus:'aborted',
  matchingSessions:[{pid:101,backendStart:start,state:'idle',transactionStart:null,backendXid:null,applicationName:'pool'}]};
 return {identity,observer,options:{nonce,nowMs,clientFinishedAt:new Date(nowMs-1000).toISOString()}};
}
test('explicit exact pooler plan grants no execution and does not relax the direct guard',()=>{
 const target=financeReadOnlyStagingTarget(),p=prepareFinancePoolerRehearsalTarget(target);
 assert.equal(p.readyToExecute,false);assert.ok(Object.isFrozen(p.target));
 assert.throws(()=>validateFinanceRehearsalTarget(target));
 for(const change of [{port:6543},{sslmode:'require'},{user:'postgres'},{projectRef:'other'},
 {transport:'transaction-pooler'},{host:'127.0.0.1'},{options:'extra'}])
  assert.throws(()=>prepareFinancePoolerRehearsalTarget({...target,...change}));
});
test('aborted transaction plus idle reused backend differs explicitly from physical process closure',()=>{
 const {identity,observer,options}=evidence();let r=verifyFinancePoolerClosure(identity,observer,options);
 assert.equal(r.transactionAborted,true);assert.equal(r.rehearsalScopeClosed,true);assert.equal(r.physicalBackendGone,false);
 assert.equal(r.rollbackBaselineVerified,false);observer.matchingSessions=[];
 r=verifyFinancePoolerClosure(identity,observer,options);assert.equal(r.physicalBackendGone,true);
});
test('committed, running, unknown or wrong transaction never passes even with no surviving backend',()=>{
 for(const status of ['committed','in progress',null,undefined,'unknown']){
  const {identity,observer,options}=evidence();observer.transactionStatus=status;observer.matchingSessions=[];
  assert.throws(()=>verifyFinancePoolerClosure(identity,observer,options));
 }
 const {identity,observer,options}=evidence();observer.transactionId='654321';
 assert.throws(()=>verifyFinancePoolerClosure(identity,observer,options));
});
test('reused backend must be exactly idle without an open transaction or original marker',()=>{
 for(const change of [{state:'active'},{state:'idle in transaction'},{state:'idle in transaction (aborted)'},
 {transactionStart:'2026-10-12T00:00:00Z'},{backendXid:'123'},{backendStart:'other'},
 {applicationName:'jwg-finance-rehearsal-'+nonce},{applicationName:null},{pid:103}]){
  const {identity,observer,options}=evidence();Object.assign(observer.matchingSessions[0],change);
  assert.throws(()=>verifyFinancePoolerClosure(identity,observer,options));
 }
 const {identity,observer,options}=evidence();observer.matchingSessions.push({...observer.matchingSessions[0]});
 assert.throws(()=>verifyFinancePoolerClosure(identity,observer,options));
});
test('observer remains bound to independent PID, server, TLS, nonce and ordered fresh times',()=>{
 for(const change of [{backendPid:101},{clusterId:'999'},{address:'192.0.2.2'},{ssl:false},
 {readOnly:'off'},{nonce:'b'.repeat(32)},{capturedAt:'2020-01-01'},
 {targetApplicationName:'wrong'},{targetBackendPid:103}]){
  const {identity,observer,options}=evidence();assert.throws(()=>verifyFinancePoolerClosure(identity,{...observer,...change},options));
 }
 const {identity,observer,options}=evidence();
 assert.throws(()=>verifyFinancePoolerClosure(identity,observer,{...options,clientFinishedAt:undefined}));
 assert.throws(()=>verifyFinancePoolerClosure(identity,observer,{...options,localProbe:true}));
});
test('pooler SQL records xid8 and queries its terminal status without cancellation or dynamic SQL',()=>{
 const {identity,options}=evidence(),sql=buildFinancePoolerClosureSql(identity,options);
 assert.match(buildFinancePoolerMutationIdentitySql(nonce),/pg_current_xact_id\(\)::text/);
 assert.match(sql,/pg_xact_status\('123456'::xid8\)/);assert.match(sql,/begin read only/);
 assert.doesNotMatch(sql,/pg_terminate_backend|pg_cancel_backend|pg_sleep|advisory/);
 for(const transactionId of ['0','1;drop table x','18446744073709551616',123])
  assert.throws(()=>buildFinancePoolerClosureSql({...identity,transactionId},options));
});
