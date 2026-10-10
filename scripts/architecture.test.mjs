import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectSources } from './architecture.mjs';

test('discovers real route composition and accepts directed local imports', () => {
  const files = new Map([['apps/web/src/app/page.tsx', "import { Home } from '../features/meri/Home'; export default Home;"], ['apps/web/src/features/meri/Home.tsx', "import { Button } from '@capiro/ui/button'; export const Home=()=>null;"]]);
  const result = inspectSources(files); assert.deepEqual(result.errors, []); assert.deepEqual(result.routes, ['apps/web/src/app/page.tsx']);
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
