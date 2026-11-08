import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const windows=process.platform==='win32';
const script=fileURLToPath(new URL('./finance-protected-preflight.ps1',import.meta.url));
const setup=fileURLToPath(new URL('../tests/fixtures/finance-credential-setup.ps1',import.meta.url));
const aclSetup=fileURLToPath(new URL('../tests/fixtures/finance-private-directory-setup.ps1',import.meta.url));
function run(file,args) {
 return spawnSync(path.join(process.env.SystemRoot,'System32','WindowsPowerShell','v1.0','powershell.exe'),
  ['-NoProfile','-NonInteractive','-File',file,...args],{windowsHide:true,encoding:'utf8',timeout:15000});
}
async function credential(t,variant='valid') {
 const root=await mkdtemp(path.join(tmpdir(),'finance-acl-test-'));
 t.after(()=>rm(root,{recursive:true,force:true}));
 const result=run(setup,['-Directory',root,'-Variant',variant]);
 assert.equal(result.status,0,'Synthetic credential setup failed');
 return path.join(root,'synthetic.credential.xml');
}
test('real DPAPI decrypt validates synthetic staging binding without returning its secret',{skip:!windows},async t=>{
 const file=await credential(t);const result=run(script,['-CredentialPath',file,'-ValidateCredentialOnly']);
 assert.equal(result.status,0,result.stderr);
 assert.deepEqual(JSON.parse(result.stdout),{credentialValidated:true,remoteContact:false});
 assert.ok(!(result.stdout+result.stderr).includes('SYNTHETIC-NOT-A-LIVE-PASSWORD'));
 const encrypted=await readFile(file,'utf8');assert.ok(!encrypted.includes('SYNTHETIC-NOT-A-LIVE-PASSWORD'));
});
test('wrong target, owner binding and empty credentials are rejected offline',{skip:!windows},async t=>{
 for(const variant of ['wrong-target','wrong-sid','empty']) {
  const file=await credential(t,variant);const result=run(script,['-CredentialPath',file,'-ValidateCredentialOnly']);
  assert.equal(result.status,1);assert.equal(result.stdout,'');assert.match(result.stderr,/Raw details suppressed/);
  assert.match(result.stderr,/\[CREDENTIAL_BINDING_FAILED\]/);
 }
});
test('missing mode or pinned connection resources cannot fall through to a live connection',{skip:!windows},async t=>{
 const file=await credential(t);
 for(const args of [[],['-ValidateCredentialOnly','-ConfirmReadOnlyStaging'],['-ConfirmReadOnlyStaging']]) {
  const result=run(script,['-CredentialPath',file,...args]);assert.equal(result.status,1);assert.equal(result.stdout,'');
 }
});

test('broadened credential-directory permissions reject before credential use',{skip:!windows},async t=>{
 const file=await credential(t);
 const changed=run(aclSetup,['-Directory',path.dirname(file),'-ExtraReader']);
 assert.equal(changed.status,0,'Synthetic permission change failed');
 const result=run(script,['-CredentialPath',file,'-ValidateCredentialOnly']);
 assert.equal(result.status,1);assert.equal(result.stdout,'');
 assert.match(result.stderr,/Raw details suppressed/);
 assert.match(result.stderr,/\[CREDENTIAL_ACCESS_FAILED\]/);
 assert.ok(!result.stderr.includes('SYNTHETIC-NOT-A-LIVE-PASSWORD'));
});

test('session transport cannot be requested without explicit live read-only mode',{skip:!windows},async t=>{
 const file=await credential(t);
 for(const args of [['-ConfirmSessionPooler'],['-ConfirmSessionPooler','-ValidateCredentialOnly']]){
  const result=run(script,['-CredentialPath',file,...args]);
  assert.equal(result.status,1);assert.equal(result.stdout,'');assert.match(result.stderr,/\[MODE_INVALID\]/);
 }
});

test('session alternative pins exact staging identity and never enables transaction-port fallback',async()=>{
 const source=await readFile(script,'utf8');
 const argumentLines=source.split('\n').filter(l=>l.includes('$start.Arguments='));
 assert.equal(argumentLines.length,2);
 assert.ok(argumentLines[1].includes('-h aws-0-ap-southeast-2.pooler.supabase.com -p 5432 -U postgres.eomubndonbetszdbhsrj -d postgres'));
 assert.ok(!source.includes('6543'));
 assert.ok(source.includes('if($ConfirmSessionPooler){'));
 assert.equal((source.match(/\$process\.Start\(\)/g)||[]).length,1);
 const catchBody=source.slice(source.lastIndexOf('} catch {'));
 assert.ok(!catchBody.includes('$start.Arguments='));
 assert.ok(source.includes("$start.EnvironmentVariables['PGSSLMODE']='verify-full'"));
});

