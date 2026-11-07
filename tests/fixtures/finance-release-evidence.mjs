// Synthetic envelopes only. Never reads protected credentials or remote evidence.
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {prepareFinancePoolerCapabilities} from '../../scripts/finance-pooler-capabilities.mjs';
import {financeReleaseEvidenceQuery} from '../../scripts/finance-pooler-release-evidence.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
export const pack=x=>{const bytes=Buffer.from(JSON.stringify(x));return {bytes,hash:hash(bytes)};};
export async function releaseEvidenceFixture(){
  const bindings={member:'10000000-0000-4000-8000-000000000001',admin:'10000000-0000-4000-8000-000000000002',superAdmin:'10000000-0000-4000-8000-000000000003'};
  const bindingBytes=Buffer.from(JSON.stringify({schemaVersion:1,projectRef:'eomubndonbetszdbhsrj',bindings}));
  const base={capturedAt:new Date(Date.now()-6000).toISOString(),database:'postgres',sessionUser:'postgres',readOnly:'on',ssl:true,
    address:'192.0.2.1',port:5432,clusterId:'12345'};
  const server={...base,address:'192.0.2.1',port:5432,clusterId:'12345',backendPid:300,serverVersionNum:170011,
    controlSystemExecutable:true,transactionStatusExecutable:true,transactionIdentityExecutable:true,
    activitySelectable:true,sslSelectable:true,allStatsVisible:true,statusProbeXid:'1',statusProbeResult:null,assignedXid:null,
    selfActivity:{pid:300,user:'postgres',database:'postgres',state:'active',
      backendStart:new Date(Date.now()-10000).toISOString(),transactionStart:base.capturedAt}};
  const capabilityPlan=prepareFinancePoolerCapabilities();
  // Deliberately synthetic PRE-application evidence for the historical 058 guard.
  const root=new URL('../../supabase/migrations/',import.meta.url),files=(await readdir(root)).filter(f=>/^\d{3}_.+\.sql$/.test(f)&&f.slice(0,3)<='058').sort();
  const ledger={...base,backendPid:301,ledgerCatalogDigest:'a'.repeat(64),
    ledger:await Promise.all(files.map(async file=>({version:file.slice(0,3),name:file.slice(4,-4),statements:[await readFile(new URL(file,root),'utf8')]})))};
  const actors={...base,backendPid:302,actors:Object.entries(bindings).map(([role,id])=>({id,
    jsId:{member:'0101',admin:'0002',superAdmin:'0001'}[role],accountStatus:'active',deceased:false,superAdmin:role==='superAdmin',
    activeAssignments:role==='admin'?1:0,eligibleMemberships:1,profileDigest:'a'.repeat(64),membershipsDigest:'b'.repeat(64),assignmentsDigest:'c'.repeat(64)}))};
  const envelope={schemaVersion:2,clientsExitedCleanly:true,projectRef:'eomubndonbetszdbhsrj',transport:'session-pooler',host:'aws-0-ap-southeast-2.pooler.supabase.com',
    port:5432,connectionUser:'postgres.eomubndonbetszdbhsrj',sslmode:'verify-full'};
  return {ledger,actors,server,evidence:{bindingBytes,
    capabilities:pack({schemaVersion:1,kind:'finance-pooler-capabilities',clientsExitedCleanly:true,
      target:capabilityPlan.target,querySha256:capabilityPlan.querySha256,snapshot:server}),
    ledger:pack({...envelope,kind:'ledger',querySha256:financeReleaseEvidenceQuery('ledger').querySha256,
      sourceQuerySha256:financeReleaseEvidenceQuery('ledger').sourceQuerySha256,snapshot:ledger}),
    actors:pack({...envelope,kind:'actors',querySha256:financeReleaseEvidenceQuery('actors').querySha256,
      sourceQuerySha256:financeReleaseEvidenceQuery('actors').sourceQuerySha256,bindingSha256:hash(bindingBytes),snapshot:actors})},
    captureLedgerAfter:async()=>({...structuredClone(ledger),backendPid:303,capturedAt:new Date().toISOString()}),
    captureActorsAfter:async()=>({...structuredClone(actors),backendPid:304,capturedAt:new Date().toISOString()})};
}
