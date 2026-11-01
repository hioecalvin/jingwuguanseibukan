import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";


const serverOnlyModules = [
  "../lib/push/server.ts",
  "../lib/security/constant-time-secret.ts",
  "../lib/security/durable-rate-limit.ts",
  "../lib/supabase/admin.ts",
  "../lib/supabase/authenticated.ts",
];


test(
  "modules that read or transport privileged server credentials reject client imports",
  () => {
    for (const relativePath of serverOnlyModules) {
      const source =
        fs.readFileSync(
          new URL(
            relativePath,
            import.meta.url,
          ),
          "utf8",
        );

      assert.match(
        source,
        /^import "server-only";/,
        relativePath,
      );
    }
  },
);
