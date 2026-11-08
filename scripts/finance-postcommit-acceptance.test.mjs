import test from 'node:test';
import assert from 'node:assert/strict';
import {stagingGuardFixture} from '../tests/fixtures/finance-staging-guard-evidence.mjs';
import {financeApplicationComponents} from './finance-staging-application-bundle.mjs';
import {prepareFinancePostcommitAcceptance,verifyFinancePostcommitLedger,verifyFinancePostcommitAcceptance} from './finance-postcommit-acceptance.mjs';
async function fixture(){
  const c=await stagingGuardFixture({includeFinanceInventory:true});
  const decode=x=>JSON.parse(x.bytes).snapshot;
  const baseline=decode(c.baseline),ledger=decode(c.releaseEvidence.ledger);
  ledger.ledger.push(...financeApplicationComponents().rows);
  return {target:c.target,nonce:c.nonce,baseline,ledger,actors:decode(c.releaseEvidence.actors),
    capabilities:decode(c.releaseEvidence.capabilities),bindings:JSON.parse(c.releaseEvidence.bindingBytes).bindings,
    acceptedCatalogDigest:baseline.catalogDigest,acceptedLedgerCatalogDigest:ledger.ledgerCatalogDigest};
}
test('post-commit assembly accepts exact 006-060 and contains fixtures but no migration application',async()=>{
  const c=await fixture(),p=await prepareFinancePostcommitAcceptance(c),components=financeApplicationComponents();
  assert.equal(p.migrationsReapplied,false);assert.equal(p.readyToExecute,false);
  assert.ok(p.sql.includes(components.parts.fixture));assert.ok(p.sql.includes(components.parts.assertions));
  assert.ok(!p.sql.includes(components.ddl));
  const executable=p.sql.replace(/'(?:''|[^'])*'/gs,"''");
  assert.doesNotMatch(executable,/\bcommit\s*;|insert into supabase_migrations|alter table|create or replace function/i);
  assert.match(executable,/set local row_security=on/);
  assert.ok(p.sql.indexOf('JWG_POSTCOMMIT_BASELINE_CHANGED')<p.sql.indexOf(components.parts.fixture));
  assert.ok(p.sql.endsWith('end $rollback_sentinel$;'));
});
test('ledger checks all 55 exact rows without relaxing historical recovery contract',async()=>{
  const c=await fixture();assert.equal((await verifyFinancePostcommitLedger(c.ledger)).migrationCount,55);
  for(const change of [s=>s.ledger.pop(),s=>s.ledger.push(s.ledger[0]),s=>s.ledger.reverse(),
    s=>s.ledger[0].name='wrong',s=>s.ledger[0].statements=['select 1'],
    s=>s.ledger[53].statements=['select 1'],s=>s.ledger[54].name='wrong',
    s=>s.ssl=false,s=>s.capturedAt='2020-01-01',s=>s.ledgerCatalogDigest='invalid']){
    const s=structuredClone(c.ledger);change(s);await assert.rejects(verifyFinancePostcommitLedger(s));
  }
});
test('post-commit guard rejects stale, mismatched, rebound or caller-overridden inputs',async()=>{
  const c=await fixture();
  for(const change of [s=>s.sql='commit;',s=>s.target.projectRef='other',s=>s.nonce="';commit;--",
    s=>s.baseline.capturedAt='2020-01-01',s=>s.actors.capturedAt='2020-01-01',
    s=>s.capabilities.allStatsVisible=false,s=>s.ledger.clusterId='other',
    s=>s.acceptedCatalogDigest='0'.repeat(64),s=>s.acceptedLedgerCatalogDigest='0'.repeat(64),
    s=>s.bindings.admin=s.bindings.member,s=>s.actors.actors[0].profileDigest='invalid']){
    const s=structuredClone(c);change(s);await assert.rejects(prepareFinancePostcommitAcceptance(s));
  }
});
test('post-commit plan snapshots mutable inputs before awaiting repository verification',async()=>{
  const c=await fixture(),p=prepareFinancePostcommitAcceptance(c);
  c.nonce='b'.repeat(32);c.ledger.ledger.length=0;c.baseline.catalogDigest='0'.repeat(64);
  assert.equal((await p).nonce,'a'.repeat(32));
});
async function accepted(){
  const config=await fixture(),at=new Date().toISOString(),pid=401,observerPid=402;
  const identity={...config.baseline,nonce:config.nonce,backendPid:pid,readOnly:'off',capturedAt:at,
    backendStart:at,transactionStart:at,transactionId:'123456',applicationName:'jwg-finance-rehearsal-'+config.nonce};
  const result={clientClosed:true,inputWritten:true,error:null,status:3,clientFinishedAt:at,
    stdout:JSON.stringify(identity)+'\n',stderr:`ERROR:  Z0590: JWG_FINANCE_ROLLBACK_${config.nonce}\n`};
  const closure={...identity,backendPid:observerPid,readOnly:'on',targetBackendPid:pid,
    targetApplicationName:identity.applicationName,transactionStatus:'aborted',matchingSessions:[]};
  return {config,result,closure,...Object.fromEntries(['baseline','ledger','actors'].map(k=>
    [k,{...structuredClone(config[k]),backendPid:observerPid,capturedAt:at}]))};
}
test('independent post-commit abort and complete baseline pass; residue and weak closure fail',async()=>{
  const good=await accepted();assert.equal((await verifyFinancePostcommitAcceptance(good)).zeroResidue,true);
  for(const change of [s=>s.result.status=0,s=>s.result.clientClosed=false,s=>s.result.stderr+='ERROR: extra\n',
    s=>s.closure.transactionStatus='committed',s=>s.closure.backendPid=401,
    s=>s.baseline.backendPid=s.config.baseline.backendPid,s=>s.baseline.tables[0].rowCount='99',
    s=>s.baseline.catalogDigest='0'.repeat(64),s=>s.ledger.ledgerCatalogDigest='0'.repeat(64),
    s=>s.actors.actors[0].profileDigest='0'.repeat(64)]){
    const bad=structuredClone(good);change(bad);await assert.rejects(verifyFinancePostcommitAcceptance(bad));
  }
});
