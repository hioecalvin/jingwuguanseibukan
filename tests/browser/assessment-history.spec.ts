import { test, expect } from './fixtures';
import { NAV_ORIGIN } from '../../scripts/browser-smoke-config.mjs';
for(const scenario of ['throw-once','error-once']){
 test(`history recovers from ${scenario} without leaking errors or losing the filter`,async({page})=>{
  await page.goto(`${NAV_ORIGIN}/assessment-history-fixture?scenario=${scenario}`);
  await expect(page.getByRole('status')).toHaveText('Unable to load assessment history. Please retry.');
  await expect(page.getByText(/Private/)).toHaveCount(0);
  await page.getByLabel('Find a record').fill('2026-0042');
  await page.getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(page.getByText('2026-0042',{exact:true})).toBeVisible();
  await expect(page.getByText('2026-0001',{exact:true})).toHaveCount(0);
 });
}
test('empty history is distinct from a failed request',async({page})=>{
 await page.goto(`${NAV_ORIGIN}/assessment-history-fixture?scenario=empty`);
 await expect(page.getByRole('status')).toHaveText('No submitted assessments yet.');
 await expect(page.getByRole('button',{name:'Refresh',exact:true})).toBeEnabled();
});
test('history refresh is disabled until the request finishes',async({page})=>{
 await page.goto(`${NAV_ORIGIN}/assessment-history-fixture?scenario=slow`);
 await expect(page.getByRole('button',{name:'Loading…',exact:true})).toBeDisabled();
 await expect(page.getByRole('button',{name:'Refresh',exact:true})).toBeEnabled();
});
test('history keeps fail and pass separate with unique numbers and expandable details',async({page})=>{
 await page.goto(`${NAV_ORIGIN}/assessment-history-fixture`);
 await expect(page.getByText('2026-0001',{exact:true})).toBeVisible();
 await expect(page.getByText('2026-0042',{exact:true})).toBeVisible();
 await expect(page.locator('summary .font-mono')).toHaveText(['2026-0001', '2026-0042']);
 await expect(page.getByText(/^\d{2}-\d{4}$/)).toHaveCount(0);
 await expect(page.getByText('Reassess later',{exact:true})).not.toBeVisible();
 await page.locator('summary').filter({hasText:'2026-0001'}).click();
 await expect(page.getByText('Reassess later',{exact:true})).toBeVisible();
 await page.getByLabel('Find a record').fill('2026-0042');
 await expect(page.getByText('2026-0001',{exact:true})).toHaveCount(0);
 await expect(page.getByText('2026-0042',{exact:true})).toBeVisible();
 await expect(page.getByText('Pass',{exact:true})).toBeVisible();
});
