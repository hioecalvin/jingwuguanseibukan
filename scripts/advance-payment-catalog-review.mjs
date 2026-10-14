// Offline schema-only review. No database client, env file, network or SQL execution.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

export function reviewFinanceCatalog({routines,policies,privileges,constraints,relations}) {
  const helper='can_access_dojo_finance';
  const consumers=routines.filter(r=>r.schema_name==='public'&&r.routine_name!==helper&&
    new RegExp(`\\b${helper}\\s*\\(`).test(r.definition??''));
  const financeTables=['membership_subscription_charges','membership_payments','membership_payment_confirmations','membership_fee_adjustment_history'];
  const unsafeGrants=privileges.filter(p=>p.table_schema==='public'&&financeTables.includes(p.table_name)&&
    ['anon','authenticated','PUBLIC','public'].includes(p.grantee)&&p.privilege_type!=='SELECT');
  const pendingNames=['quote_advance_subscription_payment','record_advance_subscription_payment',
    'submit_advance_subscription_payment','review_advance_subscription_payment','get_pending_advance_payment_groups',
    'adjust_unpaid_subscription_charge'];
  const blockers=[];
  if(unsafeGrants.length)blockers.push('Browser finance-table mutation grants require reconciliation.');
  if(routines.some(r=>r.schema_name==='public'&&pendingNames.includes(r.routine_name)))blockers.push('Candidate RPC name already exists; reconcile before applying.');
  for(const table of financeTables)if(!relations.some(r=>r.schema_name==='public'&&r.relation_name===table&&r.relrowsecurity)) {
    blockers.push(`Missing table or RLS not enabled: ${table}`);
  }
  const history=constraints.find(c=>c.schema_name==='public'&&c.table_name==='membership_fee_adjustment_history'&&
    c.constraint_name==='membership_fee_adjustment_history_type_check');
  const expected="CHECK ((adjustment_type = ANY (ARRAY['this_month_only'::text, 'this_month_onward'::text, 'next_month_onward'::text])))";
  // Saved exports use pg_get_constraintdef(..., true); migration uses default false.
  const pretty="CHECK (adjustment_type = ANY (ARRAY['this_month_only'::text, 'this_month_onward'::text, 'next_month_onward'::text]))";
  if(![expected,pretty].includes(history?.definition))blockers.push('Fee-history check differs from pending 060 prerequisite.');
  return {
    kind:'offline-historical-catalog-review',liveVerified:false,readyToApply:false,
    directHelperConsumers:consumers.map(r=>({name:r.routine_name,arguments:r.identity_arguments})),
    helperPolicies:policies.filter(p=>new RegExp(`\\b${helper}\\s*\\(`).test(`${p.qual??''} ${p.with_check??''}`))
      .map(p=>({table:p.tablename,name:p.policyname,command:p.cmd})),
    zeroFeePaidWriters:routines.filter(r=>r.schema_name==='public'&&/when\s+(?:[\w]+\.)?(?:new_amount|amount)\s*=\s*0\s+then\s+'paid'/i.test(r.definition??''))
      .map(r=>r.routine_name),
    dojoSelectPolicies:policies.filter(p=>p.schemaname==='public'&&p.tablename==='dojos'&&['SELECT','ALL'].includes(p.cmd))
      .map(p=>({name:p.policyname,roles:p.roles,expression:p.qual})),
    unsafeGrants,blockers,
    outstanding:['Saved catalog is historical, not a current staging read.',
      'Dependency discovery is textual/direct only; indirect and dynamic calls require review.',
      'Complete-schema execution, role/RLS acceptance and current ledger remain unverified.',
      'No migration application or deployment is authorized by this report.'],
  };
}

export async function reviewFinanceCatalogDirectory(directory) {
  const sourceFiles={};
  const load=async name=>{
    const bytes=await readFile(path.join(directory,`${name}.json`));
    const rows=JSON.parse(bytes.toString('utf8'));
    if(!Array.isArray(rows))throw Error(`${name} must be a schema-only row array`);
    sourceFiles[name]={sha256:createHash('sha256').update(bytes).digest('hex'),rowCount:rows.length};
    return rows;
  };
  const [routines,policies,privileges,constraints,relations]=await Promise.all(
    ['routines','policies','table-privileges','constraints','relations'].map(load));
  return {sourceFiles,...reviewFinanceCatalog({routines,policies,privileges,constraints,relations})};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  if(process.argv.length!==3||process.argv[2].startsWith('-'))throw Error('Supply one local schema-only catalog directory.');
  console.log(JSON.stringify(await reviewFinanceCatalogDirectory(path.resolve(process.argv[2])),null,2));
}
