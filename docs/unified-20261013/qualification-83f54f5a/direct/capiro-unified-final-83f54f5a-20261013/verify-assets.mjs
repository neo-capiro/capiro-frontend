import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const root = '/workspace/capiro-onboard-port-20261013';
const output = '/tmp/capiro-unified-final-83f54f5a-20261013/actual-served-assets';
const canonical = JSON.parse(await readFile(join(root, 'docs/newsletter-port-20261012/asset-preservation/ASSET-BYTE-VERIFICATION.json'), 'utf8'));
assert.equal(canonical.entries.length, 179);
await mkdir(output, { recursive: true });
const env = { ...process.env, NODE_ENV: 'production', PORT: '5188', HOSTNAME: '127.0.0.1', NEXT_TELEMETRY_DISABLED: '1', CAPIRO_DEFAULT_PRODUCT: '' };
for (const name of ['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'CLERK_SECRET_KEY', 'TRACKER_BACKEND', 'CORE_API_BASE_URL', 'STRATEGY_API_BASE_URL', 'WORKSPACE_API_BASE_URL', 'INTELLIGENCE_API_BASE_URL', 'ONBOARD_API_BASE_URL', 'MERI_ACTION_WORKFLOW_ENABLED', 'MERI_API_BASE_URL', 'CAPIRO_EXISTING_APP_URL', 'CAPIRO_MERI_URL', 'CAPIRO_MODULES_URL', 'CAPIRO_WORKSPACE_URL']) env[name] = '';
const startedUTC = new Date().toISOString();
const server = spawn(process.execPath, [join(root, 'apps/web/.next/standalone/apps/web/server.js')], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
let log = '';
server.stdout.on('data', chunk => { log += chunk; });
server.stderr.on('data', chunk => { log += chunk; });
const entries = [];
let failure;
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Standalone readiness timeout')), 30000);
    const settle = fn => value => { clearTimeout(timer); fn(value); };
    server.once('error', settle(reject));
    server.once('exit', settle(code => reject(new Error(`Standalone exited ${code}`))));
    server.stdout.on('data', () => { if (log.includes('Ready')) settle(resolve)(); });
  });
  for (const expected of canonical.entries) {
    assert.ok(expected.publicPath.startsWith('/') && !expected.publicPath.startsWith('//'));
    const response = await fetch(`http://127.0.0.1:5188${expected.publicPath}`, { redirect: 'error', headers: { 'Accept-Encoding': 'identity' }, signal: AbortSignal.timeout(10000) });
    const bytes = Buffer.from(await response.arrayBuffer());
    const actual = { path: expected.publicPath, status: response.status, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), contentType: response.headers.get('content-type'), cacheControl: response.headers.get('cache-control') };
    entries.push(actual);
    assert.equal(actual.status, 200, actual.path);
    assert.equal(actual.bytes, expected.bytes, actual.path);
    assert.equal(actual.sha256, expected.sha256, actual.path);
  }
  assert.equal(entries.reduce((sum, entry) => sum + entry.bytes, 0), 486014);
} catch (error) {
  failure = error;
} finally {
  if (server.pid && server.exitCode === null && server.signalCode === null) {
    const stopped = once(server, 'exit');
    server.kill('SIGTERM');
    const timer = setTimeout(() => server.kill('SIGKILL'), 5000);
    try { await stopped; } finally { clearTimeout(timer); }
  }
  await writeFile(join(output, 'standalone.log'), log, { flag: 'wx' });
  await writeFile(join(output, 'asset-results.json'), JSON.stringify({ startedUTC, endedUTC: new Date().toISOString(), runtime: process.version, platform: process.platform, architecture: process.arch, glibc: process.report.getReport().header.glibcVersionRuntime ?? null, count: entries.length, bytes: entries.reduce((sum, entry) => sum + entry.bytes, 0), success: !failure, error: failure?.message ?? null, entries }, null, 2) + '\n', { flag: 'wx' });
}
if (failure) throw failure;
console.log(JSON.stringify({ passed: entries.length, bytes: 486014, actualLocalStandalone: true, nativeMuslQualification: false }));
