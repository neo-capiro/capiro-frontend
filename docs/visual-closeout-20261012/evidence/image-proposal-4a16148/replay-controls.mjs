// Replay the published immutable controls against a chosen installed checkout.
// Exit 0: tests passed; 1: test/setup failure; 2: invalid arguments.
import { readFileSync, writeFileSync, mkdirSync, symlinkSync, existsSync } from 'node:fs';
import { resolve, join, relative, isAbsolute } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

const usage = 'Usage: node replay-controls.mjs CHECKOUT PUBLISHED_EVIDENCE FRESH_OUTPUT portfolio|modules';
if (process.argv.length === 3 && process.argv[2] === '--help') {
  console.log(usage);
  process.exit(0);
}
const [checkoutArg, evidenceArg, outputArg, suite, ...extra] = process.argv.slice(2);
if (!checkoutArg || !evidenceArg || !outputArg || !['portfolio', 'modules'].includes(suite) || extra.length) {
  console.error(usage);
  process.exit(2);
}
const checkout = resolve(checkoutArg), evidence = resolve(evidenceArg), out = resolve(outputArg);
const outputRelative = relative(checkout, out);
if (!outputRelative || (!outputRelative.startsWith('..') && !isAbsolute(outputRelative)) || existsSync(out)) {
  console.error('Choose a fresh output directory outside the checkout. Existing evidence is preserved.');
  process.exit(2);
}
const canonical = readFileSync(join(evidence, 'development', suite, 'control.spec.ts'), 'utf8');
const hash = text => createHash('sha256').update(text).digest('hex');
const expected = suite === 'portfolio'
  ? '47a8faecfb55bea520d43748663014e64a12e684666486f49c14cc0edece25ea'
  : '01f43f1b255ef9c7125872d995f6f3ad38d7bc098a4b8d669c17d56fc8870285';
if (hash(canonical) !== expected) throw new Error('Published canonical control hash mismatch');
const substitutions = [];
const executed = canonical.replace(/(from\s+["'])\/workspace\/capiro-visual-closeout\/([^"']+)(["'])/g, (before, prefix, path, suffix) => {
  const after = prefix + join(checkout, path) + suffix;
  substitutions.push({ before, after });
  return after;
});
if (substitutions.length !== (suite === 'portfolio' ? 3 : 2)) throw new Error('Unexpected fixture import layout');
const git = args => execFileSync('git', args, { cwd: checkout, encoding: 'utf8' }).trim();
const source = { head: git(['rev-parse', 'HEAD']), srcTree: git(['rev-parse', 'HEAD:apps/web/src']), status: git(['status', '--porcelain']), canonicalSHA256: hash(canonical), executedSHA256: hash(executed), substitutions, assertionChanges: false };
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'package.json'), '{"type":"module"}\n');
symlinkSync(join(checkout, 'node_modules'), join(out, 'node_modules'), 'dir');
writeFileSync(join(out, 'canonical.spec.txt'), canonical);
writeFileSync(join(out, 'control.spec.ts'), executed);
writeFileSync(join(out, 'source.json'), JSON.stringify(source, null, 2) + '\n');
const config = join(checkout, suite === 'portfolio' ? 'apps/web/playwright.config.ts' : 'apps/web/test/browser/playwright.config.ts');
const server = join(checkout, suite === 'portfolio' ? 'apps/web/tests/browser/server.mjs' : 'apps/web/test/browser/server.mjs');
const wrapper = `import base from ${JSON.stringify(config)};\nimport {defineConfig} from '@playwright/test';\nexport default defineConfig({...base,testDir:${JSON.stringify(out)},testMatch:'control.spec.ts',grep:undefined,retries:0,outputDir:${JSON.stringify(join(out, 'artifacts'))},reporter:[['list'],['json',{outputFile:${JSON.stringify(join(out, 'results.json'))}}]],webServer:{...base.webServer,command:${JSON.stringify(`"${process.execPath}" "${server}"`)}}});\n`;
writeFileSync(join(out, 'playwright.config.ts'), wrapper);
const result = spawnSync(process.execPath, [join(checkout, 'node_modules/@playwright/test/cli.js'), 'test', '--config', join(out, 'playwright.config.ts')], { cwd: join(checkout, 'apps/web'), env: process.env, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
const log = (result.stdout ?? '') + (result.stderr ?? '');
writeFileSync(join(out, 'run.log'), log);
writeFileSync(join(out, 'execution.json'), JSON.stringify({ exitCode: result.status, signal: result.signal, error: result.error?.message, headAtFinish: git(['rev-parse', 'HEAD']), statusAtFinish: git(['status', '--porcelain']) }, null, 2) + '\n');
process.stdout.write(log);
process.exitCode = result.status ?? 1;
