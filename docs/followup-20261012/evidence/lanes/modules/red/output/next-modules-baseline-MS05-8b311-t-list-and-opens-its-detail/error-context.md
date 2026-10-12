# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: next-modules-baseline.spec.ts >> MS05 linked task resolves beyond the current list and opens its detail
- Location: apps/web/test/browser/next-modules-baseline.spec.ts:35:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('dialog', { name: 'Test appropriation review', exact: true })
Expected: visible
Timeout: 4000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 4000ms
  - waiting for getByRole('dialog', { name: 'Test appropriation review', exact: true })

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
  - navigation "Breadcrumb":
    - link "← Modules":
      - /url: /modules
    - combobox "Switch module": Planner
  - heading "Planner" [level=1]
  - paragraph: Coordinate tasks, projects and capacity across your permitted work.
  - button "Refresh"
  - tablist "Planner sections":
    - tab "My tasks" [selected]
    - tab "All tasks"
    - tab "Projects"
    - tab "Inbox"
    - tab "Portfolios"
    - tab "Goals"
    - tab "Workload"
    - tab "Capacity"
    - tab "Reporting"
    - tab "Timesheets"
    - tab "Templates"
    - tab "Rules"
    - tab "Forms"
  - tablist "Task display":
    - tab "List" [selected]
    - tab "Board"
    - tab "Calendar"
    - tab "Timeline"
    - tab "Gantt"
  - button "+ New task"
  - searchbox "Search tasks"
  - combobox "Status": Status · Open
  - combobox "Assignee": All assignees
  - combobox "Priority": Priority · All
  - button "Import CSV"
  - button "Save view"
  - button "My tasks settings"
  - paragraph: Time is shown as hours:minutes. This page includes only work you can access.
  - heading "No tasks match this view" [level=2]
  - paragraph: Adjust your filters or add a record to get started.
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
  31 |  await expect(page.getByRole("table")).toContainText(nextTask.name);
  32 |  await expect(page.getByRole("heading",{name:"No events match this view"})).toHaveCount(0);
  33 | });
  34 | 
  35 | test("MS05 linked task resolves beyond the current list and opens its detail",async({page})=>{
  36 |  const reads:unknown[]=[];
  37 |  await setup(page,{"planner.tasks":{items:[],nextCursor:null},"planner.task":input=>{reads.push(input);return nextTask;}});
  38 |  await page.goto(`/modules/planner?task=${taskId}`);
> 39 |  await expect(page.getByRole("dialog",{name:nextTask.name,exact:true})).toBeVisible();
     |                                                                         ^ Error: expect(locator).toBeVisible() failed
  40 |  expect(reads).toEqual([{params:{id:taskId}}]);
  41 |  await expect(page.getByRole("button",{name:"Edit task",exact:true})).toBeEnabled();
  42 | });
  43 | 
```