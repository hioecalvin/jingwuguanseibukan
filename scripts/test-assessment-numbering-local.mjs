// Synthetic loopback PG17 only. No env files, backups, remote targets or providers.
import {mkdtempSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
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
 run('createdb',['-h','127.0.0.1','-p',String(port),'-U','postgres','-w','-T','postgres','number_backfill']);
 const backfillArgs=args.map((v,i)=>args[i-1]==='-d'?'number_backfill':v);
 const backfill=sql=>run('psql',backfillArgs,sql).trim();
 backfill(`insert into public.assessment_batches(id,submission_key,class_id,assessment_date,candidate_count,passed_count,failed_count,request_payload,submitted_by)
 select ('92000000-0000-0000-0000-00000000000'||n)::uuid,gen_random_uuid(),'10000000-0000-0000-0000-000000000001',d,1,0,1,'{}','00000000-0000-0000-0000-000000000001'
 from (values(1,date '2024-02-01'),(2,date '2024-01-01'),(3,date '2024-01-01')) v(n,d);
 insert into public.assessment_results(id,batch_id,membership_id,member_user_id,member_name_snapshot,assessment_date,outcome,rank_to_id,rank_to_name_snapshot,certificate_eligible,level_to,assessor_type,assessor_name_snapshot,recorded_by)
 select ('93000000-0000-0000-0000-00000000000'||n)::uuid,('92000000-0000-0000-0000-00000000000'||n)::uuid,('50000000-0000-0000-0000-00000000000'||case when n=3 then 2 else 1 end)::uuid,('30000000-0000-0000-0000-00000000000'||case when n=3 then 2 else 1 end)::uuid,'Historical fixture',d,'fail',r::uuid,'Historical grade',true,'mudansha','external','Historical assessor','00000000-0000-0000-0000-000000000001'
 from (values(1,date '2024-02-01','60000000-0000-0000-0000-000000000002'),(2,date '2024-01-01','60000000-0000-0000-0000-000000000003'),(3,date '2024-01-01','60000000-0000-0000-0000-000000000002')) v(n,d,r);`);
 const original=backfill("select md5(jsonb_agg(to_jsonb(r) order by id)::text) from public.assessment_results r");
 backfill(read('supabase/pending/061_individual_assessment_numbers.sql'));
 assert.equal(backfill("select string_agg(right(id::text,1)||'='||assessment_number,',' order by annual_number) from public.assessment_results"),'3=2024-0001,2=2024-0002,1=2024-0003');
 assert.equal(backfill("select md5(jsonb_agg(to_jsonb(r)-array['assessment_number','assessment_year','annual_number','member_id_snapshot'] order by id)::text) from public.assessment_results r"),original);
 console.log('PASS: historical numbering sorts date first then configured grade, without changing any original result fields.');
 query(read('supabase/pending/061_individual_assessment_numbers.sql'));
 query(read('tests/sql/061_assessment_numbering_assertions.sql'));
 assert.equal(query("select to_regclass('public.class_admin_assignments') is null"),'t');
 assert.equal(query('select count(*) from public.assessment_results'),'0');
 assert.equal(query('select count(*) from public.assessment_year_counters'),'0');
 console.log('PASS: pending numbering-only migration compiles without Class Admin objects; synthetic authorization and reassessment tests roll back without residue.');
 // Separate committed synthetic sessions test row-level counter serialization.
 const batch='91000000-0000-0000-0000-000000000001';
 query(`insert into public.assessment_batches(id,submission_key,class_id,assessment_date,candidate_count,passed_count,failed_count,request_payload,submitted_by)
 values('${batch}',gen_random_uuid(),'10000000-0000-0000-0000-000000000001','2030-01-01',2,0,2,'{}','00000000-0000-0000-0000-000000000001');`);
 const concurrent=(suffix)=>new Promise((resolve,reject)=>{
   const child=spawn(path.join(bin,'psql'+(process.platform==='win32'?'.exe':'')),args,{env,windowsHide:true,stdio:['pipe','pipe','pipe']});
   let output='',error='';const timer=setTimeout(()=>{child.kill();reject(Error('Concurrent local query timed out'));},15000);
   child.stdout.on('data',c=>output+=c);child.stderr.on('data',c=>error+=c);
   child.once('error',e=>{clearTimeout(timer);reject(e);});
   child.once('close',code=>{clearTimeout(timer);if(code!==0)reject(Error(error));else resolve(output.trim());});
   child.stdin.end(`begin;
     insert into public.assessment_results(batch_id,membership_id,member_user_id,member_name_snapshot,assessment_date,outcome,rank_to_id,rank_to_name_snapshot,certificate_eligible,level_to,assessor_type,assessor_name_snapshot,recorded_by)
     values('${batch}','50000000-0000-0000-0000-00000000000${suffix}','30000000-0000-0000-0000-00000000000${suffix}','Synthetic','2030-01-01','fail','60000000-0000-0000-0000-000000000002','Fifth Kyu',true,'mudansha','external','Synthetic','00000000-0000-0000-0000-000000000001') returning assessment_number;
     select pg_sleep(0.2);commit;`);
 });
 assert.deepEqual((await Promise.all([concurrent(1),concurrent(2)])).sort(),['2030-0001','2030-0002']);
 assert.equal(query('select count(*) from public.assessment_results'),'2');
 console.log('PASS: two simultaneous local-only result inserts commit distinct sequential numbers without collision. Synthetic cluster is stopped and retained, not a live acceptance.');
 console.log('Evidence cluster preserved: '+root);
}finally{if(started)run('pg_ctl',['-D',data,'-m','fast','-w','stop']);}
