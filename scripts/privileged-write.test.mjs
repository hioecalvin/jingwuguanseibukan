import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

function source(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function clientSourceFiles(relativeDirectory) {
  const directory = path.join(root, relativeDirectory);
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) {
      if (relativePath === path.join("app", "api")) return [];
      return clientSourceFiles(relativePath);
    }
    if (!entry.isFile() || !/\.(?:ts|tsx)$/.test(entry.name)) return [];
    const contents = source(relativePath);
    return /^\s*["']use client["'];/m.test(contents)
      ? [{ relativePath: relativePath.replaceAll("\\", "/"), contents }]
      : [];
  });
}

test("repository content management uses reviewed mutation boundaries", () => {
  const managePage = source("app/admin/content/manage/page.tsx");
  const scopedUploaderPage = source("app/admin/content/page.tsx");

  assert.match(managePage, /export \{ default \} from ["']@\/app\/admin\/content\/page["']/);
  assert.match(scopedUploaderPage, /rpc\(\s*["']get_my_repository_upload_scopes["']/);
  assert.match(scopedUploaderPage, /rpc\(\s*["']update_repository_content["']/);
  assert.match(scopedUploaderPage, /rpc\(\s*["']delete_repository_content["']/);
  assert.doesNotMatch(
    scopedUploaderPage,
    /\.from\(\s*["']content["']\s*\)[\s\S]{0,120}?\.(?:insert|update|upsert|delete)\(/,
  );
});

test("migration 028 removes browser table writes but preserves reviewed RPCs", () => {
  const migration = source(
    "supabase/migrations/028_remove_direct_repository_content_writes.sql",
  );

  assert.match(
    migration,
    /revoke\s+insert,\s*update,\s*delete\s+on table public\.content\s+from public, anon, authenticated/is,
  );
  assert.match(migration, /has_table_privilege\('authenticated', 'public\.content', 'SELECT'\)/);
  for (const routine of [
    "create_repository_content",
    "update_repository_content",
    "delete_repository_content",
  ]) {
    assert.match(migration, new RegExp(`public\\.${routine}\\(`));
  }
});

test("remaining browser-side direct writes are an explicit RLS-backed allowlist", () => {
  const expected = {
    "app/admin/dojos/page.tsx": ["dojos"],
    "app/admin/events/page.tsx": ["events"],
    "app/admin/ranks/page.tsx": ["ranks"],
    "app/admin/tiers/page.tsx": ["sub_ranks"],
  };
  const discovered = {};

  for (const { relativePath, contents } of [
    ...clientSourceFiles("app"),
    ...clientSourceFiles("components"),
  ]) {
    const tables = new Set();
    const pattern = /\.from\(\s*["']([^"']+)["']\s*\)[\s\S]{0,240}?\.(?:insert|update|upsert|delete)\(/g;
    for (const match of contents.matchAll(pattern)) {
      tables.add(match[1]);
    }
    if (tables.size > 0) discovered[relativePath] = [...tables].sort();
  }

  assert.deepEqual(discovered, expected);
});
