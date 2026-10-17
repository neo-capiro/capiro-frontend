import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectSources} from './architecture.mjs';

const route='apps/web/src/app/api/settings/user/[operation]/route.ts';
const config='apps/web/src/shared/meri-user-preferences/config.ts';
const proxy='apps/web/src/shared/meri-user-preferences/proxy.ts';
const files=()=>new Map([
 [route,"import {auth} from '@clerk/nextjs/server';import '@/shared/meri-user-preferences/config';import '@/shared/meri-user-preferences/proxy';export const POST=()=>new Response();"],
 [config,'export const config={};'],[proxy,'export const proxy=()=>new Response();'],
]);
test('personal settings has exactly its thin native-auth server allocation',()=>{
 assert.deepEqual(inspectSources(files()).errors,[]);
 for(const target of ['shared/meri-actions/proxy','features/settings/private']){
  const bad=files();bad.set(route,`import '@/${target}';`);bad.set(`apps/web/src/${target}.ts`,'export const fixture=1;');
  assert.ok(inspectSources(bad).errors.some(error=>error.includes('server adapter dependency')));
 }
 const broad=files();broad.set(route.replace('user','tenant'),broad.get(route));
 assert.ok(inspectSources(broad).errors.some(error=>error.includes('not allocated')));
});
test('only deliberate supplemental package export crosses the preferences boundary',()=>{
 const file='apps/web/src/shared/meri-user-preferences/fixture.ts';
 assert.deepEqual(inspectSources(new Map([[file,"import '@capiro/meri-client/user-preferences';"]])).errors,[]);
 for(const target of ['@capiro/meri-client/vendor/user-preferences-application/0.1.0','meri-greenfield/apps/control/settings/user-service']){
  assert.ok(inspectSources(new Map([[file,`import '${target}';`]])).errors.length>0);
 }
});
test('real route retains preview containment before native token acquisition',()=>{
 const source=readFileSync(route,'utf8');
 assert.ok(source.indexOf('if (held) return held')<source.indexOf('await auth()'));
 assert.match(source,/getToken\(\{ template: "capiro" \}\)/);
 assert.doesNotMatch(source,/action_session|authorization.*get\(/);
});
test('personal page opt-in remains literal and existing preferences alias reaches canonical panel',()=>{
 const source=readFileSync('apps/web/src/app/settings/[section]/page.tsx','utf8');
 assert.match(source,/process\.env\.MERI_USER_PREFERENCES_ENABLED === "true"/);
 assert.match(source,/section === "preferences" \? "meri-preferences" : section/);
});
