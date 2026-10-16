// Trusted-checkout source/provenance binding for the two canonical packages.
// Importing this module performs no filesystem or application work.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, realpathSync } from 'node:fs';
import { dirname, join, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const HERE = dirname(fileURLToPath(import.meta.url));
export const BASELINE_SHA256 = 'd7f41d9ae3573698418debb27ea1eef7ffc4e0cf2445bb2c9aa0953acd02b9d1';
const PROJECT_UI_SOURCES = ['src/markdown.tsx'];
export const hash = raw => createHash('sha256').update(raw).digest('hex');
export const slash = path => path.split(sep).join('/');
export const workspaceRoot = root => resolve(root, '../..');
export const uiRoot = root => resolve(root, '../ui');
export const dependencyRoot = root => realpathSync(join(workspaceRoot(root), 'node_modules'));
export const readBounded = path => {
  assert.ok(statSync(path).size <= 32 * 1024 * 1024, 'file bound');
  return readFileSync(path);
};
export const record = (path, raw) => ({ path, bytes: raw.length, sha256: hash(raw) });

export function readSource(root, path) {
  assert.ok(/^(?:packages\/ui|packages\/qualification-elements)\/[A-Za-z0-9_./-]+$/.test(path));
  assert.ok(!path.split('/').some(x => !x || x === '.' || x === '..'), 'source path');
  return readBounded(join(workspaceRoot(root), path));
}

export function baseline(root = HERE) {
  const raw = readBounded(join(root, 'baseline/component-pins.json'));
  assert.equal(hash(raw), BASELINE_SHA256, 'immutable original component inventory');
  return JSON.parse(raw);
}

export function ownedFiles(root = HERE) {
  const base = workspaceRoot(root), rows = [];
  const visit = dir => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules') continue;
      assert.ok(!entry.isSymbolicLink(), 'source links are not owned files');
      const path = join(dir, entry.name);
      if (entry.isDirectory()) visit(path);
      else { assert.ok(entry.isFile(), 'source must be regular'); rows.push(slash(relative(base, path))); }
      assert.ok(rows.length <= 1000, 'source inventory bound');
    }
  };
  visit(uiRoot(root)); visit(root);
  return rows.sort();
}

export function verifyPromotedSources(root = HERE) {
  const original = baseline(root);
  const provenance = JSON.parse(readBounded(join(uiRoot(root), 'provenance.json')));
  assert.equal(provenance.schema, 'capiro-ui-source-promotion/1');
  assert.equal(provenance.sourceCommit, '089533104eb567899e79cddf7b400460395e6de0');
  assert.equal(provenance.baselinePinsSha256, BASELINE_SHA256);
  assert.equal(provenance.sources.length, 17);
  assert.deepEqual(provenance.sources.map(x => x.localPath).sort(), original.sources.map(x => x.localPath).sort());
  const promoted = new Set();
  for (const row of provenance.sources) {
    const old = original.sources.find(x => x.localPath === row.localPath);
    for (const key of Object.keys(old)) assert.deepEqual(row[key], old[key], 'original provenance retained');
    assert.ok(/^src\/(?:ai-elements|shadcn|lib)\/[a-z-]+\.tsx?$/.test(row.promotedPath));
    assert.ok(!promoted.has(row.promotedPath)); promoted.add(row.promotedPath);
    const raw = readBounded(join(uiRoot(root), row.promotedPath));
    assert.equal(raw.length, row.promotedBytes); assert.equal(hash(raw), row.promotedSha256);
    let text = new TextDecoder('utf-8', { fatal: true }).decode(raw);
    for (const item of row.importSpecifierChanges) {
      assert.match(item.from, /^@repo\/shadcn-ui\/(?:components\/ui\/[a-z-]+|lib\/utils)$/);
      assert.match(item.to, /^(?:\.\/|\.\.\/)(?:shadcn\/|lib\/)?[a-z-]+$/);
      assert.equal(text.split('"' + item.to + '"').length, 2, 'one quoted import occurrence');
      text = text.replace('"' + item.to + '"', '"' + item.from + '"');
    }
    assert.equal(hash(Buffer.from(text)), old.localSha256, 'only quoted module specifiers changed');
    assert.equal(Buffer.byteLength(text), old.localBytes);
  }
  const actual = ownedFiles(root).filter(x => x.startsWith('packages/ui/src/')).map(x => x.slice('packages/ui/'.length));
  assert.deepEqual(actual, [...promoted, ...PROJECT_UI_SOURCES].sort(), 'exact seventeen adopted and explicitly inventoried project UI sources');
  return provenance;
}

export function computePins(root = HERE) {
  verifyPromotedSources(root);
  const names = ownedFiles(root).filter(x => x !== 'packages/qualification-elements/promotion-pins.json');
  return {
    schema: 'capiro-elements-promotion/1',
    scope: 'Source/provenance inventory only; not browser/runtime/release qualification',
    baselineSha256: BASELINE_SHA256,
    projectAuthoredUi: PROJECT_UI_SOURCES.map(path => record(`packages/ui/${path}`, readBounded(join(uiRoot(root), path)))),
    ownedFiles: [...names, 'packages/qualification-elements/promotion-pins.json'].sort(),
    artifacts: names.map(path => record(path, readSource(root, path))),
    selfHashExcluded: 'packages/qualification-elements/promotion-pins.json',
  };
}

export function sourceRecords(root = HERE) {
  const pins = JSON.parse(readBounded(join(root, 'promotion-pins.json')));
  assert.deepEqual(pins, computePins(root), 'complete actual split-package source pins');
  return pins.ownedFiles.map(path => record(path, readSource(root, path)));
}
