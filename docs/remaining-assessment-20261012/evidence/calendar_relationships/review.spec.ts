import { test, expect } from '/workspace/capiro-acceptance-assessment/node_modules/@playwright/test/index.mjs';
import { installFixtures, json, clientId, client, person, personId } from '/workspace/capiro-acceptance-assessment/apps/web/tests/browser/fixtures';
const out='/tmp/capiro-remaining-assessment-20261012/calendar_relationships';
const id='90000000-0000-4000-8000-000000000009';
const noteId='91000000-0000-4000-8000-000000000009';
const meeting={id,subject:'Synthetic completed meeting',description:'Reviewed fixture meeting.',location:'Meeting room',startsAt:'2026-10-01T14:00:00Z',endsAt:'2026-10-01T15:00:00Z',status:'completed',joinLink:null,visibility:'private',isVirtual:false,meri:null,client:{id:clientId,name:client.name},attendees:[{id:personId,name:person.name,email:person.email,role:'Director'}],preps:[]};
const note={id:noteId,body:'Saved source note',restricted:false,confidential:false,status:'draft',sharedAt:null,createdAt:'2026-10-01T16:00:00Z',updatedAt:'2026-10-01T16:00:00Z'};
async function setup(page){
 const unexpected=await installFixtures(page);
 await page.route('**/core/engagement/meetings**',route=>{
  const p=new URL(route.request().url()).pathname;
  if(p.endsWith('/notetaker'))return json(route,null);
  if(p.endsWith('/notes'))return json(route,[note]);
  if(p.endsWith('/debriefs'))return json(route,[]);
  if(p.endsWith(id))return json(route,meeting);
  if(p.endsWith('/meetings'))return json(route,[meeting]);
  return route.fallback();
 });
 return unexpected;
}
test('calendar missing lifecycle filters and opens completed meeting on Information',async({page})=>{
 await setup(page);
 await page.goto(`/portfolio/${clientId}/calendar?view=agenda&date=2026-10-01&zone=UTC`);
 await expect(page.getByRole('button',{name:meeting.subject,exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Needs prep',exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Needs debrief',exact:true})).toHaveCount(0);
 expect(await page.getByLabel('Calendar view').locator('option').allTextContents()).toEqual(['Month','Week','Agenda']);
 await page.screenshot({path:`${out}/calendar-agenda.png`,fullPage:true});
 await page.getByRole('button',{name:meeting.subject,exact:true}).click();
 const d=page.getByRole('dialog',{name:meeting.subject,exact:true});
 await expect(d.getByRole('button',{name:'Information',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.screenshot({path:`${out}/meeting-information.png`,fullPage:true});
 await d.getByRole('button',{name:'Notes',exact:true}).click();
 await expect(d.getByText(note.body,{exact:true})).toBeVisible();
 await page.screenshot({path:`${out}/meeting-notes.png`,fullPage:true});
});
test('note editor closes on arbitrary 200 body without a saved record',async({page})=>{
 await setup(page);
 let posts=0;
 await page.route(`**/core/engagement/meetings/${id}/notes`,route=>{
  if(route.request().method()==='GET')return json(route,[note]);
  posts++;return json(route,{clientId:'foreign-client',meetingId:'foreign-meeting',saved:false});
 });
 await page.goto(`/portfolio/${clientId}/calendar?view=agenda&date=2026-10-01&zone=UTC&meeting=${id}`);
 const d=page.getByRole('dialog',{name:meeting.subject,exact:true});
 await d.getByRole('button',{name:'Notes',exact:true}).click();
 await d.getByRole('button',{name:'Add note',exact:true}).click();
 const editor=page.getByRole('dialog',{name:'Add note',exact:true});
 await editor.getByLabel('Content',{exact:true}).fill('This note was never saved');
 await editor.getByRole('button',{name:'Save note',exact:true}).click();
 await expect(editor).toHaveCount(0);expect(posts).toBe(1);
 await expect(d.getByText('This note was never saved',{exact:true})).toHaveCount(0);
 await page.screenshot({path:`${out}/note-invalid-receipt-closed.png`,fullPage:true});
});
test('note unknown completion allows another POST and repeated form submits dispatch twice',async({page})=>{
 await setup(page);let posts=0;
 await page.route(`**/core/engagement/meetings/${id}/notes`,route=>{
  if(route.request().method()==='GET')return json(route,[note]);
  posts++;return json(route,{message:'Synthetic lost completion'},503);
 });
 await page.goto(`/portfolio/${clientId}/calendar?view=agenda&date=2026-10-01&zone=UTC&meeting=${id}`);
 const d=page.getByRole('dialog',{name:meeting.subject,exact:true});
 await d.getByRole('button',{name:'Notes',exact:true}).click();
 await d.getByRole('button',{name:'Add note',exact:true}).click();
 const editor=page.getByRole('dialog',{name:'Add note',exact:true});
 await editor.getByLabel('Content',{exact:true}).fill('Unknown completion source');
 await editor.getByRole('button',{name:'Save note',exact:true}).click();
 await expect(editor.getByRole('button',{name:'Save note',exact:true})).toBeEnabled();
 await expect(editor.getByText('Synthetic lost completion',{exact:true})).toBeVisible();
 await editor.getByRole('button',{name:'Save note',exact:true}).click();
 await expect.poll(()=>posts).toBe(2);
 await expect(editor.getByRole('button',{name:'Save note',exact:true})).toBeEnabled();
 await page.screenshot({path:`${out}/note-unknown-retry.png`,fullPage:true});
 await editor.locator('form').evaluate(form=>{form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});
 await expect.poll(()=>posts).toBe(4);
});
test('mail composer never shows fetched signature and uses plain textarea',async({page})=>{
 await installFixtures(page);
 await page.route('**/core/me/email-signature',route=>json(route,{html:'<p>SYNTHETIC SIGNATURE CEO</p>',enabled:true}));
 await page.goto('/__test/email-compose');
 await page.getByRole('button',{name:'Mail contact',exact:true}).click();
 const d=page.getByRole('dialog',{name:'New email',exact:true});
 await expect(d.getByLabel('Append my saved signature')).toBeChecked();
 await expect(d.getByText('SYNTHETIC SIGNATURE CEO',{exact:true})).toHaveCount(0);
 await expect(d.getByLabel('Message',{exact:true})).toHaveJSProperty('tagName','TEXTAREA');
 await page.screenshot({path:`${out}/mail-compose-signature-hidden.png`,fullPage:true});
});
test('capture current contact and Quick log flows without native writes',async({page})=>{
 await installFixtures(page);
 await page.goto(`/portfolio/${clientId}/relationships?person=${personId}`);
 await expect(page.getByRole('dialog',{name:person.name,exact:true})).toBeVisible();
 await page.screenshot({path:`${out}/contact-drawer.png`,fullPage:true});
 await page.goto('/portfolio?log=1');
 await expect(page.getByRole('dialog',{name:'Quick log',exact:true})).toBeVisible();
 await page.screenshot({path:`${out}/quick-log-client-selection.png`,fullPage:true});
 await page.getByRole('combobox',{name:'Client',exact:true}).selectOption(clientId);
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await expect(page.getByLabel('Activity type',{exact:true})).toBeVisible();
 await page.screenshot({path:`${out}/quick-log-client-form.png`,fullPage:true});
});
test('clearing edit location omits field and accepts a foreign meeting receipt',async({page})=>{
 await setup(page);let body;
 await page.route(`**/core/engagement/meetings/${id}`,route=>{
  if(route.request().method()==='GET')return json(route,meeting);
  body=route.request().postDataJSON();return json(route,{...meeting,id:'other-meeting',client:{id:'foreign-client',name:'Foreign'}});
 });
 await page.goto(`/portfolio/${clientId}/calendar?view=agenda&date=2026-10-01&zone=UTC&meeting=${id}`);
 const d=page.getByRole('dialog',{name:meeting.subject,exact:true});
 await d.getByRole('button',{name:'Edit meeting',exact:true}).click();
 const editor=page.getByRole('dialog',{name:'Edit meeting',exact:true});
 await editor.getByLabel('Location or join URL',{exact:true}).fill('');
 await editor.getByRole('button',{name:'Save meeting',exact:true}).click();
 await expect(editor).toHaveCount(0);expect(body).not.toHaveProperty('location');
 await expect(d.getByText('Meeting room',{exact:true})).toBeVisible();
 await page.screenshot({path:`${out}/meeting-clear-location-failed.png`,fullPage:true});
});
