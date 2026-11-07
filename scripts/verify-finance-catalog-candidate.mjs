// Offline analysis of a read-only staging capture. Never connects or applies SQL.
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
// This candidate audit is bound to the historical PRE-059/060 capture only.
import {fingerprintHistorical058LedgerRows as fingerprintLedgerRows,
  verifyHistorical058MigrationContract as verifyReleaseMigrationContract} from './recovery-ledger-fingerprint.mjs';
import {reviewFinanceCatalogDirectory} from './advance-payment-catalog-review.mjs';

const canonical=text=>text.replace(/\r\n?/g,'\n').trim();
export function ledgerStatementsMatch(source,statements) {
  if(!Array.isArray(statements)||!statements.length)return false;
  let remaining=canonical(source);
  for(const value of statements) {
    if(typeof value!=='string'||!canonical(value))return false;
    const statement=canonical(value);
    if(!remaining.startsWith(statement))return false;
    remaining=remaining.slice(statement.length).trimStart();
    // Supabase CLI stores each parsed statement without its final separator.
    // Do not normalize any internal SQL, comments, identifiers or literals.
    if(remaining.startsWith(';'))remaining=remaining.slice(1).trimStart();
  }
  return remaining.length===0;
}

export function replacementChecks(routines) {
  const one=name=>{
    const matches=routines.filter(r=>r.schema_name==='public'&&r.routine_name===name);
    return matches.length===1?canonical(matches[0].definition??''):'';
  };
  const needle="and c.status not in (\n        'cancelled',\n        'waived'\n      )";
  const checks=[{name:'monthly notification replacement',passed:one('notify_monthly_subscription_charges').split(needle).length===2},
    {name:'member report wording replacement',passed:one('submit_membership_payment_confirmation').includes(' marked their ')&&one('submit_membership_payment_confirmation').includes(' subscription as paid.')}];
  for(const [name,pattern,count] of [
    ['apply_membership_fee_adjustment',/when new_amount = 0\s+then 'paid'/g,2],
    ['adjust_current_membership_fee',/when new_amount = 0\s+then 'paid'/g,1],
    ['generate_dojo_monthly_subscription_charges',/when rate_record\.amount = 0\s+then 'paid'/g,1],
    ['system_generate_monthly_subscriptions',/when rate_record\.amount = 0\s+then 'paid'/g,1],
  ])checks.push({name,passed:[...one(name).matchAll(pattern)].length===count});
  return checks;
}

export async function verifyFinanceCapture(directory) {
  const load=async file=>JSON.parse(await readFile(path.join(directory,file),'utf8'));
  const [capture,snapshot,audit,repository]=await Promise.all([load('result.json'),load('snapshot.json'),reviewFinanceCatalogDirectory(directory),verifyReleaseMigrationContract()]);
  if(capture.projectRef!=='eomubndonbetszdbhsrj'||capture.readOnlyVerified!==true||capture.projectIdentityVerified!==true||snapshot.readOnly!=='on')throw Error('Capture lacks exact staging/read-only identity');
  const migrations=await readdir(new URL('../supabase/migrations/',import.meta.url));
  const ledger=fingerprintLedgerRows(snapshot.ledger);
  const statementChecks=await Promise.all(snapshot.ledger.map(async row=>{
    const files=migrations.filter(file=>file.startsWith(row.version+'_')&&file.endsWith('.sql'));
    if(files.length!==1)return {version:row.version,passed:false};
    const source=await readFile(new URL('../supabase/migrations/'+files[0],import.meta.url),'utf8');
    return {version:row.version,passed:row.name===files[0].slice(4,-4)&&ledgerStatementsMatch(source,row.statements)};
  }));
  const replacements=replacementChecks(snapshot.routines);
  const newPolicyAbsent=!snapshot.policies.some(p=>p.schemaname==='public'&&p.tablename==='dojos'&&p.policyname==='finance staff read assigned or supervised dojos');
  const groupColumnAbsent=!snapshot.columns.some(c=>c.table_schema==='public'&&c.table_name==='membership_payment_confirmations'&&c.column_name==='payment_group_id');
  const candidates=await Promise.all(['059_advance_subscription_payment_records.sql','060_selected_month_fee_adjustment.sql'].map(async file=>({file,sha256:createHash('sha256').update(canonical(await readFile(new URL('../supabase/pending/'+file,import.meta.url),'utf8'))).digest('hex')})));
  const catalogPrerequisitesPassed=repository.matches&&statementChecks.every(c=>c.passed)&&replacements.every(c=>c.passed)&&newPolicyAbsent&&groupColumnAbsent&&audit.blockers.length===0;
  return {kind:'staging-finance-readonly-catalog-preflight',recordedAt:new Date().toISOString(),capturedAt:capture.recordedAt,
    projectRef:capture.projectRef,readOnlyCaptureVerified:true,catalogPrerequisitesPassed,readyToApply:false,
    ledger,repositoryMigrationContractMatches:repository.matches,statementChecks,replacements,newPolicyAbsent,groupColumnAbsent,candidates,
    financeHelperConsumers:audit.directHelperConsumers,financeHelperPolicies:audit.helperPolicies,browserMutationGrants:audit.unsafeGrants,
    catalogBlockers:audit.blockers,
    limitations:['Catalog metadata is not behavioural role-security acceptance.',
      'Complete-schema rollback-contained rehearsal, independent ledger/residue checks and explicit application approval still required.',
      'No migration, application function, scheduler or delivery worker was executed.',
      'Only staging eomubndonbetszdbhsrj was contacted by the capture; this verifier is offline.']};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  if(process.argv.length!==3)throw Error('Supply one read-only staging capture directory');
  const report=await verifyFinanceCapture(path.resolve(process.argv[2]));
  console.log(JSON.stringify(report,null,2));process.exitCode=report.catalogPrerequisitesPassed?0:1;
}
