import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readdirSync } from 'node:fs';

test('all nineteen exact design assets are local, nonempty, hash-bound and retain intrinsic SVG dimensions', () => {
  const manifest = JSON.parse(readFileSync(new URL('../design/home-assets.json', import.meta.url), 'utf8'));
  assert.equal(manifest.nodeId, '442:81437');
  assert.equal(manifest.baseline, 'fresh-header-quick-log-and-master-calendar');
  assert.equal(manifest.assets.length, 19);
  const directory = new URL('../public/design/home/', import.meta.url);
  assert.deepEqual(readdirSync(directory).sort(), manifest.assets.map(asset => asset.file).sort());
  for (const asset of manifest.assets) {
    assert.match(asset.file, /^[a-z-]+\.(svg|png)$/);
    const file = new URL(asset.file, directory);
    assert.ok(lstatSync(file).isFile()); assert.ok(!lstatSync(file).isSymbolicLink());
    const body = readFileSync(file);
    assert.ok(body.length > 0); assert.equal(body.length, asset.bytes);
    assert.equal(createHash('sha256').update(body).digest('hex'), asset.sha256);
    if (asset.mime === 'image/svg+xml') {
      const root = body.subarray(0, 2048).toString().match(/<svg\b[^>]*>/)?.[0];
      assert.ok(root);
      for (const [name, value] of Object.entries(asset.svgRoot)) assert.ok(root.includes(`${name}="${value}"`));
      assert.equal(asset.svgRoot.width, asset.file === 'profile.svg' ? '32' : '16');
      assert.equal(asset.svgRoot.height, asset.svgRoot.width);
    } else { assert.equal(asset.mime, 'image/png'); assert.equal(body.subarray(0, 8).toString('hex'), '89504e470d0a1a0a'); }
  }
});

test('no application source retains temporary Figma asset URLs or screenshot implementation imagery', () => {
  for (const relative of ['shared/shell/Header.tsx', 'shared/shell/Sidebar.tsx', 'shared/shell/DesignIcon.tsx', 'features/meri/MeriHome.tsx', 'features/meri/MeriComposer.tsx', 'features/meri/MeriSuggestions.tsx']) {
    const source = readFileSync(new URL(`../src/${relative}`, import.meta.url), 'utf8');
    assert.ok(!source.includes('figma.com/api/mcp/asset/')); assert.ok(!source.includes('home-442-81437.png'));
  }
});
