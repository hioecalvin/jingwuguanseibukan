// Internal protected transport adapters. Preparation does not dispatch anything.
// The fixed controller factory must own the journal and approved SQL; no retries.
import {createHash} from 'node:crypto';
import {readFile,lstat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runFinanceBoundedProcess} from './finance-bounded-process.mjs';
import {assertFinancePrivateDirectory} from './finance-private-directory.mjs';
import {prepareFinancePoolerRehearsalTarget} from './finance-pooler-rehearsal.mjs';
import {verifyProtectedFinanceBaseline,prepareProtectedFinanceBaseline} from './finance-baseline-capture.mjs';
import {financeReleaseEvidenceQuery} from './finance-pooler-release-evidence.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
export function prepareFinanceProtectedPoolerAdapters(config){
  const keys=['target','directory','nonce','bundleSha256','baseline','credentialPath','credentialSha256',
    'clientPath','clientSha256','rootCertPath','rootCertSha256'];
  if(!config||Object.keys(config).length!==keys.length||keys.some(k=>!Object.hasOwn(config,k)))throw Error('Exact protected adapter configuration required');
  const c={...config},target=prepareFinancePoolerRehearsalTarget(c.target).target;
  for(const key of ['directory','credentialPath','clientPath','rootCertPath'])
    if(typeof c[key]!=='string'||! /^[A-Za-z]:\\/.test(c[key])||c[key].slice(3).includes(':'))throw Error('Local absolute protected path required');
  for(const key of ['bundleSha256','credentialSha256','clientSha256','rootCertSha256'])
    if(!/^[a-f0-9]{64}$/.test(c[key]??''))throw Error('Pinned digest required');
  if(!/^[a-f0-9]{32}$/.test(c.nonce??'')||!Buffer.isBuffer(c.baseline?.bytes))throw Error('Bound attempt/baseline required');
  const beforeBytes=Buffer.from(c.baseline.bytes),beforeHash=c.baseline.hash;
  verifyProtectedFinanceBaseline(beforeBytes,beforeHash);
  const before=JSON.parse(beforeBytes),sourceBytes=Buffer.from(before.sourceInventoryText);
  const used=new Set();
  const windowsRoot=process.env.SystemRoot;
  if(process.platform!=='win32'||typeof windowsRoot!=='string'||!path.isAbsolute(windowsRoot))throw Error('Windows protected transport required');
  const executable=path.join(windowsRoot,'System32','WindowsPowerShell','v1.0','powershell.exe');
  const env={SystemRoot:windowsRoot,WINDIR:windowsRoot,TEMP:process.env.TEMP??'',TMP:process.env.TMP??''};
  async function dispatch(phase,sql,inputSha256){
    if(used.has(phase))throw Error('Protected phase already consumed');used.add(phase);
    if(typeof sql!=='string'||Buffer.byteLength(sql)>2097152||hash(sql)!==inputSha256)throw Error('Exact bounded SQL required');
    if(!assertFinancePrivateDirectory(c.directory))throw Error('Private attempt directory required');
    const request={directory:c.directory,nonce:c.nonce,bundleSha256:c.bundleSha256,phase,
      credentialPath:c.credentialPath,credentialSha256:c.credentialSha256,clientPath:c.clientPath,clientSha256:c.clientSha256,
      rootCertPath:c.rootCertPath,rootCertSha256:c.rootCertSha256,inputBase64:Buffer.from(sql).toString('base64'),inputSha256};
    const result=await runFinanceBoundedProcess({executable,args:['-NoLogo','-NoProfile','-NonInteractive','-File',
      fileURLToPath(new URL('./finance-protected-pooler-bridge.ps1',import.meta.url))],env,
      input:Buffer.from(JSON.stringify(request)),timeoutMs:50000,maxStdoutBytes:2048,maxStderrBytes:2048});
    if(result.error||result.status!==0||!result.clientClosed||!result.inputWritten||result.stderr)throw Error('Protected bridge failed; preserve evidence');
    const receipt=JSON.parse(result.stdout);
    if(receipt.phase!==phase||!/^[a-f0-9]{64}$/.test(receipt.captureSha256??''))throw Error('Invalid private receipt');
    if(!assertFinancePrivateDirectory(c.directory))throw Error('Private directory changed');
    const file=path.join(c.directory,`pooler-${phase}-capture.json`),info=await lstat(file);
    if(!info.isFile()||info.isSymbolicLink()||info.size>4194304)throw Error('Invalid private evidence file');
    const bytes=await readFile(file);
    if(hash(bytes)!==receipt.captureSha256)throw Error('Private evidence receipt mismatch');
    const capture=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
    if(capture.schemaVersion!==1||capture.nonce!==c.nonce||capture.phase!==phase||capture.inputSha256!==inputSha256||
      capture.result?.inputSha256!==inputSha256)throw Error('Private evidence binding mismatch');
    return capture.result;
  }
  function readOnlyResult(result){
    if(result.error||result.status!==0||result.clientClosed!==true||result.inputWritten!==true||result.stderr!==''||
      typeof result.stdout!=='string')throw Error('Read-only client did not complete cleanly');
    return JSON.parse(result.stdout);
  }
  return Object.freeze({
    captureLedgerAfter:async()=>{
      const plan=financeReleaseEvidenceQuery('ledger');
      return readOnlyResult(await dispatch('ledger',plan.sql,plan.querySha256));
    },
    captureActorsAfter:async()=>{
      const plan=financeReleaseEvidenceQuery('actors');
      return readOnlyResult(await dispatch('actors',plan.sql,plan.querySha256));
    },
    executeOnce:async payload=>{
      prepareFinancePoolerRehearsalTarget(payload.target);
      if(payload.nonce!==c.nonce||payload.bundleSha256!==c.bundleSha256)throw Error('Mutation payload identity mismatch');
      return dispatch('mutation',payload.sql,c.bundleSha256);
    },
    observeClosure:async request=>{
      prepareFinancePoolerRehearsalTarget(request.target);
      const result=await dispatch('closure',request.sql,request.querySha256);
      return {clientClosed:true,querySha256:request.querySha256,snapshot:readOnlyResult(result)};
    },
    captureAfter:async()=>{
      const plan=prepareProtectedFinanceBaseline(sourceBytes,before.sourceInventorySha256);
      const result=await dispatch('baseline',plan.sql,plan.querySha256);
      const envelope={schemaVersion:1,kind:'public-finance-baseline',target,clientsExitedCleanly:true,
        inventory:plan.inventory,inventoryQuerySha256:plan.inventoryQuerySha256,baselineQuerySha256:plan.querySha256,
        sourceInventoryText:before.sourceInventoryText,sourceInventorySha256:before.sourceInventorySha256,
        snapshot:readOnlyResult(result)};
      const bytes=Buffer.from(JSON.stringify(envelope));
      verifyProtectedFinanceBaseline(bytes,hash(bytes));return {bytes,hash:hash(bytes)};
    },
  });
}
