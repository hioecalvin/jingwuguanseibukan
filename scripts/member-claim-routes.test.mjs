import assert from 'node:assert/strict';
import test from 'node:test';
import { isIP } from 'node:net';
import { loadRoute, nextServer } from './load-route-test.mjs';
const origin='https://app.example.invalid';
const claimId='11111111-1111-4111-8111-111111111111';
const proof='a'.repeat(64);
function setup(options={}){
 const state={enabled:true, rpcError:null, rpcData:null, completed:true, createThrows:false, user:{id:'actor-from-session',email_confirmed_at:'2026-01-01'},denyRate:null, ...options};
 const calls=[];
 const rateCounts=new Map();
 const rate=async value=>{calls.push({rate:value}); if(state.rateThrows)throw Error('private-rate-detail');
  const key=value.bucket+'|'+value.subject;const count=(rateCounts.get(key)??0)+1;rateCounts.set(key,count);
  return {allowed:state.denyRate!==value.bucket&&(!state.enforceRates||count<=value.limit)};};
 const http=loadRoute('lib/member-claims/http.ts',{
  'server-only':{},'node:net':{isIP},'next/server':nextServer,
  '@/lib/application-origin':{configuredApplicationOrigin:()=>origin},
  '@/lib/features/member-claims':{memberClaimsEnabled:()=>state.enabled},
  '@/lib/security/durable-rate-limit':{consumeDurableRateLimit:rate},
 },{VERCEL:'1'});
 const rpc=async(name,args)=>{calls.push({rpc:name,args});return {data:name==='member_claim_setup_complete'?state.completed:state.rpcData,error:state.rpcError};};
 const routes={};
 for(const [action,path] of [['request','app/api/member-claims/request/route.ts'],['verify','app/api/member-claims/verify/route.ts'],['setup','app/api/member-claims/setup/route.ts'],['review','app/api/admin/member-claims/route.ts']]){
  routes[action]=loadRoute(path,{
   'node:crypto':{randomBytes:n=>{assert.equal(n,32);return Buffer.from(proof,'hex');}},
   'node:timers/promises':{setTimeout:async()=>{}},
   '@/lib/application-origin':{configuredApplicationOrigin:()=>origin},
   '@/lib/member-claims/http':http,
   '@/lib/security/durable-rate-limit':{consumeDurableRateLimit:rate},
   '@/lib/supabase/admin':{createAdminClient:()=>({rpc,auth:{admin:{createUser:async attributes=>{calls.push({create:attributes});if(state.createThrows)throw Error('private-provider-detail');return {data:{user:null},error:null};}}}})},
   '@/lib/supabase/server':{createClient:async()=>({auth:{getUser:async()=>({data:{user:state.user},error:null})},rpc})},
  });
 }
 function request(action,body,headers={}){return routes[action].POST(new Request(origin+'/api/'+action,{method:'POST',headers:{origin,'content-type':'application/json',...headers},body:JSON.stringify(body)}));}
 return {state,calls,routes,request};
}
test('release switch blocks all claim endpoints without database calls',async()=>{
 const s=setup({enabled:false});for(const action of ['request','verify','review','setup'])assert.equal((await s.request(action,{})).status,503);assert.equal(s.calls.length,0);
});
test('origin and content type failures happen before rate limits or database calls',async()=>{
 const s=setup();assert.equal((await s.request('request',{}, {origin:'https://evil.invalid'})).status,403);
 assert.equal((await s.request('verify',{}, {'content-type':'text/plain'})).status,403);assert.equal(s.calls.length,0);
});
test('invalid or oversized streamed bodies never reach claim persistence',async()=>{
 const s=setup();for(const body of [[],{email:'bad',memberId:'JS-0103'},{email:'a@b.test',memberId:'*'},{extra:'x'.repeat(5000)}])assert.equal((await s.request('request',body)).status,400);
 assert.equal(s.calls.filter(c=>c.rpc).length,0);
});
test('request normalizes identifiers, generates a server proof and returns no existence details',async()=>{
 const s=setup();const result=await s.request('request',{memberId:' js-0103 ',email:' MEMBER@Example.Invalid ',actor:'forged',token:'forged'});
 assert.equal(result.status,202);const first=await result.text();assert.ok(!first.includes(proof));assert.ok(!first.includes('member@example.invalid'));
 const call=s.calls.find(c=>c.rpc);assert.equal(call.rpc,'request_member_claim');
 assert.equal(JSON.stringify(call.args),JSON.stringify({target_registration_number:'JS-0103',proposed_email:'member@example.invalid',proof_token:proof,site_origin:origin}));
 s.state.rpcData={private:'ignored'};assert.equal(await (await s.request('request',{memberId:'JS-9999',email:'nobody@example.invalid'})).text(),first);
});
test('request limits both JS ID and email and fails closed on limiter failure',async()=>{
 const s=setup({denyRate:'claim-request-email'});assert.equal((await s.request('request',{memberId:'JS-0103',email:'m@e.invalid'})).status,429);assert.equal(s.calls.filter(c=>c.rpc).length,0);
 s.state.denyRate=null;s.state.rateThrows=true;assert.equal((await s.request('request',{})).status,503);
});
test('client identity accepts only the trusted Vercel header and valid IP',async()=>{
 const s=setup();await s.request('verify',{}, {'x-forwarded-for':'203.0.113.9','x-vercel-forwarded-for':'not-an-ip'});
 assert.equal(s.calls.find(c=>c.rate?.bucket==='claim-verify-client').rate.subject,'shared');
});
test('verification requires complete claim UUID and secret in the JSON body',async()=>{
 const s=setup();assert.equal((await s.request('verify',{claimId,token:'short'})).status,400);
 assert.equal((await s.request('verify',{claimId:'bad',token:proof})).status,400);
 const response=await s.request('verify',{claimId,token:proof});assert.equal(response.status,200);
 assert.equal(s.calls.find(c=>c.rpc).rpc,'verify_member_claim');assert.ok(!(await response.text()).includes(proof));
});
test('expired proofs give a generic error; internal errors never reach clients or logs',async()=>{
 const s=setup({rpcError:{code:'42501',message:proof}});assert.equal((await s.request('verify',{claimId,token:proof})).status,400);
 s.state.rpcError={code:'XX000',message:'private-db-secret'};const result=await s.request('request',{memberId:'JS-0103',email:'m@e.invalid'});
 assert.equal(result.status,503);assert.ok(!(await result.text()).includes('private-db-secret'));
 assert.equal(s.routes.request.logs.length,0);
});
test('review requires a verified session before accessing claims',async()=>{
 const s=setup({user:null});assert.equal((await s.request('review',{action:'list'})).status,401);
 s.state.user={id:'unconfirmed'};assert.equal((await s.request('review',{action:'list'})).status,401);assert.equal(s.calls.filter(c=>c.rpc).length,0);
});
test('review ignores actor and member spoofing, using only the claim and decision',async()=>{
 const s=setup();assert.equal((await s.request('review',{action:'approve',claimId,actor:'forged',memberId:'forged'})).status,200);
 const call=s.calls.find(c=>c.rpc);assert.equal(call.rpc,'review_member_claim');assert.equal(JSON.stringify(call.args),JSON.stringify({claim_id:claimId,approve:true}));
});
test('review reports revoked or outside-dojo authority without provider creation',async()=>{
 const s=setup({rpcError:{code:'42501'}});assert.equal((await s.request('review',{action:'approve',claimId})).status,403);
 assert.equal(s.calls.filter(c=>c.rpc).length,1);
});
test('review list and rejection call their scoped database contracts',async()=>{
 const s=setup({rpcData:[]});const list=await s.request('review',{action:'list'});assert.deepEqual(await list.json(),{claims:[]});
 assert.equal((await s.request('review',{action:'reject',claimId})).status,200);
 assert.equal(s.calls.filter(c=>c.rpc).at(-1).args.approve,false);
});

