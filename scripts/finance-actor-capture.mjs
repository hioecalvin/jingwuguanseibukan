// Offline only. Caller verifies private file ACLs and supplies the receipt hash.
// JSON/hash consistency cannot independently authenticate remote provenance.
import {createHash} from 'node:crypto';
import {verifyFinanceActorSnapshot} from './finance-actor-evidence.mjs';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export function verifyFinanceActorCapture(captureBytes,receiptHash,bindingBytes,options={}) {
  if(!Buffer.isBuffer(captureBytes)||captureBytes.length>4194304||!Buffer.isBuffer(bindingBytes)||
    bindingBytes.length>8192||typeof receiptHash!=='string'||!/^[a-f0-9]{64}$/.test(receiptHash)||digest(captureBytes)!==receiptHash)
    throw Error('Actor capture integrity mismatch');
  let capture,binding;
  try {
    const decoder=new TextDecoder('utf-8',{fatal:true});
    capture=JSON.parse(decoder.decode(captureBytes));binding=JSON.parse(decoder.decode(bindingBytes));
  } catch {throw Error('Invalid actor evidence JSON');}
  const expected={schemaVersion:1,kind:'actors',projectRef:'eomubndonbetszdbhsrj',transport:'session-pooler',
    host:'aws-0-ap-southeast-2.pooler.supabase.com',port:5432,connectionUser:'postgres.eomubndonbetszdbhsrj',
    sslmode:'verify-full',querySha256:'723e23d15bfcdff8127a39f15550154c4b68e03fc9c30e83fbb231677ae04d80',bindingSha256:digest(bindingBytes)};
  if(!capture||Object.entries(expected).some(([key,value])=>capture[key]!==value)||
    binding?.schemaVersion!==1||binding.projectRef!==expected.projectRef||options.localProbe)
    throw Error('Actor capture target or binding mismatch');
  const result=verifyFinanceActorSnapshot(capture.snapshot,binding.bindings,{nowMs:options.nowMs});
  return {...result,captureSha256:receiptHash,bindingSha256:expected.bindingSha256,
    captureIntegrityVerified:true,remoteProvenanceIndependentlyVerified:false};
}
