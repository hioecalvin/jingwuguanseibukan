import {test,expect} from './fixtures';
import {NAV_ORIGIN} from '../../scripts/browser-smoke-config.mjs';

test('calendar periods include perpetual annual dates and existing class events',async({page})=>{
 await page.clock.install({time:new Date('2026-11-17T12:00:00Z')});
 await page.goto(`${NAV_ORIGIN}/dashboard-fixture?calendar`);
 await expect(page.getByRole('heading',{name:'Calendar',exact:true})).toBeVisible();
 const section=page.getByRole('region',{name:'This year · 2026'});
 await expect(section.getByRole('article')).toHaveCount(3);
 await expect(section.getByRole('button',{name:/JS Birthday/})).toContainText('10/07/2026');
 await expect(section.getByRole('button',{name:/JS Independence Day/})).toContainText('11/11/2026');
 await section.getByRole('button',{name:/JS Birthday/}).click();
 await expect(section.getByText('10/07/2009',{exact:true})).toBeVisible();
 for(const name of ['Next month','Next 3 months','Next 6 months']) {
  await page.getByRole('button',{name,exact:true}).click();
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('article')).toContainText('Synthetic December seminar');
 }
 await page.getByRole('button',{name:'Next year',exact:true}).click();
 await expect(page.getByRole('article')).toHaveCount(2);
 await page.getByRole('button',{name:/JS Independence Day/}).click();
 await expect(page.getByText('11/11/2021',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:/JS Birthday/})).toContainText('10/07/2027');
 await expect(page.getByRole('button',{name:/JS Independence Day/})).toContainText('11/11/2027');
});
