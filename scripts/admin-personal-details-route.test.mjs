import assert from 'node:assert/strict';
import test from 'node:test';
import {loadRoute,nextServer} from './load-route-test.mjs';
const origin='https://app.example.invalid';
const memberId='11111111-1111-4111-8111-111111111111';
const requestId='22222222-2222-4222-8222-222222222222';
const values={full_name:'Synthetic Member',date_of_birth:'1990-01-01',email:'member@example.invalid',phone:'+62811111111'};
function fixture(options={}){
 const calls=[];
 const state={user:{id:'verified-actor',email_confirmed_at:'2026-01-01'},allowed:true,data:{saved:true},rpcError:null,...options};
 const route=loadRoute('app/api/admin/member-personal-details/route.ts',{
  'next/server':nextServer,
  '@/lib/application-origin':{configuredApplicationOrigin:()=>origin},
  '@/lib/admin-email-change':{deliverAdminEmailChange:async(...args)=>{calls.push({delivery:args});return state.delivery??'sent';}},
  '@/lib/member-claims/http':{readClaimBody:async request=>{const body=await request.json();if(JSON.stringify(body).length>4096)throw Error('too long');return body;}},
  '@/lib/security/durable-rate-limit':{consumeDurableRateLimit:async args=>{calls.push({rate:args});return{allowed:state.allowed};}},
  '@/lib/supabase/server':{createClient:async()=>({auth:{getUser:async()=>({data:{user:state.user},error:null})},rpc:async(name,args)=>{calls.push({rpc:name,args});return{data:state.data,error:state.rpcError};}})},
 });
 return{state,calls,logs:route.logs,run:(body={memberId,values,expectedValues:values},headers={})=>route.POST(new Request(origin+'/api/admin/member-personal-details',{method:'POST',headers:{origin,'content-type':'application/json',...headers},body:JSON.stringify(body)}))};
}
test('personal-details route rejects origins, unverified sessions, invalid shapes and rate exhaustion before mutation',async()=>{
 for(const [options,body,headers,status] of [
  [{},undefined,{origin:'https://other.invalid'},403],
  [{user:null},undefined,{},401],
  [{user:{id:'unverified'}},undefined,{},401],
  [{},{memberId,values:{...values,is_super_admin:true},expectedValues:values},{},400],
  [{allowed:false},undefined,{},429],
 ]){const f=fixture(options);assert.equal((await f.run(body,headers)).status,status);assert.equal(f.calls.some(c=>c.rpc||c.delivery),false);assert.deepEqual(f.logs,[]);}
});
test('personal-details route carries exact baseline and never delivers after failed authorization or conflict',async()=>{
 for(const code of ['42501','40001']){const f=fixture({rpcError:{code,message:'private error'},data:null});const result=await f.run();assert.equal(result.status,code==='40001'?409:400);assert.equal(f.calls.filter(c=>c.delivery).length,0);assert.ok(!(await result.text()).includes('private error'));assert.deepEqual(f.logs,[]);}
 const f=fixture();assert.equal((await f.run()).status,200);const call=f.calls.find(c=>c.rpc);assert.equal(call.rpc,'update_member_personal_details');assert.equal(JSON.stringify(call.args.expected_values),JSON.stringify(values));assert.equal(f.calls.filter(c=>c.delivery).length,0);
});
test('personal-details delivery uses the audited request and authenticated actor, with safe uncertainty response',async()=>{
 for(const delivery of ['sent','unconfirmed']){const f=fixture({data:{saved:true,email_request_id:requestId},delivery});const result=await f.run({memberId,values,expectedValues:values,actorId:'forged',email_request_id:'forged'});assert.equal(result.status,200);assert.deepEqual(Array.from(f.calls.find(c=>c.delivery).delivery),[requestId,'verified-actor']);const text=await result.text();assert.ok(text.includes('existing login email'));assert.ok(!text.includes(requestId));assert.deepEqual(f.logs,[]);}
});
