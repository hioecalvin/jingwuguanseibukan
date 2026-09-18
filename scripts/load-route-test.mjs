import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Execute the actual handler with explicit dependency fakes and no network or
// inherited environment. These are handler unit tests, not Next/Supabase E2E.
export function loadRoute(relativePath, dependencies, env = {}) {
  const filename = new URL(`../${relativePath}`, import.meta.url);
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename.pathname,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const routeModule = { exports: {} };
  const logs = [];
  vm.runInNewContext(outputText, {
    module: routeModule,
    exports: routeModule.exports,
    require(name) {
      if (!Object.hasOwn(dependencies, name)) throw new Error(`Unmocked dependency: ${name}`);
      return dependencies[name];
    },
    process: { env: { ...env } },
    console: { error: (...args) => logs.push(args) },
    Buffer,
    Error,
    URL,
  }, { filename: filename.pathname, timeout: 1000 });
  return { ...routeModule.exports, logs };
}

export const nextServer = { NextResponse: { json: (body, init) => Response.json(body, init) } };
