// Explicit pooler preparation only. No credentials, process, network or write API.
// Direct-target and physical-backend-absence guards remain unchanged.
import {financeReadOnlyStagingTarget} from './finance-staging-baseline.mjs';
import {buildFinanceMutationIdentitySql,verifyFinanceMutationIdentity} from './finance-session-closure.mjs';

export function prepareFinancePoolerRehearsalTarget(value){
  const expected=financeReadOnlyStagingTarget();
  if(!value||Object.keys(value).length!==Object.keys(expected).length||
    Object.entries(expected).some(([k,v])=>value[k]!==v))throw Error('Exact explicit staging session-pooler target required');
  return Object.freeze({target:Object.freeze({...expected}),preparedOnly:true,readyToExecute:false,
    remoteContact:false,requiresLiveApproval:true});
}
function check(identity,options){
  verifyFinanceMutationIdentity(identity,options);
  if(typeof identity.transactionId!=='string'||!/^[1-9][0-9]{0,19}$/.test(identity.transactionId)||
    BigInt(identity.transactionId)>18446744073709551615n)throw Error('Full transaction identity required');
}
export function buildFinancePoolerMutationIdentitySql(nonce){
  // Assign an xid8 inside the existing transaction before rehearsal work. Like
  // all PostgreSQL transactions this consumes an ID; no application sequence used.
  return buildFinanceMutationIdentitySql(nonce,{includeTransactionId:true});
}
export function buildFinancePoolerClosureSql(identity,options){
  check(identity,options);
  return `begin read only;
set local search_path=pg_catalog;set local timezone='UTC';
set local statement_timeout='10s';set local lock_timeout='3s';
select jsonb_build_object('nonce','${identity.nonce}','capturedAt',clock_timestamp(),
 'database',current_database(),'sessionUser',session_user,'address',host(inet_server_addr()),'port',inet_server_port(),
 'clusterId',(select system_identifier::text from pg_control_system()),
 'backendPid',pg_backend_pid(),'readOnly',current_setting('transaction_read_only'),
 'ssl',(select ssl from pg_stat_ssl where pid=pg_backend_pid()),
 'targetBackendPid',${identity.backendPid},'targetApplicationName','${identity.applicationName}',
 'transactionId','${identity.transactionId}','transactionStatus',pg_xact_status('${identity.transactionId}'::xid8),
 'matchingSessions',(select coalesce(jsonb_agg(jsonb_build_object('pid',pid,'backendStart',backend_start,
 'state',state,'transactionStart',xact_start,'backendXid',backend_xid::text,'applicationName',application_name)
 order by pid),'[]'::jsonb) from pg_stat_activity
 where pid=${identity.backendPid} or application_name='${identity.applicationName}'));
rollback;`;
}
export function verifyFinancePoolerClosure(identity,observer,{nonce,clientFinishedAt,nowMs=Date.now(),localProbe=false}={}){
  const options={nonce,nowMs,localProbe};check(identity,options);
  // Reuse the tested identity checks without treating the read-only observer as
  // a mutation: supply the original transaction fields, then assert read-only below.
  verifyFinanceMutationIdentity({...observer,readOnly:'off',applicationName:identity.applicationName,
    backendStart:identity.backendStart,transactionStart:identity.transactionStart},options);
  if(['address','port','database','sessionUser','clusterId'].some(k=>observer[k]!==identity[k])||
    observer.readOnly!=='on'||observer.backendPid===identity.backendPid||
    observer.targetBackendPid!==identity.backendPid||observer.targetApplicationName!==identity.applicationName||
    observer.transactionId!==identity.transactionId)throw Error('Independent bound pooler observer required');
  const finished=typeof clientFinishedAt==='string'?Date.parse(clientFinishedAt):NaN;
  if(!Number.isFinite(finished)||finished<Date.parse(identity.capturedAt)||Date.parse(observer.capturedAt)<finished)
    throw Error('Pooler closure must follow client completion');
  if(observer.transactionStatus!=='aborted')throw Error('Rehearsal transaction not proven aborted');
  if(!Array.isArray(observer.matchingSessions)||observer.matchingSessions.length>1)
    throw Error('Ambiguous pooled session evidence');
  for(const row of observer.matchingSessions){
    if(row?.pid!==identity.backendPid||row.backendStart!==identity.backendStart||row.state!=='idle'||
      row.transactionStart!==null||row.backendXid!==null||typeof row.applicationName!=='string'||
      row.applicationName===identity.applicationName)throw Error('Pooled backend not proven quiescent');
  }
  return {scope:localProbe?'synthetic-pooler-closure-model':'offline-pooler-closure',
    transactionAborted:true,rehearsalScopeClosed:true,independentObserver:true,
    physicalBackendGone:observer.matchingSessions.length===0,rollbackBaselineVerified:false,
    readyToExecute:false,applicationApproval:false,remoteContact:false};
}
