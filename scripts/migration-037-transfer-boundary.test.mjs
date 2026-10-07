import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL(
  '../supabase/migrations/037_align_break_states_and_transfer_boundaries.sql',
  import.meta.url,
);

const functionBody = (sql, name) => {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = sql.match(new RegExp(
    `create\\s+or\\s+replace\\s+function\\s+public[.]${escaped}\\b[\\s\\S]*?\\$function\\$;`,
    'i',
  ));
  assert.ok(match, `missing replacement for ${name}`);
  return match[0];
};

test('migration 037 aligns current Break states and removes direct transfer writes', async () => {
  const sql = await readFile(migrationUrl, 'utf8');

  assert.equal((sql.match(/^\s*begin\s*;/gim) ?? []).length, 1);
  assert.equal((sql.match(/^\s*commit\s*;/gim) ?? []).length, 1);
  assert.match(sql, /do\s+\$preflight\$/i);
  assert.match(sql, /do\s+\$postflight\$/i);

  for (const name of [
    'can_manage_class',
    'assign_dojo_admin',
    'get_available_dojo_admin_assignments',
    'request_dojo_transfer',
    'request_class_access',
    'record_membership_break',
    'on_new_class_request',
    'validate_dojo_admin_assignment',
  ]) {
    const body = functionBody(sql, name);
    assert.match(body, /'break_1'::public[.]membership_status/i, `${name} omits Break 1`);
    assert.match(body, /'break_2'::public[.]membership_status/i, `${name} omits Break 2`);
  }

  assert.match(
    functionBody(sql, 'record_membership_break'),
    /membership_record[.]status\s+in\s*\([\s\S]*?'break'::public[.]membership_status[\s\S]*?'break_1'::public[.]membership_status[\s\S]*?'break_2'::public[.]membership_status[\s\S]*?\)/i,
    'record_membership_break must reject every retained Break state',
  );

  for (const name of ['notify_dojo_admins', 'on_new_dojo_transfer']) {
    const body = functionBody(sql, name);
    assert.match(body, /public[.]dojo_admin_assignments/i, `${name} ignores assignment scope`);
    assert.match(body, /assignment[.]active\s*=\s*true/i, `${name} includes inactive assignments`);
    assert.doesNotMatch(body, /from\s+public[.]class_memberships/i, `${name} uses obsolete role routing`);
  }

  assert.match(
    sql,
    /revoke\s+insert\s+on\s+table\s+public[.]dojo_transfer_requests\s+from\s+anon\s*,\s*authenticated\s*;/i,
  );
  assert.match(
    sql,
    /drop\s+policy\s+if\s+exists\s+"member can create own dojo transfer request"\s+on\s+public[.]dojo_transfer_requests\s*;/i,
  );
  assert.match(
    sql,
    /not\s+pg_catalog[.]has_table_privilege\([\s\S]*?'authenticated'[\s\S]*?'public[.]dojo_transfer_requests'[\s\S]*?'SELECT'[\s\S]*?\)/i,
  );
  assert.match(
    sql,
    /grant\s+execute\s+on\s+function\s+public[.]request_dojo_transfer\s*\(\s*uuid\s*,\s*text\s*\)\s+to\s+authenticated\s*,\s*service_role\s*;/i,
  );
  assert.match(
    sql,
    /revoke\s+execute\s+on\s+function\s+public[.]on_new_dojo_transfer\s*\(\s*\)\s+from\s+public\s*,\s*anon\s*,\s*authenticated\s*;/i,
  );
});
