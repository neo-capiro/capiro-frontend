import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkUserPreferencesPublic,verifyUserPreferencesInput} from './user-preferences-public.mjs';
test('supplemental user preferences export binds all immutable producing-source bytes',()=>{
 assert.equal(checkUserPreferencesPublic().files,4);
});
test('public provenance refuses substituted bytes, filenames and export paths',()=>{
 const directory=new URL('../packages/meri-client/vendor/user-preferences-application/0.1.0/',import.meta.url);
 const manifest=JSON.parse(readFileSync(new URL('provenance.json',directory),'utf8'));
 const info=JSON.parse(readFileSync(new URL('../packages/meri-client/package.json',import.meta.url),'utf8'));
 const read=name=>readFileSync(new URL(name,directory));
 assert.throws(()=>verifyUserPreferencesInput(manifest,()=>Buffer.from('substitution'),info),/drift/);
 assert.throws(()=>verifyUserPreferencesInput({...manifest,files:manifest.files.map((file,i)=>i===0?{...file,file:'../escape'}:file)},read,info),/binding/);
 assert.throws(()=>verifyUserPreferencesInput(manifest,read,{...info,exports:{}}),/export/);
});
