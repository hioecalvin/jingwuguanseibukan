import test from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {loadRoute, nextServer} from './load-route-test.mjs';
const env={NEXT_PUBLIC_SUPABASE_URL:'https://auth.example.invalid',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'public-fixture'};
const user={id:'user-1',email:'fixture@example.invalid'};
function fixture(config={}) {
 const calls={gets:0,puts:[],marked:[]};
 const authFetch=async(url,init)=>{
  assert.equal(String(url),'https://auth.example.invalid/auth/v1/user');
  assert.equal(init.method,'GET');
  assert.equal(new Headers(init.headers).get('authorization'),'Bearer fixture-token');
  calls.gets++;
  return Response.json(config.invalid ? {message:'Invalid token'} : user,{status:config.invalid?401:200});
 };
 const admin={from:()=>({select(){return this},eq(){return this},async maybeSingle(){return {data:config.noProfile?null:{id:user.id,account_status:config.disabled?'disabled':'active',must_change_password:true},error:null}}}),async rpc(name,args){assert.equal(name,'mark_password_changed');calls.marked.push(args);return {error:config.markError?new Error('fixture'):null}}};
 const route=loadRoute('app/api/account/change-password/route.ts',{
  'next/server':nextServer,
  '@supabase/supabase-js':{createClient:(url,key,options)=>createClient(url,key,{...options,global:{...options.global,fetch:authFetch}})},
  '@/lib/supabase/admin':{createAdminClient:()=>admin},
  '@/lib/security/durable-rate-limit':{configuredRateLimit:(_key,value)=>value,consumeDurableRateLimit:async()=>({allowed:!config.limited}),durableRateLimitHeaders:()=>({})},
 },env,{AbortSignal,fetch:async(url,init)=>{calls.puts.push({url:String(url),...init});if(config.throwUpdate)throw new Error('network unavailable');return Response.json(config.updateBody??{id:user.id},{status:config.updateStatus??200})}});
 return {...route,calls};
}
const req=(headers={authorization:'Bearer fixture-token'},body={newPassword:'FixtureNew123!'})=>new Request('https://app.example.invalid/api/account/change-password',{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)});
test('reproduces SDK session failure despite valid bearer headers without contacting Auth for update',async()=>{
 let requests=0;
 const client=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{global:{headers:{Authorization:'Bearer fixture-token'},fetch:async()=>{requests++;return Response.json(user)}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 assert.equal((await client.auth.getUser('fixture-token')).data.user.id,user.id);
 const result=await client.auth.updateUser({password:'FixtureNew123!'});
 assert.equal(result.error?.name,'AuthSessionMissingError');assert.equal(requests,1);
});
test('actual SDK validates token, then user-scoped PUT changes password and marks only that user',async()=>{
 const h=fixture();const result=await h.POST(req());assert.equal(result.status,200);assert.equal(h.calls.gets,1);assert.equal(h.calls.puts.length,1);
 const put=h.calls.puts[0];assert.equal(put.url,'https://auth.example.invalid/auth/v1/user');assert.equal(put.method,'PUT');assert.equal(put.headers.Authorization,'Bearer fixture-token');assert.equal(put.headers.apikey,'public-fixture');assert.deepEqual(JSON.parse(put.body),{password:'FixtureNew123!'});assert.equal(put.redirect,'error');assert.equal(put.cache,'no-store');assert.ok(put.signal instanceof AbortSignal);assert.equal(h.calls.marked[0].target_user_id,user.id);
});
for(const [name,config,status] of [['invalid token',{invalid:true},401],['disabled account',{disabled:true},403],['missing profile',{noProfile:true},404],['rate limit',{limited:true},429]])test(name+' blocks password changes',async()=>{const h=fixture(config);assert.equal((await h.POST(req())).status,status);assert.equal(h.calls.puts.length,0);assert.equal(h.calls.marked.length,0)});
test('missing token and weak password do not reach Auth',async()=>{for(const [headers,body,status] of [[{},undefined,401],[{authorization:'Bearer fixture-token'},{newPassword:'weak'},400]]){const h=fixture();assert.equal((await h.POST(req(headers,body))).status,status);assert.equal(h.calls.gets,0);assert.equal(h.calls.puts.length,0)}});
for(const [name,config,status] of [['expired token',{updateStatus:401,updateBody:{message:'secret provider data'}},401],['wrong identity',{updateBody:{id:'other-user'}},400],['provider failure',{updateStatus:500,updateBody:{message:'secret provider data'}},400],['network failure',{throwUpdate:true},500]])test(name+' never marks completion',async()=>{const h=fixture(config);const result=await h.POST(req());assert.equal(result.status,status);assert.equal(h.calls.marked.length,0);assert.doesNotMatch(await result.text(),/secret provider data|fixture-token|FixtureNew123/)});
test('post-password marking failure reports partial completion without retrying password mutation',async()=>{const h=fixture({markError:true});const result=await h.POST(req());assert.equal(result.status,500);assert.match((await result.json()).error,/password was changed/);assert.equal(h.calls.puts.length,1)});
