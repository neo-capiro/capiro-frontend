import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectSources} from './architecture.mjs';

test('exact usage read adapter allocation does not admit usage writes or admin siblings',()=>{
 const path='apps/web/src/app/api/conversations/usage-overview/route.ts';
 const source=readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const peers=['preview/backend-policy.server','meri-conversations/config','meri-conversations/history-proxy','meri-usage/operations'].map(name=>['apps/web/src/shared/'+name+'.ts','export {};']);
 assert.deepEqual(inspectSources(new Map([[path,source],...peers])).errors,[]);
 for(const sibling of ['usage-write','usage-admin'])assert.ok(inspectSources(new Map([[path.replace('/usage-overview/','/'+sibling+'/'),source],...peers])).errors.some(error=>error.includes('backend route handler is not allocated')));
});
