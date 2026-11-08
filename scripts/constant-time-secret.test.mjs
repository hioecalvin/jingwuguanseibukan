import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

import ts from "typescript";


function loadHelper(
  timingSafeEqual = crypto.timingSafeEqual,
) {
  const filename =
    new URL(
      "../lib/security/constant-time-secret.ts",
      import.meta.url,
    );

  const {
    outputText,
  } = ts.transpileModule(
    fs.readFileSync(
      filename,
      "utf8",
    ),
    {
      fileName:
        filename.pathname,
      compilerOptions: {
        module:
          ts.ModuleKind.CommonJS,
        target:
          ts.ScriptTarget.ES2022,
      },
    },
  );

  const routeModule = {
    exports: {},
  };

  vm.runInNewContext(
    outputText,
    {
      module:
        routeModule,
      exports:
        routeModule.exports,
      require(name) {
        if (name === "server-only") {
          return {};
        }
        if (name === "node:crypto") {
          return {
            createHash:
              crypto.createHash,
            timingSafeEqual,
          };
        }
        throw new Error(
          `Unexpected dependency: ${name}`,
        );
      },
      Buffer,
    },
    {
      filename:
        filename.pathname,
      timeout: 1000,
    },
  );

  return routeModule.exports;
}


test(
  "constant-time secret matching accepts only the exact non-empty value",
  () => {
    const {
      matchesSecret,
    } = loadHelper();

    assert.equal(
      matchesSecret(
        "correct-secret",
        "correct-secret",
      ),
      true,
    );

    for (const candidate of [
      "incorrect-secret",
      "short",
      "",
      null,
      undefined,
    ]) {
      assert.equal(
        matchesSecret(
          candidate,
          "correct-secret",
        ),
        false,
      );
    }

    assert.equal(
      matchesSecret(
        "",
        "",
      ),
      false,
    );
  },
);


test(
  "different-length supplied values reach timingSafeEqual as fixed SHA-256 digests",
  () => {
    const lengths = [];
    const {
      matchesSecret,
    } = loadHelper(
      (left, right) => {
        lengths.push([
          left.length,
          right.length,
        ]);
        return crypto.timingSafeEqual(
          left,
          right,
        );
      },
    );

    assert.equal(
      matchesSecret(
        "x",
        "a-much-longer-secret",
      ),
      false,
    );
    assert.deepEqual(
      lengths,
      [[32, 32]],
    );
  },
);
