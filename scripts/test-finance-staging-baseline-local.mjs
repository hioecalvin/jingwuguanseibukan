// Execute the prepared SQL ONLY through the existing synthetic loopback harness.
// No local bypass exists in the staging verifier: actual non-TLS local rows fail it.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {prepareFinanceStagingInventory,prepareFinanceStagingBaseline,verifyFinanceStagingBaselineCapture} from './finance-staging-baseline.mjs';
import {verifyLocalBaseline,compareLocalBaselines} from './local-finance-baseline.mjs';
import {prepareFinanceBaselinePrerequisites,verifyFinancePrerequisiteCapture} from './finance-baseline-prerequisites.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
export function testFinanceStagingBaselineSqlLocal({query}) {
  const target={projectRef:'eomubndonbetszdbhsrj',transport:'session-pooler',host:'aws-0-ap-southeast-2.pooler.supabase.com',
    port:5432,database:'postgres',user:'postgres.eomubndonbetszdbhsrj',sslmode:'verify-full'};
  const inventoryPlan=prepareFinanceStagingInventory(target);
  const actualInventory=JSON.parse(query(inventoryPlan.sql));
  assert.equal(actualInventory.address,'127.0.0.1');assert.equal(actualInventory.ssl,false);
  // Exact fixed catalog SQL on real local PG17. Custom cast must be inspected,
  // not executed; its exception makes accidental invocation fail this test.
  const prereq=prepareFinanceBaselinePrerequisites();
  query(`create schema finance_prereq_probe;
    create type finance_prereq_probe.choice as enum ('synthetic');
    create type finance_prereq_probe.item as (value finance_prereq_probe.choice);
    create domain finance_prereq_probe.items as finance_prereq_probe.item[];
    create type finance_prereq_probe.span as range (subtype=integer);
    create function finance_prereq_probe.forbidden_json(finance_prereq_probe.item) returns json
      language plpgsql as $$ begin raise exception 'Custom cast must not execute'; end $$;
    create cast (finance_prereq_probe.item as json) with function finance_prereq_probe.forbidden_json(finance_prereq_probe.item);
    create table public.finance_prereq_probe (items finance_prereq_probe.items, spans finance_prereq_probe.span_multirange);
    insert into public.finance_prereq_probe values (array[row('synthetic'::finance_prereq_probe.choice)::finance_prereq_probe.item],null);`);
  try {
    const metadata=JSON.parse(query(prereq.sql));
    assert.equal(metadata.readOnly,'on');assert.equal(metadata.controlSystemExecutable,true);
    for(const name of ['choice','item','_item','items','span','span_multirange'])
      assert.ok(metadata.types.some(t=>t.schema==='finance_prereq_probe'&&t.name===name),name);
    assert.ok(metadata.functions.some(f=>f.schema==='finance_prereq_probe'&&f.name==='forbidden_json'));
    assert.ok(metadata.casts.length>0);
    const envelope=Buffer.from(JSON.stringify({schemaVersion:1,kind:'public-finance-prerequisites',
      target,querySha256:prereq.querySha256,clientsExitedCleanly:true,snapshot:metadata}));
    assert.throws(()=>verifyFinancePrerequisiteCapture(envelope,hash(envelope)),/staging identity/);
  } finally {
    query('drop table public.finance_prereq_probe; drop schema finance_prereq_probe cascade;');
  }
  console.log('PASS: catalog-only prerequisite SQL follows domains/arrays/composites/ranges/multiranges and records custom JSON casts without invoking them; loopback evidence rejected by staging verifier');
  assert.throws(()=>prepareFinanceStagingBaseline(target,actualInventory));
  // Synthetic claims used for SQL generation only. Actual captured rows below
  // remain unaltered and are explicitly rejected by the staging verifier.
  const syntheticPlan={...actualInventory,address:'192.0.2.1',ssl:true};
  const plan=prepareFinanceStagingBaseline(target,syntheticPlan);
  const first=JSON.parse(query(plan.sql)),second=JSON.parse(query(plan.sql));
  verifyLocalBaseline(first);verifyLocalBaseline(second);
  assert.equal(compareLocalBaselines(first,second).unchanged,true);
  assert.deepEqual(first.inventory,actualInventory.inventory);
  const capture=Buffer.from(JSON.stringify({schemaVersion:1,kind:'public-finance-baseline',target,
    clientsExitedCleanly:true,inventory:actualInventory,snapshot:first,
    inventoryQuerySha256:inventoryPlan.querySha256,baselineQuerySha256:plan.querySha256}));
  assert.throws(()=>verifyFinanceStagingBaselineCapture(capture,hash(capture)),/staging read-only identity/);
  console.log('PASS: prepared staging baseline SQL runs READ ONLY on synthetic PG17; public row/catalog/sequence coverage matches; actual loopback/non-TLS captures cannot pass staging verification');
}
