import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {prepareFinanceStagingInventory,prepareFinanceStagingBaseline,verifyFinanceStagingBaselineCapture,
  compareFinanceStagingBaselineCaptures} from './finance-staging-baseline.mjs';
import {buildLocalBaselineSql,verifyLocalBaseline} from './local-finance-baseline.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const target={projectRef:'eomubndonbetszdbhsrj',transport:'session-pooler',host:'aws-0-ap-southeast-2.pooler.supabase.com',
  port:5432,database:'postgres',user:'postgres.eomubndonbetszdbhsrj',sslmode:'verify-full'};
function capture(pid=101){
  const inventory={capturedAt:new Date().toISOString(),database:'postgres',sessionUser:'postgres',readOnly:'on',ssl:true,
    address:'192.0.2.1',port:5432,clusterId:'1234567890123',backendPid:pid+10,
    inventory:[{name:'profiles',kind:'r'},{name:'probe',kind:'S'}]};
  const snapshot={...inventory,backendPid:pid,catalogDigest:'a'.repeat(64),
    tables:[{name:'profiles',rowCount:'3',rowDigest:'b'.repeat(64)}],sequences:[{name:'probe',lastValue:'1',isCalled:false}]};
  return {schemaVersion:1,kind:'public-finance-baseline',target:{...target},inventory,snapshot,clientsExitedCleanly:true,
    inventoryQuerySha256:prepareFinanceStagingInventory(target).querySha256,
    baselineQuerySha256:prepareFinanceStagingBaseline(target,inventory).querySha256};
}
const bytes=c=>Buffer.from(JSON.stringify(c));
const verify=c=>{const b=bytes(c);return verifyFinanceStagingBaselineCapture(b,hash(b));};
const compare=(a,b)=>{const x=bytes(a),y=bytes(b);return compareFinanceStagingBaselineCaptures(x,hash(x),y,hash(y));};
test('staging read-only plan reuses full public coverage without weakening local or write-target gates',()=>{
  const c=capture(),plan=prepareFinanceStagingBaseline(target,c.inventory);
  assert.equal(plan.readyToExecute,false);assert.equal(plan.remoteContact,false);
  assert.match(plan.sql,/standard_conforming_strings=on/);
  assert.match(plan.sql,/repeatable read read only/);assert.match(plan.sql,/row_security=off/);
  for(const token of ['pg_default_acl','pg_db_role_setting','pg_get_functiondef','pg_policies','pg_event_trigger',
    'pg_get_viewdef','is_called','catalogDigest','rowDigest','clusterId'])assert.ok(plan.sql.includes(token),token);
  assert.throws(()=>buildLocalBaselineSql(c.inventory),/Local inventory/);
  assert.throws(()=>verifyLocalBaseline(c.snapshot),/Incomplete local/);
  assert.doesNotMatch(plan.sql,/\b(?:insert|update|delete|nextval|setval)\s*\(/i);
});
test('offline complete matching baselines pass without claiming rollback or full managed-schema coverage',()=>{
  assert.equal(verify(capture()).captureIntegrityVerified,true);
  const result=compare(capture(),capture(102));assert.equal(result.unchanged,true);
  for(const key of ['remoteContact','remoteProvenanceIndependentlyVerified','fullManagedSchemaVerified',
    'rollbackVerified','readyForWriteRehearsal','applicationApproval'])assert.equal(result[key],false);
});
test('public row, catalog and nontransactional sequence drift cannot pass equality',()=>{
  for(const [field,mutate] of [['tables',c=>c.snapshot.tables[0].rowDigest='c'.repeat(64)],
    ['tables',c=>c.snapshot.tables[0].rowCount='4'],['catalogDigest',c=>c.snapshot.catalogDigest='d'.repeat(64)],
    ['sequences',c=>c.snapshot.sequences[0].isCalled=true],['sequences',c=>c.snapshot.sequences[0].lastValue='2']]){
    const a=capture(),b=capture(102);mutate(b);const result=compare(a,b);
    assert.equal(result.unchanged,false);assert.deepEqual(result.differences,[field]);
  }
});
test('exact staging transport required; no direct, other project, port fallback or arbitrary options',()=>{
  for(const change of [{projectRef:'other'},{host:'localhost'},{port:6543},{sslmode:'require'},
    {transport:'direct'},{user:'postgres'},{options:'extra'}]){
    assert.throws(()=>prepareFinanceStagingInventory({...target,...change}));
    assert.throws(()=>prepareFinanceStagingBaseline({...target,...change},capture().inventory));
  }
});
test('fresh identities and complete inventory required, no loopback or TLS bypass',()=>{
  for(const change of [{capturedAt:'2020-01-01T00:00:00Z'},{capturedAt:new Date(Date.now()+60000).toISOString()},
    {ssl:false},{readOnly:'off'},{address:'127.0.0.1'},{address:'::1'},{address:'hostname'},
    {sessionUser:'other'},{clusterId:123},{backendPid:0},{inventory:[]},
    {inventory:[{name:'external',kind:'f'}]},{inventory:[{name:'cached',kind:'m'}]},
    {inventory:[{name:'duplicate',kind:'r'},{name:'duplicate',kind:'r'}]}]){
    const c=capture();Object.assign(c.inventory,change);assert.throws(()=>verify(c));
  }
});
test('capture hash, query hashes, order, identity, closure and table coverage are enforced',()=>{
  const b=bytes(capture());assert.throws(()=>verifyFinanceStagingBaselineCapture(b,'0'.repeat(64)));
  for(const mutate of [c=>c.baselineQuerySha256='0'.repeat(64),c=>c.inventoryQuerySha256='0'.repeat(64),
    c=>c.clientsExitedCleanly=false,c=>c.snapshot.tables=[],c=>c.snapshot.sequences=[],
    c=>c.snapshot.clusterId='999',c=>c.snapshot.ssl=false,
    c=>c.inventory.capturedAt=new Date(Date.now()+5000).toISOString(),
    c=>c.snapshot.inventory=[...c.snapshot.inventory,{name:'new',kind:'r'}]]){
    const c=capture();mutate(c);assert.throws(()=>verify(c));
  }
  const bad=Buffer.from([255]);assert.throws(()=>verifyFinanceStagingBaselineCapture(bad,hash(bad)));
});
test('same backend, changed server and reversed before/after timestamps fail',()=>{
  assert.throws(()=>compare(capture(),capture()),/Independent/);
  const a=capture(),b=capture(102);b.inventory.clusterId=b.snapshot.clusterId='999';
  assert.throws(()=>compare(a,b),/Different/);
  const c=capture(102);c.inventory.capturedAt=c.snapshot.capturedAt=new Date(Date.now()-5000).toISOString();
  assert.throws(()=>compare(a,c),/ordering/);
});
test('generated SQL safely quotes unusual discovered names and exposes digests rather than rows',()=>{
  const c=capture();c.inventory.inventory=[{name:'odd"\'table',kind:'r'}];
  const {sql}=prepareFinanceStagingBaseline(target,c.inventory);
  assert.ok(sql.includes('public."odd""\'table"'));assert.ok(sql.includes("'odd\"''table'"));
  assert.match(sql,/count\(\*\)::text/);assert.match(sql,/encode\(sha256/);
  assert.doesNotMatch(sql,/pg_authid|rolpassword|auth\.users/);
});
