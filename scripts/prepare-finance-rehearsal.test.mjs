import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assessRehearsalIsolation} from './prepare-finance-rehearsal.mjs';
test('rehearsal refuses missing notification and active trigger bodies',()=>{
  const result=assessRehearsalIsolation({routines:[],triggers:[{
    schema_name:'public',table_name:'membership_payments',enabled:'O',
    function_schema:'public',function_name:'payment_hook',
  }]});
  assert.equal(result.readyToExecute,false);
  assert.ok(result.blockers.some(b=>b.includes('public.create_notification')));
  assert.ok(result.blockers.some(b=>b.includes('public.payment_hook')));
});
test('every overload needs a body and complete bodies still do not authorize execution',()=>{
  const routines=[{schema_name:'public',routine_name:'create_notification',definition:'select 1'},
    {schema_name:'public',routine_name:'create_notification',definition:null}];
  let result=assessRehearsalIsolation({routines,triggers:[]});
  assert.equal(result.dependencies[0].definitionsCaptured,false);
  routines[1].definition='select nested_function()';
  result=assessRehearsalIsolation({routines,triggers:[]});
  assert.equal(result.dependencies[0].definitionsCaptured,true);
  assert.equal(result.readyToExecute,false);
  assert.ok(result.blockers.some(b=>b.includes('transitive')));
  assert.ok(result.blockers.some(b=>b.includes('explicit approval')));
});
test('replica and always triggers are included rather than assumed harmless',()=>{
  for(const enabled of ['O','A','R']) {
    const result=assessRehearsalIsolation({routines:[],triggers:[{schema_name:'public',
      table_name:'email_outbox',enabled,function_schema:'custom',function_name:'delivery'}]});
    assert.ok(result.blockers.some(b=>b.includes('custom.delivery')));
  }
});
test('preparation helper contains no execution or credential path',()=>{
  const source=readFileSync(new URL('./prepare-finance-rehearsal.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(source,/\bfetch\s*\(|child_process|process\.env|database\/query|C:[\\/]protected|\.query\s*\(/);
  assert.match(source,/readyToExecute:false/);
  assert.match(source,/runnerImplemented:false/);
});
