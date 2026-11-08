import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {prepareFinanceBaselinePrerequisites,verifyFinancePrerequisiteCapture} from './finance-baseline-prerequisites.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
function capture(){const p=prepareFinanceBaselinePrerequisites();return {schemaVersion:1,kind:'public-finance-prerequisites',
 target:p.target,querySha256:p.querySha256,clientsExitedCleanly:true,snapshot:{capturedAt:new Date().toISOString(),
 database:'postgres',sessionUser:'postgres',readOnly:'on',ssl:true,address:'192.0.2.1',port:5432,backendPid:10,
 controlSystemExecutable:true,role:{superuser:false,bypassRls:false},
 relations:[{kind:'r',selectable:true,rls:false}],columns:[],types:[],edges:[],casts:[],functions:[]}};}
const verify=c=>{const b=Buffer.from(JSON.stringify(c));return verifyFinancePrerequisiteCapture(b,hash(b));};
test('catalog prerequisite plan cannot grant baseline or write authority',()=>{
 const p=prepareFinanceBaselinePrerequisites(),r=verify(capture());
 assert.equal(p.readyToExecute,false);assert.equal(r.readyForBaselineRead,false);assert.equal(r.readyForWriteRehearsal,false);
 assert.equal(r.dependencyReviewRequired,true);assert.deepEqual(r.blockers,[]);
 assert.match(p.sql,/begin isolation level repeatable read read only/);
 assert.doesNotMatch(p.sql,/from\s+public\.|from\s+pg_control_system\s*\(|nextval\s*\(|\b(insert|update|delete)\s/i);
 assert.match(p.sql,/has_function_privilege\(current_user,'pg_catalog.pg_control_system\(\)'/);
});
test('metadata identifies denied identity/select, forced RLS, unsupported relations and custom output',()=>{
 const c=capture(),s=c.snapshot;s.controlSystemExecutable=false;
 s.relations=[{kind:'r',selectable:false,rls:true,forceRls:true,ownerRoleUsable:true},{kind:'f',selectable:true}];
 s.functions=[{schema:'public',executable:false}];
 assert.deepEqual(verify(c).blockers,['cluster-identity-permission','public-select-permission','row-security-restriction',
 'unsupported-public-relation','output-function-permission','custom-output-or-json-cast-review']);
 s.relations=[{kind:'r',selectable:true,rls:true,forceRls:false,ownerRoleUsable:true}];
 assert.ok(!verify(c).blockers.includes('row-security-restriction'));
 s.relations[0].forceRls=true;s.role.bypassRls=true;
 assert.ok(!verify(c).blockers.includes('row-security-restriction'));
});
test('prerequisite verifier rejects altered evidence, wrong target, stale, insecure and incomplete captures',()=>{
 for(const mutate of [c=>c.querySha256='0'.repeat(64),c=>c.target.projectRef='other',c=>c.clientsExitedCleanly=false,
 c=>c.snapshot.ssl=false,c=>c.snapshot.address='127.0.0.1',c=>c.snapshot.readOnly='off',
 c=>c.snapshot.capturedAt='2020-01-01',c=>delete c.snapshot.types,c=>c.snapshot.relations=[]]){
  const c=capture();mutate(c);assert.throws(()=>verify(c));
 }
 const b=Buffer.from(JSON.stringify(capture()));assert.throws(()=>verifyFinancePrerequisiteCapture(b,'0'.repeat(64)));
});

test('PostgreSQL full host masks are valid but networks and loopback identities remain rejected',()=>{
 for(const address of ['192.0.2.1/32','2001:db8::12/128','2001:db8::12']){
  const c=capture();c.snapshot.address=address;assert.equal(verify(c).captureIntegrityVerified,true);
 }
 for(const address of ['192.0.2.1/24','2001:db8::12/64','2001:db8::12/128/128',
 '192.0.2.1/032',' 192.0.2.1','127.0.0.1/32','::1/128','0:0:0:0:0:0:0:1/128',
 '::ffff:127.0.0.1/128','::ffff:7f00:1','0.0.0.0','::']){
  const c=capture();c.snapshot.address=address;assert.throws(()=>verify(c),/staging identity/);
 }
});
