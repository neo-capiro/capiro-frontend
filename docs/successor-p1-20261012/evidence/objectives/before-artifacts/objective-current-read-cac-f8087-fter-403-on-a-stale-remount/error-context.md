# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: objective-current-read.spec.ts >> cached list is hidden after 403 on a stale remount
- Location: apps/web/tests/browser/objective-current-read.spec.ts:18:3

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  getByText('Test outcome', { exact: true })
Expected: 0
Received: 1
Timeout:  5000ms

Call log:
  - Expect "toHaveCount" with timeout 5000ms
  - waiting for getByText('Test outcome', { exact: true })
    14 × locator resolved to 1 element
       - unexpected value "1"

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - link "Skip to content" [ref=e3] [cursor=pointer]:
    - /url: "#main"
  - banner [ref=e4]:
    - link "Capiro Home" [ref=e5] [cursor=pointer]:
      - /url: /
      - img "Capiro" [ref=e6]
    - navigation "Workspace" [ref=e7]:
      - link "Meri" [ref=e8] [cursor=pointer]:
        - /url: /meri
      - link "Portfolio" [ref=e9] [cursor=pointer]:
        - /url: /
      - link "Modules" [ref=e10] [cursor=pointer]:
        - /url: /modules
    - navigation "Global actions" [ref=e11]:
      - link "Quick log" [ref=e12] [cursor=pointer]:
        - /url: /portfolio/10000000-0000-4000-8000-000000000001?log=1
      - link "Master calendar" [ref=e13] [cursor=pointer]:
        - /url: /calendar
      - link "Search Portfolio" [ref=e14] [cursor=pointer]:
        - /url: /portfolio?search=1
      - button "Updates unavailable" [disabled] [ref=e15]
      - button "Test account" [ref=e17] [cursor=pointer]: T
  - generic [ref=e18]:
    - complementary "Portfolio navigation" [ref=e19]:
      - paragraph [ref=e20]: Portfolio
      - navigation "Portfolio" [ref=e21]:
        - link "Portfolio Overview" [ref=e22] [cursor=pointer]:
          - /url: /portfolio
          - generic [ref=e23]: Overview
        - link "Portfolio Clients" [ref=e24] [cursor=pointer]:
          - /url: /portfolio?type=CLIENT
          - generic [ref=e25]: Clients
        - link "Portfolio Prospects" [ref=e26] [cursor=pointer]:
          - /url: /portfolio/prospects
          - generic [ref=e27]: Prospects
      - separator [ref=e28]
      - paragraph [ref=e29]: Test Aerospace
      - navigation "Client" [ref=e30]:
        - link "Overview" [ref=e31] [cursor=pointer]:
          - /url: /portfolio/10000000-0000-4000-8000-000000000001
          - generic [ref=e32]: Overview
        - link "Objectives" [active] [ref=e33] [cursor=pointer]:
          - /url: /portfolio/10000000-0000-4000-8000-000000000001/objectives
          - generic [ref=e34]: Objectives
        - link "Calendar" [ref=e35] [cursor=pointer]:
          - /url: /portfolio/10000000-0000-4000-8000-000000000001/calendar
          - generic [ref=e36]: Calendar
        - link "Relationships" [ref=e37] [cursor=pointer]:
          - /url: /portfolio/10000000-0000-4000-8000-000000000001/relationships
          - generic [ref=e38]: Relationships
        - link "Work" [ref=e39] [cursor=pointer]:
          - /url: /portfolio/10000000-0000-4000-8000-000000000001/work
          - generic [ref=e40]: Work
        - link "Capabilities" [ref=e41] [cursor=pointer]:
          - /url: /portfolio/10000000-0000-4000-8000-000000000001/capabilities
          - generic [ref=e42]: Capabilities
        - link "Bill Tracker" [ref=e43] [cursor=pointer]:
          - /url: /portfolio/10000000-0000-4000-8000-000000000001/bills
          - generic [ref=e44]: Bill Tracker
        - link "Opportunities" [ref=e45] [cursor=pointer]:
          - /url: /portfolio/10000000-0000-4000-8000-000000000001/opportunities
          - generic [ref=e46]: Opportunities
        - link "Files" [ref=e47] [cursor=pointer]:
          - /url: /portfolio/10000000-0000-4000-8000-000000000001/files
          - generic [ref=e48]: Files
      - link "Settings" [ref=e50] [cursor=pointer]:
        - /url: /settings
    - main [ref=e51]:
      - generic [ref=e52]:
        - generic [ref=e53]:
          - navigation "Breadcrumb" [ref=e54]:
            - link "Back to Portfolio" [ref=e55] [cursor=pointer]:
              - /url: /portfolio
            - link "Portfolio" [ref=e56] [cursor=pointer]:
              - /url: /portfolio
            - generic [ref=e57]: /
            - link "Test Aerospace" [ref=e58] [cursor=pointer]:
              - /url: /portfolio/10000000-0000-4000-8000-000000000001
            - generic [ref=e59]: /
            - 'button "Switch client view: Objectives" [ref=e60] [cursor=pointer]': Objectives
          - generic [ref=e61]:
            - button "Quick add" [ref=e62] [cursor=pointer]:
              - generic [ref=e63]: Quick add
            - button "Meri actions" [ref=e64] [cursor=pointer]:
              - generic [ref=e65]: Meri actions
            - button "More actions for Test Aerospace" [ref=e66] [cursor=pointer]:
              - img [ref=e67]
        - region "Client identity" [ref=e71]:
          - generic [ref=e72]: TA
          - generic [ref=e73]:
            - strong [ref=e74]: Test Aerospace
            - paragraph [ref=e75]: Aerospace
          - generic [ref=e76]: active client
      - generic [ref=e78]:
        - generic [ref=e79]:
          - generic [ref=e80]:
            - paragraph [ref=e81]: Outcomes and institutional memory
            - heading "Objectives" [level=1] [ref=e82]
          - button "New objective" [ref=e83] [cursor=pointer]:
            - img [ref=e84]
            - text: New objective
        - generic [ref=e85]:
          - region "Advocacy history" [ref=e86]:
            - generic [ref=e87]:
              - heading "Advocacy history" [level=2] [ref=e89]
              - button "New matter" [ref=e90] [cursor=pointer]:
                - img [ref=e91]
                - text: New matter
            - paragraph [ref=e92]: Advocacy records and linked events for this client.
            - generic [ref=e93]:
              - generic [ref=e94]:
                - generic "History view" [ref=e95]:
                  - button "Timeline" [pressed] [ref=e96] [cursor=pointer]
                  - button "Matters" [ref=e97] [cursor=pointer]
                - generic [ref=e98]:
                  - generic [ref=e99]: Search advocacy history
                  - searchbox "Search advocacy history" [ref=e100]
                - generic [ref=e101]:
                  - generic [ref=e102]: Matter status
                  - combobox "Matter status" [ref=e103]:
                    - option "All statuses" [selected]
                    - option "planning"
                    - option "active"
                    - option "monitoring"
                    - option "outcome observed"
                    - option "successful"
                    - option "partially successful"
                    - option "unsuccessful"
                    - option "withdrawn"
                    - option "archived"
              - paragraph [ref=e104]: 0 loaded events · Latest 500 at most; older history may be outside this view.
              - generic [ref=e105]:
                - list "Loaded advocacy events"
                - paragraph [ref=e106]: No matching events in the loaded history.
            - button "Unassigned records" [ref=e108] [cursor=pointer]
          - generic [ref=e109]:
            - generic [ref=e110]:
              - heading "Current objectives" [level=2] [ref=e111]
              - combobox "Objective status" [ref=e112]:
                - option "All statuses" [selected]
                - option "Draft"
                - option "In review"
                - option "Ready"
            - alert [ref=e113]:
              - paragraph [ref=e114]: You do not have permission for this operation.
              - button "Retry" [ref=e115] [cursor=pointer]
            - article [ref=e116]:
              - generic [ref=e117]:
                - generic [ref=e118]: Draft
                - button "Delete Test outcome" [ref=e119] [cursor=pointer]:
                  - img [ref=e120]
              - heading "Test outcome" [level=2] [ref=e123]:
                - button "Test outcome" [ref=e124] [cursor=pointer]
              - paragraph [ref=e125]: Test problem
              - separator [ref=e126]
              - paragraph [ref=e127]: Minimum win Test minimum win
              - generic [ref=e128]:
                - generic [ref=e129]: Unassigned
                - generic [ref=e130]: 4/4 required fields
              - button "Open objective" [ref=e131] [cursor=pointer]
