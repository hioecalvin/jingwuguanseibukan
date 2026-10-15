import AxeBuilder from '@axe-core/playwright';

import { test, expect } from './fixtures';

const cases = [
  {
    id: '11111111-1111-4111-8111-111111111111', status: 'ISSUED - VALID',
    name: 'Akira Senior', rank: 'Shodan', number: 'JSG-ISSUED-001',
  },
  {
    id: '22222222-2222-4222-8222-222222222222', status: 'PENDING - NOT YET VALID',
    name: 'Budi Middle', rank: '2nd Kyu', number: 'JSG-PENDING-002',
  },
  {
    id: '33333333-3333-4333-8333-333333333333', status: 'VOID - NOT VALID',
    name: 'Citra Junior', rank: '4th Kyu', number: 'JSG-VOID-003',
  },
] as const;

test('public QR verification presents issued, pending, void and unknown records without downloads', async ({ page }) => {
  for (const item of cases) {
    await page.goto(`/certificate/verify/${item.id}`);
    await expect(page).toHaveTitle('Certificate verification - Jingwuguan Seibukan | Jingwuguan Seibukan');
    await expect(page.getByRole('heading', { name: 'Certificate verification' })).toBeVisible();
    await expect(page.getByRole('status')).toContainText(item.status);
    await expect(page.getByText(item.name, { exact: true })).toBeVisible();
    await expect(page.getByText(item.rank, { exact: true })).toBeVisible();
    await expect(page.getByText(item.number, { exact: true })).toBeVisible();
    await expect(page.getByText('This page verifies the current database record only.', { exact: false })).toBeVisible();
    await expect(page.getByRole('link')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }

  await page.goto('/certificate/verify/44444444-4444-4444-8444-444444444444');
  await expect(page.getByRole('heading', { name: 'Certificate not found' })).toBeVisible();
  await expect(page.getByRole('link')).toHaveCount(0);
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(scan.violations).toEqual([]);
});
