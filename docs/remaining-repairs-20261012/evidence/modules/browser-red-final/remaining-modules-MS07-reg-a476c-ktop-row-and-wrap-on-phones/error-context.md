# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: remaining-modules.spec.ts >> MS07 regression: Workspace filters share a compact desktop row and wrap on phones
- Location: ../../workspace/capiro-remaining-modules/apps/web/test/browser/remaining-modules.spec.ts:309:1

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
  240 |     fresh = false;
  241 |   await setup(page, fixtures);
  242 |   await page.route("**/api/capiro/planner.tasks*", (route) => {
  243 |     if (!fresh) {
  244 |       held = route;
  245 |       return;
  246 |     }
  247 |     return route.fulfill({ json: { items: [tasks[3]], nextCursor: null } });
  248 |   });
  249 |   await page.goto("/modules/planner?view=all-tasks");
  250 |   await expect.poll(() => Boolean(held)).toBe(true);
  251 |   fresh = true;
  252 |   await page.evaluate(() =>
  253 |     dispatchEvent(
  254 |       new CustomEvent("test:session", {
  255 |         detail: { orgId: "other-org", sessionId: "other-session" },
  256 |       }),
  257 |     ),
  258 |   );
  259 |   await expect(
  260 |     page.getByRole("button", { name: "Firm work", exact: true }),
  261 |   ).toBeVisible();
  262 |   await held!
  263 |     .fulfill({ json: { items: tasks, nextCursor: null } })
  264 |     .catch(() => {});
  265 |   await expect(
  266 |     page.getByRole("button", { name: "Direct client work", exact: true }),
  267 |   ).toHaveCount(0);
  268 |   await page.route(`**/api/backend/core/clients/${clientId}`, (route) =>
  269 |     route.fulfill({ json: otherClient }),
  270 |   );
  271 |   await choose(page, "Planner client scope", client.name);
  272 |   await expect(
  273 |     page.getByRole("heading", { name: "Selected client unavailable" }),
  274 |   ).toBeVisible();
  275 |   await expect(page.getByRole("table")).toHaveCount(0);
  276 | });
  277 | test("MS08 scope and grouping controls remain keyboard operable at phone width", async ({
  278 |   page,
  279 | }, info) => {
  280 |   await setup(page, fixtures);
  281 |   await page.setViewportSize({ width: 390, height: 844 });
  282 |   await page.goto("/modules/planner?view=all-tasks");
  283 |   const scope = page.getByRole("combobox", { name: "Planner client scope" });
  284 |   await expect(scope).toBeEnabled();
  285 |   await scope.focus();
  286 |   await page.keyboard.press("Enter");
  287 |   await page.keyboard.press("ArrowDown");
  288 |   await page.keyboard.press("Enter");
  289 |   await expect(scope).toContainText(client.name);
  290 |   await expect(
  291 |     page.getByRole("button", { name: "Direct client work", exact: true }),
  292 |   ).toBeVisible();
  293 |   const grouping = page.getByRole("combobox", {
  294 |     name: "Group by",
  295 |     exact: true,
  296 |   });
  297 |   await grouping.focus();
  298 |   await page.keyboard.press("Enter");
  299 |   await page.keyboard.press("ArrowDown");
  300 |   await page.keyboard.press("Enter");
  301 |   await expect(grouping).toContainText("None");
  302 |   await expect(page.getByRole("table")).toHaveCount(1);
  303 |   await choose(page, "Group by", "Group by · Client");
  304 |   await page.screenshot({
  305 |     path: info.outputPath("planner-client-groups-phone.png"),
  306 |     fullPage: true,
  307 |   });
  308 | });
  309 | test("MS07 regression: Workspace filters share a compact desktop row and wrap on phones", async ({
  310 |   page,
  311 | }, info) => {
  312 |   const row = {
  313 |     id: projectId,
  314 |     kind: "draft",
  315 |     name: "Current policy newsletter",
  316 |     blueprint: "Newsletter",
  317 |     client: client.name,
  318 |     status: "draft",
  319 |     updatedAt: "2026-10-08",
  320 |     owner: { id: "test-user", name: "Test User", initials: "TU" },
  321 |     route: "/modules/workspace",
  322 |   };
  323 |   await setup(page, {
  324 |     "workspace.documents": { items: [row], nextCursor: null },
  325 |   });
  326 |   await page.goto("/modules/workspace");
  327 |   const search = page.getByLabel("Search documents");
  328 |   await expect(page.getByRole("table")).toContainText(row.name);
  329 |   const boxes = await Promise.all(
  330 |     [
  331 |       search,
  332 |       ...(await page
  333 |         .getByRole("combobox", { name: /Filter documents by/ })
  334 |         .all()),
  335 |     ].map((locator) => locator.boundingBox()),
  336 |   );
  337 |   expect(
  338 |     Math.max(...boxes.map((box) => box!.y)) -
  339 |       Math.min(...boxes.map((box) => box!.y)),
> 340 |   ).toBeLessThan(8);
      |     ^ Error: expect(received).toBeLessThan(expected)
  341 |   expect(boxes.slice(1).every((box) => box!.width <= 190)).toBe(true);
  342 |   await choose(page, "Filter documents by client", client.name);
  343 |   await expect(page.getByRole("table")).toContainText(row.name);
  344 |   await search.fill("no matching record");
  345 |   await expect(page.getByRole("table")).not.toContainText(row.name);
  346 |   await search.clear();
  347 |   await page.screenshot({
  348 |     path: info.outputPath("workspace-filters-desktop.png"),
  349 |     fullPage: true,
  350 |   });
  351 |   await page.setViewportSize({ width: 390, height: 844 });
  352 |   for (const trigger of await page
  353 |     .getByRole("combobox", { name: /Filter documents by/ })
  354 |     .all()) {
  355 |     const box = await trigger.boundingBox();
  356 |     expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  357 |   }
  358 |   await page.screenshot({
  359 |     path: info.outputPath("workspace-filters-phone.png"),
  360 |     fullPage: true,
  361 |   });
  362 | });
  363 | const token = "20000000-0000-4000-8000-000000000001." + "a".repeat(64),
  364 |   question = "30000000-0000-4000-8000-000000000001";
  365 | const form = {
  366 |   name: "Request a briefing",
  367 |   description: "Ask the team to prepare a staff briefing.",
  368 |   fields: [
  369 |     {
  370 |       id: question,
  371 |       label: "What needs to be done?",
  372 |       type: "text",
  373 |       required: true,
  374 |       options: [],
  375 |       maxLength: 500,
  376 |     },
  377 |   ],
  378 | };
  379 | test("MS09 regression: public form uses bounded card hierarchy and keeps input on styled error", async ({
  380 |   page,
  381 | }, info) => {
  382 |   let fail = true,
  383 |     writes = 0;
  384 |   await setup(page, {
  385 |     "public-form.read": form,
  386 |     "public-form.submit": () => {
  387 |       writes++;
  388 |       return { received: true };
  389 |     },
  390 |   });
  391 |   await page.route("**/api/capiro/public-form.submit", (route) =>
  392 |     fail
  393 |       ? route.fulfill({
  394 |           status: 422,
  395 |           json: { message: "Please revise this request." },
  396 |         })
  397 |       : route.fallback(),
  398 |   );
  399 |   await page.goto(`/forms/${token}`);
  400 |   const title = page.getByRole("heading", { name: form.name, exact: true });
  401 |   await expect(title).toHaveCSS("font-size", "40px");
  402 |   const submit = page.getByRole("button", {
  403 |     name: "Submit request",
  404 |     exact: true,
  405 |   });
  406 |   expect((await submit.boundingBox())!.width).toBeLessThan(200);
  407 |   await page.getByLabel("What needs to be done?").fill("Keep this draft");
  408 |   await submit.click();
  409 |   await expect(page.getByRole("alert")).toHaveCSS(
  410 |     "background-color",
  411 |     "rgb(243, 231, 229)",
  412 |   );
  413 |   await expect(page.getByLabel("What needs to be done?")).toHaveValue(
  414 |     "Keep this draft",
  415 |   );
  416 |   expect((await page.getByRole("alert").boundingBox())!.y).toBeLessThan(
  417 |     (await submit.boundingBox())!.y,
  418 |   );
  419 |   await page.screenshot({
  420 |     path: info.outputPath("public-form-error-desktop.png"),
  421 |     fullPage: true,
  422 |   });
  423 |   await page.setViewportSize({ width: 390, height: 844 });
  424 |   expect(
  425 |     await page.evaluate(() => document.documentElement.scrollWidth),
  426 |   ).toBeLessThanOrEqual(390);
  427 |   await page.screenshot({
  428 |     path: info.outputPath("public-form-error-phone.png"),
  429 |     fullPage: true,
  430 |   });
  431 |   fail = false;
  432 |   await submit.click();
  433 |   await expect(
  434 |     page.getByRole("heading", { name: "Your request was received." }),
  435 |   ).toBeVisible();
  436 |   expect(writes).toBe(1);
  437 | });
  438 | test("MS09 preserves malformed-receipt and replaced-token controls", async ({
  439 |   page,
  440 | }) => {
```