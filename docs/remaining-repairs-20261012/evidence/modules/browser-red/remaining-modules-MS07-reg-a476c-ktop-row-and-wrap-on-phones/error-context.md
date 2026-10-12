# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: remaining-modules.spec.ts >> MS07 regression: Workspace filters share a compact desktop row and wrap on phones
- Location: ../../workspace/capiro-remaining-modules/apps/web/test/browser/remaining-modules.spec.ts:306:1

# Error details

```
Error: expect(received).toBeLessThan(expected)

Expected: < 8
Received:   150.59375
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
        - navigation "Breadcrumb" [ref=e79]:
          - link "← Modules" [ref=e80] [cursor=pointer]:
            - /url: /modules
          - generic [ref=e81]: /
          - combobox "Switch module" [ref=e82] [cursor=pointer]:
            - generic: Workspace
            - img [ref=e83]
        - generic [ref=e85]:
          - generic [ref=e86]:
            - heading "Workspace" [level=1] [ref=e88]
            - generic [ref=e89]:
              - button "Template Studio" [ref=e90] [cursor=pointer]
              - button "+ New document" [ref=e91] [cursor=pointer]
          - group "Workspace views" [ref=e92]:
            - button "Documents" [pressed] [ref=e93] [cursor=pointer]
            - button "Workflows" [ref=e94] [cursor=pointer]
            - button "Client shares" [ref=e95] [cursor=pointer]
          - generic [ref=e96]:
            - heading "Available workflows" [level=2] [ref=e97]
            - generic [ref=e98]:
              - article [ref=e99]:
                - heading "Newsletter" [level=3] [ref=e100]: Newsletter
                - paragraph [ref=e102]: Create a polished newsletter from a template, then review it for Outreach.
                - generic [ref=e103]:
                  - paragraph [ref=e104]: Template → Edit → Review
                  - button "Start" [ref=e105] [cursor=pointer]
              - article [ref=e106]:
                - heading "Hill Day Schedule" [level=3] [ref=e107]: Hill Day Schedule
                - paragraph [ref=e109]: Build a client schedule from meetings, supporting context, and a branded template.
                - generic [ref=e110]:
                  - paragraph [ref=e111]: Meetings → Context → Schedule
                  - button "Start" [ref=e112] [cursor=pointer]
          - generic [ref=e113]:
            - group "Document ownership" [ref=e114]:
              - button "Everyone" [pressed] [ref=e115] [cursor=pointer]
              - button "Mine" [ref=e116] [cursor=pointer]
              - button "Shared with me" [ref=e117] [cursor=pointer]
            - textbox "Search documents" [ref=e118]
            - combobox "Filter documents by client" [ref=e119] [cursor=pointer]:
              - generic: Client · All clients
              - img [ref=e120]
            - combobox "Filter documents by template" [ref=e122] [cursor=pointer]:
              - generic: Template · All
              - img [ref=e123]
            - combobox "Filter documents by status" [ref=e125] [cursor=pointer]:
              - generic: Status · Any
              - img [ref=e126]
          - table "Workspace documents" [ref=e129]:
            - caption [ref=e130]: Workspace documents
            - rowgroup [ref=e131]:
              - row "DOCUMENT CLIENT TEMPLATE OWNER STATUS UPDATED" [ref=e132]:
                - columnheader "DOCUMENT" [ref=e133]
                - columnheader "CLIENT" [ref=e134]
                - columnheader "TEMPLATE" [ref=e135]
                - columnheader "OWNER" [ref=e136]
                - columnheader "STATUS" [ref=e137]
                - columnheader "UPDATED" [ref=e138]
            - rowgroup [ref=e139]:
              - row "Current policy newsletter Newsletter Current Aerospace Newsletter TU draft 10/8/2026" [ref=e140]:
                - cell "Current policy newsletter Newsletter" [ref=e141]:
                  - button "Current policy newsletter Newsletter" [ref=e142] [cursor=pointer]:
                    - text: Current policy newsletter
                    - generic [ref=e143]: Newsletter
                - cell "Current Aerospace" [ref=e144]
                - cell "Newsletter" [ref=e145]
                - cell "TU" [ref=e146]:
                  - generic "Test User" [ref=e147]: TU
                - cell "draft" [ref=e148]:
                  - generic [ref=e149]: draft
                - cell "10/8/2026" [ref=e150]
          - generic [ref=e152]: 1 documents
          - paragraph [ref=e153]: Documents are visible to their owner and collaborators. Access is checked by the existing Workspace service.
  - paragraph [ref=e154]: Explicit local test fixture · synthetic identity and records
```

