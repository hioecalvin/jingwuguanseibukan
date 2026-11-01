// Offline only: private ACLs are enforced by the PowerShell capture boundary.
// A JSON receipt is integrity evidence, not independent remote authentication.
import {createHash} from 'node:crypto';
import {buildFinanceSessionWitnessSql,verifyFinanceSessionWitness} from './finance-session-witness.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function verifyFinanceSessionWitnessCapture(bytes,receiptHash,{nowMs=Date.now(),localProbe=false}={}) {
  if(localProbe||!Buffer.isBuffer(bytes)||bytes.length>262144||typeof receiptHash!=='string'||
    !/^[a-f0-9]{64}$/.test(receiptHash)||hash(bytes)!==receiptHash)throw Error('Witness capture integrity mismatch');
  let capture;
  try {capture=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
  catch {throw Error('Invalid witness capture JSON');}
  const expected={schemaVersion:1,kind:'session-witness',projectRef:'eomubndonbetszdbhsrj',
    transport:'session-pooler',host:'aws-0-ap-southeast-2.pooler.supabase.com',port:5432,
    connectionUser:'postgres.eomubndonbetszdbhsrj',sslmode:'verify-full',clientsExitedCleanly:true};
  if(!capture||Object.entries(expected).some(([key,value])=>capture[key]!==value))throw Error('Witness capture target mismatch');
  const result=verifyFinanceSessionWitness(capture.primary,capture.observer,{nonce:capture.nonce,nowMs});
  if(capture.primaryQuerySha256!==hash(buildFinanceSessionWitnessSql(capture.nonce))||
    capture.observerQuerySha256!==hash(buildFinanceSessionWitnessSql(capture.nonce,capture.primary.backendPid)))
    throw Error('Witness query mismatch');
  return {...result,captureIntegrityVerified:true,captureSha256:receiptHash,
    remoteProvenanceIndependentlyVerified:false,serverClosureIndependentlyVerified:false};
}