test('admin can review a queue with refreshes while the actor limit still applies',async()=>{
 const s=setup({rpcData:[],enforceRates:true});
 assert.equal((await s.request('review',{action:'list'})).status,200);
 for(let i=0;i<10;i++){
  assert.equal((await s.request('review',{action:i%2?'reject':'approve',claimId})).status,200);
  assert.equal((await s.request('review',{action:'list'})).status,200);
 }
 for(let i=21;i<60;i++)assert.equal((await s.request('review',{action:'list'})).status,200);
 const before=s.calls.filter(c=>c.rpc).length;
 assert.equal((await s.request('review',{action:'approve',claimId})).status,429);
 assert.equal(s.calls.filter(c=>c.rpc).length,before);
 assert.equal(s.calls.at(-1).rate.bucket,'claim-review-actor');
});

test('admin allowance does not relax public claim client limits',async()=>{
 const s=setup({enforceRates:true});
 for(let i=0;i<10;i++)assert.equal((await s.request('verify',{claimId:`11111111-1111-4111-8111-${String(i).padStart(12,'0')}`,token:proof})).status,200);
 const before=s.calls.filter(c=>c.rpc).length;
 assert.equal((await s.request('verify',{claimId,token:proof})).status,429);
 assert.equal(s.calls.filter(c=>c.rpc).length,before);
 assert.equal(s.calls.at(-1).rate.bucket,'claim-verify-client');
});

