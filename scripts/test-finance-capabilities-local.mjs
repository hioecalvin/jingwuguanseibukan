// Actual query on the disposable synthetic loopback cluster only. No credentials.
import assert from 'node:assert/strict';
import {prepareFinancePoolerCapabilities,verifyFinancePoolerCapabilitySnapshot} from './finance-pooler-capabilities.mjs';
export function testFinanceCapabilitiesLocal({psqlArgs,query}){
  if(psqlArgs[psqlArgs.indexOf('-h')+1]!=='127.0.0.1')throw Error('Synthetic loopback only');
  const plan=prepareFinancePoolerCapabilities();
  const before=JSON.parse(query(plan.sql)),after=JSON.parse(query(plan.sql));
  for(const s of [before,after]){
    assert.equal(verifyFinancePoolerCapabilitySnapshot(s,{localProbe:true}).capabilitiesVerified,true);
    assert.equal(s.assignedXid,null);assert.equal(s.readOnly,'on');
    assert.throws(()=>verifyFinancePoolerCapabilitySnapshot(s));
  }
  assert.equal(before.clusterId,after.clusterId);assert.notEqual(before.backendPid,after.backendPid);
  console.log('PASS: actual local PG17 capability SQL reads transaction status and session statistics in independent read-only sessions without assigning an xid; remote verifier rejects loopback');
}