# Test source

```ts
  237 |     fresh = false;
  238 |   await setup(page, fixtures);
  239 |   await page.route("**/api/capiro/planner.tasks*", (route) => {
  240 |     if (!fresh) {
  241 |       held = route;
  242 |       return;
  243 |     }
  244 |     return route.fulfill({ json: { items: [tasks[3]], nextCursor: null } });
  245 |   });
  246 |   await page.goto("/modules/planner?view=all-tasks");
  247 |   await expect.poll(() => Boolean(held)).toBe(true);
  248 |   fresh = true;
  249 |   await page.evaluate(() =>
  250 |     dispatchEvent(
  251 |       new CustomEvent("test:session", {
  252 |         detail: { orgId: "other-org", sessionId: "other-session" },
  253 |       }),
  254 |     ),
  255 |   );
  256 |   await expect(
  257 |     page.getByRole("button", { name: "Firm work", exact: true }),
  258 |   ).toBeVisible();
  259 |   await held!
  260 |     .fulfill({ json: { items: tasks, nextCursor: null } })
  261 |     .catch(() => {});
  262 |   await expect(
  263 |     page.getByRole("button", { name: "Direct client work", exact: true }),
  264 |   ).toHaveCount(0);
  265 |   await page.route(`**/api/backend/core/clients/${clientId}`, (route) =>
  266 |     route.fulfill({ json: otherClient }),
  267 |   );
  268 |   await choose(page, "Planner client scope", client.name);
  269 |   await expect(
  270 |     page.getByRole("heading", { name: "Selected client unavailable" }),
  271 |   ).toBeVisible();
  272 |   await expect(page.getByRole("table")).toHaveCount(0);
  273 | });
  274 | test("MS08 scope and grouping controls remain keyboard operable at phone width", async ({
  275 |   page,
  276 | }, info) => {
  277 |   await setup(page, fixtures);
  278 |   await page.setViewportSize({ width: 390, height: 844 });
  279 |   await page.goto("/modules/planner?view=all-tasks");
  280 |   const scope = page.getByRole("combobox", { name: "Planner client scope" });
  281 |   await expect(scope).toBeEnabled();
  282 |   await scope.focus();
  283 |   await page.keyboard.press("Enter");
  284 |   await page.keyboard.press("ArrowDown");
  285 |   await page.keyboard.press("Enter");
  286 |   await expect(scope).toContainText(client.name);
  287 |   await expect(
  288 |     page.getByRole("button", { name: "Direct client work", exact: true }),
  289 |   ).toBeVisible();
  290 |   const grouping = page.getByRole("combobox", {
  291 |     name: "Group by",
  292 |     exact: true,
  293 |   });
  294 |   await grouping.focus();
  295 |   await page.keyboard.press("Enter");
  296 |   await page.keyboard.press("ArrowDown");
  297 |   await page.keyboard.press("Enter");
  298 |   await expect(grouping).toContainText("None");
  299 |   await expect(page.getByRole("table")).toHaveCount(1);
  300 |   await choose(page, "Group by", "Group by · Client");
  301 |   await page.screenshot({
  302 |     path: info.outputPath("planner-client-groups-phone.png"),
  303 |     fullPage: true,
  304 |   });
  305 | });
  306 | test("MS07 regression: Workspace filters share a compact desktop row and wrap on phones", async ({
  307 |   page,
  308 | }, info) => {
  309 |   const row = {
  310 |     id: projectId,
  311 |     kind: "draft",
  312 |     name: "Current policy newsletter",
  313 |     blueprint: "Newsletter",
  314 |     client: client.name,
  315 |     status: "draft",
  316 |     updatedAt: "2026-10-08",
  317 |     owner: { id: "test-user", name: "Test User", initials: "TU" },
  318 |     route: "/modules/workspace",
  319 |   };
  320 |   await setup(page, {
  321 |     "workspace.documents": { items: [row], nextCursor: null },
  322 |   });
  323 |   await page.goto("/modules/workspace");
  324 |   const search = page.getByLabel("Search documents");
  325 |   await expect(page.getByRole("table")).toContainText(row.name);
  326 |   const boxes = await Promise.all(
  327 |     [
  328 |       search,
  329 |       ...(await page
  330 |         .getByRole("combobox", { name: /Filter documents by/ })
  331 |         .all()),
  332 |     ].map((locator) => locator.boundingBox()),
  333 |   );
  334 |   expect(
  335 |     Math.max(...boxes.map((box) => box!.y)) -
  336 |       Math.min(...boxes.map((box) => box!.y)),
> 337 |   ).toBeLessThan(8);
      |     ^ Error: expect(received).toBeLessThan(expected)
  338 |   expect(boxes.slice(1).every((box) => box!.width <= 190)).toBe(true);
  339 |   await choose(page, "Filter documents by client", client.name);
  340 |   await expect(page.getByRole("table")).toContainText(row.name);
  341 |   await search.fill("no matching record");
  342 |   await expect(page.getByRole("table")).not.toContainText(row.name);
  343 |   await search.clear();
  344 |   await page.screenshot({
  345 |     path: info.outputPath("workspace-filters-desktop.png"),
  346 |     fullPage: true,
  347 |   });
  348 |   await page.setViewportSize({ width: 390, height: 844 });
  349 |   for (const trigger of await page
  350 |     .getByRole("combobox", { name: /Filter documents by/ })
  351 |     .all()) {
  352 |     const box = await trigger.boundingBox();
  353 |     expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  354 |   }
  355 |   await page.screenshot({
  356 |     path: info.outputPath("workspace-filters-phone.png"),
  357 |     fullPage: true,
  358 |   });
  359 | });
  360 | const token = "20000000-0000-4000-8000-000000000001." + "a".repeat(64),
  361 |   question = "30000000-0000-4000-8000-000000000001";
  362 | const form = {
  363 |   name: "Request a briefing",
  364 |   description: "Ask the team to prepare a staff briefing.",
  365 |   fields: [
  366 |     {
  367 |       id: question,
  368 |       label: "What needs to be done?",
  369 |       type: "text",
  370 |       required: true,
  371 |       options: [],
  372 |       maxLength: 500,
  373 |     },
  374 |   ],
  375 | };
  376 | test("MS09 regression: public form uses bounded card hierarchy and keeps input on styled error", async ({
  377 |   page,
  378 | }, info) => {
  379 |   let fail = true,
  380 |     writes = 0;
  381 |   await setup(page, {
  382 |     "public-form.read": form,
  383 |     "public-form.submit": () => {
  384 |       writes++;
  385 |       return { received: true };
  386 |     },
  387 |   });
  388 |   await page.route("**/api/capiro/public-form.submit", (route) =>
  389 |     fail
  390 |       ? route.fulfill({
  391 |           status: 422,
  392 |           json: { message: "Please revise this request." },
  393 |         })
  394 |       : route.fallback(),
  395 |   );
  396 |   await page.goto(`/forms/${token}`);
  397 |   const title = page.getByRole("heading", { name: form.name, exact: true });
  398 |   await expect(title).toHaveCSS("font-size", "40px");
  399 |   const submit = page.getByRole("button", {
  400 |     name: "Submit request",
  401 |     exact: true,
  402 |   });
  403 |   expect((await submit.boundingBox())!.width).toBeLessThan(200);
  404 |   await page.getByLabel("What needs to be done?").fill("Keep this draft");
  405 |   await submit.click();
  406 |   await expect(page.getByRole("alert")).toHaveCSS(
  407 |     "background-color",
  408 |     "rgb(243, 231, 229)",
  409 |   );
  410 |   await expect(page.getByLabel("What needs to be done?")).toHaveValue(
  411 |     "Keep this draft",
  412 |   );
  413 |   expect((await page.getByRole("alert").boundingBox())!.y).toBeLessThan(
  414 |     (await submit.boundingBox())!.y,
  415 |   );
  416 |   await page.screenshot({
  417 |     path: info.outputPath("public-form-error-desktop.png"),
  418 |     fullPage: true,
  419 |   });
  420 |   await page.setViewportSize({ width: 390, height: 844 });
  421 |   expect(
  422 |     await page.evaluate(() => document.documentElement.scrollWidth),
  423 |   ).toBeLessThanOrEqual(390);
  424 |   await page.screenshot({
  425 |     path: info.outputPath("public-form-error-phone.png"),
  426 |     fullPage: true,
  427 |   });
  428 |   fail = false;
  429 |   await submit.click();
  430 |   await expect(
  431 |     page.getByRole("heading", { name: "Your request was received." }),
  432 |   ).toBeVisible();
  433 |   expect(writes).toBe(1);
  434 | });
  435 | test("MS09 preserves malformed-receipt and replaced-token controls", async ({
  436 |   page,
  437 | }) => {
```