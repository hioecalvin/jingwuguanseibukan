import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL(name,import.meta.url),'utf8');
test('finance runner loads captured Auth semantics before payment functions',()=>{
  const runner=read('./test-advance-payment-local.mjs');
  assert.ok(runner.indexOf("read('tests/sql/059_captured_auth_helpers_local.sql')")<runner.indexOf("definition('supabase/migrations/007_member_payment_confirmation.sql'"));
  const helpers=read('../tests/sql/059_captured_auth_helpers_local.sql');
  assert.match(helpers,/current_setting\('request.jwt.claim.role', true\)/);
  assert.match(helpers,/current_setting\('request.jwt.claims', true\)/);
  assert.doesNotMatch(helpers,/select 'authenticated'|insert into|update |delete from|auth\.users/i);
});
test('local Auth compatibility assertions cover missing, scalar and JSON claims',()=>{
  const sql=read('../tests/sql/059_auth_helper_assertions.sql');
  for(const label of ['No fabricated identity/role','JSON subject fallback','JSON role fallback',
    'Scalar subject precedence','Singular claims precedence','Invalid UUID accepted'])assert.ok(sql.includes(label),label);
  assert.match(sql,/exception when invalid_text_representation/);
  assert.match(sql,/set local role authenticated/);
});
