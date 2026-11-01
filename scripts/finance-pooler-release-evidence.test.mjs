import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {releaseEvidenceFixture,pack} from '../tests/fixtures/finance-release-evidence.mjs';
import {prepareFinancePoolerReleaseEvidence,financeReleaseEvidenceQuery} from './finance-pooler-release-evidence.mjs';

test('release gate copies pinned prerequisites and independently reconciles exact ledger/accounts',async()=>{
  const f=await releaseEvidenceFixture(),gate=prepareFinancePoolerReleaseEvidence(f.evidence);
  f.evidence.ledger.bytes.fill(0);f.evidence.actors.bytes.fill(0);f.evidence.bindingBytes.fill(0);
  await gate.validateBefore(f.server);
  const result=await gate.reconcile({...f,notBefore:new Date().toISOString(),mutationPid:201});
  assert.deepEqual(result,{ledgerUnchanged:true,actorsUnchanged:true,failures:[]});
  assert.throws(()=>financeReleaseEvidenceQuery('mutation'));
  for(const kind of ['ledger','actors'])assert.match(financeReleaseEvidenceQuery(kind).sql,/repeatable read read only/);
});

test('mandatory prerequisites reject absent, stale, corrupt, wrong-target or ineligible evidence',async()=>{
  for(const variant of ['missing','hash','binding','target','tls','ledger-stale','actors-stale','ledger-content','actor-ineligible']){
    const f=await releaseEvidenceFixture(),e=f.evidence;
    if(variant==='missing')delete e.ledger;
    if(variant==='hash')e.ledger.hash='0'.repeat(64);
    if(variant==='binding')e.bindingBytes=Buffer.from('{}');
    if(['target','tls','ledger-stale','ledger-content'].includes(variant)){
      const c=JSON.parse(e.ledger.bytes);
      if(variant==='target')c.projectRef='other';
      if(variant==='tls')c.snapshot.ssl=false;
      if(variant==='ledger-stale')c.snapshot.capturedAt='2020-01-01T00:00:00Z';
      if(variant==='ledger-content')c.snapshot.ledger.pop();
      e.ledger=pack(c);
    }
    if(['actors-stale','actor-ineligible'].includes(variant)){
      const c=JSON.parse(e.actors.bytes);
      if(variant==='actors-stale')c.snapshot.capturedAt='2020-01-01T00:00:00Z';
      else c.snapshot.actors[0].deceased=true;
      e.actors=pack(c);
    }
    await assert.rejects(async()=>prepareFinancePoolerReleaseEvidence(e).validateBefore(f.server),variant);
  }
});

test('post-run drift, missing evidence, reused backend and old captures fail while both checks run',async()=>{
  for(const variant of ['ledger-catalog','ledger-storage','actor-profile','actor-membership','actor-assignment','ledger-missing',
    'actor-missing','ledger-backend','actor-backend','mutation-backend','before-completion','tls']){
    const f=await releaseEvidenceFixture(),gate=prepareFinancePoolerReleaseEvidence(f.evidence);
    const l=await f.captureLedgerAfter(),a=await f.captureActorsAfter();
    const notBefore=new Date(Date.now()-1000).toISOString();
    if(variant==='ledger-catalog')l.ledgerCatalogDigest='b'.repeat(64);
    if(variant==='ledger-storage')l.ledger[0].statements[0]='\n'+l.ledger[0].statements[0];
    if(variant==='actor-profile')a.actors[0].profileDigest='b'.repeat(64);
    if(variant==='actor-membership')a.actors[0].membershipsDigest='c'.repeat(64);
    if(variant==='actor-assignment')a.actors[1].assignmentsDigest='d'.repeat(64);
    if(variant==='ledger-backend')l.backendPid=f.ledger.backendPid;
    if(variant==='actor-backend')a.backendPid=f.actors.backendPid;
    if(variant==='mutation-backend')a.backendPid=201;
    if(variant==='before-completion')l.capturedAt=new Date(Date.parse(notBefore)-1).toISOString();
    if(variant==='tls')l.ssl=false;
    const calls=[];
    const r=await gate.reconcile({notBefore,mutationPid:201,
      captureLedgerAfter:async()=>{calls.push('ledger');if(variant==='ledger-missing')throw Error('PRIVATE-SQL');return l;},
      captureActorsAfter:async()=>{calls.push('actors');if(variant==='actor-missing')throw Error('PRIVATE-ACTOR');return a;}});
    assert.equal(r.failures.length,1,variant);assert.deepEqual(calls,['ledger','actors']);
    assert.doesNotMatch(JSON.stringify(r),/PRIVATE|10000000/);
  }
});

