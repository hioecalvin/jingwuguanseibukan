// Actual psql diagnostic regression; disposable loopback only, no remote adapter.
import assert from 'node:assert/strict';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {prepareFinancePoolerLaunchPlan} from './finance-pooler-launch-plan.mjs';
import {financeReadOnlyStagingTarget} from './finance-staging-baseline.mjs';
import {rollbackSentinelSql,isExpectedRollback} from './finance-rehearsal-transaction.mjs';
import {runFinanceBoundedProcess} from './finance-bounded-process.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
export async function testFinanceSentinelLocal({bin,psqlArgs,env}){
  assert.equal(psqlArgs[psqlArgs.indexOf('-h')+1],'127.0.0.1');
  const executable=path.join(bin,'psql'+(process.platform==='win32'?'.exe':''));
  // Only use this source as inert bytes for OFFLINE certificate hash planning.
  // No TLS connection uses it and no planned staging args/environment are dispatched.
  const inertCert=fileURLToPath(import.meta.url);
  const plan=await prepareFinancePoolerLaunchPlan({target:financeReadOnlyStagingTarget(),purpose:'rollback-rehearsal',
    psqlPath:executable,psqlSha256:hash(await readFile(executable)),rootCertPath:inertCert,
    rootCertSha256:hash(await readFile(inertCert)),ambientEnv:{}});
  const verbosity=plan.args.filter(a=>a.startsWith('VERBOSITY='));assert.deepEqual(verbosity,['VERBOSITY=verbose']);
  const nonce='a'.repeat(32),sql="begin;do $$ begin if inet_server_addr() is distinct from '127.0.0.1'::inet then raise exception 'Local only';end if;end $$;\n"+rollbackSentinelSql(nonce);
  for(const diagnostic of ['VERBOSITY=terse',verbosity[0]]){
    const result=await runFinanceBoundedProcess({executable,args:[...psqlArgs,'-qAt','-v',diagnostic],env,
      input:Buffer.from(sql),timeoutMs:10000});
    assert.equal(result.error,null);assert.equal(result.clientClosed,true);assert.equal(result.status,3);
    assert.equal(isExpectedRollback(result,nonce),diagnostic==='VERBOSITY=verbose');
    if(diagnostic==='VERBOSITY=terse')assert.doesNotMatch(result.stderr,/Z0590/);
  }
  console.log('PASS: actual local psql terse diagnostics omit SQLSTATE and fail the sentinel; protected mutation plan verbose diagnostics pass the exact nonce/SQLSTATE check');
}
