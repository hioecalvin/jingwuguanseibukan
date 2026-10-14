import AxeBuilder from '@axe-core/playwright';
import {test,expect} from './fixtures';
import {NAV_ORIGIN} from '../../scripts/browser-smoke-config.mjs';
import {expandCompactRecords} from './compact-record-helpers';
type State={calls:{name:string;args:Record<string,unknown>}[];fail:boolean};
declare global {interface Window {__advancePayments:State}}

for(const mode of ['member','admin'])test(`${mode} can skip a month without including it in the payment`,async({page})=>{
  await page.goto(`${NAV_ORIGIN}/advance-payments?mode=${mode}`);await expandCompactRecords(page);
  await page.getByRole('combobox',{name:'Membership',exact:true}).selectOption('membership-1');
  await page.getByLabel('First month',{exact:true}).fill('2026-11');
  await page.getByLabel('Months to show').fill('3');
  await page.getByRole('button',{name:'Review monthly fees'}).click();
  await expect(page.getByText('Total: IDR 900000')).toBeVisible();
  await page.getByRole('checkbox',{name:'Pay 2026-12',exact:true}).uncheck();
  await expect(page.getByText('Total: IDR 900000')).toHaveCount(0);
  await page.getByRole('button',{name:'Review monthly fees'}).click();
  await expect(page.getByText('Total: IDR 600000')).toBeVisible();
  await page.getByLabel(mode==='member'?'Amount transferred':'Amount received',{exact:true}).fill('600000');
  await page.getByLabel('Payment date',{exact:true}).fill('2026-10-07');
  await page.getByRole('checkbox',{name:/^I (transferred|have received)/}).check();
  await page.getByRole('button',{name:mode==='member'?'Report payment — awaiting receipt':'Confirm money received',exact:true}).click();
  await expect(page.getByRole('status')).toContainText(mode==='member'?'Awaiting your dojo Admin':'now Paid');
  const last=await page.evaluate(()=>window.__advancePayments.calls.at(-1));
  expect(last?.args.requested_months).toEqual(['2026-11-01','2027-01-01']);
  expect(last?.args.month_count).toBe(2);
});

test('oldest unpaid suggestion is optional and empty selection makes no request',async({page})=>{
  await page.goto(`${NAV_ORIGIN}/advance-payments`);await expandCompactRecords(page);
  await page.getByRole('combobox',{name:'Membership',exact:true}).selectOption('membership-1');
  await page.getByRole('button',{name:'Choose oldest unpaid month (2026-07)'}).click();
  await expect(page.getByLabel('First month',{exact:true})).toHaveValue('2026-07');
  await page.getByRole('checkbox',{name:'Pay 2026-07',exact:true}).uncheck();
  await page.getByRole('button',{name:'Review monthly fees'}).click();
  await expect(page.getByRole('status')).toContainText('select 1–12 months');
  expect(await page.evaluate(()=>window.__advancePayments.calls)).toEqual([]);
});

