import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {claimFinanceAttempt} from './finance-attempt-journal.mjs';
const valid={verified:true,expectedSentinel:true,sessionClosed:true,baselineUnchanged:true,
  failures:[],automaticRetryAllowed:false,applicationApproval:false};
async function setup(t) {
  const directory=await mkdtemp(path.join(tmpdir(),'finance-journal-test-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  return {directory,nonce:'a'.repeat(32),bundleSha256:'b'.repeat(64),mode:'synthetic-local-only',
    assertPrivateDirectory:async()=>true}; // Synthetic test adapter, NOT Windows ACL verification.
}
test('flushed claim and separate outcome persist; neither success nor a new nonce reopens the attempt',async t=>{
  const options=await setup(t);const journal=await claimFinanceAttempt(options);
  const claim=JSON.parse(await readFile(path.join(options.directory,'finance-059-060-attempt.json'),'utf8'));
  assert.equal(claim.state,'claimed-outcome-unknown');assert.equal(claim.projectRef,null);
  assert.equal((await journal.finish(valid)).state,'verified-rollback');
  await assert.rejects(()=>claimFinanceAttempt({...options,nonce:'c'.repeat(32)}));
  await assert.rejects(()=>journal.finish(valid));
});
test('an unfinished claim blocks a new process without any reset or cleanup',async t=>{
  const options=await setup(t);await claimFinanceAttempt(options);
  await assert.rejects(()=>claimFinanceAttempt(options));
  assert.equal(await readFile(path.join(options.directory,'finance-059-060-outcome.json'),'utf8').catch(e=>e.code),'ENOENT');
});
test('empty/corrupt claim and orphan outcome stop instead of being overwritten',async t=>{
  const options=await setup(t);
  await writeFile(path.join(options.directory,'finance-059-060-attempt.json'),'');
  await assert.rejects(()=>claimFinanceAttempt(options));
  const sub=path.join(options.directory,'orphan');await mkdir(sub);
  await writeFile(path.join(sub,'finance-059-060-outcome.json'),'unreadable');
  await assert.rejects(()=>claimFinanceAttempt({...options,directory:sub}));
});
test('private-directory validation is required before claim and before outcome',async t=>{
  const options=await setup(t);let approved=false;
  const guarded={...options,assertPrivateDirectory:async()=>approved};
  await assert.rejects(()=>claimFinanceAttempt(guarded));approved=true;
  const journal=await claimFinanceAttempt(guarded);approved=false;
  await assert.rejects(()=>journal.finish(valid));
});
test('tampered claim and incomplete outcome retain the blocked record',async t=>{
  const options=await setup(t);const journal=await claimFinanceAttempt(options);
  await writeFile(path.join(options.directory,'finance-059-060-attempt.json'),'tampered');
  await assert.rejects(()=>journal.finish(valid));
  const sub=path.join(options.directory,'incomplete');await mkdir(sub);
  const other=await claimFinanceAttempt({...options,directory:sub});
  await assert.rejects(()=>other.finish({verified:true}));
  await assert.rejects(()=>claimFinanceAttempt({...options,directory:sub}));
});
test('uncertain outcome is never upgraded and raw failure details are not persisted',async t=>{
  const options=await setup(t);const journal=await claimFinanceAttempt(options);
  const outcome=await journal.finish({...valid,sessionClosed:false,failures:['secret-token private record']});
  assert.equal(outcome.state,'failed-or-uncertain');
  assert.ok(!JSON.stringify(outcome).includes('secret-token'));
});
test('invalid scope/nonce/digest/path refuse creation',async t=>{
  const options=await setup(t);
  for(const change of [{mode:'production'},{nonce:'bad'},{bundleSha256:'bad'},{directory:'relative'},
    {assertPrivateDirectory:null}])await assert.rejects(()=>claimFinanceAttempt({...options,...change}));
});
test('two separate processes competing for the same journal permit only one claim',async t=>{
  const options=await setup(t);
  const moduleUrl=new URL('./finance-attempt-journal.mjs',import.meta.url).href;
  const code=`import {claimFinanceAttempt} from ${JSON.stringify(moduleUrl)};
    try {await claimFinanceAttempt({...JSON.parse(process.argv[1]),assertPrivateDirectory:async()=>true});
      process.stdout.write('claimed');}catch{process.stdout.write('blocked');}`;
  const child=()=>new Promise((resolve,reject)=>{
    const p=spawn(process.execPath,['--input-type=module','-e',code,JSON.stringify(options)],{windowsHide:true});
    let out='';p.stdout.on('data',b=>{out+=b;});p.on('error',reject);
    p.on('close',exit=>exit===0?resolve(out):reject(Error('Child claim test failed')));
  });
  assert.deepEqual((await Promise.all([child(),child()])).sort(),['blocked','claimed']);
});
test('journal directory cannot traverse a junction or symbolic link',async t=>{
  const options=await setup(t);const actual=path.join(options.directory,'actual');
  await mkdir(actual);await mkdir(path.join(actual,'child'));
  const link=path.join(options.directory,'linked');await symlink(actual,link,process.platform==='win32'?'junction':'dir');
  await assert.rejects(()=>claimFinanceAttempt({...options,directory:link}),/links/);
  await assert.rejects(()=>claimFinanceAttempt({...options,directory:path.join(link,'child')}),/links/);
});
