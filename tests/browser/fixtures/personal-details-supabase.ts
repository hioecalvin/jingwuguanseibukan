type Values={full_name:string;date_of_birth:string|null;email:string|null;phone:string|null};
export let current:Values={full_name:'Existing Member',date_of_birth:'1996-11-14',email:'original@example.invalid',phone:'62811111111'};
let pending:string|null=null;
const history:unknown[]=[];
export function save(values:Values){history.unshift({id:'audit',recorded_at:'2026-11-06T00:00:00Z',actor_name:'Super Admin',old_values:current,new_values:{...values,email:current.email,requested_email:values.email}});pending=values.email;current={...values,email:current.email};}
let emergency={contact_name:null as string|null,relation:null as string|null,email:null as string|null,phone:null as string|null,version:0};
export function createClient(){return{rpc:async(name:string,args:Record<string,unknown>={})=>{
 if(new URLSearchParams(location.search).has('forbidden'))return{data:null,error:{code:'42501'}};
 if(name==='get_member_personal_details')return{data:{...current,has_login:true,pending_email:pending},error:null};
 if(name==='get_member_personal_detail_audit')return{data:history,error:null};
 if(name==='get_my_emergency_contact')return{data:{...emergency},error:null};
 if(name==='update_my_emergency_contact'){
  if(new URLSearchParams(location.search).has('conflict'))return{data:null,error:{code:'40001'}};
  emergency={contact_name:args.new_contact_name as string|null,relation:args.new_relation as string|null,email:args.new_email as string|null,phone:args.new_phone as string|null,version:emergency.version+1};return{data:{...emergency},error:null};
 }
 throw new Error('Unexpected personal RPC');
}};}
