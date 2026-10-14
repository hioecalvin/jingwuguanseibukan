// Internal process primitive, NOT a staging executor or authorization gate.
// The protected caller must pin the executable/CA, target, environment, credential
// and reviewed SQL. No shell, inherited application environment, retries or logging.
// Node/Windows may supply standard OS environment entries to a child process;
// this primitive does not replace the protected launcher's environment validation.
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';

export function runFinanceBoundedProcess({executable,args,env,input,timeoutMs=30000,
  maxStdoutBytes=1048576,maxStderrBytes=65536}){
  if(typeof executable!=='string'||!path.isAbsolute(executable)||executable.includes('\0')||
    !Array.isArray(args)||args.some(x=>typeof x!=='string'||x.includes('\0'))||
    !env||typeof env!=='object'||Array.isArray(env)||
    Object.entries(env).some(([k,v])=>!k||k.includes('=')||k.includes('\0')||typeof v!=='string'||v.includes('\0'))||
    !Buffer.isBuffer(input)||!input.length||input.length>4194304||
    !Number.isInteger(timeoutMs)||timeoutMs<50||timeoutMs>60000||
    !Number.isInteger(maxStdoutBytes)||maxStdoutBytes<1||maxStdoutBytes>1048576||
    !Number.isInteger(maxStderrBytes)||maxStderrBytes<1||maxStderrBytes>65536)
    throw Error('Invalid bounded process configuration');
  const bytes=Buffer.from(input),childEnv={...env},childArgs=[...args];
  const inputSha256=createHash('sha256').update(bytes).digest('hex');
  return new Promise(resolve=>{
    let child,timeout,closeTimeout,settled=false,inputWritten=false,failureCode=null;
    const channels={stdout:{chunks:[],length:0,limit:maxStdoutBytes},stderr:{chunks:[],length:0,limit:maxStderrBytes}};
    const finish=(status,clientClosed)=>{
      if(settled)return;settled=true;clearTimeout(timeout);clearTimeout(closeTimeout);
      let stdout='',stderr='';
      if(!failureCode&&!inputWritten)failureCode='INPUT_NOT_CONFIRMED';
      if(!failureCode){
        try{
          const decoder=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true});
          stdout=decoder.decode(Buffer.concat(channels.stdout.chunks));
          stderr=decoder.decode(Buffer.concat(channels.stderr.chunks));
        }catch{failureCode='INVALID_OUTPUT_ENCODING';stdout='';stderr='';}
      }
      // Never log raw child errors; successful bounded output is internal evidence
      // for the caller, not a user-facing report. Failures discard partial output.
      resolve({status,stdout,stderr,error:failureCode,clientClosed,inputWritten,inputSha256,
        clientFinishedAt:new Date().toISOString()});
    };
    const stop=code=>{
      if(settled||failureCode)return;failureCode=code;
      try{child?.kill();}catch{ /* Closure remains unverified until close event. */ }
      closeTimeout=setTimeout(()=>{
        child?.stdin.destroy();child?.stdout.destroy();child?.stderr.destroy();child?.unref();
        finish(null,false);
      },5000);
    };
    try{
      child=spawn(executable,childArgs,{env:childEnv,shell:false,windowsHide:true,stdio:['pipe','pipe','pipe']});
    }catch{failureCode='SPAWN_FAILED';finish(null,false);return;}
    // Remove the parent copy of any explicitly supplied credentials after spawn.
    for(const key of Object.keys(childEnv))delete childEnv[key];
    for(const name of ['stdout','stderr']){
      child[name].on('data',chunk=>{
        if(failureCode||settled)return;
        const c=channels[name];c.length+=chunk.length;
        if(c.length>c.limit){stop(name==='stdout'?'STDOUT_LIMIT':'STDERR_LIMIT');return;}
        c.chunks.push(Buffer.from(chunk));
      });
      child[name].on('error',()=>stop('OUTPUT_PIPE_FAILED'));
    }
    child.on('error',()=>stop('SPAWN_FAILED'));
    child.on('close',(code,signal)=>{
      if(signal&&!failureCode)failureCode='CLIENT_SIGNALLED';
      finish(code,true);
    });
    child.stdin.on('error',()=>stop('INPUT_PIPE_FAILED'));
    timeout=setTimeout(()=>stop('CLIENT_TIMEOUT'),timeoutMs);
    child.stdin.end(bytes,error=>{
      if(error){stop('INPUT_PIPE_FAILED');return;}
      inputWritten=true;
    });
  });
}
