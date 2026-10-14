import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdtemp,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {financeReadOnlyStagingTarget,prepareFinanceStagingInventory} from './finance-staging-baseline.mjs';
import {verifyFinanceInventoryCapture,prepareProtectedFinanceBaseline,verifyProtectedFinanceBaseline} from './finance-baseline-capture.mjs';
import {prepareFinanceBaselinePrerequisites,verifyFinancePrerequisiteCapture} from './finance-baseline-prerequisites.mjs';
import {prepareFinancePoolerCapabilities,verifyFinancePoolerCapabilityCapture} from './finance-pooler-capabilities.mjs';
import {releaseEvidenceFixture} from '../tests/fixtures/finance-release-evidence.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const file=x=>fileURLToPath(new URL(x,import.meta.url));
const target=financeReadOnlyStagingTarget();
function inventory(){return {schemaVersion:1,kind:'public-finance-inventory',target,clientsExitedCleanly:true,
  querySha256:prepareFinanceStagingInventory(target).querySha256,snapshot:{capturedAt:new Date().toISOString(),
    database:'postgres',sessionUser:'postgres',readOnly:'on',ssl:true,address:'192.0.2.1',port:5432,
    clusterId:'12345',backendPid:100,inventory:[{name:'profiles',kind:'r'},{name:'probe',kind:'S'}]}};}
function baseline(source=JSON.stringify(inventory())){
  const sourceBytes=Buffer.from(source),plan=prepareProtectedFinanceBaseline(sourceBytes,hash(sourceBytes));
  return {schemaVersion:1,kind:'public-finance-baseline',target,clientsExitedCleanly:true,inventory:plan.inventory,
    inventoryQuerySha256:plan.inventoryQuerySha256,baselineQuerySha256:plan.querySha256,
    sourceInventoryText:source,sourceInventorySha256:hash(sourceBytes),snapshot:{...plan.inventory,
      backendPid:101,capturedAt:new Date().toISOString(),catalogDigest:'a'.repeat(64),
      tables:[{name:'profiles',rowCount:'3',rowDigest:'b'.repeat(64)}],sequences:[{name:'probe',lastValue:'1',isCalled:false}]}};
}
test('protected baseline binds exact source inventory bytes without network or write authority',()=>{
  const i=Buffer.from(JSON.stringify(inventory()));assert.equal(verifyFinanceInventoryCapture(i,hash(i)).inventoryVerified,true);
  const b=Buffer.from(JSON.stringify(baseline()));const result=verifyProtectedFinanceBaseline(b,hash(b));
  assert.equal(result.captureIntegrityVerified,true);assert.equal(result.readyForWriteRehearsal,false);
});
test('altered inventory source, stale source, wrong receipt/query or detached inventory are refused',()=>{
  for(const mutate of [b=>b.sourceInventorySha256='0'.repeat(64),b=>b.sourceInventoryText+=' ',
    b=>delete b.sourceInventoryText,b=>b.inventory={...b.inventory,clusterId:'999'},
    b=>b.baselineQuerySha256='0'.repeat(64)]){
    const c=baseline();mutate(c);const bytes=Buffer.from(JSON.stringify(c));assert.throws(()=>verifyProtectedFinanceBaseline(bytes,hash(bytes)));
  }
  const i=inventory();i.snapshot.capturedAt='2020-01-01T00:00:00Z';
  const bytes=Buffer.from(JSON.stringify(i));assert.throws(()=>prepareProtectedFinanceBaseline(bytes,hash(bytes)));
});
test('bridge accepts only fixed planning/verification actions and suppresses raw errors',()=>{
  const bridge=file('./finance-baseline-bridge.mjs');
  const call=input=>spawnSync(process.execPath,[bridge],{input,encoding:'utf8',windowsHide:true,timeout:5000});
  const valid=call(JSON.stringify({mode:'plan-inventory'}));assert.equal(valid.status,0);
  assert.equal(JSON.parse(valid.stdout).sql,prepareFinanceStagingInventory(target).sql);
  for(const request of [{mode:'plan-inventory',sql:'SYNTHETIC-PRIVATE-SQL'},
    {mode:'execute'},{mode:'plan-baseline',inventoryText:'SYNTHETIC-PRIVATE-ROW',inventoryHash:'0'.repeat(64)}]){
    const result=call(JSON.stringify(request));assert.equal(result.status,1);assert.equal(result.stdout,'');
    assert.equal(result.stderr,'FINANCE_BASELINE_BRIDGE_REJECTED');
  }
});
const windows=process.platform==='win32';
function run(script,args){return spawnSync(path.join(process.env.SystemRoot,'System32','WindowsPowerShell','v1.0','powershell.exe'),
  ['-NoProfile','-NonInteractive','-File',script,...args],{windowsHide:true,encoding:'utf8',timeout:50000,
    env:{...process.env,NODE_OPTIONS:'--require=SYNTHETIC-UNSAFE-PRELOAD'}});}
