import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm,symlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {financeReadOnlyStagingTarget} from './finance-staging-baseline.mjs';
import {prepareFinancePoolerLaunchPlan} from './finance-pooler-launch-plan.mjs';
import {runFinanceBoundedProcess} from './finance-bounded-process.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
async function setup(t){
  const directory=await mkdtemp(path.join(tmpdir(),'finance-launch-test-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const psqlPath=path.join(directory,'fake.exe'),rootCertPath=path.join(directory,'inert-ca.crt');
  await writeFile(psqlPath,'NOT-EXECUTABLE');await writeFile(rootCertPath,'NOT-A-CERTIFICATE');
  return {target:financeReadOnlyStagingTarget(),purpose:'rollback-rehearsal',psqlPath,
    psqlSha256:hash('NOT-EXECUTABLE'),rootCertPath,rootCertSha256:hash('NOT-A-CERTIFICATE'),ambientEnv:{}};
}
test('separate frozen pooler plans pin target/resources and distinguish rollback from read-only evidence',async t=>{
  const c=await setup(t);
  for(const purpose of ['rollback-rehearsal','read-only-evidence']){
    const p=await prepareFinancePoolerLaunchPlan({...c,purpose});
    assert.equal(p.readyToExecute,false);assert.equal(p.credentialLoaded,false);assert.equal(p.credentialRequired,true);
    assert.equal(p.requiresResourceRevalidation,true);assert.equal(p.applicationApproval,false);
    assert.equal(p.env.PGSSLMODE,'verify-full');assert.equal(p.env.PGSSLROOTCERT,c.rootCertPath);
    assert.match(p.env.PGOPTIONS,new RegExp('default_transaction_read_only='+(purpose==='rollback-rehearsal'?'off':'on')));
    assert.equal(p.args[p.args.indexOf('-h')+1],c.target.host);assert.ok(p.args.includes('-X')&&p.args.includes('-w'));
    for(const obj of [p,p.target,p.resources,p.args,p.env])assert.ok(Object.isFrozen(obj));
    assert.equal(Object.hasOwn(p.env,'PGPASSWORD'),false);
    assert.ok(p.args.includes(purpose==='rollback-rehearsal'?'VERBOSITY=verbose':'VERBOSITY=terse'));
  }
});
test('ambient secrets and connection overrides are dropped; case collisions and malformed OS values reject',async t=>{
  const c=await setup(t);c.ambientEnv={SystemRoot:'C:\\Windows',PGPASSWORD:'SYNTHETIC-SECRET',
    PGHOSTADDR:'127.0.0.1',PGSERVICE:'production',PGPASSFILE:'secret-file',PGOPTIONS:'unsafe',
    NODE_OPTIONS:'unsafe',SUPABASE_SECRET_KEY:'SYNTHETIC-SECRET',HTTPS_PROXY:'unsafe',PATH:'unsafe'};
  const p=await prepareFinancePoolerLaunchPlan(c);assert.equal(p.env.SystemRoot,'C:\\Windows');
  assert.doesNotMatch(JSON.stringify(p),/SYNTHETIC-SECRET|unsafe|secret-file/);
  for(const ambientEnv of [{TEMP:'a',temp:'b'},{TEMP:'bad\0value'},{WINDIR:2},null,[]])
    await assert.rejects(()=>prepareFinancePoolerLaunchPlan({...c,ambientEnv}));
});
test('unknown options, wrong mode/target, unpinned resources and resource replacement fail closed',async t=>{
  const c=await setup(t);
  for(const change of [{purpose:'apply'},{target:{...c.target,port:6543}},{target:{...c.target,sslmode:'require'}},
    {args:['override']},{password:'SYNTHETIC'},{env:{}},{psqlPath:'relative.exe'},
    {psqlPath:c.psqlPath.replace('.exe','.cmd')},{psqlSha256:'0'.repeat(64)},{rootCertSha256:'0'.repeat(64)}])
    await assert.rejects(()=>prepareFinancePoolerLaunchPlan({...c,...change}));
  if(process.platform==='win32')for(const rootCertPath of ['\\\\invalid.example\\share\\ca.crt',
    '\\\\?\\C:\\ca.crt','C:\\ca.crt:stream'])
    await assert.rejects(()=>prepareFinancePoolerLaunchPlan({...c,rootCertPath}),/Local drive/);
  await prepareFinancePoolerLaunchPlan(c);await writeFile(c.psqlPath,'REPLACED-INERT-BYTES');
  await assert.rejects(()=>prepareFinancePoolerLaunchPlan(c),/hash/);
});
test('asynchronous planning snapshots target/options/environment and refuses junction resources',async t=>{
  const c=await setup(t);c.ambientEnv.TEMP='original';const pending=prepareFinancePoolerLaunchPlan(c);
  c.target.host='changed';c.purpose='apply';c.ambientEnv.TEMP='changed';c.rootCertSha256='0'.repeat(64);
  const p=await pending;assert.equal(p.env.TEMP,'original');assert.equal(p.purpose,'rollback-rehearsal');
  assert.notEqual(p.target.host,'changed');
  const link=path.join(path.dirname(c.psqlPath),'linked');
  await symlink(path.dirname(c.psqlPath),link,process.platform==='win32'?'junction':'dir');
  await assert.rejects(()=>prepareFinancePoolerLaunchPlan({...c,target:financeReadOnlyStagingTarget(),
    purpose:'read-only-evidence',rootCertSha256:hash('NOT-A-CERTIFICATE'),rootCertPath:path.join(link,'inert-ca.crt')}),/links/);
});
test('real inert Windows child receives the pinned pooler arguments and exact bytes, never ambient credentials',
  {skip:process.platform!=='win32'},async t=>{
    const c=await setup(t),directory=path.dirname(c.psqlPath);
    const compile=spawnSync(path.join(process.env.SystemRoot,'System32','WindowsPowerShell','v1.0','powershell.exe'),
      ['-NoProfile','-NonInteractive','-File',fileURLToPath(new URL('../tests/fixtures/finance-launch-inert-setup.ps1',import.meta.url)),
        '-Directory',directory],{windowsHide:true,encoding:'utf8',timeout:30000});
    assert.equal(compile.status,0,compile.stderr);
    c.psqlPath=path.join(directory,'launch-inert.exe');c.psqlSha256=hash(await readFile(c.psqlPath));
    c.ambientEnv={...process.env,PGPASSWORD:'SYNTHETIC-PARENT-SECRET',NODE_OPTIONS:'unsafe',SUPABASE_SECRET_KEY:'SYNTHETIC-PARENT-SECRET'};
    const input=Buffer.from('-- INERT ONLY 精武館\r\n');
    for(const purpose of ['rollback-rehearsal','read-only-evidence']){
      const p=await prepareFinancePoolerLaunchPlan({...c,purpose});
      // Only our compiled no-network test binary is dispatched. The production
      // factory is planning-only and supplies no credential or execution gate.
      const r=await runFinanceBoundedProcess({...p,input});
      assert.equal(r.status,0);assert.equal(r.error,null);assert.equal(r.clientClosed,true);
      assert.equal(r.inputWritten,true);assert.equal(r.inputSha256,hash(input));
      assert.match(r.stdout,new RegExp('INPUT='+hash(input)));assert.doesNotMatch(r.stdout,/SYNTHETIC-PARENT-SECRET|NODE_OPTIONS|PGPASSWORD|SUPABASE_SECRET_KEY/);
      for(const arg of p.args)assert.ok(r.stdout.includes('ARG='+arg+'\r\n'));
      for(const [key,value] of Object.entries(p.env).filter(([key])=>key.startsWith('PG')))
        assert.ok(r.stdout.includes('ENV='+key+'='+value+'\r\n'));
    }
  });