const setupBody={claimId,token:proof,password:'LongSyntheticPassword123'};
const prepared=[{member_uuid:claimId,verified_email:'verified@example.invalid',already_complete:false}];
test('setup rejects weak passwords and missing proof before creating accounts',async()=>{
 const s=setup({rpcData:prepared});for(const password of ['short','a'.repeat(14),'A'.repeat(14),'a1'.repeat(7),'X'.repeat(129)])assert.equal((await s.request('setup',{...setupBody,password})).status,400);
 assert.equal(s.calls.filter(c=>c.rpc||c.create).length,0);
});
test('setup uses only the database-bound identity and reconciles success',async()=>{
 const s=setup({rpcData:prepared});const result=await s.request('setup',{...setupBody,email:'attacker@example.invalid',member_uuid:'wrong',actor:'forged'});
 assert.equal(result.status,200);const call=s.calls.find(c=>c.create).create;
 assert.equal(call.id,claimId);assert.equal(call.email,'verified@example.invalid');assert.equal(call.password,setupBody.password);assert.equal(call.email_confirm,true);
 assert.equal(call.app_metadata.member_claim_ticket,proof);assert.equal(s.calls.filter(c=>c.create).length,1);
 const output=await result.text();assert.ok(!output.includes(proof));assert.ok(!output.includes(setupBody.password));
});
test('setup retry after completed claim never changes the existing password',async()=>{
 const s=setup({rpcData:[{...prepared[0],already_complete:true}]});assert.equal((await s.request('setup',setupBody)).status,200);
 assert.equal(s.calls.filter(c=>c.create).length,0);
});
test('setup reconciles an ambiguous provider failure without a second create or reset',async()=>{
 const s=setup({rpcData:prepared,createThrows:true});assert.equal((await s.request('setup',setupBody)).status,200);
 assert.equal(s.calls.filter(c=>c.create).length,1);assert.equal(s.calls.at(-1).rpc,'member_claim_setup_complete');
 assert.equal(s.routes.setup.logs.length,0);
});
test('setup never reports success when persisted completion is unverified',async()=>{
 const s=setup({rpcData:prepared,completed:false});const result=await s.request('setup',setupBody);assert.equal(result.status,503);
 assert.equal(s.calls.filter(c=>c.create).length,1);
});
test('setup rejects busy, expired or malformed server state without provider calls',async()=>{
 const s=setup({rpcError:{code:'55P03'}});assert.equal((await s.request('setup',setupBody)).status,409);
 s.state.rpcError={code:'42501'};assert.equal((await s.request('setup',setupBody)).status,400);
 s.state.rpcError=null;s.state.rpcData=[{...prepared[0],member_uuid:'bad'}];assert.equal((await s.request('setup',setupBody)).status,503);
 assert.equal(s.calls.filter(c=>c.create).length,0);
});
