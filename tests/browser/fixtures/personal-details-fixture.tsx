import { createRoot } from 'react-dom/client';
import Editor from '../../../components/member-personal-details-editor';
import Claims from '../../../app/admin/member-claims/reviews';
import Emergency from '../../../components/member-emergency-contact';
import { current, save } from './personal-details-supabase';
window.fetch = async (input, init) => {
 const body = JSON.parse(String(init?.body));
 if (String(input) === '/api/admin/member-personal-details') {
  if (new URLSearchParams(location.search).has('conflict')) return Response.json({error:'Personal details changed; reload before saving.'},{status:409});
  if(body.expectedValues.email !== current.email) throw new Error('Missing compare-and-swap baseline');
  save(body.values);
  return Response.json({message:'Personal details saved. Verify the new email before it becomes your login email.'});
 }
 if (String(input) === '/api/admin/member-claims') {
  if(body.action==='list') return Response.json({claims:[{claim_id:'claim',member_id:'JS-0052',full_name:'Waiting Member',claimed_email:'waiting@example.invalid',state:'verified'}]});
  if(body.action==='verified_accounts') return Response.json({total:51,accounts:Array.from({length:body.page===2?1:50},(_,i)=>({member_id:`JS-${String(i+1+(body.page-1)*50).padStart(4,'0')}`,full_name:`Verified Member ${i+1+(body.page-1)*50}`,email:'verified@example.invalid',account_status:'active',verified_at:'2026-11-06'}))});
 }
 throw new Error('Unexpected fixture request');
};
const root=document.getElementById('fixture-root');
if(!root)throw new Error('Missing root');
createRoot(root).render(location.pathname.includes('claim-lists')?<Claims/>:location.pathname.includes('emergency-contact')?<Emergency/>:<Editor memberId="member"/>);
