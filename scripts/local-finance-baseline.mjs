// Synthetic loopback only. No connection, credential, file, or network access.
// Caller provides a fresh psql session per capture. This does not certify staging.
import {PUBLIC_FINANCE_INVENTORY_SQL,buildPublicFinanceBaselineSql,
  verifyPublicFinanceBaselineContent,publicFinanceBaselineDifferences} from './finance-baseline-core.mjs';
export const LOCAL_INVENTORY_SQL=PUBLIC_FINANCE_INVENTORY_SQL;
export function buildLocalBaselineSql(plan) {
  if(plan?.address!=='127.0.0.1')throw Error('Local inventory required');
  return buildPublicFinanceBaselineSql(plan);
}
const integer=value=>typeof value==='string'&&/^\d+$/.test(value);
export function verifyLocalBaseline(snapshot) {
  if(snapshot?.address!=='127.0.0.1'||snapshot.readOnly!=='on'||snapshot.database!=='postgres'||
    !integer(snapshot.clusterId)||!Number.isInteger(snapshot.port)||snapshot.port<1||snapshot.port>65535||
    !Number.isInteger(snapshot.backendPid)||snapshot.backendPid<1)throw Error('Incomplete local baseline');
  verifyPublicFinanceBaselineContent(snapshot);
}
export function compareLocalBaselines(before,after) {
  verifyLocalBaseline(before);verifyLocalBaseline(after);
  if(before.backendPid===after.backendPid)throw Error('Independent capture sessions required');
  for(const field of ['address','port','database','clusterId'])if(before[field]!==after[field])throw Error('Different local database targets');
  const differences=publicFinanceBaselineDifferences(before,after);
  return {scope:'synthetic-loopback-only',independentSessions:true,unchanged:differences.length===0,differences,
    liveAcceptance:false,productionContact:false};
}
