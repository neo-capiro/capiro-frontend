import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { buildSSR, selectSSRTool } from '../packages/qualification-elements/ssr-build.mjs';

const owner = fileURLToPath(new URL('../packages/qualification-elements', import.meta.url));
const pins = JSON.parse(readFileSync(join(owner, 'toolchain-pins.json'), 'utf8'));

test('native SSR selects exact Windows/x64/ARM pins without a fallback', () => {
  assert.deepEqual(pins.tools.map(tool => tool.platform), ['win32-x64', 'linux-x64', 'linux-arm64']);
  for (const platform of ['win32-x64', 'linux-x64', 'linux-arm64']) {
    const selected = selectSSRTool(pins, platform);
    assert.equal(selected.platform, platform);
    assert.equal(selected.version, '0.28.2');
    assert.equal(selected.package, `@esbuild/${platform}`);
    assert.equal(new URL(selected.archiveUrl).origin, 'https://registry.npmjs.org');
  }
  for (const platform of ['linux-arm', 'linux-ia32', 'darwin-arm64', 'win32-arm64', '', 'linux-arm64/../linux-x64'])
    assert.throws(() => selectSSRTool(pins, platform), /unsupported SSR tool platform/);
  assert.throws(() => selectSSRTool({ tools: pins.tools.slice(0, 2) }, 'linux-arm64'), /native SSR tool pin is missing/);
});

test('the official ARM pin is distinct and the two existing artifact pins are retained', () => {
  assert.deepEqual(pins.tools.map(tool => tool.binarySha256), [
    'c7bee37877d0aa6a046e52783fa0a2cf1a9ce5579d68bb3083bda99d4bff18ef',
    'e1698a3d5c6c0798fee4fd3b5cc816651f460c63d390a7a26ea4beb0b1884100',
    '90bd269553d258e80b19e3ccab4f98f0831f87442a2f056510ce24fd1b425fc2',
  ]);
  const arm = selectSSRTool(pins, 'linux-arm64');
  assert.equal(arm.archiveSha256, 'a96dbfa41d3ef5dbd1ef22b1c10d5187be9267e86093a870f06402a7ec931596');
  assert.equal(arm.binaryBytes, 10289264);
});

for (const corruption of ['size', 'hash']) {
  test(`the real build owner rejects wrong metadata ${corruption} before binary execution/output allocation`, () => {
    const selected = selectSSRTool(pins);
    const work = mkdtempSync(join(tmpdir(), 'capiro-elements-refusal-'));
    const tool = join(work, selected.platform), output = join(work, 'output');
    try {
      mkdirSync(tool);
      const bytes = Buffer.alloc(corruption === 'size' ? 1 : selected.metadataBytes);
      writeFileSync(join(tool, 'metadata.json'), bytes);
      // No archive or executable exists: the exact metadata refusal must occur first.
      assert.throws(() => buildSSR({ toolRoot: work, outputRoot: output, packageRoot: owner }), error => {
        assert.equal(error.code, 'ERR_ASSERTION');
        assert.equal(error.expected, corruption === 'size' ? selected.metadataBytes : selected.metadataSha256);
        return true;
      });
      assert.equal(existsSync(output), false);
      assert.deepEqual(readFileSync(join(tool, 'metadata.json')), bytes);
    } finally {
      assert.ok(resolve(work).startsWith(resolve(tmpdir()) + sep + 'capiro-elements-refusal-'));
      rmSync(work, { recursive: true, force: true });
    }
  });
}

test('moved journal suites retain canonical Vitest discovery and all twelve source controls', () => {
  const app = fileURLToPath(new URL('../apps/web', import.meta.url));
  const config = readFileSync(join(app, 'vitest.config.ts'), 'utf8');
  assert.ok(config.includes('tests/**/*.test.{ts,mjs}'));
  for (const [name, count] of [['meri-conversation-selection-journal', 4], ['meri-turn-recovery', 8]]) {
    assert.equal(existsSync(join(app, 'test', `${name}.test.mjs`)), false);
    const source = readFileSync(join(app, 'tests', `${name}.test.mjs`), 'utf8');
    assert.match(source, /import \{ test \} from "vitest"/);
    assert.equal(source.match(/^test\(/gm)?.length, count);
  }
});
