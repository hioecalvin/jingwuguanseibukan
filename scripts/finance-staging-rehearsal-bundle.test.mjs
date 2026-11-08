import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {prepareFinanceStagingRehearsalBundle,verifiedFinanceStagingSource} from './finance-staging-rehearsal-bundle.mjs';
import {prepareFinanceStagingRehearsalGuard} from './finance-staging-rehearsal-guard.mjs';
import {buildFinancePoolerMutationIdentitySql} from './finance-pooler-rehearsal.mjs';
import {reviewedMigrationBody,rollbackSentinelSql} from './finance-rehearsal-transaction.mjs';
import {stagingGuardFixture} from '../tests/fixtures/finance-staging-guard-evidence.mjs';
const paths={
  '059':'supabase/pending/059_advance_subscription_payment_records.sql',
  '060':'supabase/pending/060_selected_month_fee_adjustment.sql',
  fixture:'tests/sql/059_060_staging_fixture.sql',assertions:'tests/sql/059_060_staging_fixture_assertions.sql',
};
const read=k=>readFileSync(new URL('../'+paths[k],import.meta.url));
test('staging assembler fixes all component bytes and ordering, ending in abort without COMMIT',async()=>{
  const c=await stagingGuardFixture(),p=await prepareFinanceStagingRehearsalBundle(c);
  const g=await prepareFinanceStagingRehearsalGuard(c);
  const parts=[g.guardSql,buildFinancePoolerMutationIdentitySql(c.nonce),
    reviewedMigrationBody('059',read('059').toString()),reviewedMigrationBody('060',read('060').toString()),
    read('fixture').toString(),read('assertions').toString(),rollbackSentinelSql(c.nonce)];
  let end=0;
  for(const part of parts){const start=p.sql.indexOf(part,end);assert.ok(start>=end);end=start+part.length;}
  assert.equal(end,p.sql.length);assert.match(p.sql,/^begin read write;/);
  for(const setting of ["statement_timeout='15s'","lock_timeout='3s'",
    "idle_in_transaction_session_timeout='15s'",'plpgsql.check_asserts=on'])assert.ok(p.sql.includes(setting));
  assert.doesNotMatch(p.sql,/^\s*(commit|end transaction|rollback)\s*;/im);
  assert.doesNotMatch(p.sql,/059_rehearsal_fixture|10000000-0000-4000-8000-000000000004|synthetic-local-only/);
  assert.equal(p.sha256,createHash('sha256').update(p.sql).digest('hex'));
  for(const k of Object.keys(paths))assert.equal(p.componentSha256[k],createHash('sha256').update(read(k)).digest('hex'));
  assert.ok(Object.isFrozen(p)&&Object.isFrozen(p.componentSha256));
  assert.equal(p.completeBundle,true);assert.equal(p.readyToExecute,false);assert.equal(p.remoteContact,false);
});
test('all four pinned components reject one-byte changes and unknown kinds',()=>{
  for(const k of Object.keys(paths)){
    const bytes=read(k);assert.equal(verifiedFinanceStagingSource(k,bytes),bytes.toString());
    bytes[0]^=1;assert.throws(()=>verifiedFinanceStagingSource(k,bytes),/Unreviewed/);
  }
  assert.throws(()=>verifiedFinanceStagingSource('__proto__',Buffer.from('')));
  assert.throws(()=>verifiedFinanceStagingSource('fixture',read('fixture').toString()));
});
test('assembler refuses caller SQL, paths, framing, timeout and guard bypasses',async()=>{
  const c=await stagingGuardFixture();
  for(const extra of [{sql:'commit;'},{sourcePaths:paths},{framing:'begin;'},{timeoutMs:99999},
    {skipGuard:true},{target:{...c.target,projectRef:'wrong'}},{nonce:"';commit;--"},
    {baseline:{...c.baseline,hash:'0'.repeat(64)}}])
    await assert.rejects(prepareFinanceStagingRehearsalBundle({...c,...extra}));
});
test('assembler snapshots evidence and nonce across its asynchronous preparation',async()=>{
  const c=await stagingGuardFixture(),pending=prepareFinanceStagingRehearsalBundle(c);
  c.nonce='b'.repeat(32);c.baseline.bytes.fill(0);c.releaseEvidence.actors.bytes.fill(0);
  const p=await pending;assert.equal(p.nonce,'a'.repeat(32));
  assert.ok(p.sql.endsWith(rollbackSentinelSql('a'.repeat(32))));
});
