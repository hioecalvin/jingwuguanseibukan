// Offline validation only. No credentials, transport or execution authority.
// A trusted capture wrapper must establish target/TLS independently; JSON claims
// and this content verifier alone do not authenticate a remote database.
import {readFile,readdir} from 'node:fs/promises';
// Pre-application 006-058 guard remains historical and cannot accept a 060 ledger.
import {fingerprintHistorical058LedgerRows as fingerprintLedgerRows,
  verifyHistorical058MigrationContract as verifyReleaseMigrationContract} from './recovery-ledger-fingerprint.mjs';
import {ledgerStatementsMatch} from './verify-finance-catalog-candidate.mjs';

export async function verifyFinanceLedgerSnapshot(snapshot,{nowMs=Date.now(),localProbe=false}={}) {
  const captured=Date.parse(snapshot?.capturedAt);
  if(!Number.isFinite(nowMs)||!Number.isFinite(captured)||captured>nowMs+30000||nowMs-captured>300000)
    throw Error('Fresh ledger capture required');
  if(snapshot.readOnly!=='on'||snapshot.sessionUser!=='postgres'||
    snapshot.database!==(localProbe?'finance_catalog_probe':'postgres')||
    !Number.isInteger(snapshot.backendPid)||snapshot.backendPid<1||
    typeof snapshot.ledgerCatalogDigest!=='string'||!/^[a-f0-9]{64}$/.test(snapshot.ledgerCatalogDigest))
    throw Error('Incomplete read-only ledger evidence');
  const ledger=fingerprintLedgerRows(snapshot.ledger);
  const contract=await verifyReleaseMigrationContract();
  if(!contract.matches)throw Error('Repository migration contract changed');
  const root=new URL('../supabase/migrations/',import.meta.url);
  const files=await readdir(root);
  for(const row of snapshot.ledger) {
    const matches=files.filter(file=>file.startsWith(row.version+'_')&&file.endsWith('.sql'));
    if(matches.length!==1||row.name!==matches[0].slice(4,-4)||
      !ledgerStatementsMatch(await readFile(new URL(matches[0],root),'utf8'),row.statements))
      throw Error('Ledger content does not match repository');
  }
  return {scope:localProbe?'synthetic-local-ledger':'offline-ledger-content-review',
    ...ledger,ledgerCatalogDigest:snapshot.ledgerCatalogDigest,backendPid:snapshot.backendPid,
    capturedAt:snapshot.capturedAt,exactRepositoryContents:true,remoteContact:false,
    readyForWriteRehearsal:false,applicationApproval:false};
}

export async function compareFinanceLedgerSnapshots(before,after,options) {
  const a=await verifyFinanceLedgerSnapshot(before,options);
  const b=await verifyFinanceLedgerSnapshot(after,options);
  if(a.backendPid===b.backendPid)throw Error('Independent ledger sessions required');
  if(Date.parse(b.capturedAt)<Date.parse(a.capturedAt))throw Error('Capture ordering invalid');
  const differences=['ledgerSha256','ledgerCatalogDigest'].filter(key=>a[key]!==b[key]);
  return {scope:a.scope,independentSessions:true,unchanged:differences.length===0,differences,
    remoteContact:false,readyForWriteRehearsal:false,applicationApproval:false};
}
