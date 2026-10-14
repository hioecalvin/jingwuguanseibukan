// Restricted preparation boundary: private captures -> pinned assembler -> fixed
// protected controller. No caller SQL/adapters, implicit execution or CLI.
// The execution acknowledgement binds a reviewed plan; it is NOT human approval.
import {loadProtectedFinanceEvidence} from './finance-protected-evidence-loader.mjs';
import {prepareFinanceStagingRehearsalBundle} from './finance-staging-rehearsal-bundle.mjs';
import {prepareFinancePoolerRehearsalTarget} from './finance-pooler-rehearsal.mjs';
import {prepareFixedProtectedStagingPoolerRollback} from './finance-fixed-staging-journal.mjs';
const keys=['target','nonce','evidenceFiles','credentialPath','credentialSha256',
  'clientPath','clientSha256','rootCertPath','rootCertSha256'];
const exact=(value,expected)=>value&&typeof value==='object'&&!Array.isArray(value)&&
  Object.keys(value).sort().join(',')===[...expected].sort().join(',');
export async function prepareReviewedFinanceStagingRehearsal(config){
  let plan,controller;
  try{
    if(!exact(config,keys)||typeof config.nonce!=='string'||!/^[a-f0-9]{32}$/.test(config.nonce))throw Error();
    // Copy primitive resources and bind target before any asynchronous file read.
    const target=prepareFinancePoolerRehearsalTarget(config.target).target,nonce=config.nonce;
    const resources={};
    for(const k of ['credential','client','rootCert']){
      const p=config[k+'Path'],h=config[k+'Sha256'];
      if(typeof p!=='string'||!/^[A-Za-z]:\\/.test(p)||p.length>2000||
        /[\x00-\x1f<>"|?*:]/.test(p.slice(3))||typeof h!=='string'||!/^[a-f0-9]{64}$/.test(h))throw Error();
      resources[k+'Path']=p;resources[k+'Sha256']=h;
    }
    // Loader snapshots file paths/hashes synchronously, checks ACLs/integrity and
    // fresh evidence. Neither it nor preparation opens credential/client resources.
    const evidence=await loadProtectedFinanceEvidence(config.evidenceFiles);
    plan=await prepareFinanceStagingRehearsalBundle({target,nonce,...evidence});
    controller=prepareFixedProtectedStagingPoolerRollback({target,nonce,...resources,...evidence,
      bundle:Buffer.from(plan.sql,'utf8'),reviewedBundleSha256:plan.sha256});
  }catch{throw Error('Reviewed staging preparation rejected; no rehearsal dispatched');}
  const receipt=Object.freeze({projectRef:plan.target.projectRef,nonce:plan.nonce,bundleSha256:plan.sha256,
    componentSha256:plan.componentSha256,guardSha256:plan.guardSha256,
    identitySha256:plan.identitySha256,actorQuerySha256:plan.actorQuerySha256});
  return Object.freeze({receipt,preparedOnly:true,readyToExecute:false,requiresLiveApproval:true,
    remoteContact:false,positiveLivePathVerified:false,
    // Only invoke AFTER separate explicit user authorization and final review.
    // Existing controller owns one-attempt consumption, evidence freshness,
    // fixed private journal, protected dispatch and independent reconciliation.
    runApproved:async acknowledgement=>{
      if(!exact(acknowledgement,['projectRef','nonce','bundleSha256','operation'])||
        acknowledgement.operation!=='rollback-contained-059-060-staging-rehearsal'||
        ['projectRef','nonce','bundleSha256'].some(k=>acknowledgement[k]!==receipt[k]))
        throw Error('Exact reviewed staging rehearsal acknowledgement required; not dispatched');
      return controller();
    }});
}
