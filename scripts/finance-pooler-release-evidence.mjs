// Offline prerequisite/content gate. Receipts prove integrity, not provenance;
// only the protected, fixed-target capture adapters may supply live evidence.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {verifyFinanceActorSnapshot,compareFinanceActorSnapshots} from './finance-actor-evidence.mjs';
import {verifyFinanceLedgerSnapshot,compareFinanceLedgerSnapshots} from './finance-ledger-evidence.mjs';
import {verifyFinancePoolerCapabilityCapture} from './finance-pooler-capabilities.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const queries=Object.freeze({
  ledger:'2c80c6b732c80ff9ad3ad645ef672a31a3dcccd5804ab675a62dcd7405eed3e9',
  actors:'723e23d15bfcdff8127a39f15550154c4b68e03fc9c30e83fbb231677ae04d80',
});
const serverBoundQueries=Object.freeze({
  ledger:'0d043880139e262695f90551031ba179c2fd3a7d5870fc98e5943328f8653635',
  actors:'cb31b392ecdb8d293803ec19e659efe405fa0d94bc00cf0cfa79d3aec662182d',
});
export function financeReleaseEvidenceQuery(kind){
  if(!Object.hasOwn(queries,kind))throw Error('Fixed ledger/actor query required');
  const bytes=readFileSync(new URL(`../tests/sql/059_060_${kind}_readonly.sql`,import.meta.url));
  if(hash(bytes)!==queries[kind])throw Error('Reviewed evidence query changed');
  // Extend ONLY these digest-pinned read-only sources; historical files/captures
  // stay unchanged. This is not a general SQL rewriter or migration assembler.
  const sql=bytes.toString('utf8').replace('select jsonb_build_object(',`select jsonb_build_object(
 'address',host(inet_server_addr()),'port',inet_server_port(),
 'clusterId',(select system_identifier::text from pg_catalog.pg_control_system()),`);
  if(hash(sql)!==serverBoundQueries[kind])throw Error('Server-bound evidence query changed');
  return Object.freeze({schemaVersion:2,sql,querySha256:hash(sql),sourceQuerySha256:queries[kind]});
}
function copyCapture(c){
  if(!Buffer.isBuffer(c?.bytes)||!c.bytes.length||c.bytes.length>4194304||hash(c.bytes)!==c.hash)
    throw Error('Pinned evidence capture required');
  return {bytes:Buffer.from(c.bytes),hash:c.hash};
}
function decode(bytes){return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
export function prepareFinancePoolerReleaseEvidence(evidence){
  if(!evidence||Object.keys(evidence).sort().join(',')!=='actors,bindingBytes,capabilities,ledger'||
    !Buffer.isBuffer(evidence.bindingBytes)||evidence.bindingBytes.length>8192)
    throw Error('Mandatory ledger, actor, capability and independent binding evidence required');
  const capabilities=copyCapture(evidence.capabilities);
  verifyFinancePoolerCapabilityCapture(capabilities.bytes,capabilities.hash);
  const server=decode(capabilities.bytes).snapshot;
  const ledger=copyCapture(evidence.ledger),actors=copyCapture(evidence.actors),bindingBytes=Buffer.from(evidence.bindingBytes);
  const beforeLedger=decode(ledger.bytes),beforeActors=decode(actors.bytes),binding=decode(bindingBytes),bindings=binding.bindings;
  const expected={schemaVersion:2,projectRef:'eomubndonbetszdbhsrj',transport:'session-pooler',
    host:'aws-0-ap-southeast-2.pooler.supabase.com',port:5432,connectionUser:'postgres.eomubndonbetszdbhsrj',
    sslmode:'verify-full',clientsExitedCleanly:true};
  for(const [kind,capture] of [['ledger',beforeLedger],['actors',beforeActors]]){
    const plan=financeReleaseEvidenceQuery(kind);
    if(!capture||Object.entries(expected).some(([key,value])=>capture[key]!==value)||capture.kind!==kind||
      capture.querySha256!==plan.querySha256||capture.sourceQuerySha256!==plan.sourceQuerySha256)
      throw Error('Version-2 server-bound capture required');
  }
  if(binding.schemaVersion!==1||binding.projectRef!==expected.projectRef||beforeActors.bindingSha256!==hash(bindingBytes))
    throw Error('Independent actor binding mismatch');
  function sameServer(snapshot){
    if(!snapshot||snapshot.ssl!==true||['address','port','database','sessionUser','clusterId'].some(k=>snapshot[k]!==server[k]))
      throw Error('Evidence differs from capability server');
  }
  sameServer(beforeLedger.snapshot);sameServer(beforeActors.snapshot);
  verifyFinanceActorSnapshot(beforeActors.snapshot,bindings);
  const validateBefore=async baselineSnapshot=>{
    // Re-run immediately before the claim, including repository-content checks.
    verifyFinancePoolerCapabilityCapture(capabilities.bytes,capabilities.hash);
    if(!baselineSnapshot||['address','port','database','sessionUser','clusterId'].some(k=>baselineSnapshot[k]!==server[k]))
      throw Error('Capability probe differs from baseline server');
    sameServer(beforeLedger.snapshot);sameServer(beforeActors.snapshot);
    verifyFinanceActorSnapshot(beforeActors.snapshot,bindings);
    await verifyFinanceLedgerSnapshot(beforeLedger.snapshot);
    for(const kind of ['ledger','actors'])financeReleaseEvidenceQuery(kind);
  };
  return Object.freeze({validateBefore,reconcile:async({captureLedgerAfter,captureActorsAfter,notBefore,mutationPid})=>{
    const failures=[];
    let ledgerUnchanged=false,actorsUnchanged=false;
    // Attempt BOTH captures even if either fails; never expose raw evidence/errors.
    for(const kind of ['ledger','actors']){
      try{
        const snapshot=await (kind==='ledger'?captureLedgerAfter:captureActorsAfter)();
        sameServer(snapshot);
        if(snapshot?.ssl!==true||!Number.isFinite(Date.parse(notBefore))||
          !Number.isFinite(Date.parse(snapshot.capturedAt))||Date.parse(snapshot.capturedAt)<Date.parse(notBefore)||
          (mutationPid!==null&&snapshot.backendPid===mutationPid))throw Error('Post-run evidence ordering/session invalid');
        if(kind==='ledger'){
          const c=await compareFinanceLedgerSnapshots(beforeLedger.snapshot,snapshot);
          ledgerUnchanged=c.independentSessions===true&&c.unchanged===true&&c.differences.length===0;
          if(!ledgerUnchanged)throw Error('Ledger drift');
        }else{
          const c=compareFinanceActorSnapshots(beforeActors.snapshot,snapshot,bindings);
          actorsUnchanged=c.independentSessions===true&&c.unchanged===true&&c.changedRoles.length===0;
          if(!actorsUnchanged)throw Error('Actor drift');
        }
      }catch{failures.push(`${kind}-reconciliation-failed-or-changed`);}
    }
    return {ledgerUnchanged,actorsUnchanged,failures};
  }});
}
