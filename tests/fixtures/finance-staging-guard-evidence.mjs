// Synthetic evidence for offline planning only. No real files/credentials/network.
import {createHash} from 'node:crypto';
import {financeReadOnlyStagingTarget,prepareFinanceStagingInventory} from '../../scripts/finance-staging-baseline.mjs';
import {prepareProtectedFinanceBaseline} from '../../scripts/finance-baseline-capture.mjs';
import {releaseEvidenceFixture,pack} from './finance-release-evidence.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
export async function stagingGuardFixture({includeFinanceInventory=false}={}){
  const f=await releaseEvidenceFixture(),target=financeReadOnlyStagingTarget();
  const inventory={schemaVersion:1,kind:'public-finance-inventory',target,clientsExitedCleanly:true,
    querySha256:prepareFinanceStagingInventory(target).querySha256,snapshot:{capturedAt:new Date().toISOString(),
      database:'postgres',sessionUser:'postgres',readOnly:'on',ssl:true,address:'192.0.2.1',port:5432,clusterId:'12345',
      backendPid:100,inventory:[{name:'profiles',kind:'r'},...(includeFinanceInventory?[{name:'membership_payment_confirmations',kind:'r'}]:[])]}};
  const source=JSON.stringify(inventory),plan=prepareProtectedFinanceBaseline(Buffer.from(source),hash(source));
  const baseline=pack({schemaVersion:1,kind:'public-finance-baseline',target,clientsExitedCleanly:true,
    inventory:plan.inventory,inventoryQuerySha256:plan.inventoryQuerySha256,baselineQuerySha256:plan.querySha256,
    sourceInventoryText:source,sourceInventorySha256:hash(source),snapshot:{...plan.inventory,backendPid:101,
      catalogDigest:'a'.repeat(64),tables:plan.inventory.inventory.map(r=>({name:r.name,rowCount:'3',rowDigest:'b'.repeat(64)})),sequences:[]}});
  return {target,nonce:'a'.repeat(32),baseline,releaseEvidence:f.evidence};
}
