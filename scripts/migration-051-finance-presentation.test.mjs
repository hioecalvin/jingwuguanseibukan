import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sql = await readFile(new URL("../supabase/migrations/051_finance_late_payment_presentation.sql", import.meta.url), "utf8");
const settlements = await readFile(new URL("../app/admin/settlements/page.tsx", import.meta.url), "utf8");
const payments = await readFile(new URL("../app/admin/payments/page.tsx", import.meta.url), "utf8");

test("finance presentation wraps rather than replaces settlement accounting", () => {
  assert.match(sql, /from public\.get_settlement_eligible_payments\(/i);
  assert.match(sql, /from public\.get_dojo_settlement_items\(/i);
  assert.doesNotMatch(sql, /create or replace function public\.(?:get_settlement_eligible_payments|get_dojo_settlement_items)\(/i);
  assert.doesNotMatch(sql, /(?:insert into|update|delete from) public\.(?:membership_payments|dojo_settlement_items|dojo_settlements)/i);
});

test("finance projections expose billing month and derive late payment by calendar month", () => {
  assert.match(sql, /billing_month date[\s\S]*payment_date date[\s\S]*is_late_payment boolean/i);
  assert.match(sql, /date_trunc\('month', eligible\.payment_date\)::date[\s\S]*>[\s\S]*date_trunc\('month', charge\.billing_month\)::date/i);
  assert.match(sql, /date_trunc\('month', item\.payment_date\)::date[\s\S]*>[\s\S]*date_trunc\('month', charge\.billing_month\)::date/i);
});

test("finance UI clearly labels charge month and late payments", () => {
  assert.match(settlements, /get_settlement_eligible_payment_details/);
  assert.match(settlements, /get_dojo_settlement_item_details/);
  assert.match(settlements, /Charge Billing Month/);
  assert.match(settlements, /LATE PAYMENT/g);
  assert.match(payments, /isLatePayment\(item\.billing_month, item\.transfer_date\)/);
  assert.match(payments, /LATE PAYMENT/g);
});

test("finance presentation RPCs retain narrow authenticated ACLs", () => {
  for (const signature of [
    "get_settlement_eligible_payment_details\\(uuid, date\\)",
    "get_dojo_settlement_item_details\\(uuid\\)",
  ]) {
    assert.match(sql, new RegExp(`revoke all privileges[\\s\\S]*${signature}[\\s\\S]*from public, anon, authenticated, service_role`, "i"));
    assert.match(sql, new RegExp(`grant execute[\\s\\S]*${signature}[\\s\\S]*to authenticated, service_role`, "i"));
  }
});
