import test from 'node:test';
import assert from 'node:assert/strict';
import {INDEX_REVIEW_TABLES,validateIndexCatalog} from './finance-index-capture.mjs';
function fixture() {
  return {database:'postgres',readOnly:'on',expectedTableCount:10,
    ledgerVersions:Array.from({length:53},(_,i)=>String(i+6).padStart(3,'0')),
    tables:INDEX_REVIEW_TABLES.map(name=>({name,kind:'r',owner:'postgres',partition:false,rls:true,forceRls:false})),
    indexes:INDEX_REVIEW_TABLES.map(table=>({table,name:table+'_pkey',definition:'CREATE UNIQUE INDEX fixture',
      valid:true,ready:true,live:true,unique:true,predicate:null,expressions:null})),
    dependencyFunctions:[{schema:'public',name:'fixture_helper',arguments:'',language:'plpgsql',
      owner:'postgres',securityDefiner:false,settings:null,definition:'synthetic private definition'}]};
}
test('valid catalog yields sanitized counts but never live acceptance or execution readiness',()=>{
  const result=validateIndexCatalog(fixture());
  assert.equal(result.tableCount,10);assert.equal(result.indexCount,10);
  assert.equal(result.readyToExecute,false);assert.equal(result.transitiveReviewComplete,false);
  assert.equal(result.liveAcceptance,false);
  assert.ok(!JSON.stringify(result).includes('synthetic private definition'));
});
test('read-write, wrong database and unexpected ledger fail closed',()=>{
  for(const change of [c=>c.readOnly='off',c=>c.database='other',c=>c.ledgerVersions.pop(),
    c=>c.ledgerVersions.push('059'),c=>c.ledgerVersions.reverse()]) {
    const c=fixture();change(c);assert.throws(()=>validateIndexCatalog(c));
  }
});
test('missing, duplicate, partitioned or unsupported relations cannot pass',()=>{
  for(const change of [c=>c.tables.pop(),c=>c.tables[0]=c.tables[1],c=>c.tables[0].partition=true,
    c=>c.tables[0].kind='f',c=>c.tables[0].owner='other',c=>delete c.tables[0].rls]) {
    const c=fixture();change(c);assert.throws(()=>validateIndexCatalog(c));
  }
});
test('index gaps and invalid or duplicate index metadata cannot pass',()=>{
  for(const change of [c=>c.indexes.pop(),c=>c.indexes.push(c.indexes[0]),c=>c.indexes[0].valid=false,
    c=>c.indexes[0].ready=false,c=>c.indexes[0].live=false,c=>c.indexes[0].table='unrelated',
    c=>c.indexes[0].definition='',c=>delete c.indexes[0].predicate]) {
    const c=fixture();change(c);assert.throws(()=>validateIndexCatalog(c));
  }
});
test('missing or duplicate function bodies cannot be treated as complete evidence',()=>{
  for(const change of [c=>c.dependencyFunctions[0].definition=null,
    c=>c.dependencyFunctions.push(c.dependencyFunctions[0]),c=>delete c.dependencyFunctions[0].securityDefiner]) {
    const c=fixture();change(c);assert.throws(()=>validateIndexCatalog(c));
  }
});
test('local metadata probe is distinct from a saved staging catalog',()=>{
  const c=fixture();c.database='finance_catalog_probe';
  assert.throws(()=>validateIndexCatalog(c));
  const result=validateIndexCatalog(c,{localProbe:true});
  assert.equal(result.scope,'synthetic-local-only');assert.equal(result.liveAcceptance,false);
  assert.throws(()=>validateIndexCatalog(fixture(),{localProbe:true}));
});
