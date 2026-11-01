// Transport-independent control flow; no credentials, network or SQL execution here.
// Caller must separately authorize/bind the target, reviewed SQL and fresh baseline.
// Currently integrated ONLY with the disposable local PostgreSQL harness.
import {isExpectedRollback,rollbackSentinelSql} from './finance-rehearsal-transaction.mjs';

export function createRollbackAttempt({nonce,baseline,executeOnce,verifySessionClosed,captureAfter,compare}) {
  rollbackSentinelSql(nonce);
  if(!baseline||[executeOnce,verifySessionClosed,captureAfter,compare].some(fn=>typeof fn!=='function'))
    throw Error('Complete rollback attempt adapters and baseline are required');
  // Keep the reviewed baseline stable even if the caller later mutates its object.
  const before=structuredClone(baseline);
  let consumed=false;
  return async function runOnce() {
    if(consumed)throw Error('Rollback attempt already consumed; automatic retry forbidden');
    consumed=true;
    const failures=[];
    let expectedSentinel=false,sessionClosed=false,baselineUnchanged=false;
    try {
      expectedSentinel=isExpectedRollback(await executeOnce(),nonce);
      if(!expectedSentinel)failures.push('unexpected-execution-result');
    } catch {
      // Never expose raw transport errors, SQL output, credentials or member data.
      failures.push('execution-failed-or-uncertain');
    }
    try {
      sessionClosed=await verifySessionClosed()===true;
      if(!sessionClosed)failures.push('mutation-session-not-confirmed-closed');
    } catch {failures.push('mutation-session-closure-check-failed');}
    // Always attempt independent reconciliation, even after a transport failure or
    // uncertain session close. Equality alone cannot turn either into success.
    try {
      const after=await captureAfter();
      const comparison=await compare(structuredClone(before),after);
      baselineUnchanged=comparison?.independentSessions===true&&comparison.unchanged===true&&
        Array.isArray(comparison.differences)&&comparison.differences.length===0;
      if(!baselineUnchanged)failures.push('baseline-changed-or-unverified');
    } catch {failures.push('independent-reconciliation-failed');}
    return {kind:'rollback-attempt-control',verified:failures.length===0,
      expectedSentinel,sessionClosed,baselineUnchanged,failures,
      automaticRetryAllowed:false,applicationApproval:false};
  };
}
