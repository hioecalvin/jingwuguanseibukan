import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,readFile,writeFile,rm,readdir,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync,spawn} from 'node:child_process';
import {financeReadOnlyStagingTarget,prepareFinanceStagingInventory} from './finance-staging-baseline.mjs';
import {prepareProtectedFinanceBaseline} from './finance-baseline-capture.mjs';
import {buildFinancePoolerClosureSql} from './finance-pooler-rehearsal.mjs';
import {prepareFinanceProtectedPoolerAdapters} from './finance-protected-pooler-adapters.mjs';
import {prepareFinancePoolerRollback} from './finance-pooler-controller.mjs';
import {prepareFixedProtectedStagingPoolerRollback} from './finance-fixed-staging-journal.mjs';
import {assertFinancePrivateDirectory} from './finance-private-directory.mjs';
import {releaseEvidenceFixture} from '../tests/fixtures/finance-release-evidence.mjs';
import {financeReleaseEvidenceQuery} from './finance-pooler-release-evidence.mjs';
const windows=process.platform==='win32',hash=x=>createHash('sha256').update(x).digest('hex');
const fixture=x=>fileURLToPath(new URL('../tests/fixtures/'+x,import.meta.url));
function ps(file,args){return spawnSync(path.join(process.env.SystemRoot,'System32','WindowsPowerShell','v1.0','powershell.exe'),
  ['-NoProfile','-NonInteractive','-File',file,...args],{windowsHide:true,encoding:'utf8',timeout:30000});}
async function setup(t,variant='ok'){
  const directory=await mkdtemp(path.join(tmpdir(),'finance-acl-test-'));t.after(()=>rm(directory,{recursive:true,force:true}));
  for(const [file,args] of [[fixture('finance-credential-setup.ps1'),['-Directory',directory]],
    [fixture('finance-protected-pooler-probe.ps1'),['-Mode','setup','-Directory',directory]]]){
    const r=ps(file,args);assert.equal(r.status,0,r.stderr);
  }
  const target=financeReadOnlyStagingTarget(),nonce='a'.repeat(32),at=n=>new Date(Date.now()+n).toISOString();
  const bundle=Buffer.from('-- SYNTHETIC POOLER INTEGRATION ONLY\n');
  const base={capturedAt:at(-5000),database:'postgres',sessionUser:'postgres',readOnly:'on',ssl:true,
    address:'192.0.2.1',port:5432,clusterId:'12345',backendPid:90,inventory:[{name:'profiles',kind:'r'}]};
  const source=JSON.stringify({schemaVersion:1,kind:'public-finance-inventory',target,clientsExitedCleanly:true,
    querySha256:prepareFinanceStagingInventory(target).querySha256,snapshot:base});
  const plan=prepareProtectedFinanceBaseline(Buffer.from(source),hash(source));
  const before={schemaVersion:1,kind:'public-finance-baseline',target,clientsExitedCleanly:true,inventory:plan.inventory,
    inventoryQuerySha256:plan.inventoryQuerySha256,baselineQuerySha256:plan.querySha256,
    sourceInventoryText:source,sourceInventorySha256:hash(source),snapshot:{...base,backendPid:101,capturedAt:at(-4000),
      catalogDigest:'a'.repeat(64),tables:[{name:'profiles',rowCount:'0',rowDigest:'b'.repeat(64)}],sequences:[]}};
  const baselineBytes=Buffer.from(JSON.stringify(before));
  const identity={nonce,capturedAt:at(-2000),database:'postgres',sessionUser:'postgres',clusterId:'12345',
    address:'192.0.2.1',port:5432,backendPid:201,backendStart:at(-5000),transactionStart:at(-2000),
    applicationName:'jwg-finance-rehearsal-'+nonce,readOnly:'off',ssl:true,transactionId:'123456'};
  const closure={...identity,backendPid:202,capturedAt:'CAPTURE_TIME',readOnly:'on',targetBackendPid:201,
    targetApplicationName:identity.applicationName,transactionStatus:variant==='committed'?'committed':'aborted',
    matchingSessions:[{pid:201,backendStart:identity.backendStart,state:'idle',transactionStart:null,backendXid:null,applicationName:'pool'}]};
  const after={...before.snapshot,backendPid:102,capturedAt:'CAPTURE_TIME'};
  const release=await releaseEvidenceFixture();
  const ledgerAfter={...release.ledger,backendPid:303,capturedAt:'CAPTURE_TIME'};
  const actorsAfter={...release.actors,backendPid:304,capturedAt:'CAPTURE_TIME'};
  if(variant==='ledger-drift')ledgerAfter.ledgerCatalogDigest='b'.repeat(64);
  if(variant==='actor-drift')actorsAfter.actors[0].profileDigest='d'.repeat(64);
  if(variant==='drift')after.catalogDigest='c'.repeat(64);
  await Promise.all(Object.entries({'controller-mode.txt':variant,'inert-ca.crt':'NOT-A-CERTIFICATE',
    'mutation.sha':hash(bundle),'closure.sha':hash(buildFinancePoolerClosureSql(identity,{nonce})),'baseline.sha':plan.querySha256,
    'mutation.json':JSON.stringify(identity),'closure.json':JSON.stringify(closure),'baseline.json':JSON.stringify(after),
    'ledger.sha':financeReleaseEvidenceQuery('ledger').querySha256,'actors.sha':financeReleaseEvidenceQuery('actors').querySha256,
    'ledger.json':JSON.stringify(ledgerAfter),'actors.json':JSON.stringify(actorsAfter),
    'mutation.stderr':variant==='bad-sentinel'?'ERROR: wrong sentinel':`ERROR:  Z0590: JWG_FINANCE_ROLLBACK_${nonce}`
  }).map(([name,text])=>writeFile(path.join(directory,name),text)));
  const credentialPath=path.join(directory,'synthetic.credential.xml'),clientPath=path.join(directory,'protected-inert.exe'),rootCertPath=path.join(directory,'inert-ca.crt');
  const config={target,directory,nonce,bundleSha256:hash(bundle),baseline:{bytes:baselineBytes,hash:hash(baselineBytes)},
    credentialPath,credentialSha256:hash(await readFile(credentialPath)),clientPath,clientSha256:hash(await readFile(clientPath)),
    rootCertPath,rootCertSha256:hash(await readFile(rootCertPath))};
  const makeRun=()=>prepareFinancePoolerRollback({target,bundle,nonce,baseline:config.baseline,
    releaseEvidence:release.evidence,
    journal:{directory,nonce,bundleSha256:hash(bundle),mode:'staging-only',closureKind:'pooler-transaction',assertPrivateDirectory:assertFinancePrivateDirectory},
    ...prepareFinanceProtectedPoolerAdapters(config)});
  return {directory,config,bundle,makeRun,releaseEvidence:release.evidence};
}
async function starts(f,count){
  const pids=(await readFile(path.join(f.directory,'started.txt'),'utf8')).trim().split('\n').map(Number);
  assert.equal(pids.length,count);assert.ok(pids.every(pid=>Number.isInteger(pid)&&pid>0));
  // Windows may have reused an exited child's PID, even for a protected process.
  // Keep the real clientClosed assertions and independently check our exact exe.
  const probe=ps(fixture('finance-inert-exit-probe.ps1'),['-ClientPath',f.config.clientPath]);
  assert.equal(probe.status,0,probe.stderr);assert.equal(probe.stdout,'EXACT_INERT_CLIENT_EXITED');
}

