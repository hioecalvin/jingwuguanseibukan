// Future staging entry point, not a CLI or transport. Preparing this controller
// does not create a directory, decrypt credentials or contact a server. The caller
// still needs reviewed SQL/evidence/fixtures, a protected adapter and explicit
// write-rehearsal approval. No live use has been verified or authorized.
import {prepareJournaledRollback} from './finance-journaled-rollback.mjs';
import {assertFinancePrivateDirectory} from './finance-private-directory.mjs';
import {prepareFinancePoolerRollback} from './finance-pooler-controller.mjs';
import {prepareFinanceProtectedPoolerAdapters} from './finance-protected-pooler-adapters.mjs';
import {loadProtectedFinanceEvidence} from './finance-protected-evidence-loader.mjs';
import {prepareFinancePoolerRehearsalTarget} from './finance-pooler-rehearsal.mjs';

export const FINANCE_STAGING_JOURNAL_DIRECTORY='C:\\protected\\jwg-finance-059-060-staging-rehearsal';

export function prepareFixedStagingJournaledRollback(config){
  const keys=['target','bundle','reviewedBundleSha256','attempt'];
  if(!config||Object.keys(config).length!==keys.length||keys.some(k=>!Object.hasOwn(config,k)))
    throw Error('Fixed staging journal accepts no path, mode or ACL overrides');
  const attemptKeys=['nonce','baseline','executeOnce','verifySessionClosed','captureAfter','compare'];
  if(!config.attempt||Object.keys(config.attempt).length!==attemptKeys.length||
    attemptKeys.some(k=>!Object.hasOwn(config.attempt,k)))throw Error('Exact staging attempt adapters required');
  return prepareJournaledRollback({target:config.target,bundle:config.bundle,attempt:config.attempt,
    journal:{directory:FINANCE_STAGING_JOURNAL_DIRECTORY,assertPrivateDirectory:assertFinancePrivateDirectory,
      nonce:config.attempt.nonce,bundleSha256:config.reviewedBundleSha256,mode:'staging-only'}});
}

export function prepareFixedStagingPoolerRollback(config){
  const keys=['target','bundle','reviewedBundleSha256','nonce','baseline','executeOnce','observeClosure','captureAfter',
    'releaseEvidence','captureLedgerAfter','captureActorsAfter'];
  if(!config||Object.keys(config).length!==keys.length||keys.some(k=>!Object.hasOwn(config,k)))
    throw Error('Exact pooler configuration required; no journal/path/ACL/closure overrides');
  const {reviewedBundleSha256,...options}=config;
  if(!config.releaseEvidence)throw Error('Mandatory release evidence required');
  return prepareFinancePoolerRollback({...options,journal:{directory:FINANCE_STAGING_JOURNAL_DIRECTORY,
    assertPrivateDirectory:assertFinancePrivateDirectory,nonce:config.nonce,bundleSha256:reviewedBundleSha256,
    mode:'staging-only',closureKind:'pooler-transaction'}});
}

// Complete protected wiring, still preparation-only until the returned function
// is explicitly invoked with separately approved, reviewed staging evidence/SQL.
export function prepareFixedProtectedStagingPoolerRollback(config){
  const keys=['target','bundle','reviewedBundleSha256','nonce','baseline','releaseEvidence','credentialPath','credentialSha256',
    'clientPath','clientSha256','rootCertPath','rootCertSha256'];
  if(!config||Object.keys(config).length!==keys.length||keys.some(k=>!Object.hasOwn(config,k)))
    throw Error('Exact fixed protected configuration required; no overrides');
  const {bundle,reviewedBundleSha256,releaseEvidence,...options}=config;
  const adapters=prepareFinanceProtectedPoolerAdapters({...options,bundleSha256:reviewedBundleSha256,
    directory:FINANCE_STAGING_JOURNAL_DIRECTORY});
  return prepareFixedStagingPoolerRollback({target:config.target,bundle,reviewedBundleSha256,nonce:config.nonce,
    baseline:config.baseline,releaseEvidence,...adapters});
}

// Additive local-file boundary, not a CLI, live capture adapter or SQL assembler.
// Reads protected evidence only; never invoke the returned controller implicitly.
export async function prepareFixedProtectedStagingPoolerRollbackFromFiles(config){
  const keys=['target','bundle','reviewedBundleSha256','nonce','evidenceFiles','credentialPath','credentialSha256',
    'clientPath','clientSha256','rootCertPath','rootCertSha256'];
  if(!config||Object.keys(config).length!==keys.length||keys.some(k=>!Object.hasOwn(config,k))||!Buffer.isBuffer(config.bundle))
    throw Error('Exact fixed protected file configuration required; no overrides');
  const target=prepareFinancePoolerRehearsalTarget(config.target).target;
  const {evidenceFiles,...options}=config;
  // Freeze caller-owned inputs across the asynchronous file reads.
  options.target={...target};options.bundle=Buffer.from(config.bundle);
  const evidence=await loadProtectedFinanceEvidence(evidenceFiles);
  return prepareFixedProtectedStagingPoolerRollback({...options,...evidence});
}
