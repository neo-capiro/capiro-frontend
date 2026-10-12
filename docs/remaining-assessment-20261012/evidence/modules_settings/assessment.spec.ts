import { test, expect } from "/workspace/capiro-acceptance-assessment/node_modules/@playwright/test";
import { onlyLocalRequests, operationFixtures, testIdentity } from "/workspace/capiro-acceptance-assessment/apps/web/test/browser/fixtures";
import { moduleRouteFixtures } from "/workspace/capiro-acceptance-assessment/apps/web/test/browser/module-route-fixtures";
import { settingsFixtures } from "/workspace/capiro-acceptance-assessment/apps/web/test/browser/settings-fixtures";
import { writeFileSync } from "node:fs";
const taskId = "51000000-0000-4000-8000-000000000001";
const clientId = "30000000-0000-4000-8000-000000000001";
const meetingId = "40000000-0000-4000-8000-000000000001";
const sessionId = "60000000-0000-4000-8000-000000000001";
const blankTask = {
  id: taskId,
  name: "Test appropriation review",
  description: "Synthetic review work",
  ownerId: "test-user",
  assigneeId: "test-user",
  version: 1,
  archived: false,
  status: "todo",
  priority: "high",
  subtype: "task",
  approval: "pending",
  startOn: null,
  dueOn: "2026-10-12",
  startTime: null,
  dueTime: null,
  timeZone: null,
  parentId: null,
  dependencies: [],
  collaborators: [],
  tags: [],
  memberships: [],
  customValues: {},
  estimateMinutes: 90,
  actualMinutes: 15,
  recurrence: null,
  clientId: null,
  meetingId: null,
  completedAt: null,
  createdAt: "2026-10-08T12:00:00Z",
  updatedAt: "2026-10-08T12:00:00Z",
  access: "admin",
};
const meeting = {
  id: meetingId,
  subject: "Test strategy review",
  startsAt: "2026-10-12T14:00:00Z",
  endsAt: "2026-10-12T15:00:00Z",
  status: "scheduled",
  location: "Test room",
  description: null,
  client: { id: clientId, name: "Test Aerospace" },
  preps: [],
  notes: [],
  debriefs: [],
  visibility: "private",
};

const routes=[['hub','/modules'],['planner','/modules/planner?view=all-tasks'],['workspace','/modules/workspace'],['engagement','/modules/engagement?view=meetings'],['strategies','/modules/strategies'],['settings','/settings/personal']];
for(const [name,url] of routes) test(`capture ${name}`,async({page})=>{
await onlyLocalRequests(page);await page.clock.setFixedTime(new Date('2026-10-12T16:00:00Z'));
await operationFixtures(page,{...moduleRouteFixtures,...settingsFixtures,'planner.tasks':{items:[blankTask],nextCursor:null},'planner.bootstrap':{me:{id:'test-user',name:'Test User'},people:[{id:'test-user',name:'Test User'}],projects:[]},'engagement.library':{data:[meeting],total:1,page:1,limit:25}});
await page.goto(url);await expect(page.getByRole('main')).toBeVisible();await expect(page.getByText('Loading…',{exact:true})).toHaveCount(0);await page.screenshot({path:"/tmp/capiro-remaining-assessment-20261012/modules_settings/browser-"+name+"-desktop.png",fullPage:true,animations:'disabled'});
writeFileSync("/tmp/capiro-remaining-assessment-20261012/modules_settings/browser-"+name+"-text.txt",await page.locator('body').innerText());
await page.setViewportSize({width:390,height:844});await page.screenshot({path:"/tmp/capiro-remaining-assessment-20261012/modules_settings/browser-"+name+"-phone.png",fullPage:true,animations:'disabled'});
const geo=await page.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth,offenders:[...document.querySelectorAll('main *')].map(e=>({tag:e.tagName,text:(e.textContent||'').slice(0,60),r:e.getBoundingClientRect()})).filter(e=>e.r.right>innerWidth+2).slice(0,20)}));writeFileSync("/tmp/capiro-remaining-assessment-20261012/modules_settings/browser-"+name+"-geometry.json",JSON.stringify(geo,null,2));
});

