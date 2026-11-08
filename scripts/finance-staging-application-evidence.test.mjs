import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyFinanceApplicationCommit,verifyFinanceApplicationLedger,verifyFinanceApplicationObserver} from './finance-staging-application-evidence.mjs';
function fixture(){
  const nonce='a'.repeat(32),time=new Date(Date.now()-1000).toISOString();
  const i={nonce,capturedAt:time,database:'postgres',sessionUser:'postgres',clusterId:'12345',address:'192.0.2.1',port:5432,
    backendPid:100,backendStart:time,transactionStart:time,applicationName:'jwg-finance-rehearsal-'+nonce,readOnly:'off',ssl:true,transactionId:'123456'};
  const o={...i,backendPid:101,readOnly:'on',targetBackendPid:100,targetApplicationName:i.applicationName,
    transactionStatus:'committed',matchingSessions:[]};
  return {i,o,options:{nonce,clientFinishedAt:time}};
}
test('committed xid and independent closed-session observation are mandatory',()=>{
  const {i,o,options}=fixture();assert.equal(verifyFinanceApplicationCommit(i,o,options).transactionCommitted,true);
  for(const change of [{transactionStatus:'aborted'},{transactionStatus:'in progress'},{backendPid:100},
    {transactionId:'2'},{ssl:false},{clusterId:'other'},{nonce:'b'.repeat(32)},
    {matchingSessions:[{pid:100,state:'active'}]}])assert.throws(()=>verifyFinanceApplicationCommit(i,{...o,...change},options));
});
test('freshness, exact statements and unchanged ledger catalog cannot be bypassed',()=>{
  const {i,o}=fixture();assert.throws(()=>verifyFinanceApplicationObserver(o,i,{notBefore:new Date().toISOString()}));
  const expected=[{version:'059',name:'reviewed',statements:['select 1;']}];
  verifyFinanceApplicationLedger({ledger:expected,ledgerCatalogDigest:'a'},expected,'a');
  assert.throws(()=>verifyFinanceApplicationLedger({ledger:expected,ledgerCatalogDigest:'b'},expected,'a'));
  assert.throws(()=>verifyFinanceApplicationLedger({ledger:[...expected,...expected],ledgerCatalogDigest:'a'},expected,'a'));
});
test('late commit reconciliation keeps historical timestamps and requires a fresh observer',()=>{
  const {i,o,options}=fixture();
  const old=new Date(Date.now()-3600000).toISOString();
  Object.assign(i,{capturedAt:old,backendStart:old,transactionStart:old});
  options.clientFinishedAt=old;
  assert.equal(verifyFinanceApplicationCommit(i,o,options).transactionCommitted,true);
  assert.throws(()=>verifyFinanceApplicationCommit(i,{...o,capturedAt:old},options));
  assert.throws(()=>verifyFinanceApplicationCommit(i,o,{...options,clientFinishedAt:new Date().toISOString()}));
});
