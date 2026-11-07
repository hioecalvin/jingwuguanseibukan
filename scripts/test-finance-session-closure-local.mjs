// Existing disposable loopback cluster only. No credentials or remote adapter.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import path from 'node:path';
import {buildFinanceMutationIdentitySql,buildFinanceSessionClosureSql,verifyFinanceSessionClosure} from './finance-session-closure.mjs';
export async function testFinanceSessionClosureLocal({bin,psqlArgs,env,query}){
  if(psqlArgs[psqlArgs.indexOf('-h')+1]!=='127.0.0.1')throw Error('Synthetic loopback only');
  const nonce=randomBytes(16).toString('hex');
  const child=spawn(path.join(bin,process.platform==='win32'?'psql.exe':'psql'),[...psqlArgs,'-qAt'],
    {env,windowsHide:true,stdio:['pipe','pipe','pipe']});
  let output='',failed=false,resolveIdentity,rejectIdentity;
  const first=new Promise((resolve,reject)=>{resolveIdentity=resolve;rejectIdentity=reject;});
  child.stdout.on('data',chunk=>{
    output+=chunk;
    if(output.length>65536){failed=true;child.kill();rejectIdentity(Error('Bounded identity output exceeded'));return;}
    if(output.includes('\n')){try{resolveIdentity(JSON.parse(output.split('\n')[0]));}catch{rejectIdentity(Error('Invalid identity JSON'));}}
  });
  child.stderr.on('data',()=>{failed=true;rejectIdentity(Error('Local identity client error'));});
  child.on('error',()=>{failed=true;rejectIdentity(Error('Local identity startup error'));});
  child.stdin.on('error',()=>{failed=true;rejectIdentity(Error('Local identity pipe error'));});
  const closed=new Promise(resolve=>child.once('close',code=>{rejectIdentity(Error('Client closed before identity'));resolve(code);}));
  const timer=setTimeout(()=>{failed=true;child.kill();rejectIdentity(Error('Local identity timeout'));},20000);
  try{
    child.stdin.write("begin;set local timezone='UTC';set local idle_in_transaction_session_timeout='15s';\n"+buildFinanceMutationIdentitySql(nonce)+'\n');
    const identity=await first;
    const sql=buildFinanceSessionClosureSql(identity,{nonce,localProbe:true});
    const live=JSON.parse(query(sql));
    assert.ok(live.remaining.some(row=>row.pid===identity.backendPid));
    assert.throws(()=>verifyFinanceSessionClosure(identity,live,{nonce,localProbe:true,clientFinishedAt:identity.capturedAt}),/still present/);
    child.stdin.end('rollback;\n');assert.equal(await closed,0);assert.equal(failed,false);
    const clientFinishedAt=new Date().toISOString();
    const observer=JSON.parse(query(sql));
    assert.equal(verifyFinanceSessionClosure(identity,observer,{nonce,clientFinishedAt,localProbe:true}).sessionClosed,true);
    console.log('PASS: actual local closure observer rejects still-open transaction and verifies distinct-backend absence only after client completion');
  }finally{clearTimeout(timer);if(child.exitCode===null)child.kill();await closed;}
}
