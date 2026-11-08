// Offline, pinned 059 -> 060 application assembly. No credentials or execution.
// The protected application runner must reserve a NEW one-attempt journal and
// independently reconcile commit, catalog, ledger, actors and data afterward.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {prepareFinanceStagingRehearsalGuard} from './finance-staging-rehearsal-guard.mjs';
import {verifiedFinanceStagingSource} from './finance-staging-rehearsal-bundle.mjs';
import {reviewedMigrationBody} from './finance-rehearsal-transaction.mjs';
import {buildPublicFinanceBaselineSql} from './finance-baseline-core.mjs';
import {financeReleaseEvidenceQuery} from './finance-pooler-release-evidence.mjs';
import {buildFinancePoolerMutationIdentitySql} from './finance-pooler-rehearsal.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const literal=x=>"'"+x.replaceAll("'","''")+"'";
const json=x=>literal(JSON.stringify(x))+'::jsonb';
const paths={
  '059':'supabase/migrations/059_advance_subscription_payment_records.sql',
  '060':'supabase/migrations/060_selected_month_fee_adjustment.sql',
  fixture:'tests/sql/059_060_staging_fixture.sql',
  assertions:'tests/sql/059_060_staging_fixture_assertions.sql',
};
// Strip only framing emitted by the existing fixed SELECT builders.
export function financeApplicationSelect(sql){
  const offset=sql.indexOf('select jsonb_build_object(');
  if(offset<0||!/^(?:\s|--[^\n]*\n)*begin (?:isolation level repeatable read read only|read only);/i.test(sql)||
    !/;\s*commit;\s*$/.test(sql))throw Error('Unexpected read-only builder framing');
  return sql.slice(offset).replace(/;\s*commit;\s*$/,'');
}
export function financeApplicationComponents(){
  const parts=Object.fromEntries(Object.entries(paths).map(([kind,file])=>
    [kind,verifiedFinanceStagingSource(kind,readFileSync(new URL('../'+file,import.meta.url)))]));
  const rows=['059','060'].map(version=>({version,name:paths[version].split('/').at(-1).slice(4,-4),
    statements:[parts[version].replace(/\r\n?/g,'\n')]}));
  return {parts,rows,ddl:['059','060'].map(v=>reviewedMigrationBody(v,parts[v])).join('\n'),
    ledgerInsert:rows.map(r=>`insert into supabase_migrations.schema_migrations(version,name,statements)
values (${literal(r.version)},${literal(r.name)},array[${literal(r.statements[0])}]);`).join('\n')};
}
export function financeSavepointAcceptanceSql(){
  const {parts}=financeApplicationComponents();
  return ['savepoint finance_application_acceptance;',parts.fixture,parts.assertions,
    'reset role;set constraints all immediate;',
    'rollback to savepoint finance_application_acceptance;',
    'release savepoint finance_application_acceptance;'].join('\n');
}
// Compare preexisting rows without treating the newly-added NULL column as data
// drift. No other column/table exemption is permitted; non-NULL values fail.
export function financeApplicationPreservedDataSelect(plan){
  let sql=financeApplicationSelect(buildPublicFinanceBaselineSql(plan));
  const old="coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text collate \"C\"),'[]'::jsonb)";
  const start=sql.indexOf("select 'membership_payment_confirmations' as name,");
  const end=sql.indexOf('from public."membership_payment_confirmations" t',start);
  if(start<0||end<start)throw Error('Payment-confirmation table missing from complete inventory');
  const part=sql.slice(start,end);
  if(part.split(old).length!==2)throw Error('Unexpected payment-confirmation baseline expression');
  const replacement="coalesce(jsonb_agg(to_jsonb(t)-'payment_group_id' order by (to_jsonb(t)-'payment_group_id')::text collate \"C\"),'[]'::jsonb)";
  sql=sql.slice(0,start)+part.replace(old,replacement)+sql.slice(end);
  return sql;
}
export async function prepareFinanceStagingApplicationBundle(config){
  // Snapshot the caller's buffers before validation can yield.
  const baseline=JSON.parse(Buffer.from(config?.baseline?.bytes??[])).snapshot;
  const beforeLedger=JSON.parse(Buffer.from(config?.releaseEvidence?.ledger?.bytes??[])).snapshot;
  const guard=await prepareFinanceStagingRehearsalGuard(config);
  const {parts,rows,ddl,ledgerInsert}=financeApplicationComponents();
  const baselineSelect=financeApplicationSelect(buildPublicFinanceBaselineSql(baseline));
  const preservedSelect=financeApplicationPreservedDataSelect(baseline);
  const ledgerSelect=financeApplicationSelect(financeReleaseEvidenceQuery('ledger').sql);
  const expectedData={inventory:baseline.inventory,tables:baseline.tables,sequences:baseline.sequences};
  const sql=[`begin read write;
set local statement_timeout='15s';set local lock_timeout='3s';set local standard_conforming_strings=on;set local datestyle='ISO, YMD';
set local idle_in_transaction_session_timeout='15s';set local plpgsql.check_asserts=on;`,
    guard.guardSql,
    `lock table supabase_migrations.schema_migrations in exclusive mode;
do $application_before$ declare actual jsonb; begin
 select (${ledgerSelect}) into actual;
 if actual->'ledger' is distinct from ${json(beforeLedger.ledger)} or
    actual->>'ledgerCatalogDigest' is distinct from ${literal(beforeLedger.ledgerCatalogDigest)} then
  raise exception 'JWG_APPLICATION_LEDGER_CHANGED'; end if;
 select (${baselineSelect}) into actual;
 if actual->>'catalogDigest' is distinct from ${literal(baseline.catalogDigest)} or
    jsonb_build_object('inventory',actual->'inventory','tables',actual->'tables','sequences',actual->'sequences')
      is distinct from ${json(expectedData)} then raise exception 'JWG_APPLICATION_BASELINE_CHANGED'; end if;
end $application_before$;`,
    buildFinancePoolerMutationIdentitySql(guard.nonce),ddl,financeSavepointAcceptanceSql(),ledgerInsert,
    `do $application_after$ declare actual jsonb; begin
 if exists(select 1 from public.membership_payment_confirmations where payment_group_id is not null) then
  raise exception 'JWG_APPLICATION_UNEXPECTED_GROUP_DATA'; end if;
 select (${preservedSelect}) into actual;
 if jsonb_build_object('inventory',actual->'inventory','tables',actual->'tables','sequences',actual->'sequences')
      is distinct from ${json(expectedData)} then raise exception 'JWG_APPLICATION_DATA_CHANGED'; end if;
 select (${ledgerSelect}) into actual;
 if actual->'ledger' is distinct from ${json([...beforeLedger.ledger,...rows])} or
    actual->>'ledgerCatalogDigest' is distinct from ${literal(beforeLedger.ledgerCatalogDigest)} then
  raise exception 'JWG_APPLICATION_LEDGER_RESULT_CHANGED'; end if;
 if to_regclass('pg_temp.finance_staging_fixture') is not null or
    to_regclass('pg_temp.finance_staging_baseline') is not null then
  raise exception 'JWG_APPLICATION_TEMP_FIXTURE_RESIDUE'; end if;
end $application_after$;`,
    baselineSelect+';',ledgerSelect+';',
    'commit;',
    `select jsonb_build_object('applicationCommitAcknowledged',true,'nonce','${guard.nonce}');`].join('\n');
  return Object.freeze({target:guard.target,nonce:guard.nonce,sql,sha256:hash(sql),
    guardSql:guard.guardSql,guardSha256:guard.guardSha256,
    expectedLedger:[...beforeLedger.ledger,...rows],
    componentSha256:Object.fromEntries(Object.entries(parts).map(([k,v])=>[k,hash(v)])),
    preparedOnly:true,remoteContact:false,readyToExecute:false});
}
