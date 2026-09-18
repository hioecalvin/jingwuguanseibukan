import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL(
  '../supabase/migrations/038_normalize_membership_break_report_labels.sql',
  import.meta.url,
);

const normalizedPattern = (qualifier) => new RegExp(
  `when\\s+${qualifier.replace('.', '[.]')}[.]status\\s+in\\s*\\(\\s*'break'\\s*,\\s*'break_1'\\s*,\\s*'break_2'\\s*\\)\\s+then\\s+'Break'`,
  'i',
);

test('migration 038 normalizes all retained Break states in both report RPCs', async () => {
  const sql = await readFile(migrationUrl, 'utf8');

  assert.equal((sql.match(/^\s*begin\s*;/gim) ?? []).length, 1);
  assert.equal((sql.match(/^\s*commit\s*;/gim) ?? []).length, 1);
  assert.match(sql, /pg_catalog[.]to_regprocedure\(\s*'public[.]get_member_report_history\(\)'/i);
  assert.match(sql, /pg_catalog[.]to_regprocedure\(\s*'public[.]get_official_member_record\(uuid\)'/i);
  assert.match(sql, normalizedPattern('membership'));
  assert.match(sql, normalizedPattern('m'));

  assert.equal(
    (sql.match(/execute\s+repaired_definition\s*;/gi) ?? []).length,
    2,
    'both catalog definitions must be replaced',
  );
  assert.match(sql, /match_count\s*<>\s*1/gi);
  assert.match(sql, /do\s+\$postflight\$/i);
});

test('migration 038 is narrowly scoped and preserves routine ACLs', async () => {
  const sql = await readFile(migrationUrl, 'utf8');

  assert.doesNotMatch(sql, /\b(?:insert|update|delete|truncate)\s+(?:into\s+|from\s+)?public[.]/i);
  assert.doesNotMatch(sql, /\bdrop\s+(?:function|table|schema)\b/i);
  assert.doesNotMatch(sql, /\b(?:grant|revoke)\b[\s\S]*?\bon\s+function\b/i);
  assert.match(sql, /CREATE OR REPLACE preserves the routines' existing ACLs/i);
});