async function setup(t,mode='ok'){
  const root=await mkdtemp(path.join(tmpdir(),'finance-acl-test-'));t.after(()=>rm(root,{recursive:true,force:true}));
  assert.equal(run(file('../tests/fixtures/finance-credential-setup.ps1'),['-Directory',root]).status,0);
  const compile=run(file('../tests/fixtures/finance-baseline-inert-setup.ps1'),['-Directory',root]);assert.equal(compile.status,0,compile.stderr);
  await writeFile(path.join(root,'synthetic-ca.crt'),'INERT-NOT-A-CA',{flag:'wx'});
  await writeFile(path.join(root,'mode.txt'),mode,{flag:'wx'});
  await writeFile(path.join(root,'expected-sql-sha.txt'),prepareFinanceStagingInventory(target).querySha256);
  await writeFile(path.join(root,'response.json'),JSON.stringify({...inventory().snapshot,capturedAt:'SYNTHETIC_CAPTURE_TIME'}));
  const args=['-CredentialPath',path.join(root,'synthetic.credential.xml'),'-ConfirmReadOnlyStaging','-ConfirmSessionPooler',
    '-CapturePublicInventory','-EvidenceDirectory',root,'-ClientPath',path.join(root,'baseline-inert.exe'),
    '-ClientSha256',hash(await readFile(path.join(root,'baseline-inert.exe'))),
    '-RootCertificatePath',path.join(root,'synthetic-ca.crt'),'-RootCertificateSha256',hash('INERT-NOT-A-CA'),
    '-NodePath',process.execPath,'-NodeSha256',hash(await readFile(process.execPath))];
  return {root,args,call:(a=args)=>run(file('./finance-protected-preflight.ps1'),a)};
}
async function stopped(root,count){
  const pids=(await readFile(path.join(root,'started.txt'),'utf8')).trim().split('\n').map(Number);assert.equal(pids.length,count);
  const probe=run(file('../tests/fixtures/finance-inert-exit-probe.ps1'),['-ClientPath',path.join(root,'baseline-inert.exe')]);
  assert.equal(probe.status,0,probe.stderr);assert.equal(probe.stdout,'EXACT_INERT_CLIENT_EXITED');
}
test('actual Windows protected inventory then baseline capture verifies, isolates Node env and refuses reuse',{skip:!windows},async t=>{
  const {root,args,call}=await setup(t);
  // Non-ASCII catalog identifiers must survive Node/PowerShell/psql stdin intact.
  const fixtureInventory=inventory().snapshot;fixtureInventory.inventory[0].name='profiles_精武館';
  await writeFile(path.join(root,'response.json'),JSON.stringify({...fixtureInventory,capturedAt:'SYNTHETIC_CAPTURE_TIME'}));
  const first=call();assert.equal(first.status,0,first.stderr);
  const receipt=JSON.parse(first.stdout),inventoryPath=path.join(root,'public-inventory-capture.json'),i=await readFile(inventoryPath);
  assert.equal(verifyFinanceInventoryCapture(i,receipt.captureSha256).inventoryVerified,true);
  const plan=prepareProtectedFinanceBaseline(i,receipt.captureSha256),expected=baseline(i.toString('utf8'));
  expected.snapshot.tables[0].name='profiles_精武館';
  await writeFile(path.join(root,'expected-sql-sha.txt'),plan.querySha256);
  await writeFile(path.join(root,'response.json'),JSON.stringify({...expected.snapshot,capturedAt:'SYNTHETIC_CAPTURE_TIME'}));
  const baselineArgs=args.map(x=>x==='-CapturePublicInventory'?'-CapturePublicBaseline':x);
  baselineArgs.push('-InventoryCapturePath',inventoryPath,'-InventoryCaptureSha256',receipt.captureSha256);
  const second=call(baselineArgs);assert.equal(second.status,0,second.stderr);
  const secondReceipt=JSON.parse(second.stdout),b=await readFile(path.join(root,'public-baseline-capture.json'));
  assert.equal(verifyProtectedFinanceBaseline(b,secondReceipt.captureSha256).captureIntegrityVerified,true);
  assert.equal(secondReceipt.rollbackVerified,false);assert.equal(secondReceipt.readyForWriteRehearsal,false);
  assert.deepEqual(secondReceipt.prerequisiteBlockers,[]);
  assert.doesNotMatch(first.stdout+second.stdout,/SYNTHETIC-NOT-A-LIVE-PASSWORD|rowDigest|192\.0\.2\.1/);
  assert.equal(call().status,1);assert.equal(call(baselineArgs).status,1);
  assert.deepEqual(await readFile(inventoryPath),i);assert.deepEqual(await readFile(path.join(root,'public-baseline-capture.json')),b);
  await stopped(root,2);
});
test('PowerShell async-write results never contaminate the offline bridge JSON',{skip:!windows},()=>{
  const result=run(file('../tests/fixtures/finance-baseline-bridge-probe.ps1'),['-Node',process.execPath]);
  assert.equal(result.status,0,result.stderr);assert.equal(result.stdout,'OFFLINE_BRIDGE_PLAN_VERIFIED');
});
test('invalid protected inventory or pinned Node cannot start the database client',{skip:!windows},async t=>{
  const {root,args,call}=await setup(t);
  const wrongNode=[...args];wrongNode[wrongNode.indexOf('-NodeSha256')+1]='0'.repeat(64);
  const rejected=call(wrongNode);assert.equal(rejected.status,1);assert.match(rejected.stderr,/NODE_RESOURCE_INVALID/);
  const source=path.join(root,'source.json');await writeFile(source,JSON.stringify(inventory()));
  const changed=args.map(x=>x==='-CapturePublicInventory'?'-CapturePublicBaseline':x);
  changed.push('-InventoryCapturePath',source,'-InventoryCaptureSha256','0'.repeat(64));
  assert.equal(call(changed).status,1);
  await assert.rejects(stat(path.join(root,'started.txt')),{code:'ENOENT'});
  assert.equal((await stat(path.join(root,'public-baseline-capture.json'))).size,0);
});
test('mismatched server evidence is saved privately, rejected and cannot be overwritten',{skip:!windows},async t=>{
  const {root,call}=await setup(t);await writeFile(path.join(root,'response.json'),JSON.stringify({...inventory().snapshot,ssl:false}));
  const result=call();assert.equal(result.status,1);assert.equal(result.stdout,'');assert.match(result.stderr,/PUBLIC_BASELINE_CAPTURE_FAILED/);
  const evidence=await readFile(path.join(root,'public-inventory-capture.json'));assert.ok(evidence.length>0);
  assert.equal(call().status,1);assert.deepEqual(await readFile(path.join(root,'public-inventory-capture.json')),evidence);await stopped(root,1);
});
test('bounded baseline client failure preserves reservation, kills child and never retries',{skip:!windows},async t=>{
  for(const mode of ['stderr','malformed','oversized','timeout']){
    const {root,call}=await setup(t,mode),result=call();assert.equal(result.status,1,mode+': '+result.stderr);
    assert.equal(result.stdout,'');assert.match(result.stderr,/PUBLIC_BASELINE_CAPTURE_FAILED/);
    assert.doesNotMatch(result.stderr,/SYNTHETIC-PRIVATE-ERROR|SYNTHETIC-NOT-A-LIVE-PASSWORD/);
    assert.equal((await stat(path.join(root,'public-inventory-capture.json'))).size,0);
    assert.equal(call().status,1);await stopped(root,1);
  }
});
test('capture modes require explicit authority and pinned runtime, and reject mixed modes before start',{skip:!windows},async t=>{
  const {root,args,call}=await setup(t);
  for(const omit of ['-ConfirmReadOnlyStaging','-ConfirmSessionPooler','-EvidenceDirectory','-NodePath']){
    const a=[...args],i=a.indexOf(omit);a.splice(i,omit.endsWith('Directory')||omit.endsWith('Path')?2:1);
    const result=call(a);assert.equal(result.status,1);assert.match(result.stderr,/MODE_INVALID/);
  }
  for(const extra of ['-CaptureFullLedger','-CaptureActors','-CaptureSessionWitness','-CapturePublicBaseline','-CaptureBaselinePrerequisites','-CapturePoolerCapabilities']){
    const result=call([...args,extra]);assert.equal(result.status,1);assert.match(result.stderr,/MODE_INVALID/);
  }
  await assert.rejects(stat(path.join(root,'started.txt')),{code:'ENOENT'});
});

