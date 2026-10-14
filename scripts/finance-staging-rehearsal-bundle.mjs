// Offline assembly only. No credentials, transport, journal claim or execution.
// Hashes pin reviewed bytes; they do not prove live provenance or semantic safety.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {prepareFinanceStagingRehearsalGuard} from './finance-staging-rehearsal-guard.mjs';
import {buildFinancePoolerMutationIdentitySql} from './finance-pooler-rehearsal.mjs';
import {reviewedMigrationBody,rollbackSentinelSql} from './finance-rehearsal-transaction.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const sources=Object.freeze({
  '059':Object.freeze(['supabase/pending/059_advance_subscription_payment_records.sql','e2e4defb705cf9216dac32946ca61c029477a9062bf92b7f0ba777d4d070f406']),
  '060':Object.freeze(['supabase/pending/060_selected_month_fee_adjustment.sql','482ad4c3de6126123fac4250978f81c32c368ed50940287ba3a6b03b0a588b5d']),
  fixture:Object.freeze(['tests/sql/059_060_staging_fixture.sql','66d9cb9f3ce6c0836e3c67bf0a6cdc9ee3560145dafb3c2f5d2c6ca3c152aaea']),
  assertions:Object.freeze(['tests/sql/059_060_staging_fixture_assertions.sql','1859df0eea2b855a42306eaf9ba7cfe244abd3b2fad68c9b850482c9d8e14066']),
});
// Pure verification seam; the assembler itself accepts no source bytes or paths.
export function verifiedFinanceStagingSource(kind,bytes){
  if(!Object.hasOwn(sources,kind)||!Buffer.isBuffer(bytes)||hash(bytes)!==sources[kind][1])
    throw Error('Unreviewed staging component bytes');
  return bytes.toString('utf8');
}
export async function prepareFinanceStagingRehearsalBundle(config){
  // The guard snapshots all caller-owned inputs synchronously before its first await.
  const guard=await prepareFinanceStagingRehearsalGuard(config);
  const parts=Object.fromEntries(Object.entries(sources).map(([kind,[file]])=>[
    kind,verifiedFinanceStagingSource(kind,readFileSync(new URL('../'+file,import.meta.url)))]));
  const framing=`begin read write;
set local statement_timeout='15s';
set local lock_timeout='3s';
set local idle_in_transaction_session_timeout='15s';
set local plpgsql.check_asserts=on;`;
  const identity=buildFinancePoolerMutationIdentitySql(guard.nonce);
  // Identity is the first result row. Guard rejection therefore emits no identity.
  // The sentinel intentionally aborts; the future runner must use ON_ERROR_STOP,
  // close the client, and independently verify abort and complete zero-residue state.
  const sql=[framing,guard.guardSql,identity,reviewedMigrationBody('059',parts['059']),
    reviewedMigrationBody('060',parts['060']),parts.fixture,parts.assertions,
    rollbackSentinelSql(guard.nonce)].join('\n');
  return Object.freeze({target:guard.target,nonce:guard.nonce,sql,sha256:hash(sql),
    componentSha256:Object.freeze(Object.fromEntries(Object.entries(sources).map(([k,v])=>[k,v[1]]))),
    guardSha256:guard.guardSha256,identitySha256:hash(identity),actorQuerySha256:guard.actorQuerySha256,
    preparedOnly:true,completeBundle:true,readyToExecute:false,remoteContact:false});
}
