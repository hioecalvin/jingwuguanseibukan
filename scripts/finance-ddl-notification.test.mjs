import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {buildLocalBaselineSql} from './local-finance-baseline.mjs';
const read=file=>readFileSync(new URL(file,import.meta.url),'utf8');
const fixture=read('../tests/sql/059_captured_ddl_hooks_local.sql');
const runner=read('./test-advance-payment-local.mjs');
test('local DDL hooks retain the reviewed definitions and only two general triggers',()=>{
  const hashes={pgrst_ddl_watch:'2b4b5d702ddf70fbd1a05c9825f9f9016d5c0ef97dd3df5f5b012ea23d9b94b1',
    pgrst_drop_watch:'3a2696133853e17a0456cbfbb233a03815f50895492143e84df983b558d76593'};
  for(const [name,hash] of Object.entries(hashes)) {
    const start=fixture.indexOf(`CREATE OR REPLACE FUNCTION extensions.${name}()`);
    assert.ok(start>=0);
    const end=fixture.indexOf('$function$',fixture.indexOf('$function$',start)+10)+10;
    const definition=fixture.slice(start,end).replaceAll('\r\n','\n')+'\n';
    assert.equal(createHash('sha256').update(definition).digest('hex'),hash);
  }
  assert.equal([...fixture.matchAll(/create event trigger /g)].length,2);
  assert.match(fixture,/inet_server_addr\(\) is distinct from '127\.0\.0\.1'::inet/);
  assert.doesNotMatch(fixture,/create extension|disable|http_post|http_get/i);
});
test('listener surrounds rehearsal with CREATE DROP and final committed positive controls',()=>{
  assert.match(runner,/listen pgrst/);
  for(const marker of ['afterCommittedCreate!==1','afterCommittedDrop!==2',
    'await flushListener()!==afterCommittedDrop)',
    'await flushListener()!==afterCommittedDrop+1)'])assert.ok(runner.includes(marker),marker);
  assert.ok(runner.indexOf('const afterCommittedDrop=')<runner.indexOf('const rehearsalSql='));
  assert.ok(runner.indexOf('const afterCandidateDDL=capture()')<runner.indexOf('Rolled-back candidate DDL leaked'));
  assert.match(runner,/setTimeout\(\(\)=>listener.kill\(\),60000\)/);
  assert.match(runner,/unlisten \*/);
});
test('independent catalog fingerprint includes DDL hook identity and definitions',()=>{
  const source=buildLocalBaselineSql({address:'127.0.0.1',inventory:[{name:'profiles',kind:'r'}]});
  for(const token of ['pg_event_trigger','e.evtenabled','e.evttags','e.evtowner','pg_get_functiondef(p.oid)'])assert.ok(source.includes(token));
});
