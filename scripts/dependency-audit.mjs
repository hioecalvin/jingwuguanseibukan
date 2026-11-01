import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { ADVISORY, evaluateAudit, parseAuditRun } from './dependency-audit-policy.mjs';

try {
  if (process.argv.length !== 2 || !process.env.npm_execpath) throw Error('Run npm run audit:dependencies without overrides');
  const result = spawnSync(process.execPath, [process.env.npm_execpath, 'audit', '--json', '--audit-level=high'], {
    cwd: process.cwd(), encoding: 'utf8', windowsHide: true, timeout: 120_000, maxBuffer: 8 * 1024 * 1024,
  });
  const report = parseAuditRun(result);
  const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
  const decision = evaluateAudit(report, lock);
  if (decision.excepted.length) {
    console.warn(`WARNING: approved development-only risk exception: ${ADVISORY}`);
    console.warn(`Expires ${decision.expiresAt}; NOT patched. Packages: ${decision.excepted.join(', ')}`);
  }
  if (!decision.ready) throw Error(`High/critical audit findings blocked: ${decision.blocked.join(', ')}`);
  console.log('Dependency audit policy passed; production audit must still pass separately.');
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Dependency audit failed');
  process.exitCode = 1;
}
