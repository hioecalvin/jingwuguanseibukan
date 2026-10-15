import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reviewedMigrationBody,rollbackSentinelSql,isExpectedRollback} from './finance-rehearsal-transaction.mjs';
const files={'059':'059_advance_subscription_payment_records.sql','060':'060_selected_month_fee_adjustment.sql'};
const nonce='a'.repeat(32);
test('only pinned candidate bytes lose their outer transaction envelope',()=>{
  for(const [version,file] of Object.entries(files)) {
    const source=readFileSync(new URL(`../supabase/pending/${file}`,import.meta.url),'utf8');
    const body=reviewedMigrationBody(version,source);
    assert.doesNotMatch(body,/^begin;/i);assert.doesNotMatch(body,/commit;\s*$/i);
    assert.match(body,/create (?:or replace )?function/i);
    assert.match(body,/notify pgrst/);
    assert.throws(()=>reviewedMigrationBody(version,source+'\n-- unreviewed'),/Unreviewed/);
    assert.throws(()=>reviewedMigrationBody(version,source.replace('begin;','commit;')),/Unreviewed/);
  }
  assert.throws(()=>reviewedMigrationBody('058','begin;commit;'));
});
test('sentinel forces constraints and raises a nonce-bound exception without commit',()=>{
  const sql=rollbackSentinelSql(nonce);
  assert.match(sql,/set constraints all immediate/);assert.match(sql,/errcode='Z0590'/);
  assert.doesNotMatch(sql,/\bcommit\b/i);
  assert.throws(()=>rollbackSentinelSql("';commit;--"));
});
test('only exact expected SQLSTATE, nonce, single error and psql exit are accepted',()=>{
  const valid={status:3,stderr:`ERROR:  Z0590: JWG_FINANCE_ROLLBACK_${nonce}\nCONTEXT: safe local fixture`};
  assert.equal(isExpectedRollback(valid,nonce),true);
  for(const result of [{...valid,status:0},{...valid,error:new Error('timeout')},
    {...valid,stderr:valid.stderr+'\nERROR: another error'},
    {...valid,stderr:valid.stderr.replace('Z0590','XX000')},
    {...valid,stderr:'NOTICE: '+valid.stderr},{...valid,stderr:valid.stderr.replace(nonce,'b'.repeat(32))}]) {
    assert.equal(isExpectedRollback(result,nonce),false);
  }
});
