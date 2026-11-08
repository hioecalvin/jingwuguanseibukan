// Offline staging-read preparation and evidence comparison. No credentials,
// connections, writes, retries or authority to execute the generated SQL.
import {createHash} from 'node:crypto';
import {isIP} from 'node:net';
import {PUBLIC_FINANCE_INVENTORY_SQL,buildPublicFinanceBaselineSql,
  verifyPublicFinanceBaselineContent,publicFinanceBaselineDifferences} from './finance-baseline-core.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const target=Object.freeze({projectRef:'eomubndonbetszdbhsrj',transport:'session-pooler',
  host:'aws-0-ap-southeast-2.pooler.supabase.com',port:5432,database:'postgres',
  user:'postgres.eomubndonbetszdbhsrj',sslmode:'verify-full'});
export function financeReadOnlyStagingTarget(){return {...target};}
function verifyTarget(value) {
  if(!value||Object.keys(value).length!==Object.keys(target).length||
    Object.entries(target).some(([key,expected])=>value[key]!==expected))throw Error('Exact read-only staging target required');
}
function verifyIdentity(row,nowMs) {
  const time=typeof row?.capturedAt==='string'?Date.parse(row.capturedAt):NaN;
  if(!Number.isFinite(nowMs)||!Number.isFinite(time)||time>nowMs+30000||nowMs-time>300000||
    row.database!=='postgres'||row.sessionUser!=='postgres'||row.readOnly!=='on'||row.ssl!==true||
    typeof row.clusterId!=='string'||!/^\d+$/.test(row.clusterId)||
    !Number.isInteger(row.backendPid)||row.backendPid<1||!Number.isInteger(row.port)||row.port<1||row.port>65535||
    typeof row.address!=='string'||!isIP(row.address)||row.address.startsWith('127.')||row.address==='::1')
    throw Error('Fresh complete staging read-only identity required');
}
function sameServer(a,b) {
  if(['address','port','database','sessionUser','clusterId'].some(key=>a[key]!==b[key]))throw Error('Different baseline server identities');
}
export function prepareFinanceStagingInventory(transport) {
  verifyTarget(transport);
  return {sql:PUBLIC_FINANCE_INVENTORY_SQL,querySha256:hash(PUBLIC_FINANCE_INVENTORY_SQL),
    remoteContact:false,readyToExecute:false};
}
export function prepareFinanceStagingBaseline(transport,inventory,{nowMs=Date.now()}={}) {
  verifyTarget(transport);verifyIdentity(inventory,nowMs);
  const sql=buildPublicFinanceBaselineSql(inventory);
  return {sql,querySha256:hash(sql),remoteContact:false,readyToExecute:false};
}
export function verifyFinanceStagingBaselineCapture(bytes,receiptHash,{nowMs=Date.now()}={}) {
  if(!Buffer.isBuffer(bytes)||bytes.length===0||bytes.length>4194304||typeof receiptHash!=='string'||
    !/^[0-9a-f]{64}$/.test(receiptHash)||hash(bytes)!==receiptHash)throw Error('Baseline receipt integrity mismatch');
  let capture;
  try{capture=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
  catch{throw Error('Invalid baseline capture JSON');}
  if(!capture||capture.schemaVersion!==1||capture.kind!=='public-finance-baseline'||capture.clientsExitedCleanly!==true)
    throw Error('Incomplete baseline capture envelope');
  verifyTarget(capture.target);
  const plan=prepareFinanceStagingBaseline(capture.target,capture.inventory,{nowMs});
  if(capture.inventoryQuerySha256!==hash(PUBLIC_FINANCE_INVENTORY_SQL)||capture.baselineQuerySha256!==plan.querySha256)
    throw Error('Baseline query binding mismatch');
  const snapshot=capture.snapshot;
  verifyIdentity(snapshot,nowMs);sameServer(capture.inventory,snapshot);
  if(Date.parse(snapshot.capturedAt)<Date.parse(capture.inventory.capturedAt))throw Error('Baseline capture ordering invalid');
  verifyPublicFinanceBaselineContent(snapshot);
  if(JSON.stringify(capture.inventory.inventory)!==JSON.stringify(snapshot.inventory))throw Error('Inventory changed during baseline capture');
  return {scope:'offline-staging-public-baseline',captureIntegrityVerified:true,inventoryCoverageVerified:true,
    remoteContact:false,remoteProvenanceIndependentlyVerified:false,readyForWriteRehearsal:false,
    fullManagedSchemaVerified:false,captureSha256:receiptHash};
}
export function compareFinanceStagingBaselineCaptures(beforeBytes,beforeHash,afterBytes,afterHash,options) {
  verifyFinanceStagingBaselineCapture(beforeBytes,beforeHash,options);
  verifyFinanceStagingBaselineCapture(afterBytes,afterHash,options);
  const before=JSON.parse(beforeBytes).snapshot,after=JSON.parse(afterBytes).snapshot;
  sameServer(before,after);
  if(before.backendPid===after.backendPid)throw Error('Independent baseline backends required');
  if(Date.parse(after.capturedAt)<Date.parse(before.capturedAt))throw Error('Baseline comparison ordering invalid');
  const differences=publicFinanceBaselineDifferences(before,after);
  return {scope:'offline-staging-public-baseline',independentSessions:true,unchanged:differences.length===0,differences,
    remoteContact:false,remoteProvenanceIndependentlyVerified:false,fullManagedSchemaVerified:false,
    rollbackVerified:false,readyForWriteRehearsal:false,applicationApproval:false};
}
