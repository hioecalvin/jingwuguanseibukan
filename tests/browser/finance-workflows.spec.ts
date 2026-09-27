import AxeBuilder from '@axe-core/playwright';

import { NAV_ORIGIN } from '../../scripts/browser-smoke-config.mjs';
import { test, expect } from './fixtures';

type DirectPaymentState = {
  failNextPayment: boolean;
  paymentCalls: Array<Record<string, unknown>>;
};

type PaymentReviewState = {
  failNextReview: boolean;
  reviewCalls: Array<Record<string, unknown>>;
};

type SettlementState = {
  failNextDetails: boolean;
  failNextReview: boolean;
  detailCalls: Array<Record<string, unknown>>;
  reviewCalls: Array<Record<string, unknown>>;
};

test('Admin records a complete payment without a Member confirmation request', async ({ page }) => {
  await page.goto(`${NAV_ORIGIN}/admin-direct-payment?tab=payments`);
  await expect(page).toHaveTitle('Direct payment workflow fixture');
  await expect(page.getByRole('heading', { name: 'Subscription & Payments' })).toBeVisible();
  await expect(page.getByText(/without waiting for a Member confirmation request/)).toBeVisible();

  const payments = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Member Payments' }) });
  await expect(payments).toContainText('Fixture Member');
  await expect(payments).toContainText(/Rp\s*100\.000/);
  await payments.getByRole('button', { name: 'Mark Full Payment' }).click();
  await expect(payments).toContainText('Full Payment Amount');
  await payments.getByLabel('Payment Reference').fill('CASH-2026-09');
  await payments.getByLabel('Payment Date').fill('2026-09-27');
  await payments.getByLabel('Notes').fill('Recorded at the dojo desk.');
  await payments.getByRole('button', { name: 'Confirm Direct Payment' }).click();

  await expect(page.getByText('Payment recorded successfully.')).toBeVisible();
  await expect(payments).toContainText('PAID');
  await expect(payments.getByRole('button', { name: 'Mark Full Payment' })).toBeDisabled();
  const state = await page.evaluate(() =>
    (window as Window & { __directPaymentFixture: DirectPaymentState }).__directPaymentFixture,
  );
  expect(state.paymentCalls).toEqual([{
    target_charge_id: 'fixture-charge',
    payment_amount: 100000,
    payment_method_value: 'Cash',
    payment_reference_value: 'CASH-2026-09',
    payment_date_value: '2026-09-27',
    payment_notes: 'Recorded at the dojo desk.',
  }]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('Full-payment rejection remains retryable with the entered audit details', async ({ page }) => {
  await page.goto(`${NAV_ORIGIN}/admin-direct-payment?tab=payments`);
  await page.evaluate(() => {
    (window as Window & { __directPaymentFixture: DirectPaymentState }).__directPaymentFixture.failNextPayment = true;
  });
  const payments = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Member Payments' }) });
  await payments.getByRole('button', { name: 'Mark Full Payment' }).click();
  await payments.getByLabel('Payment Reference').fill('FULL-1');
  await payments.getByRole('button', { name: 'Confirm Direct Payment' }).click();
  await expect(page.getByText('Direct payment rejected for retry.')).toBeVisible();
  await expect(payments.getByLabel('Payment Reference')).toHaveValue('FULL-1');
  await expect(payments.getByRole('button', { name: 'Confirm Direct Payment' })).toBeEnabled();
  await payments.getByRole('button', { name: 'Confirm Direct Payment' }).click();
  await expect(page.getByText('Payment recorded successfully.')).toBeVisible();
  await expect(payments).toContainText('PAID');
  const state = await page.evaluate(() =>
    (window as Window & { __directPaymentFixture: DirectPaymentState }).__directPaymentFixture,
  );
  expect(state.paymentCalls).toHaveLength(2);
  expect(state.paymentCalls.every(call => call.payment_amount === 100000)).toBe(true);
});

test('Admin reviews late and current payment confirmations with guarded retry', async ({ page }) => {
  page.on('dialog', dialog => dialog.accept());
  await page.goto(`${NAV_ORIGIN}/admin-payment-review`);
  await expect(page).toHaveTitle('Payment review workflow fixture');
  await expect(page.getByRole('heading', { name: 'Payment Confirmations' })).toBeVisible();

  const approval = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Approve Member' }) });
  await expect(approval).toContainText('August 2026');
  await expect(approval).toContainText('LATE PAYMENT');
  await approval.getByRole('button', { name: 'Approve Payment' }).click();
  await expect(page.getByText("Approve Member's payment was approved and recorded as an official payment.")).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'Approve Member' })).toContainText('APPROVED');

  const rejection = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Reject Member' }) });
  await rejection.getByRole('button', { name: 'Reject' }).click();
  await rejection.getByRole('button', { name: 'Confirm Rejection' }).click();
  await expect(page.getByText('A rejection reason is required.')).toBeVisible();
  await rejection.getByPlaceholder('Explain why this payment confirmation is being rejected...').fill('Amount does not match the receipt.');
  await page.evaluate(() => {
    (window as Window & { __paymentReviewFixture: PaymentReviewState }).__paymentReviewFixture.failNextReview = true;
  });
  await rejection.getByRole('button', { name: 'Confirm Rejection' }).click();
  await expect(page.getByText('Payment review rejected for retry.')).toBeVisible();
  await expect(rejection.getByPlaceholder('Explain why this payment confirmation is being rejected...')).toHaveValue('Amount does not match the receipt.');
  await rejection.getByRole('button', { name: 'Confirm Rejection' }).click();
  await expect(page.getByText("Reject Member's payment confirmation was rejected. The Member can submit another confirmation.")).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'Reject Member' })).toContainText('REJECTED');
  await expect(page.getByRole('row').filter({ hasText: 'Reject Member' })).toContainText('Amount does not match the receipt.');

  const state = await page.evaluate(() =>
    (window as Window & { __paymentReviewFixture: PaymentReviewState }).__paymentReviewFixture,
  );
  expect(state.reviewCalls).toEqual([
    { target_confirmation_id: 'fixture-approve', decision: 'approved', rejection_note: null },
    { target_confirmation_id: 'fixture-reject', decision: 'rejected', rejection_note: 'Amount does not match the receipt.' },
    { target_confirmation_id: 'fixture-reject', decision: 'rejected', rejection_note: 'Amount does not match the receipt.' },
  ]);
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(scan.violations).toEqual([]);
});

