// Synthetic loopback PG17 only. No env files, backups, remote targets or providers.
import {mkdtempSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import net from 'node:net';
import assert from 'node:assert/strict';
if(process.argv[2]!=='--synthetic-local-only'||!process.env.LOCAL_PG_BIN) throw Error('Local mode and LOCAL_PG_BIN required');
const bin=path.resolve(process.env.LOCAL_PG_BIN),root=mkdtempSync(path.join(tmpdir(),'js-assessment-'));
const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!/^PG|SUPABASE|DATABASE|RESEND|MUX|SECURITY_TEST|EMAIL|PUSH/i.test(k)));
const run=(name,args,input)=>{
 const r=spawnSync(path.join(bin,name+(process.platform==='win32'?'.exe':'')),args,{env,input,encoding:'utf8',windowsHide:true,timeout:60000,maxBuffer:4000000,...(name==='pg_ctl'?{stdio:'ignore'}:{})});
 if(r.error||r.status!==0)throw Error(`${name}: ${r.stderr||r.error?.message||r.status}`);
 return r.stdout||'';
};
const read=file=>readFileSync(file,'utf8');
function definition(file,name){
 const found=read(file).match(new RegExp(`create or replace function public\\.${name}\\([\\s\\S]*?\\bas\\s+(\\$[a-z_]*\\$)[\\s\\S]*?\\1\\s*;`,'i'))?.[0];
 if(!found)throw Error('Missing definition '+name);return found;
}
const listener=net.createServer();await new Promise(r=>listener.listen(0,'127.0.0.1',r));
const port=listener.address().port;await new Promise(r=>listener.close(r));
const data=path.join(root,'data');let started=false;
try{
 run('initdb',['-D',data,'-U','postgres','--auth-local=trust','--auth-host=trust','--no-locale','--encoding=UTF8']);
 started=true;run('pg_ctl',['-D',data,'-l',path.join(root,'postgres.log'),'-o',`-h 127.0.0.1 -p ${port}`,'-w','start']);
 const args=['-X','-w','-h','127.0.0.1','-p',String(port),'-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-qAt'];
 const query=sql=>run('psql',args,sql).trim();
 query(read('tests/sql/041_atomic_bulk_assessments_fixture.sql'));
 query(`alter table public.profiles add column registration_number text;
 update public.profiles set registration_number='JS-'||right(id::text,4);
 alter table public.class_memberships add column role text default 'member';
 create type public.membership_status as enum('active','inactive','break','break_1','break_2');
 alter table public.class_memberships alter column status drop default;
 alter table public.class_memberships alter column status type public.membership_status using status::public.membership_status;
 alter table public.class_memberships alter column status set default 'active'::public.membership_status;
 create table public.dojo_admin_assignments(user_id uuid,class_id uuid,dojo_id uuid,active boolean);
 create function auth.role() returns text language sql as $$select current_setting('role')$$;
 create function public.is_active_app_user(uid uuid) returns boolean language sql stable as $$
 select exists(select 1 from public.profiles where id=uid and account_status='active' and date_of_passing is null)$$;
 create function public.undo_last_membership_promotion(uuid,text) returns void language plpgsql as $$begin return;end$$;
 drop function public.can_manage_class(uuid,uuid);
 ${definition('supabase/migrations/037_align_break_states_and_transfer_boundaries.sql','can_manage_class')}
 ${definition('supabase/migrations/014_security_definer_caller_hardening.sql','is_class_admin')}
 -- Fixture calculation returns the same six-column production signature.
 alter function public.get_next_membership_promotion(uuid) rename to fixture_calculation;
 create function public.get_next_membership_promotion(target_membership_id uuid)
 returns table(next_rank_id uuid,next_rank_name text,next_sub_rank_id uuid,next_sub_rank_name text,next_level text,is_rank_promotion boolean)
 language sql as $$select p.next_rank_id,r.name,p.next_sub_rank_id,s.name,p.next_level,p.is_rank_promotion
 from public.fixture_calculation(target_membership_id) p join public.ranks r on r.id=p.next_rank_id
 left join public.sub_ranks s on s.id=p.next_sub_rank_id$$;`);
 for(const file of ['029_serialize_membership_promotions.sql','041_atomic_bulk_assessments.sql','042_prepare_assessment_certificates.sql'])query(read('supabase/migrations/'+file));
 // Exact 043 preparation correction without unrelated memorial dependencies.
 query(`do $$declare d text;begin d:=pg_get_functiondef('public.prepare_bulk_assessment(uuid,uuid,date,uuid,text,uuid,jsonb)'::regprocedure);
 execute replace(d,'profile.member_id::text as member_id','profile.registration_number::text as member_id');end$$;`);
 query(read('supabase/migrations/058_dojo_tier_assessment_boundary.sql'));

 query(read('supabase/pending/061_individual_assessment_numbers.sql'));
 query(read('supabase/pending/068_appointed_assessor_all_grades.sql'));
 query(`alter table public.ranks add column class_id uuid default '10000000-0000-0000-0000-000000000001';
 alter table public.ranks add column level public.membership_level default 'mudansha';
 update public.ranks set name=case right(id::text,1) when '1' then '8th Kyu' when '2' then '7th Kyu' when '3' then '5th Kyu' else '4th Kyu' end;
 update public.class_memberships set rank_id=null,sub_rank_id=null where class_id='10000000-0000-0000-0000-000000000002';`);
 query(definition('supabase/pending/071_member_rank_only_progression.sql','_calculate_membership_promotion'));
 if(process.argv[3]){
  const raw=readFileSync(process.argv[3]);
  assert.equal(createHash('sha256').update(raw).digest('hex'),process.argv[4],'Captured assessment catalog differs');
  const catalog=JSON.parse(raw.toString('utf8'));
  assert.equal(catalog.routines.length,11);
  for(const routine of catalog.routines)query(routine.definition);
  console.log('Loaded all11 captured production assessment routines; fictional profiles and Auth fixture only.');
 }
 query(read('supabase/pending/096_assessment_higher_rank_targets.sql'));
 query(read('tests/sql/096_assessment_higher_rank_targets_assertions.sql'));
 console.log('PASS: synthetic higher-target preparation, pass/fail attempts, snapshots, stale rejection and access checks.');
 writeFileSync(path.join(root,'result.json'),JSON.stringify({passed:true,capturedRoutines:!!process.argv[3],syntheticOnly:true,remoteCalls:false}));
 console.log('Synthetic cluster retained: '+root);
}finally{if(started)run('pg_ctl',['-D',data,'-m','fast','-w','stop']);}
