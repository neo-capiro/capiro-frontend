import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectSources} from './architecture.mjs';

const consumer='apps/web/src/shared/meri-selected-tab/access.ts';
test('selected-tab receiving uses the published package boundary',()=>{
 assert.deepEqual(inspectSources(new Map([[consumer,
  "import {receiveSelectedTabMessage} from '@capiro/meri-contracts/selected-tab-application';"]])).errors,[]);
});
test('selected-tab allocation does not admit private validators or extension implementations',()=>{
 for(const specifier of ['@capiro/meri-contracts/selected-tab-application/receive.mjs',
  'meri-greenfield/apps/browser-extension/selected-tab/bridge.mjs'])
  assert.ok(inspectSources(new Map([[consumer,`import '${specifier}';`]])).errors.length>0);
});
