import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {assertFinancePrivateDirectory} from './finance-private-directory.mjs';
import {claimFinanceAttempt} from './finance-attempt-journal.mjs';
const windows=process.platform==='win32';
async function directory(t) {
  const root=await mkdtemp(path.join(tmpdir(),'finance-acl-test-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  return root;
}
function setTestAcl(root,extra=false) {
  const result=spawnSync(path.join(process.env.SystemRoot,'System32','WindowsPowerShell','v1.0','powershell.exe'),
    ['-NoProfile','-NonInteractive','-File',fileURLToPath(new URL('../tests/fixtures/finance-private-directory-setup.ps1',import.meta.url)),
      '-Directory',root,...(extra?['-ExtraReader']:[])],{windowsHide:true,encoding:'utf8',timeout:10000});
  assert.equal(result.status,0,`Synthetic ACL setup failed: ${result.stderr}`);
}
test('real Windows owner-only inherited-child permissions permit journal creation and completion',{skip:!windows},async t=>{
  const root=await directory(t);setTestAcl(root);assert.equal(assertFinancePrivateDirectory(root),true);
  const record=await claimFinanceAttempt({directory:root,assertPrivateDirectory:assertFinancePrivateDirectory,
    nonce:'a'.repeat(32),bundleSha256:'b'.repeat(64),mode:'synthetic-local-only'});
  await record.finish({verified:true,expectedSentinel:true,sessionClosed:true,baselineUnchanged:true,
    failures:[],automaticRetryAllowed:false,applicationApproval:false});
  assert.ok(await readFile(path.join(root,'finance-059-060-outcome.json'),'utf8'));
});
test('real Windows verifier rejects broad or inherited access and detects ACL drift before outcome',{skip:!windows},async t=>{
  const root=await directory(t);assert.equal(assertFinancePrivateDirectory(root),false);
  setTestAcl(root);
  const record=await claimFinanceAttempt({directory:root,assertPrivateDirectory:assertFinancePrivateDirectory,
    nonce:'a'.repeat(32),bundleSha256:'b'.repeat(64),mode:'synthetic-local-only'});
  setTestAcl(root,true);assert.equal(assertFinancePrivateDirectory(root),false);
  await assert.rejects(()=>record.finish({verified:true,expectedSentinel:true,sessionClosed:true,baselineUnchanged:true,
    failures:[],automaticRetryAllowed:false,applicationApproval:false}));
});
test('private-directory adapter rejects invalid input without a shell interpretation',()=>{
  for(const value of [null,'relative',''])assert.equal(assertFinancePrivateDirectory(value),false);
});
