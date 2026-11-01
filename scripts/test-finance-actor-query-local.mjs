// Only invoked by the existing disposable loopback cluster harness.
import {readFileSync} from 'node:fs';
import {verifyFinanceActorSnapshot,compareFinanceActorSnapshots} from './finance-actor-evidence.mjs';
import {financeReleaseEvidenceQuery} from './finance-pooler-release-evidence.mjs';
export function testFinanceActorQueryLocal({run,psqlArgs,port}) {
  run('createdb',['-h','127.0.0.1','-p',String(port),'-U','postgres','-w','finance_actor_probe']);
  const args=psqlArgs.map((value,index)=>psqlArgs[index-1]==='-d'?'finance_actor_probe':value);
  const query=sql=>run('psql',[...args,'-qAt'],sql).trim();
  const bindings={member:'10000000-0000-4000-8000-000000000001',
    admin:'10000000-0000-4000-8000-000000000002',superAdmin:'10000000-0000-4000-8000-000000000003'};
  query(`create table public.profiles(id uuid primary key,registration_number text,
    account_status text,date_of_passing date,is_super_admin boolean,private_note text);
    create table public.class_memberships(id integer primary key,user_id uuid,status text);
    create table public.dojo_admin_assignments(id integer primary key,user_id uuid,active boolean);
    insert into public.profiles values
    ('${bindings.member}','0101','active',null,false,'do not return'),
    ('${bindings.admin}','0002','active',null,false,'do not return'),
    ('${bindings.superAdmin}','0001','active',null,true,'do not return'),
    ('10000000-0000-4000-8000-000000000004','9999','disabled',null,false,'unrelated');
    insert into public.class_memberships values(1,'${bindings.member}','active'),(2,'${bindings.admin}','break');
    insert into public.dojo_admin_assignments values(1,'${bindings.admin}',true);`);
  const sql=readFileSync(new URL('../tests/sql/059_060_actors_readonly.sql',import.meta.url),'utf8');
  const capture=()=>{
    const text=query(sql);
    if(text.includes('do not return')||text.includes('unrelated'))throw Error('Actor query disclosed raw profile data');
    return JSON.parse(text);
  };
  const options={localProbe:true},before=capture();
  verifyFinanceActorSnapshot(before,bindings,options);
  const boundText=query(financeReleaseEvidenceQuery('actors').sql),bound=JSON.parse(boundText);
  if(boundText.includes('do not return')||bound.address!=='127.0.0.1'||bound.port!==port||!/^\d+$/.test(bound.clusterId)||
    !compareFinanceActorSnapshots(before,bound,bindings,options).unchanged)
    throw Error('Server-bound actor query lost identity, disclosed data or changed content');
  console.log('PASS: version-2 actor query preserves private digests and captures actual server address, port and cluster identity (local only)');
  query(`create schema auth;create table auth.users(id uuid,email text,encrypted_password text);
    insert into auth.users values
    ('${bindings.member}','0101@dummy.jingwuguan.test','never return'),
    ('${bindings.admin}','0002@dummy.jingwuguan.test','never return'),
    ('${bindings.superAdmin}','0001@dummy.jingwuguan.test','never return'),
    ('10000000-0000-4000-8000-000000000004','unrelated@example.invalid','never return');`);
  const identitySql=readFileSync(new URL('../tests/sql/059_060_identity_readonly.sql',import.meta.url),'utf8');
  const identityText=query(identitySql),identities=JSON.parse(identityText).identities;
  if(identityText.includes('never return')||identityText.includes('unrelated')||identities.length!==3)
    throw Error('Identity query disclosure or coverage mismatch');
  for(const row of identities)if(row.authIds.length!==1||row.profiles.length!==1||
    row.authIds[0]!==bindings[row.role]||row.profiles[0].id!==bindings[row.role])throw Error('Identity query mismatch');
  query(`insert into auth.users values('${bindings.admin}','0101@dummy.jingwuguan.test','never return');`);
  if(JSON.parse(query(identitySql)).identities.find(r=>r.role==='member').authIds.length!==2)
    throw Error('Duplicate Auth identity hidden');
  console.log('PASS: fixed READ ONLY identity query resolves three mailboxes/profiles, exposes duplicates and excludes unrelated Auth/password data (synthetic only)');
  if(!compareFinanceActorSnapshots(before,capture(),bindings,options).unchanged)throw Error('Actor equality failed');
  query(`update public.profiles set private_note='changed privately' where id='${bindings.admin}';`);
  const drift=compareFinanceActorSnapshots(before,capture(),bindings,options);
  if(JSON.stringify(drift.changedRoles)!=='["admin"]')throw Error('Profile drift missed');
  const rejects=()=>{
    const snapshot=capture();
    let rejected=false;try{verifyFinanceActorSnapshot(snapshot,bindings,options);}catch{rejected=true;}
    if(!rejected)throw Error('Unsafe actor accepted');
  };
  query(`update public.profiles set account_status='disabled' where id='${bindings.member}';`);rejects();
  query(`update public.profiles set account_status='active',date_of_passing=current_date where id='${bindings.member}';`);rejects();
  query(`update public.profiles set date_of_passing=null where id='${bindings.member}';
    update public.dojo_admin_assignments set active=false;`);rejects();
  query(`update public.dojo_admin_assignments set active=true;
    update public.profiles set registration_number='0101' where registration_number='9999';`);rejects();
  console.log('PASS: fixed actor query READ ONLY; three exact bindings, private digests, independent equality and drift/ineligible/duplicate negative controls (synthetic only)');
}
