import fs from 'node:fs';
import path from 'node:path';
import { X509Certificate, createPrivateKey } from 'node:crypto';
import { createSecureContext } from 'node:tls';

const fields = ['BROWSER_SMOKE_TLS_CERT_FILE', 'BROWSER_SMOKE_TLS_KEY_FILE', 'BROWSER_SMOKE_TLS_CA_FILE'];

// Opt-in only. This module never generates certificates or installs trust.
export function smokeTlsFiles(env = process.env) {
  const enabled = env.BROWSER_SMOKE_HTTPS === '1';
  if (env.BROWSER_SMOKE_HTTPS !== undefined && !enabled) {
    throw new Error('BROWSER_SMOKE_HTTPS must be unset or exactly 1.');
  }
  if (!enabled) {
    if (fields.some(field => env[field] !== undefined)) throw new Error('TLS files require explicit BROWSER_SMOKE_HTTPS=1.');
    return null;
  }
  for (const field of fields) {
    const value = env[field];
    if (typeof value !== 'string' || !value || /[\r\n\0]/.test(value) || !path.isAbsolute(value)) {
      throw new Error(`HTTPS smoke tests require an absolute local path in ${field}.`);
    }
    // Windows network shares/device paths must not turn a local file read into
    // external credential access. POSIX paths remain supported for CI.
    if (/^[\\/]{2}/.test(value)) throw new Error('TLS files must be local, not network/device paths.');
  }
  return { cert: env[fields[0]], key: env[fields[1]], ca: env[fields[2]] };
}

export function smokeOrigins(env = process.env) {
  const scheme = smokeTlsFiles(env) ? 'https' : 'http';
  return { app: `${scheme}://127.0.0.1:3100`, navigation: `${scheme}://127.0.0.1:3101` };
}

export function readSmokeTls(env = process.env, root = process.cwd()) {
  const files = smokeTlsFiles(env);
  if (!files) return null;
  try {
    const repository = fs.realpathSync(root);
    function readProtectedFile(file) {
      const resolved = fs.realpathSync(file);
      if (/^[\\/]{2}/.test(resolved)) throw new Error('Resolved TLS path is not local.');
      for (let current = path.resolve(file); current !== path.dirname(current); current = path.dirname(current)) {
        if (fs.lstatSync(current).isSymbolicLink()) throw new Error('Linked TLS paths are not accepted.');
      }
      const relative = path.relative(repository, resolved);
      if (!relative || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))) {
        throw new Error('TLS files must be outside the repository.');
      }
      const stat = fs.lstatSync(file);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 1024 * 1024) throw new Error('Invalid TLS file.');
      // Windows ACLs must be checked by the operator; POSIX private keys must
      // already be owner-only. The runner does not modify filesystem permissions.
      if (file === files.key && process.platform !== 'win32' && (stat.mode & 0o077) !== 0) throw new Error('Private key permissions are not owner-only.');
      return fs.readFileSync(file);
    }
    const cert = readProtectedFile(files.cert);
    const key = readProtectedFile(files.key);
    const ca = readProtectedFile(files.ca);
    if (/PRIVATE KEY/.test(cert.toString()) || /PRIVATE KEY/.test(ca.toString())) throw new Error('Private material in a public certificate file.');
    const certificate = new X509Certificate(cert);
    const now = Date.now();
    if (!certificate.checkIP('127.0.0.1') ||
        !(Date.parse(certificate.validFrom) <= now && now < Date.parse(certificate.validTo)) ||
        !certificate.checkPrivateKey(createPrivateKey(key))) throw new Error('Certificate is not valid for the loopback server.');
    new X509Certificate(ca); // Reject malformed trust input before a child starts.
    const options = { cert, key, minVersion: 'TLSv1.2' };
    createSecureContext(options); // Validate server key/chain configuration.
    return options;
  } catch {
    // OpenSSL/fs error messages can contain paths or certificate details. Keep
    // failures secret-free; never downgrade to HTTP after an HTTPS setup error.
    throw new Error('Invalid HTTPS smoke configuration: use readable certificate/key/CA files outside the repository, a current 127.0.0.1 SAN and matching protected private key.');
  }
}
