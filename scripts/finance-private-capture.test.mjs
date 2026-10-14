import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const windows=process.platform==='win32';
const fixture=fileURLToPath(new URL('../tests/fixtures/finance-private-capture-case.ps1',import.meta.url));
const setup=fileURLToPath(new URL('../tests/fixtures/finance-private-directory-setup.ps1',import.meta.url));
function run(script,args){return spawnSync(path.join(process.env.SystemRoot,'System32','WindowsPowerShell','v1.0','powershell.exe'),
 ['-NoProfile','-NonInteractive','-File',script,...args],{windowsHide:true,encoding:'utf8',timeout:20000});}
async function directory(t){
 const root=await mkdtemp(path.join(tmpdir(),'finance-acl-test-'));
 t.after(()=>rm(root,{recursive:true,force:true}));
 assert.equal(run(setup,['-Directory',root]).status,0);
 return root;
}
test('private capture writes once, verifies bytes, and outputs only hash',{skip:!windows},async t=>{
 const root=await directory(t),result=run(fixture,['-Directory',root]);
 assert.equal(result.status,0,result.stderr);
 const data=await readFile(path.join(root,'ledger-capture.json'));
 assert.equal(result.stdout,'SAVED '+createHash('sha256').update(data).digest('hex'));
 assert.ok(!result.stdout.includes('private-ledger-payload'));
 assert.equal(run(fixture,['-Directory',root]).status,1);
 assert.deepEqual(await readFile(path.join(root,'ledger-capture.json')),data);
});
test('incomplete capture reservation persists and blocks reuse',{skip:!windows},async t=>{
 const root=await directory(t);
 assert.equal(run(fixture,['-Directory',root,'-Case','reserve']).stdout,'RESERVED');
 assert.equal((await stat(path.join(root,'ledger-capture.json'))).size,0);
 assert.equal(run(fixture,['-Directory',root]).status,1);
});
test('broad directory access rejects before evidence reservation',{skip:!windows},async t=>{
 const root=await directory(t);
 assert.equal(run(fixture,['-Directory',root,'-Case','broad']).status,1);
 await assert.rejects(stat(path.join(root,'ledger-capture.json')),{code:'ENOENT'});
});
test('permission drift and oversized output preserve empty blocked evidence',{skip:!windows},async t=>{
 for(const kind of ['drift','oversize']){
  const root=await directory(t);
  const result=run(fixture,['-Directory',root,'-Case',kind]);
  assert.equal(result.status,1);assert.equal(result.stdout,'');
  assert.equal((await stat(path.join(root,'ledger-capture.json'))).size,0);
 }
});
