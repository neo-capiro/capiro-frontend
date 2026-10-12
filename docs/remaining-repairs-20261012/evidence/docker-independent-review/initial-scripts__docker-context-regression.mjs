import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const canaries = new Map([
  ['work/context-canary.txt', false],
  ['node_modules/context-canary.js', false],
  ['apps/web/node_modules/context-canary.js', false],
  ['.next/context-canary.txt', false],
  ['apps/web/.next/context-canary.txt', false],
  ['.env', false], ['.env.local', false],
  ['apps/web/.env', false], ['apps/web/.env.local', false],
  ['.env.example', true], ['apps/web/.env.example', true],
  ['outputs/context-canary.txt', false],
  ['evidence/context-canary.txt', false],
  ['docs/context-canary.md', false],
  ['test-results/context-canary.json', false],
  ['apps/web/test-results/context-canary.json', false],
  ['playwright-report/context-canary.html', false],
  ['apps/web/playwright-report/context-canary.html', false],
  ['.git/context-canary', false],
  ['apps/web/.qa/context-canary', false],
  ['apps/web/context-canary.tsbuildinfo', false],
]);

function prepareFixture(context, ignorePath) {
  const files = execFileSync('git', ['ls-files', '-z', '--', 'apps/web/src'], { cwd: root })
    .toString().split('\0').filter(path => path.split('/').includes('work'));
  assert.ok(files.some(path => path.endsWith('/work/public.ts')), 'canonical Work public entry must be tracked');
  assert.ok(files.some(path => path.endsWith('/work/page.tsx')), 'Portfolio Work route must be tracked');
  const records = files.map(path => ({ path, included: true, bytes: readFileSync(join(root, path)) }));
  for (const [path, included] of canaries) {
    records.push({ path, included, bytes: Buffer.from('Synthetic Docker context regression canary; no credentials.\n') });
  }
  for (const item of records) {
    const target = join(context, item.path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, item.bytes, { flag: 'wx' });
  }
  const ignore = readFileSync(ignorePath);
  writeFileSync(join(context, '.dockerignore'), ignore, { flag: 'wx' });
  return { records, ignoreSha256: hash(ignore) };
}

export function verifyDockerContext({ artifactRoot, ignorePath = join(root, '.dockerignore') }) {
  artifactRoot = resolve(artifactRoot);
  assert.ok(artifactRoot !== root && !artifactRoot.startsWith(root + sep), 'artifact directory must be outside checkout');
  assert.ok(!existsSync(artifactRoot), 'artifact directory must be new; prior evidence is preserved');
  const context = join(artifactRoot, 'fixture'), output = join(artifactRoot, 'output');
  mkdirSync(context, { recursive: true });
  const { records, ignoreSha256 } = prepareFixture(context, ignorePath);
  const dockerfile = 'FROM scratch\nCOPY . /context/\n';
  writeFileSync(join(artifactRoot, 'Dockerfile'), dockerfile);
  const args = ['buildx', 'build', '--no-cache', '--progress=plain', '--output', `type=local,dest=${output}`, '-f', '-', context];
  const startedUTC = new Date().toISOString();
  const result = spawnSync('docker', args, { input: dockerfile, encoding: 'utf8', timeout: 120000, maxBuffer: 4 * 1024 * 1024 });
  writeFileSync(join(artifactRoot, 'build.stdout.log'), result.stdout ?? '');
  writeFileSync(join(artifactRoot, 'build.stderr.log'), result.stderr ?? '');
  const checks = records.map(item => {
    const path = join(output, 'context', item.path), present = existsSync(path);
    const expectedSha256 = hash(item.bytes), actualSha256 = present ? hash(readFileSync(path)) : null;
    return { path: item.path, expectedIncluded: item.included, present, expectedSha256, actualSha256,
      passed: result.status === 0 ? (item.included ? actualSha256 === expectedSha256 : !present) : null };
  });
  const report = { scope: 'Actual local Linux Docker/BuildKit context matching; scratch COPY only, no application or provider execution',
    sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root }).toString().trim(),
    scriptSha256: hash(readFileSync(fileURLToPath(import.meta.url))), ignoreSha256, startedUTC, endedUTC: new Date().toISOString(),
    command: ['docker', ...args], buildExitCode: result.status, signal: result.signal, errorCode: result.error?.code ?? null,
    requiredApplicationFiles: records.length - canaries.size, checks };
  writeFileSync(join(artifactRoot, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  assert.equal(result.status, 0, 'Docker context export failed; see preserved build logs');
  assert.ok(checks.every(check => check.passed), `Docker context violated: ${checks.filter(check => !check.passed).map(check => check.path).join(', ')}`);
  console.log(JSON.stringify({ artifactRoot, checks: checks.length, applicationFiles: report.requiredApplicationFiles, passed: true }));
  return report;
}

function main(args) {
  const usage = 'Usage: node scripts/docker-context-regression.mjs --artifacts NEW_DIRECTORY [--ignore DOCKERIGNORE]\nExit 0: checks pass; 1: context/build failure; 2: invalid arguments.\n';
  if (args.length === 1 && args[0] === '--help') { process.stdout.write(usage); return; }
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = { '--artifacts': 'artifactRoot', '--ignore': 'ignorePath' }[args[index]];
    if (!key || !args[index + 1] || args[index + 1].startsWith('--') || options[key]) { process.stderr.write(usage); process.exitCode = 2; return; }
    options[key] = resolve(args[index + 1]);
  }
  if (!options.artifactRoot) { process.stderr.write(usage); process.exitCode = 2; return; }
  try { verifyDockerContext(options); }
  catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main(process.argv.slice(2));