test('protected prerequisite mode captures metadata only, preserves blockers and refuses overwrite',{skip:!windows},async t=>{
  const {root,args,call}=await setup(t),plan=prepareFinanceBaselinePrerequisites();
  await writeFile(path.join(root,'expected-sql-sha.txt'),plan.querySha256);
  const snapshot={...inventory().snapshot,capturedAt:'SYNTHETIC_CAPTURE_TIME',controlSystemExecutable:false,
    role:{superuser:false,bypassRls:false},relations:[{kind:'r',selectable:true,rls:false}],
    columns:[],types:[],edges:[],casts:[],functions:[]};
  await writeFile(path.join(root,'response.json'),JSON.stringify(snapshot));
  const a=args.map(x=>x==='-CapturePublicInventory'?'-CaptureBaselinePrerequisites':x);
  const result=call(a);assert.equal(result.status,0,result.stderr);
  const receipt=JSON.parse(result.stdout),filePath=path.join(root,'public-prerequisites-capture.json'),bytes=await readFile(filePath);
  assert.deepEqual(verifyFinancePrerequisiteCapture(bytes,receipt.captureSha256).blockers,['cluster-identity-permission']);
  assert.deepEqual(receipt.prerequisiteBlockers,['cluster-identity-permission']);
  assert.equal(receipt.readyForWriteRehearsal,false);assert.equal(receipt.dependencyReviewRequired,true);
  assert.equal(call(a).status,1);assert.deepEqual(await readFile(filePath),bytes);await stopped(root,1);
});

