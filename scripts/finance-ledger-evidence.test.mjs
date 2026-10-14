import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {verifyFinanceLedgerSnapshot,compareFinanceLedgerSnapshots} from './finance-ledger-evidence.mjs';
const nowMs=Date.parse('2026-10-11T05:00:00Z');
const options={nowMs};
async function fixture() {
  const root=new URL('../supabase/migrations/',import.meta.url);
  const files=(await readdir(root)).filter(file=>/^\d{3}_.+\.sql$/.test(file)&&file.slice(0,3)<='058').sort();
  return {database:'postgres',sessionUser:'postgres',readOnly:'on',backendPid:123,
    capturedAt:new Date(nowMs-1000).toISOString(),ledgerCatalogDigest:'a'.repeat(64),
    ledger:await Promise.all(files.map(async file=>({version:file.slice(0,3),name:file.slice(4,-4),
      statements:[await readFile(new URL(file,root),'utf8')]})))};
}
test('complete ledger validates against all 53 repository migration bodies without exposing SQL',async()=>{
  const report=await verifyFinanceLedgerSnapshot(await fixture(),options);
  assert.equal(report.migrationCount,53);assert.equal(report.exactRepositoryContents,true);
  assert.equal(report.readyForWriteRehearsal,false);assert.ok(!JSON.stringify(report).includes('create table'));
});
test('missing, duplicate and future ledger versions are rejected',async()=>{
  for(const kind of ['missing','duplicate','future']) {
    const data=await fixture();
    if(kind==='missing')data.ledger.pop();
    if(kind==='duplicate')data.ledger[1]=data.ledger[0];
    if(kind==='future')data.ledger.push({version:'059',name:'unexpected',statements:['select 1']});
    await assert.rejects(verifyFinanceLedgerSnapshot(data,options));
  }
});
test('changed names, comments, SQL and empty bodies cannot pass version-only checks',async()=>{
  for(const kind of ['name','comment','sql','empty']) {
    const data=await fixture();
    if(kind==='name')data.ledger[0].name+='x';
    if(kind==='comment')data.ledger[0].statements[0]+='\n-- changed';
    if(kind==='sql')data.ledger[0].statements=['select 1'];
    if(kind==='empty')data.ledger[0].statements=[];
    await assert.rejects(verifyFinanceLedgerSnapshot(data,options));
  }
});
test('expired, future, non-read-only and incomplete captures are rejected',async()=>{
  for(const change of [{capturedAt:new Date(nowMs-300001).toISOString()},
    {capturedAt:new Date(nowMs+30001).toISOString()},{capturedAt:'bad'},
    {readOnly:'off'},{database:'other'},{sessionUser:'authenticated'},
    {backendPid:0},{ledgerCatalogDigest:null}]) {
    await assert.rejects(verifyFinanceLedgerSnapshot({...await fixture(),...change},options));
  }
});
test('independent equal ledger captures pass without granting write authority',async()=>{
  const a=await fixture(),b={...structuredClone(a),backendPid:124,capturedAt:new Date(nowMs).toISOString()};
  const result=await compareFinanceLedgerSnapshots(a,b,options);
  assert.equal(result.unchanged,true);assert.equal(result.applicationApproval,false);
  await assert.rejects(compareFinanceLedgerSnapshots(a,a,options),/Independent/);
  await assert.rejects(compareFinanceLedgerSnapshots(b,a,options),/ordering/);
});
test('ledger catalog or exact statement-storage drift cannot be hidden by matching versions',async()=>{
  const a=await fixture(),b={...structuredClone(a),backendPid:124};
  b.ledgerCatalogDigest='b'.repeat(64);
  assert.deepEqual((await compareFinanceLedgerSnapshots(a,b,options)).differences,['ledgerCatalogDigest']);
  b.ledgerCatalogDigest=a.ledgerCatalogDigest;
  b.ledger[0].statements[0]='\n'+b.ledger[0].statements[0];
  assert.deepEqual((await compareFinanceLedgerSnapshots(a,b,options)).differences,['ledgerSha256']);
});
test('synthetic local captures are explicit and cannot be mistaken for staging review',async()=>{
  const data={...await fixture(),database:'finance_catalog_probe'};
  await assert.rejects(verifyFinanceLedgerSnapshot(data,options));
  const result=await verifyFinanceLedgerSnapshot(data,{...options,localProbe:true});
  assert.equal(result.scope,'synthetic-local-ledger');assert.equal(result.remoteContact,false);
});