test('exact executable exit probe rejects a still-running synthetic child',{skip:!windows},async t=>{
  const f=await setup(t);
  // Controller-mode would finish immediately; use a fresh compiled inert binary
  // in another synthetic directory without that mode file.
  const directory=await mkdtemp(path.join(tmpdir(),'finance-acl-test-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const compiled=ps(fixture('finance-protected-pooler-probe.ps1'),['-Mode','setup','-Directory',directory]);
  assert.equal(compiled.status,0,compiled.stderr);
  const clientPath=path.join(directory,'protected-inert.exe');
  const child=spawn(clientPath,[],{windowsHide:true,stdio:['pipe','ignore','ignore'],
    env:{SystemRoot:process.env.SystemRoot,WINDIR:process.env.SystemRoot,PGPASSWORD:'SYNTHETIC-NOT-A-LIVE-PASSWORD'}});
  const closed=new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve);});
  try{
    await new Promise((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject);});
    child.stdin.end('timeout');
    const probe=ps(fixture('finance-inert-exit-probe.ps1'),['-ClientPath',clientPath]);
    assert.equal(probe.status,1);assert.equal(probe.stderr,'INERT_EXIT_NOT_VERIFIED');
    // Another executable path must not be confused with this live test child.
    const unrelated=ps(fixture('finance-inert-exit-probe.ps1'),['-ClientPath',f.config.clientPath]);
    assert.equal(unrelated.status,0,unrelated.stderr);
  }finally{if(child.exitCode===null)child.kill();await closed;}
  const ended=ps(fixture('finance-inert-exit-probe.ps1'),['-ClientPath',clientPath]);
  assert.equal(ended.status,0,ended.stderr);
});
test('real protected bridge/controller/journal path verifies synthetic rollback and retains private captures',{skip:!windows},async t=>{
  const f=await setup(t),run=f.makeRun(),r=await run();assert.equal(r.verified,true,JSON.stringify(r));
  assert.equal(r.journalRecorded,true);assert.equal(r.physicalBackendGone,false);assert.equal(r.applicationApproval,false);
  assert.equal(Object.hasOwn(r,'sessionClosed'),false);await starts(f,5);
  assert.equal(r.ledgerUnchanged,true);assert.equal(r.actorsUnchanged,true);
  for(const phase of ['mutation','closure','baseline','ledger','actors']){
    const capture=JSON.parse(await readFile(path.join(f.directory,`pooler-${phase}-capture.json`)));
    assert.equal(capture.phase,phase);assert.equal(capture.result.clientClosed,true);assert.ok(capture.result.stdout);
    assert.doesNotMatch(JSON.stringify(capture),/SYNTHETIC-NOT-A-LIVE-PASSWORD/);
  }
  const outcome=JSON.parse(await readFile(path.join(f.directory,'finance-059-060-outcome.json')));
  assert.equal(outcome.state,'verified-rollback');await assert.rejects(run);await assert.rejects(f.makeRun());await starts(f,5);
});
test('semantic failures still capture independent baseline and preserve failed journal without retry',{skip:!windows},async t=>{
  for(const variant of ['bad-sentinel','committed','drift','ledger-drift','actor-drift']){
    const f=await setup(t,variant),r=await f.makeRun()();assert.equal(r.verified,false,variant);assert.equal(r.journalRecorded,true);
    for(const phase of ['baseline','ledger','actors'])assert.ok((await stat(path.join(f.directory,`pooler-${phase}-capture.json`))).size>0);
    await starts(f,5);
    assert.equal(JSON.parse(await readFile(path.join(f.directory,'finance-059-060-outcome.json'))).state,'failed-or-uncertain');
    await assert.rejects(f.makeRun());await starts(f,5);
  }
});
test('missing claim and reused phase reject before client startup and never overwrite captures',{skip:!windows},async t=>{
  const f=await setup(t),adapters=prepareFinanceProtectedPoolerAdapters(f.config);
  const payload={target:f.config.target,nonce:f.config.nonce,bundleSha256:hash(f.bundle),sql:f.bundle.toString()};
  await assert.rejects(()=>adapters.executeOnce(payload));await assert.rejects(stat(path.join(f.directory,'started.txt')),{code:'ENOENT'});
  await writeFile(path.join(f.directory,'pooler-mutation-capture.json'),'');
  const r=await f.makeRun()();assert.equal(r.verified,false);assert.equal(r.journalRecorded,true);
  assert.equal((await stat(path.join(f.directory,'pooler-mutation-capture.json'))).size,0);
  await starts(f,3); // Independent baseline/ledger/actors only; no mutation/closure dispatch.
});
test('fixed protected factory prepares without I/O/claims and rejects target/path/transport overrides',{skip:!windows},async t=>{
  const f=await setup(t),{directory,bundleSha256,...options}=f.config;
  const c={...options,bundle:f.bundle,reviewedBundleSha256:bundleSha256,releaseEvidence:f.releaseEvidence};
  const before=await readdir(directory);
  assert.equal(typeof prepareFixedProtectedStagingPoolerRollback(c),'function'); // Never invoke real fixed directory.
  for(const extra of [{directory},{executeOnce:()=>{}},{journal:{}},{target:{...c.target,port:6543}},{releaseEvidence:undefined}])
    assert.throws(()=>prepareFixedProtectedStagingPoolerRollback({...c,...extra}));
  assert.deepEqual(await readdir(directory),before);await assert.rejects(stat(path.join(directory,'started.txt')),{code:'ENOENT'});
});
test('resource replacement after preparation records failure without starting a client or reopening phases',{skip:!windows},async t=>{
  const f=await setup(t),run=f.makeRun();
  await writeFile(f.config.rootCertPath,'REPLACED-INERT-CERTIFICATE');
  const result=await run();assert.equal(result.verified,false);assert.equal(result.journalRecorded,true);
  await assert.rejects(stat(path.join(f.directory,'started.txt')),{code:'ENOENT'});
  for(const phase of ['mutation','baseline','ledger','actors']){
    const evidence=JSON.parse(await readFile(path.join(f.directory,`pooler-${phase}-capture.json`)));
    assert.equal(evidence.result.error,'CA_RESOURCE_INVALID');assert.equal(evidence.result.clientClosed,false);
  }
  await assert.rejects(run);await assert.rejects(f.makeRun());
});
