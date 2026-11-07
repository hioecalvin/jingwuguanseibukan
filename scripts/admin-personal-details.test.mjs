import assert from 'node:assert/strict';
import test from 'node:test';
import {loadRoute} from './load-route-test.mjs';
const origin='https://app.example.invalid',supabase='https://test.supabase.co',id='11111111-1111-4111-8111-111111111111';
function fixture(options={}){
 const calls=[],sent=[];
 const client={rpc:async(name,args)=>{calls.push({name,args});if(name==='claim_admin_email_change')return{data:options.empty?null:{request_id:id,profile_id:'member',old_email:'old@example.invalid',new_email:'new@example.invalid'},error:null};return{error:null};},auth:{admin:{
 getUserById:async()=>({data:{user:{id:'member',email:options.changed?'someone@example.invalid':'old@example.invalid'}},error:null}),
 generateLink:async(args)=>{calls.push({generate:args.type});if(options.single&&args.type==='email_change_current')return{error:{status:400,code:'validation_failed',message:'Enable secure email change to generate link for current email'}};
 if(options.error)return{error:{status:400,code:'other',message:'private error'}};
 return{data:{user:{id:options.wrongUser?'other':'member'},properties:{hashed_token:'unused',action_link:`${options.badHost?'https://evil.invalid':supabase}/auth/v1/verify?type=email_change&token=${(args.type==='email_change_current'?'a':'b').repeat(64)}&redirect_to=${encodeURIComponent(origin+'/auth/confirm')}`}},error:null};}
 }}};
 const loaded=loadRoute('lib/admin-email-change.ts',{'server-only':{},'resend':{Resend:class{}},'@/lib/application-origin':{configuredApplicationOrigin:()=>origin},'@/lib/supabase/admin':{createAdminClient:()=>client}},{},{URL});
 return{calls,sent,logs:loaded.logs,run:()=>loaded.performAdminEmailChange(client,id,'actor',async m=>{sent.push(m);if(options.sendError)throw Error('secret provider data');},origin,supabase)};
}
test('admin email change prepares both tokens before delivery and retains provider idempotency context',async()=>{
 const f=fixture();assert.equal(await f.run(),'sent');assert.deepEqual(f.calls.filter(c=>c.generate).map(c=>c.generate),['email_change_current','email_change_new']);
 assert.deepEqual(f.sent.map(s=>s.to),['old@example.invalid','new@example.invalid']);assert.ok(f.sent.every(s=>s.requestId===id));
 assert.equal(new URL(f.sent[1].url).origin,origin);assert.equal(new URL(f.sent[1].url).searchParams.get('token_hash'),'b'.repeat(64));
 assert.equal(f.calls.at(-1).args.delivered,true);assert.deepEqual(f.logs,[]);
});
test('single-address Auth configuration still verifies replacement and never bypasses verification',async()=>{
 const f=fixture({single:true});assert.equal(await f.run(),'sent');assert.equal(f.sent.length,1);assert.equal(f.sent[0].to,'new@example.invalid');
});
test('stale, invalid and unexpected Auth results cannot send email',async()=>{
 for(const options of [{empty:true},{changed:true},{badHost:true},{wrongUser:true},{error:true}]){const f=fixture(options);assert.equal(await f.run(),'unconfirmed');assert.equal(f.sent.length,0);assert.deepEqual(f.logs,[]);}
});
test('uncertain delivery stays claimed without automatic retry or leaking provider details',async()=>{
 const f=fixture({sendError:true});assert.equal(await f.run(),'unconfirmed');assert.equal(f.sent.length,1);assert.equal(f.calls.some(c=>c.name==='finish_admin_email_change'),false);assert.deepEqual(f.logs,[]);
});
