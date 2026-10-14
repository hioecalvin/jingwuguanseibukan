// Pure read-only SQL preparation and offline verification. No capture transport,
// credentials or permission to execute. Hashes bind content, not live provenance.
import {createHash} from 'node:crypto';
import {isIP} from 'node:net';
import {prepareFinancePoolerRehearsalTarget} from './finance-pooler-rehearsal.mjs';
import {financeReadOnlyStagingTarget} from './finance-staging-baseline.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const sql=`begin isolation level repeatable read read only;
set local search_path=pg_catalog;set local timezone='UTC';
set local statement_timeout='10s';set local lock_timeout='3s';
select jsonb_build_object(
 'capturedAt',clock_timestamp(),'database',current_database(),'sessionUser',session_user,
 'readOnly',current_setting('transaction_read_only'),'ssl',(select ssl from pg_stat_ssl where pid=pg_backend_pid()),
 'address',host(inet_server_addr()),'port',inet_server_port(),'backendPid',pg_backend_pid(),
 'clusterId',(select system_identifier::text from pg_control_system()),
 'serverVersionNum',current_setting('server_version_num')::integer,
 'controlSystemExecutable',has_function_privilege(current_user,'pg_catalog.pg_control_system()','EXECUTE'),
 'transactionStatusExecutable',has_function_privilege(current_user,'pg_catalog.pg_xact_status(xid8)','EXECUTE'),
 'transactionIdentityExecutable',has_function_privilege(current_user,'pg_catalog.pg_current_xact_id()','EXECUTE'),
 'activitySelectable',has_table_privilege(current_user,'pg_catalog.pg_stat_activity','SELECT'),
 'sslSelectable',has_table_privilege(current_user,'pg_catalog.pg_stat_ssl','SELECT'),
 'allStatsVisible',(select rolsuper from pg_roles where rolname=current_user) or pg_has_role(current_user,'pg_read_all_stats','USAGE'),
 'selfActivity',(select jsonb_build_object('pid',pid,'user',usename,'database',datname,
   'backendStart',backend_start,'transactionStart',xact_start,'state',state)
   from pg_stat_activity where pid=pg_backend_pid()),
 'statusProbeXid','1','statusProbeResult',pg_xact_status('1'::xid8),
 'assignedXid',pg_current_xact_id_if_assigned()::text);
rollback;
`;
export function prepareFinancePoolerCapabilities(){
  return Object.freeze({sql,querySha256:hash(sql),target:Object.freeze(financeReadOnlyStagingTarget()),
    remoteContact:false,readyToExecute:false});
}
const stamp=value=>typeof value==='string'?Date.parse(value):NaN;
function remoteAddress(value){
  if(typeof value!=='string'||!isIP(value))return false;
  if(isIP(value)===4)return value!=='0.0.0.0'&&!value.startsWith('127.');
  const normalized=new URL(`http://[${value}]/`).hostname;
  return !['[::]','[::1]','[::ffff:0:0]'].includes(normalized)&&!normalized.startsWith('[::ffff:7f');
}
export function verifyFinancePoolerCapabilitySnapshot(s,{nowMs=Date.now(),localProbe=false}={}){
  if(typeof localProbe!=='boolean'||!s||!Number.isFinite(nowMs)||!Number.isFinite(stamp(s.capturedAt))||
    nowMs-stamp(s.capturedAt)>300000||stamp(s.capturedAt)>nowMs+30000||s.database!=='postgres'||s.sessionUser!=='postgres'||
    s.readOnly!=='on'||(localProbe?s.address!=='127.0.0.1':s.ssl!==true||!remoteAddress(s.address))||
    !Number.isInteger(s.port)||s.port<1||s.port>65535||!Number.isInteger(s.backendPid)||s.backendPid<1||
    typeof s.clusterId!=='string'||!/^[1-9][0-9]{0,19}$/.test(s.clusterId)||BigInt(s.clusterId)>18446744073709551615n||
    !Number.isInteger(s.serverVersionNum)||s.serverVersionNum<140000)
    throw Error('Fresh complete read-only capability identity required');
  for(const key of ['controlSystemExecutable','transactionStatusExecutable','transactionIdentityExecutable',
    'activitySelectable','sslSelectable','allStatsVisible'])if(s[key]!==true)throw Error('Required pooler capability unavailable');
  const a=s.selfActivity;
  if(!a||a.pid!==s.backendPid||a.user!==s.sessionUser||a.database!==s.database||a.state!=='active'||
    !Number.isFinite(stamp(a.backendStart))||!Number.isFinite(stamp(a.transactionStart))||
    stamp(a.backendStart)>stamp(a.transactionStart)||stamp(a.transactionStart)>stamp(s.capturedAt)||
    s.statusProbeXid!=='1'||!Object.hasOwn(s,'statusProbeResult')||
    ![null,'committed','aborted','in progress'].includes(s.statusProbeResult)||s.assignedXid!==null)
    throw Error('Read-only capability probe incomplete or transaction ID assigned');
  return {scope:localProbe?'synthetic-loopback-capabilities':'offline-pooler-capabilities',
    capabilitiesVerified:true,readOnlyProbe:true,remoteContact:false,liveTransportAuthenticated:false,
    rollbackVerified:false,readyToExecute:false,applicationApproval:false};
}
export function verifyFinancePoolerCapabilityCapture(bytes,receiptHash,{nowMs=Date.now()}={}){
  if(!Buffer.isBuffer(bytes)||!bytes.length||bytes.length>65536||hash(bytes)!==receiptHash)
    throw Error('Capability capture integrity mismatch');
  const c=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  if(c?.schemaVersion!==1||c.kind!=='finance-pooler-capabilities'||c.clientsExitedCleanly!==true||c.querySha256!==hash(sql))
    throw Error('Capability envelope mismatch');
  prepareFinancePoolerRehearsalTarget(c.target);
  return verifyFinancePoolerCapabilitySnapshot(c.snapshot,{nowMs});
}
