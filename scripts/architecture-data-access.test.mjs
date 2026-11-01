import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectSources} from './architecture.mjs';

test('exact data-access native-read adapter is allocated without admitting sibling server routes',()=>{
 const path='apps/web/src/app/api/data-access/read/route.ts';
 const source=readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const peers=['preview/backend-policy.server','meri-conversations/config','meri-conversations/history-proxy','meri-data-access/read'].map(name=>['apps/web/src/shared/'+name+'.ts','export {};']);
 assert.deepEqual(inspectSources(new Map([[path,source],...peers])).errors,[]);
 for(const sibling of ['data-access/write','data-access/admin']){
  const errors=inspectSources(new Map([[path.replace('data-access/read','/'+sibling),source],...peers])).errors;
  assert.ok(errors.some(error=>error.includes('backend route handler is not allocated')));
 }
});
test('the intents adapter may read the actor-wide inbox through the native-read path and nothing else new',()=>{
 const path='apps/web/src/app/api/conversations/intents/[operation]/route.ts';
 const source=readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const peers=['preview/backend-policy.server','meri-intents/config','meri-intents/proxy','meri-intents/inbox','meri-conversations/config','meri-conversations/history-proxy'].map(name=>['apps/web/src/shared/'+name+'.ts','export {};']);
 assert.deepEqual(inspectSources(new Map([[path,source],...peers])).errors,[]);
 const widened=source.replace('"../../../../../shared/meri-intents/inbox"','"../../../../../shared/meri-intents/access"');
 assert.ok(inspectSources(new Map([[path,widened],...peers,['apps/web/src/shared/meri-intents/access.ts','export {};']])).errors.some(error=>error.includes('server adapter dependency is not allocated')));
});
