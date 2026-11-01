import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

function source(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function count(sourceText, pattern) {
  return [...sourceText.matchAll(pattern)].length;
}

test("grading keeps assessor requirements and serialized progression wired together", () => {
  const members = source("app/admin/members/page.tsx");
  const gradingMigration = source(
    "supabase/migrations/029_serialize_membership_promotions.sql",
  );

  assert.match(members, /next\.next_level\s*===\s*"yudansha"/s);
  assert.match(members, /Enter the external assessor name/);
  assert.match(members, /Select a grading assessor/);
  assert.match(members, /"promote_membership"/);
  assert.match(members, /assessor_member_id:[\s\S]*isYudanshaGrading[\s\S]*external_assessor_name:/);
  const gradingBody = gradingMigration.match(
    /create or replace function public\.promote_membership[\s\S]*?as \$function\$([\s\S]*?)\$function\$;/i,
  )?.[1];
  assert.ok(gradingBody, "the grading migration must define promote_membership");
  assert.match(gradingBody, /for update/i);
  assert.ok(
    gradingBody.search(/for update/i) <
      gradingBody.search(/get_next_membership_promotion/i),
    "the membership row must be locked before calculating its next grade",
  );
  assert.match(gradingMigration, /promotion_effective_date < latest_effective_date/i);
});

test("title, certificate, archive and audit-history paths retain their historical records", () => {
  const members = source("app/admin/members/page.tsx");
  const certificates = source("app/admin/certificates/page.tsx");
  const archive = source("app/admin/archive/page.tsx");
  const reports = source("app/admin/reports/page.tsx");

  assert.match(members, /Only Super Admin can grant titles/);
  assert.match(members, /"grant_membership_title"/);
  assert.match(members, /"revoke_membership_title"/);
  assert.match(members, /A revoke reason is required/);
  assert.match(certificates, /"get_certificate_history"/);
  assert.match(certificates, /"get_certificate_print_log"/);
  assert.match(certificates, /retained for audit purposes/);
  assert.match(archive, /"search_document_archive"/);
  assert.match(reports, /"get_member_report_history"/);
});

test("all transfer rejection workflows stop blank reasons before mutation", () => {
  const transfers = source("app/admin/transfers/page.tsx");
  const atomicMigration = source(
    "supabase/migrations/020_enforce_admin_transfer_batch_atomicity.sql",
  );

  assert.equal(
    count(transfers, /"A rejection reason is required\."/g),
    3,
    "Member, individual Admin and Admin-batch rejection all need a reason",
  );
  assert.equal(count(transfers, /rejectionNote\s*=\s*reason\.trim\(\);/g), 3);
  assert.match(transfers, /"review_dojo_transfer"/);
  assert.match(transfers, /"review_admin_dojo_transfer"/);
  assert.match(transfers, /"review_admin_dojo_transfer_batch"/);
  assert.match(atomicMigration, /return public\.request_bulk_dojo_transfer\(/i);
  assert.match(atomicMigration, /revoke execute[\s\S]*from public, anon/i);
});

test("payment and subscription completion use guarded RPC-only paths", () => {
  const payments = source("app/admin/payments/page.tsx");
  const subscriptions = source("app/admin/subscriptions/page.tsx");
  const paymentMigration = source(
    "supabase/migrations/021_harden_payment_completion_and_notifications.sql",
  );
  const rateMigration = source(
    "supabase/migrations/030_preserve_subscription_rate_intervals.sql",
  );

  assert.match(payments, /"review_membership_payment_confirmation"/);
  assert.match(payments, /A rejection reason is required/);
  assert.match(subscriptions, /"record_membership_payment"/);
  assert.match(paymentMigration, /where id = target_charge_id\s+for update/is);
  assert.match(paymentMigration, /payment_amount > remaining_balance/i);
  assert.match(paymentMigration, /membership_payment_confirmation_(approved|rejected)/i);
  assert.match(rateMigration, /from public\.class_memberships cm[\s\S]*for update/is);
});

test("settlement lifecycle uses the unambiguous transfer contract and guarded rejection", () => {
  const settlements = source("app/admin/settlements/page.tsx");
  const settlementMigration = source(
    "supabase/migrations/022_remove_ambiguous_settlement_transfer_overload.sql",
  );

  for (const rpc of [
    "create_dojo_settlement",
    "set_dojo_settlement_transfer",
    "submit_dojo_settlement",
    "cancel_dojo_settlement",
    "review_dojo_settlement",
  ]) {
    assert.match(settlements, new RegExp(`"${rpc}"`));
  }
  assert.match(settlements, /decision === "rejected" && !note/);
  assert.match(settlementMigration, /drop function public\.set_dojo_settlement_transfer\(uuid, date, text, text, text\)/i);
  assert.match(settlementMigration, /grant execute[\s\S]*set_dojo_settlement_transfer\(uuid, date, text, text\)[\s\S]*to authenticated, service_role/i);
});

test("high-value administrative records remain exportable through the hardened shared exporter", () => {
  for (const page of [
    "app/admin/members/page.tsx",
    "app/admin/certificates/page.tsx",
    "app/admin/transfers/page.tsx",
    "app/admin/payments/page.tsx",
    "app/admin/subscriptions/page.tsx",
    "app/admin/settlements/page.tsx",
    "app/admin/reports/page.tsx",
  ]) {
    const pageSource = source(page);
    assert.match(pageSource, /from "@\/lib\/exportExcel"/);
    assert.match(pageSource, /exportToExcel/);
  }

  const exporter = source("lib/exportExcel.ts");
  assert.match(exporter, /escapeSpreadsheetFormula/);
  assert.match(exporter, /\^\[\\s\]\*\[=\+\\-@\]/);
});
