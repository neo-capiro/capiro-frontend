# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: next-modules-baseline.spec.ts >> MS03 agenda preserves both Planner start and due occurrences
- Location: apps/web/test/browser/next-modules-baseline.spec.ts:15:1

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  getByRole('row').filter({ hasText: 'Test appropriation review' })
Expected: 2
Received: 1
Timeout:  4000ms

Call log:
  - Expect "toHaveCount" with timeout 4000ms
  - waiting for getByRole('row').filter({ hasText: 'Test appropriation review' })
    12 × locator resolved to 1 element
       - unexpected value "1"

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - link "Skip to content" [ref=e4] [cursor=pointer]:
      - /url: "#main-content"
    - banner [ref=e5]:
      - link "Capiro Home" [ref=e6] [cursor=pointer]:
        - /url: /
        - img "Capiro" [ref=e7]
      - navigation "Product modes" [ref=e8]:
        - link "Meri" [ref=e9] [cursor=pointer]:
          - /url: /meri
          - img [ref=e11]
        - link "Portfolio" [ref=e12] [cursor=pointer]:
          - /url: /
          - img [ref=e14]
        - link "Modules" [ref=e15] [cursor=pointer]:
          - /url: /modules
          - img [ref=e17]
      - navigation "Workspace actions" [ref=e18]:
        - link "Quick log" [ref=e19] [cursor=pointer]:
          - /url: /?log=1
          - img [ref=e21]
        - link "Master calendar" [ref=e22] [cursor=pointer]:
          - /url: /calendar
          - img [ref=e24]
        - link "Search intelligence" [ref=e25] [cursor=pointer]:
          - /url: /modules/intelligence
          - img [ref=e27]
        - button "Updates — unavailable" [disabled] [ref=e28]:
          - img [ref=e30]
        - link "Account settings" [ref=e31] [cursor=pointer]:
          - /url: /settings/personal
          - img [ref=e33]
    - generic [ref=e34]:
      - complementary [ref=e35]:
        - paragraph [ref=e36]: Modules
        - navigation "Modules" [ref=e37]:
          - link "Module hub" [ref=e38] [cursor=pointer]:
            - /url: /modules
            - img [ref=e40]
            - generic [ref=e41]: Module hub
          - link "Engagement" [ref=e42] [cursor=pointer]:
            - /url: /modules/engagement
            - img [ref=e44]
            - generic [ref=e45]: Engagement
          - link "Planner" [ref=e46] [cursor=pointer]:
            - /url: /modules/planner
            - img [ref=e48]
            - generic [ref=e49]: Planner
          - link "Calendar" [ref=e50] [cursor=pointer]:
            - /url: /modules/calendar
            - img [ref=e52]
            - generic [ref=e53]: Calendar
          - link "Workspace" [ref=e54] [cursor=pointer]:
            - /url: /modules/workspace
            - img [ref=e56]
            - generic [ref=e57]: Workspace
          - link "Strategies" [ref=e58] [cursor=pointer]:
            - /url: /modules/strategies
            - img [ref=e60]
            - generic [ref=e61]: Strategies
          - link "Directory" [ref=e62] [cursor=pointer]:
            - /url: /modules/directory
            - img [ref=e64]
            - generic [ref=e65]: Directory
          - link "Intelligence" [ref=e66] [cursor=pointer]:
            - /url: /modules/intelligence
            - img [ref=e68]
            - generic [ref=e69]: Intelligence
          - link "Research portfolios" [ref=e70] [cursor=pointer]:
            - /url: /modules/research-portfolios
            - img [ref=e72]
            - generic [ref=e73]: Research portfolios
        - link "Settings" [ref=e74] [cursor=pointer]:
          - /url: /settings/personal
          - img [ref=e76]
          - generic [ref=e77]: Settings
      - main [ref=e78]:
        - generic [ref=e79]:
          - generic [ref=e80]:
            - generic [ref=e81]:
              - group [ref=e82]:
                - generic "Master calendar" [ref=e83] [cursor=pointer]
              - heading "Master calendar" [level=1] [ref=e84]
            - generic [ref=e85]:
              - generic [ref=e86]:
                - img [ref=e87]
                - combobox "Calendar client scope" [ref=e88] [cursor=pointer]:
                  - option "Master view" [selected]
                  - option "Current Aerospace"
                  - option "Other Aerospace"
                - img
              - button "New meeting" [ref=e89] [cursor=pointer]
          - region "Master calendar" [ref=e90]:
            - generic [ref=e91]:
              - generic [ref=e92]:
                - button "Previous calendar period" [ref=e93] [cursor=pointer]
                - button "Today" [ref=e94] [cursor=pointer]
                - button "Next calendar period" [ref=e95] [cursor=pointer]
              - button "Choose calendar date" [ref=e96] [cursor=pointer]: October 2026
              - paragraph [ref=e97]: 1 items in view · Eastern time
              - generic "Calendar view" [ref=e98]:
                - button "Month" [ref=e99] [cursor=pointer]
                - button "Week" [ref=e100] [cursor=pointer]
                - button "Agenda" [active] [pressed] [ref=e101] [cursor=pointer]
            - generic [ref=e102]:
              - button "Meetings 0" [pressed] [ref=e103] [cursor=pointer]:
                - text: Meetings
                - generic [ref=e105]: "0"
              - button "Hearings 0" [pressed] [ref=e106] [cursor=pointer]:
                - text: Hearings
                - generic [ref=e108]: "0"
              - button "Planner 1" [pressed] [ref=e109] [cursor=pointer]:
                - text: Planner
                - generic [ref=e111]: "1"
              - button "Government Unavailable" [pressed] [ref=e112] [cursor=pointer]:
                - text: Government
                - generic [ref=e114]: Unavailable
              - button "Deadlines 0" [pressed] [ref=e115] [cursor=pointer]:
                - text: Deadlines
                - generic [ref=e117]: "0"
              - paragraph [ref=e118]: Master view · All client profiles · Your accessible meetings
            - generic [ref=e119]:
              - textbox "Search calendar events" [ref=e120]:
                - /placeholder: Search displayed events
              - button "Clear filters" [ref=e121] [cursor=pointer]
            - table [ref=e122]:
              - rowgroup [ref=e123]:
                - row "When Event Source" [ref=e124]:
                  - columnheader "When" [ref=e125]
                  - columnheader "Event" [ref=e126]
                  - columnheader "Source" [ref=e127]
              - rowgroup [ref=e128]:
                - row "MON, OCT 12 17:00 Test appropriation review Due date · America/New_York Planner" [ref=e129]:
                  - cell "MON, OCT 12 17:00" [ref=e130]:
                    - text: MON, OCT 12
                    - text: 17:00
                  - cell "Test appropriation review Due date · America/New_York" [ref=e131]:
                    - link "Test appropriation review" [ref=e132] [cursor=pointer]:
                      - /url: /modules/planner?task=51000000-0000-4000-8000-000000000001
                    - generic [ref=e133]: Due date · America/New_York
                  - cell "Planner" [ref=e134]
            - note [ref=e135]:
              - paragraph [ref=e136]: "Government unavailable: Unconfigured test operation: calendar.effectiveDates"
              - paragraph [ref=e137]: Federal Register comment deadlines cover the next 30 days and up to 50 records. They are not effective dates.
              - paragraph [ref=e138]: "Funding deadlines unavailable: Unconfigured test operation: intelligence.funding.search"
  - paragraph [ref=e139]: Explicit local test fixture · synthetic identity and records
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | import { clientId, nextTask, setup, taskId } from "./next-modules-fixtures";
  3  | 
  4  | test("MS02 verified Calendar entry dispatches only the selected client scope", async ({page})=>{
  5  |  const reads:unknown[]=[];
  6  |  await setup(page,{"engagement.meetings":input=>{reads.push(input);return [];}});
  7  |  await page.goto(`/modules/calendar?clientId=${clientId}`);
  8  |  await expect(page.getByLabel("Calendar client scope")).toHaveValue(clientId);
  9  |  await expect.poll(()=>reads.length).toBeGreaterThan(0);
  10 |  expect(reads.every(input=>(input as {query:{clientId?:string}}).query.clientId===clientId)).toBe(true);
  11 |  await page.getByRole("button",{name:"Agenda",exact:true}).click();
  12 |  await expect(page.getByText(/Client-associated/)).toBeVisible();
  13 | });
  14 | 
  15 | test("MS03 agenda preserves both Planner start and due occurrences",async({page})=>{
  16 |  await setup(page,{"planner.tasks":{items:[{...nextTask,startOn:"2026-10-10",dueOn:"2026-10-12",startTime:"09:00",dueTime:"17:00",timeZone:"America/New_York"}],nextCursor:null}});
  17 |  await page.goto("/modules/calendar");
  18 |  await page.getByRole("button",{name:"Agenda",exact:true}).click();
  19 |  const rows=page.getByRole("row").filter({hasText:nextTask.name});
> 20 |  await expect(rows).toHaveCount(2);
     |                     ^ Error: expect(locator).toHaveCount(expected) failed
  21 |  await expect(rows.filter({hasText:"Start date"})).toContainText("09:00");
  22 |  await expect(rows.filter({hasText:"Due date"})).toContainText("17:00");
  23 | });
  24 | 
  25 | test("MS04 meeting failure leaves successful agenda feeds visible",async({page})=>{
  26 |  await setup(page);
  27 |  await page.route("**/api/capiro/engagement.meetings*",route=>route.fulfill({status:403,json:{message:"Meetings currently denied"}}));
  28 |  await page.goto("/modules/calendar");
  29 |  await page.getByRole("button",{name:"Agenda",exact:true}).click();
  30 |  await expect(page.getByRole("alert")).toContainText("Meetings currently denied");
  31 |  await expect(page.getByRole("table")).toContainText(nextTask.name);
  32 |  await expect(page.getByRole("heading",{name:"No events match this view"})).toHaveCount(0);
  33 | });
  34 | 
  35 | test("MS05 linked task resolves beyond the current list and opens its detail",async({page})=>{
  36 |  const reads:unknown[]=[];
  37 |  await setup(page,{"planner.tasks":{items:[],nextCursor:null},"planner.task":input=>{reads.push(input);return nextTask;}});
  38 |  await page.goto(`/modules/planner?task=${taskId}`);
  39 |  await expect(page.getByRole("dialog",{name:nextTask.name,exact:true})).toBeVisible();
  40 |  expect(reads).toEqual([{params:{id:taskId}}]);
  41 |  await expect(page.getByRole("button",{name:"Edit task",exact:true})).toBeEnabled();
  42 | });
  43 | 
```