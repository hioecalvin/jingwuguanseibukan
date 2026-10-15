import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdtemp,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {verifyFinanceActorCapture} from './finance-actor-capture.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const bindings={member:'10000000-0000-4000-8000-000000000001',admin:'10000000-0000-4000-8000-000000000002',superAdmin:'10000000-0000-4000-8000-000000000003'};
const bindingBytes=Buffer.from(JSON.stringify({schemaVersion:1,projectRef:'eomubndonbetszdbhsrj',bindings}));
function snapshot(){return {capturedAt:new Date().toISOString(),database:'postgres',sessionUser:'postgres',backendPid:12,readOnly:'on',ssl:true,
 actors:Object.entries(bindings).map(([role,id])=>({id,jsId:{member:'0101',admin:'0002',superAdmin:'0001'}[role],
 accountStatus:'active',deceased:false,superAdmin:role==='superAdmin',activeAssignments:role==='admin'?1:0,eligibleMemberships:1,
 profileDigest:'a'.repeat(64),membershipsDigest:'b'.repeat(64),assignmentsDigest:'c'.repeat(64)}))};}
function envelope(){return {schemaVersion:1,kind:'actors',projectRef:'eomubndonbetszdbhsrj',transport:'session-pooler',
 host:'aws-0-ap-southeast-2.pooler.supabase.com',port:5432,connectionUser:'postgres.eomubndonbetszdbhsrj',sslmode:'verify-full',
 querySha256:'723e23d15bfcdff8127a39f15550154c4b68e03fc9c30e83fbb231677ae04d80',bindingSha256:hash(bindingBytes),snapshot:snapshot()};}
test('offline actor envelope verifies receipt and binding hashes without trusting JSON provenance',()=>{
 const bytes=Buffer.from(JSON.stringify(envelope())),result=verifyFinanceActorCapture(bytes,hash(bytes),bindingBytes);
 assert.equal(result.captureIntegrityVerified,true);assert.equal(result.remoteProvenanceIndependentlyVerified,false);
 assert.equal(result.readyForWriteRehearsal,false);assert.ok(!JSON.stringify(result).includes(bindings.member));
});
test('offline actor envelope rejects altered hash, target, query, binding and local bypass',()=>{
 const bytes=Buffer.from(JSON.stringify(envelope()));
 assert.throws(()=>verifyFinanceActorCapture(bytes,'0'.repeat(64),bindingBytes));
 assert.throws(()=>verifyFinanceActorCapture(bytes,hash(bytes),Buffer.from('{}')));
 assert.throws(()=>verifyFinanceActorCapture(bytes,hash(bytes),bindingBytes,{localProbe:true}));
 for(const change of [{projectRef:'other'},{host:'other'},{port:6543},{sslmode:'require'},
  {kind:'ledger'},{querySha256:'0'.repeat(64)},{bindingSha256:'0'.repeat(64)}]){
  const modified=Buffer.from(JSON.stringify({...envelope(),...change}));
  assert.throws(()=>verifyFinanceActorCapture(modified,hash(modified),bindingBytes));
 }
});
test('offline actor envelope applies existing eligibility and freshness checks',()=>{
 for(const change of [{readOnly:'off'},{ssl:false},{capturedAt:'2020-01-01T00:00:00Z'},{actors:[]}]){
  const x=envelope();Object.assign(x.snapshot,change);const bytes=Buffer.from(JSON.stringify(x));
  assert.throws(()=>verifyFinanceActorCapture(bytes,hash(bytes),bindingBytes));
 }
 const invalid=Buffer.from([0xff]);assert.throws(()=>verifyFinanceActorCapture(invalid,hash(invalid),bindingBytes));
});
const windows=process.platform==='win32';
const file=name=>fileURLToPath(new URL(name,import.meta.url));
function run(script,args){return spawnSync(path.join(process.env.SystemRoot,'System32','WindowsPowerShell','v1.0','powershell.exe'),
 ['-NoProfile','-NonInteractive','-File',script,...args],{windowsHide:true,encoding:'utf8',timeout:30000});}
