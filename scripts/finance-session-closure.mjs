// Pure SQL/evidence helpers. No connection or authority to run a write rehearsal.
// Capture identity inside the already-open mutation transaction, before its work.
import {isIP} from 'node:net';
const nonceValid=n=>typeof n==='string'&&/^[a-f0-9]{32}$/.test(n);
const stamp=x=>typeof x==='string'?Date.parse(x):NaN;
const app=n=>'jwg-finance-rehearsal-'+n;
function nonceCheck(n){if(!nonceValid(n))throw Error('Exact rehearsal nonce required');}
function checkIdentity(row,nonce,nowMs,localProbe){
  nonceCheck(nonce);
  if(!row||row.nonce!==nonce||row.database!=='postgres'||row.sessionUser!=='postgres'||
    typeof row.clusterId!=='string'||!/^\d+$/.test(row.clusterId)||
    !Number.isInteger(row.backendPid)||row.backendPid<1||!Number.isInteger(row.port)||row.port<1||row.port>65535||
    typeof row.address!=='string'||!isIP(row.address)||
    (localProbe?row.address!=='127.0.0.1':row.ssl!==true||row.address.startsWith('127.')||row.address==='::1')||
    !Number.isFinite(nowMs)||!Number.isFinite(stamp(row.capturedAt))||
    stamp(row.capturedAt)>nowMs+30000||nowMs-stamp(row.capturedAt)>300000)
    throw Error('Fresh complete closure identity required');
}
export function buildFinanceMutationIdentitySql(nonce,{includeTransactionId=false}={}){
  nonceCheck(nonce);
  if(typeof includeTransactionId!=='boolean')throw Error('Explicit transaction identity mode required');
  return `set local application_name='${app(nonce)}';
select jsonb_build_object('nonce','${nonce}','capturedAt',clock_timestamp(),
 'database',current_database(),'sessionUser',session_user,'address',host(inet_server_addr()),'port',inet_server_port(),
 'clusterId',(select system_identifier::text from pg_catalog.pg_control_system()),
 'backendPid',pg_backend_pid(),'backendStart',(select backend_start from pg_catalog.pg_stat_activity where pid=pg_backend_pid()),
 'transactionStart',(select xact_start from pg_catalog.pg_stat_activity where pid=pg_backend_pid()),
 'applicationName',current_setting('application_name'),'readOnly',current_setting('transaction_read_only'),
 ${includeTransactionId?"'transactionId',pg_catalog.pg_current_xact_id()::text,\n ":''}'ssl',(select ssl from pg_catalog.pg_stat_ssl where pid=pg_backend_pid()));`;
}
export function verifyFinanceMutationIdentity(identity,{nonce,nowMs=Date.now(),localProbe=false}={}){
  checkIdentity(identity,nonce,nowMs,localProbe);
  if(identity.applicationName!==app(nonce)||identity.readOnly!=='off'||
    !Number.isFinite(stamp(identity.backendStart))||!Number.isFinite(stamp(identity.transactionStart))||
    stamp(identity.backendStart)>stamp(identity.transactionStart)||stamp(identity.transactionStart)>stamp(identity.capturedAt))
    throw Error('Mutation transaction identity incomplete');
}
export function buildFinanceSessionClosureSql(identity,{nonce,nowMs=Date.now(),localProbe=false}={}){
  verifyFinanceMutationIdentity(identity,{nonce,nowMs,localProbe});
  // Conservatively reject PID reuse too. Never terminate/cancel any backend.
  return `begin read only;
set local search_path=pg_catalog;set local timezone='UTC';
set local statement_timeout='10s';set local lock_timeout='3s';
select jsonb_build_object('nonce','${nonce}','capturedAt',clock_timestamp(),
 'database',current_database(),'sessionUser',session_user,'address',host(inet_server_addr()),'port',inet_server_port(),
 'clusterId',(select system_identifier::text from pg_control_system()),
 'backendPid',pg_backend_pid(),'readOnly',current_setting('transaction_read_only'),
 'ssl',(select ssl from pg_stat_ssl where pid=pg_backend_pid()),
 'targetBackendPid',${identity.backendPid},'targetApplicationName','${app(nonce)}',
 'remaining',(select coalesce(jsonb_agg(jsonb_build_object('pid',pid,'state',state) order by pid),'[]'::jsonb)
 from pg_stat_activity where pid=${identity.backendPid} or application_name='${app(nonce)}'));
rollback;`;
}
export function verifyFinanceSessionClosure(identity,observer,{nonce,clientFinishedAt,nowMs=Date.now(),localProbe=false}={}){
  verifyFinanceMutationIdentity(identity,{nonce,nowMs,localProbe});
  checkIdentity(observer,nonce,nowMs,localProbe);
  if(['address','port','database','sessionUser','clusterId'].some(k=>identity[k]!==observer[k]))throw Error('Closure observer target mismatch');
  if(observer.readOnly!=='on'||observer.backendPid===identity.backendPid||
    observer.targetBackendPid!==identity.backendPid||observer.targetApplicationName!==app(nonce))throw Error('Independent bound closure observer required');
  if(!Number.isFinite(stamp(clientFinishedAt))||stamp(clientFinishedAt)<stamp(identity.capturedAt)||
    stamp(observer.capturedAt)<stamp(clientFinishedAt))throw Error('Closure capture must follow client completion');
  if(!Array.isArray(observer.remaining)||observer.remaining.length!==0)throw Error('Mutation backend or nonce session still present');
  return {scope:localProbe?'synthetic-loopback-session-closure':'offline-session-closure',
    sessionClosed:true,independentObserver:true,remoteContact:false,remoteProvenanceIndependentlyVerified:false,
    rollbackVerified:false,applicationApproval:false};
}
