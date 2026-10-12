import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectSources } from './architecture.mjs';

test('discovers real route composition and accepts directed local imports', () => {
  const files = new Map([['apps/web/src/app/page.tsx', "import { Home } from '../features/meri/Home'; export default Home;"], ['apps/web/src/features/meri/Home.tsx', "import { Button } from '@capiro/ui/button'; export const Home=()=>null;"]]);
  const result = inspectSources(files); assert.deepEqual(result.errors, []); assert.deepEqual(result.routes, ['apps/web/src/app/page.tsx']);
});
test('run workspace admits only its three approved additional public seams', () => {
  const source = "import '@capiro/ui/conversation'; import '@capiro/ui/message'; import '@capiro/meri-client/projection';";
  assert.deepEqual(inspectSources(new Map([['apps/web/src/features/meri/workspace/View.tsx', source]])).errors, []);
  for (const specifier of ['@capiro/ui/src/ai-elements/message', '@capiro/ui/vendor/conversation', '@capiro/meri-client/src/projection', '@capiro/meri-client', '@capiro/meri-client/react']) {
    const errors = inspectSources(new Map([['apps/web/src/features/meri/workspace/View.tsx', `import '${specifier}';`]])).errors;
    assert.equal(errors.filter(error => error.includes('non-public package')).length, 1, specifier);
  }
});
test('rejects cycles, feature-private crossing, private package and external repository paths', () => {
  const files = new Map([['apps/web/src/features/meri/A.ts', "import '../portfolio/B'; import '@capiro/ui/vendor/button'; import 'meri-greenfield/apps/private';"], ['apps/web/src/features/portfolio/B.ts', "import '../meri/A';"]]);
  const errors = inspectSources(files).errors.join('\n');
  for (const finding of ['private cross-feature', 'Import cycle', 'non-public package', 'restricted runtime/repository', 'future feature implementation']) assert.ok(errors.includes(finding), finding);
});
test('rejects computed loading and undeclared server endpoints', () => {
  const errors = inspectSources(new Map([['apps/web/src/app/api/fake/route.ts', 'export async function GET(){return import(process.env.MODULE);}']])).errors;
  assert.ok(errors.some(value => value.includes('computed import'))); assert.ok(errors.some(value => value.includes('backend route')));
});
test('size and function thresholds require explicit review instead of silent exceptions', () => {
  const source = `export function oversized(){\n${'void 0;\n'.repeat(401)}}`;
  assert.equal(inspectSources(new Map([['apps/web/src/features/meri/large.ts', source]])).signals.length, 2);
});

test('browser client resolves emitted JS imports and refuses server or Node contract entries', () => {
  const good = new Map([['packages/meri-client/src/transport.ts', "import type {UIEvent} from '@capiro/meri-contracts'; import './projection.js';"], ['packages/meri-client/src/projection.ts', 'export const projection = 1;']]);
  assert.deepEqual(inspectSources(good).errors, []);
  good.set('packages/meri-client/src/transport.ts', "import '@capiro/meri-contracts/node'; import '@capiro/meri-ui-stream'; import '../../ui/src/private';");
  const errors = inspectSources(good).errors;
  assert.equal(errors.filter(value => value.includes('non-public package')).length, 2);
  assert.ok(errors.some(value => value.includes('unresolved or outside-app')));
});

test('resolved relative imports cannot cross application and package ownership in either direction', () => {
  const app = 'apps/web/src/app/page.tsx', client = 'packages/meri-client/src/projection.ts';
  for (const [from, to, specifier] of [[app, client, '../../../../packages/meri-client/src/projection.js'], [client, app, '../../../apps/web/src/app/page']]) {
    for (const source of [`import '${specifier}';`, `export * from '${specifier}';`, `void import('${specifier}');`]) {
      const result = inspectSources(new Map([[from, source], [to, 'export const fixture = 1;']]));
      assert.deepEqual(result.errors, [`${from}: private cross-owner import ${to}; use an approved public package export`]);
    }
  }
});

test('same-owner relative edges and explicitly approved public package imports stay valid', () => {
  const files = new Map([
    ['apps/web/src/app/page.tsx', "import '@capiro/meri-client/projection'; import '../features/meri/Home';"],
    ['apps/web/src/features/meri/Home.tsx', 'export const Home = 1;'],
    ['packages/meri-client/src/transport.ts', "import './projection.js';"],
    ['packages/meri-client/src/projection.ts', 'export const projection = 1;'],
  ]);
  const result = inspectSources(files, new Set(['@capiro/meri-client/projection']));
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.graph['apps/web/src/app/page.tsx'], ['apps/web/src/features/meri/Home.tsx']);
  assert.deepEqual(result.graph['packages/meri-client/src/transport.ts'], ['packages/meri-client/src/projection.ts']);
});
