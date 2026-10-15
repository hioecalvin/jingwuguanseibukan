import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { readSmokeTls, smokeOrigins, smokeTlsFiles } from './browser-smoke-tls.mjs';
import { smokeEnvironment, assertSmokeEnvironment } from './browser-smoke-config.mjs';

const tlsEnv = (directory = os.tmpdir()) => ({
  BROWSER_SMOKE_HTTPS: '1',
  BROWSER_SMOKE_TLS_CERT_FILE: path.join(directory, 'fictional-cert.pem'),
  BROWSER_SMOKE_TLS_KEY_FILE: path.join(directory, 'fictional-key.pem'),
  BROWSER_SMOKE_TLS_CA_FILE: path.join(directory, 'fictional-ca.pem'),
});

test('HTTP remains the default and does not read any TLS files', () => {
  assert.equal(smokeTlsFiles({}), null);
  assert.equal(readSmokeTls({}), null);
  assert.deepEqual(smokeOrigins({}), { app: 'http://127.0.0.1:3100', navigation: 'http://127.0.0.1:3101' });
});

test('explicit HTTPS changes protocol only, never loopback hosts or fixed ports', () => {
  assert.deepEqual(smokeOrigins({ ...tlsEnv(), BASE_URL: 'https://production.invalid', PORT: '443' }), {
    app: 'https://127.0.0.1:3100', navigation: 'https://127.0.0.1:3101',
  });
});

test('partial TLS setup and ambiguous opt-in values fail closed', () => {
  for (const value of ['', 'true', '0', 'yes']) assert.throws(() => smokeTlsFiles({ ...tlsEnv(), BROWSER_SMOKE_HTTPS: value }), /exactly 1/);
  for (const field of ['BROWSER_SMOKE_TLS_CERT_FILE', 'BROWSER_SMOKE_TLS_KEY_FILE', 'BROWSER_SMOKE_TLS_CA_FILE']) {
    const env = tlsEnv();
    delete env[field];
    assert.throws(() => smokeTlsFiles(env), /absolute local path/);
    assert.throws(() => smokeTlsFiles({ [field]: '/fictional.pem' }), /explicit/);
  }
});

test('TLS paths reject URLs, relative paths, control characters and network shares', () => {
  for (const value of ['https://production.invalid/key.pem', 'relative-key.pem', '', '//remote/share/key.pem', '\\\\remote\\share\\key.pem', `${path.parse(os.tmpdir()).root}key\n.pem`]) {
    assert.throws(() => smokeTlsFiles({ ...tlsEnv(), BROWSER_SMOKE_TLS_KEY_FILE: value }));
  }
});

test('only explicit public CA input reaches child Node trust; arbitrary trust and bypass flags are dropped', () => {
  const env = smokeEnvironment({ ...tlsEnv(), NODE_EXTRA_CA_CERTS: '/unapproved.pem', NODE_TLS_REJECT_UNAUTHORIZED: '0', NODE_OPTIONS: '--insecure-http-parser', CURL_CA_BUNDLE: '/unapproved.pem', SECURITY_TEST_MEMBER_PASSWORD: 'private-password' });
  assert.equal(env.NODE_EXTRA_CA_CERTS, env.BROWSER_SMOKE_TLS_CA_FILE);
  for (const field of ['NODE_TLS_REJECT_UNAUTHORIZED', 'NODE_OPTIONS', 'CURL_CA_BUNDLE', 'SECURITY_TEST_MEMBER_PASSWORD']) assert.equal(env[field], undefined);
  assert.doesNotThrow(() => assertSmokeEnvironment(env));
  assert.equal(smokeEnvironment({ NODE_EXTRA_CA_CERTS: '/unapproved.pem' }).NODE_EXTRA_CA_CERTS, undefined);
});

test('direct runner validation rejects modified TLS checks and mismatched CA input', () => {
  const env = smokeEnvironment(tlsEnv());
  assert.throws(() => assertSmokeEnvironment({ ...env, NODE_TLS_REJECT_UNAUTHORIZED: '0' }), /Refusing/);
  assert.throws(() => assertSmokeEnvironment({ ...env, NODE_EXTRA_CA_CERTS: '/different.pem' }), /Refusing/);
  assert.throws(() => assertSmokeEnvironment({ ...env, NODE_EXTRA_CA_CERTS: undefined }), /Refusing/);
});

function withInvalidFiles(run) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'jwg-tls-guard-'));
  const env = tlsEnv(directory);
  const files = Object.values(smokeTlsFiles(env));
  try {
    for (const file of files) fs.writeFileSync(file, 'deliberately-invalid-fictional-material', { mode: 0o600, flag: 'wx' });
    run(env, directory);
  } finally {
    // Only the three files created above and their now-empty unique directory.
    // No recursive removal, credential material or certificate trust is involved.
    for (const file of files) fs.unlinkSync(file);
    fs.rmdirSync(directory);
  }
}

test('certificate material within the repository is rejected without exposing paths or content', () => {
  withInvalidFiles((env, directory) => {
    assert.throws(() => readSmokeTls(env, directory), error => {
      assert.match(error.message, /outside the repository/);
      assert.ok(!error.message.includes(directory));
      assert.doesNotMatch(error.message, /fictional-material/);
      return true;
    });
  });
});

test('malformed or oversized certificate material never falls back to HTTP', () => {
  withInvalidFiles(env => {
    assert.throws(() => readSmokeTls(env), /Invalid HTTPS smoke configuration/);
    fs.writeFileSync(env.BROWSER_SMOKE_TLS_CERT_FILE, Buffer.alloc(1024 * 1024 + 1));
    assert.throws(() => readSmokeTls(env), /Invalid HTTPS smoke configuration/);
    assert.equal(smokeOrigins(env).app, 'https://127.0.0.1:3100');
  });
});