```

# Test source

```ts
  1   | import { expect, test, type Page } from "@playwright/test";
  2   | import { client, clientId, objective, objectiveId, installFixtures, json } from "./fixtures";
  3   | 
  4   | async function refresh(page: Page) {
  5   |   await page.evaluate(() => window.dispatchEvent(new Event("objective-current-read-refresh")));
  6   | }
  7   | async function currentFixture(page: Page) {
  8   |   const unexpected = await installFixtures(page);
  9   |   const state = { status: 200, records: [objective], reads: 0 };
  10  |   await page.route(`**/core/clients/${clientId}/objectives`, route => {
  11  |     state.reads++;
  12  |     return json(route, state.status === 200 ? state.records : {message:"Synthetic current objectives unavailable"},state.status);
  13  |   });
  14  |   return {state,unexpected};
  15  | }
  16  | 
  17  | for (const status of [403, 503]) {
  18  |   test(`cached list is hidden after ${status} on a stale remount`, async ({page}) => {
  19  |     const {state,unexpected} = await currentFixture(page);
  20  |     await page.clock.install();
  21  |     await page.goto(`/portfolio/${clientId}/objectives`);
  22  |     await expect(page.getByRole("button",{name:"Test outcome",exact:true})).toBeVisible();
  23  |     await page.clock.fastForward(31000);
  24  |     state.status=status;
  25  |     await page.getByRole("link",{name:"Capabilities",exact:true}).click();
  26  |     await page.getByRole("link",{name:"Objectives",exact:true}).click();
  27  |     await expect(page.getByRole("alert")).toBeVisible();
> 28  |     await expect(page.getByText("Test outcome",{exact:true})).toHaveCount(0);
      |                                                               ^ Error: expect(locator).toHaveCount(expected) failed
  29  |     await expect(page.getByText("Test minimum win",{exact:true})).toHaveCount(0);
  30  |     await expect(page.getByRole("button",{name:"New objective",exact:true})).toBeDisabled();
  31  |     expect(state.reads).toBeGreaterThan(1);
  32  |     expect(unexpected).toEqual([]);
  33  |   });
  34  | 
  35  |   test(`failed list ${status} preserves filters and restores only a successful current read`, async ({page}) => {
  36  |     const {state,unexpected} = await currentFixture(page);
  37  |     await page.goto("/objective-current-read.html");
  38  |     await expect(page.getByRole("button",{name:"Test outcome",exact:true})).toBeVisible();
  39  |     await page.getByLabel("Objective status").selectOption("draft");
  40  |     state.status=status;
  41  |     await refresh(page);
  42  |     await expect(page.getByRole("alert")).toBeVisible();
  43  |     await expect(page.getByRole("article")).toHaveCount(0);
  44  |     await page.getByLabel("Objective status").selectOption("ready");
  45  |     await expect(page.getByText("No objectives match this status")).toHaveCount(0);
  46  |     await page.getByLabel("Objective status").selectOption("draft");
  47  |     await expect(page.getByRole("article")).toHaveCount(0);
  48  |     let release!: () => void;
  49  |     const waiting = new Promise<void>(resolve => {release=resolve;});
  50  |     await page.route(`**/core/clients/${clientId}/objectives`,async route => {
  51  |       await waiting;
  52  |       return json(route,[{...objective,outcome:"Current recovered outcome"}]);
  53  |     });
  54  |     await page.getByRole("alert").getByRole("button",{name:"Retry"}).click();
  55  |     await expect(page.getByRole("article")).toHaveCount(0);
  56  |     release();
  57  |     await expect(page.getByRole("button",{name:"Current recovered outcome",exact:true})).toBeVisible();
  58  |     await expect(page.getByRole("button",{name:"New objective",exact:true})).toBeEnabled();
  59  |     await expect(page.getByLabel("Objective status")).toHaveValue("draft");
  60  |     await expect(page.getByText("Test outcome",{exact:true})).toHaveCount(0);
  61  |     expect(unexpected).toEqual([]);
  62  |   });
  63  | 
  64  |   test(`failed summary ${status} hides retained content and creation entry until recovery`, async ({page}) => {
  65  |     const {state,unexpected} = await currentFixture(page);
  66  |     await page.goto("/objective-current-read.html?summary=1");
  67  |     await expect(page.getByRole("link",{name:/Test outcome/})).toBeVisible();
  68  |     state.status=status;
  69  |     await refresh(page);
  70  |     await expect(page.getByRole("alert")).toBeVisible();
  71  |     await expect(page.getByText("Test outcome",{exact:true})).toHaveCount(0);
  72  |     await expect(page.getByRole("link",{name:"New objective",exact:true})).toHaveCount(0);
  73  |     state.status=200;state.records=[{...objective,outcome:"Refreshed summary"}];
  74  |     await page.getByRole("alert").getByRole("button",{name:"Retry"}).click();
  75  |     await expect(page.getByRole("link",{name:/Refreshed summary/})).toBeVisible();
  76  |     await expect(page.getByRole("link",{name:"New objective",exact:true})).toBeVisible();
  77  |     expect(unexpected).toEqual([]);
  78  |   });
  79  | 
  80  |   test(`failed read ${status} closes the selected editor and does not restore its stale draft`, async ({page}) => {
  81  |     const {state,unexpected} = await currentFixture(page);
  82  |     await page.goto(`/objective-current-read.html?objective=${objectiveId}`);
  83  |     const editor=page.getByRole("dialog",{name:"Edit objective"});
  84  |     await expect(editor).toBeVisible();
  85  |     await editor.getByLabel("Outcome",{exact:true}).fill("Stale unsaved editor");
  86  |     state.status=status;
  87  |     await refresh(page);
  88  |     await expect(editor).toHaveCount(0);
  89  |     await expect(page.getByRole("alert")).toBeVisible();
  90  |     await expect(page).not.toHaveURL(/objective=/);
  91  |     state.status=200;state.records=[{...objective,outcome:"Recovered editor source"}];
  92  |     await page.getByRole("alert").getByRole("button",{name:"Retry"}).click();
  93  |     await expect(page.getByRole("button",{name:"Recovered editor source",exact:true})).toBeVisible();
  94  |     await expect(editor).toHaveCount(0);
  95  |     await page.getByRole("button",{name:"Recovered editor source",exact:true}).click();
  96  |     await expect(editor.getByLabel("Outcome",{exact:true})).toHaveValue("Recovered editor source");
  97  |     expect(unexpected).toEqual([]);
  98  |   });
  99  | }
  100 | 
  101 | test("failed current read clears delete confirmation and new-objective input", async ({page}) => {
  102 |   const {state,unexpected} = await currentFixture(page);
  103 |   await page.goto("/objective-current-read.html");
  104 |   await page.getByRole("button",{name:"Delete Test outcome",exact:true}).click();
  105 |   await expect(page.getByRole("dialog",{name:"Delete objective"})).toBeVisible();
  106 |   state.status=403;await refresh(page);
  107 |   await expect(page.getByRole("dialog",{name:"Delete objective"})).toHaveCount(0);
  108 |   state.status=200;
  109 |   await page.getByRole("alert").getByRole("button",{name:"Retry"}).click();
  110 |   await expect(page.getByRole("button",{name:"Test outcome",exact:true})).toBeVisible();
  111 |   await expect(page.getByRole("dialog",{name:"Delete objective"})).toHaveCount(0);
  112 |   await page.getByRole("button",{name:"New objective",exact:true}).click();
  113 |   await page.getByLabel("Outcome",{exact:true}).fill("Unsaved new objective");
  114 |   state.status=503;await refresh(page);
  115 |   await expect(page.getByRole("alert")).toBeVisible();
  116 |   await expect(page.getByLabel("Outcome",{exact:true})).toHaveCount(0);
  117 |   await expect(page).not.toHaveURL(/new=/);
  118 |   expect(unexpected).toEqual([]);
  119 | });
  120 | 
  121 | test("client replacement rejects a late former-client read and recovers the new client", async ({page}) => {
  122 |   const {unexpected}=await currentFixture(page);
  123 |   const nextClient="10000000-0000-4000-8000-000000000002";
  124 |   await page.route(`**/core/clients/${nextClient}`,route=>json(route,{...client,id:nextClient,name:"Other current client"}));
  125 |   await page.route(`**/core/clients/${nextClient}/advocacy-matters**`,route=>json(route,[]));
  126 |   let allowed=false;
  127 |   await page.route(`**/core/clients/${nextClient}/objectives`,route=>json(route,allowed?[{...objective,clientId:nextClient,outcome:"New client outcome"}]:{message:"Synthetic new client denial"},allowed?200:403));
  128 |   await page.goto("/objective-current-read.html");
```