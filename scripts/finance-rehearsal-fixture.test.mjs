import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL(`../tests/sql/${name}`,import.meta.url),'utf8');
const fixture=read('059_rehearsal_fixture.sql');
const assertions=read('059_rehearsal_fixture_assertions.sql');
test('rehearsal fixture refuses remote execution and requires three eligible distinct actors',()=>{
  assert.match(fixture,/inet_server_addr\(\) is distinct from '127\.0\.0\.1'::inet/);
  assert.match(fixture,/jwg\.fixture_context[\s\S]*synthetic-local-only/);
  assert.match(fixture,/member_id=admin_id or member_id=super_id or admin_id=super_id/);
  assert.match(fixture,/account_status::text='active' and date_of_passing is null/);
  assert.match(fixture,/is_super_admin=\(id=super_id\)/);
});
test('fixture writes only isolated new business rows and no account or membership updates',()=>{
  const targets=[...fixture.matchAll(/insert into public\.([a-z_]+)/g)].map(m=>m[1]);
  assert.deepEqual(targets,['classes','dojos','class_memberships','dojo_admin_assignments',
    'dojo_subscription_settings','membership_subscription_charges']);
  assert.doesNotMatch(fixture,/\b(?:update|delete from|truncate)\s+public\.|insert into auth\.|alter table|disable trigger|setval\s*\(/i);
  assert.match(fixture,/gen_random_uuid\(\)/);
  assert.match(fixture,/on commit drop/);
});
test('fixture acceptance uses authenticated role and verifies pending, waiver, skipped debt and actor preservation',()=>{
  assert.match(assertions,/set local role authenticated/);
  for(const requirement of ['Member waiver bypass','Cross-dojo quote bypass','Member receipt bypass',
    'Both reported months confirmed together','Actor profiles unchanged','Status sequence untouched','Outbox sequence untouched']) {
    assert.ok(assertions.includes(requirement),requirement);
  }
  assert.match(assertions,/status='pending'/);
  assert.match(assertions,/status='waived' and amount=0/);
  assert.match(assertions,/status='unpaid' and amount=300000/);
  assert.match(assertions,/set constraints all immediate/);
});
test('sequence negative control is local-only and never resets a sequence',()=>{
  const negative=read('059_rehearsal_sequence_negative.sql');
  assert.match(negative,/inet_server_addr\(\) is distinct from '127\.0\.0\.1'::inet/);
  assert.match(negative,/exception when sqlstate 'Z0591'/);
  assert.match(negative,/Guard detects surviving audit identity advance/);
  assert.match(negative,/Guard detects surviving outbox identity advance/);
  assert.doesNotMatch(negative,/setval\s*\(|restart\s+(?:with|identity)/i);
});
test('fixture compares existing history, outbox and sequence baselines and confines recipients',()=>{
  assert.match(fixture,/create temporary table finance_fixture_baseline on commit drop/);
  assert.match(fixture,/jsonb_build_array\(last_value::text,is_called\)/);
  assert.match(assertions,/Existing status audit preserved/);
  assert.match(assertions,/Existing legacy outbox preserved/);
  assert.match(assertions,/Existing notifications preserved/);
  assert.match(assertions,/No notifications for unrelated recipients/);
  assert.doesNotMatch(assertions,/assert not \(select is_called/);
});