test('Super Admin reviews settlement details, late payments, exports, and retry-safe decisions', async ({ page }) => {
  await page.goto(`${NAV_ORIGIN}/admin-settlements`);
  await expect(page).toHaveTitle('Settlement workflow fixture');
  await expect(page.getByRole('heading', { name: 'Dojo Settlements' })).toBeVisible();
  await expect(page.getByLabel('Settlement status')).toHaveValue('all');
  await expect(page.getByLabel('Settlement dojo')).toHaveValue('all');
  await expect(page.getByLabel('Settlement month')).toHaveValue('');

  const approval = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'September 2026 · Fixture Dojo' }),
  });
  await approval.getByRole('button', { name: 'View Payments' }).click();
  const paymentRegion = approval.getByRole('region', { name: 'Included Member Payments' });
  await expect(paymentRegion.getByRole('row').filter({ hasText: 'Late Member' })).toContainText('August 2026');
  await expect(paymentRegion.getByRole('row').filter({ hasText: 'Late Member' })).toContainText('05/09/2026');
  await expect(paymentRegion.getByRole('row').filter({ hasText: 'Late Member' })).toContainText('LATE PAYMENT');
  await expect(paymentRegion.getByRole('row').filter({ hasText: 'Current Member' })).toContainText('On time');

  await approval.getByRole('button', { name: 'Hide Payments' }).click();
  await page.evaluate(() => {
    (window as Window & { __settlementFixture: SettlementState }).__settlementFixture.failNextDetails = true;
  });
  await approval.getByRole('button', { name: 'View Payments' }).click();
  await expect(page.getByText('Settlement details rejected for retry.')).toBeVisible();
  await approval.getByRole('button', { name: 'Hide Payments' }).click();
  await approval.getByRole('button', { name: 'View Payments' }).click();
  await expect(paymentRegion.getByRole('row').filter({ hasText: 'Late Member' })).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await approval.getByRole('button', { name: 'Export Detail' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('settlement-Fixture Dojo-2026-09.xlsx');
  await expect(page.getByText('Settlement detail exported to Excel.')).toBeVisible();

  await page.evaluate(() => {
    (window as Window & { __settlementFixture: SettlementState }).__settlementFixture.failNextReview = true;
  });
  await approval.getByRole('button', { name: 'Approve' }).click();
  await expect(page.getByText('Settlement review rejected for retry.')).toBeVisible();
  await expect(approval.getByRole('button', { name: 'Approve' })).toBeEnabled();
  await approval.getByRole('button', { name: 'Approve' }).click();
  await expect(page.getByText('Settlement approved.')).toBeVisible();
  await expect(approval.getByText('approved', { exact: true })).toBeVisible();

  const rejection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'September 2026 · Fixture Annex' }),
  });
  await rejection.getByRole('button', { name: 'Reject' }).click();
  await rejection.getByRole('button', { name: 'Confirm Rejection' }).click();
  await expect(page.getByText('A rejection reason is required.')).toBeVisible();
  await rejection.getByPlaceholder('Rejection reason').fill('Transfer reference needs correction.');
  await page.evaluate(() => {
    (window as Window & { __settlementFixture: SettlementState }).__settlementFixture.failNextReview = true;
  });
  await rejection.getByRole('button', { name: 'Confirm Rejection' }).click();
  await expect(page.getByText('Settlement review rejected for retry.')).toBeVisible();
  await expect(rejection.getByPlaceholder('Rejection reason')).toHaveValue('Transfer reference needs correction.');
  await rejection.getByRole('button', { name: 'Confirm Rejection' }).click();
  await expect(page.getByText('Settlement rejected. The Admin can correct it and resubmit.')).toBeVisible();
  await expect(rejection.getByText('rejected', { exact: true })).toBeVisible();
  await expect(rejection).toContainText('Transfer reference needs correction.');

  const state = await page.evaluate(() =>
    (window as Window & { __settlementFixture: SettlementState }).__settlementFixture,
  );
  expect(state.detailCalls).toEqual([
    { target_settlement_id: 'fixture-approve-settlement' },
    { target_settlement_id: 'fixture-approve-settlement' },
    { target_settlement_id: 'fixture-approve-settlement' },
    { target_settlement_id: 'fixture-approve-settlement' },
  ]);
  expect(state.reviewCalls).toEqual([
    { target_settlement_id: 'fixture-approve-settlement', decision: 'approved', rejection_note: null },
    { target_settlement_id: 'fixture-approve-settlement', decision: 'approved', rejection_note: null },
    { target_settlement_id: 'fixture-reject-settlement', decision: 'rejected', rejection_note: 'Transfer reference needs correction.' },
    { target_settlement_id: 'fixture-reject-settlement', decision: 'rejected', rejection_note: 'Transfer reference needs correction.' },
  ]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(scan.violations).toEqual([]);
});
