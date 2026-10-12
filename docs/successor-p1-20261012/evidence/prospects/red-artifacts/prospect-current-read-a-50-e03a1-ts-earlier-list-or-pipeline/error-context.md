# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: prospect-current-read.spec.ts >> a 503 failed cached filter read cannot expose its earlier list or pipeline
- Location: apps/web/tests/browser/prospect-current-read.spec.ts:177:3

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  getByRole('link', { name: /Test Prospect|Recovered prospect/ })
Expected: 0
Received: 1
Timeout:  5000ms

Call log:
  - Expect "toHaveCount" with timeout 5000ms
  - waiting for getByRole('link', { name: /Test Prospect|Recovered prospect/ })
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
        - /url: /portfolio?log=1
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
      - link "Settings" [ref=e29] [cursor=pointer]:
        - /url: /settings
    - main [ref=e30]:
      - generic [ref=e31]:
        - generic [ref=e32]:
          - generic [ref=e33]:
            - paragraph [ref=e34]: Portfolio
            - heading "Prospects 1" [level=1] [ref=e35]
          - button "+ Add prospect" [ref=e36] [cursor=pointer]
        - generic [ref=e37]:
          - textbox "Search prospects" [active] [ref=e38]
          - combobox "Prospect owner" [ref=e39]:
            - option "All owners" [selected]
          - combobox "Prospect stage" [ref=e40]:
            - option "All stages" [selected]
            - option "Identified"
            - option "Initiated"
            - option "Engaged"
            - option "Proposal"
            - option "Negotiation"
            - option "Closed won"
            - option "Closed lost"
            - option "Researching"
            - option "Qualified"
            - option "Outreach"
            - option "Meeting"
            - option "Won"
            - option "Lost"
            - option "Parked"
          - combobox "Prospect visibility" [ref=e41]:
            - option "Active" [selected]
            - option "Archived"
            - option "All"
          - button "Pipeline" [ref=e42] [cursor=pointer]
        - alert [ref=e43]:
          - paragraph [ref=e44]: Synthetic current prospect read failed
          - button "Retry" [ref=e45] [cursor=pointer]
        - generic "Stage totals" [ref=e46]:
          - generic [ref=e47]: Proposal · 1
        - link "TP Test Prospect Virginia Proposal Unassigned Review proposal" [ref=e49] [cursor=pointer]:
          - /url: /portfolio/prospects/70000000-0000-4000-8000-000000000001
          - generic [ref=e50]:
            - generic [ref=e51]: TP
            - generic [ref=e52]:
              - heading "Test Prospect" [level=3] [ref=e53]
              - text: Virginia
          - generic [ref=e54]:
            - generic [ref=e55]: Proposal
            - generic [ref=e56]: Unassigned
          - paragraph [ref=e57]: Review proposal
