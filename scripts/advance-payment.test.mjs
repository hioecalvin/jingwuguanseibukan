import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { functionDeclarations, hasFixedPublicSearchPath } from './sql-function-attributes.mjs';
const sql=readFileSync('supabase/migrations/059_advance_subscription_payment_records.sql','utf8');
const body=name=>sql.match(new RegExp(`create (?:or replace )?function public\\.${name}\\([\\s\\S]*?as \\$function\\$([\\s\\S]*?)\\$function\\$;`,'i'))?.[1]??'';

test('overdue reports require existing bills and never invent historical debt',()=>{
  assert.match(body('quote_advance_subscription_payment'),/if billing_date < today_month then/);
  assert.match(body('quote_advance_subscription_payment'),/historical debt cannot be created/);
});
test('selected-month adjustment reuses audit history and requires scope, locks, reason and clean payment state',()=>{
  const adjustment=readFileSync('supabase/migrations/060_selected_month_fee_adjustment.sql','utf8');
  assert.doesNotMatch(adjustment,/create table|insert into public\.membership_payments/i);
  assert.match(adjustment,/insert into public\.membership_fee_adjustment_history/);
  assert.match(adjustment,/bill\.amount is distinct from expected_amount/);
  assert.match(adjustment,/status=case when new_amount=0 then 'waived'/);
  assert.match(adjustment,/from public\.membership_payment_confirmations where charge_id=bill.id and status='pending'/);
  assert.match(adjustment,/grant execute on function public\.adjust_unpaid_subscription_charge\(uuid,numeric,numeric,text\) to authenticated/);
  for(const declaration of functionDeclarations(adjustment))assert.ok(hasFixedPublicSearchPath(declaration));
});

test('pending payment migration has fixed search paths and explicit restricted grants',()=>{
  assert.equal(functionDeclarations(sql).length,7);
  for(const declaration of functionDeclarations(sql))assert.ok(hasFixedPublicSearchPath(declaration));
  for(const name of ['quote_advance_subscription_payment','record_advance_subscription_payment','submit_advance_subscription_payment','review_advance_subscription_payment','get_pending_advance_payment_groups']) {
    assert.match(sql,new RegExp(`revoke all on function public\\.${name}\\([^;]+from public, anon, authenticated, service_role;`));
    assert.match(sql,new RegExp(`grant execute on function public\\.${name}\\([^;]+to authenticated;`));
  }
  assert.doesNotMatch(sql,/cron\.schedule|net\.http|create table/i);
});
test('member reports delegate only to pending confirmations, never official payments',()=>{
  const report=body('submit_advance_subscription_payment');
  assert.match(report,/member_row\.user_id <> auth\.uid\(\)/);
  assert.match(report,/submit_membership_payment_confirmation/);
  assert.doesNotMatch(report,/record_membership_payment|insert into public\.membership_payments|set status\s*=\s*'paid'/i);
  assert.match(report,/quote_value is distinct from expected_quote/);
  assert.match(report,/transferred_amount <>/);
});
test('group review is scoped, serialized and cannot be split through the old single-month RPC',()=>{
  const review=body('review_advance_subscription_payment');
  assert.match(review,/can_access_dojo_finance/);
  assert.match(review,/order by pc\.id for update/);
  assert.match(review,/review_membership_payment_confirmation/);
  assert.match(sql,/deferrable initially deferred/);
  assert.match(body('enforce_payment_group_review'),/count\(distinct pc\.status\) > 1/);
});
test('receipt entry uses existing official records and rejects quote/total changes',()=>{
  const record=body('record_advance_subscription_payment');
  assert.match(record,/can_access_dojo_finance/);
  assert.match(record,/current_quote is distinct from expected_quote/);
  assert.match(record,/received_amount <>/);
  assert.match(record,/public\.record_membership_payment/);
  assert.match(sql,/and c\.amount > \(select coalesce\(sum\(mp\.amount\), 0\)/);
});
test('forms separate reporting from receipt and never silently retry a financial request',()=>{
  const form=readFileSync('components/advance-payment-form.tsx','utf8');
  assert.match(form,/Report payment — awaiting receipt/);
  assert.match(form,/Confirm money received/);
  assert.match(form,/expected_quote: quote/);
  assert.match(form,/if \(latch.current\) return/);
  assert.match(form,/Check payment history before retrying/);
});

test('inactive dojo visibility is scoped and does not grant writes or replace public policy',()=>{
  assert.match(sql,/on public\.dojos for select to authenticated\s+using \(public\.can_access_dojo_finance\(id, auth\.uid\(\)\)\)/);
  assert.doesNotMatch(sql,/drop policy|grant (?:insert|update|delete).*dojos/i);
});

test('legacy zero-fee fixes preserve function privileges and refuse unexpected definitions',()=>{
  const adjustment=readFileSync('supabase/migrations/060_selected_month_fee_adjustment.sql','utf8');
  for(const name of ['adjust_current_membership_fee','generate_dojo_monthly_subscription_charges','system_generate_monthly_subscriptions']) {
    assert.ok(adjustment.includes(`public.${name}(`));
    assert.doesNotMatch(adjustment,new RegExp(`grant execute on function public\\.${name}`));
  }
  assert.match(adjustment,/regexp_matches\(definition,pattern,'g'\)\) <> 1/);
  assert.match(adjustment,/Required existing zero-fee writer missing/);
});
