import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,readFile,writeFile,stat,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {releaseEvidenceFixture} from '../tests/fixtures/finance-release-evidence.mjs';
import {prepareFinanceReleaseCapture,verifyFinanceReleaseCapture} from './finance-release-capture.mjs';
import {financeReleaseEvidenceQuery} from './finance-pooler-release-evidence.mjs';
import {financeReadOnlyStagingTarget,prepareFinanceStagingInventory} from './finance-staging-baseline.mjs';
import {prepareProtectedFinanceBaseline} from './finance-baseline-capture.mjs';
import {prepareFinancePoolerCapabilities} from './finance-pooler-capabilities.mjs';
import {loadProtectedFinanceEvidence} from './finance-protected-evidence-loader.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex'),windows=process.platform==='win32';
const file=x=>fileURLToPath(new URL(x,import.meta.url));
const ps=(script,args)=>spawnSync(path.join(process.env.SystemRoot,'System32','WindowsPowerShell','v1.0','powershell.exe'),
  ['-NoProfile','-NonInteractive','-File',file(script),...args],{windowsHide:true,encoding:'utf8',timeout:50000,
    env:{...process.env,NODE_OPTIONS:'--require=SYNTHETIC-UNSAFE-PRELOAD'}});
test('release capture planner pins both v2 queries and validates independent bindings before dispatch',async()=>{
  const f=await releaseEvidenceFixture(),binding=f.evidence.bindingBytes.toString();
  for(const kind of ['ledger','actors']){
    const args=kind==='actors'?[binding,hash(binding)]:[],plan=prepareFinanceReleaseCapture(kind,...args);
    assert.equal(plan.sql,financeReleaseEvidenceQuery(kind).sql);assert.equal(plan.readyToExecute,false);
    const text=f.evidence[kind].bytes.toString();
    assert.equal((await verifyFinanceReleaseCapture(kind,text,hash(text),...args)).captureVerifiedOffline,true);
    for(const mutate of [c=>c.schemaVersion=1,c=>delete c.snapshot.clusterId,c=>c.snapshot.address='::ffff:127.0.0.1',
      c=>c.snapshot.ssl=false,c=>c.querySha256='0'.repeat(64),c=>c.snapshot.capturedAt='2020-01-01T00:00:00Z']){
      const c=JSON.parse(text);mutate(c);const changed=JSON.stringify(c);
      await assert.rejects(verifyFinanceReleaseCapture(kind,changed,hash(changed),...args));
    }
  }
  assert.throws(()=>prepareFinanceReleaseCapture('ledger',binding,hash(binding)));
  assert.throws(()=>prepareFinanceReleaseCapture('actors',binding,'0'.repeat(64)));
  const b=JSON.parse(binding);b.bindings.member=b.bindings.admin;
  assert.throws(()=>prepareFinanceReleaseCapture('actors',JSON.stringify(b),hash(JSON.stringify(b))));
});
test('release bridge rejects arbitrary SQL, extra fields, wrong bindings and raw errors',()=>{
  for(const request of [{mode:'plan-release',kind:'ledger',sql:'SELECT 1'},
    {mode:'plan-release',kind:'other'},{mode:'plan-release',kind:'actors',bindingText:'SYNTHETIC-PRIVATE',bindingHash:'0'.repeat(64)},
    {mode:'verify-release',kind:'ledger',captureText:'SYNTHETIC-PRIVATE',captureHash:'0'.repeat(64)}]){
    const r=spawnSync(process.execPath,[file('./finance-baseline-bridge.mjs')],{input:JSON.stringify(request),encoding:'utf8',windowsHide:true,timeout:5000});
    assert.equal(r.status,1);assert.equal(r.stdout,'');assert.equal(r.stderr,'FINANCE_BASELINE_BRIDGE_REJECTED');
  }
});
async function setup(t,kind,mode='ok'){
  const root=await mkdtemp(path.join(tmpdir(),'finance-acl-test-'));t.after(()=>rm(root,{recursive:true,force:true}));
  for(const name of ['finance-credential-setup.ps1','finance-baseline-inert-setup.ps1']){
    const r=ps('../tests/fixtures/'+name,['-Directory',root]);assert.equal(r.status,0,r.stderr);
  }
  const f=await releaseEvidenceFixture();
  await writeFile(path.join(root,'synthetic-ca.crt'),'INERT-NOT-A-CA');
  await writeFile(path.join(root,'mode.txt'),mode);
  await writeFile(path.join(root,'expected-sql-sha.txt'),financeReleaseEvidenceQuery(kind).querySha256);
  await writeFile(path.join(root,'response.json'),JSON.stringify({...f[kind],capturedAt:'SYNTHETIC_CAPTURE_TIME'}));
  await writeFile(path.join(root,'bindings-capture.json'),f.evidence.bindingBytes);
  const args=['-CredentialPath',path.join(root,'synthetic.credential.xml'),'-ConfirmReadOnlyStaging','-ConfirmSessionPooler',
    kind==='ledger'?'-CaptureReleaseLedger':'-CaptureReleaseActors','-EvidenceDirectory',root,
    '-ClientPath',path.join(root,'baseline-inert.exe'),'-ClientSha256',hash(await readFile(path.join(root,'baseline-inert.exe'))),
    '-RootCertificatePath',path.join(root,'synthetic-ca.crt'),'-RootCertificateSha256',hash('INERT-NOT-A-CA'),
    '-NodePath',process.execPath,'-NodeSha256',hash(await readFile(process.execPath))];
  if(kind==='actors')args.push('-ActorBindingsPath',path.join(root,'bindings-capture.json'),'-ActorBindingsSha256',hash(f.evidence.bindingBytes));
  return {root,args,f,call:(a=args)=>ps('./finance-protected-preflight.ps1',a)};
}
async function stopped(root,count){
  assert.equal((await readFile(path.join(root,'started.txt'),'utf8')).trim().split('\n').length,count);
  const r=ps('../tests/fixtures/finance-inert-exit-probe.ps1',['-ClientPath',path.join(root,'baseline-inert.exe')]);
  assert.equal(r.status,0,r.stderr);assert.equal(r.stdout,'EXACT_INERT_CLIENT_EXITED');
}
test('actual v2 protected captures verify exact ledger and actors, preserve v1 files and refuse overwrite',{skip:!windows},async t=>{
  for(const kind of ['ledger','actors']){
    const {root,call,f}=await setup(t,kind),old=path.join(root,kind+'-capture.json');
    await writeFile(old,'HISTORICAL-SYNTHETIC-V1');
    const r=call();assert.equal(r.status,0,r.stderr);
    const receipt=JSON.parse(r.stdout),p=path.join(root,kind+'-v2-capture.json'),bytes=await readFile(p);
    const args=kind==='actors'?[f.evidence.bindingBytes.toString(),hash(f.evidence.bindingBytes)]:[];
    assert.equal((await verifyFinanceReleaseCapture(kind,bytes.toString(),receipt.captureSha256,...args)).captureVerifiedOffline,true);
    assert.equal(receipt.schemaVersion,2);assert.equal(receipt.readyForWriteRehearsal,false);assert.equal(receipt.databaseWrites,false);
    assert.doesNotMatch(r.stdout+r.stderr,/SYNTHETIC-NOT-A-LIVE-PASSWORD|192\.0\.2\.1|statements|profileDigest/);
    assert.equal(call().status,1);assert.deepEqual(await readFile(p),bytes);assert.equal(await readFile(old,'utf8'),'HISTORICAL-SYNTHETIC-V1');
    await stopped(root,1);
  }
});
test('v2 capture guards reject mixed modes, absent permissions/runtime and changed independent bindings before client startup',{skip:!windows},async t=>{
  for(const kind of ['ledger','actors']){
    const {root,args,call}=await setup(t,kind);
    for(const flag of ['-ConfirmReadOnlyStaging','-ConfirmSessionPooler','-NodePath']){
      const a=[...args],i=a.indexOf(flag);a.splice(i,flag==='-NodePath'?2:1);assert.match(call(a).stderr,/MODE_INVALID/);
    }
    for(const flag of ['-CaptureFullLedger','-CaptureActors','-CaptureIdentity','-CaptureSessionWitness','-CapturePublicInventory','-CapturePublicBaseline','-CaptureBaselinePrerequisites','-CapturePoolerCapabilities',kind==='actors'?'-CaptureReleaseLedger':'-CaptureReleaseActors'])
      assert.match(call([...args,flag]).stderr,/MODE_INVALID/);
    if(kind==='actors'){
      const a=[...args];a[a.indexOf('-ActorBindingsSha256')+1]='0'.repeat(64);
      assert.match(call(a).stderr,/ACTOR_BINDING_INVALID/);
    }
    await assert.rejects(stat(path.join(root,'started.txt')),{code:'ENOENT'});
    await assert.rejects(stat(path.join(root,kind+'-v2-capture.json')),{code:'ENOENT'});
  }
});
test('actual failed ledger content and actor eligibility are retained privately and block reuse',{skip:!windows},async t=>{
  for(const kind of ['ledger','actors']){
    const {root,call,f}=await setup(t,kind);
    if(kind==='ledger')f.ledger.ledger.pop();else f.actors.actors[0].accountStatus='inactive';
    await writeFile(path.join(root,'response.json'),JSON.stringify(f[kind]));
    const r=call();assert.equal(r.status,1);assert.equal(r.stdout,'');assert.match(r.stderr,/RELEASE_CAPTURE_FAILED/);
    const p=path.join(root,kind+'-v2-capture.json'),before=await readFile(p);assert.ok(before.length>0);
    assert.equal(call().status,1);assert.deepEqual(await readFile(p),before);await stopped(root,1);
  }
});
test('v2 child errors preserve reservations, suppress private errors and close without retry',{skip:!windows},async t=>{
  for(const [kind,mode] of [['ledger','oversized'],['actors','stderr'],['actors','malformed'],['ledger','timeout']]){
    const {root,call}=await setup(t,kind,mode),r=call();assert.equal(r.status,1);assert.equal(r.stdout,'');
    assert.match(r.stderr,/RELEASE_CAPTURE_FAILED/);assert.doesNotMatch(r.stderr,/SYNTHETIC-PRIVATE|SYNTHETIC-NOT-A-LIVE/);
    assert.equal((await stat(path.join(root,kind+'-v2-capture.json'))).size,0);
    assert.equal(call().status,1);await stopped(root,1);
  }
});
test('all protected preflight captures round-trip through the private loader as one server-bound evidence set',{skip:!windows},async t=>{
  const {root,args,f,call}=await setup(t,'ledger'),hashes={bindings:hash(f.evidence.bindingBytes)};
  const capture=async(flag,sqlHash,snapshot,extra=[])=>{
    await writeFile(path.join(root,'expected-sql-sha.txt'),sqlHash);
    await writeFile(path.join(root,'response.json'),JSON.stringify({...snapshot,capturedAt:'SYNTHETIC_CAPTURE_TIME'}));
    const r=call([...args.map(x=>x==='-CaptureReleaseLedger'?flag:x),...extra]);
    assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout).captureSha256;
  };
  const base={capturedAt:new Date().toISOString(),database:'postgres',sessionUser:'postgres',readOnly:'on',ssl:true,
    address:'192.0.2.1',port:5432,clusterId:'12345',backendPid:100,inventory:[{name:'profiles',kind:'r'}]};
  const inventoryHash=await capture('-CapturePublicInventory',prepareFinanceStagingInventory(financeReadOnlyStagingTarget()).querySha256,base);
  const inventoryPath=path.join(root,'public-inventory-capture.json'),inventoryBytes=await readFile(inventoryPath);
  const plan=prepareProtectedFinanceBaseline(inventoryBytes,inventoryHash);
  hashes.baseline=await capture('-CapturePublicBaseline',plan.querySha256,{...base,backendPid:101,catalogDigest:'a'.repeat(64),
    tables:[{name:'profiles',rowCount:'3',rowDigest:'b'.repeat(64)}],sequences:[]},
    ['-InventoryCapturePath',inventoryPath,'-InventoryCaptureSha256',inventoryHash]);
  hashes.capabilities=await capture('-CapturePoolerCapabilities',prepareFinancePoolerCapabilities().querySha256,f.server);
  hashes.ledger=await capture('-CaptureReleaseLedger',financeReleaseEvidenceQuery('ledger').querySha256,f.ledger);
  hashes.actors=await capture('-CaptureReleaseActors',financeReleaseEvidenceQuery('actors').querySha256,f.actors,
    ['-ActorBindingsPath',path.join(root,'bindings-capture.json'),'-ActorBindingsSha256',hashes.bindings]);
  const loaded=await loadProtectedFinanceEvidence({directory:root,hashes});
  assert.equal(loaded.baseline.hash,hashes.baseline);assert.equal(loaded.releaseEvidence.actors.hash,hashes.actors);
  assert.equal(loaded.releaseEvidence.ledger.hash,hashes.ledger);await stopped(root,5);
});
