import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm,stat,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {prepareFinancePoolerLaunchPlan} from './finance-pooler-launch-plan.mjs';
import {financeReadOnlyStagingTarget} from './finance-staging-baseline.mjs';
const windows=process.platform==='win32';
const file=x=>fileURLToPath(new URL('../tests/fixtures/'+x,import.meta.url));
const hash=x=>createHash('sha256').update(x).digest('hex');
function run(script,args,input){return spawnSync(path.join(process.env.SystemRoot,'System32','WindowsPowerShell','v1.0','powershell.exe'),
  ['-NoProfile','-NonInteractive','-File',script,...args],{windowsHide:true,encoding:'utf8',timeout:45000,input,
    env:{...process.env,PGPASSWORD:'UNTRUSTED-PARENT',PGHOSTADDR:'127.0.0.1',PGSERVICE:'wrong',
      PGPASSFILE:'wrong',NODE_OPTIONS:'unsafe',SUPABASE_SECRET_KEY:'UNTRUSTED-PARENT'}});}
async function setup(t,variant='valid'){
  const root=await mkdtemp(path.join(tmpdir(),'finance-acl-test-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  const create=run(file('finance-credential-setup.ps1'),['-Directory',root,'-Variant',variant]);assert.equal(create.status,0,create.stderr);
  const compile=run(file('finance-protected-pooler-probe.ps1'),['-Mode','setup','-Directory',root]);assert.equal(compile.status,0,compile.stderr);
  const credential=path.join(root,'synthetic.credential.xml'),client=path.join(root,'protected-inert.exe'),ca=path.join(root,'inert-ca.crt');
  await writeFile(ca,'NOT-A-CERTIFICATE');const bytes=Buffer.from('-- INERT ONLY 精武館\r\n');
  const config={Purpose:'rollback-rehearsal',CredentialPath:credential,CredentialSha256:hash(await readFile(credential)),
    ClientPath:client,ClientSha256:hash(await readFile(client)),RootCertificatePath:ca,RootCertificateSha256:hash(await readFile(ca)),
    InputBase64:bytes.toString('base64'),InputSha256:hash(bytes)};
  return {root,config,call:(c=config,mode='run')=>run(file('finance-protected-pooler-probe.ps1'),['-Mode',mode],JSON.stringify(c))};
}
async function stopped(root,count){
  const pids=(await readFile(path.join(root,'started.txt'),'utf8')).trim().split('\n').map(Number);
  assert.equal(pids.length,count);for(const pid of pids)assert.throws(()=>process.kill(pid,0),{code:'ESRCH'});
}
test('pinned DPAPI loader verifies fake credential without disclosing it',{skip:!windows},async t=>{
  const f=await setup(t),r=f.call(f.config,'credential');assert.equal(r.status,0,r.stderr);
  assert.equal(r.stdout,'SYNTHETIC_CREDENTIAL_VERIFIED');
  assert.doesNotMatch(await readFile(f.config.CredentialPath,'utf8'),/SYNTHETIC-NOT-A-LIVE-PASSWORD/);
  await assert.rejects(stat(path.join(f.root,'started.txt')),{code:'ENOENT'});
});

test('pinned credential supports the existing writer createdUtc metadata without changing bytes or starting a child',{skip:!windows},async t=>{
  const f=await setup(t,'created-utc'),before=await readFile(f.config.CredentialPath);
  const r=f.call(f.config,'credential');assert.equal(r.status,0,r.stderr);
  assert.equal(r.stdout,'SYNTHETIC_CREDENTIAL_VERIFIED');
  assert.deepEqual(await readFile(f.config.CredentialPath),before);
  await assert.rejects(stat(path.join(f.root,'started.txt')),{code:'ENOENT'});
});

test('creation metadata cannot admit malformed timestamps, unexpected keys or wrong staging binding',{skip:!windows},async t=>{
  for(const variant of ['created-invalid','created-number','created-extra','created-wrong-target']){
    const f=await setup(t,variant),r=f.call();assert.equal(r.status,0,r.stderr);
    assert.equal(JSON.parse(r.stdout).error,'CREDENTIAL_INVALID');
    await assert.rejects(stat(path.join(f.root,'started.txt')),{code:'ENOENT'});
  }
});
test('protected child transport matches the offline plans in both modes and keeps fake secret child-only',{skip:!windows},async t=>{
  const f=await setup(t);
  for(const purpose of ['rollback-rehearsal','read-only-evidence']){
    const p=await prepareFinancePoolerLaunchPlan({target:financeReadOnlyStagingTarget(),purpose,
      psqlPath:f.config.ClientPath,psqlSha256:f.config.ClientSha256,rootCertPath:f.config.RootCertificatePath,
      rootCertSha256:f.config.RootCertificateSha256,ambientEnv:{}});
    const r=f.call({...f.config,Purpose:purpose});assert.equal(r.status,0,r.stderr);const out=JSON.parse(r.stdout);
    assert.equal(out.status,0,JSON.stringify(out));assert.equal(out.error,null);assert.equal(out.clientClosed,true);assert.equal(out.inputWritten,true);
    assert.equal(out.inputSha256,f.config.InputSha256);assert.match(out.stdout,/CREDENTIAL_VALID/);
    for(const arg of p.args)assert.ok(out.stdout.includes('ARG='+arg+'\r\n'));
    for(const key of ['PGSSLMODE','PGSSLROOTCERT','PGOPTIONS','PGAPPNAME','PGCLIENTENCODING'])
      assert.ok(out.stdout.includes(key+'='+p.env[key]+'\r\n'));
    assert.doesNotMatch(r.stdout+r.stderr,/SYNTHETIC-NOT-A-LIVE-PASSWORD|UNTRUSTED-PARENT/);
  }
  await stopped(f.root,2);
  // Held resource handles must be released after both success and failure.
  await writeFile(f.config.RootCertificatePath,'NOT-A-CERTIFICATE');
});
test('expected rollback exit remains evidence for controller, not transport success verdict',{skip:!windows},async t=>{
  const f=await setup(t),input=Buffer.from('rollback');
  const r=f.call({...f.config,InputBase64:input.toString('base64'),InputSha256:hash(input)});
  assert.equal(r.status,0);const out=JSON.parse(r.stdout);assert.equal(out.status,3);assert.equal(out.error,null);
  assert.match(out.stderr,/ERROR:  Z0590:/);assert.equal(Object.hasOwn(out,'verified'),false);await stopped(f.root,1);
});

test('staging application transport is fixed-target, bounded, private and does not claim commit success',{skip:!windows},async t=>{
  const f=await setup(t),r=f.call({...f.config,Purpose:'staging-application'});
  assert.equal(r.status,0,r.stderr);const out=JSON.parse(r.stdout);
  assert.equal(out.status,0);assert.equal(out.clientClosed,true);assert.equal(out.error,null);
  assert.match(out.stdout,/PGAPPNAME=jwg-finance-staging-application/);
  assert.match(out.stdout,/default_transaction_read_only=off/);
  assert.match(out.stdout,/VERBOSITY=verbose/);
  assert.equal(Object.hasOwn(out,'committed'),false);await stopped(f.root,1);
});
test('wrong bindings, broadened ACL, changed hashes and malformed input never start a child',{skip:!windows},async t=>{
  for(const variant of ['wrong-target','wrong-sid','empty']){
    const f=await setup(t,variant);const r=f.call();assert.equal(JSON.parse(r.stdout).error,'CREDENTIAL_INVALID');
    await assert.rejects(stat(path.join(f.root,'started.txt')),{code:'ENOENT'});
  }
  const f=await setup(t);
  for(const change of [{CredentialSha256:'0'.repeat(64)},{ClientSha256:'0'.repeat(64)},
    {RootCertificateSha256:'0'.repeat(64)},{InputSha256:'0'.repeat(64)},
    {InputBase64:Buffer.from([255]).toString('base64'),InputSha256:hash(Buffer.from([255]))}]){
    const r=f.call({...f.config,...change});assert.equal(r.status,0,r.stderr);
    assert.ok(['CREDENTIAL_INVALID','CLIENT_RESOURCE_INVALID','CA_RESOURCE_INVALID','INPUT_INVALID'].includes(JSON.parse(r.stdout).error));
  }
  for(const bytes of [Buffer.from('\uFEFFselect 1;'),Buffer.from('select\0 1;'),Buffer.from([255])]){
    const r=f.call({...f.config,InputBase64:bytes.toString('base64'),InputSha256:hash(bytes)});
    assert.equal(JSON.parse(r.stdout).error,'INPUT_INVALID');
  }
  for(const change of [{Purpose:'apply'},{Host:'other'},{Password:'SYNTHETIC'}]){
    const r=f.call({...f.config,...change});assert.equal(r.status,1);assert.equal(r.stdout,'');
    assert.equal(r.stderr,'SYNTHETIC_PROBE_REJECTED');
  }
  const broaden=run(file('finance-private-directory-setup.ps1'),['-Directory',f.root,'-ExtraReader']);assert.equal(broaden.status,0);
  assert.equal(JSON.parse(f.call().stdout).error,'CREDENTIAL_INVALID');
  await assert.rejects(stat(path.join(f.root,'started.txt')),{code:'ENOENT'});
});
test('credential network and junction paths are refused without dispatch',{skip:!windows},async t=>{
  const f=await setup(t),link=path.join(f.root,'linked');await symlink(f.root,link,'junction');
  for(const CredentialPath of ['\\\\invalid.example\\share\\credential.xml',path.join(link,'synthetic.credential.xml')]){
    const r=f.call({...f.config,CredentialPath});assert.equal(r.status,0,r.stderr);assert.equal(JSON.parse(r.stdout).error,'CREDENTIAL_INVALID');
  }
  await assert.rejects(stat(path.join(f.root,'started.txt')),{code:'ENOENT'});
});
test('oversized and invalid-encoding inert output is discarded and children close without retry',{skip:!windows},async t=>{
  const f=await setup(t);
  for(const text of ['oversized','invalid-utf8']){
    const input=Buffer.from(text),r=f.call({...f.config,InputBase64:input.toString('base64'),InputSha256:hash(input)});
    assert.equal(r.status,0,r.stderr);const out=JSON.parse(r.stdout);
    assert.equal(out.error,'CLIENT_FAILED');assert.equal(out.stdout,'');assert.equal(out.stderr,'');assert.equal(out.clientClosed,true);
  }
  await stopped(f.root,2);
});
test('protected transport timeout terminates the inert child with no retry or partial evidence',{skip:!windows},async t=>{
  const f=await setup(t),input=Buffer.from('timeout');
  const r=f.call({...f.config,InputBase64:input.toString('base64'),InputSha256:hash(input)});
  assert.equal(r.status,0,r.stderr);const out=JSON.parse(r.stdout);
  assert.equal(out.error,'CLIENT_FAILED');assert.equal(out.clientClosed,true);
  assert.equal(out.stdout,'');assert.equal(out.stderr,'');await stopped(f.root,1);
});
