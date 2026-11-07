import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

import ts from "typescript";


function loadHelper() {
  const filename =
    new URL(
      "../lib/application-origin.ts",
      import.meta.url,
    );
  const source =
    fs.readFileSync(
      filename,
      "utf8",
    );
  const {
    outputText,
  } = ts.transpileModule(
    source,
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
  const loaded = {
    exports: {},
  };

  vm.runInNewContext(
    outputText,
    {
      module: loaded,
      exports:
        loaded.exports,
      process: {
        env: {},
      },
      Error,
      URL,
    },
    {
      filename:
        filename.pathname,
      timeout: 1000,
    },
  );

  return loaded.exports;
}


test(
  "configured application origin accepts HTTPS and local loopback origins",
  () => {
    const {
      configuredApplicationOrigin,
    } = loadHelper();

    assert.equal(
      configuredApplicationOrigin(
        "https://App.Example.Test/",
      ),
      "https://app.example.test",
    );
    assert.equal(
      configuredApplicationOrigin(
        "http://127.0.0.1:3100",
      ),
      "http://127.0.0.1:3100",
    );
    assert.equal(
      configuredApplicationOrigin(
        "http://localhost:3100/",
      ),
      "http://localhost:3100",
    );
  },
);


test(
  "configured application origin rejects non-origin and insecure remote values",
  () => {
    const {
      configuredApplicationOrigin,
    } = loadHelper();

    for (const value of [
      undefined,
      "not a URL",
      "   ",
      "http://app.example.test",
      "https://user:password@app.example.test",
      "https://app.example.test/path",
      "https://app.example.test/?query=true",
      "https://app.example.test/#fragment",
      "file:///tmp/app",
    ]) {
      assert.throws(
        () =>
          configuredApplicationOrigin(
            value,
          ),
        /NEXT_PUBLIC_SITE_URL/,
      );
    }
  },
);