test('preparation never freezes the clock: expired prerequisites cannot pass the preclaim recheck',async()=>{
  const f=await releaseEvidenceFixture(),gate=prepareFinancePoolerReleaseEvidence(f.evidence);
  await gate.validateBefore(f.server);
  const original=Date.now,later=Date.now()+301000;
  try{Date.now=()=>later;await assert.rejects(gate.validateBefore(f.server),/Fresh/);}
  finally{Date.now=original;}
});

test('version-2 queries are pinned through the protected bridge and preserve historical read-only files',async()=>{
  const bridge=await readFile(new URL('./finance-protected-pooler-bridge.ps1',import.meta.url),'utf8');
  for(const kind of ['ledger','actors']){
    const plan=financeReleaseEvidenceQuery(kind);
    assert.equal(plan.schemaVersion,2);assert.notEqual(plan.querySha256,plan.sourceQuerySha256);
    assert.ok(bridge.includes(plan.querySha256));assert.ok(!bridge.includes(plan.sourceQuerySha256));
    assert.match(plan.sql,/'address',host\(inet_server_addr\(\)\)/);
    assert.match(plan.sql,/'clusterId',\(select system_identifier::text from pg_catalog.pg_control_system\(\)\)/);
    assert.match(plan.sql,/begin isolation level repeatable read read only;/);
  }
});

test('old envelopes and wrong or missing server identities cannot satisfy preclaim evidence',async()=>{
  for(const kind of ['ledger','actors'])for(const variant of ['v1','query','source','client','address','port','cluster','missing','binding']){
    const f=await releaseEvidenceFixture(),c=JSON.parse(f.evidence[kind].bytes);
    if(variant==='v1')c.schemaVersion=1;
    if(variant==='query')c.querySha256=c.sourceQuerySha256;
    if(variant==='source')c.sourceQuerySha256='0'.repeat(64);
    if(variant==='client')c.clientsExitedCleanly=false;
    if(variant==='address')c.snapshot.address='192.0.2.2';
    if(variant==='port')c.snapshot.port=6432;
    if(variant==='cluster')c.snapshot.clusterId='999';
    if(variant==='missing')delete c.snapshot.clusterId;
    if(variant==='binding'){
      if(kind==='ledger')c.kind='actors';else c.bindingSha256='0'.repeat(64);
    }
    f.evidence[kind]=pack(c);
    assert.throws(()=>prepareFinancePoolerReleaseEvidence(f.evidence),kind+':'+variant);
  }
});

test('unchanged data from a different or unidentified after-server cannot pass reconciliation',async()=>{
  for(const kind of ['ledger','actors'])for(const field of ['address','port','clusterId']){
    const f=await releaseEvidenceFixture(),gate=prepareFinancePoolerReleaseEvidence(f.evidence),calls=[];
    const captures={ledger:await f.captureLedgerAfter(),actors:await f.captureActorsAfter()};
    delete captures[kind][field];
    const r=await gate.reconcile({notBefore:new Date(Date.now()-1000).toISOString(),mutationPid:201,
      captureLedgerAfter:async()=>{calls.push('ledger');return captures.ledger;},
      captureActorsAfter:async()=>{calls.push('actors');return captures.actors;}});
    assert.equal(r.failures.length,1);assert.equal(r[kind==='ledger'?'ledgerUnchanged':'actorsUnchanged'],false);
    assert.deepEqual(calls,['ledger','actors']);
  }
});