test('full ledger capture refuses missing authority or output before client startup',{skip:!windows},async t=>{
 const file=await credential(t);
 for(const args of [['-ValidateCredentialOnly','-CaptureFullLedger'],
  ['-ConfirmReadOnlyStaging','-CaptureFullLedger'],
  ['-ConfirmReadOnlyStaging','-ConfirmSessionPooler','-CaptureFullLedger'],
  ['-ValidateCredentialOnly','-EvidenceDirectory',path.dirname(file)]]){
  const result=run(script,['-CredentialPath',file,...args]);
  assert.equal(result.status,1);assert.equal(result.stdout,'');assert.match(result.stderr,/\[MODE_INVALID\]/);
 }
});
test('full ledger pins exact SQL bytes and reserves protected evidence before process start',async()=>{
 const source=await readFile(script,'utf8');
 const sql=await readFile(new URL('../tests/sql/059_060_ledger_readonly.sql',import.meta.url));
 const hash=createHash('sha256').update(sql).digest('hex');
 assert.ok(source.includes(`$queryHash -cne '${hash}'`));
 assert.ok(source.indexOf('$capture=New-FinanceCaptureFile')<source.indexOf('$process.Start()'));
 assert.ok(source.includes('$start.StandardOutputEncoding=[Text.UTF8Encoding]::new($false,$true)'));
 assert.ok(source.includes('ledgerContentsCompared=$false'));
 assert.ok(sql.toString().includes("'ssl',(select ssl from pg_stat_ssl"));
});

test('actor capture rejects mixed modes, missing binding and unintended output offline',{skip:!windows},async t=>{
 const file=await credential(t);
 for(const args of [['-ValidateCredentialOnly','-CaptureActors'],
  ['-ConfirmReadOnlyStaging','-CaptureActors','-EvidenceDirectory',path.dirname(file)],
  ['-ConfirmReadOnlyStaging','-ConfirmSessionPooler','-CaptureActors','-EvidenceDirectory',path.dirname(file)],
  ['-ConfirmReadOnlyStaging','-ConfirmSessionPooler','-CaptureActors','-CaptureFullLedger','-EvidenceDirectory',path.dirname(file),'-ActorBindingsPath',file],
  ['-ValidateCredentialOnly','-ActorBindingsPath',file]]){
  const result=run(script,['-CredentialPath',file,...args]);
  assert.equal(result.status,1);assert.equal(result.stdout,'');assert.match(result.stderr,/\[MODE_INVALID\]/);
 }
});

test('identity lookup rejects missing approval/output and mixed capture modes',{skip:!windows},async t=>{
 const file=await credential(t);
 for(const args of [['-ValidateCredentialOnly','-CaptureIdentity'],
  ['-ConfirmReadOnlyStaging','-CaptureIdentity','-EvidenceDirectory',path.dirname(file)],
  ['-ConfirmReadOnlyStaging','-ConfirmSessionPooler','-CaptureIdentity'],
  ['-ConfirmReadOnlyStaging','-ConfirmSessionPooler','-CaptureIdentity','-CaptureFullLedger','-EvidenceDirectory',path.dirname(file)],
  ['-ConfirmReadOnlyStaging','-ConfirmSessionPooler','-CaptureIdentity','-CaptureActors','-EvidenceDirectory',path.dirname(file)]]){
  const result=run(script,['-CredentialPath',file,...args]);
  assert.equal(result.status,1);assert.equal(result.stdout,'');assert.match(result.stderr,/\[MODE_INVALID\]/);
 }
});

test('actor capture pins the tested query and binds protected identities before any client start',async()=>{
 const source=await readFile(script,'utf8');
 const sql=await readFile(new URL('../tests/sql/059_060_actors_readonly.sql',import.meta.url));
 assert.ok(source.includes(`$queryHash -cne '${createHash('sha256').update(sql).digest('hex')}'`));
 assert.ok(source.indexOf('$bindingPath=Assert-PrivateFile')<source.indexOf('$process.Start()'));
 assert.ok(source.indexOf('$capture=New-FinanceCaptureFile $EvidenceDirectory -Kind actors')<source.indexOf('$process.Start()'));
 assert.ok(source.includes('bindingSha256=$bindingHash'));
 assert.ok(source.includes('actorEligibilityCompared=$false'));
});

test('client diagnostics expose fixed categories only, never raw error strings',{skip:!windows},()=>{
 const cases=fileURLToPath(new URL('../tests/fixtures/finance-preflight-failure-cases.ps1',import.meta.url));
 const result=run(cases,[]);
 assert.equal(result.status,0);assert.equal(result.stderr,'');
 assert.deepEqual(JSON.parse(result.stdout),['AUTHENTICATION_FAILED','TLS_FAILED','DNS_FAILED',
  'NETWORK_UNAVAILABLE','NETWORK_UNAVAILABLE','CLIENT_FAILED','CLIENT_FAILED']);
 assert.ok(!result.stdout.includes('synthetic-secret'));
});
test('probe contains only fixed read-only SQL and never logs credential or raw client errors',async()=>{
 const source=await readFile(script,'utf8');
 for(const token of ['begin read only;','default_transaction_read_only=on','PGSSLMODE','verify-full',
   "EnvironmentVariables.Clear()","EnvironmentVariables.Remove('PGPASSWORD')",'current_setting(\'transaction_read_only\')']) {
  assert.ok(source.includes(token),token);
 }
 assert.ok(source.includes("$start.EnvironmentVariables['PGPASSWORD']=$record.credential.GetNetworkCredential().Password"));
 assert.doesNotMatch(source,/Write(?:-Output|Line)?\([^\n]*\$(?:stdout|stderr|record)|Invoke-RestMethod|Start-Transcript|\bSet-Acl\b/);
 const argumentsLine=source.split('\n').find(l=>l.includes('$start.Arguments='));
 assert.ok(argumentsLine.includes('db.eomubndonbetszdbhsrj.supabase.co'));assert.ok(!argumentsLine.includes('Password'));
});
