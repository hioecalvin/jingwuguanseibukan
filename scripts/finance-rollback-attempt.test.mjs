import test from 'node:test';
import assert from 'node:assert/strict';
import {createRollbackAttempt} from './finance-rollback-attempt.mjs';
const nonce='a'.repeat(32);
const sentinel={status:3,stderr:`ERROR:  Z0590: JWG_FINANCE_ROLLBACK_${nonce}`};
function setup(overrides={}) {
  const calls=[];
  const options={nonce,baseline:{digest:'before'},
    executeOnce:async()=>{calls.push('execute');return sentinel;},
    verifySessionClosed:async()=>{calls.push('close');return true;},
    captureAfter:async()=>{calls.push('capture');return {digest:'before'};},
    compare:async(before,after)=>{calls.push('compare');return {
      independentSessions:true,unchanged:before.digest===after.digest,differences:[]};},...overrides};
  return {run:createRollbackAttempt(options),calls,options};
}
test('one expected abort, confirmed session exit and independent equality verifies the attempt',async()=>{
  const {run,calls}=setup();const result=await run();
  assert.equal(result.verified,true);assert.equal(result.applicationApproval,false);
  assert.equal(result.automaticRetryAllowed,false);
  assert.deepEqual(calls,['execute','close','capture','compare']);
  await assert.rejects(run,/already consumed/);assert.equal(calls.filter(x=>x==='execute').length,1);
});
test('transport exception still attempts session check and reconciliation without leaking the error',async()=>{
  const {run,calls}=setup({executeOnce:async()=>{throw Error('secret-token private-member-data');}});
  const result=await run();assert.equal(result.verified,false);assert.equal(result.baselineUnchanged,true);
  assert.deepEqual(calls,['close','capture','compare']);
  assert.ok(!JSON.stringify(result).includes('secret-token'));await assert.rejects(run,/already consumed/);
});
test('timeout, success exit, wrong nonce, and extra errors cannot pass even with identical baselines',async()=>{
  for(const value of [{...sentinel,error:Error('timeout')},{...sentinel,status:0},
    {...sentinel,stderr:sentinel.stderr.replace(nonce,'b'.repeat(32))},
    {...sentinel,stderr:sentinel.stderr+'\nERROR: unexpected'}]) {
    const {run,calls}=setup({executeOnce:()=>value});const result=await run();
    assert.equal(result.verified,false);assert.ok(calls.includes('capture'));
  }
});
test('uncertain session state fails despite equality and never skips independent capture',async()=>{
  for(const verifySessionClosed of [()=>false,()=>undefined,()=>({closed:true}),()=>{throw Error('private');}]) {
    const {run,calls}=setup({verifySessionClosed});const result=await run();
    assert.equal(result.verified,false);assert.equal(result.sessionClosed,false);assert.ok(calls.includes('capture'));
  }
});
test('failed capture or comparator cannot be reported as verified rollback',async()=>{
  for(const overrides of [{captureAfter:()=>{throw Error('private');}},{compare:()=>{throw Error('private');}}]) {
    const {run}=setup(overrides);const result=await run();assert.equal(result.verified,false);
    assert.deepEqual(result.failures,['independent-reconciliation-failed']);
  }
});
test('residue, reused sessions and incomplete comparison results fail closed',async()=>{
  for(const value of [null,{unchanged:true,differences:[]},
    {independentSessions:true,unchanged:false,differences:['tables']},
    {independentSessions:true,unchanged:true,differences:['sequences']},
    {independentSessions:true,unchanged:true}]) {
    const {run}=setup({compare:()=>value});assert.equal((await run()).verified,false);
  }
});
test('concurrent invocation cannot dispatch a second mutation',async()=>{
  let release;let count=0;
  const {run}=setup({executeOnce:()=>{count++;return new Promise(resolve=>{release=()=>resolve(sentinel);});}});
  const first=run();await assert.rejects(run,/already consumed/);release();
  assert.equal((await first).verified,true);assert.equal(count,1);
});
test('caller cannot rewrite baseline after creating the attempt',async()=>{
  const {run,options}=setup();options.baseline.digest='changed';assert.equal((await run()).verified,true);
});
test('invalid nonce and missing adapter refuse preparation without dispatch',()=>{
  assert.throws(()=>setup({nonce:'unsafe'}));assert.throws(()=>setup({captureAfter:null}));
  assert.throws(()=>setup({baseline:null}));
});
