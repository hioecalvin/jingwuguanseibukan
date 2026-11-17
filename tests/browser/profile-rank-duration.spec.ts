import {test,expect} from './fixtures';
import {NAV_ORIGIN} from '../../scripts/browser-smoke-config.mjs';

test('profile counts calendar days per class and leaves unknown promotion dates unknown',async({page})=>{
 await page.clock.install({time:new Date('2026-11-17T12:00:00Z')});
 await page.goto(`${NAV_ORIGIN}/profile-contact`);
 await expect(page.getByRole('article')).toHaveCount(2);
 for (const rank of ['5th Kyu','8th Kyu']) {
  const disclosure=page.getByRole('button',{name:new RegExp(rank)});
  if(await disclosure.count() && await disclosure.getAttribute('aria-expanded') === 'false') await disclosure.click();
 }
 const times=page.getByRole('region',{name:'Time at current rank'});
 await expect(times).toHaveCount(2);
 await expect(times.first().getByRole('status')).toHaveText('2 days');
 await expect(times.first()).toContainText('15/11/2026');
 await expect(times.last().getByRole('status')).toHaveText('Unknown');
 await page.clock.fastForward(6*60*60*1000);
 await expect(times.first().getByRole('status')).toHaveText('3 days');
});
