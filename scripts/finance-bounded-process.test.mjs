import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {runFinanceBoundedProcess} from './finance-bounded-process.mjs';
import {createRollbackAttempt} from './finance-rollback-attempt.mjs';
const input=Buffer.from('-- SYNTHETIC ONLY 精武館\r\nrollback;\n');
const hash=b=>createHash('sha256').update(b).digest('hex');
const config=code=>({executable:process.execPath,args:['-e',code],env:{SystemRoot:process.env.SystemRoot??''},input});

test('real inert child receives exact Unicode/CRLF bytes without inherited application secrets',async()=>{
  const c=config(`const {createHash}=require('node:crypto');const b=[];process.stdin.on('data',x=>b.push(x));
    process.stdin.on('end',()=>{process.stdout.write(JSON.stringify({hash:createHash('sha256').update(Buffer.concat(b)).digest('hex'),
    keys:Object.keys(process.env).filter(x=>x!=='SystemRoot')}));});`);
  process.env.FINANCE_SYNTHETIC_PARENT_ONLY='NOT-A-LIVE-SECRET';
  let r;try{r=await runFinanceBoundedProcess(c);}finally{delete process.env.FINANCE_SYNTHETIC_PARENT_ONLY;}
  assert.equal(r.status,0);assert.equal(r.error,null);
  assert.equal(r.clientClosed,true);assert.equal(r.inputWritten,true);assert.equal(r.inputSha256,hash(input));
  const output=JSON.parse(r.stdout);assert.equal(output.hash,hash(input));
  const osDefaults=process.platform==='win32'?['HOMEDRIVE','HOMEPATH','LOGONSERVER','PATH','SYSTEMDRIVE','TEMP','USERDOMAIN','USERNAME','USERPROFILE','WINDIR']:[];
  assert.ok(output.keys.every(k=>osDefaults.includes(k.toUpperCase())));
});

test('expected nonzero rollback output is returned as evidence, not mistaken for transport failure',async()=>{
  const c=config(`process.stdin.resume();process.stdin.on('end',()=>{process.stderr.write('ERROR:  Z0590: synthetic sentinel\\n');process.exitCode=3;});`);
  const r=await runFinanceBoundedProcess(c);assert.equal(r.status,3);assert.equal(r.error,null);
  assert.equal(r.stderr,'ERROR:  Z0590: synthetic sentinel\n');assert.equal(r.clientClosed,true);
});

test('input bytes and environment are copied before asynchronous child execution',async()=>{
  const c=config(`const b=[];process.stdin.on('data',x=>b.push(x));process.stdin.on('end',()=>process.stdout.write(Buffer.concat(b)));`);
  c.input=Buffer.from(input);const running=runFinanceBoundedProcess(c);c.input.fill(0);c.env.PGPASSWORD='SYNTHETIC-NOT-A-SECRET';
  const r=await running;assert.equal(r.stdout,input.toString('utf8'));assert.equal(r.error,null);
});

test('timeout and output limits close inert children and discard partial private output',async()=>{
  for(const [code,options,expected] of [
    [`process.stdin.resume();setInterval(()=>{},1000);`,{timeoutMs:200},'CLIENT_TIMEOUT'],
    [`process.stdin.resume();process.stdout.write('SYNTHETIC-PRIVATE'.repeat(1000));setInterval(()=>{},1000);`,{maxStdoutBytes:128},'STDOUT_LIMIT'],
    [`process.stdin.resume();process.stderr.write('SYNTHETIC-PRIVATE'.repeat(1000));setInterval(()=>{},1000);`,{maxStderrBytes:128},'STDERR_LIMIT']]){
    const r=await runFinanceBoundedProcess({...config(code),...options});
    assert.equal(r.error,expected);assert.equal(r.clientClosed,true);assert.equal(r.stdout,'');assert.equal(r.stderr,'');
  }
});

test('invalid UTF-8, premature closed stdin and missing executable cannot report success',async()=>{
  let r=await runFinanceBoundedProcess(config(`process.stdin.resume();process.stdin.on('end',()=>process.stdout.write(Buffer.from([255])));`));
  assert.equal(r.error,'INVALID_OUTPUT_ENCODING');assert.equal(r.stdout,'');
  r=await runFinanceBoundedProcess({...config('process.exit(0);'),input:Buffer.alloc(4194304,65)});
  assert.ok(r.error);assert.equal(r.clientClosed,true);
  r=await runFinanceBoundedProcess({...config(''),executable:path.join(path.dirname(process.execPath),'nonexistent-finance-client.exe')});
  assert.equal(r.error,'SPAWN_FAILED');assert.equal(r.stdout,'');assert.equal(r.stderr,'');
});

test('invalid limits, unbounded inputs and malformed executable/env are refused before spawn',()=>{
  for(const change of [{executable:'node'},{input:'text'},{input:Buffer.alloc(0)},
    {input:Buffer.alloc(4194305)},{timeoutMs:0},{timeoutMs:60001},{maxStdoutBytes:1048577},
    {maxStderrBytes:65537},{args:['bad\0arg']},{env:{PGPASSWORD:undefined}}])
    assert.throws(()=>runFinanceBoundedProcess({...config(''),...change}),/configuration/);
});

test('timed-out execution still triggers independent reconciliation and cannot be repeated',async()=>{
  let starts=0,closures=0,baselines=0;
  const run=createRollbackAttempt({nonce:'a'.repeat(32),baseline:{id:1},
    executeOnce:()=>{starts++;return runFinanceBoundedProcess({...config('setInterval(()=>{},1000);'),timeoutMs:100});},
    verifySessionClosed:async()=>{closures++;return false;},captureAfter:async()=>{baselines++;return {id:1};},
    compare:()=>({independentSessions:true,unchanged:true,differences:[]})});
  const r=await run();assert.equal(r.verified,false);assert.equal(r.baselineUnchanged,true);
  assert.equal(closures,1);assert.equal(baselines,1);await assert.rejects(run);assert.equal(starts,1);
});
