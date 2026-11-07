// Synthetic loopback fixture-body test only. The ordering ticket is explicitly
// simulated here; this does NOT exercise/claim the positive staging TLS guard.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compareLocalBaselines} from './local-finance-baseline.mjs';
import {financeSavepointAcceptanceSql} from './finance-staging-application-bundle.mjs';
export function testFinanceStagingFixtureLocal({psqlArgs,query,capture,fixtureSetup}){
  assert.equal(psqlArgs[psqlArgs.indexOf('-h')+1],'127.0.0.1');
  const fixture=readFileSync(new URL('../tests/sql/059_060_staging_fixture.sql',import.meta.url),'utf8');
  const assertions=readFileSync(new URL('../tests/sql/059_060_staging_fixture_assertions.sql',import.meta.url),'utf8');
  const nonce='e'.repeat(32),bindings={member:'10000000-0000-4000-8000-000000000001',
    admin:'10000000-0000-4000-8000-000000000002',superAdmin:'10000000-0000-4000-8000-000000000003'};
  const ticket={projectRef:'eomubndonbetszdbhsrj',nonce,bindings};
  // These schema/data adjustments are confined to the existing disposable local
  // transaction, NEVER part of the new staging fixture or any remote bundle.
  const localSetup=`${fixtureSetup}
alter table public.profiles add column registration_number text;
update public.profiles set registration_number=case id
 when '${bindings.member}' then '0101' when '${bindings.admin}' then '0002'
 when '${bindings.superAdmin}' then '0001' else null end;
set local plpgsql.check_asserts=on;
set local application_name='jwg-finance-rehearsal-${nonce}';`;
  const simulatedTicket=t=>`set local jwg.staging_fixture_ticket='${JSON.stringify(t)}';`;
  const before=capture();
  query(['begin;',localSetup,simulatedTicket(ticket),fixture,assertions,'rollback;'].join('\n'));
  assert.equal(compareLocalBaselines(before,capture()).unchanged,true);
  // The permanent application runs the same fixture inside a savepoint, then
  // rolls it back before the surrounding migration transaction may commit.
  query(['begin;',localSetup,simulatedTicket(ticket),
    `create temporary table application_original as select
      (select jsonb_agg(to_jsonb(t) order by id) from public.class_memberships t) memberships,
      (select jsonb_agg(to_jsonb(t) order by id) from public.notifications t) notifications,
      (select jsonb_agg(to_jsonb(t) order by id) from public.membership_subscription_charges t) charges;`,
    financeSavepointAcceptanceSql(),
    `do $$ begin
      assert to_regclass('pg_temp.finance_staging_fixture') is null;
      assert to_regclass('pg_temp.finance_staging_baseline') is null;
      assert (select jsonb_agg(to_jsonb(t) order by id) from public.class_memberships t)
        is not distinct from (select memberships from application_original);
      assert (select jsonb_agg(to_jsonb(t) order by id) from public.notifications t)
        is not distinct from (select notifications from application_original);
      assert (select jsonb_agg(to_jsonb(t) order by id) from public.membership_subscription_charges t)
        is not distinct from (select charges from application_original);
    end $$;`,'rollback;'].join('\n'));
  assert.equal(compareLocalBaselines(before,capture()).unchanged,true);
  console.log('PASS: application acceptance savepoint rolls back fixture, messages, charges and temporary tables without aborting the outer transaction');
  assert.equal(query("select coalesce(to_regclass('pg_temp.finance_staging_fixture')::text,'absent');"),'absent');
  for(const [setup,expected] of [
    ['',/JWG_STAGING_FIXTURE_GUARD_REJECTED/],
    [simulatedTicket({...ticket,nonce:'f'.repeat(32)}),/JWG_STAGING_FIXTURE_GUARD_REJECTED/],
    [simulatedTicket({...ticket,bindings:{...bindings,admin:bindings.member}}),/JWG_STAGING_FIXTURE_ACTORS_REJECTED/],
  ]){
    assert.throws(()=>query(['begin;',localSetup,setup,fixture,'rollback;'].join('\n')),expected);
    assert.equal(compareLocalBaselines(before,capture()).unchanged,true);
  }
  const corrupt="update public.profiles set full_name='SYNTHETIC NEGATIVE CONTROL' where id='"+bindings.member+"';";
  assert.throws(()=>query(['begin;',localSetup,simulatedTicket(ticket),fixture,corrupt,assertions,'rollback;'].join('\n')),
    /All profiles unchanged/);
  assert.equal(compareLocalBaselines(before,capture()).unchanged,true);
  console.log('PASS: separate three-account staging fixture/assertions execute on local PG17 with simulated ordering ticket; missing/wrong ticket, duplicate actors and original-profile mutation rejected; public catalog/data/sequences unchanged after every rollback');
}
