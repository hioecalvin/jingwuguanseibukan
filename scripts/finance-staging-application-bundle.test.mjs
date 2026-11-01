import test from 'node:test';
import assert from 'node:assert/strict';
import {stagingGuardFixture} from '../tests/fixtures/finance-staging-guard-evidence.mjs';
import {prepareFinanceStagingApplicationBundle,financeApplicationComponents,
  financeSavepointAcceptanceSql,financeApplicationSelect,financeApplicationPreservedDataSelect} from './finance-staging-application-bundle.mjs';
import {buildPublicFinanceBaselineSql} from './finance-baseline-core.mjs';

test('application components preserve exact ledger source and ordered reviewed DDL',()=>{
  const c=financeApplicationComponents();
  assert.deepEqual(c.rows.map(x=>x.version),['059','060']);
  for(const r of c.rows)assert.equal(r.statements[0],c.parts[r.version].replace(/\r\n?/g,'\n'));
  assert.doesNotMatch(c.ddl,/^\s*(begin|commit);/im);
  const a=financeSavepointAcceptanceSql();
  assert.ok(a.indexOf(c.parts.fixture)<a.indexOf(c.parts.assertions));
  assert.match(a,/reset role;set constraints all immediate;\nrollback to savepoint/);
  assert.ok(a.endsWith('release savepoint finance_application_acceptance;'));
});
test('preservation query exempts only the added payment_group_id property',()=>{
  const plan={inventory:[{name:'membership_payment_confirmations',kind:'r'},{name:'profiles',kind:'r'}]};
  const before=financeApplicationSelect(buildPublicFinanceBaselineSql(plan));
  const after=financeApplicationPreservedDataSelect(plan);
  assert.equal(after.replaceAll("to_jsonb(t)-'payment_group_id'",'to_jsonb(t)').replace('(to_jsonb(t))::text','to_jsonb(t)::text'),before);
  assert.throws(()=>financeApplicationPreservedDataSelect({inventory:[{name:'profiles',kind:'r'}]}));
  assert.throws(()=>financeApplicationSelect('select 1;commit;'));
});
test('atomic application refuses missing full inventory and untrusted guard overrides',async()=>{
  const c=await stagingGuardFixture();
  await assert.rejects(prepareFinanceStagingApplicationBundle(c),/Payment-confirmation/);
  for(const extra of [{sql:'commit;'},{skipGuard:true},{nonce:"';commit;--"}])
    await assert.rejects(prepareFinanceStagingApplicationBundle({...c,...extra}));
});
test('application has one commit only after accepted savepoint rollback, data and exact ledger checks',async()=>{
  const c=await stagingGuardFixture({includeFinanceInventory:true});
  const p=await prepareFinanceStagingApplicationBundle(c),{ddl}=financeApplicationComponents();
  assert.equal(p.expectedLedger.length,55);
  assert.ok(p.sql.indexOf('JWG_APPLICATION_LEDGER_CHANGED')<p.sql.indexOf(ddl));
  assert.ok(p.sql.indexOf(ddl)<p.sql.indexOf('savepoint finance_application_acceptance;'));
  assert.ok(p.sql.indexOf('rollback to savepoint')<p.sql.indexOf('insert into supabase_migrations.schema_migrations'));
  assert.ok(p.sql.indexOf('JWG_APPLICATION_DATA_CHANGED')<p.sql.lastIndexOf('\ncommit;'));
  // Ledger values contain the original migration COMMIT as quoted data.
  assert.equal((p.sql.replace(/'(?:''|[^'])*'/gs,"''").match(/^commit;$/gm)||[]).length,1);
  assert.equal(p.remoteContact,false);assert.equal(p.readyToExecute,false);
});
