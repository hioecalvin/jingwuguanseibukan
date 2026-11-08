// Fixed query/envelope boundary. Content integrity is not live provenance.
import {createHash} from 'node:crypto';
import {isIP} from 'node:net';
import {financeReadOnlyStagingTarget} from './finance-staging-baseline.mjs';
import {financeReleaseEvidenceQuery} from './finance-pooler-release-evidence.mjs';
import {verifyFinanceLedgerSnapshot} from './finance-ledger-evidence.mjs';
import {verifyFinanceActorSnapshot} from './finance-actor-evidence.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
function bindings(text,digest){
  if(typeof text!=='string'||!text.length||Buffer.byteLength(text)>8192||hash(text)!==digest||text.startsWith('\ufeff'))
    throw Error('Pinned independent bindings required');
  const b=JSON.parse(text);
  if(Object.keys(b).sort().join(',')!=='bindings,projectRef,schemaVersion'||b.schemaVersion!==1||
    b.projectRef!=='eomubndonbetszdbhsrj'||!b.bindings||Object.keys(b.bindings).sort().join(',')!=='admin,member,superAdmin'||
    Object.values(b.bindings).some(x=>typeof x!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(x)||
      x==='00000000-0000-0000-0000-000000000000')||new Set(Object.values(b.bindings)).size!==3)throw Error('Invalid independent bindings');
  return b.bindings;
}
export function prepareFinanceReleaseCapture(kind,bindingText,bindingHash){
  if(kind!=='ledger'&&kind!=='actors')throw Error('Fixed release capture kind required');
  if(kind==='actors')bindings(bindingText,bindingHash);
  else if(bindingText!==undefined||bindingHash!==undefined)throw Error('Unexpected bindings');
  return {...financeReleaseEvidenceQuery(kind),kind,target:financeReadOnlyStagingTarget(),readyToExecute:false};
}
export async function verifyFinanceReleaseCapture(kind,text,digest,bindingText,bindingHash){
  const plan=prepareFinanceReleaseCapture(kind,bindingText,bindingHash);
  if(typeof text!=='string'||!text.length||Buffer.byteLength(text)>700000||hash(text)!==digest||text.startsWith('\ufeff'))
    throw Error('Pinned bounded release capture required');
  const c=JSON.parse(text),t=plan.target;
  const expected={schemaVersion:2,kind,clientsExitedCleanly:true,projectRef:t.projectRef,transport:t.transport,
    host:t.host,port:t.port,connectionUser:t.user,sslmode:t.sslmode,querySha256:plan.querySha256,sourceQuerySha256:plan.sourceQuerySha256};
  if(Object.entries(expected).some(([k,v])=>c?.[k]!==v))throw Error('Release capture metadata mismatch');
  const s=c.snapshot;
  if(!s||s.ssl!==true||typeof s.address!=='string'||!isIP(s.address)||!Number.isInteger(s.port)||s.port<1||s.port>65535||
    typeof s.clusterId!=='string'||!/^[1-9][0-9]{0,19}$/.test(s.clusterId)||BigInt(s.clusterId)>18446744073709551615n)
    throw Error('Complete server identity required');
  const address=isIP(s.address)===6?new URL(`http://[${s.address}]/`).hostname:s.address;
  if(address==='0.0.0.0'||address.startsWith('127.')||['[::]','[::1]','[::ffff:0:0]'].includes(address)||address.startsWith('[::ffff:7f'))
    throw Error('Remote identity required');
  if(kind==='ledger')await verifyFinanceLedgerSnapshot(s);
  else{
    if(c.bindingSha256!==bindingHash)throw Error('Binding receipt mismatch');
    verifyFinanceActorSnapshot(s,bindings(bindingText,bindingHash));
  }
  return {kind,captureVerifiedOffline:true,remoteContact:false,liveTransportAuthenticated:false,
    rollbackVerified:false,readyForWriteRehearsal:false};
}
