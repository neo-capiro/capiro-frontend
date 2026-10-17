import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectSources } from './architecture.mjs';

const route = 'apps/web/src/app/api/task-commands/[operation]/route.ts';
const config = 'apps/web/src/shared/meri-task-commands/config.ts';
const proxy = 'apps/web/src/shared/meri-task-commands/proxy.ts';
test('task command routing admits only thin canonical-auth/proxy composition', () => {
  const files = new Map([[route, "import {auth} from '@clerk/nextjs/server'; import {readTaskCommandConfig} from '@/shared/meri-task-commands/config'; import {proxyTaskCommandRequest} from '@/shared/meri-task-commands/proxy'; export const POST=proxyTaskCommandRequest;"], [config, 'export const readTaskCommandConfig=()=>({});'], [proxy, "import '@capiro/meri-client/task-commands'; export const proxyTaskCommandRequest=()=>new Response();"]]);
  assert.deepEqual(inspectSources(files).errors, []);
  files.set(route.replace('[operation]', 'approve'), files.get(route));
  assert.ok(inspectSources(files).errors.some(message => message.includes('backend route handler is not allocated')));
});
test('private or unapproved task contract paths remain unavailable', () => {
  for (const specifier of ['@capiro/meri-contracts/commands-0.2', '@capiro/meri-client/vendor/task-command-application'])
    assert.ok(inspectSources(new Map([[proxy, `import '${specifier}';`]])).errors.length);
});
