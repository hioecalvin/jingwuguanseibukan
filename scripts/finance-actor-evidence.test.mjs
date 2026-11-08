import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifyFinanceActorSnapshot,compareFinanceActorSnapshots} from './finance-actor-evidence.mjs';
const bindings={member:'10000000-0000-4000-8000-000000000001',admin:'10000000-0000-4000-8000-000000000002',superAdmin:'10000000-0000-4000-8000-000000000003'};
const nowMs=Date.parse('2026-10-11T05:00:00Z'),options={nowMs};
function fixture(){return {capturedAt:new Date(nowMs-1000).toISOString(),database:'postgres',
  sessionUser:'postgres',backendPid:10,readOnly:'on',ssl:true,
  actors:Object.entries(bindings).map(([role,id])=>({id,jsId:{member:'0101',admin:'0002',superAdmin:'0001'}[role],
    accountStatus:'active',deceased:false,superAdmin:role==='superAdmin',
    activeAssignments:role==='admin'?1:0,eligibleMemberships:1,
    profileDigest:'a'.repeat(64),membershipsDigest:'b'.repeat(64),assignmentsDigest:'c'.repeat(64)}))};}
test('actor verifier accepts exact bindings without exposing identities or claiming live security',()=>{
  const result=verifyFinanceActorSnapshot(fixture(),bindings,options);
  assert.equal(result.actorCount,3);assert.equal(result.readyForWriteRehearsal,false);
  assert.equal(result.authLoginVerified,false);assert.equal(result.liveRoleSecurityVerified,false);
  assert.ok(!JSON.stringify(result).includes(bindings.member));
});
test('actor verifier rejects missing, duplicate, nil and unexpected bindings',()=>{
  for(const b of [null,{}, {...bindings,admin:bindings.member},{...bindings,member:'00000000-0000-0000-0000-000000000000'},
    {...bindings,extra:bindings.admin},{...bindings,member:'not-uuid'}])
    assert.throws(()=>verifyFinanceActorSnapshot(fixture(),b,options));
});
test('wrong IDs, account states and elevated Member or unassigned Admin fail closed',()=>{
  for(const [index,change] of [[0,{id:bindings.admin}],[0,{jsId:'9999'}],[0,{accountStatus:'disabled'}],
    [0,{deceased:true}],[0,{superAdmin:true}],[2,{superAdmin:false}],[0,{activeAssignments:1}],
    [1,{activeAssignments:0}],[0,{eligibleMemberships:0}],[1,{eligibleMemberships:0}],
    [0,{activeAssignments:'0'}],[0,{profileDigest:null}]]){
    const data=fixture();Object.assign(data.actors[index],change);
    assert.throws(()=>verifyFinanceActorSnapshot(data,bindings,options));
  }
  const duplicate=fixture();duplicate.actors[1]=duplicate.actors[0];
  assert.throws(()=>verifyFinanceActorSnapshot(duplicate,bindings,options));
});
test('actor metadata rejects stale, insecure, wrong database and extra or missing accounts',()=>{
  for(const change of [{capturedAt:new Date(nowMs-300001).toISOString()},
    {capturedAt:new Date(nowMs+30001).toISOString()},{capturedAt:null},{readOnly:'off'},
    {ssl:false},{sessionUser:'authenticated'},{database:'other'},{backendPid:0},
    {actors:[]},{actors:[...fixture().actors,fixture().actors[0]]}])
    assert.throws(()=>verifyFinanceActorSnapshot({...fixture(),...change},bindings,options));
});
test('independent actor comparison detects existing-row drift without exposing data',()=>{
  const a=fixture(),b={...fixture(),backendPid:11};
  assert.equal(compareFinanceActorSnapshots(a,b,bindings,options).unchanged,true);
  for(const field of ['profileDigest','membershipsDigest','assignmentsDigest']){
    const changed=structuredClone(b);changed.actors[1][field]='d'.repeat(64);
    assert.deepEqual(compareFinanceActorSnapshots(a,changed,bindings,options).changedRoles,['admin']);
  }
  assert.throws(()=>compareFinanceActorSnapshots(a,a,bindings,options));
  assert.throws(()=>compareFinanceActorSnapshots(a,{...b,capturedAt:new Date(nowMs-2000).toISOString()},bindings,options));
});
test('synthetic actor checks must opt in and cannot masquerade as a staging capture',()=>{
  const data={...fixture(),database:'finance_actor_probe',ssl:false};
  assert.throws(()=>verifyFinanceActorSnapshot(data,bindings,options));
  assert.equal(verifyFinanceActorSnapshot(data,bindings,{...options,localProbe:true}).scope,'synthetic-local-actors');
});
test('prepared query fixes three JS IDs and returns digests without Auth or helper calls',()=>{
  const sql=readFileSync(new URL('../tests/sql/059_060_actors_readonly.sql',import.meta.url),'utf8');
  assert.match(sql,/begin isolation level repeatable read read only/);
  assert.match(sql,/registration_number in\('0101','0002','0001'\)/);
  assert.match(sql,/set local search_path=pg_catalog/);
  assert.doesNotMatch(sql,/\b(?:insert|update|delete|create|alter|drop|setval)\b|auth\.|public\.\w+\s*\(/i);
  assert.doesNotMatch(sql,/'(?:email|phone|fullName|password)'/);
});
