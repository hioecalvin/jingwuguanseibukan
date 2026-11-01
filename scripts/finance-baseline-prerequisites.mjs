// Catalog-only prerequisite evidence. Never invokes application functions or
// reads public rows/sequences. A valid capture is NOT a safety certification.
import {createHash} from 'node:crypto';
import {isIP} from 'node:net';
import {financeReadOnlyStagingTarget,prepareFinanceStagingInventory} from './finance-staging-baseline.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
function validRemoteHostAddress(value){
 if(typeof value!=='string')return false;
 const parts=value.split('/'),address=parts[0],version=isIP(address);
 // PostgreSQL inet::text can include a full host mask. Never accept subnets,
 // extra separators, zone identifiers or whitespace as a server identity.
 if(!version||parts.length>2||(parts.length===2&&parts[1]!==String(version===4?32:128)))return false;
 if(version===4)return !address.startsWith('127.')&&address!=='0.0.0.0';
 const normalized=new URL(`http://[${address}]/`).hostname;
 return !['[::]','[::1]'].includes(normalized)&&!normalized.startsWith('[::ffff:7f')&&normalized!=='[::ffff:0:0]';
}
export const FINANCE_BASELINE_PREREQUISITES_SQL=`begin isolation level repeatable read read only;
set local search_path=pg_catalog;
set local timezone='UTC';
set local statement_timeout='15s';
set local lock_timeout='3s';
with recursive relations as (
 select c.oid,c.relname,c.relkind,c.relrowsecurity,c.relforcerowsecurity,c.relowner,
 c.reltuples,c.relpages from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relkind in ('r','p','S','f','m')
), columns as (
 select a.attrelid,a.attnum,a.attname,a.atttypid from pg_attribute a
 join relations r on r.oid=a.attrelid where a.attnum>0 and not a.attisdropped
), edges as (
 select oid as parent,typbasetype as child from pg_type where typbasetype<>0
 union select oid,typelem from pg_type where typelem<>0
 union select t.oid,a.atttypid from pg_type t join pg_attribute a on a.attrelid=t.typrelid
 where t.typrelid<>0 and a.attnum>0 and not a.attisdropped
 union select rngtypid,rngsubtype from pg_range
 union select rngmultitypid,rngtypid from pg_range where rngmultitypid<>0
), used_types(oid) as (
 select atttypid from columns union select e.child from edges e join used_types u on e.parent=u.oid
), casts as (
 select c.* from pg_cast c join used_types u on u.oid=c.castsource
 where c.casttarget in ('pg_catalog.json'::regtype,'pg_catalog.jsonb'::regtype)
), functions(oid) as (
 select t.typoutput from pg_type t join used_types u on u.oid=t.oid
 union select castfunc from casts where castfunc<>0
)
select jsonb_build_object(
 'capturedAt',clock_timestamp(),'database',current_database(),'sessionUser',session_user,
 'readOnly',current_setting('transaction_read_only'),
 'ssl',(select ssl from pg_stat_ssl where pid=pg_backend_pid()),
 'address',inet_server_addr()::text,'port',inet_server_port(),'backendPid',pg_backend_pid(),
 'controlSystemExecutable',has_function_privilege(current_user,'pg_catalog.pg_control_system()','EXECUTE'),
 'role',(select jsonb_build_object('superuser',rolsuper,'bypassRls',rolbypassrls) from pg_roles where rolname=current_user),
 'relations',coalesce((select jsonb_agg(jsonb_build_object(
 'oid',r.oid,'name',r.relname,'kind',r.relkind,'rls',r.relrowsecurity,'forceRls',r.relforcerowsecurity,
 'owner',pg_get_userbyid(r.relowner),'ownerRoleUsable',pg_has_role(current_user,r.relowner,'USAGE'),
 'selectable',case when r.relkind='S' then has_sequence_privilege(current_user,r.oid,'SELECT')
 else has_table_privilege(current_user,r.oid,'SELECT') end,
 'estimatedRows',r.reltuples,'pages',r.relpages) order by r.oid) from relations r),'[]'::jsonb),
 'columns',coalesce((select jsonb_agg(jsonb_build_object('relation',attrelid,'number',attnum,'name',attname,'type',atttypid) order by attrelid,attnum) from columns),'[]'::jsonb),
 'types',coalesce((select jsonb_agg(jsonb_build_object('oid',t.oid,'schema',n.nspname,'name',t.typname,
 'kind',t.typtype,'output',t.typoutput::oid) order by t.oid)
 from used_types u join pg_type t on t.oid=u.oid join pg_namespace n on n.oid=t.typnamespace),'[]'::jsonb),
 'edges',coalesce((select jsonb_agg(jsonb_build_object('parent',e.parent,'child',e.child) order by e.parent,e.child)
 from edges e join used_types u on u.oid=e.parent),'[]'::jsonb),
 'casts',coalesce((select jsonb_agg(jsonb_build_object('source',castsource,'target',casttarget,
 'method',castmethod,'function',castfunc) order by castsource,casttarget) from casts),'[]'::jsonb),
 'functions',coalesce((select jsonb_agg(jsonb_build_object('oid',p.oid,'schema',n.nspname,'name',p.proname,
 'language',l.lanname,'securityDefiner',p.prosecdef,'volatility',p.provolatile,
 'executable',has_function_privilege(current_user,p.oid,'EXECUTE'),
 'definitionMd5',md5(pg_get_functiondef(p.oid))) order by p.oid)
 from functions f join pg_proc p on p.oid=f.oid join pg_namespace n on n.oid=p.pronamespace
 join pg_language l on l.oid=p.prolang),'[]'::jsonb)
);
rollback;
`;
export function prepareFinanceBaselinePrerequisites(){
 return {sql:FINANCE_BASELINE_PREREQUISITES_SQL,querySha256:hash(FINANCE_BASELINE_PREREQUISITES_SQL),
  target:financeReadOnlyStagingTarget(),remoteContact:false,readyToExecute:false};
}
export function verifyFinancePrerequisiteCapture(bytes,receiptHash,{nowMs=Date.now()}={}){
 if(!Buffer.isBuffer(bytes)||!bytes.length||bytes.length>1048576||hash(bytes)!==receiptHash)throw Error('Prerequisite receipt mismatch');
 let c;try{c=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw Error('Invalid prerequisite JSON');}
 if(c?.schemaVersion!==1||c.kind!=='public-finance-prerequisites'||c.clientsExitedCleanly!==true||
  c.querySha256!==hash(FINANCE_BASELINE_PREREQUISITES_SQL))throw Error('Prerequisite envelope mismatch');
 prepareFinanceStagingInventory(c.target); // Exact transport check, no execution.
 const s=c.snapshot,time=typeof s?.capturedAt==='string'?Date.parse(s.capturedAt):NaN;
 if(!Number.isFinite(nowMs)||!Number.isFinite(time)||nowMs-time>300000||time>nowMs+30000||
  s.database!=='postgres'||s.sessionUser!=='postgres'||s.readOnly!=='on'||s.ssl!==true||
  !validRemoteHostAddress(s.address)||
  !Number.isInteger(s.port)||s.port<1||s.port>65535||!Number.isInteger(s.backendPid)||s.backendPid<1)
  throw Error('Fresh read-only staging identity required');
 if(typeof s.controlSystemExecutable!=='boolean'||typeof s.role?.superuser!=='boolean'||typeof s.role?.bypassRls!=='boolean'||
  ['relations','columns','types','edges','casts','functions'].some(k=>!Array.isArray(s[k]))||!s.relations.length)
  throw Error('Incomplete prerequisite metadata');
 const blockers=[];
 if(!s.controlSystemExecutable)blockers.push('cluster-identity-permission');
 for(const r of s.relations){
  if(!['r','p','S'].includes(r.kind))blockers.push('unsupported-public-relation');
  if(r.selectable!==true)blockers.push('public-select-permission');
  if(r.rls&&!s.role.superuser&&!s.role.bypassRls&&!(r.ownerRoleUsable===true&&!r.forceRls))blockers.push('row-security-restriction');
 }
 if(s.functions.some(f=>f.executable!==true))blockers.push('output-function-permission');
 if(s.functions.some(f=>f.schema!=='pg_catalog'))blockers.push('custom-output-or-json-cast-review');
 return {captureIntegrityVerified:true,metadataCaptured:true,blockers:[...new Set(blockers)],
  dependencyReviewRequired:true,remoteProvenanceIndependentlyVerified:false,
  readyForBaselineRead:false,readyForWriteRehearsal:false,remoteContact:false};
}
