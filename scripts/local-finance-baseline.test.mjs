import test from 'node:test';
import assert from 'node:assert/strict';
import {buildLocalBaselineSql,verifyLocalBaseline,compareLocalBaselines} from './local-finance-baseline.mjs';
function baseline(pid=100) {
  return {address:'127.0.0.1',port:54321,database:'postgres',clusterId:'12345678901234567890',
    backendPid:pid,readOnly:'on',catalogDigest:'a'.repeat(64),
    inventory:[{name:'profiles',kind:'r'},{name:'probe',kind:'S'}],
    tables:[{name:'profiles',rowCount:'3',rowDigest:'b'.repeat(64)}],
    sequences:[{name:'probe',lastValue:'1',isCalled:false}]};
}
test('independent equal snapshots pass without claiming live acceptance',()=>{
  const result=compareLocalBaselines(baseline(),baseline(101));
  assert.equal(result.unchanged,true);assert.equal(result.liveAcceptance,false);
});
test('row content changes fail even when counts are unchanged',()=>{
  const after=baseline(101);after.tables[0].rowDigest='c'.repeat(64);
  assert.deepEqual(compareLocalBaselines(baseline(),after).differences,['tables']);
});
test('sequence is_called change fails even with identical last_value and table rows',()=>{
  const after=baseline(101);after.sequences[0].isCalled=true;
  assert.deepEqual(compareLocalBaselines(baseline(),after).differences,['sequences']);
});
test('catalog changes and new tables are not accepted as zero residue',()=>{
  const after=baseline(101);after.catalogDigest='c'.repeat(64);
  after.inventory.push({name:'unexpected',kind:'r'});
  after.tables.push({name:'unexpected',rowCount:'0',rowDigest:'d'.repeat(64)});
  assert.deepEqual(compareLocalBaselines(baseline(),after).differences,['inventory','catalogDigest','tables']);
});
test('same session, another target, write mode and incomplete baselines are refused',()=>{
  assert.throws(()=>compareLocalBaselines(baseline(),baseline()),/Independent/);
  for(const mutate of [b=>b.port++,b=>b.clusterId='987654321']) {
    const after=baseline(101);mutate(after);assert.throws(()=>compareLocalBaselines(baseline(),after),/Different/);
  }
  for(const mutate of [b=>b.readOnly='off',b=>b.address='example.com',b=>b.tables=[],
    b=>delete b.sequences,b=>b.tables[0].rowDigest='invalid',b=>b.sequences[0].lastValue=1]) {
    const b=baseline();mutate(b);assert.throws(()=>verifyLocalBaseline(b));
  }
});
test('SQL escapes catalog names and refuses duplicate/foreign inventory',()=>{
  const plan={address:'127.0.0.1',inventory:[{name:'odd"\'table',kind:'r'}]};
  const sql=buildLocalBaselineSql(plan);
  assert.ok(sql.includes('public."odd""\'table"'));
  assert.ok(sql.includes("'odd\"''table'"));
  assert.match(sql,/repeatable read read only/);
  assert.match(sql,/sha256/);
  assert.doesNotMatch(sql,/\b(?:insert|update|delete|nextval|setval)\s*\(/i);
  assert.throws(()=>buildLocalBaselineSql({...plan,inventory:[...plan.inventory,...plan.inventory]}));
  assert.throws(()=>buildLocalBaselineSql({...plan,inventory:[{name:'remote',kind:'f'}]}));
});

test('baseline captures view definitions, default ACLs, role settings and relation options',()=>{
  const sql=buildLocalBaselineSql(baseline());
  for(const token of ['pg_get_viewdef(c.oid,false)','pg_default_acl','pg_db_role_setting',
    'c.reloptions','c.relispartition','pg_inherits','rolconnlimit','rolvaliduntil'])assert.ok(sql.includes(token),token);
  assert.match(sql,/set local search_path=pg_catalog/);
  assert.match(sql,/set local timezone='UTC'/);
  assert.match(sql,/set local datestyle='ISO, YMD'/);
  assert.doesNotMatch(sql,/pg_authid|rolpassword/);
});
