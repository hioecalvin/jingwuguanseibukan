/**
 * Removes ONLY the dummy accounts created by seed-dummy-users.mjs.
 *
 * Run:
 *   node scripts/delete-dummy-users.mjs
 *
 * Required .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL=...
 *   SUPABASE_SERVICE_ROLE_KEY=...
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

function loadDotEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;

  const text = fs.readFileSync(envPath, "utf8");

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eq = line.indexOf("=");
    if (eq < 1) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadDotEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required."
  );
}

const supabase = createClient(
  SUPABASE_URL,
  SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const TEST_EMAIL_DOMAIN = "dummy.jingwuguan.test";

async function main() {
  let page = 1;
  const dummyUsers = [];

  while (true) {
    const { data, error } =
      await supabase.auth.admin.listUsers({
        page,
        perPage: 1000,
      });

    if (error) throw error;

    for (const user of data.users) {
      if (
        user.email?.toLowerCase().endsWith(
          `@${TEST_EMAIL_DOMAIN}`
        )
      ) {
        dummyUsers.push(user);
      }
    }

    if (data.users.length < 1000) break;
    page += 1;
  }

  console.log(
    `Found ${dummyUsers.length} dummy Auth account(s).`
  );

  for (const user of dummyUsers) {
    console.log(`Deleting ${user.email} ...`);

    const { error } =
      await supabase.auth.admin.deleteUser(user.id);

    if (error) {
      throw new Error(
        `Failed deleting ${user.email}: ${error.message}`
      );
    }
  }

  console.log("Dummy Auth accounts deleted.");
  console.log(
    "If your FK relationships cascade from auth.users/profiles, related dummy rows are removed automatically."
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
