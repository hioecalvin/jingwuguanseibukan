import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {prepareFinanceStagingRehearsalGuard} from './finance-staging-rehearsal-guard.mjs';
import {pack} from '../tests/fixtures/finance-release-evidence.mjs';
import {stagingGuardFixture} from '../tests/fixtures/finance-staging-guard-evidence.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
test('staging pre-work guard binds current server, nonce and exact three-account content without producing an executable bundle',async()=>{
  const c=await stagingGuardFixture(),plan=await prepareFinanceStagingRehearsalGuard(c);
  assert.equal(plan.readyToExecute,false);assert.equal(plan.completeBundle,false);assert.equal(plan.remoteContact,false);
  assert.equal(hash(plan.guardSql),plan.guardSha256);
  for(const part of ['pg_control_system()','pg_stat_ssl','current_user','transaction_read_only',
    "interval '5 minutes'","actual->'actors' is distinct from expected->'actors'",'JWG_STAGING_GUARD_REJECTED',
    'JWG_STAGING_ACTORS_CHANGED',"set local application_name='jwg-finance-rehearsal-"+c.nonce])assert.ok(plan.guardSql.includes(part));
  assert.doesNotMatch(plan.guardSql,/\b(insert into|update public|delete from|create table|create function|nextval|set role|reset role)\b/i);
  assert.doesNotMatch(plan.guardSql,/10000000-0000-4000-8000-000000000004|synthetic-local-only/);
  assert.ok(plan.guardSql.indexOf('JWG_STAGING_GUARD_REJECTED')<plan.guardSql.indexOf('from public.profiles'));
});
test('staging guard refuses target/nonce/SQL overrides and stale or changed evidence',async()=>{
  const c=await stagingGuardFixture();
  for(const extra of [{target:{...c.target,port:6543}},{nonce:"';select 1;--"},{sql:'select 1'},{localProbe:true},
    {baseline:{...c.baseline,hash:'0'.repeat(64)}},{releaseEvidence:{...c.releaseEvidence,actors:pack({})}}])
    await assert.rejects(prepareFinanceStagingRehearsalGuard({...c,...extra}));
  const actor=JSON.parse(c.releaseEvidence.actors.bytes);actor.snapshot.capturedAt='2020-01-01T00:00:00Z';
  await assert.rejects(prepareFinanceStagingRehearsalGuard({...c,releaseEvidence:{...c.releaseEvidence,actors:pack(actor)}}));
});
test('staging guard copies evidence and nonce before async validation',async()=>{
  const c=await stagingGuardFixture(),pending=prepareFinanceStagingRehearsalGuard(c);
  c.nonce='b'.repeat(32);c.releaseEvidence.actors.bytes.fill(0);c.baseline.bytes.fill(0);
  const plan=await pending;assert.equal(plan.nonce,'a'.repeat(32));assert.match(plan.guardSql,/profileDigest/);
});
