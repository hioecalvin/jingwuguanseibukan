import test from 'node:test';
import assert from 'node:assert/strict';
import {FINANCE_STAGING_REF,validateFinanceRehearsalTarget} from './finance-rehearsal-target.mjs';
const target=()=>({projectRef:FINANCE_STAGING_REF,host:`db.${FINANCE_STAGING_REF}.supabase.co`,
  port:5432,database:'postgres',user:'postgres',sslmode:'verify-full'});
test('only exact direct staging target with verified TLS is accepted and frozen',()=>{
  const result=validateFinanceRehearsalTarget(target());assert.ok(Object.isFrozen(result));
  assert.deepEqual(result,target());
});
test('other projects, host tricks, IPs and poolers are refused without fallbacks',()=>{
  for(const change of [{projectRef:'pkmllhaavadhaozmwapz'},{projectRef:'wtnonpldqvzipqmwgbru'},
    {host:'db.pkmllhaavadhaozmwapz.supabase.co'},{host:'127.0.0.1'},
    {host:target().host+'.attacker.invalid'},{host:target().host+'/'},{host:target().host+' '},
    {host:'aws-0-ap-southeast-2.pooler.supabase.com'}])assert.throws(()=>validateFinanceRehearsalTarget({...target(),...change}));
});
test('weaker TLS, alternate ports/users/databases and unknown connection options are refused',()=>{
  for(const change of [{sslmode:'require'},{sslmode:'disable'},{sslmode:'verify-ca'},{port:6543},
    {port:'5432'},{database:'other'},{user:'other'},{hostaddr:'127.0.0.1'},
    {url:'postgres://ignored'},{password:'must-not-be-in-target-metadata'},{options:'-c search_path=other'}])
    assert.throws(()=>validateFinanceRehearsalTarget({...target(),...change}));
  assert.throws(()=>validateFinanceRehearsalTarget(null));
});
