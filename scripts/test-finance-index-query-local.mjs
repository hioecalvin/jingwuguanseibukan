// Called only by the loopback runner with its new isolated PostgreSQL cluster.
// The query is tested against synthetic metadata, never staged credentials/data.
import {readFileSync,readdirSync} from 'node:fs';
import {INDEX_REVIEW_TABLES,validateIndexCatalog} from './finance-index-capture.mjs';
import {verifyFinanceLedgerSnapshot,compareFinanceLedgerSnapshots} from './finance-ledger-evidence.mjs';
import {financeReleaseEvidenceQuery} from './finance-pooler-release-evidence.mjs';

export async function testFinanceIndexQueryLocal({run,psqlArgs,port}) {
  run('createdb',['-h','127.0.0.1','-p',String(port),'-U','postgres','-w','finance_catalog_probe']);
  const args=psqlArgs.map((value,index)=>psqlArgs[index-1]==='-d'?'finance_catalog_probe':value);
  const query=sql=>run('psql',[...args,'-qAt'],sql).trim();
  const dependencies=['expression','predicate','default','check','policy'];
  query(`create schema supabase_migrations;
    create table supabase_migrations.schema_migrations(version text primary key);
    insert into supabase_migrations.schema_migrations select lpad(n::text,3,'0') from generate_series(6,58) n;
    ${dependencies.map(name=>`create function public.fixture_catalog_${name}(value text) returns text
      language plpgsql immutable as $$ begin raise exception 'Metadata must not execute application functions';end $$;`).join('\n')}
    ${INDEX_REVIEW_TABLES.map(table=>`create table public.${table}(id uuid primary key,name text);`).join('\n')}
    create index fixture_expression_idx on public.classes(public.fixture_catalog_expression(name));
    create index fixture_predicate_idx on public.dojos(name) where public.fixture_catalog_predicate(name) is not null;
    alter table public.notifications add column guarded text;
    alter table public.notifications alter column guarded set default public.fixture_catalog_default('guard');
    alter table public.membership_payments add constraint fixture_guard_check check(public.fixture_catalog_check(name) is not null);
    alter table public.membership_subscription_charges enable row level security;
    create policy fixture_guard_policy on public.membership_subscription_charges for select
      using(public.fixture_catalog_policy(name) is not null);`);
  // Prove the tripwires really raise when invoked, then run unchanged query in
  // a different session whose transaction is server-enforced READ ONLY.
  query(`do $$ begin ${dependencies.map(name=>`begin
    perform public.fixture_catalog_${name}('probe');
    raise exception 'Missing tripwire' using errcode='XX000';
    exception when raise_exception then
      if sqlerrm<>'Metadata must not execute application functions' then raise;end if;
    end;`).join('\n')} end $$;`);
  const sql=readFileSync(new URL('../tests/sql/059_060_rehearsal_indexes_readonly.sql',import.meta.url),'utf8');
  const capture=JSON.parse(query(`begin read only;set local statement_timeout='10s';${sql}commit;`));
  const summary=validateIndexCatalog(capture,{localProbe:true});
  const found=capture.dependencyFunctions.map(r=>r.name);
  if(dependencies.some(name=>!found.includes(`fixture_catalog_${name}`))||
    summary.expressionIndexCount!==1||summary.partialIndexCount!==1||summary.indexCount!==12)
    throw Error('Local catalog query missed a synthetic dependency or index');
  console.log('PASS: prepared metadata query runs READ ONLY; captures expression/predicate/default/check/policy dependencies without invoking guarded functions (synthetic ledger only)');
  // A full ledger in this disposable database is synthetic evidence, NOT an
  // applied staging ledger. Stored migration text is inserted as data, not run.
  const migrationRoot=new URL('../supabase/migrations/',import.meta.url);
  const literal=value=>"'"+value.replaceAll("'","''")+"'";
  query(`alter table supabase_migrations.schema_migrations add column name text, add column statements text[];
    ${readdirSync(migrationRoot).filter(file=>/^\d{3}_.+\.sql$/.test(file)).sort().map(file=>
      `update supabase_migrations.schema_migrations set name=${literal(file.slice(4,-4))},
       statements=array[${literal(readFileSync(new URL(file,migrationRoot),'utf8'))}] where version=${literal(file.slice(0,3))};`).join('\n')}`);
  const ledgerSql=readFileSync(new URL('../tests/sql/059_060_ledger_readonly.sql',import.meta.url),'utf8');
  const before=JSON.parse(query(ledgerSql));
  await verifyFinanceLedgerSnapshot(before,{localProbe:true});
  const after=JSON.parse(query(ledgerSql));
  if(!(await compareFinanceLedgerSnapshots(before,after,{localProbe:true})).unchanged)
    throw Error('Independent local ledger captures differ');
  const bound=JSON.parse(query(financeReleaseEvidenceQuery('ledger').sql));
  if(bound.address!=='127.0.0.1'||bound.port!==port||!/^\d+$/.test(bound.clusterId)||
    !(await compareFinanceLedgerSnapshots(after,bound,{localProbe:true})).unchanged)
    throw Error('Server-bound ledger query lost identity or changed content');
  console.log('PASS: version-2 ledger query preserves exact ledger content and captures actual server address, port and cluster identity (local only)');
  query('alter table supabase_migrations.schema_migrations add column fixture_catalog_drift boolean;');
  const drift=await compareFinanceLedgerSnapshots(after,JSON.parse(query(ledgerSql)),{localProbe:true});
  if(JSON.stringify(drift.differences)!==JSON.stringify(['ledgerCatalogDigest']))throw Error('Ledger catalog drift missed');
  query("update supabase_migrations.schema_migrations set statements=array['select 1'] where version='006';");
  let rejected=false;
  try{await verifyFinanceLedgerSnapshot(JSON.parse(query(ledgerSql)),{localProbe:true});}catch{rejected=true;}
  if(!rejected)throw Error('Changed ledger SQL was accepted');
  console.log('PASS: fixed ledger query runs READ ONLY in independent local sessions; all 53 SQL bodies match; catalog and statement drift controls fail closed');
  // No cleanup against external systems. The parent stops/quarantines this entire
  // disposable cluster, including this separate synthetic metadata database.
}
