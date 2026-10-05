// Owner approved on 2026-10-05. This accepts a known risk; it is not a patch.
export const ADVISORY = 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm';
export const APPROVED_AT = '2026-10-05T11:09:49Z';
export const EXPIRES_AT = '2026-10-19T11:09:49Z';
const chain = Object.freeze({
  'eslint-config-next': { version: '16.3.8', via: '@next/eslint-plugin-next' },
  '@next/eslint-plugin-next': { version: '16.3.8', via: 'fast-glob' },
  'fast-glob': { version: '3.3.1', via: 'micromatch' },
  micromatch: { version: '4.0.8', via: 'braces' },
  braces: { version: '3.0.3', via: null },
});
const severities = ['info', 'low', 'moderate', 'high', 'critical'];
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export function evaluateAudit(report, lock, now = Date.now()) {
  if (!Number.isFinite(now) || !object(report) || report.error || report.auditReportVersion !== 2 ||
      !object(report.vulnerabilities) || !object(report.metadata?.vulnerabilities) ||
      lock?.lockfileVersion !== 3 || !object(lock.packages)) throw Error('Invalid audit/lock/time input');
  const entries = Object.entries(report.vulnerabilities);
  const counts = Object.fromEntries(severities.map(s => [s, 0]));
  for (const [name, finding] of entries) {
    if (!object(finding) || finding.name !== name || !severities.includes(finding.severity) ||
        !Array.isArray(finding.via) || !finding.via.length || !Array.isArray(finding.nodes) ||
        !finding.nodes.length || !finding.nodes.every(node => typeof node === 'string')) {
      throw Error('Malformed vulnerability finding');
    }
    counts[finding.severity]++;
  }
  for (const severity of severities) {
    if (report.metadata.vulnerabilities[severity] !== counts[severity]) throw Error('Audit count mismatch');
  }
  if (report.metadata.vulnerabilities.total !== entries.length) throw Error('Audit total mismatch');

  const active = now >= Date.parse(APPROVED_AT) && now < Date.parse(EXPIRES_AT);
  function permitted(name, seen = new Set()) {
    const expected = chain[name];
    const finding = report.vulnerabilities[name];
    if (!active || !expected || seen.has(name) || !finding || finding.severity !== 'high') return false;
    const node = `node_modules/${name}`;
    if (finding.nodes.length !== 1 || finding.nodes[0] !== node ||
        lock.packages[node]?.dev !== true || lock.packages[node]?.version !== expected.version ||
        finding.via.length !== 1) return false;
    const via = finding.via[0];
    if (expected.via !== null) {
      if (via !== expected.via) return false;
      return permitted(via, new Set([...seen, name]));
    }
    return object(via) && via.url === ADVISORY && via.name === 'braces' &&
      via.dependency === 'braces' && via.severity === 'high';
  }

  const high = entries.filter(([, f]) => ['high', 'critical'].includes(f.severity));
  const excepted = high.filter(([name]) => permitted(name)).map(([name]) => name);
  const blocked = high.filter(([name]) => !permitted(name)).map(([name]) => name);
  return { ready: blocked.length === 0, excepted, blocked, expiresAt: EXPIRES_AT };
}

export function parseAuditRun(result) {
  if (result.error || result.signal || ![0, 1].includes(result.status)) throw Error('npm audit process failed');
  let report;
  try { report = JSON.parse(result.stdout); } catch { throw Error('npm audit returned invalid JSON'); }
  if (report.error) throw Error('npm audit registry error');
  return report;
}
