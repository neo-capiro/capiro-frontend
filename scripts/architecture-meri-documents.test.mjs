import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectSources } from './architecture.mjs';

const route = 'apps/web/src/app/api/documents/[operation]/route.ts';
const config = 'apps/web/src/shared/meri-documents/config.ts';
const proxy = 'apps/web/src/shared/meri-documents/proxy.ts';
const files = () => new Map([
  [route, "import { auth } from '@clerk/nextjs/server'; import '@/shared/meri-documents/config'; import { proxyDocumentRequest } from '@/shared/meri-documents/proxy'; export const POST = proxyDocumentRequest;"],
  [config, 'export const readDocumentConfig = () => ({});'],
  [proxy, 'export const proxyDocumentRequest = () => new Response();'],
]);
test('document routes retain exact auth/config/proxy ownership', () => {
  assert.deepEqual(inspectSources(files()).errors, []);
  for (const target of ['features/meri/files/private', 'shared/meri-actions/workflow-adapter']) {
    const bad = files();
    bad.set(route, `import '@/${target}';`);
    bad.set(`apps/web/src/${target}.ts`, 'export const fixture = 1;');
    assert.ok(inspectSources(bad).errors.some(value => value.includes('server adapter dependency')));
  }
});
test('document allocation does not admit upload/list routes or a large handler', () => {
  for (const operation of ['upload', 'list']) {
    const bad = files();
    bad.set(route.replace('[operation]', operation), bad.get(route));
    assert.ok(inspectSources(bad).errors.some(value => value.includes('backend route handler is not allocated')));
  }
  const bad = files();
  bad.set(route, `export function POST(){\n${'void 0;\n'.repeat(81)}}`);
  assert.ok(inspectSources(bad).errors.some(value => value.includes('server adapter must stay thin')));
});
test('only published document package exports cross the receiving boundary', () => {
  const file = 'apps/web/src/shared/meri-documents/fixture.ts';
  for (const specifier of ['@capiro/meri-contracts/document-application', '@capiro/meri-contracts/document-application/schema']) {
    assert.deepEqual(inspectSources(new Map([[file, `import '${specifier}';`]])).errors, []);
  }
  for (const specifier of ['@capiro/meri-contracts/document-application/download.mjs', 'meri-greenfield/apps/control/document-application']) {
    assert.ok(inspectSources(new Map([[file, `import '${specifier}';`]])).errors.length > 0);
  }
});

const linkRoute = 'apps/web/src/app/api/documents/links/[action]/route.ts';
const linkProxy = 'apps/web/src/shared/meri-documents/link-proxy.ts';
const linkFiles = () => new Map([
  [linkRoute, "import { auth } from '@clerk/nextjs/server'; import '@/shared/meri-documents/config'; import { proxyDocumentLinkRequest } from '@/shared/meri-documents/link-proxy'; export const POST = proxyDocumentLinkRequest;"],
  [config, 'export const readDocumentConfig = () => ({});'],
  [linkProxy, 'export const proxyDocumentLinkRequest = () => new Response();'],
]);
test('signed download links get exactly one thin route over their own fixed proxy', () => {
  assert.deepEqual(inspectSources(linkFiles()).errors, []);
  const borrowed = linkFiles();
  borrowed.set(linkRoute, "import '@/shared/meri-documents/proxy';");
  borrowed.set(proxy, 'export const proxyDocumentRequest = () => new Response();');
  assert.ok(inspectSources(borrowed).errors.some(value => value.includes('server adapter dependency')));
  const sibling = linkFiles();
  sibling.set(linkRoute.replace('[action]', 'issue'), sibling.get(linkRoute));
  assert.ok(inspectSources(sibling).errors.some(value => value.includes('backend route handler is not allocated')));
});
