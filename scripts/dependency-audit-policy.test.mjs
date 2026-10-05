import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { ADVISORY, APPROVED_AT, EXPIRES_AT, evaluateAudit, parseAuditRun } from './dependency-audit-policy.mjs';
const now = Date.parse(APPROVED_AT) + 1000;
function fixture() {
  const versions = { 'eslint-config-next':'16.3.8', '@next/eslint-plugin-next':'16.3.8', 'fast-glob':'3.3.1', micromatch:'4.0.8', braces:'3.0.3' };
  const names = Object.keys(versions);
  const vulnerabilities = Object.fromEntries(names.map((name, i) => [name, {
    name, severity:'high', nodes:[`node_modules/${name}`],
    via:i < names.length - 1 ? [names[i+1]] : [{name:'braces',dependency:'braces',severity:'high',url:ADVISORY}],
  }]));
  const report = {auditReportVersion:2,vulnerabilities,metadata:{vulnerabilities:{info:0,low:0,moderate:0,high:5,critical:0,total:5}}};
  const lock = {lockfileVersion:3,packages:Object.fromEntries(names.map(name=>[`node_modules/${name}`,{dev:true,version:versions[name]}]))};
  return {report,lock};
}
test('exact development advisory and propagated chain accepted only within fourteen days',()=>{
  const {report,lock}=fixture();
  assert.equal(Date.parse(EXPIRES_AT)-Date.parse(APPROVED_AT),14*24*60*60*1000);
  assert.equal(evaluateAudit(report,lock,now).excepted.length,5);
  for(const time of [Date.parse(APPROVED_AT)-1,Date.parse(EXPIRES_AT),Date.parse(EXPIRES_AT)+1]) {
    assert.equal(evaluateAudit(report,lock,time).ready,false);
  }
});
for(const change of ['advisory','additional-advisory','production','unknown-dev','version','nested-copy','critical','cycle','unknown-package']) {
  test(`fails closed for ${change}`,()=>{
    const {report,lock}=fixture();
    const b=report.vulnerabilities.braces;
    if(change==='advisory') b.via[0].url='https://github.com/advisories/GHSA-other';
    if(change==='additional-advisory') b.via.push({...b.via[0],url:'https://github.com/advisories/GHSA-other'});
    if(change==='production') lock.packages['node_modules/braces'].dev=false;
    if(change==='unknown-dev') delete lock.packages['node_modules/braces'].dev;
    if(change==='version') lock.packages['node_modules/braces'].version='3.0.4';
    if(change==='nested-copy') b.nodes.push('node_modules/other/node_modules/braces');
    if(change==='critical') {b.severity='critical';report.metadata.vulnerabilities.high--;report.metadata.vulnerabilities.critical++;}
    if(change==='cycle') report.vulnerabilities.micromatch.via=['fast-glob'];
    if(change==='unknown-package') {
      report.vulnerabilities.other={name:'other',severity:'high',nodes:['node_modules/other'],via:['braces']};
      report.metadata.vulnerabilities.high++;report.metadata.vulnerabilities.total++;
    }
    assert.equal(evaluateAudit(report,lock,now).ready,false);
  });
}
test('clean report remains successful after exception expiry',()=>{
  const {report,lock}=fixture();report.vulnerabilities={};
  for(const k of Object.keys(report.metadata.vulnerabilities)) report.metadata.vulnerabilities[k]=0;
  assert.equal(evaluateAudit(report,lock,Date.parse(EXPIRES_AT)+1).ready,true);
});
test('malformed reports, incomplete totals and failed network/process audits cannot pass',()=>{
  const {report,lock}=fixture();
  for(const bad of [{}, {...report,error:{code:'ENETUNREACH'}}, {...report,auditReportVersion:1}, {...report,vulnerabilities:{}}, {...report,metadata:{}}]) {
    assert.throws(()=>evaluateAudit(bad,lock,now));
  }
  assert.throws(()=>evaluateAudit(report,lock,NaN));
  assert.throws(()=>evaluateAudit(report,{packages:{}},now));
  for(const run of [{status:2,stdout:'{}'},{status:null,signal:'SIGTERM'},{status:0,stdout:'not json'},{status:1,stdout:'{"error":{}}'},{status:0,error:Error('timeout')}]) {
    assert.throws(()=>parseAuditRun(run));
  }
  assert.deepEqual(parseAuditRun({status:1,stdout:JSON.stringify(report)}),report);
});
test('CI preserves strict production and uploader audits with no continue-on-error',()=>{
  const workflow=readFileSync(new URL('../.github/workflows/browser-smoke.yml',import.meta.url),'utf8');
  assert.match(workflow,/run: npm run audit:dependencies/);
  assert.match(workflow,/run: npm audit --omit=dev --audit-level=high/);
  assert.match(workflow,/working-directory: desktop\/js-video-uploader\s+run: npm audit --audit-level=high/);
  assert.doesNotMatch(workflow,/continue-on-error/);
});
