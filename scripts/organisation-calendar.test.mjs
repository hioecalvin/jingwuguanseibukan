import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
const {outputFiles}=await build({entryPoints:['lib/organisation-calendar.ts'],bundle:true,write:false,platform:'node',format:'cjs'});
const compiled={exports:{}};new Function('module','exports',outputFiles[0].text)(compiled,compiled.exports);
const {organisationAnniversaries,calendarPeriods,entriesForPeriod}=compiled.exports;
test('both annual JS dates recur without an expiry and retain their original dates',()=>{
 for(const year of [2026,2027,2050,2100]){
  const dates=organisationAnniversaries(year);
  assert.deepEqual(dates.map(d=>d.original_date),['2009-07-10','2021-11-11']);
  assert.deepEqual(dates.map(d=>d.starts_at.slice(0,10)),[`${year}-07-10`,`${year}-11-11`]);
  assert.equal(new Set(dates.map(d=>d.id)).size,2);
 }
 assert.equal(organisationAnniversaries(2008).length,0);
});
test('calendar periods handle year rollovers and short months',()=>{
 const periods=calendarPeriods('2026-11-17');
 assert.deepEqual(periods.map(p=>[p.start,p.end]),[['2026-01-01','2027-01-01'],['2026-12-01','2027-01-01'],['2026-11-17','2027-02-17'],['2026-11-17','2027-05-17'],['2027-01-01','2028-01-01']]);
 assert.equal(calendarPeriods('2026-11-30')[2].end,'2027-02-28');
});
test('periods show same-year past anniversaries, upcoming windows and only one occurrence per date',()=>{
 assert.equal(entriesForPeriod([],'2026-01-01','2027-01-01').length,2);
 assert.equal(entriesForPeriod([],'2026-11-17','2027-02-17').length,0);
 assert.equal(entriesForPeriod([],'2027-01-01','2028-01-01').length,2);
 assert.equal(entriesForPeriod([],'2027-07-10','2027-07-11')[0].title,'JS Birthday');
});
