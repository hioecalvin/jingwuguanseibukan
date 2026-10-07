import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadRoute, nextServer} from './load-route-test.mjs';

const guard=loadRoute('lib/email/staging-single-message.ts',{});
const diagnostic=loadRoute('lib/email/staging-email-diagnostic.ts',{'./staging-single-message':guard});
const now=Date.now(), sha='a'.repeat(40), secret='z'.repeat(64);
const env={VERCEL_ENV:'preview', NODE_ENV:'production', VERCEL_PROJECT_ID:'prj_uCQO2Y5KiACpA5YAWKAWp8yb5rZ8',
 VERCEL_GIT_COMMIT_REF:'release/v1-readiness-20260918', VERCEL_GIT_COMMIT_SHA:sha,
 STAGING_PROJECT_REF:guard.STAGING_EMAIL_PROJECT, NEXT_PUBLIC_SUPABASE_URL:`https://${guard.STAGING_EMAIL_PROJECT}.supabase.co`,
 NEXT_PUBLIC_SITE_URL:guard.STAGING_EMAIL_ORIGIN, EMAIL_FROM_ADDRESS:'sender@owned-mail.org', RESEND_API_KEY:'re_private-provider-key',
 EMAIL_WORKER_SECRET:secret, STAGING_EMAIL_DIAGNOSTIC_ENABLED:'true',
 STAGING_EMAIL_DIAGNOSTIC_START:new Date(now-1000).toISOString(),STAGING_EMAIL_DIAGNOSTIC_END:new Date(now+600000).toISOString()};
const route=e=>loadRoute('app/api/system/staging-email-diagnostic/route.ts',{
 'next/server':nextServer, '@/lib/security/constant-time-secret':{matchesSecret:(a,b)=>a===b},
 '@/lib/email/staging-single-message':guard,'@/lib/email/staging-email-diagnostic':diagnostic},e);
const request=(headers={},body)=>new Request(`${guard.STAGING_EMAIL_ORIGIN}/api/system/staging-email-diagnostic`,{
 method:'POST',headers:{'x-worker-secret':secret,'x-staging-diagnostic-commit':sha,...headers},...(body?{body}:{}),});

test('diagnostic is opt-in, staging-preview-only, bounded, and refuses enabled sending',()=>{
 assert.equal(diagnostic.stagingEmailDiagnosticAllowed(env,now),true);
 for(const key of ['STAGING_EMAIL_DIAGNOSTIC_ENABLED','STAGING_EMAIL_DIAGNOSTIC_START','STAGING_EMAIL_DIAGNOSTIC_END','VERCEL_ENV','VERCEL_PROJECT_ID','STAGING_PROJECT_REF','NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SITE_URL','EMAIL_WORKER_SECRET']){
  assert.equal(diagnostic.stagingEmailDiagnosticAllowed({...env,[key]:undefined},now),false,key);
 }
 for(const change of [{VERCEL_ENV:'production'},{STAGING_EMAIL_TEST_ENABLED:'true'},{VERCEL_PROJECT_ID:'other'},
  {STAGING_EMAIL_DIAGNOSTIC_START:new Date(now+1000).toISOString()},{STAGING_EMAIL_DIAGNOSTIC_END:new Date(now).toISOString()},
  {STAGING_EMAIL_DIAGNOSTIC_END:new Date(now+900000).toISOString()},{EMAIL_WORKER_SECRET:'short'}]){
  assert.equal(diagnostic.stagingEmailDiagnosticAllowed({...env,...change},now),false);
 }
});

test('pure simulation reports stable failed conditions without modifying environment or enabling send',()=>{
 const original=JSON.stringify(env), report=diagnostic.stagingEmailDiagnosticReport(env,sha,now);
 assert.equal(report.simulatedConfigAccepted,true);assert.equal(report.actualSendConfigAccepted,false);
 assert.ok(Object.values(report.checks).every(v=>v===true));assert.equal(JSON.stringify(env),original);
 for(const [key,check] of [['NODE_ENV','productionNodeRuntime'],['VERCEL_GIT_COMMIT_REF','releaseBranch'],['VERCEL_GIT_COMMIT_SHA','expectedCommit'],['RESEND_API_KEY','providerKeyShape'],['EMAIL_FROM_ADDRESS','senderMailboxShape']]){
  const r=diagnostic.stagingEmailDiagnosticReport({...env,[key]:undefined},sha,now);
  assert.equal(r.checks[check],false);assert.equal(r.simulatedConfigAccepted,false);
 }
});

test('handler requires protected authentication and returns only fixed labels and booleans',async()=>{
 const h=route(env);
 assert.equal((await h.POST(request({'x-worker-secret':'wrong'}))).status,403);
 assert.equal((await h.POST(request({'x-staging-diagnostic-commit':'wrong'}))).status,400);
 assert.equal((await h.POST(request({},'{}'))).status,400);
 const r=await h.POST(request());assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');
 const body=await r.json();assert.equal(body.code,'diagnostic_only_v1');assert.equal(body.exactRequestUrl,true);
 assert.equal(body.actualSendConfigAccepted,false);assert.equal(body.directNodeRuntimeProduction,true);
 assert.doesNotMatch(JSON.stringify(body),/owned-mail|re_private|zzzz|aaaa|https:|supabase/);
 assert.equal(h.logs.length,0);
});

test('disabled diagnostic never produces a report even with a valid secret',async()=>{
 for(const change of [{STAGING_EMAIL_DIAGNOSTIC_ENABLED:undefined},{STAGING_EMAIL_TEST_ENABLED:'true'},{VERCEL_ENV:'production'}]){
  const r=await route({...env,...change}).POST(request());assert.equal(r.status,404);
  assert.deepEqual(await r.json(),{code:'disabled'});
 }
});

test('diagnostic sources cannot invoke providers, database clients, mutate env or log secrets',()=>{
 for(const path of ['app/api/system/staging-email-diagnostic/route.ts','lib/email/staging-email-diagnostic.ts']){
  const source=readFileSync(new URL('../'+path,import.meta.url),'utf8');
  assert.doesNotMatch(source,/createAdminClient|fetch\(|\.rpc\(|\.send\(|from ["']resend|console\.|process\.env\.[A-Z_]+\s*=(?!=)/);
 }
});
