// Pure private-capture planning/verification. Callers enforce Windows ACLs and
// authenticated transport. These functions themselves perform no I/O or network.
import {createHash} from 'node:crypto';
import {financeReadOnlyStagingTarget,prepareFinanceStagingInventory,prepareFinanceStagingBaseline,
  verifyFinanceStagingBaselineCapture} from './finance-staging-baseline.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
function parse(bytes,receiptHash){
  if(!Buffer.isBuffer(bytes)||!bytes.length||bytes.length>1048576||typeof receiptHash!=='string'||
    !/^[a-f0-9]{64}$/.test(receiptHash)||hash(bytes)!==receiptHash)throw Error('Private capture integrity mismatch');
  try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
  catch{throw Error('Invalid private capture JSON');}
}
export function verifyFinanceInventoryCapture(bytes,receiptHash,options){
  const capture=parse(bytes,receiptHash);
  if(capture?.schemaVersion!==1||capture.kind!=='public-finance-inventory'||capture.clientsExitedCleanly!==true)
    throw Error('Invalid inventory envelope');
  const expected=prepareFinanceStagingInventory(capture.target);
  if(capture.querySha256!==expected.querySha256)throw Error('Inventory query binding mismatch');
  // Validates freshness/identity and refuses incomplete or unsupported inventory.
  prepareFinanceStagingBaseline(capture.target,capture.snapshot,options);
  return {captureIntegrityVerified:true,inventoryVerified:true,remoteContact:false,
    remoteProvenanceIndependentlyVerified:false,readyForWriteRehearsal:false};
}
export function prepareProtectedFinanceBaseline(inventoryBytes,inventoryHash,options){
  verifyFinanceInventoryCapture(inventoryBytes,inventoryHash,options);
  const inventory=parse(inventoryBytes,inventoryHash);
  return {...prepareFinanceStagingBaseline(inventory.target,inventory.snapshot,options),
    target:financeReadOnlyStagingTarget(),inventory:inventory.snapshot,inventoryQuerySha256:inventory.querySha256};
}
export function verifyProtectedFinanceBaseline(bytes,receiptHash,options){
  const capture=parse(bytes,receiptHash);
  if(typeof capture?.sourceInventoryText!=='string')throw Error('Original inventory evidence required');
  const inventoryBytes=Buffer.from(capture.sourceInventoryText,'utf8');
  const plan=prepareProtectedFinanceBaseline(inventoryBytes,capture.sourceInventorySha256,options);
  if(JSON.stringify(plan.inventory)!==JSON.stringify(capture.inventory)||
    plan.querySha256!==capture.baselineQuerySha256||plan.inventoryQuerySha256!==capture.inventoryQuerySha256)
    throw Error('Baseline differs from protected inventory source');
  return verifyFinanceStagingBaselineCapture(bytes,receiptHash,options);
}
