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

Locator: getByRole('heading', { name: 'Test Aerospace', exact: true, level: 1 })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('heading', { name: 'Test Aerospace', exact: true, level: 1 })

```

```yaml
- link "Skip to content":
  - /url: "#main"
- banner:
  - link "Capiro Home":
    - /url: /
    - img "Capiro"
  - navigation "Workspace":
    - link "Meri":
      - /url: /meri
    - link "Portfolio":
      - /url: /
    - link "Modules":
      - /url: /modules
  - navigation "Global actions":
    - link "Quick log":
      - /url: /portfolio/10000000-0000-4000-8000-000000000001?log=1
    - link "Master calendar":
      - /url: /calendar
    - link "Search Portfolio":
      - /url: /portfolio?search=1
    - button "Updates unavailable" [disabled]
    - button "Test account": T
- complementary "Portfolio navigation":
  - paragraph: Portfolio
  - navigation "Portfolio":
    - link "Portfolio Overview":
      - /url: /portfolio
      - text: Overview
    - link "Portfolio Clients":
      - /url: /portfolio?type=CLIENT
      - text: Clients
    - link "Portfolio Prospects":
      - /url: /portfolio/prospects
      - text: Prospects
  - separator
  - paragraph: Test Aerospace
  - navigation "Client":
    - link "Overview":
      - /url: /portfolio/10000000-0000-4000-8000-000000000001
    - link "Objectives":
      - /url: /portfolio/10000000-0000-4000-8000-000000000001/objectives
    - link "Calendar":
      - /url: /portfolio/10000000-0000-4000-8000-000000000001/calendar
    - link "Relationships":
      - /url: /portfolio/10000000-0000-4000-8000-000000000001/relationships
    - link "Work":
      - /url: /portfolio/10000000-0000-4000-8000-000000000001/work
    - link "Capabilities":
      - /url: /portfolio/10000000-0000-4000-8000-000000000001/capabilities
    - link "Bill Tracker":
      - /url: /portfolio/10000000-0000-4000-8000-000000000001/bills
    - link "Opportunities":
      - /url: /portfolio/10000000-0000-4000-8000-000000000001/opportunities
    - link "Files":
      - /url: /portfolio/10000000-0000-4000-8000-000000000001/files
  - link "Settings":
    - /url: /settings
- main:
  - navigation "Breadcrumb":
    - link "Back to Portfolio":
      - /url: /portfolio
    - link "Portfolio":
      - /url: /portfolio
    - link "Test Aerospace":
      - /url: /portfolio/10000000-0000-4000-8000-000000000001
    - 'button "Switch client view: Relationships"': Relationships
  - button "Quick add"
  - button "Meri actions"
  - button "More actions for Test Aerospace"
  - region "Client identity":
    - text: TA
    - strong: Test Aerospace
    - paragraph: Aerospace
    - text: active client
  - heading "Relationships" [level=1]
  - button "Configure hierarchy"
  - button "Add contact"
  - navigation "Relationship type":
    - link "Organization":
      - /url: /portfolio/10000000-0000-4000-8000-000000000001/relationships?kind=organization
    - link "Government relationships":
      - /url: /portfolio/10000000-0000-4000-8000-000000000001/relationships?kind=government
  - textbox "Search contacts":
    - /placeholder: Search name or title…
  - text: 1 contacts · 1 placed
  - button "Title-based hierarchy"
  - paragraph: Title tiers organize the roster. Blue lines show saved reports-to links.
  - application:
    - button "leadership TT Taylor Test Director Manual placement Added 10/1/2026":
      - paragraph: leadership
      - text: TT
      - strong: Taylor Test
      - paragraph: Director
      - text: Manual placement Added 10/1/2026
    - img
    - button "Zoom In":
      - img
    - button "Zoom Out":
      - img
    - button "Fit View":
      - img
    - img "Mini Map"
    - link "React Flow attribution":
      - /url: https://reactflow.dev/attribution
      - text: React Flow
  - heading "Contact list" [level=3]
  - button "Taylor Test · Director"
