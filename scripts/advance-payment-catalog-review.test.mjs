import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewFinanceCatalog} from './advance-payment-catalog-review.mjs';
const empty=()=>({routines:[],policies:[],privileges:[],constraints:[],relations:[]});
test('offline finance audit never treats a saved catalog as live migration approval',()=>{
  const report=reviewFinanceCatalog(empty());
  assert.equal(report.liveVerified,false);assert.equal(report.readyToApply,false);
  assert.equal(report.blockers.length,5);
});
test('offline audit identifies helper consumers, RLS policies and legacy zero-fee labels',()=>{
  const catalog=empty();
  catalog.routines=[{schema_name:'public',routine_name:'billing',definition:"if public.can_access_dojo_finance(id) then case when rate.amount = 0 then 'paid' end;"}];
  catalog.policies=[{tablename:'history',policyname:'finance read',cmd:'SELECT',qual:'can_access_dojo_finance(dojo_id, auth.uid())'}];
  const report=reviewFinanceCatalog(catalog);
  assert.equal(report.directHelperConsumers[0].name,'billing');
  assert.deepEqual(report.zeroFeePaidWriters,['billing']);assert.equal(report.helperPolicies.length,1);
});
test('offline audit flags browser mutation grants and any candidate overload',()=>{
  const catalog=empty();
  catalog.privileges=[{table_schema:'public',table_name:'membership_payments',grantee:'authenticated',privilege_type:'UPDATE'}];
  catalog.routines=[{schema_name:'public',routine_name:'quote_advance_subscription_payment'}];
  const report=reviewFinanceCatalog(catalog);
  assert.equal(report.unsafeGrants.length,1);
  assert.ok(report.blockers.some(b=>b.includes('already exists')));
});

test('historical pretty constraint syntax is equivalent but additional allowed modes are rejected',()=>{
  const catalog=empty();
  catalog.constraints=[{schema_name:'public',table_name:'membership_fee_adjustment_history',
    constraint_name:'membership_fee_adjustment_history_type_check',
    definition:"CHECK (adjustment_type = ANY (ARRAY['this_month_only'::text, 'this_month_onward'::text, 'next_month_onward'::text]))"}];
  assert.ok(!reviewFinanceCatalog(catalog).blockers.some(b=>b.includes('Fee-history')));
  catalog.constraints[0].definition=catalog.constraints[0].definition.replace("'next_month_onward'::text","'next_month_onward'::text, 'unexpected'::text");
  assert.ok(reviewFinanceCatalog(catalog).blockers.some(b=>b.includes('Fee-history')));
});
