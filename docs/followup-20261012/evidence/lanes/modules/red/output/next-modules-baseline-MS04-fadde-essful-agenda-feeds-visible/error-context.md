# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: next-modules-baseline.spec.ts >> MS04 meeting failure leaves successful agenda feeds visible
- Location: apps/web/test/browser/next-modules-baseline.spec.ts:25:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByRole('table')
Expected substring: "Test appropriation review"
Timeout: 4000ms
Error: element(s) not found

Call log:
  - Expect "toContainText" with timeout 4000ms
  - waiting for getByRole('table')

```

```yaml
- link "Skip to content":
  - /url: "#main-content"
- banner:
  - link "Capiro Home":
    - /url: /
    - img "Capiro"
  - navigation "Product modes":
    - link "Meri":
      - /url: /meri
    - link "Portfolio":
      - /url: /
    - link "Modules":
      - /url: /modules
  - navigation "Workspace actions":
    - link "Quick log":
      - /url: /?log=1
    - link "Master calendar":
      - /url: /calendar
    - link "Search intelligence":
      - /url: /modules/intelligence
    - button "Updates — unavailable" [disabled]
    - link "Account settings":
      - /url: /settings/personal
- complementary:
  - paragraph: Modules
  - navigation "Modules":
    - link "Module hub":
      - /url: /modules
    - link "Engagement":
      - /url: /modules/engagement
    - link "Planner":
      - /url: /modules/planner
    - link "Calendar":
      - /url: /modules/calendar
    - link "Workspace":
      - /url: /modules/workspace
    - link "Strategies":
      - /url: /modules/strategies
    - link "Directory":
      - /url: /modules/directory
    - link "Intelligence":
      - /url: /modules/intelligence
    - link "Research portfolios":
      - /url: /modules/research-portfolios
  - link "Settings":
    - /url: /settings/personal
- main:
  - group: Master calendar
  - heading "Master calendar" [level=1]
  - combobox "Calendar client scope":
    - option "Master view" [selected]
    - option "Current Aerospace"
    - option "Other Aerospace"
  - button "New meeting"
  - region "Master calendar":
    - button "Previous calendar period"
    - button "Today"
    - button "Next calendar period"
    - button "Choose calendar date": October 2026
    - paragraph: 1 items in view · Eastern time
    - button "Month"
    - button "Week"
    - button "Agenda" [pressed]
    - button "Meetings 0" [pressed]
    - button "Hearings 0" [pressed]
    - button "Planner 1" [pressed]
    - button "Government Unavailable" [pressed]
    - button "Deadlines 0" [pressed]
    - paragraph: Master view · All client profiles · Your accessible meetings
    - textbox "Search calendar events":
      - /placeholder: Search displayed events
    - button "Clear filters"
    - alert:
      - heading "Unable to load this view" [level=2]
      - paragraph: Meetings currently denied
      - button "Try again"
    - note:
      - paragraph: "Government unavailable: Unconfigured test operation: calendar.effectiveDates"
      - paragraph: Federal Register comment deadlines cover the next 30 days and up to 50 records. They are not effective dates.
      - paragraph: "Funding deadlines unavailable: Unconfigured test operation: intelligence.funding.search"
- paragraph: Explicit local test fixture · synthetic identity and records
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
  20 |  await expect(rows).toHaveCount(2);
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
> 31 |  await expect(page.getByRole("table")).toContainText(nextTask.name);
     |                                        ^ Error: expect(locator).toContainText(expected) failed
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