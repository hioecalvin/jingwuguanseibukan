import { test, expect } from './fixtures';
import { NAV_ORIGIN } from '../../scripts/browser-smoke-config.mjs';

test('members can search all dojos and open the published contact links', async ({ page }) => {
  await page.goto(NAV_ORIGIN+'/dojo-contacts');
  await page.getByLabel('Search dojos').fill('North Address');
  await expect(page.getByRole('article')).toHaveCount(1);
  const toggle = page.locator('.compact-record-toggle');
  if (await toggle.isVisible()) await toggle.click();
  await expect(page.getByText('Fixture Instructor', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', {name: '+62 (812) 555-123'})).toHaveAttribute('href','tel:+62812555123');
  await expect(page.getByRole('link', {name: '@fixture_dojo'})).toHaveAttribute('href','https://www.instagram.com/fixture_dojo/');
  await expect(page.getByRole('link', {name: 'Open Google Maps'})).toHaveAttribute('href','https://www.google.com/maps?q=north');
  await expect(page.getByRole('button',{name:'Edit dojo details'})).toHaveCount(0);
  await page.getByLabel('Search dojos').fill('South Dojo');
  if (await toggle.isVisible()) await toggle.click();
  await expect(page.getByText('Not provided', {exact:true})).toHaveCount(5);
  await expect(page.getByText('Fixture Class · Inactive', { exact:true }).last()).toBeVisible();
});
test('malicious stored Maps link does not render, and unsafe edits are rejected before saving',async({page})=>{
  await page.goto(NAV_ORIGIN+'/dojo-contacts?admin-card&unsafe');
  await page.getByRole('button',{name:'Dojo contact & location'}).click();
  await expect(page.getByRole('link',{name:'Open Google Maps'})).toHaveCount(0);
  await page.getByRole('button',{name:'Edit dojo details'}).click();
  await page.getByLabel('Contact instructor name').fill('Updated Contact');
  await page.getByRole('button',{name:'Save dojo details'}).click();
  await expect(page.getByRole('alert')).toContainText('Google Maps HTTPS link');
  await page.getByLabel('Google Maps link').fill('https://maps.app.goo.gl/ValidShare');
  await page.getByRole('button',{name:'Save dojo details'}).click();
  await expect(page.getByRole('status')).toHaveText('Dojo details saved.');
  await expect(page.getByText('Updated Contact',{exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:'Open Google Maps'})).toHaveAttribute('href','https://maps.app.goo.gl/ValidShare');
});
test('stale edits are retained until the editor reloads saved details',async({page})=>{
  await page.goto(NAV_ORIGIN+'/dojo-contacts?admin-card&conflict');
  await page.getByRole('button',{name:'Dojo contact & location'}).click();
  await page.getByRole('button',{name:'Edit dojo details'}).click();
  await page.getByLabel('Contact instructor name').fill('Unsaved Contact');
  await page.getByRole('button',{name:'Save dojo details'}).click();
  await expect(page.getByRole('alert')).toContainText('changed elsewhere');
  await expect(page.getByLabel('Contact instructor name')).toHaveValue('Unsaved Contact');
  await expect(page.getByRole('button',{name:'Save dojo details'})).toBeDisabled();
  await page.getByRole('button',{name:'Reload saved dojo details'}).click();
  await expect(page.getByText('Fixture Instructor',{exact:true})).toBeVisible();
});
