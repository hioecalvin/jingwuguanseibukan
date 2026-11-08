import { test, expect } from './fixtures';
import { NAV_ORIGIN } from '../../scripts/browser-smoke-config.mjs';

const fixture = NAV_ORIGIN + '/admin-schedules?member-view';

test('only the chosen category loads and details expand on demand', async ({ page }) => {
  await page.goto(fixture);
  const dojo = page.getByRole('combobox', { name: 'Choose dojo' });
  await expect(dojo.getByRole('option', { name: 'Fixture Dojo · Fixture Aikido' })).toBeAttached();
  await expect(dojo).toHaveValue('');
  await expect(page.getByRole('article')).toHaveCount(0);

  await dojo.selectOption('fixture-dojo');
  const first = page.getByRole('article').first();
  const disclosure = first.getByRole('button', { name: /Tuesday/ });
  await expect(disclosure).toHaveAttribute('aria-expanded', 'false');
  await expect(first.getByText('Fixture Instructor / 2nd Dan', { exact: true })).toBeHidden();
  await disclosure.click();
  await expect(first.getByText('Fixture Instructor / 2nd Dan', { exact: true })).toBeVisible();
  await expect(first.getByRole('link', { name: '083813636997' })).toHaveAttribute('href', 'tel:083813636997');

  await dojo.selectOption('dojo-b');
  await page.getByRole('button', { name: 'By class', exact: true }).click();
  const classPicker = page.getByRole('combobox', { name: 'Choose class' });
  await expect(classPicker).toHaveValue('');
  await expect(dojo).toHaveCount(0);
  await expect(classPicker.getByRole('option')).toHaveText(['Select a class', 'Fixture Aikido', 'Kungfu Kids']);
  await expect(page.getByRole('article')).toHaveCount(0);

  await classPicker.selectOption('fixture-class');
  await expect(page.getByRole('article')).toHaveCount(2);
  const south = page.getByRole('article').filter({ has: page.getByRole('button', { name: /South Dojo/ }) });
  await expect(south.getByText('Fixture Instructor / 2nd Dan', { exact: true })).toBeHidden();
  await south.getByRole('button', { name: /South Dojo/ }).click();
  await expect(south.getByRole('link', { name: 'South Dojo' })).toHaveAttribute('href', '/dojos?dojo=dojo-b');
  await expect(page.getByRole('article').first().getByText('Fixture Instructor / 2nd Dan', { exact: true })).toBeHidden();

  await classPicker.selectOption('class-kids');
  await expect(page.getByRole('heading', { name: 'Kungfu Kids', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Refresh schedules' }).click();
  await expect(page.getByRole('button', { name: 'Refresh schedules' })).toBeEnabled();
  await expect(classPicker).toHaveValue('class-kids');

  await page.getByRole('button', { name: 'By dojo', exact: true }).click();
  await expect(dojo).toHaveValue('');
  await expect(classPicker).toHaveCount(0);
  await page.waitForTimeout(350); // Delayed response from the previous dojo must not repopulate the list.
  await expect(page.getByRole('article')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'South Dojo', exact: true })).toHaveCount(0);
  const requests = await page.evaluate(() => (window as unknown as {
    scheduleRequests: Array<{ name: string; column?: string; value?: string }>;
  }).scheduleRequests);
  expect(requests.filter(request => request.name === 'get_dojo_contact_details')).toHaveLength(1);
  expect(requests.filter(request => request.name === 'get_regular_schedules_with_instructor').map(r => [r.column, r.value])).toEqual([
    ['dojo_id', 'fixture-dojo'], ['dojo_id', 'dojo-b'], ['class_id', 'fixture-class'],
    ['class_id', 'class-kids'], ['class_id', 'class-kids'],
  ]);
});

test('a dojo link opens only its requested schedule and invalid links never default to another dojo', async ({ page }) => {
  await page.goto(fixture + '&dojo=dojo-c');
  await expect(page.getByLabel('Choose dojo')).toHaveValue('dojo-c');
  await expect(page.getByRole('heading', { name: 'Kids Dojo', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Kids Dojo', exact: true })).toHaveAttribute('href', '/dojos?dojo=dojo-c');

  await page.goto(fixture + '&dojo=missing');
  const dojo = page.getByLabel('Choose dojo');
  await expect(dojo.getByRole('option', { name: 'Fixture Dojo · Fixture Aikido' })).toBeAttached();
  await expect(dojo).toHaveValue('');
  await expect(page.getByRole('article')).toHaveCount(0);
});
