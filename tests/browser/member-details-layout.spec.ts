import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures';
import { NAV_ORIGIN } from '../../scripts/browser-smoke-config.mjs';

const openId = 'Member ID 0101: Fixture Member';

test('rank progression cannot use the direct tier promotion control', async ({ page }) => {
  await page.goto(`${NAV_ORIGIN}/admin-last-training?promotion=1&rank-change=1`);
  await expect(page.getByRole('button', { name: 'Promote Tier', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: openId, exact: true }).click();
  await expect(page.getByText('Rank promotion is recorded through assessment.', {exact:true})).toBeVisible();
  await expect(page.getByRole('region', { name: 'Promote Fixture Member' })).not.toBeVisible();
  const calls = await page.evaluate(() => window.__lastTrainingFixture.trainingCalls);
  expect(calls).toEqual([]);
});

test('Member list opens contacts, rank, subscription history and records through the Member ID', async ({ page }, testInfo) => {
  await page.goto(`${NAV_ORIGIN}/admin-last-training?promotion=1`);
  const member = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Fixture Member', exact: true }) });
  const row = member.locator('.member-list-row');
  await expect(row).toBeVisible();
  await expect(row).toContainText('0101');
  const enrollments=member.getByRole('group',{name:'Classes enrolled for Fixture Member'});
  for (const value of ['Aikido','5th Kyu','Fixture Dojo']) await expect(enrollments).toContainText(value);
  await expect(member.getByText(/^Email:\s*member@example.test$/)).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Official Records', exact: true })).not.toBeVisible();
  expect(await page.evaluate(() => (window as Window & { __lastTrainingFixture: { historyQueries: unknown[] } }).__lastTrainingFixture.historyQueries)).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('member-list.png'), fullPage: true });
  await page.getByRole('button', { name: openId, exact: true }).click();
  await expect(member.getByRole('button', { name: 'Contact Details', exact: true })).toHaveAttribute('aria-expanded', 'true');
  await expect(member.getByText(/^Email:\s*member@example.test$/)).toBeVisible();
  await expect(member.getByText('Fixture Assessor', { exact: true })).toBeVisible();
  await expect(member.getByText('Paid 2026-12-02 · IDR 100,000 · FIXTURE-PAID', { exact: true })).toBeVisible();
  await expect(member.getByRole('button', { name: 'Export Official Member PDF', exact: true })).toBeVisible();
  await member.getByRole('button', { name: 'Older', exact: true }).click();
  await expect(member.getByText('Page 2', { exact: true })).toBeVisible();
  await expect(member.getByRole('button', { name: 'Older', exact: true })).toBeDisabled();
  await member.getByRole('button', { name: 'Newer', exact: true }).click();
  await expect(member.getByText('FIXTURE-PAID', { exact: false })).toBeVisible();
  await member.getByRole('button', { name: 'Update Training Session', exact: true }).click();
  const correction = member.getByLabel('Correct or backdate the session');
  await correction.fill('2026-09-10');
  await page.getByRole('button', { name: openId, exact: true }).click();
  await expect(correction).not.toBeVisible();
  await page.getByRole('button', { name: openId, exact: true }).click();
  await expect(correction).toHaveValue('2026-09-10');
  await expect(member.locator('.member-overview')).toContainText('01/08/2026');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(member.getByText('FIXTURE-PAID', { exact: false })).toBeVisible();
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(scan.violations).toEqual([]);
});

