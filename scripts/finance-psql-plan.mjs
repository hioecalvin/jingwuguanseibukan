// Offline launch planning ONLY. No child process, connection or secret is created.
// Scope is read-only preflight; not an adapter for applying/rehearsing migrations.
import {readFile,lstat,realpath} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {validateFinanceRehearsalTarget} from './finance-rehearsal-target.mjs';
export async function verifyFinancePinnedResource(file,expectedHash) {
  if(typeof file!=='string'||!path.isAbsolute(file)||! /^[0-9a-f]{64}$/.test(expectedHash??''))
    throw Error('Absolute pinned connection resource required');
  // Reject network/device paths and NTFS alternate streams before filesystem I/O.
  // Reading a UNC resource could authenticate to another host during preparation.
  if(process.platform==='win32'&&(!/^[A-Za-z]:[\\/]/.test(file)||file.slice(3).includes(':')))
    throw Error('Local drive connection resource required');
  const full=path.resolve(file);
  for(let current=full;;current=path.dirname(current)) {
    const info=await lstat(current);
    if(info.isSymbolicLink()||(current===full?!info.isFile():!info.isDirectory()))
      throw Error('Connection resources cannot traverse links');
    if(path.dirname(current)===current)break;
  }
  if(path.normalize(await realpath(full)).toLowerCase()!==path.normalize(full).toLowerCase())
    throw Error('Connection resource path mismatch');
  const bytes=await readFile(full);
  if(createHash('sha256').update(bytes).digest('hex')!==expectedHash)throw Error('Connection resource hash mismatch');
  return full;
}
export async function buildFinanceReadOnlyPsqlPlan({target,psqlPath,psqlSha256,rootCertPath,rootCertSha256,
  ambientEnv=process.env}) {
  const bound=validateFinanceRehearsalTarget(target);
  const executable=await verifyFinancePinnedResource(psqlPath,psqlSha256);
  const certificate=await verifyFinancePinnedResource(rootCertPath,rootCertSha256);
  // Explicit allowlist, not a blacklist. No PG*, NODE_OPTIONS, proxy settings,
  // PATH, profiles, service files, application tokens or credentials inherited.
  const env={};
  for(const key of ['SystemRoot','WINDIR','TEMP','TMP']) {
    const actual=Object.keys(ambientEnv).find(k=>k.toLowerCase()===key.toLowerCase());
    if(actual&&typeof ambientEnv[actual]==='string')env[key]=ambientEnv[actual];
  }
  Object.assign(env,{PGSSLMODE:'verify-full',PGSSLROOTCERT:certificate,
    PGGSSENCMODE:'disable',PGCONNECT_TIMEOUT:'8',PGPASSWORD:'',
    PGAPPNAME:'jwg-finance-readonly-preflight',PGCLIENTENCODING:'UTF8',
    PGOPTIONS:'-c default_transaction_read_only=on -c statement_timeout=15000 -c lock_timeout=3000 -c idle_in_transaction_session_timeout=15000'});
  return Object.freeze({kind:'offline-read-only-psql-plan',executable,
    args:Object.freeze(['-X','-w','-qAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=terse',
      '-h',bound.host,'-p',String(bound.port),'-U',bound.user,'-d',bound.database]),
    env:Object.freeze(env),timeoutMs:30000,maxBuffer:4*1024*1024,
    windowsHide:true,shell:false,credentialLoaded:false,remoteContact:false,
    readyToExecute:false});
}
