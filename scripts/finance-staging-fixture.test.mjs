import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=name=>readFileSync(new URL('../tests/sql/'+name,import.meta.url),'utf8');
test('separate staging fixture preserves local-only source files and does not introduce account/schema/sequence mutations',()=>{
  for(const [name,digest] of [['059_rehearsal_fixture.sql','6d8aa3ed9bcce8120e2b247f85cb83100c0657dceaaa2b76d48bc33a45d93b8a'],
    ['059_rehearsal_fixture_assertions.sql','f0751c674cb276bf60f2abd2bf631620a8bffc4595a8934718c6424a866dc46c']])
    assert.equal(createHash('sha256').update(read(name)).digest('hex'),digest);
  const sql=read('059_060_staging_fixture.sql')+read('059_060_staging_fixture_assertions.sql');
  assert.doesNotMatch(sql,/10000000-0000-4000-8000-000000000004|synthetic-local-only|\b(nextval|setval)\s*\(/i);
  assert.doesNotMatch(sql,/\b(insert into|update|delete from)\s+(auth\.|public\.profiles\b)/i);
  assert.doesNotMatch(sql,/\b(update|delete from)\s+public\.(class_memberships|dojo_admin_assignments)\b/i);
  assert.doesNotMatch(sql,/\bcreate\s+(?:or replace\s+)?(function|trigger|policy|schema)\b|\bcommit\s*;/i);
  assert.doesNotMatch(sql,/\b(system_generate_monthly_subscriptions|generate_dojo_monthly_subscription_charges)\s*\(/i);
});
test('staging fixture requires and consumes transaction-local nonce ticket, scopes inserts and keeps baseline private',()=>{
  const sql=read('059_060_staging_fixture.sql');
  assert.ok(sql.indexOf('JWG_STAGING_FIXTURE_GUARD_REJECTED')<sql.indexOf('create temporary table'));
  assert.match(sql,/set_config\('jwg\.staging_fixture_ticket','',true\)/);
  for(const value of ['0101','0002','0001','registration_number','plpgsql.check_asserts','transaction_read_only'])assert.ok(sql.includes(value));
  assert.match(sql,/grant select on pg_temp.finance_staging_fixture to authenticated/);
  assert.doesNotMatch(sql,/grant[^;]*finance_staging_baseline/i);
  assert.equal((sql.match(/create temporary table/g)||[]).length,2);
  const targets=[...sql.matchAll(/insert into public\.([a-z_]+)/g)].map(m=>m[1]);
  assert.deepEqual(targets,['classes','dojos','class_memberships','dojo_admin_assignments','dojo_subscription_settings','membership_subscription_charges']);
});
test('staging assertions cover pending-before-receipt, three role boundaries, retained debt and original record baselines',()=>{
  const sql=read('059_060_staging_fixture_assertions.sql');
  for(const part of ['No receipt before confirmation','Two pending months','Skipped debt preserved','Member receipt bypass',
    'Cross-dojo quote bypass','Direct financial update permitted','Missing claims denied','All profiles unchanged',
    'All original memberships unchanged','All original assignments unchanged','Status sequence unchanged','Outbox sequence unchanged',
    'Original notifications unchanged','No unrelated notification recipients'])assert.ok(sql.includes(part),part);
  assert.match(sql,/exception when insufficient_privilege then null/);
  assert.ok(sql.indexOf('No receipt before confirmation')<sql.indexOf("'Assigned Admin confirms both months'"));
});