```

# Test source

```ts
  10  |   stages: [
  11  |     "identified",
  12  |     "initiated",
  13  |     "engaged",
  14  |     "proposal",
  15  |     "negotiation",
  16  |     "closed_won",
  17  |     "closed_lost",
  18  |   ].map((value) => ({ value, label: value })),
  19  | };
  20  | 
  21  | async function setup(page: Page) {
  22  |   await page.route("**/*", (route) =>
  23  |     new URL(route.request().url()).hostname === "127.0.0.1"
  24  |       ? route.continue()
  25  |       : route.abort("blockedbyclient"),
  26  |   );
  27  |   const unexpected = await installFixtures(page);
  28  |   await page.clock.install();
  29  |   await page.route("**/business-development/prospect-stages", (route) =>
  30  |     json(route, catalog),
  31  |   );
  32  |   let status = 200;
  33  |   let record = { ...prospect };
  34  |   let reads = 0;
  35  |   let held: Promise<void> | undefined;
  36  |   let release!: () => void;
  37  |   const writes: string[] = [];
  38  |   page.on("request", (request) => {
  39  |     if (request.url().includes("/api/backend/") && request.method() !== "GET")
  40  |       writes.push(request.method());
  41  |   });
  42  |   await page.route(
  43  |     "**/api/backend/core/business-development/prospects?*",
  44  |     async (route) => {
  45  |       reads++;
  46  |       if (held) await held;
  47  |       return status === 200
  48  |         ? json(route, {
  49  |             prospects: [record],
  50  |             counts: {
  51  |               visible: 1,
  52  |               total: 1,
  53  |               active: 1,
  54  |               dismissed: 0,
  55  |               byStage: { proposal: 1 },
  56  |             },
  57  |           })
  58  |         : json(
  59  |             route,
  60  |             { message: "Synthetic current prospect read failed" },
  61  |             status,
  62  |           );
  63  |     },
  64  |   );
  65  |   return {
  66  |     unexpected,
  67  |     writes,
  68  |     reads: () => reads,
  69  |     fail: (code: number) => {
  70  |       status = code;
  71  |     },
  72  |     recover: () => {
  73  |       status = 200;
  74  |       record = {
  75  |         ...prospect,
  76  |         displayName: "Recovered prospect",
  77  |         nextAction: "Current next action",
  78  |       };
  79  |       held = new Promise<void>((resolve) => {
  80  |         release = resolve;
  81  |       });
  82  |       return () => {
  83  |         held = undefined;
  84  |         release();
  85  |       };
  86  |     },
  87  |   };
  88  | }
  89  | 
  90  | async function replaceRoute(page: Page, path: string) {
  91  |   await page.evaluate((next) => {
  92  |     history.pushState({}, "", next);
  93  |     dispatchEvent(new PopStateEvent("popstate"));
  94  |   }, path);
  95  | }
  96  | 
  97  | async function expectUnavailable(page: Page, status: number) {
  98  |   await expect(
  99  |     page
  100 |       .getByRole("alert")
  101 |       .filter({
  102 |         hasText:
  103 |           status === 403
  104 |             ? "You do not have permission"
  105 |             : "Synthetic current prospect read failed",
  106 |       }),
  107 |   ).toBeVisible();
  108 |   await expect(
  109 |     page.getByRole("link", { name: /Test Prospect|Recovered prospect/ }),
> 110 |   ).toHaveCount(0);
      |     ^ Error: expect(locator).toHaveCount(expected) failed
  111 |   await expect(page.getByText("Review proposal", { exact: true })).toHaveCount(
  112 |     0,
  113 |   );
  114 |   await expect(
  115 |     page.getByRole("heading", { name: "Prospects", exact: true }),
  116 |   ).toBeVisible();
  117 |   await expect(page.getByLabel("Stage totals")).toHaveCount(0);
  118 |   await expect(
  119 |     page.getByRole("button", { name: "Pipeline", exact: true }),
  120 |   ).toBeDisabled();
  121 |   await expect(
  122 |     page.getByRole("button", { name: "+ Add prospect", exact: true }),
  123 |   ).toBeDisabled();
  124 |   await expect(page.getByRole("dialog")).toHaveCount(0);
  125 | }
  126 | 
  127 | async function recover(page: Page, control: Awaited<ReturnType<typeof setup>>) {
  128 |   const release = control.recover();
  129 |   const reads = control.reads();
  130 |   await page.getByRole("button", { name: "Retry", exact: true }).click();
  131 |   await expect.poll(control.reads).toBeGreaterThan(reads);
  132 |   await expect(
  133 |     page.getByRole("link", { name: /Test Prospect|Recovered prospect/ }),
  134 |   ).toHaveCount(0);
  135 |   await expect(
  136 |     page.getByRole("button", { name: "Pipeline", exact: true }),
  137 |   ).toBeDisabled();
  138 |   await expect(
  139 |     page.getByRole("button", { name: "+ Add prospect", exact: true }),
  140 |   ).toBeDisabled();
  141 |   await expect(page.getByRole("dialog")).toHaveCount(0);
  142 |   release();
  143 |   await expect(
  144 |     page.getByRole("link", { name: /Recovered prospect/ }),
  145 |   ).toBeVisible();
  146 |   await expect(
  147 |     page.getByRole("button", { name: "Pipeline", exact: true }),
  148 |   ).toBeEnabled();
  149 |   await expect(
  150 |     page.getByRole("button", { name: "+ Add prospect", exact: true }),
  151 |   ).toBeEnabled();
  152 |   await expect(page.getByRole("dialog")).toHaveCount(0);
  153 |   expect(control.writes).toEqual([]);
  154 |   expect(control.unexpected).toEqual([]);
  155 | }
  156 | 
  157 | for (const status of [403, 503]) {
  158 |   test(`a ${status} current read on remount withholds cached records until a successful retry`, async ({
  159 |     page,
  160 |   }, info) => {
  161 |     const control = await setup(page);
  162 |     await page.goto(listPath);
  163 |     await page.getByRole("link", { name: /Test Prospect/ }).click();
  164 |     await expect(
  165 |       page.getByRole("heading", { name: "Test Prospect", exact: true }),
  166 |     ).toBeVisible();
  167 |     control.fail(status);
  168 |     await page.clock.fastForward(31_000);
  169 |     await page.getByRole("link", { name: "← Prospects", exact: true }).click();
  170 |     await expectUnavailable(page, status);
  171 |     await page.screenshot({
  172 |       path: info.outputPath(`current-read-${status}.png`),
  173 |     });
  174 |     await recover(page, control);
  175 |   });
  176 | 
  177 |   test(`a ${status} failed cached filter read cannot expose its earlier list or pipeline`, async ({
  178 |     page,
  179 |   }) => {
  180 |     const control = await setup(page);
  181 |     await page.goto(listPath);
  182 |     await expect(
  183 |       page.getByRole("link", { name: /Test Prospect/ }),
  184 |     ).toBeVisible();
  185 |     await page.getByLabel("Search prospects").fill("Synthetic");
  186 |     await expect.poll(control.reads).toBe(2);
  187 |     await expect(
  188 |       page.getByRole("link", { name: /Test Prospect/ }),
  189 |     ).toBeVisible();
  190 |     control.fail(status);
  191 |     await page.clock.fastForward(31_000);
  192 |     await page.getByLabel("Search prospects").fill("");
  193 |     await expectUnavailable(page, status);
  194 |     await recover(page, control);
  195 |   });
  196 | 
  197 |   for (const overlay of ["pipeline", "create"] as const)
  198 |     test(`a ${status} current read failure discards the open ${overlay} editor`, async ({
  199 |       page,
  200 |     }) => {
  201 |       const control = await setup(page);
  202 |       await page.goto(listPath);
  203 |       await expect(
  204 |         page.getByRole("link", { name: /Test Prospect/ }),
  205 |       ).toBeVisible();
  206 |       if (overlay === "pipeline") {
  207 |         await page
  208 |           .getByRole("button", { name: "Pipeline", exact: true })
  209 |           .click();
  210 |         await page
```