import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectSources } from './architecture.mjs';

test('accepted Wave 2 public receivers do not expose nested or private runtime paths', () => {
  const consumer = 'apps/web/src/shared/meri-actions/fixture.ts';
  for (const name of ['conversation-lifecycle', 'routines-application', 'objective-generation', 'task-command-application']) {
    const specifier = `@capiro/meri-contracts/${name}`;
    assert.deepEqual(inspectSources(new Map([[consumer, `import '${specifier}';`]])).errors, []);
    for (const denied of [`${specifier}/schema`, `${specifier}/receive`, `@capiro/meri-contracts/private/${name}`, `meri-greenfield/apps/control/${name}`]) {
      assert.ok(inspectSources(new Map([[consumer, `import '${denied}';`]])).errors.length > 0, denied);
    }
  }
});

test('existing action route admits only its canonical routine route adapter', () => {
  const route = 'apps/web/src/app/api/action-followthrough/[operation]/route.ts';
  const adapter = 'apps/web/src/shared/meri-routines/routes.ts';
  const files = new Map([[route, "import { routeRoutineAction } from '@/shared/meri-routines/routes';"], [adapter, 'export const routeRoutineAction = () => null;']]);
  assert.deepEqual(inspectSources(files).errors, []);
  for (const denied of ['apps/web/src/app/api/routines/[operation]/route.ts', route.replace('[operation]', 'approve')]) {
    assert.ok(inspectSources(new Map([[denied, files.get(route)], [adapter, files.get(adapter)]])).errors.some(value => value.includes('not allocated')), denied);
  }
  const privateAdapter = adapter.replace('/routes.ts', '/private.ts');
  assert.ok(inspectSources(new Map([[route, "import '@/shared/meri-routines/private';"], [privateAdapter, 'export {};']])).errors.some(value => value.includes('server adapter dependency')));
});

test('only the two existing server gateways import the one Core session helper', () => {
  const helper = 'apps/web/src/shared/preview/core-session-authentication.ts';
  const source = "import { coreSessionAuthentication } from '@/shared/preview/core-session-authentication';";
  const inspect = (from, text, target = helper) => inspectSources(new Map([[from, text], [target, 'export {};']])).errors;
  for (const owner of ['apps/web/src/shared/capiro/gateway.ts', 'apps/web/src/shared/portfolio/api/proxy.ts']) {
    assert.deepEqual(inspect(owner, source), []);
    for (const denied of [
      `'use client'; ${source}`,
      "import * as helpers from '@/shared/preview/core-session-authentication';",
      "import helper from '@/shared/preview/core-session-authentication';",
      "import { coreSessionAuthentication, extra } from '@/shared/preview/core-session-authentication';",
      "import '@/shared/preview/core-session-authentication';",
      "export * from '@/shared/preview/core-session-authentication';",
    ]) assert.ok(inspect(owner, denied).some(value => value.includes('preview policy')), denied);
    assert.ok(inspect(owner, "import { coreSessionAuthentication } from '@/shared/preview/private';", helper.replace('core-session-authentication.ts', 'private.ts')).some(value => value.includes('preview policy')));
  }
  for (const denied of ['apps/web/src/features/portfolio/private.ts', 'apps/web/src/shared/session/private.ts', 'apps/web/src/shared/capiro/other.ts']) {
    assert.ok(inspect(denied, source).some(value => value.includes('preview policy')), denied);
  }
});
