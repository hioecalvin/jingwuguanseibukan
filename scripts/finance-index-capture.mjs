// OFFLINE structural validation only. No network, SQL execution or approval.
export const INDEX_REVIEW_TABLES=Object.freeze([
  'classes','dojos','class_memberships','dojo_admin_assignments','dojo_subscription_settings',
  'membership_subscription_charges','membership_payment_confirmations','membership_payments',
  'membership_fee_adjustment_history','notifications',
]);
export function validateIndexCatalog(capture,{localProbe=false}={}) {
  if(capture?.database!==(localProbe?'finance_catalog_probe':'postgres')||capture.readOnly!=='on')
    throw Error('Expected database and server read-only transaction');
  const versions=Array.from({length:53},(_,i)=>String(i+6).padStart(3,'0'));
  if(JSON.stringify(capture.ledgerVersions)!==JSON.stringify(versions))throw Error('Expected exact ledger versions 006–058');
  if(capture.expectedTableCount!==10||!Array.isArray(capture.tables)||
    JSON.stringify(capture.tables.map(t=>t.name).sort())!==JSON.stringify([...INDEX_REVIEW_TABLES].sort()))
    throw Error('Incomplete or duplicate table inventory');
  for(const table of capture.tables) {
    if(table.kind!=='r'||table.partition!==false||table.owner!=='postgres'||
      typeof table.rls!=='boolean'||typeof table.forceRls!=='boolean')throw Error('Unsupported relation metadata');
  }
  if(!Array.isArray(capture.indexes)||!Array.isArray(capture.dependencyFunctions))throw Error('Missing metadata arrays');
  const names=new Set();
  for(const index of capture.indexes) {
    if(!INDEX_REVIEW_TABLES.includes(index.table)||typeof index.name!=='string'||!index.name||names.has(index.name)||
      typeof index.definition!=='string'||!index.definition.trim()||index.valid!==true||index.ready!==true||
      index.live!==true||typeof index.unique!=='boolean'||
      ![index.predicate,index.expressions].every(v=>v===null||typeof v==='string'))throw Error('Incomplete or unsafe index metadata');
    names.add(index.name);
  }
  // Each captured table has a primary key; no indexes for a table is incomplete.
  for(const table of INDEX_REVIEW_TABLES)if(!capture.indexes.some(i=>i.table===table))throw Error('Missing table indexes');
  const routines=new Set();
  for(const routine of capture.dependencyFunctions) {
    for(const key of ['schema','name','arguments','language','owner','definition'])
      if(typeof routine[key]!=='string'||(key!=='arguments'&&!routine[key].trim()))throw Error('Incomplete dependency function');
    const key=JSON.stringify([routine.schema,routine.name,routine.arguments]);
    if(routines.has(key)||typeof routine.securityDefiner!=='boolean'||
      !(routine.settings===null||Array.isArray(routine.settings)))throw Error('Invalid dependency function metadata');
    routines.add(key);
  }
  return {kind:'offline-index-catalog-structure',scope:localProbe?'synthetic-local-only':'unbound-saved-catalog',
    tableCount:capture.tables.length,indexCount:capture.indexes.length,dependencyFunctionCount:routines.size,
    expressionIndexCount:capture.indexes.filter(i=>i.expressions!==null).length,
    partialIndexCount:capture.indexes.filter(i=>i.predicate!==null).length,
    readyToExecute:false,transitiveReviewComplete:false,liveAcceptance:false};
}
