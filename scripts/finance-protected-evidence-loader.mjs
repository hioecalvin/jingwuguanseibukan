// Local read-only IPC. Private buffers are returned only to the internal factory;
// do not log them. ACLs/hashes establish file integrity, NOT remote provenance.
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runFinanceBoundedProcess} from './finance-bounded-process.mjs';
import {verifyProtectedFinanceBaseline} from './finance-baseline-capture.mjs';
import {prepareFinancePoolerReleaseEvidence} from './finance-pooler-release-evidence.mjs';
const kinds=['baseline','ledger','actors','capabilities','bindings'];
const hash=b=>createHash('sha256').update(b).digest('hex');
const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&
  Object.keys(value).sort().join(',')===[...keys].sort().join(',');
export async function loadProtectedFinanceEvidence(config){
  try{
    if(!exact(config,['directory','hashes'])||!exact(config.hashes,kinds)||
      typeof config.directory!=='string'||!/^[A-Za-z]:\\/.test(config.directory)||
      /[\x00-\x1f<>"|?*:]/.test(config.directory.slice(3))||config.directory.length>2000||
      kinds.some(k=>typeof config.hashes[k]!=='string'||!/^[a-f0-9]{64}$/.test(config.hashes[k])))throw Error();
    const directory=config.directory,hashes={...config.hashes},windowsRoot=process.env.SystemRoot;
    if(process.platform!=='win32'||typeof windowsRoot!=='string'||!path.isAbsolute(windowsRoot))throw Error();
    const executable=path.join(windowsRoot,'System32','WindowsPowerShell','v1.0','powershell.exe');
    const env={SystemRoot:windowsRoot,WINDIR:windowsRoot,TEMP:process.env.TEMP??'',TMP:process.env.TMP??''};
    const captures={};
    for(const kind of kinds){
      const input=Buffer.from(JSON.stringify({directory,kind,sha256:hashes[kind]}));
      const result=await runFinanceBoundedProcess({executable,args:['-NoLogo','-NoProfile','-NonInteractive','-File',
        fileURLToPath(new URL('./finance-protected-evidence-read.ps1',import.meta.url))],env,input,
        timeoutMs:15000,maxStdoutBytes:1048576,maxStderrBytes:2048});
      if(result.error||result.status!==0||result.clientClosed!==true||result.inputWritten!==true||result.stderr!==''||
        result.inputSha256!==hash(input))throw Error();
      const receipt=JSON.parse(result.stdout),limit=kind==='bindings'?8192:kind==='capabilities'?65536:700000;
      if(!exact(receipt,['kind','sha256','base64'])||receipt.kind!==kind||receipt.sha256!==hashes[kind]||
        typeof receipt.base64!=='string'||receipt.base64.length>4*Math.ceil(limit/3))throw Error();
      const bytes=Buffer.from(receipt.base64,'base64');
      if(!bytes.length||bytes.length>limit||bytes.toString('base64')!==receipt.base64||hash(bytes)!==hashes[kind])throw Error();
      const decoded=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);
      if(decoded.startsWith('\ufeff')||decoded.includes('\0'))throw Error();
      JSON.parse(decoded);
      captures[kind]={bytes,hash:hashes[kind]};
    }
    const baseline=captures.baseline;
    verifyProtectedFinanceBaseline(baseline.bytes,baseline.hash);
    const releaseEvidence={ledger:captures.ledger,actors:captures.actors,capabilities:captures.capabilities,
      bindingBytes:captures.bindings.bytes};
    await prepareFinancePoolerReleaseEvidence(releaseEvidence).validateBefore(JSON.parse(baseline.bytes).snapshot);
    return {baseline,releaseEvidence};
  }catch{throw Error('Protected finance evidence rejected; no rehearsal prepared');}
}
