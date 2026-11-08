// Synthetic local PostgreSQL only. Never reads env files, backups or live credentials.
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import net from 'node:net';
import {randomUUID,createHash} from 'node:crypto';
import {reviewedMigrationBody,rollbackSentinelSql} from './finance-rehearsal-transaction.mjs';
import {createRollbackAttempt} from './finance-rollback-attempt.mjs';
import {LOCAL_INVENTORY_SQL,buildLocalBaselineSql,verifyLocalBaseline,compareLocalBaselines} from './local-finance-baseline.mjs';
import {testFinanceIndexQueryLocal} from './test-finance-index-query-local.mjs';
import {testFinanceActorQueryLocal} from './test-finance-actor-query-local.mjs';
import {testFinanceBaselineDriftLocal} from './test-finance-baseline-drift-local.mjs';
import {testFinanceSessionWitnessLocal} from './test-finance-session-witness-local.mjs';
import {testFinanceSessionClosureLocal} from './test-finance-session-closure-local.mjs';
import {buildFinanceMutationIdentitySql,buildFinanceSessionClosureSql,verifyFinanceSessionClosure} from './finance-session-closure.mjs';
import {claimFinanceAttempt} from './finance-attempt-journal.mjs';
import {assertFinancePrivateDirectory} from './finance-private-directory.mjs';
import {testFinanceStagingBaselineSqlLocal} from './test-finance-staging-baseline-local.mjs';
import {runFinanceBoundedProcess} from './finance-bounded-process.mjs';
import {testFinancePoolerClosureLocal} from './test-finance-pooler-closure-local.mjs';
import {testFinanceSentinelLocal} from './test-finance-sentinel-local.mjs';
import {testFinanceCapabilitiesLocal} from './test-finance-capabilities-local.mjs';
import {testFinanceStagingGuardLocal} from './test-finance-staging-guard-local.mjs';
import {testFinanceStagingFixtureLocal} from './test-finance-staging-fixture-local.mjs';

