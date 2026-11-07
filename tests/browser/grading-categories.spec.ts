import { test, expect } from './fixtures';
import { NAV_ORIGIN } from '../../scripts/browser-smoke-config.mjs';

test('member categories use their class terminology and Chinese filters distinguish Zhong from Gao', async ({ page }) => {
  await page.goto(NAV_ORIGIN + '/admin-last-training?grading-categories=1');
  const cards = page.locator('article[data-member-id]');
  await expect(cards).toHaveCount(6);
  const categoryFilter = page.getByRole('combobox', { name: 'Grade category filter', exact: true });
  await expect(categoryFilter.locator('option[value="mudansha"]')).toHaveText('Lower category');
  await expect(categoryFilter.locator('option[value="yudansha"]')).toHaveText('Higher category');

  for (const [id, name, category] of [
    ['0101', 'Fixture Member', 'Mudansha (Kyu)'],
    ['JS-0301', 'Karate Dan Member', 'Yudansha (Dan)'],
    ['JS-0302', 'Taijiquan Zhong Member', 'Shengwei'],
    ['JS-0303', 'Taijiquan Gao Member', 'Shiwei'],
    ['JS-0304', 'Xingyiquan Zhong Member', 'Shengwei'],
    ['JS-0305', 'Kungfu Kids Member', 'Shengwei'],
  ]) {
    const card = cards.filter({ has: page.getByRole('heading', { name, exact: true }) });
    await page.getByRole('button', { name: `Member ID ${id}: ${name}`, exact: true }).click();
    await expect(card.getByText(category, { exact: true }).first()).toBeVisible();
  }

  await categoryFilter.selectOption('yudansha');
  await expect(cards).toHaveCount(2);
  await expect(cards.locator('h2')).toHaveText(['Karate Dan Member', 'Taijiquan Gao Member']);
  await page.getByRole('combobox', { name: 'Class filter', exact: true }).selectOption('category-tai-class');
  await expect(categoryFilter.locator('option[value="mudansha"]')).toHaveText('Shengwei');
  await expect(categoryFilter.locator('option[value="yudansha"]')).toHaveText('Shiwei');
  await expect(cards).toHaveCount(1);
  await expect(cards.locator('h2')).toHaveText('Taijiquan Gao Member');
  await categoryFilter.selectOption('mudansha');
  await expect(cards.locator('h2')).toHaveText('Taijiquan Zhong Member');
  await expect(cards).toContainText('Zhongyi');

  await page.getByRole('combobox', { name: 'Class filter', exact: true }).selectOption('fixture-class');
  await expect(categoryFilter.locator('option[value="mudansha"]')).toHaveText('Mudansha (Kyu)');
  await expect(categoryFilter.locator('option[value="yudansha"]')).toHaveText('Yudansha (Dan)');
  await expect(cards.locator('h2')).toHaveText('Fixture Member');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