async function capabilitySetup(t,mode='ok'){
  const f=await setup(t,mode),plan=prepareFinancePoolerCapabilities(),{server}=await releaseEvidenceFixture();
  await writeFile(path.join(f.root,'expected-sql-sha.txt'),plan.querySha256);
  await writeFile(path.join(f.root,'response.json'),JSON.stringify({...server,capturedAt:'SYNTHETIC_CAPTURE_TIME'}));
  const args=f.args.map(x=>x==='-CapturePublicInventory'?'-CapturePoolerCapabilities':x);
  return {...f,args,call:(a=args)=>f.call(a),server};
}
test('capability bridge exposes only fixed read-only query and exact verification request',()=>{
  const call=request=>spawnSync(process.execPath,[file('./finance-baseline-bridge.mjs')],{
    input:JSON.stringify(request),encoding:'utf8',windowsHide:true,timeout:5000});
  const planned=call({mode:'plan-capabilities'});assert.equal(planned.status,0,planned.stderr);
  assert.deepEqual(JSON.parse(planned.stdout),prepareFinancePoolerCapabilities());
  for(const request of [{mode:'plan-capabilities',captureText:'SYNTHETIC-PRIVATE'},
    {mode:'plan-capabilities',sql:'SELECT 1'},
    {mode:'verify-capabilities',captureText:'SYNTHETIC-PRIVATE',captureHash:'0'.repeat(64)},
    {mode:'verify-capabilities',captureText:'{}',captureHash:hash('{}'),inventoryText:'{}'}]){
    const r=call(request);assert.equal(r.status,1);assert.equal(r.stdout,'');assert.equal(r.stderr,'FINANCE_BASELINE_BRIDGE_REJECTED');
  }
});
test('protected capability capture saves loader-compatible evidence, returns no private data and refuses overwrite',{skip:!windows},async t=>{
  const {root,call}=await capabilitySetup(t),result=call();assert.equal(result.status,0,result.stderr);
  const receipt=JSON.parse(result.stdout),p=path.join(root,'capabilities-capture.json'),bytes=await readFile(p);
  assert.equal(receipt.kind,'capabilities');assert.equal(receipt.captureSha256,hash(bytes));
  assert.equal(verifyFinancePoolerCapabilityCapture(bytes,receipt.captureSha256).capabilitiesVerified,true);
  for(const key of ['serverClosureIndependentlyVerified','rollbackVerified','readyForWriteRehearsal','databaseWrites'])assert.equal(receipt[key],false);
  assert.doesNotMatch(result.stdout+result.stderr,/SYNTHETIC-NOT-A-LIVE-PASSWORD|192\.0\.2\.1|selfActivity|statusProbe/);
  assert.equal(call().status,1);assert.deepEqual(await readFile(p),bytes);await stopped(root,1);
});
test('capability mode refuses missing authority, unpinned runtime and mixed modes before any client starts',{skip:!windows},async t=>{
  const {root,args,call}=await capabilitySetup(t);
  for(const flag of ['-ConfirmReadOnlyStaging','-ConfirmSessionPooler','-EvidenceDirectory','-NodePath','-NodeSha256']){
    const a=[...args],i=a.indexOf(flag);a.splice(i,flag.startsWith('-Confirm')?1:2);
    const r=call(a);assert.equal(r.status,1);assert.match(r.stderr,/MODE_INVALID/);assert.equal(r.stdout,'');
  }
  for(const flag of ['-CaptureFullLedger','-CaptureActors','-CaptureIdentity','-CaptureSessionWitness','-CapturePublicInventory','-CapturePublicBaseline','-CaptureBaselinePrerequisites']){
    const r=call([...args,flag]);assert.equal(r.status,1);assert.match(r.stderr,/MODE_INVALID/);
  }
  const wrong=[...args];wrong[wrong.indexOf('-NodeSha256')+1]='0'.repeat(64);
  assert.match(call(wrong).stderr,/NODE_RESOURCE_INVALID/);
  await assert.rejects(stat(path.join(root,'started.txt')),{code:'ENOENT'});
  await assert.rejects(stat(path.join(root,'capabilities-capture.json')),{code:'ENOENT'});
});
test('failed capability semantics are preserved privately, rejected, and never retried',{skip:!windows},async t=>{
  for(const mutate of [s=>s.ssl=false,s=>s.allStatsVisible=false,s=>s.assignedXid='999',
    s=>s.selfActivity.pid=999,s=>s.capturedAt='2020-01-01T00:00:00Z']){
    const {root,server,call}=await capabilitySetup(t);mutate(server);
    await writeFile(path.join(root,'response.json'),JSON.stringify(server));
    const r=call();assert.equal(r.status,1);assert.equal(r.stdout,'');assert.match(r.stderr,/POOLER_CAPABILITY_CAPTURE_FAILED/);
    const p=path.join(root,'capabilities-capture.json'),bytes=await readFile(p);assert.ok(bytes.length>0);
    assert.equal(call().status,1);assert.deepEqual(await readFile(p),bytes);await stopped(root,1);
  }
});
test('capability bounded-child failure preserves empty reservation and closes the exact client',{skip:!windows},async t=>{
  for(const mode of ['stderr','malformed','oversized','timeout']){
    const {root,call}=await capabilitySetup(t,mode),r=call();assert.equal(r.status,1,mode);
    assert.equal(r.stdout,'');assert.match(r.stderr,/POOLER_CAPABILITY_CAPTURE_FAILED/);
    assert.doesNotMatch(r.stderr,/SYNTHETIC-PRIVATE|SYNTHETIC-NOT-A-LIVE-PASSWORD/);
    assert.equal((await stat(path.join(root,'capabilities-capture.json'))).size,0);
    assert.equal(call().status,1);await stopped(root,1);
  }
});
