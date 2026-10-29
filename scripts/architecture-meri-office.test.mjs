import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectSources} from './architecture.mjs';

const route='apps/web/src/app/api/meri/office/[operation]/route.ts';
const sources=()=>new Map([
 [route,"import {auth} from '@clerk/nextjs/server'; import '@/shared/meri-office/config'; import '@/shared/meri-office/proxy'; import {previewBackendRejection} from '@/shared/preview/backend-policy.server'; export const POST=()=>new Response();"],
 ['apps/web/src/shared/meri-office/config.ts','export const configuration=true;'],
 ['apps/web/src/shared/meri-office/proxy.ts',"import '@capiro/meri-contracts/office-application';"],
 ['apps/web/src/shared/preview/backend-policy.server.ts','export const previewBackendRejection=()=>null;'],
]);
test('Office uses the exact public receiver and thin authenticated server adapter',()=>{
 assert.deepEqual(inspectSources(sources()).errors,[]);
 for(const target of ['@capiro/meri-contracts/office-application/receive.mjs','meri-greenfield/apps/control/office-application']){
  const files=sources();files.set('apps/web/src/shared/meri-office/proxy.ts',`import '${target}';`);
  assert.ok(inspectSources(files).errors.length>0);
 }
});
test('Office allocation does not permit another route or a borrowed document owner',()=>{
 const borrowed=sources();borrowed.set(route,"import '@/shared/meri-documents/proxy';");
 borrowed.set('apps/web/src/shared/meri-documents/proxy.ts','export const owner=true;');
 assert.ok(inspectSources(borrowed).errors.some(error=>error.includes('server adapter dependency')));
 const other=sources();other.set(route.replace('[operation]','unallocated'),other.get(route));other.delete(route);
 assert.ok(inspectSources(other).errors.some(error=>error.includes('not allocated')));
});
