import { NAV_ORIGIN } from '../../scripts/browser-smoke-config.mjs';
import { expandCompactRecords } from './compact-record-helpers';
import { test, expect } from './fixtures';

test('scoped Admin creates, edits and deactivates one regular schedule atomically', async ({ page }) => {
  await page.goto(`${NAV_ORIGIN}/admin-schedules`);
  await expect(page).toHaveTitle('Schedule mutation workflow fixture');
  await expect(page.getByRole('heading', { name: 'Manage regular schedules' })).toBeVisible();

  const dojo = page.getByRole('combobox', { name: 'Dojo and class' });
  const day = page.getByRole('combobox', { name: 'Day' });
  await expect(dojo).toHaveValue('fixture-dojo');
  await expect(day.getByRole('option', { name: 'Friday' })).toBeAttached();
  await day.selectOption('5');
  await page.getByLabel('Start time', { exact: true }).fill('18:30');
  await page.getByLabel('Finish time', { exact: true }).fill('20:00');
  const instructor = page.getByRole('combobox', { name: 'Instructor' });
  await expect(instructor.getByRole('option', { name: 'Fixture Instructor' })).toBeAttached();
  await instructor.selectOption('fixture-instructor');
  await page.getByLabel('Venue / room', { exact: false }).fill('Main hall');
  await page.getByLabel('Notes', { exact: false }).fill('Bring jo and bokken');
  await page.getByRole('button', { name: 'Add schedule' }).click();

  await expect(page.getByRole('status', { name: 'Schedule save result' })).toHaveText('Schedule created.');
  await expandCompactRecords(page);
  const card = page.getByRole('article');
  await expect(card.getByRole('heading', { name: 'Fixture Dojo — Fixture Aikido' })).toBeVisible();
  await expect(card).toContainText('Friday');
  await expect(card).toContainText('Fixture Instructor');
  await expect(card).toContainText('Venue: Main hall');
  await expect(card).toContainText('Bring jo and bokken');
  await expect(card).toContainText('ACTIVE');

  await card.getByRole('button', { name: 'Edit schedule' }).click();
  await expect(page.getByRole('heading', { name: 'Edit schedule' })).toBeVisible();
  await expect(page.getByLabel('Start time', { exact: true })).toHaveValue('18:30');
  await page.getByLabel('Venue / room', { exact: false }).fill('Upstairs hall');
  await page.getByLabel('Active and visible to members').uncheck();
  await page.getByRole('button', { name: 'Save changes' }).click();

  await expect(page.getByRole('status', { name: 'Schedule save result' })).toHaveText('Schedule updated.');
  await expect(card).toContainText('Venue: Upstairs hall');
  await expect(card).toContainText('INACTIVE');
  await expect(card.getByRole('button', { name: 'Edit schedule' })).toBeVisible();
  await expect(card.getByRole('link', { name: 'Fixture Dojo', exact: true })).toHaveAttribute('href', '/dojos?dojo=fixture-dojo');
});

test('schedule mutation errors stay visible and do not create a row', async ({ page }) => {
  await page.goto(`${NAV_ORIGIN}/admin-schedules`);
  await page.getByLabel('Start time', { exact: true }).fill('21:00');
  await page.getByLabel('Finish time', { exact: true }).fill('20:00');
  await page.getByRole('button', { name: 'Add schedule' }).click();

  await expect(page.getByRole('alert')).toHaveText('Finish time must be after start time.');
  await expect(page.getByText('No schedules exist for this dojo.')).toBeVisible();
});


test('changing dojo discards an edit and ignores late results from the previous dojo', async ({ page }) => {
  await page.goto(NAV_ORIGIN + '/admin-schedules?multi-scope');
  await expandCompactRecords(page);
  const card = page.getByRole('article');
  await card.getByRole('button', { name: 'Edit schedule' }).click();
  const dojo = page.getByRole('combobox', { name: 'Dojo and class' });
  await dojo.selectOption('dojo-b');
  await expect(page.getByRole('heading', { name: 'Add schedule', exact: true })).toBeVisible();
  await dojo.selectOption('dojo-c');
  await expandCompactRecords(page);
  await expect(card).toContainText('Kids Dojo');
  await page.waitForTimeout(350);
  await expect(card).not.toContainText('South Dojo');
  await page.getByRole('button', { name: 'Refresh schedules' }).click();
  await expect(page.getByRole('button', { name: 'Refresh schedules' })).toBeEnabled();
  await expect(card.getByRole('button', { name: 'Edit schedule' })).toBeVisible();
  const requests = await page.evaluate(() => (window as unknown as {scheduleRequests: Array<{name: string; column?: string; value?: string}>}).scheduleRequests);
  const reads = requests.filter(request => request.name === 'get_regular_schedules_with_whatsapp');
  expect(reads.map(request => [request.column, request.value])).toEqual([
    ['dojo_id', 'fixture-dojo'], ['dojo_id', 'dojo-b'], ['dojo_id', 'dojo-c'], ['dojo_id', 'dojo-c'],
  ]);
});