async function setup(t){
 const root=await mkdtemp(path.join(tmpdir(),'finance-acl-test-'));
 t.after(()=>rm(root,{recursive:true,force:true}));
 assert.equal(run(file('../tests/fixtures/finance-credential-setup.ps1'),['-Directory',root]).status,0);
 const compile=run(file('../tests/fixtures/finance-inert-client-setup.ps1'),['-Directory',root]);
 assert.equal(compile.status,0,compile.stderr);
 await writeFile(path.join(root,'binding.json'),bindingBytes,{flag:'wx'});
 await writeFile(path.join(root,'synthetic-ca.crt'),'INERT-NOT-A-CA',{flag:'wx'});
 const args=['-CredentialPath',path.join(root,'synthetic.credential.xml'),'-ConfirmReadOnlyStaging','-ConfirmSessionPooler',
 '-CaptureActors','-ActorBindingsPath',path.join(root,'binding.json'),'-EvidenceDirectory',root,
 '-ClientPath',path.join(root,'inert-client.exe'),'-ClientSha256',hash(await readFile(path.join(root,'inert-client.exe'))),
 '-RootCertificatePath',path.join(root,'synthetic-ca.crt'),'-RootCertificateSha256',hash('INERT-NOT-A-CA')];
 return {root,args,call:()=>run(file('./finance-protected-preflight.ps1'),args)};
}
test('real Windows wrapper captures inert actor response privately then verifies offline; reuse blocked',{skip:!windows},async t=>{
 const {root,call}=await setup(t);
 await writeFile(path.join(root,'synthetic-response.json'),JSON.stringify({...snapshot(),capturedAt:'SYNTHETIC_CAPTURE_TIME'}));
 const result=call();assert.equal(result.status,0,result.stderr);
 const receipt=JSON.parse(result.stdout);assert.equal(receipt.actorIdentitiesMatch,true);
 assert.equal(receipt.actorEligibilityCompared,false);assert.ok(!result.stdout.includes(bindings.member));
 const capturePath=path.join(root,'actors-capture.json'),bytes=await readFile(capturePath);
 assert.equal(verifyFinanceActorCapture(bytes,receipt.captureSha256,bindingBytes).eligibleProfiles,true);
 assert.equal(call().status,1);assert.deepEqual(await readFile(capturePath),bytes);
 assert.equal(await readFile(path.join(root,'synthetic-attempts.txt'),'utf8'),'START\n');
});
test('wrong protected binding blocks before inert client; wrong response preserves empty evidence',{skip:!windows},async t=>{
 const {root,call}=await setup(t);
 await writeFile(path.join(root,'binding.json'),JSON.stringify({schemaVersion:1,projectRef:'other',bindings}));
 const rejected=call();assert.equal(rejected.status,1);assert.match(rejected.stderr,/ACTOR_BINDING_INVALID/);
 await assert.rejects(stat(path.join(root,'synthetic-attempts.txt')),{code:'ENOENT'});
 await writeFile(path.join(root,'binding.json'),bindingBytes);
 const data=snapshot();data.actors[0].id=bindings.admin;
 await writeFile(path.join(root,'synthetic-response.json'),JSON.stringify(data));
 const mismatch=call();assert.equal(mismatch.status,1);assert.match(mismatch.stderr,/ACTOR_IDENTITY_MISMATCH/);
 assert.equal((await stat(path.join(root,'actors-capture.json'))).size,0);
 assert.equal(call().status,1);
 assert.equal(await readFile(path.join(root,'synthetic-attempts.txt'),'utf8'),'START\n');
});

function identitySnapshot(){return {...snapshot(),actors:undefined,identities:snapshot().actors.map(row=>({
 role:row.jsId==='0101'?'member':row.jsId==='0002'?'admin':'superAdmin',jsId:row.jsId,authIds:[row.id],
 profiles:[{id:row.id,accountStatus:row.accountStatus,deceased:row.deceased,superAdmin:row.superAdmin,activeAssignments:row.activeAssignments}]}))};}
function identityArgs(args){const result=[...args];result[result.indexOf('-CaptureActors')]='-CaptureIdentity';
 result.splice(result.indexOf('-ActorBindingsPath'),2);return result;}
test('identity lookup wrapper and offline binding save work without network and refuse overwrite',{skip:!windows},async t=>{
 const {root,args}=await setup(t);
 await writeFile(path.join(root,'synthetic-response.json'),JSON.stringify({...identitySnapshot(),capturedAt:'SYNTHETIC_CAPTURE_TIME'}));
 const result=run(file('./finance-protected-preflight.ps1'),identityArgs(args));
 assert.equal(result.status,0,result.stderr);const receipt=JSON.parse(result.stdout);
 assert.equal(receipt.dedicatedIdentityMatched,true);assert.ok(!result.stdout.includes(bindings.member));
 const saveArgs=['-EvidenceDirectory',root,'-CaptureSha256',receipt.captureSha256];
 const saved=run(file('./save-finance-identity-bindings.ps1'),saveArgs);
 assert.equal(saved.status,0,saved.stderr);assert.ok(!saved.stdout.includes(bindings.member));
 const binding=JSON.parse(await readFile(path.join(root,'bindings-capture.json'),'utf8'));
 assert.deepEqual(binding.bindings,bindings);assert.equal(binding.sourceCaptureSha256,receipt.captureSha256);
 assert.equal(run(file('./save-finance-identity-bindings.ps1'),saveArgs).status,1);
 assert.equal(await readFile(path.join(root,'synthetic-attempts.txt'),'utf8'),'START\n');
});
test('identity mismatches preserve capture and never produce verified bindings',{skip:!windows},async t=>{
 for(const kind of ['duplicate-auth','wrong-profile','disabled','elevated-member','unassigned-admin']){
  const {root,args}=await setup(t),data=identitySnapshot();
  if(kind==='duplicate-auth')data.identities[0].authIds.push(bindings.admin);
  if(kind==='wrong-profile')data.identities[0].profiles[0].id=bindings.admin;
  if(kind==='disabled')data.identities[0].profiles[0].accountStatus='disabled';
  if(kind==='elevated-member')data.identities[0].profiles[0].superAdmin=true;
  if(kind==='unassigned-admin')data.identities[1].profiles[0].activeAssignments=0;
  await writeFile(path.join(root,'synthetic-response.json'),JSON.stringify(data));
  const result=run(file('./finance-protected-preflight.ps1'),identityArgs(args));
  assert.equal(result.status,1);assert.match(result.stderr,/IDENTITY_BINDING_MISMATCH/);
  assert.ok((await stat(path.join(root,'identity-capture.json'))).size>0);
  await assert.rejects(stat(path.join(root,'bindings-capture.json')),{code:'ENOENT'});
 }
});
test('identity query pins three independent mailbox identifiers and never selects credentials',async()=>{
 const sql=await readFile(new URL('../tests/sql/059_060_identity_readonly.sql',import.meta.url));
 assert.equal(hash(sql),'aaf3484bebe54f1dce348507b978261bd3eb0b509756032f615b6e5fe897afb2');
 assert.match(sql.toString(),/from auth\.users u where lower\(u.email\)=e.email/);
 assert.doesNotMatch(sql.toString(),/encrypted_password|refresh_token|access_token|select \*|to_jsonb\(u\)/);
});