test('waiving an overdue month requires reason and confirmation, without recording payment',async({page})=>{
  await page.goto(`${NAV_ORIGIN}/advance-payments?mode=waiver`);await expandCompactRecords(page);
  await page.getByLabel('New fee',{exact:true}).fill('0');
  await page.getByRole('button',{name:'Save month adjustment'}).click();
  await expect(page.getByRole('status')).toContainText('reason');
  expect(await page.evaluate(()=>window.__advancePayments.calls.length)).toBe(0);
  await page.getByLabel('Adjustment reason').fill('First month exempt');
  page.once('dialog',dialog=>dialog.dismiss());
  await page.getByRole('button',{name:'Save month adjustment'}).click();
  expect(await page.evaluate(()=>window.__advancePayments.calls.length)).toBe(0);
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  page.once('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'Save month adjustment'}).click();
  await expect(page.getByRole('status')).toContainText('Month waived. No money recorded');
  await expect(page.getByRole('button',{name:'Save month adjustment'})).toBeDisabled();
  expect(await page.evaluate(()=>window.__advancePayments.calls)).toEqual([{name:'adjust_unpaid_subscription_charge',
    args:{target_charge_id:'charge-1',expected_amount:'300000',new_amount:'0',adjustment_reason:'First month exempt'}}]);
});

test('uncertain fee adjustment locks the form until history is checked',async({page})=>{
  await page.goto(`${NAV_ORIGIN}/advance-payments?mode=waiver`);await expandCompactRecords(page);
  await page.getByLabel('New fee',{exact:true}).fill('250000');
  await page.getByLabel('Adjustment reason').fill('Agreed rate');
  await page.evaluate(()=>{window.__advancePayments.fail=true;});
  page.once('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'Save month adjustment'}).click();
  await expect(page.getByRole('status')).toContainText('Refresh and check history');
  await expect(page.getByRole('button',{name:'Save month adjustment'})).toBeDisabled();
  expect(await page.evaluate(()=>window.__advancePayments.calls.length)).toBe(1);
});

for(const mode of ['member','admin'])test(`${mode} records full months through the correct receipt boundary`,async({page})=>{
  await page.goto(`${NAV_ORIGIN}/advance-payments?mode=${mode}`);await expandCompactRecords(page);
  await page.getByRole('combobox',{name:'Membership',exact:true}).selectOption('membership-1');
  await page.getByLabel('First month',{exact:true}).fill('2026-11');
  await page.getByRole('button',{name:'Review monthly fees'}).click();
  await expect(page.getByText('Total: IDR 600000')).toBeVisible();
  const submit=page.getByRole('button',{name:mode==='member'?'Report payment — awaiting receipt':'Confirm money received',exact:true});
  await expect(submit).toBeDisabled();
  await page.getByLabel(mode==='member'?'Amount transferred':'Amount received',{exact:true}).fill('600000');
  await page.getByLabel('Payment date',{exact:true}).fill('2026-10-07');
  await page.getByRole('checkbox',{name:/^I (transferred|have received)/}).check();
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await submit.click();
  await expect(page.getByRole('status')).toContainText(mode==='member'?'Awaiting your dojo Admin':'now Paid');
  const calls=await page.evaluate(()=>window.__advancePayments.calls);
  const mutation=calls.filter(c=>c.name!== 'quote_advance_subscription_payment');
  expect(mutation).toHaveLength(1);
  expect(mutation[0].name).toBe(mode==='member'?'submit_advance_subscription_payment':'record_advance_subscription_payment');
  expect(mutation[0].args.expected_quote).toBeTruthy();
});

test('uncertain submission clears the quote and is not automatically replayed',async({page})=>{
  await page.goto(`${NAV_ORIGIN}/advance-payments`);await expandCompactRecords(page);
  await page.getByRole('combobox',{name:'Membership',exact:true}).selectOption('membership-1');
  await page.getByLabel('First month',{exact:true}).fill('2026-11');
  await page.getByRole('button',{name:'Review monthly fees'}).click();
  await page.getByLabel('Amount transferred').fill('600000');await page.getByLabel('Payment date').fill('2026-10-07');
  await page.getByRole('checkbox',{name:/^I (transferred|have received)/}).check();await page.evaluate(()=>{window.__advancePayments.fail=true;});
  await page.getByRole('button',{name:'Report payment — awaiting receipt'}).click();
  await expect(page.getByRole('status')).toContainText('Check payment history before retrying');
  await expect(page.getByRole('button',{name:'Report payment — awaiting receipt'})).toHaveCount(0);
  expect(await page.evaluate(()=>window.__advancePayments.calls.filter(c=>c.name==='submit_advance_subscription_payment').length)).toBe(1);
});

test('dojo Admin confirms all months only after the receipt confirmation dialog',async({page})=>{
  await page.goto(`${NAV_ORIGIN}/advance-payments?mode=review`);await expandCompactRecords(page);
  await expect(page.getByText('Fixture Member — IDR 600000')).toBeVisible();
  await expect(page.getByText('2026-11, 2027-01 (2 months)',{exact:true})).toBeVisible();
  page.once('dialog',dialog=>dialog.dismiss());
  await page.getByRole('button',{name:'Confirm received — all months'}).click();
  expect(await page.evaluate(()=>window.__advancePayments.calls.filter(c=>c.name==='review_advance_subscription_payment').length)).toBe(0);
  page.once('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'Confirm received — all months'}).click();
  await expect(page.getByRole('status')).toContainText('all months Paid');
  expect(await page.evaluate(()=>window.__advancePayments.calls.find(c=>c.name==='review_advance_subscription_payment')?.args))
    .toEqual({target_group_id:'group-1',decision:'approved',rejection_note:null});
});
