import test from 'node:test';
import assert from 'node:assert/strict';
import {buildFinanceSessionWitnessSql,verifyFinanceSessionWitness} from './finance-session-witness.mjs';
const nonce='a'.repeat(32),nowMs=Date.parse('2026-10-11T04:00:00Z');
function fixtures(){
 const primary={nonce,database:'postgres',sessionUser:'postgres',readOnly:'on',ssl:true,address:'127.0.0.1',port:5432,
  backendPid:1,backendStart:'2026-10-11T03:59:00Z',transactionStart:'2026-10-11T03:59:30Z',capturedAt:'2026-10-11T03:59:31Z',peer:null};
 const observer={...primary,backendPid:2,transactionStart:'2026-10-11T03:59:32Z',capturedAt:'2026-10-11T03:59:33Z',
  peer:{pid:1,backendStart:primary.backendStart,transactionStart:primary.transactionStart,database:'postgres',user:'postgres',state:'idle in transaction',applicationName:'jwg-finance-witness-'+nonce}};
 return {primary,observer};
}
test('overlapping witnesses retain different PID requirement without claiming rollback proof',()=>{
 const {primary,observer}=fixtures();const result=verifyFinanceSessionWitness(primary,observer,{nonce,nowMs});
 assert.equal(result.distinctBackends,true);assert.equal(result.rollbackVerified,false);assert.equal(result.readyForWriteRehearsal,false);
});
test('reused PID, ended primary, wrong transaction or missing peer never proves independence',()=>{
 for(const change of [{peer:null},{backendPid:1},{peer:{...fixtures().observer.peer,state:'idle'}},
  {peer:{...fixtures().observer.peer,transactionStart:'2026-10-11T03:59:29Z'}},
  {peer:{...fixtures().observer.peer,backendStart:'2026-10-11T03:58:00Z'}},
  {peer:{...fixtures().observer.peer,applicationName:'unrelated'}}]){
  const {primary,observer}=fixtures();assert.throws(()=>verifyFinanceSessionWitness(primary,{...observer,...change},{nonce,nowMs}));
 }
});
test('untrusted target, stale, non-read-only, SSL and unordered evidence fails closed',()=>{
 for(const change of [{database:'other'},{sessionUser:'other'},{readOnly:'off'},{ssl:false},{nonce:'b'.repeat(32)},
  {port:5433},{address:'other'},{capturedAt:'2020-01-01T00:00:00Z'},{capturedAt:'2026-10-11T04:00:31Z'},
  {transactionStart:'2026-10-11T03:59:29Z'},{backendStart:null}]){
  const {primary,observer}=fixtures();assert.throws(()=>verifyFinanceSessionWitness(primary,{...observer,...change},{nonce,nowMs}));
 }
});
test('SQL diagnostic permits only validated nonce/PID and stays read-only with bounded timeouts',()=>{
 const primary=buildFinanceSessionWitnessSql(nonce),observer=buildFinanceSessionWitnessSql(nonce,12);
 assert.match(primary,/begin read only/);assert.doesNotMatch(primary,/rollback;/);
 assert.match(observer,/rollback;/);assert.match(observer,/where pid=12 and application_name=/);
 assert.match(primary,/idle_in_transaction_session_timeout='20s'/);
 assert.doesNotMatch(primary+observer,/pg_sleep|pg_advisory|\b(?:insert|update|delete|create|alter)\b/i);
 for(const bad of [null,'',"';select 1",'g'.repeat(32)])assert.throws(()=>buildFinanceSessionWitnessSql(bad));
 for(const bad of [0,-1,'1;select 1',1.5])assert.throws(()=>buildFinanceSessionWitnessSql(nonce,bad));
});
test('local witness mode remains explicit and rejects non-loopback server',()=>{
 const {primary,observer}=fixtures();primary.ssl=false;observer.ssl=false;
 assert.throws(()=>verifyFinanceSessionWitness(primary,observer,{nonce,nowMs}));
 assert.equal(verifyFinanceSessionWitness(primary,observer,{nonce,nowMs,localProbe:true}).scope,'synthetic-loopback-session-witness');
 primary.address=observer.address='remote';assert.throws(()=>verifyFinanceSessionWitness(primary,observer,{nonce,nowMs,localProbe:true}));
});
