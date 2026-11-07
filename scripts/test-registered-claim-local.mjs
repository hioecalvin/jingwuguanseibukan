// Synthetic loopback-only PostgreSQL acceptance; no credentials or providers.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, openSync, closeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
const bin = process.argv[2];
if (!bin) throw new Error('Pass local PostgreSQL 17 bin directory');
const repo = fileURLToPath(new URL('../', import.meta.url));
const root = mkdtempSync(join(tmpdir(), 'jwg-registered-claim-'));
const data = join(root, 'data');
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^(PG|SUPABASE|DATABASE|RESEND|MUX|EMAIL|PUSH|SECURITY_TEST)/i.test(k)));
const binary = name => join(resolve(bin), name + (process.platform === 'win32' ? '.exe' : ''));
function run(name, args, input) {
  const fd = name === 'pg_ctl' ? openSync(join(root, 'control.log'), 'a') : null;
  try {
    const p = spawnSync(binary(name), args, { env, input, encoding: 'utf8', windowsHide: true,
      timeout: 45000, ...(fd === null ? {} : { stdio: ['ignore', fd, fd] }) });
    if (p.error || p.status !== 0) throw Error(`${name}: ${p.stderr || p.error || 'See local log'}`);
    return p.stdout ?? '';
  } finally { if (fd !== null) closeSync(fd); }
}
assert.match(run('postgres', ['--version']), /PostgreSQL\) 17\./);
const port = await new Promise((res, rej) => {
  const s = createServer(); s.once('error', rej); s.listen(0, '127.0.0.1', () => {
    const p = s.address().port; s.close(error => error ? rej(error) : res(p));
  });
});
let attempted = false, stopped = false, passed = false, checks = 0;
try {
  run('initdb', ['-D', data, '--username=fixture_owner', '--auth-local=trust', '--auth-host=trust', '--no-locale', '-E', 'UTF8']);
  attempted = true;
  run('pg_ctl', ['-D', data, '-l', join(root, 'server.log'), '-o', `-h 127.0.0.1 -p ${port}`, '-w', '-t', '30', 'start']);
  const args = ['-X', '-w', '-qAt', '-h', '127.0.0.1', '-p', String(port), '-U', 'fixture_owner', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'];
  const q = input => run('psql', args, input).trim();
  assert.equal(resolve(q('show data_directory;')).toLowerCase(), resolve(data).toLowerCase());
  q(`create role anon; create role authenticated; create role service_role;
    create table public.profiles(id uuid primary key,registration_number text,email text,date_of_birth date,
      member_origin text default 'import',auth_user_id uuid,account_status text default 'active',date_of_passing date,
      is_super_admin boolean default false,is_grading_assessor boolean default false);
    create table public.captured_claims(member_id text,email text,proof text,origin text);
    create function public.request_member_claim(text,text,text,text) returns void language sql as
      'insert into public.captured_claims values($1,$2,$3,$4)';
    revoke all on function public.request_member_claim(text,text,text,text) from public;
    insert into public.profiles(id,registration_number,email,date_of_birth)
      values('00000000-0000-4000-8000-000000000001','JS-TEST','Member@Example.invalid','1996-11-14');`);
  q(readFileSync(join(repo,'supabase/pending/066_registered_email_dob_claim.sql'),'utf8'));
  const call=(email="'member@example.invalid'",dob="'1996-11-14'")=>
    `select public.request_registered_member_claim(${email},${dob},'synthetic-proof','https://example.invalid');`;
  q(`set role service_role; ${call("' MEMBER@EXAMPLE.INVALID '")}`);
  assert.equal(q('select member_id||\'|\'||email from captured_claims;'),'JS-TEST|member@example.invalid');checks++;
  q('truncate captured_claims;');
  for(const [email,dob] of [["'wrong@example.invalid'","'1996-11-14'"],["'member@example.invalid'","'1996-11-15'"],['null',"'1996-11-14'"],["'member@example.invalid'",'null'],["'member@example.invalid'","'2999-01-01'"],["'member@example.invalid'","'-infinity'"],["'bad'","'1996-11-14'"]]){
    q(call(email,dob));assert.equal(q('select count(*) from captured_claims;'),'0');checks++;
  }
  const changes=["email=null","date_of_birth=null","member_origin='registration'","member_origin=null",
    "auth_user_id=id","account_status='disabled'","account_status=null","date_of_passing=current_date",
    "is_super_admin=true","is_super_admin=null","is_grading_assessor=true","is_grading_assessor=null"];
  for(const change of changes){
    assert.equal(q(`begin; update profiles set ${change}; ${call()} select count(*) from captured_claims; rollback;`),'0',change);checks++;
  }
  assert.equal(q(`begin; insert into profiles select '00000000-0000-4000-8000-000000000002','JS-OTHER',email,date_of_birth,member_origin,auth_user_id,account_status,date_of_passing,is_super_admin,is_grading_assessor from profiles;
    ${call()} select count(*) from captured_claims; rollback;`),'0');checks++;
  for(const role of ['anon','authenticated']){
    assert.throws(()=>q(`set role ${role}; ${call()}`),/permission denied/);checks++;
  }
  assert.equal(q("select prosecdef and proconfig @> array['search_path=pg_catalog'] from pg_proc where oid='public.request_registered_member_claim(text,date,text,text)'::regprocedure;"),'t');checks++;
  assert.equal(q('select count(*) from profiles;'),'1');
  assert.equal(q('select count(*) from captured_claims;'),'0');checks++;
  passed = true;
} finally {
  if (attempted) { run('pg_ctl', ['-D', data, '-m', 'fast', '-w', '-t', '30', 'stop']); stopped = true; }
  const result = { passed, stopped, checks, localOnly: true, evidenceDirectory: root };
  writeFileSync(join(root, 'result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
}
