import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
const sql = await readFile(new URL('../supabase/migrations/058_dojo_tier_assessment_boundary.sql', import.meta.url),'utf8');
const page = await readFile(new URL('../app/admin/members/page.tsx',import.meta.url),'utf8');
test('058 scopes progression to an active caller and target with an exact non-null dojo assignment',()=>{
 for(const required of ['is_active_app_user(auth.uid())',"m.status::text='active'","p.account_status::text='active'",'p.date_of_passing is null','a.class_id=membership.class_id','a.dojo_id=membership.dojo_id','a.dojo_id is not null']) assert.ok(sql.includes(required));
 assert.match(sql,/is_active_super_admin\(auth.uid\(\)\)/);
});
test('058 locks and reauthorizes before enforcing same-rank, same-level, next-tier only',()=>{
 const body=sql.slice(sql.indexOf('create or replace function public.promote_membership'));
 assert.match(body,/assert_membership_progression_scope[\s\S]*for update;[\s\S]*assert_membership_progression_scope[\s\S]*get_next_membership_promotion/);
 for(const required of ['membership.rank_id is null','next_step.next_rank_id is distinct from membership.rank_id','next_step.is_rank_promotion is distinct from false','next_step.next_level is distinct from membership.level::text','next_step.next_sub_rank_id is null','next_step.next_sub_rank_id is not distinct from membership.sub_rank_id']) assert.ok(body.includes(required));
});
test('058 keeps privileged internals private and gates legacy assessment before work',()=>{
 assert.match(sql,/rename to _apply_assessed_membership_promotion/);
 assert.match(sql,/rename to _calculate_membership_promotion/);
 assert.match(sql,/revoke all[\s\S]*from public, anon, authenticated, service_role/);
 assert.match(sql,/Only an active Super Admin can submit assessments/);
 assert.match(sql,/Unexpected assessment submission definition/);
 assert.doesNotMatch(sql,/set_config\(|current_setting\(/); // no spoofable assessment context flag
});
test('direct promotion UI blocks rank changes even for a stale/open form',()=>{
 assert.match(page,/if \(next.is_rank_promotion \|\| next.next_rank_id !== member.rank_id\)/);
 assert.match(page,/Assessment required for next rank/);
 assert.match(page,/Promote Tier/);
});
