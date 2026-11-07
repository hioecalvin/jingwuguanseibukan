import { test, expect } from './fixtures';
import { NAV_ORIGIN } from '../../scripts/browser-smoke-config.mjs';

test('members can search all dojos and open the published contact links', async ({ page }) => {
  await page.goto(NAV_ORIGIN+'/dojo-contacts');
  await page.getByLabel('Search dojos').fill('North Dojo');
  await expect(page.getByRole('article')).toHaveCount(1);
  const toggle = page.locator('.compact-record-toggle');
  if (await toggle.isVisible()) await toggle.click();
  await expect(page.getByText('Fixture Instructor', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', {name: '+62 (812) 555-123'})).toHaveCount(0);
  await expect(page.getByRole('link',{name:'View schedules'})).toHaveAttribute('href','/schedules?dojo=dojo-a');
  await expect(page.getByRole('link', {name: '@fixture_dojo'})).toHaveAttribute('href','https://www.instagram.com/fixture_dojo/');
  await expect(page.getByRole('link', {name: 'Open Google Maps'})).toHaveAttribute('href','https://www.google.com/maps?q=north');
  await expect(page.getByRole('button',{name:'Edit dojo details'})).toHaveCount(0);
  await page.getByLabel('Search dojos').fill('South Dojo');
  if (await toggle.isVisible()) await toggle.click();
  await expect(page.getByText('Not provided', {exact:true})).toHaveCount(2);
  await expect(page.getByText('No active schedules')).toBeVisible();
  await expect(page.getByRole('link',{name:'View schedules'})).toHaveCount(0);
  await expect(page.getByText('Fixture Class · Inactive', { exact:true }).last()).toBeVisible();
});
test('malicious stored Maps link does not render, and unsafe edits are rejected before saving',async({page})=>{
  await page.goto(NAV_ORIGIN+'/dojo-contacts?admin-card&unsafe');
  await page.getByRole('button',{name:'Dojo details'}).click();
  await expect(page.getByRole('link',{name:'Open Google Maps'})).toHaveCount(0);
  await page.getByRole('button',{name:'Edit dojo details'}).click();
  await page.getByLabel('Dojo Instagram handle').fill('updated_dojo');
  await page.getByRole('button',{name:'Save dojo details'}).click();
  await expect(page.getByRole('alert')).toContainText('Google Maps HTTPS link');
  await page.getByLabel('Google Maps link').fill('https://maps.app.goo.gl/ValidShare');
  await page.getByRole('button',{name:'Save dojo details'}).click();
  await expect(page.getByRole('status')).toHaveText('Dojo details saved.');
  await expect(page.getByText('@updated_dojo',{exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:'Open Google Maps'})).toHaveAttribute('href','https://maps.app.goo.gl/ValidShare');
});
test('stale edits are retained until the editor reloads saved details',async({page})=>{
  await page.goto(NAV_ORIGIN+'/dojo-contacts?admin-card&conflict');
  await page.getByRole('button',{name:'Dojo details'}).click();
  await page.getByRole('button',{name:'Edit dojo details'}).click();
  await page.getByLabel('Dojo Instagram handle').fill('unsaved_dojo');
  await page.getByRole('button',{name:'Save dojo details'}).click();
  await expect(page.getByRole('alert')).toContainText('changed elsewhere');
  await expect(page.getByLabel('Dojo Instagram handle')).toHaveValue('unsaved_dojo');
  await expect(page.getByRole('button',{name:'Save dojo details'})).toBeDisabled();
  await page.getByRole('button',{name:'Reload saved dojo details'}).click();
  await expect(page.getByText('@fixture_dojo',{exact:true})).toBeVisible();
});

test('a schedule link opens the selected dojo details expanded', async ({page}) => {
  await page.goto(NAV_ORIGIN+'/dojo-contacts?dojo=dojo-a');
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('link',{name:'Open Google Maps'})).toBeVisible();
  await expect(page.getByRole('link',{name:'View schedules'})).toHaveAttribute('href','/schedules?dojo=dojo-a');
  await page.getByRole('button',{name:'Show all dojos'}).click();
  await expect(page.getByRole('article')).toHaveCount(2);
});