const agendaFixtures={...moduleRouteFixtures,'clients.list':[{id:clientId,name:'Test Aerospace',status:'ACTIVE',profileStatus:'ACTIVE'}],'planner.tasks':{items:[{...blankTask,startOn:'2026-10-10',dueOn:'2026-10-12'}],nextCursor:null},'legiwatch.calendar':{rows:[],total:0,page:1,pageSize:200},'calendar.commentDeadlines':[]};
test('repro calendar discards client URL hint',async({page})=>{
 await onlyLocalRequests(page);const reads:any[]=[];
 await operationFixtures(page,{...agendaFixtures,'engagement.meetings':(i)=>{reads.push(i);return []}});
 await page.route('**/api/backend/core/clients/'+clientId,r=>r.fulfill({json:{id:clientId,name:'Test Aerospace',status:'ACTIVE',profileStatus:'ACTIVE'}}));await page.goto('/modules/calendar?clientId='+clientId);await expect(page.getByLabel('Calendar client scope')).toBeVisible();await expect(page.getByLabel('Calendar client scope')).toHaveValue('');
 expect(reads.at(-1).query.clientId).toBeUndefined();writeFileSync('/tmp/capiro-remaining-assessment-20261012/modules_settings/calendar-scope-repro.json',JSON.stringify(reads,null,2));await page.screenshot({path:'/tmp/capiro-remaining-assessment-20261012/modules_settings/calendar-scope-repro.png',fullPage:true});
});
test('repro calendar task loses start occurrence and target task navigation',async({page})=>{
 await onlyLocalRequests(page);await page.clock.setFixedTime(new Date('2026-10-08T16:00:00Z'));await operationFixtures(page,agendaFixtures);await page.goto('/modules/calendar');await page.getByRole('button',{name:'Agenda',exact:true}).click();
 const rows=page.getByRole('row').filter({hasText:'Test appropriation review'});await expect(rows).toHaveCount(1);await expect(rows).toContainText('OCT 12');await expect(rows).not.toContainText('OCT 10');
 await page.screenshot({path:'/tmp/capiro-remaining-assessment-20261012/modules_settings/calendar-task-occurrence-repro.png',fullPage:true});await page.getByRole('link',{name:'Test appropriation review'}).click();await expect(page).toHaveURL(/task=/);await expect(page.getByRole('heading',{name:'Planner',exact:true})).toBeVisible();await expect(page.getByRole('dialog')).toHaveCount(0);await page.screenshot({path:'/tmp/capiro-remaining-assessment-20261012/modules_settings/calendar-task-target-repro.png',fullPage:true});
});
test('repro meetings failure suppresses independent agenda rows',async({page})=>{
 await onlyLocalRequests(page);await page.clock.setFixedTime(new Date('2026-10-08T16:00:00Z'));await operationFixtures(page,agendaFixtures);await page.route('**/api/capiro/engagement.meetings*',r=>r.fulfill({status:403,json:{message:'Synthetic meeting access denied'}}));await page.goto('/modules/calendar');await page.getByRole('button',{name:'Agenda',exact:true}).click();await expect(page.getByRole('button',{name:/Planner 1/})).toBeVisible();await expect(page.getByRole('alert')).toContainText('Synthetic meeting access denied');await expect(page.getByRole('table')).toHaveCount(0);await page.screenshot({path:'/tmp/capiro-remaining-assessment-20261012/modules_settings/calendar-independent-feed-repro.png',fullPage:true});
});
test('repro populated Engagement opens modal rather than designed meeting split view',async({page})=>{
 await onlyLocalRequests(page);await operationFixtures(page,{...moduleRouteFixtures,'engagement.meetings':[meeting],'engagement.meeting':{...meeting,joinLink:'https://example.test/join'},'engagement.notes':[],'engagement.debriefs':[]});await page.goto('/modules/engagement?view=meetings');await page.getByRole('button',{name:/Test strategy review/}).click();await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByRole('dialog').getByRole('link')).toHaveCount(0);await page.screenshot({path:'/tmp/capiro-remaining-assessment-20261012/modules_settings/engagement-meeting-repro.png',fullPage:true});
});

test('capture public form submitted error and receipt',async({page})=>{
 await onlyLocalRequests(page);let success=false;const token='20000000-0000-4000-8000-000000000001.'+'a'.repeat(64);const q='30000000-0000-4000-8000-000000000001';
 await operationFixtures(page,{'public-form.read':{name:'Request a briefing',description:'Ask the team to prepare a staff briefing.',confirmationMessage:'Your request was received.',allowAnotherSubmission:true,fields:[{id:q,label:'What needs to be done?',type:'text',required:true,options:[]},{id:'30000000-0000-4000-8000-000000000002',label:'Is this urgent?',type:'select',required:true,options:['Yes','No']},{id:'30000000-0000-4000-8000-000000000003',label:'Attach the draft',type:'attachment',required:false,options:[]}]},'public-form.submit':{received:true}});
 await page.route('**/api/capiro/public-form.submit',r=>success?r.fallback():r.fulfill({status:400,json:{message:'Synthetic submission validation error'}}));await page.goto('/forms/'+token);await page.getByLabel('What needs to be done?').fill('Synthetic briefing');await page.getByLabel('Is this urgent?').selectOption('Yes');await page.getByRole('button',{name:'Submit request',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Synthetic submission validation error');await expect(page.getByLabel('What needs to be done?')).toHaveValue('Synthetic briefing');await page.screenshot({path:'/tmp/capiro-remaining-assessment-20261012/modules_settings/browser-form-error-desktop.png',fullPage:true});success=true;await page.getByRole('button',{name:'Submit request',exact:true}).click();await expect(page.getByRole('status')).toContainText('Your request was received.');await page.screenshot({path:'/tmp/capiro-remaining-assessment-20261012/modules_settings/browser-form-receipt-desktop.png',fullPage:true});
});
test('capture active subscription add profiles before any checkout call',async({page})=>{
 await onlyLocalRequests(page);await operationFixtures(page,settingsFixtures);const mutations:string[]=[];page.on('request',r=>{if(r.method()!=='GET')mutations.push(r.url())});await page.goto('/settings/billing');await expect(page.getByText('active',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Add profiles',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Set the total profile capacity');await expect(page.getByRole('button',{name:'Review checkout'})).toBeEnabled();expect(mutations).toEqual([]);await page.screenshot({path:'/tmp/capiro-remaining-assessment-20261012/modules_settings/billing-active-add-profiles.png',fullPage:true});
});