test('Selected membership status preserves confirmation and retry', async ({ page }) => {
  await page.goto(`${NAV_ORIGIN}/admin-last-training?promotion=1`);
  await page.getByRole('button', { name: openId, exact: true }).click();
  const status = page.getByRole('combobox', { name: 'Status for Fixture Member' });
  await status.selectOption('break_1');
  await expect(status).toHaveValue('break_1');
  await expect(page.getByRole('button', { name: 'Promote Tier', exact: true })).toHaveCount(0);
  await status.selectOption('active');
  await expect(status).toHaveValue('active');
  page.once('dialog', dialog => dialog.dismiss());
  await status.selectOption('inactive');
  await expect(status).toHaveValue('active');
  await page.evaluate(() => { (window as Window & { __lastTrainingFixture: { failNextStatus: boolean } }).__lastTrainingFixture.failNextStatus = true; });
  page.once('dialog', dialog => dialog.accept());
  await status.selectOption('inactive');
  await expect(page.getByText('Status update rejected for retry.', { exact: true })).toBeVisible();
  await expect(status).toHaveValue('active');
  page.once('dialog', dialog => dialog.accept());
  await status.selectOption('inactive');
  await expect(status).toHaveValue('inactive');
  const calls = await page.evaluate(() => (window as Window & { __lastTrainingFixture: { trainingCalls: Array<{ name: string }> } }).__lastTrainingFixture.trainingCalls);
  expect(calls.map(call => call.name)).toEqual(['record_membership_break', 'return_membership_active', 'set_membership_inactive', 'set_membership_inactive']);
});

test('Deceased row prevents status/promotion changes and subscription read failures can retry', async ({ page }) => {
  await page.goto(`${NAV_ORIGIN}/admin-last-training?promotion=1&deceased=1`);
  await page.getByRole('button', { name: openId, exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Status for Fixture Member' })).toBeDisabled();
  await expect(page.getByRole('combobox', { name: 'Status for Fixture Member' })).toContainText('Deceased');
  await expect(page.getByRole('button', { name: 'Promote Tier', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: openId, exact: true }).click();
  await page.evaluate(() => { (window as Window & { __lastTrainingFixture: { failNextHistory: boolean } }).__lastTrainingFixture.failNextHistory = true; });
  await page.getByRole('button', { name: openId, exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Subscription history could not be loaded.');
  await page.getByRole('button', { name: 'Retry subscription history', exact: true }).click();
  await expect(page.getByText('FIXTURE-PAID', { exact: false })).toBeVisible();
});

test('one JS ID groups class rows and sorting keeps them together',async({page})=>{
 await page.goto(NAV_ORIGIN+'/admin-last-training?multiple=1');
 const cards=page.locator('article[data-member-id]');
 await expect(cards).toHaveCount(3);
 const member=cards.filter({has:page.getByRole('heading',{name:'Fixture Member',exact:true})});
 await expect(member.getByRole('group',{name:'Classes enrolled for Fixture Member'}).getByRole('button',{name:/View Details:/})).toHaveCount(2);
 const names=()=>cards.locator('h2').allTextContents();
 await expect.poll(names).toEqual(['Amy Member','Fixture Member','Zara Member']);
 await page.getByLabel('Sort members').selectOption('name-desc');
 await expect.poll(names).toEqual(['Zara Member','Fixture Member','Amy Member']);
 await page.getByLabel('Sort members').selectOption('id-asc');
 await expect.poll(names).toEqual(['Zara Member','Amy Member','Fixture Member']);
 await page.getByLabel('Sort members').selectOption('id-desc');
 await expect.poll(names).toEqual(['Fixture Member','Amy Member','Zara Member']);
 await page.getByLabel('Class filter',{exact:true}).selectOption('fixture-karate-class');
 await expect(cards).toHaveCount(1);
 await expect(member.getByRole('group',{name:'Classes enrolled for Fixture Member'})).toContainText('Aikido');
 await member.getByRole('button',{name:'View Details: Karate at Second Dojo for Fixture Member',exact:true}).click();
 await expect(member.locator('.member-overview')).toContainText('4th Kyu');
 await expect(member.getByRole('combobox',{name:'Status for Fixture Member'})).toHaveValue('inactive');
 const queries=await page.evaluate(()=>window.__lastTrainingFixture.historyQueries);
 expect(queries.some(query=>query.filters.membership_id==='fixture-karate')).toBe(true);
 await member.getByRole('button',{name:'View Details: Aikido at Fixture Dojo for Fixture Member',exact:true}).click();
 await expect(member.locator('.member-overview')).toContainText('5th Kyu');
 await expect(member.getByRole('combobox',{name:'Status for Fixture Member'})).toHaveValue('active');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(scan.violations).toEqual([]);
});
