import {test,expect} from '@playwright/test';
import {writeFileSync} from 'node:fs';
import {installFixtures,json,clientId,client} from "/workspace/capiro-p1-successor/apps/web/tests/browser/fixtures";
test('No client in an existing meeting submits and verifies an explicit association clear',async({page},info)=>{
 const unexpected=await installFixtures(page);
 const id='90000000-0000-4000-8000-000000000009';
 const original={id,subject:'Synthetic association clear',description:null,location:'Meeting room',startsAt:'2026-10-01T14:00:00Z',endsAt:'2026-10-01T15:00:00Z',status:'scheduled',joinLink:null,visibility:'private',isVirtual:false,meri:null,client:{id:clientId,name:client.name},attendees:[],preps:[]};
 let body:Record<string,unknown>|undefined;let returned=original;let writes=0;
 await page.route('**/core/engagement/meetings**',route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith('/notetaker'))return json(route,null);
  if(path.endsWith('/meetings'))return json(route,[original]);
  if(path.endsWith(id)){
   if(route.request().method()==='GET')return json(route,returned);
   writes++;body=route.request().postDataJSON();
   // Match native update semantics: only an explicit clientId key changes association.
   returned={...original,...body,description:String(body!.description??'').trim()||null,location:String(body!.location??'').trim()||null,client:body!.clientId===null?null:original.client} as typeof original;
   return json(route,returned);
  }
  return route.fallback();
 });
 await page.goto(`/calendar?view=agenda&date=2026-10-01&zone=UTC&meeting=${id}`);
 await page.getByRole('button',{name:'Edit meeting',exact:true}).click();
 const editor=page.getByRole('dialog',{name:'Edit meeting',exact:true});
 const selection=editor.getByRole('combobox',{name:'Client',exact:true});
 await expect(selection).toHaveValue(clientId);await selection.selectOption('');
 await expect(selection).toHaveValue('');await editor.getByRole('button',{name:'Save meeting',exact:true}).click();
 await expect.poll(()=>writes).toBe(1);
 await expect(editor).toHaveCount(0);
 writeFileSync(info.outputPath('client-clear-observation.json'),JSON.stringify({requestedUiClient:null,body,returnedClient:returned.client,editorClosed:true,writes,unexpected},null,2));
 await page.screenshot({path:info.outputPath('client-clear-after.png'),fullPage:true});
 expect(unexpected).toEqual([]);expect(body).toHaveProperty('clientId',null);
 expect(returned.client).toBeNull();
});
