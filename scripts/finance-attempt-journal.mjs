// Persistent, create-once local evidence. NO remote adapter or execution authority.
// The eventual wrapper must pin ONE private directory; never choose a new one to
// bypass an existing claim. Windows ACL verification is mandatory via the caller.
import {open,lstat,realpath,readFile} from 'node:fs/promises';
import path from 'node:path';
import {FINANCE_STAGING_REF} from './finance-rehearsal-target.mjs';

const claimName='finance-059-060-attempt.json';
const outcomeName='finance-059-060-outcome.json';
const hex=(value,length)=>typeof value==='string'&&new RegExp(`^[0-9a-f]{${length}}$`).test(value);
async function privateRoot(directory,assertPrivateDirectory) {
  if(typeof directory!=='string'||!path.isAbsolute(directory)||typeof assertPrivateDirectory!=='function')
    throw Error('Pinned absolute private journal directory required');
  const root=path.resolve(directory);
  // Check every existing ancestor: do not follow a symlink/junction into evidence.
  for(let current=root;;current=path.dirname(current)) {
    const info=await lstat(current);
    if(info.isSymbolicLink()||!info.isDirectory())throw Error('Journal directory cannot traverse links');
    if(path.dirname(current)===current)break;
  }
  if(path.normalize(await realpath(root)).toLowerCase()!==path.normalize(root).toLowerCase())
    throw Error('Journal path mismatch');
  if(await assertPrivateDirectory(root)!==true)throw Error('Private journal ACL not verified');
  return root;
}
async function createOnce(file,value) {
  let handle;
  try {
    handle=await open(file,'wx',0o600);
    await handle.writeFile(JSON.stringify(value)+'\n','utf8');
    await handle.sync();
  } catch {throw Error('Journal create/flush failed or record already exists; do not retry');}
  finally {if(handle)await handle.close();}
}
export async function claimFinanceAttempt({directory,assertPrivateDirectory,nonce,bundleSha256,mode,closureKind='physical-backend'}) {
  if(!hex(nonce,32)||!hex(bundleSha256,64)||!['staging-only','synthetic-local-only'].includes(mode)||
    !['physical-backend','pooler-transaction'].includes(closureKind))
    throw Error('Invalid attempt identity');
  const root=await privateRoot(directory,assertPrivateDirectory);
  // An orphaned outcome is also a stop condition, never permission to reclaim.
  try {await lstat(path.join(root,outcomeName));throw Error('Existing outcome blocks a new attempt');}
  catch(error) {if(error.code!=='ENOENT')throw Error('Existing or unreadable outcome; do not retry');}
  const pooler=closureKind==='pooler-transaction';
  const claim={schemaVersion:pooler?2:1,closureKind,mode,projectRef:mode==='staging-only'?FINANCE_STAGING_REF:null,
    migrations:['059','060'],nonce,bundleSha256,state:'claimed-outcome-unknown',
    claimedAt:new Date().toISOString(),automaticRetryAllowed:false};
  const claimPath=path.join(root,claimName);
  await createOnce(claimPath,claim);
  const bytes=JSON.stringify(claim)+'\n';
  if(await readFile(claimPath,'utf8')!==bytes)throw Error('Journal readback failed; do not dispatch');
  let completed=false;
  return Object.freeze({
    async finish(result) {
      if(completed)throw Error('Attempt outcome already consumed');
      completed=true;
      await privateRoot(root,assertPrivateDirectory);
      const info=await lstat(claimPath);
      if(info.isSymbolicLink()||!info.isFile()||await readFile(claimPath,'utf8')!==bytes)
        throw Error('Attempt claim changed; preserve evidence and stop');
      const closureVerified=pooler?result?.closureVerified:result?.sessionClosed;
      const releaseChecks=!!result&&(Object.hasOwn(result,'ledgerUnchanged')||Object.hasOwn(result,'actorsUnchanged'));
      if(!result||typeof result.verified!=='boolean'||typeof result.expectedSentinel!=='boolean'||
        typeof closureVerified!=='boolean'||typeof result.baselineUnchanged!=='boolean'||
        (releaseChecks&&(!pooler||typeof result.ledgerUnchanged!=='boolean'||typeof result.actorsUnchanged!=='boolean'))||
        (pooler&&(result.closureKind!==closureKind||Object.hasOwn(result,'sessionClosed')||
          (result.physicalBackendGone!==null&&typeof result.physicalBackendGone!=='boolean')||
          (closureVerified&&typeof result.physicalBackendGone!=='boolean')))||
        !Array.isArray(result.failures)||result.automaticRetryAllowed!==false||result.applicationApproval!==false)
        throw Error('Incomplete outcome; claim stays blocked');
      const verified=result.verified&&result.expectedSentinel&&closureVerified&&
        result.baselineUnchanged&&result.failures.length===0&&
        (!releaseChecks||(result.ledgerUnchanged&&result.actorsUnchanged));
      // Never persist raw messages or caller-supplied errors/SQL/secret values.
      const outcome={schemaVersion:pooler?2:1,closureKind,nonce,bundleSha256,state:verified?'verified-rollback':'failed-or-uncertain',
        expectedSentinel:result.expectedSentinel,
        ...(pooler?{closureVerified,physicalBackendGone:result.physicalBackendGone}:{sessionClosed:result.sessionClosed}),
        baselineUnchanged:result.baselineUnchanged,failureCount:result.failures.length,
        ...(releaseChecks?{ledgerUnchanged:result.ledgerUnchanged,actorsUnchanged:result.actorsUnchanged}:{}),
        recordedAt:new Date().toISOString(),automaticRetryAllowed:false,applicationApproval:false};
      await createOnce(path.join(root,outcomeName),outcome);
      return outcome;
    },
  });
}
