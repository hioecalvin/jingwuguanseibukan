import {test,expect} from './fixtures';
import { expandCompactRecords } from './compact-record-helpers';
import {NAV_ORIGIN} from '../../scripts/browser-smoke-config.mjs';
test('schedule category refresh fetches only selected rows and links to each dojo', async ({page}) => {
  await page.goto(NAV_ORIGIN+'/admin-schedules?member-view');
  await expect(page.getByRole('heading',{name:'Fixture Dojo',exact:true})).toBeVisible();
  await expandCompactRecords(page);
  await expect(page.getByText('Fixture Instructor / 2nd Dan',{exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:'083813636997'})).toHaveAttribute('href','tel:083813636997');
  await expect(page.getByRole('heading',{name:'South Dojo',exact:true})).toHaveCount(0);
  await page.getByLabel('Choose dojo').selectOption('dojo-b');
  await page.getByLabel('Choose dojo').selectOption('dojo-c');
  await expect(page.getByRole('heading',{name:'Kids Dojo',exact:true})).toBeVisible();
  await page.waitForTimeout(350);
  await expect(page.getByRole('heading',{name:'South Dojo',exact:true})).toHaveCount(0);
  await expect(page.getByRole('link',{name:'Kids Dojo'}).first()).toHaveAttribute('href','/dojos?dojo=dojo-c');
  await page.getByRole('button',{name:'By class',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Fixture Aikido',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Kungfu Kids',exact:true})).toHaveCount(0);
  await page.getByLabel('Choose class').selectOption('class-kids');
  await expect(page.getByRole('heading',{name:'Kungfu Kids',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Fixture Aikido',exact:true})).toHaveCount(0);
  await page.getByRole('button', {name: 'Refresh schedules'}).click();
  await expect(page.getByRole('button', {name: 'Refresh schedules'})).toBeEnabled();
  await expect(page.getByLabel('Choose class')).toHaveValue('class-kids');
  const requests = await page.evaluate(() => (window as unknown as {scheduleRequests: Array<{name: string; column?: string; value?: string}>}).scheduleRequests);
  expect(requests.filter(request => request.name === 'get_dojo_contact_details')).toHaveLength(1);
  expect(requests.filter(request => request.name === 'get_regular_schedules_with_instructor').map(request => [request.column, request.value])).toEqual([
    ['dojo_id', 'fixture-dojo'], ['dojo_id', 'dojo-b'], ['dojo_id', 'dojo-c'],
    ['class_id', 'fixture-class'], ['class_id', 'class-kids'], ['class_id', 'class-kids'],
  ]);
});

test('dojo schedule link selects its category directly',async({page})=>{
 await page.goto(NAV_ORIGIN+'/admin-schedules?member-view&dojo=dojo-c');
 await expect(page.getByLabel('Choose dojo')).toHaveValue('dojo-c');
 await expect(page.getByRole('heading',{name:'Kids Dojo',exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Fixture Dojo',exact:true})).toHaveCount(0);
});