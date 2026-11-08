// Called by the 087 runner inside its fresh, loopback-only PostgreSQL cluster.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

export async function testSharedDojoContacts({q, eq, denied, jwt, uid, dojo, migration, psql, args, env}) {
 const classId = n => dojo(n).replace(/^3/, '2');
 const map = 'https://maps.app.goo.gl/Group';
 const groups = (user, n) => JSON.parse(q(jwt(user) + `select public.get_shared_dojo_contact_details(${n ? "'"+dojo(n)+"'" : ''});`));
 const get = (user,n) => groups(user,n)[0];
 const edit = (n,token,ig='group',url=map) => `select public.update_shared_dojo_contact_details('${dojo(n)}','${ig}','${url}','${token}');`;
 const oldEdit = (n,version,ig,url) => `select public.update_dojo_contact_details('${dojo(n)}','Name ${n}','555-100${n}','${ig}','Street ${n}','${url}',${version});`;
 const grant = n => q(`insert into public.dojo_admin_assignments select gen_random_uuid(),'${uid(2)}',class_id,id,true from public.dojos where id='${dojo(n)}';`);
 const master = jwt(1);
 const oldFunctions = () => q("select string_agg(pg_get_functiondef(oid),' ' order by proname) from pg_proc where proname in ('get_dojo_contact_details','update_dojo_contact_details');");
 const before = oldFunctions();
 q(migration.replace(/commit;\s*$/i,'rollback;'));
 eq(q("select to_regprocedure('public.get_shared_dojo_contact_details(uuid)') is null and to_regprocedure('public.update_shared_dojo_contact_details(uuid,text,text,text)') is null;"),'t','Migration rolls back');
 const labels = ['Aikido','Karate','Taiji','Xingyi','KungfuKids','Other'];
 const locations = ['Chushin',' Chushin  Dojo ','Zhongxin','Zhongxin dojo','Zhongxin','Chushin'];
 labels.forEach((name,index) => {
  const n=index+3;
  q(`insert into public.classes values ('${classId(n)}','${name}'); insert into public.dojos values ('${dojo(n)}','${classId(n)}','${locations[index]}',${n!==4});`);
 });
 q(master+oldEdit(3,0,'left',map)+oldEdit(4,0,'right',''));
 const rows = () => q("select jsonb_agg(to_jsonb(d) order by dojo_id) from dojo_contact_private.details d;");
 const beforeRows=rows();
 q(migration);
 eq(rows(),beforeRows,'Migration preserves every contact value');
 eq(oldFunctions(),before,'Both original RPC definitions retained');
 for(const role of ['anon','service_role']) {
  for(const signature of ['public.get_shared_dojo_contact_details(uuid)','public.update_shared_dojo_contact_details(uuid,text,text,text)'])
   eq(q(`select has_function_privilege('${role}','${signature}','execute');`),'f',`No ${role} execute`);
 }
 eq(q("select has_function_privilege('authenticated','dojo_contact_private.group_key(uuid,text,text)','execute');"),'f','No private helper access');
 denied('set role authenticated; select public.get_shared_dojo_contact_details();',/Active member/);
 denied(jwt(4)+'select public.get_shared_dojo_contact_details();',/Active member/);
 eq(groups(3).length,5,'Two named locations and three singleton dojos');
 eq(get(3,8).group_key,dojo(8),'Same location but different class stays separate');
 eq(get(3,7).dojo_ids.length,3,'All three Zhongxin disciplines');
 let shared=get(2,3);
 eq(shared.group_key,'location-Chushin','Both name variants match');
 eq(shared.dojo_ids.join(','),[dojo(3),dojo(4)].join(','),'Inactive sibling included');
 eq(shared.version_token,get(3,4).version_token,'Same token from either discipline');
 eq(shared.maps_url,map,'Single non-empty Maps URL wins');
 eq(shared.instagram_username,null,'Conflicting field requires a decision');
 eq(shared.has_conflicts,true,'Distinct populated values flagged');
 eq(shared.source_values.map(v=>v.instagram_username).join(','),'left,right','Conflicting originals are visible');
 denied(jwt(3)+edit(3,shared.version_token),/every class/);
 denied(jwt(4)+edit(3,shared.version_token),/Active member/);
 denied(master+"select public.update_shared_dojo_contact_details(null,null,null,'token');",/Dojo not found/);
 grant(3);
 eq(get(2,3).can_manage,false,'Partial assignment cannot manage');
 denied(jwt(2)+edit(3,shared.version_token),/every class/);
 grant(4);
 eq(get(2,4).can_manage,true,'All delegated assignments required');
 denied(jwt(2)+edit(3,shared.version_token,'bad!'),/Check contact details/);
 denied(jwt(2)+edit(3,shared.version_token,'group','https://invalid.example'),/Check contact details/);
 eq(rows(),beforeRows,'Denied and malformed writes are atomic');
 const oldToken=shared.version_token;
 shared=JSON.parse(q(jwt(2)+edit(4,oldToken)));
 eq(shared.has_conflicts,false,'A scoped admin can explicitly reconcile');
 eq(shared.instagram_username,'group','Shared update returns fresh values');
 eq(shared.source_values.every(v=>v.maps_url===map&&v.instagram_username==='group'),true,'Both branch records synced');
 eq(q(`select count(*) from dojo_contact_private.details where dojo_id in ('${dojo(3)}','${dojo(4)}') and contact_name='Name '||right(dojo_id::text,1) and address='Street '||right(dojo_id::text,1) and contact_phone='555-100'||right(dojo_id::text,1);`),'2','Legacy per-class fields preserved');
 const auditCount=()=>q(`select count(*) from dojo_contact_private.audit where actor_id='${uid(2)}' and dojo_id in ('${dojo(3)}','${dojo(4)}');`);
 eq(auditCount(),'2','Each changed discipline audited to real actor');
 denied(master+edit(3,oldToken),/changed; reload/);
 eq(JSON.parse(q(master+edit(3,shared.version_token))).version_token,shared.version_token,'No-op stable token');
 eq(auditCount(),'2','No extra delegated audit');
 q(master+oldEdit(4,2,'legacy',map));
 denied(master+edit(3,shared.version_token),/changed; reload/);
 shared=get(1,3);
 // Hold a real legacy 087 transaction after updating the other discipline, then
 // verify the shared RPC waits for its parent lock and rechecks the entire token.
 const openSession = () => {
  const child=spawn(psql,args,{env,windowsHide:true,stdio:['pipe','pipe','pipe']});
  let stdout='',stderr='';
  child.stdout.on('data',chunk=>{stdout+=chunk;});
  child.stderr.on('data',chunk=>{stderr+=chunk;});
  const done=new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',code=>resolve({code,stderr,stdout}));});
  return {child,done};
 };
 const holder=openSession(), waiter=openSession();
 try {
  holder.child.stdin.write(`set application_name='dojo092-holder';begin;${master}${oldEdit(4,3,'racing',map)}select pg_advisory_xact_lock(92087);\n`);
  async function until(sql) {
   const deadline=Date.now()+10000;
   while(q(sql)!=='t') { if(Date.now()>deadline) throw new Error('Concurrent writer failed to reach expected lock'); await delay(50); }
  }
  await until("select exists(select 1 from pg_locks where locktype='advisory' and objid=92087 and granted);");
  waiter.child.stdin.end(`set application_name='dojo092-waiter';${master}${edit(3,shared.version_token)}\n`);
  await until("select exists(select 1 from pg_stat_activity where application_name='dojo092-waiter' and wait_event_type='Lock');");
  holder.child.stdin.end('commit;\n');
  eq((await holder.done).code,0,'Legacy writer committed');
  const result=await waiter.done;
  assert.notEqual(result.code,0);
  eq(/changed; reload/.test(result.stderr),true,'Concurrent stale shared save rejected after lock wait');
 } finally {
  if(holder.child.exitCode===null) holder.child.kill();
  if(waiter.child.exitCode===null) waiter.child.kill();
 }
 const z=get(1,5);
 q(`insert into public.dojos values('${dojo(9)}','${classId(5)}','Zhongxin',true);`);
 denied(master+edit(5,z.version_token),/changed; reload/);
 eq(JSON.parse(q(master+edit(7,get(1,5).version_token))).source_values.length,4,'New member included in successful write');
 eq(get(1,8).instagram_username,null,'Unrelated dojo untouched');
}
