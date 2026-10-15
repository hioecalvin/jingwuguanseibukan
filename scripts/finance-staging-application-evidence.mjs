// Pure application reconciliation. Never connects, retries or alters evidence.
import {isDeepStrictEqual as equal} from 'node:util';
import {verifyFinanceMutationIdentity} from './finance-session-closure.mjs';
import {verifyPublicFinanceBaselineContent,publicFinanceBaselineDifferences} from './finance-baseline-core.mjs';
export function verifyFinanceApplicationObserver(row,identity,{notBefore,nowMs=Date.now()}={}){
  const at=Date.parse(row?.capturedAt),after=Date.parse(notBefore);
  if(!Number.isFinite(at)||!Number.isFinite(after)||at<after||at>nowMs+30000||nowMs-at>300000||
    row.readOnly!=='on'||row.ssl!==true||!Number.isInteger(row.backendPid)||row.backendPid<1||
    row.backendPid===identity.backendPid||
    ['database','sessionUser','address','port','clusterId'].some(k=>row[k]!==identity[k]))
    throw Error('Independent current application observer required');
}
export function verifyFinanceApplicationCommit(identity,observer,{nonce,clientFinishedAt,nowMs=Date.now()}={}){
  // The original identity must have been fresh when its client finished. A
  // later read-only reconciliation may legitimately observe an older commit;
  // the observer itself must still be fresh NOW. Never retimestamp evidence.
  verifyFinanceMutationIdentity(identity,{nonce,nowMs:Date.parse(clientFinishedAt)});
  verifyFinanceApplicationObserver(observer,identity,{notBefore:clientFinishedAt,nowMs});
  if(!/^[1-9][0-9]{0,19}$/.test(identity.transactionId)||observer.nonce!==nonce||
    observer.targetBackendPid!==identity.backendPid||observer.targetApplicationName!==identity.applicationName||
    observer.transactionId!==identity.transactionId||observer.transactionStatus!=='committed'||
    !Array.isArray(observer.matchingSessions)||observer.matchingSessions.length>1)
    throw Error('Application commit not independently proven');
  for(const r of observer.matchingSessions)
    if(r.pid!==identity.backendPid||r.backendStart!==identity.backendStart||r.state!=='idle'||
      r.transactionStart!==null||r.backendXid!==null||typeof r.applicationName!=='string'||
      r.applicationName===identity.applicationName)throw Error('Application session not quiescent');
  return {transactionCommitted:true,independentObserver:true,applicationScopeClosed:true};
}
export function verifyFinanceApplicationLedger(actual,expected,oldCatalogDigest){
  if(!equal(actual.ledger,expected)||actual.ledgerCatalogDigest!==oldCatalogDigest)
    throw Error('Exact applied ledger mismatch');
}
export function verifyFinanceApplicationBaseline(before,normalized,expectedAfter,after){
  for(const s of [before,normalized,expectedAfter,after])verifyPublicFinanceBaselineContent(s);
  for(const k of ['inventory','tables','sequences'])if(!equal(before[k],normalized[k]))
    throw Error('Preexisting application data changed');
  if(publicFinanceBaselineDifferences(expectedAfter,after).length)
    throw Error('Committed catalog/data differs from accepted transaction');
}
