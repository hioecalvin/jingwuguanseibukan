// OFFLINE preparation only: no credentials, database client, SQL execution or fetch.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {verifyFinanceCapture} from './verify-finance-catalog-candidate.mjs';

export const FINANCE_REHEARSAL_TABLES=Object.freeze([
  'profiles','classes','ranks','dojos','dojo_admin_assignments','class_memberships',
  'membership_subscription_charges','membership_payment_confirmations','membership_payments',
  'membership_fee_adjustment_history','membership_subscription_overrides','dojo_subscription_settings',
  'dojo_subscription_rate_history','notifications','notification_outbox','email_outbox',
  'membership_status_history',
]);

export function assessRehearsalIsolation(snapshot) {
  if(!Array.isArray(snapshot?.routines)||!Array.isArray(snapshot?.triggers))throw Error('Incomplete catalog inventory');
  const triggers=snapshot.triggers.filter(t=>t.schema_name==='public'&&FINANCE_REHEARSAL_TABLES.includes(t.table_name)&&t.enabled!=='D');
  const required=new Set(['public.create_notification',...triggers.map(t=>`${t.function_schema}.${t.function_name}`)]);
  const dependencies=[];
  const blockers=[];
  for(const qualifiedName of required) {
    const [schema,name]=qualifiedName.split('.');
    const rows=snapshot.routines.filter(r=>r.schema_name===schema&&r.routine_name===name);
    const complete=rows.length>0&&rows.every(r=>typeof r.definition==='string'&&r.definition.trim());
    dependencies.push({qualifiedName,overloadCount:rows.length,definitionsCaptured:!!complete});
    if(!complete)blockers.push(`Missing full reachable routine definition: ${qualifiedName}`);
  }
  // Presence is not review. Arbitrary SQL can invoke side effects through nested
  // functions, extensions, dynamic SQL or foreign objects. Never infer safety
  // from a keyword scan or from PostgreSQL transaction rollback alone.
  blockers.push('Review the complete transitive function/trigger/default/RLS call chain for nontransactional side effects.');
  blockers.push('Bind reviewed synthetic fixture UUIDs and prerequisite rows without modifying real profiles or memberships.');
  blockers.push('Prepare complete-schema acceptance assertions and independent before/after catalog, ledger and residue verification.');
  blockers.push('Obtain explicit approval for one staging-only rollback-contained rehearsal; no application approval implied.');
  return {readyToExecute:false,triggers,dependencies,blockers};
}

export async function prepareFinanceRehearsal(directory) {
  const preflight=await verifyFinanceCapture(directory);
  if(!preflight.catalogPrerequisitesPassed)throw Error('Catalog prerequisite gate failed');
  const snapshotBytes=await readFile(path.join(directory,'snapshot.json'));
  const snapshot=JSON.parse(snapshotBytes.toString('utf8'));
  return {kind:'finance-rehearsal-preparation-only',preparedAt:new Date().toISOString(),
    projectRef:'eomubndonbetszdbhsrj',captureTimestamp:preflight.capturedAt,
    snapshotSha256:createHash('sha256').update(snapshotBytes).digest('hex'),
    ledger:preflight.ledger,candidates:preflight.candidates,...assessRehearsalIsolation(snapshot),
    runnerImplemented:false,remoteContact:false,sqlExecuted:false,
    boundary:{production:false,otherProjects:false,providers:false,sendMessages:false,
      persistentDDL:false,ledgerInsert:false,settingsChanges:false,workerOrSchedulerInvocation:false},
    plannedTests:['selected/nonconsecutive months and unchanged skipped debt',
      'Member reports remain pending until authorized receipt confirmation',
      'waiver versus paid, required reason, expected old amount and audit attribution',
      'Super Admin, assigned Admin, out-of-scope Admin, Member, anonymous and disabled boundaries',
      'actual rate intervals, old/new fee APIs, prepaid generation preservation',
      'group atomicity, duplicate/stale request rejection and no direct browser writes',
      'notification/outbox transaction rollback with zero provider calls',
      'post-rollback exact ledger, catalog, fixture residue and captured baseline comparison'],
  };
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  if(process.argv.length!==3)throw Error('Supply one captured staging catalog directory');
  console.log(JSON.stringify(await prepareFinanceRehearsal(path.resolve(process.argv[2])),null,2));
}
