import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=file=>readFileSync(new URL(file,import.meta.url),'utf8').replaceAll('\r\n','\n');
const writers=read('../tests/sql/059_captured_fixture_writers_local.sql');

test('local fixture uses exact reviewed captured normalizers and notification writer',()=>{
  const hashes={normalize_class_fields:'93fa6f5fce94b471f397fdcee4d26fc0c78d2ac976457fb5ebc31ac45217ad1f',
    normalize_dojo_fields:'4e14f4a24b00efe80f8670e806880cea6a392bdb30192ecba84610511fe28f7f',
    create_notification:'364d2fa1239e68d39f4cbcaf04bfd1a1fa189467a8d4d111eb9601d9aea0902b'};
  for(const [name,hash] of Object.entries(hashes)) {
    const start=writers.indexOf(`CREATE OR REPLACE FUNCTION public.${name}(`);
    assert.ok(start>=0);
    const end=writers.indexOf('$function$',writers.indexOf('$function$',start)+10)+10;
    assert.equal(createHash('sha256').update(writers.slice(start,end)+'\n').digest('hex'),hash);
  }
  assert.match(writers,/inet_server_addr\(\) is distinct from '127\.0\.0\.1'::inet/);
  assert.doesNotMatch(writers,/notify_dojo_admins\s*\(|queue_email\s*\(|nextval\s*\(|setval\s*\(|fixture.fail_notification|http_post|http_get/i);
  assert.match(writers,/revoke all on function public.create_notification[\s\S]+from public,anon,authenticated,service_role/);
});

test('fixture captures setup UUIDs and checks exact alert destinations, counts and semantics',()=>{
  const fixture=read('../tests/sql/059_rehearsal_fixture.sql');
  const assertions=read('../tests/sql/059_rehearsal_fixture_assertions.sql');
  for(const key of ['assignmentA','settingA','settingB'])assert.ok(fixture.includes(`'${key}'`));
  assert.doesNotMatch(fixture,/values\(gen_random_uuid\(\)/);
  for(const marker of ['Exactly five captured-writer notifications','Pending alerts ask only the assigned Admin to confirm receipt',
    'Receipt alerts reference only the two paid fixture bills','Waiver alert references only the waived fixture bill',
    'Captured class name normalization','Captured dojo name normalization','Existing legacy outbox preserved',
    'Outbox sequence untouched'])assert.ok(assertions.includes(marker),marker);
});

test('captured writers are installed inside rollback fixture setup, not broad failure-injection tranches',()=>{
  const runner=read('./test-advance-payment-local.mjs');
  const setup=runner.indexOf('const fixtureSetup=');
  const loaded=runner.indexOf("read('tests/sql/059_captured_fixture_writers_local.sql')");
  const fixture=runner.indexOf('const fixtureSql=');
  assert.ok(setup<loaded&&loaded<fixture);
  assert.ok(runner.includes("const fixtureSql=['begin;',fixtureSetup"));
});
