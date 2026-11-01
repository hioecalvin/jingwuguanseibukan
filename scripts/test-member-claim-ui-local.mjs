// Component interaction tests only: synthetic API responses, no real backend.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from '@playwright/test';
const repo=fileURLToPath(new URL('../',import.meta.url));
const root=mkdtempSync(join(tmpdir(),'jwg-claim-ui-'));
const entry=`import React from 'react';import {createRoot} from 'react-dom/client';
import RequestForm from ${JSON.stringify(resolve(repo,'app/claim-id/request-form.tsx'))};
import VerifyForm from ${JSON.stringify(resolve(repo,'app/claim-id/verify/verify-form.tsx'))};
import SetupForm from ${JSON.stringify(resolve(repo,'app/claim-id/setup/setup-form.tsx'))};
import Reviews from ${JSON.stringify(resolve(repo,'app/admin/member-claims/reviews.tsx'))};
const Component=location.pathname==='/setup'?SetupForm:location.pathname==='/verify'?VerifyForm:location.pathname==='/reviews'?Reviews:RequestForm;
createRoot(document.getElementById('root')).render(<React.StrictMode><Component/></React.StrictMode>);`;
await build({stdin:{contents:entry,resolveDir:repo,loader:'tsx'},bundle:true,jsx:'automatic',platform:'browser',format:'iife',outfile:join(root,'app.js'),define:{'process.env.NODE_ENV':'"production"','process.env':'{}'}});
const server=createServer((request,response)=>{
 if(request.url==='/app.js'){response.setHeader('content-type','text/javascript');response.end(readFileSync(join(root,'app.js')));}
 else {response.setHeader('content-type','text/html');response.end('<!doctype html><html><head><meta name="viewport" content="width=device-width"><meta name="referrer" content="no-referrer"></head><body><div id="root"></div><script src="/app.js"></script></body></html>');}
});
await new Promise(resolveListen=>server.listen(0,'127.0.0.1',resolveListen));
const origin=`http://127.0.0.1:${server.address().port}`;
let browser,passed=false,checks=0;
let reviewState='verified';
const calls=[],external=[],errors=[];
const claimId='11111111-1111-4111-8111-111111111111',token='a'.repeat(64);
try {
 browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin!==origin){external.push(url.origin);return route.abort();}
  if(url.pathname.startsWith('/api/')){
   const data=route.request().postDataJSON();calls.push({path:url.pathname,data});
   if(url.pathname==='/api/admin/member-claims' && data.action==='approve')reviewState='approved';
   const body=url.pathname==='/api/admin/member-claims'?
    data.action==='list'?{claims:[{claim_id:claimId,member_id:'JS-0103',full_name:'Synthetic Member',claimed_email:'member@example.invalid',state:reviewState}]}:{message:data.action==='retry_setup'?'A setup-email retry was requested.':'Identity claim approved.'}:
    url.pathname.endsWith('/setup')?{message:'Your account is ready. Sign in now.'}:url.pathname.endsWith('/verify')?{message:'Email verified. Awaiting Dojo Admin.'}:{message:'If eligible, a verification link will be sent.'};
   return route.fulfill({status:url.pathname.endsWith('/request')?202:200,contentType:'application/json',body:JSON.stringify(body)});
  }
  return route.continue();
 });
 const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',error=>errors.push(error.message));
 await page.goto(origin+'/request');
 await page.getByLabel('Registered email address').fill('member@example.invalid');await page.getByLabel('Registered date of birth').fill('1996-11-14');
 await page.getByRole('button',{name:'Send verification link'}).click();
 await page.getByRole('status').filter({hasText:'If eligible'}).waitFor();checks++;
 assert.deepEqual(calls.at(-1).data,{email:'member@example.invalid',dateOfBirth:'1996-11-14'});checks++;
 const before=calls.length;
 await page.goto(origin+`/verify#claim=${claimId}&token=${token}`);
 await page.waitForFunction(()=>location.hash==='');
 assert.equal(calls.length,before,'Opening email link must not verify automatically');checks++;
 assert.ok(!(await page.locator('body').innerText()).includes(token));checks++;
 await page.getByRole('button',{name:'Verify email address'}).click();
 await page.getByRole('button',{name:'Email verified',exact:true}).waitFor();
 assert.deepEqual(calls.at(-1).data,{claimId,token});checks++;
 assert.equal(await page.getByRole('button',{name:'Email verified',exact:true}).isDisabled(),true);checks++;
 await page.goto(origin+'/verify');await page.getByRole('button',{name:'Verify email address'}).click();
 await page.getByRole('status').filter({hasText:'Open the complete'}).waitFor();checks++;
 await page.goto(origin+'/reviews');await page.getByRole('heading',{name:'JS-0103 · Synthetic Member'}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Retry setup email'}).count(),0);checks++;
 await page.getByRole('button',{name:'Approve identity'}).click();
 await page.getByRole('status').filter({hasText:'Identity claim approved'}).waitFor();
 assert.deepEqual(calls.find(call=>call.data.action==='approve').data,{claimId,action:'approve'});checks++;
 await page.getByRole('button',{name:'Retry setup email'}).click();
 await page.getByRole('status').filter({hasText:'setup-email retry was requested'}).waitFor();
 assert.deepEqual(calls.find(call=>call.data.action==='retry_setup').data,{claimId,action:'retry_setup'});checks++;
 const beforeSetup=calls.length;
 await page.goto(origin+`/setup#claim=${claimId}&token=${token}`);await page.waitForFunction(()=>location.hash==='');
 assert.equal(calls.length,beforeSetup);checks++;
 await page.getByLabel('New password',{exact:true}).fill('SyntheticPassword123');
 await page.getByLabel('Confirm password',{exact:true}).fill('DifferentPassword123');
 await page.getByRole('button',{name:'Set password',exact:true}).click();
 await page.getByRole('status').filter({hasText:'passwords must match'}).waitFor();assert.equal(calls.length,beforeSetup);checks++;
 await page.getByLabel('Confirm password',{exact:true}).fill('SyntheticPassword123');
 await page.getByRole('button',{name:'Set password',exact:true}).click();
 await page.getByRole('status').filter({hasText:'account is ready'}).waitFor();
 assert.deepEqual(calls.at(-1).data,{claimId,token,password:'SyntheticPassword123'});checks++;
 assert.equal(await page.locator('input[type=password]').count(),0);checks++;
 assert.deepEqual(external,[]);assert.deepEqual(errors,[]);checks+=2;
 passed=true;
}finally{
 if(browser)await browser.close();await new Promise(resolveClose=>server.close(resolveClose));
 const result={passed,checks,scope:'local-components-with-mocked-api',externalRequests:external.length,pageErrors:errors,evidenceDirectory:root};
 writeFileSync(join(root,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}
