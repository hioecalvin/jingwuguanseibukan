// Existing disposable synthetic loopback cluster only; never a remote adapter.
import {LOCAL_INVENTORY_SQL,buildLocalBaselineSql,compareLocalBaselines} from './local-finance-baseline.mjs';
export function testFinanceBaselineDriftLocal({query}) {
  // Empty view replacement preserves its columns and relation OID. pg_rules does
  // not include the internal _RETURN rule, so definitions need explicit capture.
  query('create role finance_baseline_probe_actor nologin; create view public.fixture_baseline_view as select id from public.profiles where false;');
  const capture=()=>JSON.parse(query(buildLocalBaselineSql(JSON.parse(query(LOCAL_INVENTORY_SQL)))));
  const cases=[
    ['view definition','create or replace view public.fixture_baseline_view as select id from public.profiles where id is null;'],
    ['view security option','alter view public.fixture_baseline_view set (security_barrier=true);'],
    ['default privileges','alter default privileges in schema public grant select on tables to finance_baseline_probe_actor;'],
    ['role connection limit','alter role finance_baseline_probe_actor connection limit 2;'],
    ['database role settings',"alter role finance_baseline_probe_actor in database postgres set statement_timeout='7s';"],
  ];
  for(const [label,sql] of cases) {
    const before=capture();query(sql);const result=compareLocalBaselines(before,capture());
    if(result.unchanged||JSON.stringify(result.differences)!=='["catalogDigest"]')throw Error(`Missed catalog-only drift: ${label}`);
  }
  // All changed comparisons have already FAILED as required. Remove only these
  // synthetic probe objects so later independent acceptance tests start clean.
  query(`drop view public.fixture_baseline_view;
    alter default privileges in schema public revoke select on tables from finance_baseline_probe_actor;
    alter role finance_baseline_probe_actor in database postgres reset statement_timeout;
    drop role finance_baseline_probe_actor;`);
  console.log('PASS: real local baseline rejects view body/options, default ACL, role limit and database-role setting drift without relying on row changes');
}
