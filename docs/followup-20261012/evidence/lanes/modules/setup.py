from pathlib import Path
root=Path('/workspace/capiro-next-modules')
out=Path('/tmp/capiro-next-modules-evidence')
s=(root/'apps/web/test/browser/server.mjs').read_text().replace('from "vite"','from "/workspace/capiro-next-modules/node_modules/vite/dist/node/index.js"').replace('const app = fileURLToPath(new URL("../../", import.meta.url));','const app = "/workspace/capiro-next-modules/apps/web";').replace('path.join(app, ".qa/modules-harness")','"/tmp/capiro-next-modules-evidence/harness"')
(out/'server.mjs').write_text(s)
for phase in ['red','green']:
 (out/phase/'playwright.config.mjs').write_text('''import { defineConfig } from "/workspace/capiro-next-modules/node_modules/@playwright/test/index.mjs";
export default defineConfig({testDir:"/workspace/capiro-next-modules/apps/web/test/browser",testMatch:"next-modules-*.spec.ts", workers:1,retries:0,fullyParallel:false,timeout:25000,expect:{timeout:4000},webServer:undefined,outputDir:"/tmp/capiro-next-modules-evidence/PHASE/output",reporter:[["list"],["json",{outputFile:"/tmp/capiro-next-modules-evidence/PHASE/results.json"}]],use:{baseURL:"http://127.0.0.1:5197",viewport:{width:1440,height:1040},screenshot:"only-on-failure",trace:"retain-on-failure",launchOptions:{executablePath:"/usr/bin/chromium",args:["--no-sandbox","--disable-dev-shm-usage"]}}});'''.replace('PHASE',phase))
spec=(root/'apps/web/test/browser/planner-engagement.spec.ts').read_text()
blank=spec[spec.index('const blankTask ='):spec.index('const meeting =')].replace('const blankTask =','export const nextTask =')
(root/'apps/web/test/browser/next-modules-fixtures.ts').write_text('''import type { Page } from "@playwright/test";
import { onlyLocalRequests, operationFixtures, testIdentity } from "./fixtures";
export const clientId = "30000000-0000-4000-8000-000000000001";
export const otherClientId = "30000000-0000-4000-8000-000000000002";
export const taskId = "51000000-0000-4000-8000-000000000001";
export const otherTaskId = "51000000-0000-4000-8000-000000000002";
'''+blank+'''
export const client = {id:clientId,name:"Current Aerospace",status:"ACTIVE",profileStatus:"ACTIVE"};
export const otherClient = {...client,id:otherClientId,name:"Other Aerospace"};
export const bootstrap = {me:{id:"test-user",name:"Test User"},people:[{id:"test-user",name:"Test User"}],projects:[]};
export const meeting = {id:"40000000-0000-4000-8000-000000000001",subject:"Current meeting",startsAt:"2026-10-07T14:00:00Z",endsAt:"2026-10-07T15:00:00Z",status:"scheduled",location:null,description:null,client:{id:clientId,name:client.name},preps:[],notes:[],debriefs:[]};
export async function setup(page:Page, overrides: Parameters<typeof operationFixtures>[1] = {}) {
 await onlyLocalRequests(page);
 await page.clock.setFixedTime(new Date("2026-10-08T16:00:00Z"));
 await operationFixtures(page, {
  "me.read":testIdentity,"clients.list":[client,otherClient],"engagement.meetings":[],
  "engagement.meeting":meeting,"engagement.notes":[],"engagement.debriefs":[],
  "planner.bootstrap":bootstrap,"planner.tasks":{items:[nextTask],nextCursor:null},
  "planner.task":nextTask,"planner.task.events":[],"planner.task.attachments":[],
  "legiwatch.calendar":{rows:[],total:0,page:1,pageSize:200},
  "calendar.commentDeadlines":[], ...overrides
 });
 await page.route("**/api/backend/core/clients/*", route => route.fulfill({json: route.request().url().endsWith(otherClientId)?otherClient:client}));
}
export async function navigate(page:Page,url:string) {
 await page.evaluate(href=>{history.pushState({},"",href);dispatchEvent(new PopStateEvent("popstate"));},url);
}
''')
