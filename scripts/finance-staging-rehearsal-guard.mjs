// Offline pre-work guard only, NOT a staging fixture, complete bundle or executor.
// No transport, credentials, journal claim or mutation is performed here.
import {createHash} from 'node:crypto';
import {verifyProtectedFinanceBaseline} from './finance-baseline-capture.mjs';
import {prepareFinancePoolerReleaseEvidence,financeReleaseEvidenceQuery} from './finance-pooler-release-evidence.mjs';
import {prepareFinancePoolerRehearsalTarget} from './finance-pooler-rehearsal.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const literal=x=>"'"+JSON.stringify(x).replaceAll("'","''")+"'::jsonb";
export async function prepareFinanceStagingRehearsalGuard(config){
  if(!config||Object.keys(config).sort().join(',')!=='baseline,nonce,releaseEvidence,target'||
    typeof config.nonce!=='string'||!/^[a-f0-9]{32}$/.test(config.nonce)||!Buffer.isBuffer(config.baseline?.bytes))
    throw Error('Exact staging guard inputs required');
  const target=prepareFinancePoolerRehearsalTarget(config.target).target,nonce=config.nonce;
  const bytes=Buffer.from(config.baseline.bytes),digest=config.baseline.hash;
  verifyProtectedFinanceBaseline(bytes,digest);
  const baseline=JSON.parse(bytes).snapshot;
  // Snapshot caller-owned evidence before the asynchronous repository comparison.
  const evidence={bindingBytes:Buffer.from(config.releaseEvidence.bindingBytes),
    ...Object.fromEntries(['ledger','actors','capabilities'].map(k=>[k,{
      bytes:Buffer.from(config.releaseEvidence[k].bytes),hash:config.releaseEvidence[k].hash}]))};
  await prepareFinancePoolerReleaseEvidence(evidence).validateBefore(baseline);
  const actor=JSON.parse(evidence.actors.bytes).snapshot;
  return buildFinanceStagingActorGuard(target,nonce,baseline,actor);
}
// Pure shared SQL builder. Callers must validate their own exact ledger contract,
// fresh protected evidence and actor bindings BEFORE invoking this helper.
export function buildFinanceStagingActorGuard(target,nonce,baseline,actor){
  target=prepareFinancePoolerRehearsalTarget(target).target;
  if(typeof nonce!=='string'||!/^[a-f0-9]{32}$/.test(nonce))throw Error('Exact nonce required');
  // The complete source/extended hashes were checked by the reviewed query builder.
  // Reuse its SELECT unchanged; omit only that fixed capture's transaction framing.
  const actorQuery=financeReleaseEvidenceQuery('actors');
  const offset=actorQuery.sql.indexOf('select jsonb_build_object(');
  const tail=actorQuery.sql.slice(offset),ending=/;\s*commit;\s*$/;
  if(offset<0||!ending.test(tail))throw Error('Unexpected reviewed actor-query framing');
  const actorSelect=tail.replace(ending,'');
  const expected={projectRef:target.projectRef,nonce,address:baseline.address,port:baseline.port,
    clusterId:baseline.clusterId,database:baseline.database,sessionUser:baseline.sessionUser,
    baselineAt:baseline.capturedAt,actorsAt:actor.capturedAt,actors:actor.actors};
  const guardSql=`set local search_path=pg_catalog;
set local timezone='UTC';
set local application_name='jwg-finance-rehearsal-${nonce}';
do $finance_staging_guard$
declare expected jsonb := ${literal(expected)}; actual jsonb;
begin
 if expected->>'projectRef' is distinct from 'eomubndonbetszdbhsrj'
    or current_database() is distinct from expected->>'database'
    or session_user::text is distinct from expected->>'sessionUser'
    or current_user::text is distinct from 'postgres'
    or current_setting('transaction_read_only') is distinct from 'off'
    or current_setting('application_name') is distinct from 'jwg-finance-rehearsal-'||(expected->>'nonce')
    or host(inet_server_addr()) is distinct from expected->>'address'
    or inet_server_port() is distinct from (expected->>'port')::integer
    or (select system_identifier::text from pg_control_system()) is distinct from expected->>'clusterId'
    or (select ssl from pg_stat_ssl where pid=pg_backend_pid()) is distinct from true
    or (expected->>'baselineAt')::timestamptz > clock_timestamp()+interval '30 seconds'
    or (expected->>'baselineAt')::timestamptz < clock_timestamp()-interval '5 minutes'
    or (expected->>'actorsAt')::timestamptz > clock_timestamp()+interval '30 seconds'
    or (expected->>'actorsAt')::timestamptz < clock_timestamp()-interval '5 minutes' then
   raise exception using errcode='Z0591',message='JWG_STAGING_GUARD_REJECTED';
 end if;
 select (${actorSelect}) into actual;
 if actual->'actors' is distinct from expected->'actors' then
   raise exception using errcode='Z0591',message='JWG_STAGING_ACTORS_CHANGED';
 end if;
 -- Transaction-local ordering ticket only; not authority outside the pinned assembler.
 perform set_config('jwg.staging_fixture_ticket',jsonb_build_object(
   'projectRef',expected->>'projectRef','nonce',expected->>'nonce','bindings',jsonb_build_object(
     'member',(select a->>'id' from jsonb_array_elements(actual->'actors') a where a->>'jsId'='0101'),
     'admin',(select a->>'id' from jsonb_array_elements(actual->'actors') a where a->>'jsId'='0002'),
     'superAdmin',(select a->>'id' from jsonb_array_elements(actual->'actors') a where a->>'jsId'='0001')))::text,true);
end $finance_staging_guard$;`;
  return Object.freeze({target,nonce,guardSql,guardSha256:hash(guardSql),actorQuerySha256:actorQuery.querySha256,
    preparedOnly:true,completeBundle:false,readyToExecute:false,remoteContact:false});
}
