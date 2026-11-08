import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

import ts from "typescript";


function loadRuntime(env = {}) {
  const filename =
    new URL(
      "../lib/email/worker-runtime.ts",
      import.meta.url,
    );

  const { outputText } =
    ts.transpileModule(
      fs.readFileSync(filename, "utf8"),
      {
        fileName: filename.pathname,
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
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
      exports: loaded.exports,
      process: { env: { ...env } },
      AbortSignal,
      Date,
      Math,
      Number,
    },
    {
      filename: filename.pathname,
      timeout: 1_000,
    },
  );

  return loaded.exports;
}


test("email worker runtime uses production-safe bounded defaults", () => {
  const runtime =
    loadRuntime();

  assert.equal(runtime.emailWorkerRunBudgetMs(), 45_000);
  assert.equal(runtime.emailProviderTimeoutMs(), 10_000);
  assert.equal(runtime.emailWorkerDeadline(1_000), 46_000);
  assert.equal(runtime.remainingWorkerTimeMs(46_000, 45_250), 750);
  assert.equal(runtime.remainingWorkerTimeMs(46_000, 47_000), 0);
});


test("invalid or unsafe runtime overrides fall back instead of disabling bounds", () => {
  for (const value of ["", "0", "999", "50001", "1.5", "not-a-number"]) {
    const runtime =
      loadRuntime({
        EMAIL_WORKER_RUN_BUDGET_MS: value,
        EMAIL_PROVIDER_TIMEOUT_MS: value,
      });

    assert.equal(runtime.emailWorkerRunBudgetMs(), 45_000, value);
    assert.equal(runtime.emailProviderTimeoutMs(), 10_000, value);
  }
});


test("provider timeout never exceeds the remaining worker budget", async () => {
  const runtime =
    loadRuntime({
      EMAIL_PROVIDER_TIMEOUT_MS: "30000",
    });

  const signal =
    runtime.emailProviderAbortSignal(5);

  assert.equal(signal.aborted, false);

  await new Promise(resolve =>
    setTimeout(resolve, 15));

  assert.equal(signal.aborted, true);
});
