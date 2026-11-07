import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=file=>readFileSync(new URL(file,import.meta.url),'utf8').replaceAll('\r\n','\n');
const fixture=read('../tests/sql/059_captured_rls_local.sql');
const hash=text=>createHash('sha256').update(text).digest('hex');

test('local RLS helper definitions match the reviewed capture, in dependency order',()=>{
  const hashes={is_super_admin:'1cfa723f121a012706b9c88ceb68f393371a98c3b20810cdcfd50a59dd4b3b63',
    is_active_app_user:'c15dd342f24fd29eef4de4754024239214e387dcf69422ad0fc4a41e1dbdd39a',
    is_class_admin:'f34326e10a54d5e2108b50c0a34069195edeac6a95ff95e33d65ff97006a186a'};
  for(const [name,expected] of Object.entries(hashes)) {
    const start=fixture.indexOf(`CREATE OR REPLACE FUNCTION public.${name}(`);
    assert.ok(start>=0);
    const end=fixture.indexOf('$function$',fixture.indexOf('$function$',start)+10)+10;
    assert.equal(hash(fixture.slice(start,end)+'\n'),expected);
  }
  assert.ok(fixture.indexOf('FUNCTION public.is_super_admin(')<fixture.indexOf('FUNCTION public.is_class_admin('));
});

test('nine captured SELECT policies have exact reviewed bytes and only synthetic SELECT grants',()=>{
  assert.equal(hash(fixture.slice(fixture.indexOf('create policy')).trim()),
    '5b470a1ad40bdc92e9a260189bfbfa2cb1e1af22992e3c7289de784ffffa939d');
  assert.equal([...fixture.matchAll(/create policy /g)].length,9);
  assert.equal([...fixture.matchAll(/enable row level security/g)].length,6);
  const grants=[...fixture.matchAll(/grant ([^;]+);/g)].map(match=>match[1]);
  assert.equal(grants.length,6);
  for(const grant of grants)assert.match(grant,/^select on public\.[a-z_]+ to authenticated$/);
  assert.match(fixture,/inet_server_addr\(\) is distinct from '127\.0\.0\.1'::inet/);
  assert.doesNotMatch(fixture,/disable row level|bypassrls|create extension|http_post/i);
});

test('direct RLS acceptance has role boundaries and keeps the fourth synthetic actor local-only',()=>{
  const assertions=read('../tests/sql/059_rehearsal_fixture_assertions.sql');
  for(const label of ['Member reads own memberships only','Member cannot read Admin private profile',
    'Admin cannot read other dojo membership','Unassigned actor cannot read charges',
    'Unassigned actor cannot read receipts','Unassigned actor cannot read fee audit',
    'Super Admin reads both fixture dojos','Missing claims do not grant private reads',
    'Direct financial update permitted'])assert.ok(assertions.includes(label),label);
  assert.match(assertions,/inet_server_addr\(\) is distinct from '127\.0\.0\.1'::inet/);
  assert.match(assertions,/Fourth synthetic actor and claims are LOCAL ONLY/);
  assert.match(assertions,/exception when insufficient_privilege then null/);
  const runner=read('./test-advance-payment-local.mjs');
  assert.ok(runner.includes("read('tests/sql/059_captured_rls_local.sql')"));
});
