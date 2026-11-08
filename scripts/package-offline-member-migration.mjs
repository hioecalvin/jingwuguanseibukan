import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../',import.meta.url));
const raw=readFileSync(process.argv[2]);
const sha=s=>createHash('sha256').update(s).digest('hex');
assert.equal(sha(raw),'560b93a53c3097262c5d8f4338d4b625be497c48a71ac9ecaff0c0acbc7f97b2');
const catalog=JSON.parse(raw.toString().replace(/^\uFEFF/,''));
const names=['offline_same_id_foundation','offline_claim_scope','offline_claim_provisioning','offline_claim_api','offline_claim_setup','offline_app_access','offline_delivery_guards','offline_catalog_consumers','offline_member_conversion'];
const guards={
 offline_claim_provisioning:/ if inet_server_addr\(\) is distinct from '127\.0\.0\.1'::inet\n   or current_setting\('jwg.claim_local',true\) is distinct from 'on' then\n  raise exception 'Disposable local claim integration required'; end if;/,
 offline_delivery_guards:/ if current_setting\('jwg.offline_delivery_local',true\) is distinct from 'on'\n    or inet_server_addr\(\) is distinct from '127\.0\.0\.1'::inet then\n  raise exception 'Disposable loopback delivery lab required';\n end if;/,
 offline_catalog_consumers:/ if inet_server_addr\(\) is distinct from '127\.0\.0\.1'::inet\n   or current_setting\('jwg.claim_local',true\) is distinct from 'on' then\n  raise exception 'Disposable local catalog integration required'; end if;/,
 offline_member_conversion:/ if inet_server_addr\(\) is distinct from '127\.0\.0\.1'::inet\n  or current_setting\('jwg.claim_local',true\) is distinct from 'on' then\n  raise exception 'Disposable local conversion rehearsal required'; end if;/,
};
const quote=s=>"'"+s.replaceAll("'","''")+"'";
const replaced=['handle_new_user','handle_email_verified','queue_email','route_legacy_notification_to_email_outbox','queue_event_email','queue_event_notifications','claim_next_email','is_active_app_user','is_super_admin','is_class_admin'];
const pinned=catalog.routines.filter(r=>replaced.includes(r.name));assert.equal(pinned.length,replaced.length);
const policy=catalog.policies.find(p=>p.tablename==='profiles'&&p.policyname==='own profile');assert.ok(policy);
let ddl=`-- 064: offline member identities, guarded claims, and source-bound conversion.
-- Execute only through the target-bound owner runner after backup and acceptance.
-- No source records, Auth accounts, emails or configuration are created here.
do $preflight$ declare item record; begin
 if current_user<>'postgres' or current_setting('jwg.offline_migration',true) is distinct from '064' then
  raise exception 'Explicit owner migration context required'; end if;
 if to_regnamespace('same_id_import_private') is not null or to_regnamespace('member_claim_private') is not null then
  raise exception 'Offline identity schema already exists; reconcile instead of replay'; end if;
 for item in select * from (values
 ${pinned.map(r=>`(${quote('public.'+r.signature)},${quote(sha(r.definition.replaceAll('\r\n','\n')))})`).join(',\n ')}
 ) f(signature,hash) loop
  if to_regprocedure(item.signature) is null or encode(sha256(convert_to(replace(pg_get_functiondef(to_regprocedure(item.signature)),chr(13),''),'UTF8')),'hex')<>item.hash then
   raise exception 'Baseline routine differs: %',item.signature; end if;
 end loop;
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='own profile' and qual=${quote(policy.qual)}) then
  raise exception 'Profile policy baseline differs'; end if;
end $preflight$;
`;
const provenance=[];
for(const name of names){
 let s=readFileSync(join(root,'supabase/design',name+'.sql'),'utf8').replaceAll('\r\n','\n');
 provenance.push({path:'supabase/design/'+name+'.sql',sha256:sha(s)});
 assert.equal((s.match(/^begin;$/gm)||[]).length,1);assert.match(s,/commit;\s*$/);
 s=s.replace(/^begin;$/m,'').replace(/commit;\s*$/,'');
 if(guards[name]){assert.ok(guards[name].test(s),'Local guard changed: '+name);s=s.replace(guards[name]," -- Installation context and exact routine fingerprints verified above.");}
 assert.ok(!s.includes('inet_server_addr()')&&!s.includes("current_setting('jwg.claim_local'"),'Unconverted local guard');
 ddl+=`\n-- Source: ${name}\n`+s;
}
const out=join(root,'supabase/pending/064_offline_members_and_claims.sql');
writeFileSync(out,ddl);
writeFileSync(join(root,'supabase/pending/064_offline_members_and_claims.provenance.json'),JSON.stringify({migration:'064',sha256:sha(ddl),catalogSha256:sha(raw),sourceFiles:provenance,generatedNotApplied:true},null,2)+'\n');
console.log(JSON.stringify({prepared:true,migration:'064',sha256:sha(ddl),sourceFiles:provenance.length,liveWrites:false}));
