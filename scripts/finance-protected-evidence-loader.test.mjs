import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,writeFile,readFile,readdir,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {loadProtectedFinanceEvidence} from './finance-protected-evidence-loader.mjs';
import {prepareFixedProtectedStagingPoolerRollbackFromFiles} from './finance-fixed-staging-journal.mjs';
import {prepareReviewedFinanceStagingRehearsal} from './finance-reviewed-staging-preparation.mjs';
import {prepareFinanceStagingRehearsalBundle} from './finance-staging-rehearsal-bundle.mjs';
import {financeReadOnlyStagingTarget,prepareFinanceStagingInventory} from './finance-staging-baseline.mjs';
import {prepareProtectedFinanceBaseline} from './finance-baseline-capture.mjs';
import {releaseEvidenceFixture,pack} from '../tests/fixtures/finance-release-evidence.mjs';
const windows=process.platform==='win32',hash=x=>createHash('sha256').update(x).digest('hex');
const names={baseline:'public-baseline-capture.json',ledger:'ledger-v2-capture.json',actors:'actors-v2-capture.json',
  capabilities:'capabilities-capture.json',bindings:'bindings-capture.json'};
const rejected={message:'Protected finance evidence rejected; no rehearsal prepared'};
const file=x=>fileURLToPath(new URL(x,import.meta.url));
function ps(script,args=[],input){return spawnSync(path.join(process.env.SystemRoot,'System32','WindowsPowerShell','v1.0','powershell.exe'),
  ['-NoProfile','-NonInteractive','-File',file(script),...args],{input,encoding:'utf8',windowsHide:true,timeout:20000,maxBuffer:1048576});}
