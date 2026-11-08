import test from 'node:test';
import { loadRoute } from './load-route-test.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { transformSync } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
const source = fs.readFileSync(new URL('../app/(member)/repository/[classId]/page.tsx', import.meta.url), 'utf8');
const compiled = transformSync(source, { loader: 'tsx', format: 'cjs', jsx: 'automatic' }).code;
const ranks = [
  { id: 'lower', class_id: 'class', name: 'Lower grade fixture', sort_order: 1, level: 'mudansha' },
  { id: 'current', class_id: 'class', name: 'Current grade fixture', sort_order: 2, level: 'mudansha' },
  { id: 'higher', class_id: 'class', name: 'Higher grade fixture', sort_order: 3, level: 'mudansha' },
];
const tiers = [
  { id: 'legacy', rank_id: 'current', name: 'First tier fixture', sort_order: 1 },
  { id: 'other', rank_id: 'current', name: 'Later tier fixture', sort_order: 2 },
];

function render(rankId, search = '') {
  // Model a completed load, with a legacy member tier that must not gate folders.
  const states = [{ id: 'class', name: 'Fixture class' }, ranks, tiers,
    { rank_id: rankId, sub_rank_id: 'legacy', status: 'active' }, false, '', search, 'all',
    { lower: true, current: true, higher: true }];
  let cursor = 0;
  const compiledModule = { exports: {} };
  const imports = name => {
    if (name === 'react') return { ...React, useMemo: fn => fn(), useEffect: () => {}, useState: () => [states[cursor++], () => {}] };
    if (name === 'next/navigation') return { useParams: () => ({ classId: 'class' }), useRouter: () => ({ push() {} }) };
    if (name === '@/lib/supabase/client') return { createClient: () => ({}) };
    if (name === '@/components/compact-record') return { __esModule: true, default: ({ summary, children }) => React.createElement('section', null, summary, children) };
    if (name === '@/lib/grading-category') return loadRoute('lib/grading-category.ts', {});
    return require(name);
  };
  vm.runInNewContext(compiled, { module: compiledModule, exports: compiledModule.exports, require: imports });
  const element = compiledModule.exports.default();
  assert.equal(cursor, states.length, 'Update loaded-state fixture if page state changes');
  return renderToStaticMarkup(element);
}

test('rank folders show current/lower grades and every tier despite legacy member tier', () => {
  const html = render('current');
  for (const name of ['Lower grade fixture', 'Current grade fixture', 'First tier fixture', 'Later tier fixture']) assert.ok(html.includes(name), name);
  assert.ok(!html.includes('Higher grade fixture'));
  assert.ok(render('current', 'Higher grade fixture').includes('No matching ranks'));
});

test('unranked or unknown rank shows no folders and an actionable empty state', () => {
  for (const rankId of [null, 'missing']) {
    const html = render(rankId);
    assert.ok(html.includes('No ranks available'));
    for (const rank of ranks) assert.ok(!html.includes(rank.name));
    assert.ok(!html.includes('First tier fixture'));
  }
});
