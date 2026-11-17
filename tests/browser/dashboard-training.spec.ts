import {test,expect} from './fixtures';
import {NAV_ORIGIN} from '../../scripts/browser-smoke-config.mjs';

for (const role of ['member','admin','instructor','super_admin']) {
 for (const memberView of [false,true]) {
 test(`training shortcut follows training scopes for ${role}, member view ${memberView}`,async({page})=>{
  await page.goto(`${NAV_ORIGIN}/dashboard-fixture?role=${role}${memberView?'&member-view':''}`);
  await expect(page.getByRole('heading',{name:role==='member'||memberView?/Welcome,/:/Admin Dashboard/})).toBeVisible();
  const action=page.getByRole('button',{name:/Training Session/});
  if(['instructor','super_admin'].includes(role)) {
   await expect(action).toBeVisible();
   await action.click();
   await expect(page).toHaveURL(/\/admin\/training-sessions$/);
  } else await expect(action).toHaveCount(0);
 });
 }
}
