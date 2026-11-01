import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdtemp,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn,spawnSync} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {buildFinanceSessionWitnessSql} from './finance-session-witness.mjs';
import {verifyFinanceSessionWitnessCapture} from './finance-session-witness-capture.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const windows=process.platform==='win32';
const file=x=>fileURLToPath(new URL(x,import.meta.url));
function run(script,args){return spawnSync(path.join(process.env.SystemRoot,'System32','WindowsPowerShell','v1.0','powershell.exe'),
  ['-NoProfile','-NonInteractive','-File',script,...args],{windowsHide:true,encoding:'utf8',timeout:50000});}
async function setup(t,mode='ok'){
  const root=await mkdtemp(path.join(tmpdir(),'finance-acl-test-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  assert.equal(run(file('../tests/fixtures/finance-credential-setup.ps1'),['-Directory',root]).status,0);
  const compile=run(file('../tests/fixtures/finance-witness-inert-setup.ps1'),['-Directory',root]);
  assert.equal(compile.status,0,compile.stderr);
  await writeFile(path.join(root,'synthetic-ca.crt'),'INERT-NOT-A-CA',{flag:'wx'});
  await writeFile(path.join(root,'mode.txt'),mode,{flag:'wx'});
  const args=['-CredentialPath',path.join(root,'synthetic.credential.xml'),'-ConfirmReadOnlyStaging','-ConfirmSessionPooler',
    '-CaptureSessionWitness','-EvidenceDirectory',root,'-ClientPath',path.join(root,'witness-inert.exe'),
    '-ClientSha256',hash(await readFile(path.join(root,'witness-inert.exe'))),
    '-RootCertificatePath',path.join(root,'synthetic-ca.crt'),'-RootCertificateSha256',hash('INERT-NOT-A-CA')];
  return {root,args,call:()=>run(file('./finance-protected-preflight.ps1'),args)};
}
async function assertStopped(root,count){
  const pids=(await readFile(path.join(root,'started.txt'),'utf8')).trim().split('\n').map(Number);
  assert.equal(pids.length,count);
  assert.ok(pids.every(pid=>Number.isInteger(pid)&&pid>0));
  // PIDs can be recycled by unrelated concurrent tests. Verify the exact unique
  // fixture executable instead; the capture still requires its own handles exited.
  const probe=run(file('../tests/fixtures/finance-inert-exit-probe.ps1'),['-ClientPath',path.join(root,'witness-inert.exe')]);
  assert.equal(probe.status,0,probe.stderr);assert.equal(probe.stdout,'EXACT_INERT_CLIENT_EXITED');
}

test('witness exit probe rejects its live child but ignores another fixture path',{skip:!windows},async t=>{
  const {root}=await setup(t),unrelated=await setup(t);
  const clientPath=path.join(root,'witness-inert.exe');
  const child=spawn(clientPath,['-X','-w','-qAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=terse',
    '-h','aws-0-ap-southeast-2.pooler.supabase.com','-p','5432','-U','postgres.eomubndonbetszdbhsrj','-d','postgres'],{
    windowsHide:true,stdio:['pipe','ignore','ignore'],env:{SystemRoot:process.env.SystemRoot,WINDIR:process.env.SystemRoot,
      PGPASSWORD:'SYNTHETIC-NOT-A-LIVE-PASSWORD',PGSSLMODE:'verify-full',PGOPTIONS:'-c default_transaction_read_only=on'}});
  // This compiled fixture contains no networking and waits for stdin indefinitely.
  const closed=new Promise(resolve=>{child.once('error',resolve);child.once('close',resolve);});
  try{
    await new Promise((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject);});
    let ready=false;
    for(let attempt=0;attempt<100;attempt++){
      try{await stat(path.join(root,'started.txt'));ready=true;break;}catch(error){if(error.code!=='ENOENT')throw error;}
      await delay(20);
    }
    assert.equal(ready,true,'Inert witness must report startup');
    const live=run(file('../tests/fixtures/finance-inert-exit-probe.ps1'),['-ClientPath',clientPath]);
    assert.equal(live.status,1);assert.equal(live.stderr,'INERT_EXIT_NOT_VERIFIED');
    const other=run(file('../tests/fixtures/finance-inert-exit-probe.ps1'),['-ClientPath',path.join(unrelated.root,'witness-inert.exe')]);
    assert.equal(other.status,0,other.stderr);assert.equal(other.stdout,'EXACT_INERT_CLIENT_EXITED');
  }finally{if(child.exitCode===null)child.kill();await closed;}
  await assertStopped(root,1);
});
function envelope(){
  const nonce='a'.repeat(32),stamp=new Date().toISOString();
  const primary={nonce,capturedAt:stamp,database:'postgres',sessionUser:'postgres',address:'192.0.2.1',port:5432,
    backendPid:101,readOnly:'on',ssl:true,backendStart:stamp,transactionStart:stamp,peer:null};
  const observer={...primary,backendPid:102,peer:{pid:101,backendStart:stamp,transactionStart:stamp,
    database:'postgres',user:'postgres',state:'idle in transaction',applicationName:'jwg-finance-witness-'+nonce}};
  return {schemaVersion:1,kind:'session-witness',projectRef:'eomubndonbetszdbhsrj',transport:'session-pooler',
    host:'aws-0-ap-southeast-2.pooler.supabase.com',port:5432,connectionUser:'postgres.eomubndonbetszdbhsrj',
    sslmode:'verify-full',nonce,clientsExitedCleanly:true,primary,observer,
    primaryQuerySha256:hash(buildFinanceSessionWitnessSql(nonce)),observerQuerySha256:hash(buildFinanceSessionWitnessSql(nonce,101))};
}
test('offline witness envelope checks integrity without claiming remote provenance or rollback',()=>{
  const bytes=Buffer.from(JSON.stringify(envelope()));
  const result=verifyFinanceSessionWitnessCapture(bytes,hash(bytes));
  assert.equal(result.distinctBackends,true);assert.equal(result.captureIntegrityVerified,true);
  for(const key of ['readyForWriteRehearsal','remoteContact','rollbackVerified','remoteProvenanceIndependentlyVerified','serverClosureIndependentlyVerified'])assert.equal(result[key],false);
});
test('offline witness rejects bad hashes, transport, query, closure, stale/reused backend and local bypass',()=>{
  const bytes=Buffer.from(JSON.stringify(envelope()));
  assert.throws(()=>verifyFinanceSessionWitnessCapture(bytes,'0'.repeat(64)));
  assert.throws(()=>verifyFinanceSessionWitnessCapture(bytes,hash(bytes),{localProbe:true}));
  for(const change of [{projectRef:'other'},{host:'other'},{port:6543},{sslmode:'require'},
    {clientsExitedCleanly:false},{primaryQuerySha256:'0'.repeat(64)},{observerQuerySha256:'0'.repeat(64)},
    {primary:{...envelope().primary,ssl:false}},{observer:{...envelope().observer,backendPid:101}},
    {primary:{...envelope().primary,capturedAt:'2020-01-01T00:00:00Z'}}]){
    const modified=Buffer.from(JSON.stringify({...envelope(),...change}));
    assert.throws(()=>verifyFinanceSessionWitnessCapture(modified,hash(modified)));
  }
  const invalid=Buffer.from([255]);assert.throws(()=>verifyFinanceSessionWitnessCapture(invalid,hash(invalid)));
});
test('protected witness captures two inert clients, exact SQL, private receipt and no overwrite',{skip:!windows},async t=>{
  const {root,call}=await setup(t);const result=call();assert.equal(result.status,0,result.stderr);
  const receipt=JSON.parse(result.stdout),bytes=await readFile(path.join(root,'session-witness-capture.json'));
  const capture=JSON.parse(bytes);assert.equal(receipt.sessionWitnessCompared,false);
  assert.equal(verifyFinanceSessionWitnessCapture(bytes,receipt.captureSha256).distinctBackends,true);
  assert.equal(await readFile(path.join(root,'primary.sql'),'utf8'),buildFinanceSessionWitnessSql(capture.nonce));
  assert.equal(await readFile(path.join(root,'observer.sql'),'utf8'),buildFinanceSessionWitnessSql(capture.nonce,101));
  assert.equal(await readFile(path.join(root,'primary-rollback.txt'),'utf8'),'received');
  assert.doesNotMatch(result.stdout+result.stderr,/SYNTHETIC-NOT-A-LIVE-PASSWORD|192\.0\.2\.1|backendPid/);
  assert.equal(call().status,1);assert.deepEqual(await readFile(path.join(root,'session-witness-capture.json')),bytes);
  await assertStopped(root,2);
});
test('reused PID capture is preserved but cannot pass the offline witness gate',{skip:!windows},async t=>{
  const {root,call}=await setup(t,'reused-pid');const result=call();assert.equal(result.status,0,result.stderr);
  const receipt=JSON.parse(result.stdout);assert.equal(receipt.sessionWitnessCompared,false);
  const bytes=await readFile(path.join(root,'session-witness-capture.json'));
  assert.throws(()=>verifyFinanceSessionWitnessCapture(bytes,receipt.captureSha256),/Distinct simultaneous/);
  await assertStopped(root,2);
});
test('witness failures bound time/output, stop both children, preserve reservation and never retry',{skip:!windows},async t=>{
  for(const mode of ['early-exit','stderr','oversized','trailing-output','primary-timeout','observer-timeout','close-timeout']){
    const {root,call}=await setup(t,mode);const started=Date.now(),result=call();
    assert.equal(result.status,1,mode+': '+result.stderr);assert.ok(Date.now()-started<30000,mode);
    assert.equal(result.stdout,'');assert.match(result.stderr,/SESSION_WITNESS_CAPTURE_FAILED/);
    assert.doesNotMatch(result.stderr,/SYNTHETIC-RAW-ERROR-SECRET|SYNTHETIC-NOT-A-LIVE-PASSWORD/);
    assert.equal((await stat(path.join(root,'session-witness-capture.json'))).size,0);
    assert.equal(call().status,1);await assertStopped(root,['early-exit','primary-timeout'].includes(mode)?1:2);
  }
});
test('witness mode rejects missing approval/output or mixed modes before any inert start',{skip:!windows},async t=>{
  const {root,args}=await setup(t);
  for(const omit of ['-ConfirmReadOnlyStaging','-ConfirmSessionPooler','-EvidenceDirectory']){
    const modified=[...args],index=modified.indexOf(omit);modified.splice(index,omit==='-EvidenceDirectory'?2:1);
    const result=run(file('./finance-protected-preflight.ps1'),modified);assert.equal(result.status,1);assert.match(result.stderr,/MODE_INVALID/);
  }
  for(const extra of ['-CaptureActors','-CaptureIdentity','-CaptureFullLedger','-ValidateCredentialOnly']){
    const result=run(file('./finance-protected-preflight.ps1'),[...args,extra]);assert.equal(result.status,1);assert.match(result.stderr,/MODE_INVALID/);
  }
  await assert.rejects(stat(path.join(root,'started.txt')),{code:'ENOENT'});
});
