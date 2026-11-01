import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {prepareJournaledRollback} from './finance-journaled-rollback.mjs';
import {FINANCE_STAGING_REF} from './finance-rehearsal-target.mjs';
import {createHash} from 'node:crypto';
import {prepareFixedStagingJournaledRollback,FINANCE_STAGING_JOURNAL_DIRECTORY} from './finance-fixed-staging-journal.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
async function options(t) {
  const directory=await mkdtemp(path.join(tmpdir(),'finance-journal-controller-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const nonce='a'.repeat(32),bundle=Buffer.from('-- SYNTHETIC MOCK ONLY 精武館\r\nbegin;rollback;\n');let dispatches=0;
  return {count:()=>dispatches,bundle,target:{projectRef:FINANCE_STAGING_REF,host:`db.${FINANCE_STAGING_REF}.supabase.co`,
    port:5432,database:'postgres',user:'postgres',sslmode:'verify-full'},
    journal:{directory,nonce,bundleSha256:hash(bundle),mode:'staging-only',assertPrivateDirectory:async()=>true},
    attempt:{nonce,baseline:{id:'synthetic'},executeOnce:async payload=>{
      // Logical staging-target strings, but ONLY mock transport and synthetic files.
      dispatches++;
      const claim=JSON.parse(await readFile(path.join(directory,'finance-059-060-attempt.json'),'utf8'));
      assert.equal(hash(Buffer.from(payload.sql,'utf8')),claim.bundleSha256);
      assert.equal(payload.bundleSha256,claim.bundleSha256);assert.equal(payload.nonce,claim.nonce);
      assert.ok(Object.isFrozen(payload));assert.ok(Object.isFrozen(payload.target));
      return {status:3,stderr:`ERROR:  Z0590: JWG_FINANCE_ROLLBACK_${nonce}`};},
    verifySessionClosed:async()=>true,captureAfter:async()=>({id:'synthetic'}),
    compare:()=>({independentSessions:true,unchanged:true,differences:[]})}};
}
test('journal is recorded before dispatch and outcome persists without unlocking',async t=>{
  const config=await options(t);const run=prepareJournaledRollback(config);const result=await run();
  assert.equal(result.verified,true);assert.equal(result.journalRecorded,true);assert.equal(config.count(),1);
  await assert.rejects(prepareJournaledRollback(config));assert.equal(config.count(),1);
});

test('changed, absent, oversized or non-UTF8 bundle cannot claim journal or dispatch',async t=>{
  const config=await options(t);
  for(const bundle of [undefined,'sql',Buffer.alloc(0),Buffer.alloc(4194305),Buffer.from([255]),
    Buffer.from('\uFEFFbegin;'),Buffer.from('begin;\0'),Buffer.from('different bytes')]){
    const journal={...config.journal};
    if(Buffer.isBuffer(bundle)&&!bundle.equals(Buffer.from('different bytes')))journal.bundleSha256=hash(bundle);
    assert.throws(()=>prepareJournaledRollback({...config,journal,bundle}));
  }
  assert.equal(config.count(),0);
  await assert.rejects(readFile(path.join(config.journal.directory,'finance-059-060-attempt.json')),{code:'ENOENT'});
});

test('prepared SQL, digest, target and execution callback are isolated from caller mutation',async t=>{
  const config=await options(t),expectedSql=config.bundle.toString('utf8');
  const original=config.attempt.executeOnce;
  config.attempt.executeOnce=async payload=>{assert.equal(payload.sql,expectedSql);return original(payload);};
  const run=prepareJournaledRollback(config);
  config.bundle.fill(0);config.journal.bundleSha256='0'.repeat(64);config.target.host='invalid';
  config.attempt.executeOnce=()=>{throw Error('Replaced adapter must never run');};
  assert.equal((await run()).verified,true);assert.equal(config.count(),1);
});

test('execution failure with a bound payload still reconciles, persists failure and blocks reuse',async t=>{
  const config=await options(t);let closures=0,reconciliations=0;
  config.attempt.executeOnce=async()=>{throw Error('private transport detail');};
  config.attempt.verifySessionClosed=async()=>{closures++;return false;};
  config.attempt.captureAfter=async()=>{reconciliations++;return {};};
  const run=prepareJournaledRollback(config),result=await run();
  assert.equal(result.verified,false);assert.equal(result.journalRecorded,true);
  assert.equal(closures,1);assert.equal(reconciliations,1);
  assert.ok(!JSON.stringify(result).includes('private transport detail'));
  await assert.rejects(run);
});

test('fixed staging preparation has no path, mode or ACL override and never executes on preparation',async t=>{
  const base=await options(t),config={target:base.target,bundle:base.bundle,reviewedBundleSha256:base.journal.bundleSha256,attempt:base.attempt};
  assert.equal(FINANCE_STAGING_JOURNAL_DIRECTORY,'C:\\protected\\jwg-finance-059-060-staging-rehearsal');
  // DO NOT run: fixed real path is never created or claimed by these unit tests.
  assert.equal(typeof prepareFixedStagingJournaledRollback(config),'function');
  for(const extra of [{directory:base.journal.directory},{journal:base.journal},{mode:'synthetic-local-only'},
    {assertPrivateDirectory:async()=>true}])assert.throws(()=>prepareFixedStagingJournaledRollback({...config,...extra}));
  assert.throws(()=>prepareFixedStagingJournaledRollback({...config,attempt:{...config.attempt,path:'other'}}));
  assert.throws(()=>prepareFixedStagingJournaledRollback({...config,target:{...config.target,host:'aws-0-ap-southeast-2.pooler.supabase.com'}}));
  assert.throws(()=>prepareFixedStagingJournaledRollback({...config,reviewedBundleSha256:'0'.repeat(64)}));
  assert.equal(base.count(),0);
});
test('existing claim blocks dispatch, even from a new controller',async t=>{
  const config=await options(t);
  await writeFile(path.join(config.journal.directory,'finance-059-060-attempt.json'),'uncertain');
  await assert.rejects(prepareJournaledRollback(config));assert.equal(config.count(),0);
});
test('failed outcome persistence cannot be reported as success or rerun',async t=>{
  const config=await options(t);let checks=0;config.journal.assertPrivateDirectory=async()=>++checks===1;
  const run=prepareJournaledRollback(config);const result=await run();
  assert.equal(result.verified,false);assert.equal(result.journalRecorded,false);
  assert.ok(result.failures.includes('journal-outcome-not-recorded'));
  await assert.rejects(run);assert.equal(config.count(),1);
});
test('wrong target and mismatched nonce cannot reach journal or execution',async t=>{
  const config=await options(t);
  assert.throws(()=>prepareJournaledRollback({...config,target:{...config.target,sslmode:'require'}}));
  assert.throws(()=>prepareJournaledRollback({...config,journal:{...config.journal,nonce:'c'.repeat(32)}}));
  assert.equal(config.count(),0);
});
