// Offline, POST-COMMIT acceptance only. No migration application, transport or
// execution authority. The protected runner authenticates provenance and claims
// a new one-attempt journal. Historical 006-058 recovery proof stays unchanged.
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual as equal} from 'node:util';
import {verifyReleaseMigrationContract} from './recovery-ledger-fingerprint.mjs';
import {ledgerStatementsMatch} from './verify-finance-catalog-candidate.mjs';
import {financeApplicationComponents,financeApplicationSelect} from './finance-staging-application-bundle.mjs';
import {buildFinanceStagingActorGuard} from './finance-staging-rehearsal-guard.mjs';
import {prepareFinanceStagingBaseline} from './finance-staging-baseline.mjs';
import {buildPublicFinanceBaselineSql,verifyPublicFinanceBaselineContent,publicFinanceBaselineDifferences} from './finance-baseline-core.mjs';
import {verifyFinancePoolerCapabilitySnapshot} from './finance-pooler-capabilities.mjs';
import {verifyFinanceActorSnapshot,compareFinanceActorSnapshots} from './finance-actor-evidence.mjs';
import {financeReleaseEvidenceQuery} from './finance-pooler-release-evidence.mjs';
import {buildFinancePoolerMutationIdentitySql,verifyFinancePoolerClosure} from './finance-pooler-rehearsal.mjs';
import {verifyFinanceApplicationObserver} from './finance-staging-application-evidence.mjs';
import {rollbackSentinelSql,isExpectedRollback} from './finance-rehearsal-transaction.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const json=x=>"'"+JSON.stringify(x).replaceAll("'","''")+"'::jsonb";
const requireThat=(v,m)=>{if(!v)throw Error(m);};
const sameServer=(a,b)=>['address','port','database','sessionUser','clusterId'].every(k=>a[k]===b[k]);
function freshRead(s,nowMs){
  const at=Date.parse(s?.capturedAt);
  requireThat(Number.isFinite(nowMs)&&Number.isFinite(at)&&at<=nowMs+30000&&nowMs-at<=300000&&
    s.readOnly==='on'&&s.ssl===true&&s.database==='postgres'&&s.sessionUser==='postgres'&&
    Number.isInteger(s.backendPid)&&s.backendPid>0,'Fresh staging read-only evidence required');
}
export async function verifyFinancePostcommitLedger(input,{nowMs=Date.now()}={}){
  const s=structuredClone(input);freshRead(s,nowMs);
  requireThat(/^[a-f0-9]{64}$/.test(s.ledgerCatalogDigest),'Ledger catalog digest required');
  const versions=Array.from({length:55},(_,i)=>String(i+6).padStart(3,'0'));
  requireThat(Array.isArray(s.ledger)&&equal(s.ledger.map(r=>r.version),versions),'Exact ordered 006-060 ledger required');
  requireThat((await verifyReleaseMigrationContract()).matches,'Current 006-060 repository contract changed');
  const root=new URL('../supabase/migrations/',import.meta.url),files=await readdir(root);
  const applied=financeApplicationComponents().rows;
  for(const row of s.ledger){
    const pending=applied.find(r=>r.version===row.version);
    if(pending){
      requireThat(equal(row,pending),'Applied 059/060 ledger source changed');
    }else{
      const matches=files.filter(f=>f.startsWith(row.version+'_')&&f.endsWith('.sql'));
      requireThat(matches.length===1&&row.name===matches[0].slice(4,-4)&&
        Array.isArray(row.statements)&&row.statements.every(x=>typeof x==='string')&&
        ledgerStatementsMatch(await readFile(new URL(matches[0],root),'utf8'),row.statements),'Historical ledger source changed');
    }
  }
  return {exactLedger:'006-060',migrationCount:55,remoteContact:false};
}
export async function prepareFinancePostcommitAcceptance(input){
  requireThat(input&&Object.keys(input).sort().join(',')===
    'acceptedCatalogDigest,acceptedLedgerCatalogDigest,actors,baseline,bindings,capabilities,ledger,nonce,target','Exact post-commit inputs required');
  // Snapshot before any await: callers cannot replace validated evidence mid-plan.
  const c=structuredClone(input),nowMs=Date.now();
  prepareFinanceStagingBaseline(c.target,c.baseline,{nowMs});
  verifyPublicFinanceBaselineContent(c.baseline);
  verifyFinancePoolerCapabilitySnapshot(c.capabilities,{nowMs});
  verifyFinanceActorSnapshot(c.actors,c.bindings,{nowMs});
  for(const row of [c.baseline,c.actors,c.ledger,c.capabilities]){
    freshRead(row,nowMs);requireThat(sameServer(row,c.baseline),'Capture server mismatch');
  }
  requireThat(c.baseline.catalogDigest===c.acceptedCatalogDigest&&
    /^[a-f0-9]{64}$/.test(c.acceptedCatalogDigest)&&
    c.ledger.ledgerCatalogDigest===c.acceptedLedgerCatalogDigest,'Accepted committed catalog changed');
  await verifyFinancePostcommitLedger(c.ledger,{nowMs});
  const guard=buildFinanceStagingActorGuard(c.target,c.nonce,c.baseline,c.actors);
  const baselineSelect=financeApplicationSelect(buildPublicFinanceBaselineSql(c.baseline));
  const ledgerSelect=financeApplicationSelect(financeReleaseEvidenceQuery('ledger').sql);
  const expected={inventory:c.baseline.inventory,catalogDigest:c.baseline.catalogDigest,
    tables:c.baseline.tables,sequences:c.baseline.sequences};
  const {parts}=financeApplicationComponents();
  const sql=[`begin read write;
set local statement_timeout='15s';set local lock_timeout='3s';
set local idle_in_transaction_session_timeout='15s';set local plpgsql.check_asserts=on;
set local standard_conforming_strings=on;set local datestyle='ISO, YMD';set local row_security=on;`,
    guard.guardSql,
    `do $postcommit_before$ declare actual jsonb;begin
 select (${ledgerSelect}) into actual;
 if actual->'ledger' is distinct from ${json(c.ledger.ledger)} or
    actual->'ledgerCatalogDigest' is distinct from ${json(c.ledger.ledgerCatalogDigest)} then
  raise exception 'JWG_POSTCOMMIT_LEDGER_CHANGED';end if;
 select (${baselineSelect}) into actual;
 if jsonb_build_object('inventory',actual->'inventory','catalogDigest',actual->'catalogDigest',
    'tables',actual->'tables','sequences',actual->'sequences') is distinct from ${json(expected)} then
  raise exception 'JWG_POSTCOMMIT_BASELINE_CHANGED';end if;
end $postcommit_before$;`,
    buildFinancePoolerMutationIdentitySql(c.nonce),parts.fixture,parts.assertions,rollbackSentinelSql(c.nonce)].join('\n');
  return {target:guard.target,nonce:c.nonce,sql,sha256:hash(sql),
    fixtureSha256:hash(parts.fixture),assertionsSha256:hash(parts.assertions),
    preparedOnly:true,remoteContact:false,readyToExecute:false,migrationsReapplied:false};
}
export async function verifyFinancePostcommitAcceptance({config,result,closure,baseline,ledger,actors}){
  requireThat(result.clientClosed===true&&result.inputWritten===true&&!result.error&&
    isExpectedRollback(result,config.nonce),'Exact rollback sentinel and closed client required');
  const rows=result.stdout.trim().split(/\r?\n/).map(r=>JSON.parse(r));
  requireThat(rows.length===1,'Exactly one mutation identity required');
  const identity=rows[0];
  const proof=verifyFinancePoolerClosure(identity,closure,{nonce:config.nonce,clientFinishedAt:result.clientFinishedAt});
  for(const row of [baseline,ledger,actors])verifyFinanceApplicationObserver(row,identity,{notBefore:result.clientFinishedAt});
  verifyPublicFinanceBaselineContent(baseline);
  requireThat(baseline.backendPid!==config.baseline.backendPid&&
    publicFinanceBaselineDifferences(config.baseline,baseline).length===0,'Post-commit baseline residue or reused backend');
  await verifyFinancePostcommitLedger(ledger);
  requireThat(equal(ledger.ledger,config.ledger.ledger)&&ledger.ledgerCatalogDigest===config.ledger.ledgerCatalogDigest,'Post-commit ledger drift');
  requireThat(compareFinanceActorSnapshots(config.actors,actors,config.bindings).unchanged,'Post-commit actor residue');
  return {state:'postcommit-acceptance-verified',transactionAborted:proof.transactionAborted,
    independentObserver:true,zeroResidue:true,exactLedger:'006-060',migrationCount:55,
    publicTableCount:baseline.tables.length,sequenceCount:baseline.sequences.length,actorsPreserved:true,
    migrationsReapplied:false,productionContacted:false,providersContacted:false};
}
