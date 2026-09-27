import { NAV_ORIGIN } from '../../scripts/browser-smoke-config.mjs';
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

  await expect(page.getByRole('status')).toHaveText('Schedule created.');
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

  await expect(page.getByRole('status')).toHaveText('Schedule updated.');
  await expect(card).toContainText('Venue: Upstairs hall');
  await expect(card).toContainText('INACTIVE');
});

test('schedule mutation errors stay visible and do not create a row', async ({ page }) => {
  await page.goto(`${NAV_ORIGIN}/admin-schedules`);
  await page.getByLabel('Start time', { exact: true }).fill('21:00');
  await page.getByLabel('Finish time', { exact: true }).fill('20:00');
  await page.getByRole('button', { name: 'Add schedule' }).click();

  await expect(page.getByRole('alert')).toHaveText('Finish time must be after start time.');
  await expect(page.getByText('No schedules exist in your scope.')).toBeVisible();
});
