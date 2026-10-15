import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,readFile,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {financeReadOnlyStagingTarget,prepareFinanceStagingInventory} from './finance-staging-baseline.mjs';
import {prepareProtectedFinanceBaseline} from './finance-baseline-capture.mjs';
import {prepareFinancePoolerRollback} from './finance-pooler-controller.mjs';
import {prepareFixedStagingPoolerRollback} from './finance-fixed-staging-journal.mjs';
import {claimFinanceAttempt} from './finance-attempt-journal.mjs';
import {releaseEvidenceFixture} from '../tests/fixtures/finance-release-evidence.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const pack=x=>{const bytes=Buffer.from(JSON.stringify(x));return {bytes,hash:hash(bytes)};};

async function setup(t){
  const directory=await mkdtemp(path.join(tmpdir(),'finance-pooler-controller-'));
  t.after(()=>rm(directory,{recursive:true,force:true})); // Only synthetic test evidence.
  const now=Date.now(),at=offset=>new Date(now+offset).toISOString(),nonce='a'.repeat(32);
  const target=financeReadOnlyStagingTarget(),bundle=Buffer.from('-- SYNTHETIC SQL ONLY\n');
  const base={capturedAt:at(-4000),database:'postgres',sessionUser:'postgres',readOnly:'on',ssl:true,
    address:'192.0.2.1',port:5432,clusterId:'12345',backendPid:90,inventory:[{name:'profiles',kind:'r'}]};
  const source=JSON.stringify({schemaVersion:1,kind:'public-finance-inventory',target,
    clientsExitedCleanly:true,querySha256:prepareFinanceStagingInventory(target).querySha256,snapshot:base});
  const plan=prepareProtectedFinanceBaseline(Buffer.from(source),hash(source));
  const before={schemaVersion:1,kind:'public-finance-baseline',target,clientsExitedCleanly:true,
    inventory:plan.inventory,inventoryQuerySha256:plan.inventoryQuerySha256,baselineQuerySha256:plan.querySha256,
    sourceInventoryText:source,sourceInventorySha256:hash(source),snapshot:{...base,backendPid:101,
      capturedAt:at(-3000),catalogDigest:'a'.repeat(64),tables:[{name:'profiles',rowCount:'0',rowDigest:'b'.repeat(64)}],sequences:[]}};
  const after=structuredClone(before);after.snapshot.backendPid=102;after.snapshot.capturedAt=at(0);
  const identity={nonce,capturedAt:at(-2000),database:'postgres',sessionUser:'postgres',clusterId:'12345',
    address:'192.0.2.1',port:5432,backendPid:201,backendStart:at(-5000),transactionStart:at(-2000),
    applicationName:'jwg-finance-rehearsal-'+nonce,readOnly:'off',ssl:true,transactionId:'123456'};
  const observer={...identity,backendPid:202,readOnly:'on',capturedAt:at(0),targetBackendPid:201,
    targetApplicationName:identity.applicationName,transactionStatus:'aborted',
    matchingSessions:[{pid:201,backendStart:identity.backendStart,state:'idle',transactionStart:null,backendXid:null,applicationName:'pool'}]};
  const processResult={status:3,stderr:`ERROR:  Z0590: JWG_FINANCE_ROLLBACK_${nonce}`,error:null,
    clientClosed:true,inputWritten:true,inputSha256:hash(bundle),clientFinishedAt:at(-1000)};
  const counts={execute:0,observe:0,capture:0};
  const config={target,bundle,nonce,baseline:pack(before),journal:{directory,nonce,bundleSha256:hash(bundle),
    mode:'staging-only',closureKind:'pooler-transaction',assertPrivateDirectory:async()=>true},
    executeOnce:async payload=>{
      counts.execute++;assert.equal(payload.sql,'-- SYNTHETIC SQL ONLY\n');
      assert.equal(payload.bundleSha256,hash(payload.sql));assert.ok(Object.isFrozen(payload));
      return {...processResult,stdout:JSON.stringify(identity)+'\n'};
    },
    observeClosure:async request=>{counts.observe++;assert.ok(Object.isFrozen(request));
      assert.match(request.sql,/begin read only/);return {clientClosed:true,querySha256:hash(request.sql),snapshot:observer};},
    captureAfter:async()=>{counts.capture++;return pack(after);}};
  return {config,directory,identity,observer,processResult,after,counts};
}

