// Trusted-checkout source/provenance binding for the two canonical packages.
// Importing this module performs no filesystem or application work.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, realpathSync } from 'node:fs';
import { dirname, join, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const HERE = dirname(fileURLToPath(import.meta.url));
export const BASELINE_SHA256 = 'd7f41d9ae3573698418debb27ea1eef7ffc4e0cf2445bb2c9aa0953acd02b9d1';
export const AI_ELEMENTS_COMMIT = 'bc871264341cf54a7ea1fee36d951688ed2a1ff7';
export const SHADCN_COMMIT = '2d3f1cd436b18ea12f24130de4df781355925b08';
const PROJECT_UI_SOURCES = ['src/markdown.tsx', 'src/output-block.tsx', 'src/streaming-text.tsx'];
const ADDITION_LIMIT = 64;
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
  const additions = verifyAdditions(root, provenance, promoted);
  const actual = ownedFiles(root).filter(x => x.startsWith('packages/ui/src/')).map(x => x.slice('packages/ui/'.length));
  assert.deepEqual(actual, [...promoted, ...additions, ...PROJECT_UI_SOURCES].sort(), 'exact seventeen adopted, recorded additions and explicitly inventoried project UI sources');
  return provenance;
}

// Additions have no vendor copy: the inverse rewrite must hash to the recorded pinned upstream blob.
function verifyAdditions(root, provenance, promoted) {
  assert.equal(provenance.aiElementsCommit, AI_ELEMENTS_COMMIT);
  assert.equal(provenance.shadcnCommit, SHADCN_COMMIT);
  assert.ok(Array.isArray(provenance.additions) && provenance.additions.length <= ADDITION_LIMIT, 'bounded additions');
  const upstreamPrefix = `https://raw.githubusercontent.com/vercel/ai-elements/${AI_ELEMENTS_COMMIT}/`;
  const paths = [];
  for (const row of provenance.additions) {
    assert.ok(/^src\/(?:ai-elements|shadcn)\/[a-z-]+\.tsx$/.test(row.promotedPath));
    assert.ok(!promoted.has(row.promotedPath) && !paths.includes(row.promotedPath), 'unique promoted path');
    assert.equal(row.upstreamUrl, upstreamPrefix + row.upstreamPath);
    assert.ok(/^packages\/(?:elements\/src|shadcn-ui\/components\/ui)\/[a-z-]+\.tsx$/.test(row.upstreamPath));
    assert.equal(row.localSha256, row.upstreamSha256); assert.equal(row.localBytes, row.upstreamBytes);
    const raw = readBounded(join(uiRoot(root), row.promotedPath));
    assert.equal(raw.length, row.promotedBytes); assert.equal(hash(raw), row.promotedSha256);
    let text = new TextDecoder('utf-8', { fatal: true }).decode(raw);
    if (row.adaptation) {
      assert.equal(row.adaptation.importsExports, 'Preserved');
      assert.ok(typeof row.adaptation.owner === 'string' && typeof row.adaptation.reason === 'string');
      assert.ok(text.startsWith('"use client";\n\n' + row.adaptation.notice), 'prominent owner change notice');
      text = '"use client";\n\n' + text.slice('"use client";\n\n'.length + row.adaptation.notice.length);
      assert.ok(row.adaptation.edits.length >= 1 && row.adaptation.edits.length <= 16);
      for (const edit of [...row.adaptation.edits].reverse()) {
        const occurrences = edit.occurrences ?? 1;
        assert.ok(Number.isInteger(occurrences) && occurrences >= 1 && occurrences <= 8);
        assert.equal(text.split(edit.to).length, occurrences + 1, 'exact recorded adaptation occurrences');
        assert.equal(text.split(edit.from).length, 1, 'upstream text absent before inverse edit');
        text = text.split(edit.to).join(edit.from);
      }
      assert.ok(row.adaptation.changes.includes('Prominent owner change notice'));
    }
    for (const item of row.importSpecifierChanges) {
      assert.match(item.from, /^@repo\/shadcn-ui\/(?:components\/ui\/[a-z-]+|lib\/utils)$/);
      assert.match(item.to, /^(?:\.\/|\.\.\/)(?:shadcn\/|lib\/)?[a-z-]+$/);
      assert.equal(text.split('"' + item.to + '"').length, 2, 'one quoted import occurrence');
      text = text.replace('"' + item.to + '"', '"' + item.from + '"');
    }
    const original = Buffer.from(text);
    assert.equal(hash(original), row.upstreamSha256, 'only recorded specifiers and adaptation edits changed');
    assert.equal(original.length, row.upstreamBytes);
    assert.equal(createHash('sha1').update(`blob ${original.length}\0`).update(original).digest('hex'), row.upstreamBlobSha1);
    paths.push(row.promotedPath);
  }
  return paths;
}

export function adoptedFiles(root = HERE) {
  const provenance = verifyPromotedSources(root);
  return [...provenance.sources, ...provenance.additions].map(x => x.promotedPath).sort();
}

export function projectUiSources() { return [...PROJECT_UI_SOURCES]; }

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
