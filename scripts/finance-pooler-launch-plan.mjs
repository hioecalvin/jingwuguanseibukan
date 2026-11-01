// Offline resource/environment planning only. Does not load passwords, claim the
// journal, spawn a process or authorize a live connection. Resource hashes must
// be checked again immediately before eventual protected dispatch (TOCTOU).
import path from 'node:path';
import {verifyFinancePinnedResource} from './finance-psql-plan.mjs';
import {prepareFinancePoolerRehearsalTarget} from './finance-pooler-rehearsal.mjs';

export async function prepareFinancePoolerLaunchPlan(config){
  const keys=['target','purpose','psqlPath','psqlSha256','rootCertPath','rootCertSha256','ambientEnv'];
  if(!config||Object.keys(config).length!==keys.length||keys.some(k=>!Object.hasOwn(config,k)))
    throw Error('Exact pooler launch resource configuration required');
  // Snapshot config before the first asynchronous file check.
  const {purpose,psqlPath,psqlSha256,rootCertPath,rootCertSha256,ambientEnv}=config;
  const target=prepareFinancePoolerRehearsalTarget(config.target).target;
  if(!['rollback-rehearsal','read-only-evidence'].includes(purpose))throw Error('Explicit launch purpose required');
  if(!ambientEnv||typeof ambientEnv!=='object'||Array.isArray(ambientEnv))throw Error('Environment object required');
  const env={};
  for(const key of ['SystemRoot','WINDIR','TEMP','TMP']){
    const matches=Object.keys(ambientEnv).filter(k=>k.toLowerCase()===key.toLowerCase());
    if(matches.length>1)throw Error('Ambiguous Windows environment key');
    if(matches.length){
      const value=ambientEnv[matches[0]];
      if(typeof value!=='string'||value.includes('\0'))throw Error('Invalid OS environment value');
      env[key]=value;
    }
  }
  if(typeof psqlPath!=='string'||path.extname(psqlPath).toLowerCase()!=='.exe')
    throw Error('Pinned Windows executable required');
  const executable=await verifyFinancePinnedResource(psqlPath,psqlSha256);
  const certificate=await verifyFinancePinnedResource(rootCertPath,rootCertSha256);
  const readOnly=purpose==='read-only-evidence';
  Object.assign(env,{PGSSLMODE:'verify-full',PGSSLROOTCERT:certificate,PGGSSENCMODE:'disable',
    PGCONNECT_TIMEOUT:'8',PGCLIENTENCODING:'UTF8',
    PGAPPNAME:readOnly?'jwg-finance-pooler-evidence':'jwg-finance-pooler-rehearsal',
    PGOPTIONS:`-c default_transaction_read_only=${readOnly?'on':'off'} -c statement_timeout=15000 -c lock_timeout=3000 -c idle_in_transaction_session_timeout=15000`});
  return Object.freeze({kind:'offline-pooler-launch-plan',purpose,target,executable,
    resources:Object.freeze({psqlSha256,rootCertSha256,rootCertPath:certificate}),
    args:Object.freeze(['-X','-w','-qAt','-v','ON_ERROR_STOP=1','-v',readOnly?'VERBOSITY=terse':'VERBOSITY=verbose',
      '-h',target.host,'-p',String(target.port),'-U',target.user,'-d',target.database]),
    env:Object.freeze(env),timeoutMs:30000,maxStdoutBytes:1048576,maxStderrBytes:65536,
    shell:false,windowsHide:true,credentialLoaded:false,credentialRequired:true,
    requiresResourceRevalidation:true,readyToExecute:false,remoteContact:false,applicationApproval:false});
}