test('pooler controller binds immutable SQL/baseline and journals retained-backend closure explicitly',async t=>{
  const f=await setup(t),run=prepareFinancePoolerRollback(f.config);
  f.config.bundle.fill(0);f.config.baseline.bytes.fill(0);f.config.journal.nonce='b'.repeat(32);
  const result=await run();assert.equal(result.verified,true);assert.equal(result.journalRecorded,true);
  assert.equal(result.closureVerified,true);assert.equal(result.physicalBackendGone,false);
  assert.equal(Object.hasOwn(result,'sessionClosed'),false);assert.equal(result.applicationApproval,false);
  const outcome=JSON.parse(await readFile(path.join(f.directory,'finance-059-060-outcome.json')));
  assert.equal(outcome.schemaVersion,2);assert.equal(outcome.state,'verified-rollback');
  assert.equal(outcome.closureKind,'pooler-transaction');assert.equal(Object.hasOwn(outcome,'sessionClosed'),false);
  await assert.rejects(run);assert.deepEqual(f.counts,{execute:1,observe:1,capture:1});
});

test('all post-dispatch failures reconcile once and cannot upgrade or retry the attempt',async t=>{
  const changes=[
    f=>f.processResult.clientClosed=false,
    f=>f.processResult.inputSha256='0'.repeat(64),
    f=>f.processResult.clientFinishedAt='invalid',
    f=>f.processResult.stderr='ERROR: wrong sentinel',
    f=>f.identity.clusterId='999',
    f=>f.identity.transactionId='invalid',
    f=>f.observer.transactionStatus='committed',
    f=>f.observer.matchingSessions[0].state='idle in transaction',
    f=>f.config.observeClosure=async()=>({clientClosed:true,querySha256:'0'.repeat(64),snapshot:f.observer}),
    f=>f.after.snapshot.backendPid=101,
    f=>f.after.snapshot.backendPid=201,
    f=>f.after.snapshot.tables[0].rowDigest='c'.repeat(64),
    f=>f.after.snapshot.capturedAt=new Date(Date.parse(f.identity.capturedAt)-500).toISOString(),
    f=>f.config.executeOnce=async()=>{f.counts.execute++;throw Error('SYNTHETIC-PRIVATE-ERROR');},
  ];
  for(const change of changes){
    const f=await setup(t);change(f);const run=prepareFinancePoolerRollback(f.config),result=await run();
    assert.equal(result.verified,false);assert.equal(result.journalRecorded,true);assert.equal(f.counts.capture,1);
    assert.equal(result.automaticRetryAllowed,false);assert.doesNotMatch(JSON.stringify(result),/SYNTHETIC-PRIVATE-ERROR/);
    if(f.identity.clusterId==='999'||f.identity.transactionId==='invalid')assert.equal(f.counts.observe,0);
    await assert.rejects(run);await assert.rejects(()=>prepareFinancePoolerRollback(f.config)());
    assert.equal(f.counts.execute,1);
  }
});

test('invalid preparation creates no claim; fixed entry point rejects overrides without running',async t=>{
  const f=await setup(t);
  for(const change of [{bundle:Buffer.from('changed')},{target:{...f.config.target,port:6543}},
    {baseline:{...f.config.baseline,hash:'0'.repeat(64)}},{nonce:'bad'}])
    assert.throws(()=>prepareFinancePoolerRollback({...f.config,...change}));
  const {journal,...config}=f.config;config.reviewedBundleSha256=journal.bundleSha256;
  const e=await releaseEvidenceFixture();Object.assign(config,{releaseEvidence:e.evidence,
    captureLedgerAfter:e.captureLedgerAfter,captureActorsAfter:e.captureActorsAfter});
  assert.equal(typeof prepareFixedStagingPoolerRollback(config),'function'); // Never invoke real fixed journal.
  for(const change of [{directory:f.directory},{journal},{compare:()=>true},{closureKind:'physical-backend'},{releaseEvidence:undefined}])
    assert.throws(()=>prepareFixedStagingPoolerRollback({...config,...change}));
  assert.deepEqual(await readdir(f.directory),[]);assert.equal(f.counts.execute,0);
});

