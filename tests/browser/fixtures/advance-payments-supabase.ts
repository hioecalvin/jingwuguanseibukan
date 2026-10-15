const state={calls:[] as {name:string;args:Record<string,unknown>}[],fail:false,reviewed:false};
Object.assign(window,{__advancePayments:state});
export function createClient(){return {rpc:async(name:string,args:Record<string,unknown>)=>{
  state.calls.push({name,args});
  if(name==='quote_advance_subscription_payment'){
    const months=(args.requested_months as string[]).map(month=>({month,amount:'300000',currency:'IDR'}));
    return {error:null,data:{membership_id:'membership-1',dojo_id:'dojo-1',class_id:'class-1',currency:'IDR',total:String(months.length*300000),months}};
  }
  if(name==='get_pending_advance_payment_groups')return {error:null,data:state.reviewed?[]:[{payment_group_id:'group-1',full_name:'Fixture Member',first_month:'2026-11-01',last_month:'2027-01-01',months:['2026-11-01','2027-01-01'],month_count:2,total:'600000',currency:'IDR',payment_method:'Transfer',transfer_date:'2026-10-07',member_note:'REF-01'}]};
  if(state.fail)return {error:{message:'Synthetic response uncertainty'},data:null};
  if(name==='review_advance_subscription_payment')state.reviewed=true;
  return {error:null,data:name==='submit_advance_subscription_payment'?'group-1':{recorded_months:2}};
}};}