```

# Test source

```ts
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
  209 |         await page
  210 |           .getByRole("button", { name: "Pipeline", exact: true })
  211 |           .click();
  212 |         await page
  213 |           .getByRole("button", { name: "Change stage", exact: true })
  214 |           .click();
  215 |         await page.getByLabel("New stage").selectOption("closed_won");
  216 |       } else {
  217 |         await page
  218 |           .getByRole("button", { name: "+ Add prospect", exact: true })
  219 |           .click();
  220 |         await page.getByLabel("Company name").fill("Discard this stale editor");
  221 |       }
  222 |       control.fail(status);
  223 |       await page.clock.setFixedTime(new Date("2026-10-12T12:00:31Z"));
  224 |       await page.evaluate(() => dispatchEvent(new Event("offline")));
  225 |       await page.evaluate(() => dispatchEvent(new Event("online")));
  226 |       await expectUnavailable(page, status);
  227 |       await expect(page).not.toHaveURL(/[?&](pipeline|new)=/);
  228 |       await recover(page, control);
  229 |       if (overlay === "pipeline") {
  230 |         await page
  231 |           .getByRole("button", { name: "Pipeline", exact: true })
  232 |           .click();
  233 |         await expect(
  234 |           page.getByRole("dialog", { name: "Change prospect stage" }),
  235 |         ).toHaveCount(0);
  236 |         await page
  237 |           .getByRole("button", { name: "Change stage", exact: true })
  238 |           .click();
  239 |         await expect(page.getByLabel("New stage")).toHaveValue("proposal");
  240 |       } else {
  241 |         await page
  242 |           .getByRole("button", { name: "+ Add prospect", exact: true })
  243 |           .click();
  244 |         await expect(page.getByLabel("Company name")).toHaveValue("");
  245 |       }
  246 |       expect(control.writes).toEqual([]);
  247 |     });
  248 | }
  249 | 
  250 | test("client route replacement discards a failed Prospects editor and requires a current successful read on return", async ({
  251 |   page,
  252 | }) => {
  253 |   const control = await setup(page);
  254 |   await page.goto(`${listPath}?new=1`);
  255 |   await page.getByLabel("Company name").fill("Former view private input");
  256 |   await replaceRoute(page, `/portfolio/${clientId}/relationships`);
  257 |   await expect(page.getByRole("dialog", { name: "Add prospect" })).toHaveCount(
  258 |     0,
  259 |   );
  260 |   await expect(
  261 |     page.getByRole("heading", {
  262 |       name: "Test Aerospace",
  263 |       exact: true,
  264 |       level: 1,
  265 |     }),
> 266 |   ).toBeVisible();
      |     ^ Error: expect(locator).toBeVisible() failed
  267 |   control.fail(403);
  268 |   await page.clock.setFixedTime(new Date("2026-10-12T12:00:31Z"));
  269 |   await replaceRoute(page, `${listPath}?new=1`);
  270 |   await expectUnavailable(page, 403);
  271 |   await recover(page, control);
  272 |   await page
  273 |     .getByRole("button", { name: "+ Add prospect", exact: true })
  274 |     .click();
  275 |   await expect(page.getByLabel("Company name")).toHaveValue("");
  276 | });
  277 | 
  278 | test("a successful background reread preserves an active creation draft", async ({
  279 |   page,
  280 | }) => {
  281 |   const control = await setup(page);
  282 |   await page.goto(`${listPath}?new=1`);
  283 |   await page.getByLabel("Company name").fill("Keep this current draft");
  284 |   const release = control.recover();
  285 |   await page.clock.setFixedTime(new Date("2026-10-12T12:00:31Z"));
  286 |   await page.evaluate(() => dispatchEvent(new Event("offline")));
  287 |   await page.evaluate(() => dispatchEvent(new Event("online")));
  288 |   await expect.poll(control.reads).toBe(2);
  289 |   await expect(page.getByLabel("Company name")).toHaveValue(
  290 |     "Keep this current draft",
  291 |   );
  292 |   release();
  293 |   await page
  294 |     .getByRole("dialog", { name: "Add prospect" })
  295 |     .getByRole("button", { name: "Close", exact: true })
  296 |     .click();
  297 |   await expect(
  298 |     page.getByRole("link", { name: /Recovered prospect/ }),
  299 |   ).toBeVisible();
  300 |   expect(control.writes).toEqual([]);
  301 |   expect(control.errors).toEqual([]);
  302 | });
  303 | 
```