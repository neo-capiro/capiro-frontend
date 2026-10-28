import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectSources} from './architecture.mjs';

test('only the fixed notification GET adapter receives its existing server dependencies',()=>{
 const path='apps/web/src/app/api/meri/notifications/route.ts';
 const source=readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const peers=['preview/backend-policy.server','meri-notifications/memory-proxy.server'].map(name=>['apps/web/src/shared/'+name+'.ts','export {};']);
 assert.deepEqual(inspectSources(new Map([[path,source],...peers])).errors,[]);
 for(const sibling of ['notification-send','notifications-admin']){
  assert.ok(inspectSources(new Map([[path.replace('/notifications/','/'+sibling+'/'),source],...peers])).errors.some(error=>error.includes('backend route handler is not allocated')));
 }
});
