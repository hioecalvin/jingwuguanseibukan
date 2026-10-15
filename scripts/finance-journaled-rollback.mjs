// Control-flow assembly only. No real transport is provided or approved here.
// The caller still needs private Windows ACL validation, fixed journal location,
// fresh remote evidence/actor binding and explicit write-rehearsal authorization.
import {validateFinanceRehearsalTarget} from './finance-rehearsal-target.mjs';
import {claimFinanceAttempt} from './finance-attempt-journal.mjs';
import {createRollbackAttempt} from './finance-rollback-attempt.mjs';
import {createHash} from 'node:crypto';

export function bindFinanceExecutionPayload({boundTarget,bundle,bundleSha256:reviewedHash,nonce}) {
  if(!Buffer.isBuffer(bundle)||!bundle.length||bundle.length>4194304)
    throw Error('Bounded exact SQL bundle bytes required');
  const bytes=Buffer.from(bundle);
  const bundleSha256=createHash('sha256').update(bytes).digest('hex');
  if(reviewedHash!==bundleSha256)throw Error('Journal differs from reviewed SQL bundle');
  let sql;
  try{sql=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);}
  catch{throw Error('SQL bundle must be strict UTF-8');}
  if(sql.includes('\0')||sql.startsWith('\uFEFF')||!Buffer.from(sql,'utf8').equals(bytes))
    throw Error('SQL bundle bytes cannot change during transport');
  // Immutable strings and a frozen target survive mutation of the caller's
  // Buffer/config while the journal is being flushed. This binds transport input,
  // not SQL semantic review or actual server execution, which remain separate.
  return Object.freeze({sql,bundleSha256,nonce,target:boundTarget});
}

export function prepareJournaledRollback({target,journal,attempt,bundle}) {
  const boundTarget=validateFinanceRehearsalTarget(target);
  if(journal?.mode!=='staging-only'||journal.nonce!==attempt?.nonce)
    throw Error('Staging journal and rollback attempt identities must match');
  const payload=bindFinanceExecutionPayload({boundTarget,bundle,bundleSha256:journal.bundleSha256,nonce:attempt.nonce});
  if(typeof attempt.executeOnce!=='function')throw Error('Execution adapter required');
  const dispatch=attempt.executeOnce;
  const options={...journal};
  const runAttempt=createRollbackAttempt({...attempt,executeOnce:()=>dispatch(payload)});
  let consumed=false;
  return async()=>{
    if(consumed)throw Error('Journaled attempt already consumed');
    consumed=true;
    // Claim and flush BEFORE executeOnce can run. Existing evidence never cleared.
    const record=await claimFinanceAttempt(options);
    const result=await runAttempt();
    try {
      const outcome=await record.finish(result);
      return {...result,verified:result.verified&&outcome.state==='verified-rollback',journalRecorded:true};
    } catch {
      // Reconciliation has already happened. Do not repeat execution, erase the
      // claimed record or disclose the filesystem/transport error.
      return {...result,verified:false,journalRecorded:false,
        failures:[...result.failures,'journal-outcome-not-recorded']};
    }
  };
}
