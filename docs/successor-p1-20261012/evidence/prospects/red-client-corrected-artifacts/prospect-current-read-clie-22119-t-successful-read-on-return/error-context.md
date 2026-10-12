# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: prospect-current-read.spec.ts >> client route replacement discards a failed Prospects editor and requires a current successful read on return
- Location: apps/web/tests/browser/prospect-current-read.spec.ts:250:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('alert').filter({ hasText: 'You do not have permission' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('alert').filter({ hasText: 'You do not have permission' })

```

```yaml
- dialog "Add prospect":
  - banner:
    - heading "Add prospect" [level=2]
    - button "Close"
  - paragraph: Add prospect
  - text: Company name
  - textbox "Company name"
  - text: Website
  - textbox "Website"
  - text: Domain
  - textbox "Domain":
    - /placeholder: example.com
  - text: Description
  - textbox "Description"
  - text: Service hypothesis
  - textbox "Service hypothesis"
  - text: Geography
  - textbox "Geography"
  - button "Create prospect"
```

# Test source

```ts
  8   |   legacyMapping: "pending",
  9   |   allowLegacyTransitions: false,
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
  28  |   const errors: string[] = [];
  29  |   page.on("pageerror", (error) => errors.push(error.message));
  30  |   await page.clock.setFixedTime(new Date("2026-10-12T12:00:00Z"));
  31  |   await page.route("**/business-development/prospect-stages", (route) =>
  32  |     json(route, catalog),
  33  |   );
  34  |   let status = 200;
  35  |   let record = { ...prospect };
  36  |   let reads = 0;
  37  |   let held: Promise<void> | undefined;
  38  |   let release!: () => void;
  39  |   const writes: string[] = [];
  40  |   page.on("request", (request) => {
  41  |     if (request.url().includes("/api/backend/") && request.method() !== "GET")
  42  |       writes.push(request.method());
  43  |   });
  44  |   await page.route(
  45  |     "**/api/backend/core/business-development/prospects?*",
  46  |     async (route) => {
  47  |       reads++;
  48  |       if (held) await held;
  49  |       return status === 200
  50  |         ? json(route, {
  51  |             prospects: [record],
  52  |             counts: {
  53  |               visible: 1,
  54  |               total: 1,
  55  |               active: 1,
  56  |               dismissed: 0,
  57  |               byStage: { proposal: 1 },
  58  |             },
  59  |           })
  60  |         : json(
  61  |             route,
  62  |             { message: "Synthetic current prospect read failed" },
  63  |             status,
  64  |           );
  65  |     },
  66  |   );
  67  |   return {
  68  |     unexpected,
  69  |     errors,
  70  |     writes,
  71  |     reads: () => reads,
  72  |     fail: (code: number) => {
  73  |       status = code;
  74  |     },
  75  |     recover: () => {
  76  |       status = 200;
  77  |       record = {
  78  |         ...prospect,
  79  |         displayName: "Recovered prospect",
  80  |         nextAction: "Current next action",
  81  |       };
  82  |       held = new Promise<void>((resolve) => {
  83  |         release = resolve;
  84  |       });
  85  |       return () => {
  86  |         held = undefined;
  87  |         release();
  88  |       };
  89  |     },
  90  |   };
  91  | }
  92  | 
  93  | async function replaceRoute(page: Page, path: string) {
  94  |   await page.evaluate((next) => {
  95  |     history.pushState({}, "", next);
  96  |     dispatchEvent(new PopStateEvent("popstate"));
  97  |   }, path);
  98  | }
  99  | 
  100 | async function expectUnavailable(page: Page, status: number) {
  101 |   await expect(
  102 |     page.getByRole("alert").filter({
  103 |       hasText:
  104 |         status === 403
  105 |           ? "You do not have permission"
  106 |           : "Synthetic current prospect read failed",
  107 |     }),
> 108 |   ).toBeVisible();
      |     ^ Error: expect(locator).toBeVisible() failed
  109 |   await expect(
  110 |     page.getByRole("link", { name: /Test Prospect|Recovered prospect/ }),
  111 |   ).toHaveCount(0);
  112 |   await expect(page.getByText("Review proposal", { exact: true })).toHaveCount(
  113 |     0,
  114 |   );
  115 |   await expect(
  116 |     page.getByRole("heading", { name: "Prospects", exact: true }),
  117 |   ).toBeVisible();
  118 |   await expect(page.getByLabel("Stage totals")).toHaveCount(0);
  119 |   await expect(
  120 |     page.getByRole("button", { name: "Pipeline", exact: true }),
  121 |   ).toBeDisabled();
  122 |   await expect(
  123 |     page.getByRole("button", { name: "+ Add prospect", exact: true }),
  124 |   ).toBeDisabled();
  125 |   await expect(page.getByRole("dialog")).toHaveCount(0);
  126 | }
  127 | 
  128 | async function recover(page: Page, control: Awaited<ReturnType<typeof setup>>) {
  129 |   const release = control.recover();
  130 |   const reads = control.reads();
  131 |   await page.getByRole("button", { name: "Retry", exact: true }).click();
  132 |   await expect.poll(control.reads).toBeGreaterThan(reads);
  133 |   await expect(
  134 |     page.getByRole("link", { name: /Test Prospect|Recovered prospect/ }),
  135 |   ).toHaveCount(0);
  136 |   await expect(
  137 |     page.getByRole("button", { name: "Pipeline", exact: true }),
  138 |   ).toBeDisabled();
  139 |   await expect(
  140 |     page.getByRole("button", { name: "+ Add prospect", exact: true }),
  141 |   ).toBeDisabled();
  142 |   await expect(page.getByRole("dialog")).toHaveCount(0);
  143 |   release();
  144 |   await expect(
  145 |     page.getByRole("link", { name: /Recovered prospect/ }),
  146 |   ).toBeVisible();
  147 |   await expect(
  148 |     page.getByRole("button", { name: "Pipeline", exact: true }),
  149 |   ).toBeEnabled();
  150 |   await expect(
  151 |     page.getByRole("button", { name: "+ Add prospect", exact: true }),
  152 |   ).toBeEnabled();
  153 |   await expect(page.getByRole("dialog")).toHaveCount(0);
  154 |   expect(control.writes).toEqual([]);
  155 |   expect(control.unexpected).toEqual([]);
  156 |   expect(control.errors).toEqual([]);
  157 | }
  158 | 
  159 | for (const status of [403, 503]) {
  160 |   test(`a ${status} current read on remount withholds cached records until a successful retry`, async ({
  161 |     page,
  162 |   }, info) => {
  163 |     const control = await setup(page);
  164 |     await page.goto(listPath);
  165 |     await page.getByRole("link", { name: /Test Prospect/ }).click();
  166 |     await expect(
  167 |       page.getByRole("heading", { name: "Test Prospect", exact: true }),
  168 |     ).toBeVisible();
  169 |     control.fail(status);
  170 |     await page.clock.setFixedTime(new Date("2026-10-12T12:00:31Z"));
  171 |     await page.getByRole("link", { name: "← Prospects", exact: true }).click();
  172 |     await expectUnavailable(page, status);
  173 |     await page.screenshot({
  174 |       path: info.outputPath(`current-read-${status}.png`),
  175 |     });
  176 |     await recover(page, control);
  177 |   });
  178 | 
  179 |   test(`a ${status} failed cached filter read cannot expose its earlier list or pipeline`, async ({
  180 |     page,
  181 |   }) => {
  182 |     const control = await setup(page);
  183 |     await page.goto(listPath);
  184 |     await expect(
  185 |       page.getByRole("link", { name: /Test Prospect/ }),
  186 |     ).toBeVisible();
  187 |     await page.getByLabel("Search prospects").fill("Synthetic");
  188 |     await expect.poll(control.reads).toBe(2);
  189 |     await expect(
  190 |       page.getByRole("link", { name: /Test Prospect/ }),
  191 |     ).toBeVisible();
  192 |     control.fail(status);
  193 |     await page.clock.setFixedTime(new Date("2026-10-12T12:00:31Z"));
  194 |     await page.getByLabel("Search prospects").fill("");
  195 |     await expectUnavailable(page, status);
  196 |     await recover(page, control);
  197 |   });
  198 | 
  199 |   for (const overlay of ["pipeline", "create"] as const)
  200 |     test(`a ${status} current read failure discards the open ${overlay} editor`, async ({
  201 |       page,
  202 |     }) => {
  203 |       const control = await setup(page);
  204 |       await page.goto(listPath);
  205 |       await expect(
  206 |         page.getByRole("link", { name: /Test Prospect/ }),
  207 |       ).toBeVisible();
  208 |       if (overlay === "pipeline") {
```