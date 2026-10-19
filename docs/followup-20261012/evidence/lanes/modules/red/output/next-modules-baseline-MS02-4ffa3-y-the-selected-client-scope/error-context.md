# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: next-modules-baseline.spec.ts >> MS02 verified Calendar entry dispatches only the selected client scope
- Location: apps/web/test/browser/next-modules-baseline.spec.ts:4:1

# Error details

```
Error: expect(locator).toHaveValue(expected) failed

Locator:  getByLabel('Calendar client scope')
Expected: "30000000-0000-4000-8000-000000000001"
Received: ""
Timeout:  4000ms

Call log:
  - Expect "toHaveValue" with timeout 4000ms
  - waiting for getByLabel('Calendar client scope')
    - locator resolved to <select disabled aria-label="Calendar client scope">…</select>
    11 × unexpected value ""
       - locator resolved to <select aria-label="Calendar client scope">…</select>
    - unexpected value ""

```

```yaml
- combobox "Calendar client scope":
  - option "Master view" [selected]
  - option "Current Aerospace"
  - option "Other Aerospace"
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
> 8  |  await expect(page.getByLabel("Calendar client scope")).toHaveValue(clientId);
     |                                                         ^ Error: expect(locator).toHaveValue(expected) failed
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
  39 |  await expect(page.getByRole("dialog",{name:nextTask.name,exact:true})).toBeVisible();
  40 |  expect(reads).toEqual([{params:{id:taskId}}]);
  41 |  await expect(page.getByRole("button",{name:"Edit task",exact:true})).toBeEnabled();
  42 | });
  43 | 
```