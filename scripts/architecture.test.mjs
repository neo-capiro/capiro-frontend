import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectSources } from './architecture.mjs';
import { canonicalTransferSource, transferCommit, transferPath, transferSourceRoot } from './architecture/transfer-baseline.mjs';

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
  const files = new Map([['apps/web/src/features/meri/A.ts', "import '../modules/B'; import '@capiro/ui/vendor/button'; import 'meri-greenfield/apps/private';"], ['apps/web/src/features/modules/B.ts', "import '../meri/A';"]]);
  const errors = inspectSources(files).errors.join('\n');
  for (const finding of ['private cross-feature', 'Import cycle', 'non-public package', 'restricted runtime/repository']) assert.ok(errors.includes(finding), finding);
});
test('rejects computed loading and undeclared server endpoints', () => {
  const errors = inspectSources(new Map([['apps/web/src/app/api/fake/route.ts', 'export async function GET(){return import(process.env.MODULE);}']])).errors;
  assert.ok(errors.some(value => value.includes('computed import'))); assert.ok(errors.some(value => value.includes('backend route')));
});
test('an unallocated backend route cannot bypass the guard by changing source extension', () => {
  for (const extension of ['ts', 'tsx', 'js', 'jsx']) {
    const errors = inspectSources(new Map([[`apps/web/src/app/api/fake/route.${extension}`, 'export function GET() { return new Response(); }']])).errors;
    assert.ok(errors.some(value => value.includes('backend route')), extension);
  }
});
test('allocated Modules and Settings may use shared adapters and the narrow Capiro gateway', () => {
  const files = new Map([
    ['apps/web/src/features/modules/Directory.tsx', "import '../../shared/capiro/client';"],
    ['apps/web/src/features/settings/Profile.tsx', "import '../../shared/capiro/client';"],
    ['apps/web/src/shared/capiro/client.ts', 'export const client = 1;'],
    ['apps/web/src/shared/capiro/gateway.ts', 'export const gateway = 1;'],
    ['apps/web/src/app/api/capiro/[operation]/route.ts', "import '../../../../shared/capiro/gateway';"],
  ]);
  assert.deepEqual(inspectSources(files).errors, []);
});
test('size and function thresholds require explicit review instead of silent exceptions', () => {
  const source = `export function oversized(){\n${'void 0;\n'.repeat(401)}}`;
  assert.equal(inspectSources(new Map([['apps/web/src/features/meri/large.ts', source]])).signals.length, 2);
});
test('authored stylesheets retain the same file-size review threshold', () => {
  const result = inspectSources(new Map([['apps/web/src/features/modules/view.module.css', '.view {}\n'.repeat(401)]]));
  assert.deepEqual(result.signals, ['apps/web/src/features/modules/view.module.css: 401 nonblank lines require review']);
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

test('all assigned product features are allocated', () => {
  const portfolio = inspectSources(new Map([['apps/web/src/features/portfolio/objectives/public.ts', 'export const fixture = 1;']]));
  assert.deepEqual(portfolio.errors, []);
  for (const feature of ['modules', 'settings']) {
    assert.deepEqual(inspectSources(new Map([[`apps/web/src/features/${feature}/public.ts`, 'export const fixture = 1;']])).errors, []);
  }
});

test('relative and alias imports cannot reverse foundation or route composition direction', () => {
  const shared = 'apps/web/src/shared/portfolio/auth/session.ts';
  const feature = 'apps/web/src/features/portfolio/objectives/ObjectiveEditor.tsx';
  const route = 'apps/web/src/app/(portfolio)/page.tsx';
  for (const specifier of ['@/features/portfolio/objectives/ObjectiveEditor', '../../../features/portfolio/objectives/ObjectiveEditor']) {
    for (const source of [`import '${specifier}';`, `export * from '${specifier}';`, `void import('${specifier}');`, `type View = import('${specifier}').View;`]) {
      const errors = inspectSources(new Map([[shared, source], [feature, 'export const View = 1;']])).errors;
      assert.ok(errors.some(error => error.includes('foundations import')), source);
    }
  }
  assert.ok(inspectSources(new Map([[shared, "import '@/app/(portfolio)/page';"], [route, 'export default 1;']])).errors.some(error => error.includes('foundations import')));
  assert.ok(inspectSources(new Map([[feature, "import '@/app/(portfolio)/page';"], [route, 'export default 1;']])).errors.some(error => error.includes('feature imports app composition')));
});

test('Portfolio domains cross only deliberate public entries while routes compose views', () => {
  const from = 'apps/web/src/features/portfolio/objectives/Page.tsx';
  const route = 'apps/web/src/app/(portfolio)/page.tsx';
  for (const target of ['public.ts', 'summary-public.ts', 'nested/public.ts']) {
    const to = `apps/web/src/features/portfolio/billing/${target}`;
    for (const specifier of [`@/features/portfolio/billing/${target.replace('.ts', '')}`, `../billing/${target.replace('.ts', '')}`]) {
      assert.deepEqual(inspectSources(new Map([[from, `import '${specifier}';`], [to, 'export const fixture = 1;']])).errors, []);
    }
  }
  const privateView = 'apps/web/src/features/portfolio/billing/Summary.tsx';
  for (const source of ["import '@/features/portfolio/billing/Summary';", "export * from '../billing/Summary';", "void import('../billing/Summary');"]) {
    assert.ok(inspectSources(new Map([[from, source], [privateView, 'export default 1;']])).errors.some(error => error.includes('private Portfolio domain')));
  }
  assert.deepEqual(inspectSources(new Map([[route, "import '@/features/portfolio/billing/Summary';"], [privateView, 'export default 1;']])).errors, []);
});

test('Portfolio and Meri keep private feature boundaries in both directions', () => {
  for (const [from, to] of [
    ['apps/web/src/features/meri/Home.tsx', 'apps/web/src/features/portfolio/objectives/public.ts'],
    ['apps/web/src/features/portfolio/objectives/Page.tsx', 'apps/web/src/features/meri/Home.tsx'],
  ]) {
    const specifier = `@/${to.slice('apps/web/src/'.length).replace(/\.tsx?$/, '')}`;
    const errors = inspectSources(new Map([[from, `import '${specifier}';`], [to, 'export const fixture = 1;']])).errors;
    assert.ok(errors.some(error => error.includes('private cross-feature')));
  }
});

test('aliases resolve emitted JS and expose cycles or cross-owner access', () => {
  const first = 'apps/web/src/features/portfolio/objectives/first.ts';
  const second = 'apps/web/src/features/portfolio/objectives/second.ts';
  const files = new Map([[first, "import '@/features/portfolio/objectives/second.js';"], [second, "import './first';"]]);
  const result = inspectSources(files);
  assert.deepEqual(result.graph[first], [second]);
  assert.ok(result.errors.some(error => error.includes('Import cycle')));
  files.set(first, "import '@/features/portfolio/objectives/missing';");
  assert.ok(inspectSources(files).errors.some(error => error.includes('unresolved or outside-app')));
  const client = 'packages/meri-client/src/projection.ts';
  assert.deepEqual(inspectSources(new Map([[client, "import '@/features/portfolio/objectives/second';"], [second, 'export const fixture = 1;']])).errors,
    [`${client}: private cross-owner import ${second}; use an approved public package export`]);
});

test('only the allocated thin server adapters can import their narrow dependencies', () => {
  const backend = 'apps/web/src/app/api/backend/[service]/[...path]/route.ts';
  const health = 'apps/web/src/app/healthz/route.ts';
  const files = new Map([
    [backend, "import { auth } from '@clerk/nextjs/server'; import { readConfig } from '@/shared/portfolio/config/config'; import { proxyRequest } from '@/shared/portfolio/api/proxy'; export const GET = proxyRequest;"],
    [health, "export function GET() { return Response.json({status:'ok'}); }"],
    ['apps/web/src/shared/portfolio/config/config.ts', 'export const readConfig = () => ({});'],
    ['apps/web/src/shared/portfolio/api/proxy.ts', 'export const proxyRequest = () => new Response();'],
  ]);
  assert.deepEqual(inspectSources(files).errors, []);
  files.set(backend, "import '@/features/portfolio/objectives/public';");
  files.set('apps/web/src/features/portfolio/objectives/public.ts', 'export const fixture = 1;');
  assert.ok(inspectSources(files).errors.some(error => error.includes('server adapter dependency')));
  files.set(backend, `export function GET(){\n${'void 0;\n'.repeat(81)}}`);
  assert.ok(inspectSources(files).errors.some(error => error.includes('server adapter must stay thin')));
  files.set(health, "import 'some-server-sdk';");
  assert.ok(inspectSources(files).errors.some(error => error.includes('server adapter dependency')));
});

test('Portfolio keeps typed boundaries and configured origins across feature, foundation and route sources', () => {
  for (const file of [
    'apps/web/src/features/portfolio/objectives/contracts.ts',
    'apps/web/src/shared/portfolio/api/http.ts',
    'apps/web/src/app/(portfolio)/sign-in/page.tsx',
    'apps/web/src/proxy.ts',
  ]) {
    const errors = inspectSources(new Map([[file, "export const origin: any = 'https://private.example/api';"]])).errors;
    assert.ok(errors.some(error => error.includes('untyped any')));
    assert.ok(errors.some(error => error.includes('hardcoded remote origin')));
    assert.deepEqual(inspectSources(new Map([[file, "export const origins: unknown = ['http://localhost:3000', 'http://127.0.0.1/path'];"]])).errors, []);
  }
  assert.deepEqual(inspectSources(new Map([['apps/web/src/features/meri/fixture.ts', "export const fixture: any = 'https://synthetic.example';"]])).errors, []);
});

test('remote origins cannot hide behind template literals or deceptive localhost authorities', () => {
  const file = 'apps/web/src/shared/portfolio/api/http.ts';
  for (const source of [
    'const origin = `https://fixed.example`;',
    'const path = `https://fixed.example/api/${value}`;',
    'const query = `https://fixed.example?value=${value}`;',
    "const origin = 'http://localhost.example/';",
    "const origin = 'http://localhost:80@remote.example/';",
  ]) assert.ok(inspectSources(new Map([[file, source]])).errors.some(error => error.includes('hardcoded remote origin')));
  assert.deepEqual(inspectSources(new Map([[file, 'const normalizedUserUrl = `https://${userInput}`;']])).errors, []);
});

test('type imports, require calls and computed loads preserve package and feature boundaries', () => {
  const file = 'apps/web/src/features/portfolio/objectives/source.ts';
  for (const source of ["type Private = import('@capiro/meri-contracts/node').Private;", "const privateModule = require('@capiro/meri-contracts/node');", "import Private = require('@capiro/meri-contracts/node');"]) {
    assert.ok(inspectSources(new Map([[file, source]])).errors.some(error => error.includes('non-public package')));
  }
  for (const source of ['const loaded = require(moduleName);', 'void import(moduleName);']) {
    assert.ok(inspectSources(new Map([[file, source]])).errors.some(error => error.includes('computed import')));
  }
});

const oversized = (name = 'Example', statement = 'void 0;') => `export function ${name}(){\n${`${statement}\n`.repeat(81)}}`;
const transferFixture = (file, findings) => ({
  version: 1, commit: transferCommit, sourceRoot: transferSourceRoot,
  findings: findings.map(finding => ({ ...finding, originalFile: `${transferSourceRoot}features/objectives/${file.split('/').at(-1)}` })),
});

test('inherited unchanged size findings stay reported and unreviewed without pretending approval', () => {
  const file = 'apps/web/src/features/portfolio/objectives/Example.ts';
  const files = new Map([[file, oversized()]]);
  const before = inspectSources(files);
  const baseline = transferFixture(file, before.sizeFindings);
  const result = inspectSources(files, undefined, { baseline });
  assert.equal(result.signals.length, 1);
  assert.equal(result.sizeFindings[0].provenance, 'inherited-unchanged');
  assert.equal(result.sizeFindings[0].reviewStatus, 'unreviewed');
  assert.equal(result.sizeSummary.reviewed, 0);
  assert.equal(result.sizeSummary.inheritedUnreviewed, 1);
  assert.equal(result.sizeSummary.blocking, 0);
  files.set(file, oversized('Example', 'void 1;'));
  const changed = inspectSources(files, undefined, { baseline });
  assert.equal(changed.sizeFindings[0].provenance, 'changed-since-transfer');
  assert.equal(changed.sizeSummary.blocking, 1);
});

test('provenance cannot approve a new path, different commit or unrelated Meri source', () => {
  const file = 'apps/web/src/features/portfolio/objectives/Example.ts';
  const files = new Map([[file, oversized()]]);
  const baseline = transferFixture(file, inspectSources(files).sizeFindings);
  assert.equal(inspectSources(new Map([[file.replace('Example.ts', 'Copied.ts'), oversized()]]), undefined, { baseline }).sizeSummary.blocking, 1);
  const wrongCommit = inspectSources(files, undefined, { baseline: { ...baseline, commit: 'some-other-tree' } });
  assert.ok(wrongCommit.errors.some(error => error.includes('pinned Portfolio transfer')));
  assert.equal(wrongCommit.sizeSummary.blocking, 1);
  const meri = 'apps/web/src/features/meri/Example.ts';
  const wrongOwner = { ...baseline, findings: baseline.findings.map(finding => ({ ...finding, file: meri })) };
  const result = inspectSources(new Map([[meri, oversized()]]), undefined, { baseline: wrongOwner });
  assert.ok(result.errors.some(error => error.includes('Invalid transferred size provenance')));
  assert.equal(result.sizeSummary.blocking, 1);
});

test('explicit size reviews bind one exact function and reopen after a body or signature change', () => {
  const file = 'apps/web/src/features/portfolio/objectives/Example.ts';
  const files = new Map([[file, oversized()]]);
  const finding = inspectSources(files).sizeFindings[0];
  const reviews = [{ ...finding, reason: 'Inspected cohesive fixture composition.', reviewedBy: 'test', reviewedOn: '2026-10-11' }];
  const accepted = inspectSources(files, undefined, { reviews });
  assert.equal(accepted.signals.length, 1);
  assert.equal(accepted.sizeFindings[0].reviewStatus, 'reviewed');
  assert.equal(accepted.sizeSummary.blocking, 0);
  for (const source of [oversized('Example', 'void 1;'), oversized().replace('Example()', 'Example(value: unknown)')]) {
    const changed = inspectSources(new Map([[file, source]]), undefined, { reviews });
    assert.equal(changed.sizeFindings[0].reviewStatus, 'changed-since-review');
    assert.equal(changed.sizeSummary.blocking, 1);
  }
  files.set(file, `${oversized()}\n${oversized('Another')}`);
  assert.equal(inspectSources(files, undefined, { reviews }).sizeSummary.blocking, 1);
  assert.equal(inspectSources(new Map([[file, oversized()]]), undefined, { reviews: [{ ...reviews[0], reason: '' }] }).sizeSummary.blocking, 1);
});

test('file reviews never approve an unreviewed oversized function within the file', () => {
  const file = 'apps/web/src/features/portfolio/objectives/Example.ts';
  const files = new Map([[file, `export function Example(){\n${'void 0;\n'.repeat(401)}}`]]);
  const findings = inspectSources(files).sizeFindings;
  const reviews = [{ ...findings.find(finding => finding.kind === 'file'), reason: 'File responsibility inspected.', reviewedBy: 'test', reviewedOn: '2026-10-11' }];
  const result = inspectSources(files, undefined, { reviews });
  assert.equal(result.signals.length, 2);
  assert.equal(result.sizeSummary.reviewed, 1);
  assert.equal(result.sizeSummary.blocking, 1);
});

test('duplicate or incomplete review evidence fails instead of silently choosing an allowance', () => {
  const file = 'apps/web/src/features/portfolio/objectives/Example.ts';
  const files = new Map([[file, oversized()]]);
  const review = { ...inspectSources(files).sizeFindings[0], reason: 'Inspected one rendering responsibility.', reviewedBy: 'test', reviewedOn: '2026-10-11' };
  assert.ok(inspectSources(files, undefined, { reviews: [review, review] }).errors.some(error => error.includes('Duplicate explicit size review')));
  const missingReviewer = inspectSources(files, undefined, { reviews: [{ ...review, reviewedBy: '' }] });
  assert.ok(missingReviewer.errors.some(error => error.includes('Invalid explicit size review')));
  assert.equal(missingReviewer.sizeSummary.blocking, 1);
});

test('an invalidated explicit review is not silently replaced by unchanged transfer provenance', () => {
  const file = 'apps/web/src/features/portfolio/objectives/Example.ts';
  const files = new Map([[file, oversized()]]);
  const baseline = transferFixture(file, inspectSources(files).sizeFindings);
  const previouslyReviewed = inspectSources(new Map([[file, oversized('Example', 'void 1;')]])).sizeFindings[0];
  const result = inspectSources(files, undefined, { baseline, reviews: [{ ...previouslyReviewed, reason: 'A later implementation was inspected.', reviewedBy: 'test', reviewedOn: '2026-10-11' }] });
  assert.equal(result.sizeFindings[0].provenance, 'inherited-unchanged');
  assert.equal(result.sizeFindings[0].reviewStatus, 'changed-since-review');
  assert.equal(result.sizeSummary.inheritedUnreviewed, 0);
  assert.equal(result.sizeSummary.blocking, 1);
});

test('transfer canonicalization changes only the exact agreed module paths', () => {
  const original = `${transferSourceRoot}features/portfolio/PortfolioIndex.tsx`;
  assert.equal(transferPath(original), 'apps/web/src/features/portfolio/index/PortfolioIndex.tsx');
  assert.equal(transferPath(`${transferSourceRoot}features/objectives/Page.tsx`), 'apps/web/src/features/portfolio/objectives/Page.tsx');
  assert.equal(transferPath(`${transferSourceRoot}shared/api/http.ts`), 'apps/web/src/shared/portfolio/api/http.ts');
  assert.equal(transferPath('apps/web/src/features/meri/Home.tsx'), null);
  const source = [
    "import '@/features/portfolio/public';", "export * from '@/features/objectives/public';",
    "void import('@/shared/api/http');", "const unchanged = '@/features/portfolio/public';",
  ].join('\n');
  const moved = canonicalTransferSource(original, source);
  assert.ok(moved.includes("import '@/features/portfolio/index/public'"));
  assert.ok(moved.includes("export * from '@/features/portfolio/objectives/public'"));
  assert.ok(moved.includes("import('@/shared/portfolio/api/http')"));
  assert.ok(moved.includes("const unchanged = '@/features/portfolio/public'"));
});

test('newsletter browser boundary admits only its two governed public subpaths', () => {
  const file = 'apps/web/src/features/modules/workspace/Newsletter.ts';
  const accepted = "import '@capiro/shared/newsletter'; import '@capiro/shared/newsletter-render';";
  assert.deepEqual(inspectSources(new Map([[file, accepted]])).errors, []);
  for (const specifier of ['@capiro/shared', '@capiro/shared/money', '@capiro/shared/newsletter-fonts', '@capiro/shared/src/newsletter', '@capiro/shared/dist/newsletter']) {
    assert.ok(inspectSources(new Map([[file, `import '${specifier}';`]])).errors.some(error => error.includes('non-public package')), specifier);
  }
});
