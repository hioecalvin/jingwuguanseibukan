// Offline inventory only. Definitions stay private; output contains names/digests,
// never bodies or literal values. This is NOT a SQL parser or execution approval.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {FINANCE_REHEARSAL_TABLES,assessRehearsalIsolation} from './prepare-finance-rehearsal.mjs';

const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export function reviewFinanceDependencies(capture,receipt,bytes) {
  if(receipt?.projectRef!=='eomubndonbetszdbhsrj'||receipt.projectIdentityVerified!==true||
     receipt.readOnlyVerified!==true||receipt.ownerOnlyAclVerified!==true||
     capture?.readOnly!=='on'||capture.database!=='postgres')throw Error('Unverified staging read-only capture');
  const digest=sha256(bytes);
  if(digest!==receipt.definitionFileSha256)throw Error('Protected evidence hash mismatch');
  // Bind the parsed object to the exact bytes, not merely to a supplied receipt.
  if(JSON.stringify(JSON.parse(bytes.toString('utf8')))!==JSON.stringify(capture))throw Error('Capture/bytes mismatch');
  for(const key of ['functions','triggers','defaults','policies','foreignTables','rules','extensions','ledgerVersions']) {
    if(!Array.isArray(capture[key]))throw Error('Incomplete dependency inventory');
  }
  const expected=Array.from({length:53},(_,i)=>String(i+6).padStart(3,'0'));
  if(JSON.stringify(capture.ledgerVersions)!==JSON.stringify(expected))throw Error('Expected exact versions 006–058');
  const adapted={routines:capture.functions.map(f=>({schema_name:f.schema,routine_name:f.name,definition:f.definition})),
    triggers:capture.triggers.map(t=>({schema_name:t.schema,table_name:t.table,enabled:t.enabled,
      function_schema:t.functionSchema,function_name:t.functionName}))};
  const initial=assessRehearsalIsolation(adapted);
  const additional=['queue_email','notify_dojo_admins','is_super_admin','can_manage_dojo','can_access_dojo_finance'];
  const required=new Set([...initial.dependencies.map(d=>d.qualifiedName),...additional.map(n=>`public.${n}`)]);
  const missingDefinitions=[...required].filter(name=>{
    const rows=capture.functions.filter(f=>`${f.schema}.${f.name}`===name);
    return !rows.length||rows.some(f=>typeof f.definition!=='string'||!f.definition.trim());
  });
  const relevantDefaults=capture.defaults.filter(d=>FINANCE_REHEARSAL_TABLES.includes(d.table));
  const sequenceRisks=relevantDefaults.filter(d=>d.identity==='YES'||/\b(?:nextval|setval)\s*\(/i.test(d.default??''))
    .map(d=>({table:d.table,column:d.column,identity:d.identity==='YES'}));
  const blockers=[...initial.blockers.filter(b=>!b.startsWith('Missing full reachable')),
    ...missingDefinitions.map(name=>`Missing dependency body: ${name}`)];
  if(sequenceRisks.length)blockers.unshift('Exclude identity/sequence paths or use separately approved isolated testing; rollback does not restore sequence state.');
  if(capture.foreignTables.length||capture.rules.length)blockers.unshift('Review captured foreign tables/rewrite rules before any execution.');
  return {kind:'offline-finance-dependency-inventory',projectRef:receipt.projectRef,
    capturedAt:capture.capturedAt,definitionFileSha256:digest,
    ledgerVersionsExact006Through058:true,functionCount:capture.functions.length,triggerCount:capture.triggers.length,
    requiredDefinitionCount:required.size,missingDefinitions,
    reviewedInventoryTables:FINANCE_REHEARSAL_TABLES,
    sequenceRisks,foreignTableCount:capture.foreignTables.length,rewriteRuleCount:capture.rules.length,
    notificationTriggerCount:capture.triggers.filter(t=>t.schema==='public'&&t.table==='notifications').length,
    readyToExecute:false,transitiveReviewComplete:false,runnerImplemented:false,remoteContact:false,sqlExecuted:false,
    blockers};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  if(process.argv.length!==3)throw Error('Supply one protected capture directory');
  const directory=path.resolve(process.argv[2]);
  const bytes=await readFile(path.join(directory,'finance-dependencies.json'));
  const receipt=JSON.parse(await readFile(path.join(directory,'result.json'),'utf8'));
  console.log(JSON.stringify(reviewFinanceDependencies(JSON.parse(bytes.toString('utf8')),receipt,bytes),null,2));
}
