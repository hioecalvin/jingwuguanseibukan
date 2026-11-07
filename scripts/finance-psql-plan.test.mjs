import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm,symlink} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {buildFinanceReadOnlyPsqlPlan} from './finance-psql-plan.mjs';
import {FINANCE_STAGING_REF} from './finance-rehearsal-target.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
async function options(t) {
  const root=await mkdtemp(path.join(tmpdir(),'finance-psql-plan-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  // Intentionally inert byte fixtures: no real executable, CA or credentials.
  const psqlPath=path.join(root,'fake-client');const rootCertPath=path.join(root,'fake-ca');
  await writeFile(psqlPath,'inert client');await writeFile(rootCertPath,'inert certificate');
  return {target:{projectRef:FINANCE_STAGING_REF,host:`db.${FINANCE_STAGING_REF}.supabase.co`,
    port:5432,user:'postgres',database:'postgres',sslmode:'verify-full'},
    psqlPath,rootCertPath,psqlSha256:hash('inert client'),rootCertSha256:hash('inert certificate'),ambientEnv:{}};
}
test('read-only launch plan pins target/resources and cannot execute or load credentials',async t=>{
  const config=await options(t);const plan=await buildFinanceReadOnlyPsqlPlan(config);
  assert.equal(plan.readyToExecute,false);assert.equal(plan.credentialLoaded,false);
  assert.equal(plan.shell,false);assert.equal(plan.env.PGSSLMODE,'verify-full');
  assert.equal(plan.env.PGGSSENCMODE,'disable');assert.equal(plan.env.PGSSLROOTCERT,config.rootCertPath);
  assert.match(plan.env.PGOPTIONS,/default_transaction_read_only=on/);
  assert.ok(plan.args.includes('-X'));assert.ok(plan.args.includes('-w'));
  assert.ok(Object.isFrozen(plan.args)&&Object.isFrozen(plan.env));
});
test('ambient PostgreSQL, proxy, startup and application secrets are never inherited',async t=>{
  const config=await options(t);
  config.ambientEnv={PGHOST:'other',PGHOSTADDR:'127.0.0.1',PGDATABASE:'other',PGPASSWORD:'secret-token',
    PGSSLMODE:'disable',PGSERVICE:'production',PGPASSFILE:'private',PGOPTIONS:'unsafe',
    PGSERVICEFILE:'private',HTTPS_PROXY:'proxy',NODE_OPTIONS:'unsafe',SUPABASE_SECRET_KEY:'secret-token',
    PATH:'untrusted-bin',PSModulePath:'untrusted-modules',SystemRoot:'C:\\Windows',TEMP:'C:\\Temp'};
  const plan=await buildFinanceReadOnlyPsqlPlan(config);
  assert.equal(plan.env.PGPASSWORD,'');assert.equal(plan.env.PGSSLMODE,'verify-full');
  assert.equal(plan.env.SystemRoot,'C:\\Windows');assert.equal(plan.env.TEMP,'C:\\Temp');
  for(const k of ['PGHOST','PGHOSTADDR','PGDATABASE','PGSERVICE','PGPASSFILE','PGSERVICEFILE',
    'HTTPS_PROXY','NODE_OPTIONS','SUPABASE_SECRET_KEY','PATH','PSModulePath'])assert.ok(!Object.hasOwn(plan.env,k));
  assert.ok(!JSON.stringify(plan).includes('secret-token'));
});
test('wrong target or unreviewed client/certificate bytes fail before planning',async t=>{
  const config=await options(t);
  for(const change of [{target:{...config.target,host:'other'}},{psqlSha256:'0'.repeat(64)},
    {rootCertSha256:'0'.repeat(64)},{psqlPath:'relative'},{rootCertPath:'relative'}])
    await assert.rejects(()=>buildFinanceReadOnlyPsqlPlan({...config,...change}));
});
test('connection resources cannot traverse a junction or symbolic link',async t=>{
  const config=await options(t);const link=path.join(path.dirname(config.psqlPath),'linked');
  await symlink(path.dirname(config.psqlPath),link,process.platform==='win32'?'junction':'dir');
  await assert.rejects(()=>buildFinanceReadOnlyPsqlPlan({...config,rootCertPath:path.join(link,'fake-ca')}),/links/);
});
