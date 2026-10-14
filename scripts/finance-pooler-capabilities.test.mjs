import test from 'node:test';
import assert from 'node:assert/strict';
import {releaseEvidenceFixture,pack} from '../tests/fixtures/finance-release-evidence.mjs';
import {prepareFinancePoolerCapabilities,verifyFinancePoolerCapabilityCapture,
  verifyFinancePoolerCapabilitySnapshot} from './finance-pooler-capabilities.mjs';
import {prepareFinancePoolerReleaseEvidence} from './finance-pooler-release-evidence.mjs';

test('fixed capability query is read-only and never assigns an xid or invokes application functions',()=>{
  const plan=prepareFinancePoolerCapabilities();
  assert.match(plan.sql,/^begin isolation level repeatable read read only;/);
  assert.match(plan.sql,/rollback;\n$/);assert.match(plan.sql,/pg_xact_status\('1'::xid8\)/);
  assert.match(plan.sql,/pg_current_xact_id_if_assigned\(\)/);
  assert.doesNotMatch(plan.sql,/\b(insert|update|delete|create|alter|drop|commit|nextval)\b|public\.|select pg_current_xact_id\(/i);
  assert.equal(plan.readyToExecute,false);assert.equal(plan.remoteContact,false);assert.ok(Object.isFrozen(plan.target));
});
test('capability receipt binds target/query/TLS and never authorizes a write rehearsal',async()=>{
  const f=await releaseEvidenceFixture(),c=f.evidence.capabilities;
  const r=verifyFinancePoolerCapabilityCapture(c.bytes,c.hash);
  assert.equal(r.capabilitiesVerified,true);assert.equal(r.liveTransportAuthenticated,false);assert.equal(r.applicationApproval,false);
  for(const change of [{kind:'other'},{querySha256:'0'.repeat(64)},{clientsExitedCleanly:false},
    {target:{...prepareFinancePoolerCapabilities().target,port:6543}}]){
    const modified=pack({...JSON.parse(c.bytes),...change});
    assert.throws(()=>verifyFinancePoolerCapabilityCapture(modified.bytes,modified.hash));
  }
  assert.throws(()=>verifyFinancePoolerCapabilityCapture(c.bytes,'0'.repeat(64)));
});
test('missing privileges, incomplete activity, assigned xid and stale/server identity fail closed',async()=>{
  const {server}=await releaseEvidenceFixture();
  for(const change of ['controlSystemExecutable','transactionStatusExecutable','transactionIdentityExecutable',
    'activitySelectable','sslSelectable','allStatsVisible'].map(key=>({[key]:false})).concat([
    {readOnly:'off'},{ssl:false},{assignedXid:'100'},{statusProbeResult:'unknown'},{statusProbeResult:undefined},
    {statusProbeXid:'2'},{capturedAt:'2020-01-01T00:00:00Z'},{backendPid:0},{clusterId:'0'},
    {clusterId:'18446744073709551616'},{address:'127.0.0.1'},{address:'::ffff:127.0.0.1'},{address:'0.0.0.0'},
    {port:0},{database:'other'},{serverVersionNum:130000},{selfActivity:null},
    {selfActivity:{...server.selfActivity,state:'idle'}},{selfActivity:{...server.selfActivity,pid:999}},
    {selfActivity:{...server.selfActivity,transactionStart:new Date(Date.now()+60000).toISOString()}}
  ]))assert.throws(()=>verifyFinancePoolerCapabilitySnapshot({...server,...change}),JSON.stringify(change));
});
test('release gate requires capabilities and exact baseline server; bindings cannot be changed after preparation',async()=>{
  const f=await releaseEvidenceFixture();
  const absent={...f.evidence};delete absent.capabilities;
  assert.throws(()=>prepareFinancePoolerReleaseEvidence(absent));
  const gate=prepareFinancePoolerReleaseEvidence(f.evidence);
  f.evidence.capabilities.bytes.fill(0);
  await gate.validateBefore(f.server);
  for(const change of [{clusterId:'999'},{address:'192.0.2.2'},{port:6432},{database:'other'},{sessionUser:'other'}])
    await assert.rejects(gate.validateBefore({...f.server,...change}),/differs/);
});
test('loopback verification is explicit and cannot be passed through remote capture verification',async()=>{
  const f=await releaseEvidenceFixture(),s={...f.server,address:'127.0.0.1',ssl:false};
  assert.throws(()=>verifyFinancePoolerCapabilitySnapshot(s));
  assert.equal(verifyFinancePoolerCapabilitySnapshot(s,{localProbe:true}).scope,'synthetic-loopback-capabilities');
  const c=pack({...JSON.parse(f.evidence.capabilities.bytes),snapshot:s});
  assert.throws(()=>verifyFinancePoolerCapabilityCapture(c.bytes,c.hash,{localProbe:true}));
});
