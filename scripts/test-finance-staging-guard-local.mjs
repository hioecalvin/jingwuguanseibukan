// Executes the UNMODIFIED generated guard only on the disposable loopback cluster.
// This proves rejection, not the positive staging/TLS path or live authorization.
import assert from 'node:assert/strict';
import path from 'node:path';
import {stagingGuardFixture} from '../tests/fixtures/finance-staging-guard-evidence.mjs';
import {prepareFinanceStagingRehearsalGuard} from './finance-staging-rehearsal-guard.mjs';
import {prepareFinanceStagingRehearsalBundle} from './finance-staging-rehearsal-bundle.mjs';
import {runFinanceBoundedProcess} from './finance-bounded-process.mjs';
export async function testFinanceStagingGuardLocal({bin,psqlArgs,env,query}){
  assert.equal(psqlArgs[psqlArgs.indexOf('-h')+1],'127.0.0.1');
  const plan=await prepareFinanceStagingRehearsalGuard(await stagingGuardFixture());
  for(const transaction of ['begin;','begin read only;']){
    const result=await runFinanceBoundedProcess({executable:path.join(bin,'psql'+(process.platform==='win32'?'.exe':'')),
      args:[...psqlArgs,'-qAt','-v','VERBOSITY=verbose'],env,
      input:Buffer.from(transaction+'\n'+plan.guardSql+'\nselect 1/0;\nrollback;'),timeoutMs:10000});
    assert.equal(result.status,3);assert.equal(result.clientClosed,true);assert.equal(result.error,null);
    assert.match(result.stderr,/ERROR:  Z0591: JWG_STAGING_GUARD_REJECTED/);
    assert.doesNotMatch(result.stderr,/division by zero|syntax error|does not exist/);
    assert.equal(result.stdout,'');
  }
  assert.equal(query("select count(*) from pg_stat_activity where application_name='jwg-finance-rehearsal-"+plan.nonce+"';"),'0');
  const bundle=await prepareFinanceStagingRehearsalBundle(await stagingGuardFixture());
  const result=await runFinanceBoundedProcess({executable:path.join(bin,'psql'+(process.platform==='win32'?'.exe':'')),
    args:[...psqlArgs,'-qAt','-v','VERBOSITY=verbose'],env,input:Buffer.from(bundle.sql),timeoutMs:10000});
  assert.equal(result.status,3);assert.equal(result.clientClosed,true);assert.equal(result.error,null);
  assert.match(result.stderr,/ERROR:  Z0591: JWG_STAGING_GUARD_REJECTED/);
  assert.doesNotMatch(result.stderr,/syntax error|does not exist/);assert.equal(result.stdout,'');
  assert.equal(query("select count(*) from pg_stat_activity where application_name='jwg-finance-rehearsal-"+bundle.nonce+"';"),'0');
  console.log('PASS: unmodified pinned staging bundle rejects loopback before identity or migration work; no nonce session remains; complete positive path is NOT verified');
  console.log('PASS: unmodified staging pre-work guard compiles on local PG17, rejects both loopback/non-TLS and read-only transactions before account/migration work, and leaves no nonce session; positive staging path remains unverified');
}