async function setup(t,{privateAcl=true}={}){
  const directory=await mkdtemp(path.join(tmpdir(),'finance-acl-test-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  if(privateAcl)assert.equal(ps('../tests/fixtures/finance-private-directory-setup.ps1',['-Directory',directory]).status,0);
  const f=await releaseEvidenceFixture(),target=financeReadOnlyStagingTarget();
  const inventory={schemaVersion:1,kind:'public-finance-inventory',target,clientsExitedCleanly:true,
    querySha256:prepareFinanceStagingInventory(target).querySha256,snapshot:{capturedAt:new Date().toISOString(),
      database:'postgres',sessionUser:'postgres',readOnly:'on',ssl:true,address:'192.0.2.1',port:5432,
      clusterId:'12345',backendPid:100,inventory:[{name:'profiles',kind:'r'}]}};
  const source=JSON.stringify(inventory),plan=prepareProtectedFinanceBaseline(Buffer.from(source),hash(source));
  const baseline=pack({schemaVersion:1,kind:'public-finance-baseline',target,clientsExitedCleanly:true,inventory:plan.inventory,
    inventoryQuerySha256:plan.inventoryQuerySha256,baselineQuerySha256:plan.querySha256,
    sourceInventoryText:source,sourceInventorySha256:hash(source),snapshot:{...plan.inventory,backendPid:101,
      catalogDigest:'a'.repeat(64),tables:[{name:'profiles',rowCount:'3',rowDigest:'b'.repeat(64)}],sequences:[]}});
  const captures={baseline,...f.evidence,bindings:{bytes:f.evidence.bindingBytes,hash:hash(f.evidence.bindingBytes)}};
  const hashes={};
  for(const kind of Object.keys(names)){
    hashes[kind]=captures[kind].hash;
    await writeFile(path.join(directory,names[kind]),captures[kind].bytes,{flag:'wx'});
  }
  const config={directory,hashes};
  const replace=async(kind,bytes)=>{await writeFile(path.join(directory,names[kind]),bytes);hashes[kind]=hash(bytes);};
  return {config,captures,replace};
}
test('protected loader reads exact private captures unchanged, with no claims or credential files',{skip:!windows},async t=>{
  const f=await setup(t),before=await readdir(f.config.directory);
  const result=await loadProtectedFinanceEvidence(f.config);
  assert.deepEqual(result.baseline,f.captures.baseline);
  assert.deepEqual(result.releaseEvidence.ledger,f.captures.ledger);
  assert.deepEqual(result.releaseEvidence.bindingBytes,f.captures.bindings.bytes);
  assert.deepEqual(await readdir(f.config.directory),before);
  for(const [kind,name] of Object.entries(names))assert.equal(hash(await readFile(path.join(f.config.directory,name))),f.config.hashes[kind]);
});
test('loader rejects path/hash/override configuration before reading files',async()=>{
  const hashes=Object.fromEntries(Object.keys(names).map(k=>[k,'a'.repeat(64)]));
  for(const config of [{directory:'relative',hashes},{directory:'\\\\server\\share',hashes},
    {directory:'C:\\test:stream',hashes},{directory:'C:\\test',hashes,read:()=>{}},
    {directory:'C:\\test',hashes:{...hashes,ledger:'not-a-hash'}},
    {directory:'C:\\test',hashes:{...hashes,extra:'a'.repeat(64)}}])
    await assert.rejects(loadProtectedFinanceEvidence(config),rejected);
});
test('loader rejects inherited/broad directory ACL and reparse ancestors',{skip:!windows},async t=>{
  const f=await setup(t,{privateAcl:false});
  await assert.rejects(loadProtectedFinanceEvidence(f.config),rejected);
  assert.equal(ps('../tests/fixtures/finance-private-directory-setup.ps1',['-Directory',f.config.directory,'-ExtraReader']).status,0);
  await assert.rejects(loadProtectedFinanceEvidence(f.config),rejected);
  assert.equal(ps('../tests/fixtures/finance-private-directory-setup.ps1',['-Directory',f.config.directory]).status,0);
  const holder=await mkdtemp(path.join(tmpdir(),'finance-acl-test-'));
  t.after(()=>rm(holder,{recursive:true,force:true}));
  const link=path.join(holder,'evidence');await symlink(f.config.directory,link,'junction');
  await assert.rejects(loadProtectedFinanceEvidence({...f.config,directory:link}),rejected);
});
test('loader rejects broad individual file ACL even in a private directory',{skip:!windows},async t=>{
  const f=await setup(t);
  assert.equal(ps('../tests/fixtures/finance-evidence-extra-reader.ps1',['-Directory',f.config.directory]).status,0);
  await assert.rejects(loadProtectedFinanceEvidence(f.config),rejected);
});
test('loader refuses missing and receipt-altered files without rewriting them',{skip:!windows},async t=>{
  const f=await setup(t),p=path.join(f.config.directory,names.baseline);
  await writeFile(p,'SYNTHETIC-PRIVATE-CONTENT');
  await assert.rejects(loadProtectedFinanceEvidence(f.config),rejected);
  assert.equal(await readFile(p,'utf8'),'SYNTHETIC-PRIVATE-CONTENT');
  await rm(p);await assert.rejects(loadProtectedFinanceEvidence(f.config),rejected);
});
test('loader bounds reads and rejects BOM, NUL, invalid UTF8 and non-JSON',{skip:!windows},async t=>{
  const f=await setup(t);
  for(const bytes of [Buffer.alloc(700001,32),Buffer.from([0xff]),Buffer.from('\ufeff{}'),Buffer.from('{}\0'),Buffer.from('SYNTHETIC-PRIVATE-CONTENT')]){
    await f.replace('baseline',bytes);await assert.rejects(loadProtectedFinanceEvidence(f.config),rejected);
  }
});
test('loader validates fresh version-2 server-bound contents even with correct file hashes',{skip:!windows},async t=>{
  const f=await setup(t),original=f.captures.ledger.bytes;
  for(const mutate of [c=>c.schemaVersion=1,c=>c.snapshot.clusterId='999',c=>c.snapshot.capturedAt='2020-01-01T00:00:00Z',
    c=>c.snapshot.ledger.pop(),c=>c.clientsExitedCleanly=false]){
    const capture=JSON.parse(original);mutate(capture);await f.replace('ledger',Buffer.from(JSON.stringify(capture)));
    await assert.rejects(loadProtectedFinanceEvidence(f.config),rejected);
  }
});
test('loader snapshots receipt configuration before asynchronous reads',{skip:!windows},async t=>{
  const f=await setup(t),pending=loadProtectedFinanceEvidence(f.config);
  f.config.directory='C:\\SYNTHETIC-NOT-A-PATH';f.config.hashes.actors='0'.repeat(64);
  assert.deepEqual((await pending).releaseEvidence.actors,f.captures.actors);
});
test('FromFiles prepares only, rejects target/adapter overrides, never opens nonexistent credential/client resources',{skip:!windows},async t=>{
  const f=await setup(t),bundle=Buffer.from('-- SYNTHETIC PREPARATION ONLY\n');
  const config={target:financeReadOnlyStagingTarget(),bundle,reviewedBundleSha256:hash(bundle),nonce:'a'.repeat(32),
    evidenceFiles:f.config,credentialPath:'C:\\SYNTHETIC-NOT-EXIST\\credential.xml',credentialSha256:'a'.repeat(64),
    clientPath:'C:\\SYNTHETIC-NOT-EXIST\\psql.exe',clientSha256:'b'.repeat(64),
    rootCertPath:'C:\\SYNTHETIC-NOT-EXIST\\root.crt',rootCertSha256:'c'.repeat(64)};
  const before=await readdir(f.config.directory),pending=prepareFixedProtectedStagingPoolerRollbackFromFiles(config);
  config.bundle.fill(0);config.target.port=6543;
  assert.equal(typeof await pending,'function'); // Never invoke the fixed staging journal.
  for(const extra of [{target:{...financeReadOnlyStagingTarget(),port:6543}},{executeOnce:()=>{}},{directory:f.config.directory}])
    await assert.rejects(prepareFixedProtectedStagingPoolerRollbackFromFiles({...config,...extra}));
  assert.deepEqual(await readdir(f.config.directory),before);
});
test('private IPC reader suppresses raw malformed requests and oversized stdin',{skip:!windows},()=>{
  for(const input of ['SYNTHETIC-PRIVATE-CONTENT','x'.repeat(8193),JSON.stringify({directory:'C:\\test',kind:'../secret',sha256:'a'.repeat(64)})]){
    const r=ps('./finance-protected-evidence-read.ps1',[],input);
    assert.equal(r.status,1);assert.equal(r.stdout,'');assert.equal(r.stderr,'FINANCE_PRIVATE_EVIDENCE_REJECTED');
  }
});

const reviewedConfig=evidenceFiles=>({target:financeReadOnlyStagingTarget(),nonce:'a'.repeat(32),evidenceFiles,
  credentialPath:'C:\\SYNTHETIC-NOT-EXIST\\credential.xml',credentialSha256:'a'.repeat(64),
  clientPath:'C:\\SYNTHETIC-NOT-EXIST\\psql.exe',clientSha256:'b'.repeat(64),
  rootCertPath:'C:\\SYNTHETIC-NOT-EXIST\\root.crt',rootCertSha256:'c'.repeat(64)});
const preparationRejected={message:'Reviewed staging preparation rejected; no rehearsal dispatched'};
test('reviewed boundary prepares exact pinned SQL from private synthetic captures without execution',{skip:!windows},async t=>{
  const f=await setup(t),c=reviewedConfig(f.config),directory=f.config.directory,before=await readdir(directory);
  const hashes={...f.config.hashes};
  const evidence={baseline:f.captures.baseline,releaseEvidence:{ledger:f.captures.ledger,actors:f.captures.actors,
    capabilities:f.captures.capabilities,bindingBytes:f.captures.bindings.bytes}};
  const expected=await prepareFinanceStagingRehearsalBundle({target:c.target,nonce:c.nonce,...evidence});
  const pending=prepareReviewedFinanceStagingRehearsal(c);
  c.target.port=6543;c.nonce='b'.repeat(32);c.clientPath='invalid';
  f.config.directory='C:\\SYNTHETIC-NOT-EXIST';f.config.hashes.actors='0'.repeat(64);
  const p=await pending;
  assert.equal(p.receipt.bundleSha256,expected.sha256);assert.equal(p.receipt.nonce,expected.nonce);
  assert.deepEqual(p.receipt.componentSha256,expected.componentSha256);
  assert.ok(Object.isFrozen(p)&&Object.isFrozen(p.receipt)&&Object.isFrozen(p.receipt.componentSha256));
  assert.equal(p.readyToExecute,false);assert.equal(p.requiresLiveApproval,true);assert.equal(p.remoteContact,false);
  assert.equal(p.positiveLivePathVerified,false);assert.equal(p.sql,undefined);assert.equal(p.baseline,undefined);
  assert.equal(typeof p.runApproved,'function');
  // NEVER supply a matching acknowledgement in this test: the fixed staging
  // journal and protected client must not be invoked, even with synthetic inputs.
  const ack={projectRef:p.receipt.projectRef,nonce:p.receipt.nonce,bundleSha256:p.receipt.bundleSha256,
    operation:'rollback-contained-059-060-staging-rehearsal'};
  for(const bad of [undefined,{},true,{...ack,projectRef:'wrong'},{...ack,nonce:'b'.repeat(32)},
    {...ack,bundleSha256:'0'.repeat(64)},{...ack,operation:'apply-migrations'},{...ack,sql:'commit;'}])
    await assert.rejects(p.runApproved(bad),/acknowledgement required; not dispatched/);
  assert.deepEqual(await readdir(directory),before);
  for(const [kind,name] of Object.entries(names))assert.equal(hash(await readFile(path.join(directory,name))),hashes[kind]);
});
test('reviewed boundary rejects arbitrary SQL, adapters, paths, target and framing overrides before file access',async()=>{
  const c=reviewedConfig({directory:'C:\\SYNTHETIC-NOT-EXIST',hashes:{}});
  for(const extra of [{bundle:Buffer.from('commit;')},{reviewedBundleSha256:'a'.repeat(64)},
    {baseline:{}},{releaseEvidence:{}},{executeOnce:()=>{}},{observeClosure:()=>{}},{skipGuard:true},
    {directory:'C:\\override'},{framing:'commit;'},{timeoutMs:300000},
    {target:{...c.target,port:6543}},{nonce:'invalid'},{clientPath:'relative'},{credentialSha256:123}])
    await assert.rejects(prepareReviewedFinanceStagingRehearsal({...c,...extra}),preparationRejected);
});
test('reviewed preparation rejects a changed private capture without disclosing or rewriting it',{skip:!windows},async t=>{
  const f=await setup(t),p=path.join(f.config.directory,names.actors),bytes=Buffer.from('SYNTHETIC PRIVATE INVALID');
  await writeFile(p,bytes);
  await assert.rejects(prepareReviewedFinanceStagingRehearsal(reviewedConfig(f.config)),preparationRejected);
  assert.deepEqual(await readFile(p),bytes);assert.equal((await readdir(f.config.directory)).length,5);
});
