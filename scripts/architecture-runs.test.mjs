import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectSources} from './architecture.mjs';

test('exact Runs native-read adapter is allocated without admitting sibling server routes',()=>{
 const path='apps/web/src/app/api/conversations/runs/[operation]/route.ts';
 const source=readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const peers=['preview/backend-policy.server','meri-conversations/config','meri-conversations/history-proxy','meri-runs/operations'].map(name=>['apps/web/src/shared/'+name+'.ts','export {};']);
 assert.deepEqual(inspectSources(new Map([[path,source],...peers])).errors,[]);
 for(const sibling of ['runs-write','runs-admin']){
  const errors=inspectSources(new Map([[path.replace('/runs/','/'+sibling+'/'),source],...peers])).errors;
  assert.ok(errors.some(error=>error.includes('backend route handler is not allocated')));
 }
});