if (process.argv[2] !== '--synthetic-local-only' || !process.env.LOCAL_PG_BIN) {
  throw Error('Requires --synthetic-local-only and LOCAL_PG_BIN');
}
const bin = path.resolve(process.env.LOCAL_PG_BIN);
const root = mkdtempSync(path.join(tmpdir(), 'js-fee-test-'));
const data = path.join(root, 'data');
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^PG|^SUPABASE|^DATABASE|^RESEND|^MUX|^SECURITY_TEST|^EMAIL|^PUSH/i.test(key)));
const run = (name, args, input) => {
  const r = spawnSync(path.join(bin, name + (process.platform==='win32'?'.exe':'')), args,
    {env,input,encoding:'utf8',windowsHide:true,timeout:60000,maxBuffer:4000000,
      ...(name === 'pg_ctl' ? {stdio:'ignore'} : {})});
  if(r.status!==0 || r.error) throw Error(`${name} failed: ${r.stderr || r.error?.message}`);
  return (r.stdout || '') + (r.stderr || '');
};
const read = file => readFileSync(file,'utf8');
function definition(file, name) {
  const sql=read(file);
  const pattern=new RegExp(`create or replace function public\\.${name}\\([\\s\\S]*?\\bas\\s+(\\$[a-z_]*\\$)([\\s\\S]*?)\\1\\s*;`,'i');
  const result=sql.match(pattern)?.[0];
  if(!result)throw Error('Required source function not found: '+name);
  return result;
}
const socket=net.createServer();
await new Promise(resolve=>socket.listen(0,'127.0.0.1',resolve));
const port=socket.address().port;
await new Promise(resolve=>socket.close(resolve));
let started=false;
const children = new Set();
try {
  run('initdb',['-D',data,'-U','postgres','--auth-local=trust','--auth-host=trust','--no-locale','--encoding=UTF8']);
  started=true;
  run('pg_ctl',['-D',data,'-l',path.join(root,'postgres.log'),'-o',`-h 127.0.0.1 -p ${port} -c max_connections=10`,'-w','start']);
  const baseSql=[read('tests/sql/059_local_fixture.sql'),
    read('tests/sql/059_captured_auth_helpers_local.sql'),
    'begin;',read('tests/sql/059_auth_helper_assertions.sql'),'rollback;',
    definition('supabase/migrations/007_member_payment_confirmation.sql','submit_membership_payment_confirmation'),
    definition('supabase/migrations/021_harden_payment_completion_and_notifications.sql','record_membership_payment'),
    definition('supabase/migrations/021_harden_payment_completion_and_notifications.sql','review_membership_payment_confirmation'),
    read('supabase/migrations/016_restore_subscription_notification_rpcs.sql'),
    read('supabase/migrations/054_full_payment_only.sql'),
    definition('supabase/migrations/015_live_runtime_function_repairs.sql','apply_membership_fee_adjustment'),
    read('tests/sql/060_legacy_billing_fixture.sql'),
    `revoke all on function public.adjust_current_membership_fee(uuid,numeric,text),
      public.generate_dojo_monthly_subscription_charges(uuid,date), public.system_generate_monthly_subscriptions(date)
      from public,anon,authenticated;
     grant execute on function public.adjust_current_membership_fee(uuid,numeric,text),
      public.generate_dojo_monthly_subscription_charges(uuid,date), public.system_generate_monthly_subscriptions(date)
      to service_role;`].join('\n');
  const sql=[
    read('supabase/migrations/059_advance_subscription_payment_records.sql'),
    read('supabase/migrations/060_selected_month_fee_adjustment.sql'),
    'begin;',read('tests/sql/059_local_assertions.sql'),'rollback;',
    'begin;',read('tests/sql/060_local_assertions.sql'),'rollback;',
    'begin;',read('tests/sql/059_rate_compatibility_fixture.sql'),
    definition('supabase/migrations/030_preserve_subscription_rate_intervals.sql','get_membership_subscription_rate'),
    read('tests/sql/059_rate_compatibility_assertions.sql'),'rollback;',
    'begin;',read('tests/sql/060_legacy_billing_assertions.sql'),'rollback;'].join('\n');
  const fixtureSetup=[read('tests/sql/059_rehearsal_local_schema.sql'),
    read('tests/sql/059_captured_fixture_writers_local.sql'),
    read('tests/sql/059_captured_rls_local.sql'),
    definition('supabase/migrations/037_align_break_states_and_transfer_boundaries.sql','validate_dojo_admin_assignment'),
    `create trigger validate_dojo_admin_assignment_trigger before insert or update on public.dojo_admin_assignments
     for each row execute function public.validate_dojo_admin_assignment();`,
    read('tests/sql/059_rate_compatibility_fixture.sql'),
    definition('supabase/migrations/030_preserve_subscription_rate_intervals.sql','get_membership_subscription_rate'),
    `set local jwg.fixture_context='synthetic-local-only';
     set local jwg.fixture_actors='{"member":"10000000-0000-4000-8000-000000000001","admin":"10000000-0000-4000-8000-000000000002","superAdmin":"10000000-0000-4000-8000-000000000003"}';`].join('\n');
  const fixtureSql=['begin;',fixtureSetup,
    read('tests/sql/059_rehearsal_fixture.sql'),read('tests/sql/059_rehearsal_fixture_assertions.sql'),
    read('tests/sql/059_rehearsal_sequence_negative.sql'),'rollback;',
    `do $$ begin
      assert to_regclass('public.classes') is null,'Fixture schema rollback';
      assert to_regclass('pg_temp.finance_fixture') is null,'Temporary manifest rollback';
      assert (select count(*)=4 from public.profiles),'No actor creation';
      assert (select count(*)=1 from public.class_memberships),'Fixture membership rollback';
      assert (select count(*)=1 from public.dojos),'Fixture dojo rollback';
      assert (select count(*)=1 from public.dojo_admin_assignments),'Fixture assignment rollback';
      assert (select count(*)=0 from public.membership_subscription_charges),'Fixture charge rollback';
      assert (select count(*)=0 from public.membership_payments),'Fixture payment rollback';
      assert (select count(*)=0 from public.membership_payment_confirmations),'Fixture report rollback';
      assert (select count(*)=0 from public.notifications),'Fixture notification rollback';
      assert (select count(*)=0 from public.membership_fee_adjustment_history),'Fixture audit rollback';
    end $$;`].join('\n');
  const psqlArgs=['-X','-w','-h','127.0.0.1','-p',String(port),'-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'];
  await testFinanceSentinelLocal({bin,psqlArgs,env});
  await testFinanceIndexQueryLocal({run,psqlArgs,port});
  testFinanceActorQueryLocal({run,psqlArgs,port});
  console.log(run('psql',psqlArgs,baseSql));
  const query=sql=>run('psql',[...psqlArgs,'-qAt'],sql).trim();
  await testFinanceStagingGuardLocal({bin,psqlArgs,env,query});
  testFinanceCapabilitiesLocal({psqlArgs,query});
  await testFinanceSessionWitnessLocal({bin,psqlArgs,env,query});
  await testFinanceSessionClosureLocal({bin,psqlArgs,env,query});
  await testFinancePoolerClosureLocal({bin,psqlArgs,env,query});
  testFinanceStagingBaselineSqlLocal({query});
  testFinanceBaselineDriftLocal({query});
  query(read('tests/sql/059_captured_ddl_hooks_local.sql'));
  // A real independent LISTEN connection proves queued schema notifications are
  // discarded on rollback. Commit controls prove this observer is functioning.
  const listener=spawn(path.join(bin,'psql'+(process.platform==='win32'?'.exe':'')),
    [...psqlArgs,'-qAt'],{env,windowsHide:true,stdio:['pipe','pipe','pipe']});
  children.add(listener);
  let listenerOutput='';let listenerClosed=false;let listenerFailure=null;
  listener.stdout.on('data',chunk=>{listenerOutput+=chunk;});
  listener.stderr.on('data',chunk=>{listenerOutput+=chunk;});
  listener.on('error',error=>{listenerFailure=error;});
  const listenerTimer=setTimeout(()=>listener.kill(),60000);
  const listenerDone=new Promise(resolve=>listener.once('close',code=>{clearTimeout(listenerTimer);listenerClosed=true;children.delete(listener);resolve(code);}));
  let listenerBarrier=0;
  async function flushListener() {
    const marker=`JWG_LISTENER_${++listenerBarrier}`;
    if(listenerFailure||listenerClosed)throw Error('Local listener unavailable');
    listener.stdin.write(`select 1;\n\\echo ${marker}\n`);
    const deadline=Date.now()+5000;
    while(!listenerOutput.includes(marker)) {
      if(listenerFailure||listenerClosed||Date.now()>deadline)throw Error('Local listener barrier failed');
      await new Promise(resolve=>setTimeout(resolve,20));
    }
    return (listenerOutput.match(/Asynchronous notification "pgrst"/g)||[]).length;
  }
  listener.stdin.write('listen pgrst;\n');
  await flushListener();
  query('begin;create table public.fixture_notify_control(id integer);commit;');
  const afterCommittedCreate=await flushListener();
  if(afterCommittedCreate!==1)throw Error('DDL notification CREATE positive control failed');
  query('begin;drop table public.fixture_notify_control;commit;');
  const afterCommittedDrop=await flushListener();
  if(afterCommittedDrop!==2)throw Error('DDL notification DROP positive control failed');
  // New psql invocation for each capture: no transaction/session is reused.
  // No member records or SQL definitions are printed; hashes/counts only.
  query('create sequence public.fixture_rollback_probe;');
  const capture=()=>{
    const plan=JSON.parse(query(LOCAL_INVENTORY_SQL));
    const snapshot=JSON.parse(query(buildLocalBaselineSql(plan)));
    verifyLocalBaseline(snapshot);
    if(JSON.stringify(plan.inventory)!==JSON.stringify(snapshot.inventory))throw Error('Inventory changed during capture');
    return snapshot;
  };
  const beforeCandidateDDL=capture();
  const nonce=randomUUID().replaceAll('-','');
  const rehearsalSql=[
    `set application_name='jwg-finance-rehearsal-${nonce}';`,
    "begin;set local statement_timeout='15s';set local lock_timeout='3s';set local idle_in_transaction_session_timeout='15s';set local plpgsql.check_asserts=on;",
    `do $$ begin if inet_server_addr() is distinct from '127.0.0.1'::inet then raise exception 'Local only';end if;end $$;`,
    buildFinanceMutationIdentitySql(nonce),
    reviewedMigrationBody('059',read('supabase/migrations/059_advance_subscription_payment_records.sql')),
    reviewedMigrationBody('060',read('supabase/migrations/060_selected_month_fee_adjustment.sql')),
    fixtureSetup,read('tests/sql/059_rehearsal_fixture.sql'),read('tests/sql/059_rehearsal_fixture_assertions.sql'),
    rollbackSentinelSql(nonce)].join('\n');
  // A real private, flushed journal precedes the local mutation. Existing/failed
  // claims stay blocked; this synthetic directory is NOT a remote journal target.
  if(process.platform!=='win32')throw Error('Private Windows journal integration requires Windows');
  const journalDirectory=mkdtempSync(path.join(tmpdir(),'finance-acl-test-'));
  const aclSetup=spawnSync(path.join(process.env.SystemRoot,'System32','WindowsPowerShell','v1.0','powershell.exe'),
    ['-NoProfile','-NonInteractive','-File',path.resolve('tests/fixtures/finance-private-directory-setup.ps1'),'-Directory',journalDirectory],
    {env,windowsHide:true,encoding:'utf8',timeout:10000});
  if(aclSetup.status!==0||aclSetup.error)throw Error('Synthetic private journal setup failed');
  const journalOptions={directory:journalDirectory,assertPrivateDirectory:assertFinancePrivateDirectory,nonce,
    bundleSha256:createHash('sha256').update(rehearsalSql).digest('hex'),mode:'synthetic-local-only'};
  const journal=await claimFinanceAttempt(journalOptions);
  let mutationIdentity=null,clientFinishedAt=null;
  const attempt=createRollbackAttempt({nonce,baseline:beforeCandidateDDL,
    executeOnce:async()=>{
      const result=await runFinanceBoundedProcess({executable:path.join(bin,'psql'+(process.platform==='win32'?'.exe':'')),
        args:[...psqlArgs,'-qAt','-v','VERBOSITY=verbose'],env,input:Buffer.from(rehearsalSql,'utf8'),timeoutMs:60000});
      if(!result.clientClosed||!result.inputWritten||result.inputSha256!==journalOptions.bundleSha256)
        throw Error('Local bounded execution input/closure unverified');
      clientFinishedAt=result.clientFinishedAt;
      try{mutationIdentity=JSON.parse(result.stdout.split(/\r?\n/)[0]);}catch{mutationIdentity=null;}
      return result;
    },
    verifySessionClosed:()=>{
      const options={nonce,clientFinishedAt,localProbe:true};
      const observer=JSON.parse(query(buildFinanceSessionClosureSql(mutationIdentity,options)));
      return verifyFinanceSessionClosure(mutationIdentity,observer,options).sessionClosed;
    },
    captureAfter:()=>{const afterCandidateDDL=capture();return afterCandidateDDL;},
    compare:compareLocalBaselines});
  const attemptResult=await attempt();
  const outcome=await journal.finish(attemptResult);
  if(!attemptResult.verified)throw Error(`Local candidate rehearsal failed: ${attemptResult.failures.join(', ')}`);
  if(outcome.state!=='verified-rollback')throw Error('Local journal outcome not verified');
  let retryBlocked=false;
  try{await claimFinanceAttempt(journalOptions);}catch{retryBlocked=true;}
  if(!retryBlocked)throw Error('Existing journal allowed a second claim');
  console.log('PASS: bounded async rehearsal process sends exact journal-bound bytes; client closes before independent server closure and baseline checks');
  console.log('PASS: owner-only flushed journal precedes local rehearsal; independently verified closure and baseline outcome persist; existing claim blocks reuse');
  console.log('PASS: single-attempt controller confirms mutation session closed and independent reconciliation; automatic retries forbidden');
  if(await flushListener()!==afterCommittedDrop)throw Error('Rolled-back candidate DDL leaked a schema notification');
  query("begin;notify pgrst,'local-final-positive-control';commit;");
  if(await flushListener()!==afterCommittedDrop+1)throw Error('Final notification positive control failed');
  listener.stdin.end('unlisten *;\n');
  if(await listenerDone!==0)throw Error('Local listener did not close cleanly');
  console.log('PASS: captured DDL hooks notify on committed CREATE/DROP; combined migration rollback sends no schema notification; final positive control received');
  console.log('PASS: 059 then 060 DDL and payment fixture roll back together; exact sentinel and independent catalog/data/sequence baselines verified');
  console.log(run('psql',psqlArgs,sql));
  const beforeFixture=capture();
  console.log(run('psql',psqlArgs,fixtureSql));
  const afterFixture=capture();
  const comparison=compareLocalBaselines(beforeFixture,afterFixture);
  if(!comparison.unchanged)throw Error(`Local fixture residue: ${comparison.differences.join(', ')}`);
  console.log('PASS: independent read-only sessions verify identical public table hashes, catalog/ACLs, and sequence state');
  testFinanceStagingFixtureLocal({psqlArgs,query,capture,fixtureSetup});
  // LOCAL NEGATIVE CONTROL ONLY. Never reset the sequence to manufacture a pass.
  query("begin;select nextval('public.fixture_rollback_probe');rollback;");
  const afterSequenceProbe=capture();
  const negative=compareLocalBaselines(afterFixture,afterSequenceProbe);
  if(negative.unchanged||JSON.stringify(negative.differences)!=='["sequences"]')throw Error('Sequence residue negative control failed');
  console.log('PASS: independent capture rejects surviving sequence changes after transaction rollback');
  function startSession(sql,keepOpen=false) {
    const child=spawn(path.join(bin,'psql'+(process.platform==='win32'?'.exe':'')),psqlArgs,
      {env,windowsHide:true,stdio:['pipe','pipe','pipe']});
    children.add(child);
    let output='';
    child.stdout.on('data',chunk=>{output+=chunk;});
    child.stderr.on('data',chunk=>{output+=chunk;});
    const timer=setTimeout(()=>child.kill(),15000);
    const done=new Promise((resolve,reject)=>{
      child.once('error',reject);
      child.once('close',code=>{clearTimeout(timer);children.delete(child);resolve({code,output});});
    });
    if(keepOpen)child.stdin.write(sql);else child.stdin.end(sql);
    return {child,done};
  }
  async function until(sql,expected) {
    const deadline=Date.now()+5000;
    while(Date.now()<deadline){
      if(query(sql)===String(expected))return;
      await new Promise(resolve=>setTimeout(resolve,25));
    }
    throw Error('Synthetic concurrency barrier was not reached');
  }
  async function race(label,actor,body) {
    // Both sessions prepare their state before a real lock barrier is released.
    const blocker=startSession('select pg_advisory_lock(90059001);\n',true);
    await until("select count(*) from pg_locks where locktype='advisory' and objid=90059001 and granted;",1);
    const script=`begin; set local statement_timeout='8s'; set local lock_timeout='6s';
      set local role authenticated;
      select set_config('request.jwt.claim.sub','${actor}',true);
      do $race$ declare q jsonb; g uuid; m date:=date_trunc('month',now() at time zone 'Asia/Jakarta')::date;
      begin ${body} end $race$; commit;`;
    const first=startSession(script);const second=startSession(script);
    await until("select count(*) from pg_locks where locktype='advisory' and objid=90059001 and not granted;",2);
    blocker.child.stdin.end('select pg_advisory_unlock(90059001);\n');
    const released=await blocker.done;
    const results=await Promise.all([first.done,second.done]);
    if(released.code!==0 || results.filter(r=>r.code===0).length!==1
      || !results.some(r=>r.code!==0&&/already paid|awaiting receipt confirmation|already been reviewed/.test(r.output))) {
      throw Error(`Unexpected ${label} race results: ${JSON.stringify(results)}`);
    }
    console.log(`PASS: concurrent ${label} commits exactly once, losing request rejected`);
  }
  const membership="'30000000-0000-4000-8000-000000000001'";
  await race('direct receipt','10000000-0000-4000-8000-000000000002',`
    q:=public.quote_advance_subscription_payment(${membership},m,2);
    perform pg_advisory_xact_lock(90059001);
    perform public.record_advance_subscription_payment(${membership},m,2,q,600000,(now() at time zone 'Asia/Jakarta')::date,'Cash',null,null);`);
  await race('member report','10000000-0000-4000-8000-000000000001',`
    m:=(m+interval '2 months')::date;
    q:=public.quote_advance_subscription_payment(${membership},m,2);
    perform pg_advisory_xact_lock(90059001);
    perform public.submit_advance_subscription_payment(${membership},m,2,q,600000,(now() at time zone 'Asia/Jakarta')::date,'Transfer',null);`);
  await race('group receipt confirmation','10000000-0000-4000-8000-000000000002',`
    g:=(public.get_pending_advance_payment_groups('20000000-0000-4000-8000-000000000001')->0->>'payment_group_id')::uuid;
    if g is null then raise exception 'Synthetic group missing'; end if;
    perform pg_advisory_xact_lock(90059001);
    perform public.review_advance_subscription_payment(g,'approved',null);`);
  query(`do $$ begin
    assert (select count(*)=4 and sum(amount)=1200000 from public.membership_payments);
    assert (select count(*)=4 from public.membership_subscription_charges where status='paid');
    assert (select count(*)=2 from public.membership_payment_confirmations where status='approved');
    assert (select count(*)=2 from public.notifications where notification_type='membership_payment_confirmation_pending');
  end $$;`);

  // Force BOTH winner orderings using a real uncommitted row/advisory lock.
  // Unlike a duplicate-request barrier, the competing operations are different:
  // changing a fee must not coexist with reporting or receiving its old amount.
  let caseNumber=0;
  for(const newFee of [0,250000])for(const paymentKind of ['report','receipt'])for(const adjustmentFirst of [true,false]) {
    caseNumber++;
    const chargeId=`50000000-0000-4000-8000-${String(caseNumber).padStart(12,'0')}`;
    const month=`(date_trunc('month',now() at time zone 'Asia/Jakarta')+interval '${caseNumber+4} months')::date`;
    query(`insert into public.membership_subscription_charges
      (id,membership_id,dojo_id,class_id,billing_month,amount,currency,rate_source)
      values ('${chargeId}',${membership},'20000000-0000-4000-8000-000000000001',
        '40000000-0000-4000-8000-000000000001',${month},300000,'IDR','dojo_default');`);
    const quoted=query(`begin;
      do $$ begin perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);end $$;
      select public.quote_advance_subscription_payment(${membership},${month},1);rollback;`);
    // The quote is produced only by the synthetic local database, never input.
    const quoteLiteral=`'${JSON.stringify(JSON.parse(quoted)).replaceAll("'","''")}'::jsonb`;
    const adjustment={actor:'10000000-0000-4000-8000-000000000002',
      sql:`perform public.adjust_unpaid_subscription_charge('${chargeId}',300000,${newFee},'Synthetic race adjustment');`};
    const payment={actor:paymentKind==='report'?'10000000-0000-4000-8000-000000000001':'10000000-0000-4000-8000-000000000002',
      sql:paymentKind==='report'
        ?`perform public.submit_advance_subscription_payment(${membership},${month},1,${quoteLiteral},300000,(now() at time zone 'Asia/Jakarta')::date,'Transfer',null);`
        :`perform public.record_advance_subscription_payment(${membership},${month},1,${quoteLiteral},300000,(now() at time zone 'Asia/Jakarta')::date,'Cash',null,null);`};
    const first=adjustmentFirst?adjustment:payment;
    const second=adjustmentFirst?payment:adjustment;
    const sessionSql=(operation,name)=>`begin;set local statement_timeout='8s';set local lock_timeout='6s';
      set local application_name='${name}';set local role authenticated;
      do $$ begin perform set_config('request.jwt.claim.sub','${operation.actor}',true);${operation.sql}end $$;\n`;
    const winnerName=`fee_winner_${caseNumber}`,loserName=`fee_loser_${caseNumber}`;
    const winner=startSession(sessionSql(first,winnerName),true);
    await until(`select count(*) from pg_stat_activity where application_name='${winnerName}' and state='idle in transaction';`,1);
    const loser=startSession(sessionSql(second,loserName)+'commit;');
    await until(`select count(*) from pg_stat_activity where application_name='${loserName}' and wait_event_type='Lock';`,1);
    winner.child.stdin.end('commit;\n');
    const results=await Promise.all([winner.done,loser.done]);
    if(results[0].code!==0 || results[1].code===0 || !/already paid or closed|Only unpaid bills|review a fresh quote/i.test(results[1].output)) {
      throw Error(`Unexpected fee ${newFee}/${paymentKind} ordering ${adjustmentFirst}: ${JSON.stringify(results)}`);
    }
    query(`do $$ begin
      assert (select amount=${adjustmentFirst?newFee:300000} and status='${adjustmentFirst?(newFee===0?'waived':'unpaid'):paymentKind==='receipt'?'paid':'unpaid'}'
        from public.membership_subscription_charges where id='${chargeId}');
      assert (select count(*)=${adjustmentFirst?1:0} from public.membership_fee_adjustment_history where charge_id='${chargeId}');
      assert not exists (select 1 from public.membership_fee_adjustment_history where charge_id='${chargeId}'
        and (old_amount<>300000 or new_amount<>${newFee} or changed_by<>'10000000-0000-4000-8000-000000000002'));
      assert (select count(*)=${!adjustmentFirst&&paymentKind==='receipt'?1:0} from public.membership_payments where charge_id='${chargeId}');
      assert (select count(*)=${!adjustmentFirst&&paymentKind==='report'?1:0} from public.membership_payment_confirmations where charge_id='${chargeId}');
      assert (select count(*)=${adjustmentFirst?1:0} from public.notifications where notification_type='subscription_fee_adjusted'
        and metadata->>'charge_id'='${chargeId}');
    end $$;`);
    console.log(`PASS: ${newFee===0?'waiver':'reprice'} versus ${paymentKind}, ${adjustmentFirst?'adjustment':'payment'} wins; loser rejected with exact bill/payment/history state`);
  }
} finally {
  for(const child of children)child.kill();
  if(started)run('pg_ctl',['-D',data,'-m','fast','-w','stop']);
  console.log(JSON.stringify({syntheticCluster:root,stopped:started,sourceBackupsRead:false,remoteContact:false}));
}
