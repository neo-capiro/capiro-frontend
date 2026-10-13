# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: native-browser.spec.ts >> native debriefs creation receipt completes exactly once with correct lifecycle
- Location: ../tmp/capiro-calendar-correction-independent/native-browser.spec.ts:6:53

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Sharing status unavailable', { exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('Sharing status unavailable', { exact: true })

```

```yaml
- main:
  - heading "Synthetic artifact receipt review" [level=1]
  - button "Replace client"
  - button "Toggle artifacts"
  - paragraph: "Current client: client-one"
  - heading "Debriefs" [level=3]
  - button "Add debrief"
  - button "Use saved meeting notes" [disabled]
  - button "Transcript and attachments" [disabled]
  - button "Type Notes Manually" [disabled]
  - button "Record Voice Memo" [disabled]
  - text: Source extraction and debrief generation are unavailable in this environment.
  - article:
    - text: generated Private
    - paragraph: Independent native lifecycle draft
    - button "Export PDF"
    - button "Edit"
    - button "Approve"
```

# Test source

```ts
  1  | import {test,expect} from '/workspace/capiro-calendar-native-status/node_modules/@playwright/test/index.mjs';
  2  | import {installFixtures,json,clientId,client} from '/workspace/capiro-calendar-native-status/apps/web/tests/browser/fixtures';
  3  | const date='2026-10-10T14:00:00.000Z';
  4  | const artifactMeeting={id:'meeting-one',subject:'Synthetic receipt review',description:null,location:null,startsAt:date,endsAt:'2026-10-10T15:00:00.000Z',status:'scheduled',joinLink:null,visibility:'private',isVirtual:false,meri:null,client:{id:'client-one',name:'client-one'},attendees:[],preps:[]};
  5  | async function setup(page:any){await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());return installFixtures(page);}
  6  | for(const kind of ['notes','debriefs'] as const)test(`native ${kind} creation receipt completes exactly once with correct lifecycle`,async({page},info)=>{
  7  |  const unexpected=await setup(page);const singular=kind==='notes'?'note':'debrief';let writes=0;let saved=false;const metadata={id:'independent-artifact',meetingId:artifactMeeting.id,clientId:'client-one',authorUserId:'user-test',author:{id:'user-test',email:'test@example.test',firstName:null,lastName:null},accessLevel:kind==='notes'?'tenant_admins_and_author':'tenant_members',keyVersion:null,confidential:false,status:kind==='notes'?'draft':'generated',sharedAt:null,sharedByUserId:null,createdAt:date,updatedAt:date,...(kind==='notes'?{approvedAt:null,approvedByUserId:null}:{})};
  8  |  await page.route('**/core/engagement/capabilities',route=>json(route,{meetingPrepComprehensiveEnabled:false,runtime:{externalActionsEnabled:false}}));
  9  |  await page.route('**/core/engagement/meetings/**',route=>{const url=new URL(route.request().url());if(url.pathname.endsWith(`/${kind}`)){if(route.request().method()==='POST'){writes++;saved=true;expect(route.request().postDataJSON()).toEqual({body:'Independent native lifecycle draft',confidential:false});return json(route,metadata);}const {sharedAt,sharedByUserId,...debriefListMetadata}=metadata;return json(route,saved?[{...(kind==='debriefs'?debriefListMetadata:metadata),body:'Independent native lifecycle draft',restricted:false}]:[]);}return json(route,artifactMeeting);});
> 10 |  await page.goto(`/calendar-artifact-receipts.html?kind=${kind}`);await page.getByRole('button',{name:`Add ${singular}`,exact:true}).click();await page.getByLabel('Content',{exact:true}).fill('Independent native lifecycle draft');await page.getByRole('button',{name:`Save ${singular}`,exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByText('Independent native lifecycle draft',{exact:true})).toBeVisible();await expect(page.getByText(/may have completed/)).toHaveCount(0);expect(writes).toBe(1);if(kind==='debriefs'){await expect(page.getByText('Sharing status unavailable',{exact:true})).toBeVisible();await expect(page.getByText('Private',{exact:true})).toHaveCount(0);}else await expect(page.getByText('Private',{exact:true})).toBeVisible();expect(unexpected).toEqual([]);await page.screenshot({path:info.outputPath(`${kind}-native-save.png`)});
     |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              ^ Error: expect(locator).toBeVisible() failed
  11 | });
  12 | test('portal generation entries remain visible disabled and dispatch no action',async({page},info)=>{
  13 |  const unexpected=await setup(page);let writes=0;page.on('request',r=>{if(r.url().includes('/api/backend/')&&r.method()!=='GET')writes++;});await page.route('**/core/me',route=>json(route,{user:{id:'user-test',email:null},tenant:{id:'tenant-test',name:'Synthetic'},role:'client_portal_user'}));await page.route('**/core/engagement/capabilities',route=>json(route,{meetingPrepComprehensiveEnabled:false,runtime:{externalActionsEnabled:true}}));await page.route('**/core/engagement/meetings/**',route=>json(route,new URL(route.request().url()).pathname.endsWith('/debriefs')?[]:artifactMeeting));await page.goto('/calendar-artifact-receipts.html?kind=debriefs');
  14 |  for(const name of ['Use saved meeting notes','Transcript and attachments','Type Notes Manually','Record Voice Memo']){const button=page.getByRole('button',{name,exact:true});await expect(button).toBeVisible();await expect(button).toBeDisabled();}await expect(page.getByRole('button',{name:'Add debrief',exact:true})).toBeDisabled();expect(writes).toBe(0);expect(unexpected).toEqual([]);await page.screenshot({path:info.outputPath('portal-generation-visible-disabled.png')});
  15 | });
  16 | const meeting={...artifactMeeting,id:'90000000-0000-4000-8000-000000000041',subject:'Independent client clear',location:'Room A',client:{id:clientId,name:client.name}};
  17 | async function calendar(page:any,oldReceipt=false){const unexpected=await setup(page);const writes:any[]=[];await page.route('**/core/engagement/meetings**',route=>{const url=new URL(route.request().url());if(route.request().method()!=='GET'){const body=route.request().postDataJSON();writes.push({method:route.request().method(),body});return json(route,{...meeting,...body,description:body.description?.trim()||null,location:body.location?.trim()||null,client:oldReceipt?meeting.client:body.clientId===null?null:meeting.client});}if(url.pathname.endsWith('/notes')||url.pathname.endsWith('/debriefs'))return json(route,[]);if(url.pathname.endsWith('/notetaker'))return json(route,null);return json(route,url.pathname.endsWith(meeting.id)?meeting:[meeting]);});return{unexpected,writes};}
  18 | for(const oldReceipt of [false,true])test(`No client selection serializes null and ${oldReceipt?'refuses old association':'accepts cleared native association'}`,async({page},info)=>{
  19 |  const c=await calendar(page,oldReceipt);await page.goto(`/calendar?view=agenda&date=2026-10-10&zone=UTC&meeting=${meeting.id}`);await page.getByRole('button',{name:'Edit meeting',exact:true}).click();const form=page.getByRole('dialog',{name:'Edit meeting',exact:true});await form.getByRole('combobox',{name:'Client',exact:true}).selectOption('');await form.getByRole('button',{name:'Save meeting',exact:true}).click();await expect.poll(()=>c.writes.length).toBe(1);expect(c.writes[0]).toMatchObject({method:'PUT',body:{clientId:null}});if(oldReceipt){await expect(form).toBeVisible();await expect(form.getByText(/may have completed/)).toBeVisible();await expect(form.getByRole('button',{name:'Save meeting',exact:true})).toBeDisabled();await expect(form.getByRole('combobox',{name:'Client',exact:true})).toHaveValue('');}else await expect(form).toHaveCount(0);expect(c.unexpected).toEqual([]);await page.screenshot({path:info.outputPath(`client-clear-${oldReceipt?'old-refused':'confirmed'}.png`)});
  20 | });
  21 | test('new unscoped meeting omits clientId and accepts backend inference',async({page},info)=>{
  22 |  const c=await calendar(page);await page.goto('/calendar?view=agenda&date=2026-10-10&zone=UTC');await page.getByRole('button',{name:'New meeting',exact:true}).click();const form=page.getByRole('dialog',{name:'New meeting',exact:true});await form.getByLabel('Subject',{exact:true}).fill('Inferred native meeting');await form.getByLabel('Starts',{exact:true}).fill('2026-10-10T14:00');await form.getByLabel('Ends',{exact:true}).fill('2026-10-10T15:00');await expect(form.getByRole('combobox',{name:'Client',exact:true})).toHaveValue('');await form.getByRole('button',{name:'Save meeting',exact:true}).click();await expect.poll(()=>c.writes.length).toBe(1);expect(c.writes[0].method).toBe('POST');expect(c.writes[0].body).not.toHaveProperty('clientId');await expect(form).toHaveCount(0);expect(c.unexpected).toEqual([]);await page.screenshot({path:info.outputPath('unscoped-create-inference.png')});
  23 | });
  24 | for(const kind of ['notes','debriefs'] as const)test(`native idempotent ${kind} share accepts deleted original sharer without invented list stamps`,async({page},info)=>{
  25 |  const unexpected=await setup(page);const singular=kind==='notes'?'note':'debrief';let writes=0,saved=false;const approved={id:'independent-shared-artifact',meetingId:artifactMeeting.id,clientId:'client-one',authorUserId:'user-test',author:{id:'user-test',email:'test@example.test',firstName:null,lastName:null},confidential:false,accessLevel:kind==='notes'?'tenant_admins_and_author':'tenant_members',keyVersion:null,status:'approved',sharedAt:null,sharedByUserId:null,createdAt:date,updatedAt:date,...(kind==='notes'?{approvedAt:date,approvedByUserId:'user-test'}:{})};const shared={...approved,sharedAt:date,sharedByUserId:null};
  26 |  await page.route('**/core/engagement/capabilities',route=>json(route,{meetingPrepComprehensiveEnabled:false,runtime:{externalActionsEnabled:false}}));await page.route('**/core/engagement/meetings/**',route=>{const url=new URL(route.request().url());if(url.pathname.endsWith('/artifacts/share')){writes++;saved=true;expect(route.request().postDataJSON()).toEqual({artifacts:[{type:singular,id:approved.id}]});return json(route,{...artifactMeeting,visibility:'shared',[kind]:[shared]});}if(url.pathname.endsWith(`/${kind}`)){const {sharedAt,sharedByUserId,...debriefListMetadata}=approved;return json(route,[{...(kind==='debriefs'?debriefListMetadata:saved?shared:approved),body:'Previously approved independent content',restricted:false}]);}return json(route,{...artifactMeeting,visibility:'shared',[kind]:[shared]});});
  27 |  await page.goto(`/calendar-artifact-receipts.html?kind=${kind}`);await page.getByRole('button',{name:'Share',exact:true}).click();await page.getByRole('dialog',{name:`Share ${singular}`,exact:true}).getByRole('button',{name:`Share ${singular}`,exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByText(/may have completed/)).toHaveCount(0);expect(writes).toBe(1);if(kind==='notes')await expect(page.getByRole('button',{name:'Unshare',exact:true})).toBeVisible();else{await expect(page.getByText('Sharing status unavailable',{exact:true})).toBeVisible();await expect(page.getByText('Private',{exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Unshare',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Share',exact:true})).toBeVisible();}expect(unexpected).toEqual([]);await page.screenshot({path:info.outputPath(`${kind}-null-original-sharer.png`)});
  28 | });
  29 | 
```