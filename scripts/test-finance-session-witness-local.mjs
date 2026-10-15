// Called only inside the existing synthetic loopback cluster harness.
import {spawn} from 'node:child_process';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {buildFinanceSessionWitnessSql,verifyFinanceSessionWitness} from './finance-session-witness.mjs';
export async function testFinanceSessionWitnessLocal({bin,psqlArgs,env,query}) {
  const host=psqlArgs[psqlArgs.indexOf('-h')+1];
  if(host!=='127.0.0.1')throw Error('Synthetic loopback only');
  const nonce=randomBytes(16).toString('hex');
  const child=spawn(path.join(bin,process.platform==='win32'?'psql.exe':'psql'),[...psqlArgs,'-qAt'],
    {env,windowsHide:true,stdio:['pipe','pipe','pipe']});
  let output='',failure=false,settled=false,release;
  const first=new Promise((resolve,reject)=>{
    release=reject;
    child.stdout.on('data',chunk=>{
      output+=chunk;
      if(output.length>65536){failure=true;child.kill();reject(Error('Witness output bound exceeded'));return;}
      if(!settled&&output.includes('\n')){
        settled=true;try{resolve(JSON.parse(output.split('\n')[0]));}catch{reject(Error('Invalid local witness'));}
      }
    });
    child.stderr.on('data',()=>{failure=true;reject(Error('Local witness client error'));});
    child.once('error',()=>{failure=true;reject(Error('Local witness start failed'));});
  });
  const closed=new Promise(resolve=>child.once('close',code=>{
    if(!settled)release(Error('Local witness closed before capture'));resolve(code);
  }));
  child.stdin.on('error',()=>{failure=true;release(Error('Local witness input failed'));});
  const timer=setTimeout(()=>{failure=true;child.kill();release(Error('Local witness deadline'));},20000);
  try{
    child.stdin.write(buildFinanceSessionWitnessSql(nonce));
    const primary=await first;
    const observer=JSON.parse(query(buildFinanceSessionWitnessSql(nonce,primary.backendPid)));
    const result=verifyFinanceSessionWitness(primary,observer,{nonce,localProbe:true});
    if(!result.distinctBackends)throw Error('Missing distinct backend proof');
    child.stdin.end('rollback;\n');
    if(await closed!==0||failure)throw Error('Local witness closure failed');
    const count=query(`begin read only;select count(*) from pg_stat_activity where application_name='jwg-finance-witness-${nonce}' and xact_start is not null;rollback;`);
    if(count!=='0')throw Error('Witness transaction remains active');
    console.log('PASS: simultaneous READ ONLY sessions prove distinct backend PIDs and matching live transaction identity; primary closed cleanly (local only)');
  }finally{
    clearTimeout(timer);
    if(child.exitCode===null)child.kill();
    await closed;
  }
}
