// Assembly only; injected protected transport adapters are still required. No
// credentials or live client here. Tests use synthetic evidence/mock transports.
import {createHash} from 'node:crypto';
import {bindFinanceExecutionPayload} from './finance-journaled-rollback.mjs';
import {claimFinanceAttempt} from './finance-attempt-journal.mjs';
import {createRollbackAttempt} from './finance-rollback-attempt.mjs';
import {verifyProtectedFinanceBaseline} from './finance-baseline-capture.mjs';
import {compareFinanceStagingBaselineCaptures} from './finance-staging-baseline.mjs';
import {prepareFinancePoolerRehearsalTarget,buildFinancePoolerClosureSql,verifyFinancePoolerClosure} from './finance-pooler-rehearsal.mjs';
import {prepareFinancePoolerReleaseEvidence} from './finance-pooler-release-evidence.mjs';

function privateBaseline(value){
  if(!value||!Buffer.isBuffer(value.bytes))throw Error('Protected baseline capture required');
  const copy={bytes:Buffer.from(value.bytes),hash:value.hash};
  verifyProtectedFinanceBaseline(copy.bytes,copy.hash);
  return copy;
}
export function prepareFinancePoolerRollback({target,journal,bundle,nonce,baseline,executeOnce,observeClosure,captureAfter,
  releaseEvidence,captureLedgerAfter,captureActorsAfter}){
  const boundTarget=prepareFinancePoolerRehearsalTarget(target).target;
  if(journal?.mode!=='staging-only'||journal.nonce!==nonce||journal.closureKind!=='pooler-transaction'||
    [executeOnce,observeClosure,captureAfter].some(fn=>typeof fn!=='function'))throw Error('Complete explicit pooler adapters/journal required');
  const payload=bindFinanceExecutionPayload({boundTarget,bundle,bundleSha256:journal.bundleSha256,nonce});
  const before=privateBaseline(baseline),beforeSnapshot=JSON.parse(before.bytes).snapshot;
  const journalOptions={...journal};
  // Optional only for the low-level transport harness; both fixed factories require it.
  const releaseGate=releaseEvidence===undefined?null:prepareFinancePoolerReleaseEvidence(releaseEvidence);
  if(releaseGate&&[captureLedgerAfter,captureActorsAfter].some(fn=>typeof fn!=='function'))
    throw Error('Independent ledger and actor capture adapters required');
  let identity=null,clientFinishedAt=null,closure=null,consumed=false,executionReturnedAt=null;
  const attempt=createRollbackAttempt({nonce,baseline:{hash:before.hash},
    executeOnce:async()=>{
      let result;
      try{result=await executeOnce(payload);}finally{executionReturnedAt=new Date().toISOString();}
      if(result?.clientClosed!==true||result.inputWritten!==true||result.inputSha256!==payload.bundleSha256||
        result.error||typeof result.stdout!=='string'||Buffer.byteLength(result.stdout)>1048576)
        throw Error('Bounded client input/completion not verified');
      let candidate;
      try{candidate=JSON.parse(result.stdout.split(/\r?\n/)[0]);}catch{throw Error('Mutation identity missing');}
      // Validates nonce/xid/server/TLS/freshness before retaining identity as usable.
      buildFinancePoolerClosureSql(candidate,{nonce});
      if(['address','port','database','sessionUser','clusterId'].some(k=>candidate[k]!==beforeSnapshot[k])||
        Date.parse(candidate.capturedAt)<Date.parse(beforeSnapshot.capturedAt))throw Error('Mutation differs from baseline server/time');
      if(typeof result.clientFinishedAt!=='string'||!Number.isFinite(Date.parse(result.clientFinishedAt))||
        Date.parse(result.clientFinishedAt)<Date.parse(candidate.capturedAt))throw Error('Invalid client completion time');
      identity=candidate;clientFinishedAt=result.clientFinishedAt;
      return result;
    },
    verifySessionClosed:async()=>{
      if(!identity||typeof clientFinishedAt!=='string')throw Error('Client identity/completion unavailable');
      const sql=buildFinancePoolerClosureSql(identity,{nonce});
      const request=Object.freeze({sql,querySha256:createHash('sha256').update(sql).digest('hex'),target:boundTarget});
      const evidence=await observeClosure(request);
      if(evidence?.clientClosed!==true||evidence.querySha256!==request.querySha256)throw Error('Read-only observer capture not bound');
      closure=verifyFinancePoolerClosure(identity,evidence.snapshot,{nonce,clientFinishedAt});
      return closure.rehearsalScopeClosed;
    },
    captureAfter:async()=>privateBaseline(await captureAfter()),
    compare:(_unused,after)=>{
      const comparison=compareFinanceStagingBaselineCaptures(before.bytes,before.hash,after.bytes,after.hash);
      const afterSnapshot=JSON.parse(after.bytes).snapshot;
      if(identity&&afterSnapshot.backendPid===identity.backendPid)throw Error('Reconciliation reused mutation backend');
      if(clientFinishedAt&&Date.parse(afterSnapshot.capturedAt)<Date.parse(clientFinishedAt))throw Error('Reconciliation predates client completion');
      return comparison;
    }});
  return async()=>{
    if(consumed)throw Error('Pooler attempt already consumed');consumed=true;
    // Revalidate freshness immediately before any claim, not only on preparation.
    verifyProtectedFinanceBaseline(before.bytes,before.hash);
    if(releaseGate)await releaseGate.validateBefore(beforeSnapshot);
    const record=await claimFinanceAttempt(journalOptions);
    const raw=await attempt();
    const {sessionClosed,...rest}=raw;
    const release=releaseGate?await releaseGate.reconcile({captureLedgerAfter,captureActorsAfter,
      notBefore:executionReturnedAt,mutationPid:identity?.backendPid??null}):null;
    const result={...rest,...(release?{ledgerUnchanged:release.ledgerUnchanged,actorsUnchanged:release.actorsUnchanged,
      verified:rest.verified&&release.failures.length===0,failures:[...rest.failures,...release.failures]}:{}),
      closureKind:'pooler-transaction',closureVerified:sessionClosed,
      physicalBackendGone:closure?.physicalBackendGone??null};
    try{
      const outcome=await record.finish(result);
      return {...result,verified:result.verified&&outcome.state==='verified-rollback',journalRecorded:true};
    }catch{
      return {...result,verified:false,journalRecorded:false,failures:[...result.failures,'journal-outcome-not-recorded']};
    }
  };
}
