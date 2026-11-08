// Offline structural/content verification, never a login or remote identity proof.
// Bindings must come from independently verified dedicated test identities; never
// construct them from this capture just to make a comparison pass.
const roles=Object.freeze({member:'0101',admin:'0002',superAdmin:'0001'});
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value)&&value!=='00000000-0000-0000-0000-000000000000';
const hash=value=>typeof value==='string'&&/^[0-9a-f]{64}$/.test(value);
const count=value=>Number.isSafeInteger(value)&&value>=0;
export function verifyFinanceActorSnapshot(snapshot,bindings,{nowMs=Date.now(),localProbe=false}={}) {
  if(!bindings||Object.keys(bindings).sort().join(',')!=='admin,member,superAdmin'||
    !Object.values(bindings).every(uuid)||new Set(Object.values(bindings)).size!==3)
    throw Error('Three independently bound actor UUIDs required');
  const captured=Date.parse(snapshot?.capturedAt);
  if(!Number.isFinite(nowMs)||!Number.isFinite(captured)||captured>nowMs+30000||nowMs-captured>300000)
    throw Error('Fresh actor capture required');
  if(snapshot.database!==(localProbe?'finance_actor_probe':'postgres')||
    snapshot.sessionUser!=='postgres'||snapshot.readOnly!=='on'||
    (!localProbe&&snapshot.ssl!==true)||!Number.isInteger(snapshot.backendPid)||snapshot.backendPid<1||
    !Array.isArray(snapshot.actors)||snapshot.actors.length!==3)
    throw Error('Incomplete read-only actor evidence');
  for(const [role,jsId] of Object.entries(roles)) {
    const matches=snapshot.actors.filter(row=>row?.jsId===jsId);
    if(matches.length!==1)throw Error('Missing or duplicate test account');
    const row=matches[0];
    if(row.id!==bindings[role]||row.accountStatus!=='active'||row.deceased!==false||
      row.superAdmin!==(role==='superAdmin')||!count(row.activeAssignments)||!count(row.eligibleMemberships)||
      !['profileDigest','membershipsDigest','assignmentsDigest'].every(key=>hash(row[key])))
      throw Error('Actor identity or eligibility mismatch');
    if((role==='member'&&(row.activeAssignments!==0||row.eligibleMemberships<1))||
      (role==='admin'&&(row.activeAssignments<1||row.eligibleMemberships<1)))
      throw Error('Unexpected Member or Admin scope');
  }
  return {scope:localProbe?'synthetic-local-actors':'offline-actor-content-review',actorCount:3,
    identitiesMatchBindings:true,eligibleProfiles:true,remoteContact:false,
    authLoginVerified:false,liveRoleSecurityVerified:false,readyForWriteRehearsal:false};
}
export function compareFinanceActorSnapshots(before,after,bindings,options) {
  const result=verifyFinanceActorSnapshot(before,bindings,options);
  verifyFinanceActorSnapshot(after,bindings,options);
  if(before.backendPid===after.backendPid)throw Error('Independent actor sessions required');
  if(Date.parse(after.capturedAt)<Date.parse(before.capturedAt))throw Error('Capture ordering invalid');
  const changedRoles=[];
  for(const [role,jsId] of Object.entries(roles)) {
    const a=before.actors.find(row=>row.jsId===jsId),b=after.actors.find(row=>row.jsId===jsId);
    if(['profileDigest','membershipsDigest','assignmentsDigest','activeAssignments','eligibleMemberships']
      .some(key=>a[key]!==b[key]))changedRoles.push(role);
  }
  return {...result,independentSessions:true,unchanged:changedRoles.length===0,changedRoles};
}
