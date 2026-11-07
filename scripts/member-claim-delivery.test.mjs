import assert from 'node:assert/strict';
import test from 'node:test';
import {loadRoute} from './load-route-test.mjs';
const origin='https://app.example.invalid',id='11111111-1111-4111-8111-111111111111',emailId='22222222-2222-4222-8222-222222222222';
const scope={email:'member@example.invalid',dateOfBirth:'1996-11-14'};
function fixture(options={}){
 const calls=[];
 const row={email_id:emailId,recipient_email:scope.email,email_type:'member_claim_verification',reference_id:id,template_data:{verification_url:`${origin}/claim-id/verify#claim=${id}&token=${'a'.repeat(64)}`},...options.row};
 const rpc=async(name,args)=>{calls.push({rpc:name,args});if(name==='claim_member_account_email')return {data:options.empty?[]:[row],error:options.claimError??null};return {error:options.ackError??null};};
 const loaded=loadRoute('lib/member-claims/delivery.ts',{
  'server-only':{},'resend':{Resend:class{emails={send:async(payload,opts)=>{calls.push({send:payload,opts});if(options.throwSend)throw Error('secret-provider-detail');return options.sendResult??{data:{id:'provider-id'},error:null};}};}},
  '@/lib/application-origin':{configuredApplicationOrigin:()=>origin},
  '@/lib/features/member-claims':{memberClaimsEnabled:()=>options.claimsEnabled!==false},
  '@/lib/supabase/admin':{createAdminClient:()=>({rpc})},
  '@/lib/email/render-email':{renderEmail:(type,fields)=>{calls.push({render:type,fields});return '<p>claim</p>';}},
 },{MEMBER_CLAIM_EMAIL_DELIVERY_ENABLED:options.enabled??'true',RESEND_API_KEY:'synthetic',EMAIL_FROM_ADDRESS:'sender@example.invalid'},
 {URLSearchParams,AbortSignal:{timeout:ms=>({timeout:ms})}});
 return {run:loaded.deliverMemberClaimEmail,calls,logs:loaded.logs};
}
test('claim delivery requires both flags and never polls general work',async()=>{
 for(const settings of [{enabled:'false'},{claimsEnabled:false}]){const f=fixture(settings);await f.run(scope);assert.deepEqual(f.calls,[]);}
 const f=fixture({empty:true});await f.run(scope);assert.equal(f.calls.length,1);assert.equal(f.calls[0].rpc,'claim_member_account_email');
});
test('delivery is bound to registered details and one outbox idempotency key',async()=>{
 const f=fixture();await f.run(scope);
 assert.deepEqual(JSON.parse(JSON.stringify(f.calls[0].args)),{target_email_type:'member_claim_verification',registered_email:scope.email,registered_date_of_birth:scope.dateOfBirth,target_claim_id:null});
 const sent=f.calls.find(c=>c.send);assert.deepEqual(Array.from(sent.send.to),[scope.email]);assert.equal(sent.opts.idempotencyKey,`email-outbox/${emailId}`);assert.equal(sent.opts.signal.timeout,10000);
 assert.equal(f.calls.at(-1).rpc,'mark_email_sent');assert.equal(f.calls.filter(c=>c.send).length,1);assert.deepEqual(f.logs,[]);
});
test('wrong recipient, type, origin, claim or malformed token cannot send',async()=>{
 for(const row of [{recipient_email:'other@example.invalid'},{email_type:'birthday'},
  {template_data:{verification_url:`https://evil.invalid/claim-id/verify#claim=${id}&token=${'a'.repeat(64)}`}},
  {template_data:{verification_url:`${origin}/claim-id/verify#claim=${emailId}&token=${'a'.repeat(64)}`}},
  {template_data:{verification_url:`${origin}/claim-id/verify#claim=${id}&token=bad`}}]){
  const f=fixture({row});await f.run(scope);assert.equal(f.calls.filter(c=>c.send).length,0);assert.equal(f.calls.at(-1).rpc,'mark_email_failed');assert.deepEqual(f.logs,[]);
 }
});
test('provider uncertainty never retries immediately and persists sanitized failure',async()=>{
 for(const options of [{throwSend:true},{sendResult:{error:{message:'private-details'},data:null}}]){
  const f=fixture(options);await f.run(scope);assert.equal(f.calls.filter(c=>c.send).length,1);assert.equal(f.calls.at(-1).rpc,'mark_email_failed');assert.ok(!JSON.stringify(f.calls.at(-1)).includes('private-details'));assert.deepEqual(f.logs,[]);
 }
});
test('provider success with failed database acknowledgement stays processing',async()=>{
 const f=fixture({ackError:{message:'database failure'}});await f.run(scope);assert.equal(f.calls.filter(c=>c.send).length,1);assert.equal(f.calls.filter(c=>c.rpc==='mark_email_failed').length,0);
});
test('setup email uses only the approved claim reference and correct link',async()=>{
 const f=fixture({row:{email_type:'member_claim_setup',template_data:{setup_url:`${origin}/claim-id/setup#claim=${id}&token=${'b'.repeat(64)}`}}});
 await f.run({claimId:id});assert.deepEqual(JSON.parse(JSON.stringify(f.calls[0].args)),{target_email_type:'member_claim_setup',registered_email:null,registered_date_of_birth:null,target_claim_id:id});assert.equal(f.calls.filter(c=>c.send).length,1);
});
