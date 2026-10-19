import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inspectSources } from './architecture.mjs';

test('Hub can reuse the canonical adopted tooltip without access to private UI paths', () => {
  const file = 'apps/web/src/features/modules/hub/ModuleHub.tsx';
  const manifest = JSON.parse(readFileSync('packages/ui/package.json', 'utf8'));
  assert.equal(manifest.exports['./tooltip'], './src/shadcn/tooltip.tsx');
  assert.deepEqual(inspectSources(new Map([[file, "import { Tooltip } from '@capiro/ui/tooltip';"]])).errors, []);
  for (const entry of ['@capiro/ui/src/shadcn/tooltip', '@capiro/ui/tooltip/private', '@capiro/ui/vendor/tooltip']) {
    const errors = inspectSources(new Map([[file, `import '${entry}';`]])).errors;
    assert.equal(errors.filter(e => e.includes('non-public package')).length, 1, entry);
  }
});
