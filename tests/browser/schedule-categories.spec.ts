import { test, expect } from './fixtures';
import { NAV_ORIGIN } from '../../scripts/browser-smoke-config.mjs';

const fixture = NAV_ORIGIN + '/admin-schedules?member-view';
const dojoIds = Array.from({ length: 8 }, (_, index) => `10000000-0000-0000-0000-${String(index + 1).padStart(12, '0')}`);

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
  await expect(first.getByRole('link', { name: 'wa.me/6281234567890' })).toHaveAttribute('href', 'https://wa.me/6281234567890');

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
  expect(requests.filter(request => request.name === 'get_regular_schedules_with_whatsapp').map(r => [r.column, r.value])).toEqual([
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

test('combined dojos load only their approved UUIDs with mixed classes in day and time order', async ({ page }) => {
  await page.goto(fixture + '&grouped-dojos');
  const dojo = page.getByLabel('Choose dojo');
  await expect(dojo.getByRole('option')).toHaveText([
    'Select a dojo', 'Chushin', 'Chushin Annex · Karate', 'South Dojo · Aikido', 'Zhongxin', 'Zhongxin · Bagua',
  ]);
  await expect(page.getByRole('article')).toHaveCount(0);
  let reads = await page.evaluate(() => (window as unknown as {scheduleRequests: {name: string}[]}).scheduleRequests);
  expect(reads.filter(request => request.name === 'get_regular_schedules_with_whatsapp')).toHaveLength(0);

  await dojo.selectOption({ label: 'Chushin' });
  const rows = page.getByRole('article');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0).getByRole('button')).toContainText('Monday');
  await expect(rows.nth(0).getByRole('button')).toContainText('Karate');
  await expect(rows.nth(1).getByRole('button')).toContainText('Friday');
  await expect(rows.nth(1).getByRole('button')).toContainText('Aikido');
  for (let index = 0; index < 2; index++) {
    await expect(rows.nth(index).getByRole('button')).toHaveAttribute('aria-expanded', 'false');
    await rows.nth(index).getByRole('button').click();
    await expect(rows.nth(index).getByRole('link', {name:/^Chushin/})).toHaveAttribute('href', '/dojos?dojo=' + dojoIds[1 - index]);
  }
  await expect(rows.nth(0).getByText('WhatsApp not provided')).toBeVisible();
  await expect(rows.nth(0).locator('a[href^="https://wa.me/"]')).toHaveCount(0);

  await dojo.selectOption({ label: 'Zhongxin' });
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0).getByRole('button')).toContainText('Monday');
  await expect(rows.nth(0).getByRole('button')).toContainText('Kungfu Kids');
  await expect(rows.nth(1).getByRole('button')).toContainText('Xingyiquan');
  await expect(rows.nth(2).getByRole('button')).toContainText('Taijiquan');
  for (const [index, dojoIndex] of [4, 3, 2].entries()) {
    await rows.nth(index).getByRole('button').click();
    await expect(rows.nth(index).getByRole('link', {name:/^Zhongxin/})).toHaveAttribute('href', '/dojos?dojo=' + dojoIds[dojoIndex]);
  }

  await dojo.selectOption(dojoIds[5]);
  await expect(rows).toHaveCount(1);
  await expect(page.getByRole('heading', {name:'South Dojo',exact:true})).toBeVisible();

  await page.getByRole('button', { name: 'By class', exact: true }).click();
  const classPicker = page.getByLabel('Choose class');
  await expect(classPicker).toHaveValue('');
  await expect(rows).toHaveCount(0);
  await classPicker.selectOption('class-aikido');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0).getByRole('button')).toContainText('South Dojo');
  await expect(rows.nth(1).getByRole('button')).toContainText('Chushin');
  await classPicker.selectOption('class-taiji');
  await expect(rows).toHaveCount(1);
  await expect(page.getByRole('heading', {name:'Taijiquan',exact:true})).toBeVisible();

  reads = await page.evaluate(() => (window as unknown as {scheduleRequests: {name: string}[]}).scheduleRequests);
  expect(reads.filter(request => request.name === 'get_regular_schedules_with_whatsapp')).toEqual([
    {name:'get_regular_schedules_with_whatsapp',column:'dojo_id',values:dojoIds.slice(0,2)},
    {name:'get_regular_schedules_with_whatsapp',column:'dojo_id',values:dojoIds.slice(2,5)},
    {name:'get_regular_schedules_with_whatsapp',column:'dojo_id',value:dojoIds[5]},
    {name:'get_regular_schedules_with_whatsapp',column:'class_id',value:'class-aikido'},
    {name:'get_regular_schedules_with_whatsapp',column:'class_id',value:'class-taiji'},
  ]);
});

test('every grouped dojo UUID deep link resolves to its combined timetable', async ({ page }) => {
  for (const [index, dojoId] of dojoIds.slice(0,5).entries()) {
    await page.goto(fixture + '&grouped-dojos&dojo=' + dojoId);
    const title = index < 2 ? 'Chushin' : 'Zhongxin';
    await expect(page.getByLabel('Choose dojo')).toHaveValue('location-' + title);
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await expect(page.getByRole('article')).toHaveCount(index < 2 ? 2 : 3);
  }
});

test('a combined location with one visible dojo uses only that UUID', async ({ page }) => {
  await page.goto(fixture + '&grouped-dojos&limited-dojos&dojo=' + dojoIds[0]);
  await expect(page.getByLabel('Choose dojo').getByRole('option')).toHaveText(['Select a dojo', 'Chushin']);
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('article').getByRole('button')).toContainText('Aikido');
  const reads = await page.evaluate(() => (window as unknown as {scheduleRequests: {name: string}[]}).scheduleRequests);
  expect(reads.filter(request => request.name === 'get_regular_schedules_with_whatsapp')).toEqual([
    {name:'get_regular_schedules_with_whatsapp',column:'dojo_id',value:dojoIds[0]},
  ]);
  await page.goto(fixture + '&grouped-dojos&limited-dojos&dojo=' + dojoIds[1]);
  await expect(page.getByLabel('Choose dojo').getByRole('option', {name:'Chushin',exact:true})).toBeAttached();
  await expect(page.getByLabel('Choose dojo')).toHaveValue('');
  await expect(page.getByRole('article')).toHaveCount(0);
});
