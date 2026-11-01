import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { transform } from 'esbuild';

const source = await readFile(new URL('../lib/member-directory.ts', import.meta.url), 'utf8');
const { code } = await transform(source, { loader: 'ts', format: 'esm' });
const { directoryRows, instagramProfile } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const sql = await readFile(new URL('../supabase/migrations/057_organisation_member_directory.sql', import.meta.url), 'utf8');
const person = (name, enrollments) => ({ full_name: name, avatar_url: null, instagram_username: null,
  enrollments: enrollments.map(([class_name, home_dojo]) => ({ class_name, home_dojo, current_rank: null })) });
const people = [person('Zoe', [['Aikido', 'West'], ['Karate', 'East']]), person('Amy', [['Karate', 'East']]), person('Amy', [['Aikido', 'North']])];

test('directory groups enrolments without merging namesakes, mutating data or duplicating a person', () => {
  const original = JSON.stringify(people);
  const rows = directoryRows(people, '', '', 'name');
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map(row => row.member.full_name), ['Amy', 'Amy', 'Zoe']);
  assert.equal(rows[2].enrollments.length, 2);
  assert.equal(JSON.stringify(people), original);
});
test('class and dojo filters must match the same enrolment', () => {
  assert.equal(directoryRows(people, 'Aikido', 'East', 'class').length, 0);
  const rows = directoryRows(people, 'Karate', 'East', 'name');
  assert.equal(rows.length, 2);
  assert.equal(rows[1].enrollments.length, 2);
});
test('directory supports class-dojo, dojo-class and alphabetical sorting', () => {
  assert.deepEqual(directoryRows(people, '', '', 'class').map(row => row.index), [2, 0, 1]);
  assert.deepEqual(directoryRows(people, '', '', 'dojo').map(row => row.index), [1, 0, 2]);
  assert.deepEqual(directoryRows(people, '', '', 'name').map(row => row.index), [1, 2, 0]);
});
test('Instagram links accept handles only, never arbitrary URL/protocol input', () => {
  assert.equal(instagramProfile(' @js.member ')?.href, 'https://www.instagram.com/js.member/');
  for (const invalid of [null, '', 'javascript:alert(1)', 'https://evil.invalid', 'x/y', 'x?y', 'a'.repeat(31)]) {
    assert.equal(instagramProfile(invalid), null);
  }
});
test('v2 draft is authenticated, narrow, read-only and additive', () => {
  assert.match(sql, /security definer\s+set search_path to public, pg_temp/i);
  assert.match(sql, /caller_id is null/);
  assert.match(sql, /not public\.is_active_app_user\(caller_id\)/);
  assert.match(sql, /profile\.date_of_passing is null/);
  assert.match(sql, /profile\.account_status::text = 'active'/);
  assert.match(sql, /membership\.status::text in \('active', 'break', 'break_1', 'break_2'\)/);
  assert.match(sql, /class_data\.is_active = true/);
  assert.match(sql, /group by profile\.id/);
  assert.match(sql, /revoke all on function[\s\S]+from public, anon, authenticated, service_role/);
  assert.match(sql, /grant execute on function public\.get_my_member_directory_v2\(\) to authenticated/);
  assert.doesNotMatch(sql, /caller_membership|create policy|alter table|drop function|insert into|delete from|update public\./i);
  const signature = sql.match(/returns table \(([\s\S]*?)\)/)[1];
  assert.deepEqual(signature.trim().split(/,\s*/).map(field => field.trim()),
    ['full_name text', 'avatar_url text', 'enrollments jsonb', 'instagram_username text']);
  const projection = sql.match(/jsonb_build_object\(([\s\S]*?)\) order by/)[1];
  assert.doesNotMatch(projection, /email|phone|date_of_birth|registration_number|profile\.id|payment|attendance/i);
  for (const key of ['class_name', 'home_dojo', 'current_rank']) assert.ok(projection.includes(`'${key}'`));
});