test('mandatory release prerequisites fail before claiming; post-run evidence controls journal success',async t=>{
  for(const variant of ['stale','capability-server','ok','ledger-failed','actors-changed','mutation-failed']){
    const f=await setup(t),e=await releaseEvidenceFixture();
    const counts={ledger:0,actors:0};
    if(variant==='stale'){
      const c=JSON.parse(e.evidence.ledger.bytes);c.snapshot.capturedAt='2020-01-01T00:00:00Z';e.evidence.ledger=pack(c);
    }
    if(variant==='capability-server'){
      for(const kind of ['capabilities','ledger','actors']){
        const c=JSON.parse(e.evidence[kind].bytes);c.snapshot.clusterId='999';e.evidence[kind]=pack(c);
      }
    }
    const config={...f.config,releaseEvidence:e.evidence,
      captureLedgerAfter:async()=>{counts.ledger++;if(variant==='ledger-failed')throw Error('PRIVATE');return e.captureLedgerAfter();},
      captureActorsAfter:async()=>{counts.actors++;const a=await e.captureActorsAfter();
        if(variant==='actors-changed')a.actors[0].profileDigest='d'.repeat(64);return a;}};
    if(variant==='mutation-failed')config.executeOnce=async()=>{throw Error('PRIVATE');};
    const run=prepareFinancePoolerRollback(config);
    if(variant==='stale'||variant==='capability-server'){
      await assert.rejects(run);assert.deepEqual(await readdir(f.directory),[]);assert.equal(f.counts.execute,0);
      assert.deepEqual(counts,{ledger:0,actors:0});
    }else{
      const result=await run();assert.equal(result.verified,variant==='ok',variant);
      assert.deepEqual(counts,{ledger:1,actors:1});assert.equal(f.counts.capture,1);
      const outcome=JSON.parse(await readFile(path.join(f.directory,'finance-059-060-outcome.json')));
      assert.equal(outcome.state,variant==='ok'?'verified-rollback':'failed-or-uncertain');
      assert.equal(outcome.ledgerUnchanged,result.ledgerUnchanged);assert.equal(outcome.actorsUnchanged,result.actorsUnchanged);
      assert.doesNotMatch(JSON.stringify(result),/PRIVATE/);
    }
    await assert.rejects(run);
  }
});

test('pooler journal rejects legacy closure fields and refuses uncertain physical-backend claims',async t=>{
  for(const change of [{sessionClosed:true},{closureKind:'physical-backend'},{physicalBackendGone:null},
    {ledgerUnchanged:true},{actorsUnchanged:true},{ledgerUnchanged:'true',actorsUnchanged:true}]){
    const f=await setup(t),record=await claimFinanceAttempt(f.config.journal);
    await assert.rejects(()=>record.finish({verified:true,expectedSentinel:true,closureVerified:true,
      closureKind:'pooler-transaction',physicalBackendGone:false,baselineUnchanged:true,failures:[],
      automaticRetryAllowed:false,applicationApproval:false,...change}));
    await assert.rejects(()=>claimFinanceAttempt(f.config.journal));
  }
});

test('journal cannot certify a claimed success with failed ledger or actor reconciliation',async t=>{
  for(const failed of ['ledgerUnchanged','actorsUnchanged']){
    const f=await setup(t),record=await claimFinanceAttempt(f.config.journal);
    const outcome=await record.finish({verified:true,expectedSentinel:true,closureVerified:true,
      closureKind:'pooler-transaction',physicalBackendGone:false,baselineUnchanged:true,failures:[],
      automaticRetryAllowed:false,applicationApproval:false,ledgerUnchanged:true,actorsUnchanged:true,[failed]:false});
    assert.equal(outcome.state,'failed-or-uncertain');assert.equal(outcome[failed],false);
  }
});
