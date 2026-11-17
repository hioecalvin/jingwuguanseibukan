import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
const {outputFiles}=await build({entryPoints:['lib/rank-duration.ts'],bundle:true,write:false,platform:'node',format:'cjs'});
const compiled={exports:{}};
new Function('module','exports',outputFiles[0].text)(compiled,compiled.exports);
const {daysAtRank,rankCalendarDate}=compiled.exports;
test('rank duration starts at zero and follows calendar dates across month/year/leap boundaries',()=>{
 assert.equal(daysAtRank('2026-11-15','2026-11-15'),0);
 assert.equal(daysAtRank('2026-11-15','2026-11-17'),2);
 assert.equal(daysAtRank('2026-12-31','2027-01-01'),1);
 assert.equal(daysAtRank('2024-02-28','2024-03-01'),2);
});
test('unknown, invalid and future dates never invent time at rank',()=>{
 for(const date of [null,'','X','2026','2026-02-30','2026-13-01','2026-11-18']) assert.equal(daysAtRank(date,'2026-11-17'),null);
});
test('Jakarta midnight changes the calendar day regardless of the browser timezone',()=>{
 assert.equal(rankCalendarDate(new Date('2026-11-16T16:59:59Z')),'2026-11-16');
 assert.equal(rankCalendarDate(new Date('2026-11-16T17:00:00Z')),'2026-11-17');
});
