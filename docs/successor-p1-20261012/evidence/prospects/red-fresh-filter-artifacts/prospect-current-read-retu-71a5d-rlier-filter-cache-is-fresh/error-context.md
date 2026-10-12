# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: prospect-current-read.spec.ts >> returning from a 403 filtered failure requires a new read even when the earlier filter cache is fresh
- Location: apps/web/tests/browser/prospect-current-read.spec.ts:199:3

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  getByRole('link', { name: /Test Prospect/ })
Expected: 0
Received: 1
Timeout:  5000ms

Call log:
  - Expect "toHaveCount" with timeout 5000ms
  - waiting for getByRole('link', { name: /Test Prospect/ })
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
        - generic "Stage totals" [ref=e43]:
          - generic [ref=e44]: Proposal · 1
        - link "TP Test Prospect Virginia Proposal Unassigned Review proposal" [ref=e46] [cursor=pointer]:
          - /url: /portfolio/prospects/70000000-0000-4000-8000-000000000001
          - generic [ref=e47]:
            - generic [ref=e48]: TP
            - generic [ref=e49]:
              - heading "Test Prospect" [level=3] [ref=e50]
              - text: Virginia
          - generic [ref=e51]:
            - generic [ref=e52]: Proposal
            - generic [ref=e53]: Unassigned
          - paragraph [ref=e54]: Review proposal
```

# Test source

```ts
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
  199 |   test(`returning from a ${status} filtered failure requires a new read even when the earlier filter cache is fresh`, async ({
  200 |     page,
  201 |   }) => {
  202 |     const control = await setup(page);
  203 |     await page.goto(listPath);
  204 |     await expect(
  205 |       page.getByRole("link", { name: /Test Prospect/ }),
  206 |     ).toBeVisible();
  207 |     control.fail(status);
  208 |     await page.getByLabel("Search prospects").fill("Denied filter");
  209 |     await expectUnavailable(page, status);
  210 |     const release = control.recover();
  211 |     const reads = control.reads();
  212 |     await page.getByLabel("Search prospects").fill("");
> 213 |     await expect(page.getByRole("link", { name: /Test Prospect/ })).toHaveCount(
      |                                                                     ^ Error: expect(locator).toHaveCount(expected) failed
  214 |       0,
  215 |     );
  216 |     await expect(
  217 |       page.getByRole("button", { name: "Pipeline", exact: true }),
  218 |     ).toBeDisabled();
  219 |     await expect.poll(control.reads).toBeGreaterThan(reads);
  220 |     release();
  221 |     await expect(
  222 |       page.getByRole("link", { name: /Recovered prospect/ }),
  223 |     ).toBeVisible();
  224 |     expect(control.writes).toEqual([]);
  225 |     expect(control.errors).toEqual([]);
  226 |   });
  227 | 
  228 |   for (const overlay of ["pipeline", "create"] as const)
  229 |     test(`a ${status} current read failure discards the open ${overlay} editor`, async ({
  230 |       page,
  231 |     }) => {
  232 |       const control = await setup(page);
  233 |       await page.goto(listPath);
  234 |       await expect(
  235 |         page.getByRole("link", { name: /Test Prospect/ }),
  236 |       ).toBeVisible();
  237 |       if (overlay === "pipeline") {
  238 |         await page
  239 |           .getByRole("button", { name: "Pipeline", exact: true })
  240 |           .click();
  241 |         await page
  242 |           .getByRole("button", { name: "Change stage", exact: true })
  243 |           .click();
  244 |         await page.getByLabel("New stage").selectOption("closed_won");
  245 |       } else {
  246 |         await page
  247 |           .getByRole("button", { name: "+ Add prospect", exact: true })
  248 |           .click();
  249 |         await page.getByLabel("Company name").fill("Discard this stale editor");
  250 |       }
  251 |       control.fail(status);
  252 |       await page.clock.setFixedTime(new Date("2026-10-12T12:00:31Z"));
  253 |       await page.evaluate(() => dispatchEvent(new Event("offline")));
  254 |       await page.evaluate(() => dispatchEvent(new Event("online")));
  255 |       await expectUnavailable(page, status);
  256 |       await expect(page).not.toHaveURL(/[?&](pipeline|new)=/);
  257 |       await recover(page, control);
  258 |       if (overlay === "pipeline") {
  259 |         await page
  260 |           .getByRole("button", { name: "Pipeline", exact: true })
  261 |           .click();
  262 |         await expect(
  263 |           page.getByRole("dialog", { name: "Change prospect stage" }),
  264 |         ).toHaveCount(0);
  265 |         await page
  266 |           .getByRole("button", { name: "Change stage", exact: true })
  267 |           .click();
  268 |         await expect(page.getByLabel("New stage")).toHaveValue("proposal");
  269 |       } else {
  270 |         await page
  271 |           .getByRole("button", { name: "+ Add prospect", exact: true })
  272 |           .click();
  273 |         await expect(page.getByLabel("Company name")).toHaveValue("");
  274 |       }
  275 |       expect(control.writes).toEqual([]);
  276 |     });
  277 | }
  278 | 
  279 | test("client route replacement discards a failed Prospects editor and requires a current successful read on return", async ({
  280 |   page,
  281 | }) => {
  282 |   const control = await setup(page);
  283 |   await page.goto(`${listPath}?new=1`);
  284 |   await page.getByLabel("Company name").fill("Former view private input");
  285 |   await replaceRoute(page, `/portfolio/${clientId}/relationships`);
  286 |   await expect(page.getByRole("dialog", { name: "Add prospect" })).toHaveCount(
  287 |     0,
  288 |   );
  289 |   await expect(
  290 |     page.getByRole("link", {
  291 |       name: "Test Aerospace",
  292 |       exact: true,
  293 |     }),
  294 |   ).toBeVisible();
  295 |   control.fail(403);
  296 |   await page.clock.setFixedTime(new Date("2026-10-12T12:00:31Z"));
  297 |   await replaceRoute(page, `${listPath}?new=1`);
  298 |   await expectUnavailable(page, 403);
  299 |   await recover(page, control);
  300 |   await page
  301 |     .getByRole("button", { name: "+ Add prospect", exact: true })
  302 |     .click();
  303 |   await expect(page.getByLabel("Company name")).toHaveValue("");
  304 | });
  305 | 
  306 | test("a successful background reread preserves an active creation draft", async ({
  307 |   page,
  308 | }) => {
  309 |   const control = await setup(page);
  310 |   await page.goto(`${listPath}?new=1`);
  311 |   await page.getByLabel("Company name").fill("Keep this current draft");
  312 |   const release = control.recover();
  313 |   await page.clock.setFixedTime(new Date("2026-10-12T12:00:31Z"));
```