import test from 'node:test';
import assert from 'node:assert/strict';
import {ledgerStatementsMatch,replacementChecks} from './verify-finance-catalog-candidate.mjs';
test('ledger comparison permits only CRLF, outer whitespace and statement separators',()=>{
  assert.equal(ledgerStatementsMatch('-- note\r\nselect 1;\r\nselect 2;', ['-- note\nselect 1','select 2']),true);
  assert.equal(ledgerStatementsMatch('begin; select 1; commit;',['begin; select 1; commit;']),true);
  for(const statements of [[],[''],['select 1'],['select 2','select 1'],['select 1','select 3']])
    assert.equal(ledgerStatementsMatch('select 1; select 2;',statements),false);
  assert.equal(ledgerStatementsMatch("select 'two  spaces';",["select 'two spaces'"]),false);
  assert.equal(ledgerStatementsMatch('-- important\nselect 1;',['select 1']),false);
});
test('replacement preflight refuses missing or overloaded expected routines',()=>{
  assert.ok(replacementChecks([]).every(check=>!check.passed));
  const routine={schema_name:'public',routine_name:'adjust_current_membership_fee',definition:"when new_amount = 0 then 'paid'"};
  assert.equal(replacementChecks([routine]).find(c=>c.name===routine.routine_name).passed,true);
  assert.equal(replacementChecks([routine,routine]).find(c=>c.name===routine.routine_name).passed,false);
});
