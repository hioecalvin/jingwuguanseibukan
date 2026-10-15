import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {reviewFinanceDependencies} from './review-finance-dependencies.mjs';
function fixture() {
  const capture={readOnly:'on',database:'postgres',functions:[],triggers:[],defaults:[],policies:[],
    foreignTables:[],rules:[],extensions:[],ledgerVersions:Array.from({length:53},(_,i)=>String(i+6).padStart(3,'0'))};
  const receipt={projectRef:'eomubndonbetszdbhsrj',projectIdentityVerified:true,readOnlyVerified:true,ownerOnlyAclVerified:true};
  const run=()=>{
    const bytes=Buffer.from(JSON.stringify(capture));
    receipt.definitionFileSha256=createHash('sha256').update(bytes).digest('hex');
    return reviewFinanceDependencies(capture,receipt,bytes);
  };
  return {capture,receipt,run};
}
test('dependency inventory refuses wrong project, write mode, missing fields and ledger drift',()=>{
  for(const mutate of [f=>f.receipt.projectRef='wrong',f=>f.capture.readOnly='off',
    f=>delete f.capture.defaults,f=>f.capture.ledgerVersions.push('059')]) {
    const f=fixture();mutate(f);assert.throws(f.run);
  }
});
test('identity risk is detected even with a null column default',()=>{
  const f=fixture();f.capture.defaults.push({table:'membership_status_history',column:'id',identity:'YES',default:null},
    {table:'notification_outbox',column:'id',identity:'NO',default:"nextval('private_sequence'::regclass)"});
  const result=f.run();assert.equal(result.sequenceRisks.length,2);assert.equal(result.readyToExecute,false);
  assert.ok(result.blockers.some(b=>b.includes('sequence state')));
});
test('missing and overloaded bodies are fail-closed; report never includes literals',()=>{
  const f=fixture();f.capture.functions.push({schema:'public',name:'create_notification',definition:"select 'PRIVATE_SENTINEL'"},
    {schema:'public',name:'create_notification',definition:null});
  const result=f.run();assert.ok(result.missingDefinitions.includes('public.create_notification'));
  assert.doesNotMatch(JSON.stringify(result),/PRIVATE_SENTINEL/);
  assert.equal(result.transitiveReviewComplete,false);
});
test('hash mismatch and parsed object replacement are rejected',()=>{
  const f=fixture();f.run();const bytes=Buffer.from(JSON.stringify(f.capture));
  assert.throws(()=>reviewFinanceDependencies(f.capture,{...f.receipt,definitionFileSha256:'bad'},bytes),/hash mismatch/);
  assert.throws(()=>reviewFinanceDependencies({...f.capture,functions:[{}]},f.receipt,bytes),/Capture\/bytes mismatch/);
});
test('foreign tables and rewrite rules retain a review blocker',()=>{
  const f=fixture();f.capture.foreignTables.push({table:'external'});f.capture.rules.push({name:'write_rule'});
  const result=f.run();assert.equal(result.foreignTableCount,1);assert.equal(result.rewriteRuleCount,1);
  assert.equal(result.readyToExecute,false);assert.ok(result.blockers.some(b=>b.includes('rewrite rules')));
});
