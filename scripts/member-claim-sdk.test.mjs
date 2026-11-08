import assert from 'node:assert/strict';
import test from 'node:test';
import { createClient } from '@supabase/supabase-js';
import { loadRoute, nextServer } from './load-route-test.mjs';
const claimId='11111111-1111-4111-8111-111111111111';
const memberId='22222222-2222-4222-8222-222222222222';
const token='a'.repeat(64),ticket='b'.repeat(64);
for(const ambiguous of [false,true])test(`installed SDK sends exact claim identity and reconciles ${ambiguous?'ambiguous':'successful'} creation`,async()=>{
 const calls=[];
 const client=createClient('https://fixture.example.invalid','synthetic-server-key',{
  auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false},
  global:{fetch:async(input,init)=>{
   const url=new URL(typeof input==='string'?input:input.url);const body=JSON.parse(init?.body??'{}');calls.push({path:url.pathname,body});
   assert.equal(url.origin,'https://fixture.example.invalid');
   if(url.pathname==='/rest/v1/rpc/prepare_member_claim_setup')return Response.json([{member_uuid:memberId,verified_email:'verified@example.invalid',already_complete:false}]);
   if(url.pathname==='/auth/v1/admin/users'){
    if(ambiguous)return Response.json({message:'Synthetic gateway timeout'}, {status:504});
    return Response.json({id:memberId,email:'verified@example.invalid',email_confirmed_at:'2026-10-26',app_metadata:{},user_metadata:{},aud:'authenticated',created_at:'2026-10-26'});
   }
   if(url.pathname==='/rest/v1/rpc/member_claim_setup_complete')return Response.json(true);
   throw Error('Unexpected request');
  }},
 });
 const route=loadRoute('app/api/member-claims/setup/route.ts',{
  'node:crypto':{randomBytes:()=>Buffer.from(ticket,'hex')},
  '@/lib/member-claims/http':{
   claimIdPattern:/^[a-f0-9-]{36}$/i,claimProofPattern:/^[a-f0-9]{64}$/,
   claimRequestGuard:async()=>null,readClaimBody:request=>request.json(),reply:nextServer.NextResponse.json,
  },
  '@/lib/security/durable-rate-limit':{consumeDurableRateLimit:async()=>({allowed:true})},
  '@/lib/supabase/admin':{createAdminClient:()=>client},
 });
 const response=await route.POST(new Request('https://app.example.invalid/setup',{method:'POST',body:JSON.stringify({claimId,token,password:'SyntheticPassword123'})}));
 assert.equal(response.status,200);
 assert.deepEqual(calls.map(c=>c.path),['/rest/v1/rpc/prepare_member_claim_setup','/auth/v1/admin/users','/rest/v1/rpc/member_claim_setup_complete']);
 assert.deepEqual(calls[1].body,{id:memberId,email:'verified@example.invalid',password:'SyntheticPassword123',email_confirm:true,app_metadata:{member_claim_ticket:ticket}});
 assert.equal(route.logs.length,0);client.auth.stopAutoRefresh();
});
