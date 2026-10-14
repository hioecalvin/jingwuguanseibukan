// Child-process bridge used only by the protected PowerShell wrapper. No file,
// credential or network reads. Bounded stdin; no caller-supplied SQL accepted.
import {financeReadOnlyStagingTarget,prepareFinanceStagingInventory} from './finance-staging-baseline.mjs';
import {prepareProtectedFinanceBaseline,verifyFinanceInventoryCapture,verifyProtectedFinanceBaseline} from './finance-baseline-capture.mjs';
import {prepareFinanceBaselinePrerequisites,verifyFinancePrerequisiteCapture} from './finance-baseline-prerequisites.mjs';
import {prepareFinancePoolerCapabilities,verifyFinancePoolerCapabilityCapture} from './finance-pooler-capabilities.mjs';
import {prepareFinanceReleaseCapture,verifyFinanceReleaseCapture} from './finance-release-capture.mjs';
try {
  if(process.argv.length!==2)throw Error('No CLI parameters permitted');
  const chunks=[];let length=0;
  for await(const chunk of process.stdin){
    length+=chunk.length;if(length>4194304)throw Error('Oversized input');chunks.push(chunk);
  }
  const request=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));
  if(!request||typeof request!=='object'||Array.isArray(request)||
    Object.keys(request).some(key=>!['mode','inventoryText','inventoryHash','captureText','captureHash','kind','bindingText','bindingHash'].includes(key)))throw Error('Unknown bridge request');
  let result;
  if(request.mode==='plan-release'||request.mode==='verify-release'){
    const keys=['mode','kind',...(request.kind==='actors'?['bindingText','bindingHash']:[]),
      ...(request.mode==='verify-release'?['captureText','captureHash']:[])];
    if(Object.keys(request).sort().join(',')!==keys.sort().join(','))throw Error('Exact release request required');
    result=request.mode==='plan-release'?prepareFinanceReleaseCapture(request.kind,request.bindingText,request.bindingHash):
      await verifyFinanceReleaseCapture(request.kind,request.captureText,request.captureHash,request.bindingText,request.bindingHash);
  }else if(request.mode==='plan-capabilities'){
    if(Object.keys(request).length!==1)throw Error('Unexpected planning data');
    result=prepareFinancePoolerCapabilities();
  }else if(request.mode==='verify-capabilities'){
    if(Object.keys(request).sort().join(',')!=='captureHash,captureText,mode'||typeof request.captureText!=='string')
      throw Error('Exact capability verification data required');
    result=verifyFinancePoolerCapabilityCapture(Buffer.from(request.captureText,'utf8'),request.captureHash);
  }else if(request.mode==='plan-prerequisites'){
    if(Object.keys(request).length!==1)throw Error('Unexpected planning data');
    result=prepareFinanceBaselinePrerequisites();
  }else if(request.mode==='plan-inventory'){
    if(Object.keys(request).length!==1)throw Error('Unexpected planning data');
    result={...prepareFinanceStagingInventory(financeReadOnlyStagingTarget()),target:financeReadOnlyStagingTarget()};
  }else if(request.mode==='plan-baseline'){
    if(typeof request.inventoryText!=='string')throw Error('Inventory input required');
    result=prepareProtectedFinanceBaseline(Buffer.from(request.inventoryText,'utf8'),request.inventoryHash);
  }else if(['verify-inventory','verify-baseline','verify-prerequisites'].includes(request.mode)){
    if(typeof request.captureText!=='string')throw Error('Capture input required');
    const bytes=Buffer.from(request.captureText,'utf8');
    result=request.mode==='verify-prerequisites'?verifyFinancePrerequisiteCapture(bytes,request.captureHash):
      request.mode==='verify-inventory'?verifyFinanceInventoryCapture(bytes,request.captureHash):verifyProtectedFinanceBaseline(bytes,request.captureHash);
  }else throw Error('Unsupported mode');
  process.stdout.write(JSON.stringify(result));
}catch{
  process.stderr.write('FINANCE_BASELINE_BRIDGE_REJECTED');process.exitCode=1;
}
