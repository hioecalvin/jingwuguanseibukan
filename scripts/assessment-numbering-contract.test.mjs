import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {transformSync} from 'esbuild';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const numbers=read('supabase/pending/061_individual_assessment_numbers.sql');

test('withdrawn Class Admin has no app route, capability, or pending role migration',()=>{
 assert.equal(existsSync(new URL('../app/admin/class-administrators/page.tsx',import.meta.url)),false);
 assert.equal(existsSync(new URL('../supabase/pending/061_class_assessment_administrators.sql',import.meta.url)),false);
 assert.doesNotMatch(read('lib/auth/get-current-app-user.ts'),/hasClassAdministration|get_my_class_admin_scopes/);
 assert.doesNotMatch(numbers,/is_assessment_class_admin|class_admin_assignments/);
 assert.match(read('lib/auth/get-current-app-user.ts'),/dojo_admin_assignments/);
});

test('numbered history allows own records, global Super Admin or exact dojo only',()=>{
 assert.match(numbers,/public\.is_active_app_user\(auth.uid\(\)\)/);
 assert.match(numbers,/r.member_user_id=auth.uid\(\) or public\.is_active_super_admin\(auth.uid\(\)\)/);
 assert.match(numbers,/r.dojo_id_snapshot is not null and public\.is_class_admin\(b.class_id,r.dojo_id_snapshot,auth.uid\(\)\)/);
 assert.doesNotMatch(numbers,/create or replace function public\.(?:is_super_admin|can_manage_class|assert_membership_progression_scope)/);
});

test('numbers are per-result, annual, shared and never replace certificate identity',()=>{
 assert.match(numbers,/primary key check \(assessment_year/);
 assert.match(numbers,/unique\(assessment_year,annual_number\)/);
 assert.match(numbers,/unique\s*\(assessment_number\)/i);
 for(const expression of ["o.yr::text||'-'||lpad(o.seq::text,4,'0')", "assessment_year::text||'-'||lpad(annual_number::text,4,'0')", "year_value::text||'-'||lpad(sequence_value::text,4,'0')"]){
   assert.ok(numbers.includes(expression), `Full year required: ${expression}`);
 }
 assert.doesNotMatch(numbers,/right\([^\n]*year[^\n]*,\s*2\)/i);
 assert.match(numbers,/before insert on public\.assessment_results/);
 assert.match(numbers,/last_number=assessment_year_counters.last_number\+1/);
 assert.match(numbers,/annual_number between 1 and 9999/);
 assert.match(numbers,/drop constraint assessment_results_membership_date_unique/);
 assert.doesNotMatch(numbers,/update public\.prepared_assessment_certificates|certificate_number\s*=/i);
});

test('numbering regression fixtures cover real class boundaries and supported centuries',()=>{
 const fixture=read('tests/sql/061_assessment_numbering_assertions.sql');
 assert.match(fixture,/count\(distinct b.class_id\)/);
 assert.match(fixture,/Inconsistent cross-class fixture/);
 assert.match(fixture,/array\[1925,2025,2125\]/);
 assert.match(fixture,/array\[1899,2200\]/);
 assert.match(fixture,/assessment_date=assessment_date\+1/);
});

test('historical backfill is chronological, grade ascending, Member ID deterministic',()=>{
 assert.match(numbers,/order by r.assessment_date,rank_to.sort_order,sub_rank.sort_order nulls first,\s*p.registration_number/);
 assert.match(numbers,/Submitted assessment records are immutable/);
});

test('only Super Admin sees assessment entry; Dojo Admin stays scoped and tier-only',()=>{
 const compiled={exports:{}};
 vm.runInNewContext(transformSync(read('lib/navigation.ts'),{loader:'ts',format:'cjs'}).code,{module:compiled,exports:compiled.exports});
 const nav=compiled.exports.getNavigationForRole;
 for(const role of ['admin','member','super_admin']){
   assert.equal(nav(role).some(n=>n.href==='/admin/assessments'),role==='super_admin');
   assert.equal(nav(role).some(n=>n.href==='/admin/class-administrators'),false);
 }
 assert.match(read('app/admin/assessments/layout.tsx'),/currentUser.role !== "super_admin"/);
 assert.match(read('supabase/migrations/058_dojo_tier_assessment_boundary.sql'),/Only Super Admin can correct a rank assessment/);
});
