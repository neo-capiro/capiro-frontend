# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: planner-engagement.spec.ts >> Planner pending writes freeze the submitted draft and dismissal until rejection at 390
- Location: test/browser/planner-engagement.spec.ts:269:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByText('More task options', { exact: true })

```

# Page snapshot

```yaml
- generic:
  - generic:
    - generic:
      - link:
        - /url: "#main-content"
        - text: Skip to content
      - banner:
        - link:
          - /url: /
          - img
        - navigation:
          - link:
            - /url: /meri
            - generic:
              - img
          - link:
            - /url: /
            - generic:
              - img
          - link:
            - /url: /modules
            - generic:
              - img
        - navigation:
          - link:
            - /url: /?log=1
            - generic:
              - img
          - link:
            - /url: /calendar
            - generic:
              - img
          - link:
            - /url: /modules/intelligence
            - generic:
              - img
          - button [disabled]:
            - generic:
              - img
          - link:
            - /url: /settings/personal
            - generic:
              - img
      - generic:
        - button: Modules menu
        - main:
          - navigation:
            - link:
              - /url: /modules
              - text: ← Modules
            - generic: /
            - combobox:
              - generic: Planner
              - img
          - generic:
            - generic:
              - generic:
                - heading [level=1]: Planner
                - paragraph: Coordinate tasks, projects and capacity across your permitted work.
              - generic:
                - button: Refresh
            - tablist:
              - tab [selected]: My tasks
              - tab: All tasks
              - tab: Projects
              - tab: Inbox
              - tab: Portfolios
              - tab: Goals
              - tab: Workload
              - tab: Capacity
              - tab: Reporting
              - tab: Timesheets
              - tab: Templates
              - tab: Rules
              - tab: Forms
            - generic:
              - generic:
                - tablist:
                  - tab [selected]: List
                  - tab: Board
                  - tab: Calendar
                  - tab: Timeline
                  - tab: Gantt
                - button: + New task
              - generic:
                - searchbox
                - combobox:
                  - generic: Status · Open
                  - img
                - combobox:
                  - generic: All assignees
                  - img
                - combobox:
                  - generic: Priority · All
                  - img
                - button: Import CSV
                - button: Save view
                - button: My tasks settings
              - paragraph: Time is shown as hours:minutes. This page includes only work you can access.
              - generic:
                - table:
                  - caption: Planner tasks
                  - rowgroup:
                    - row:
                      - columnheader: Task name
                      - columnheader: Assignee
                      - columnheader: Due date
                      - columnheader: Priority
                      - columnheader: Status
                      - columnheader: Estimated
                      - columnheader: Actual
                  - rowgroup:
                    - row:
                      - cell:
                        - generic:
                          - checkbox
                          - button
                          - button: Test appropriation review
                      - cell: Team member
                      - cell: Oct 12
                      - cell:
                        - generic: high
                      - cell:
                        - generic: To do
                      - cell: 1:30
                      - cell: 0:15
    - complementary: Explicit local test fixture · synthetic identity and records
  - dialog "New task" [ref=e2]:
    - banner [ref=e3]:
      - generic [ref=e4]:
        - heading "New task" [level=2] [ref=e5]
        - paragraph [ref=e6]: Task access and updates are checked by the Planner service.
      - button "Close dialog" [ref=e7] [cursor=pointer]: ×
    - group [ref=e10]:
      - generic [ref=e11]:
        - generic [ref=e12]:
          - generic [ref=e13]: Task name
          - textbox "Task name" [active] [ref=e14]: Test submitted draft
        - generic [ref=e15]:
          - generic [ref=e16]: Description
          - textbox "Description" [ref=e17]
        - generic [ref=e18]:
          - generic [ref=e19]: Assignee
          - combobox "Assignee" [ref=e20] [cursor=pointer]:
            - generic: Unassigned
            - img [ref=e21]
          - combobox [ref=e23]
        - group "Projects" [ref=e24]:
          - generic [ref=e25]: Projects
        - generic [ref=e26]:
          - generic [ref=e27]:
            - generic [ref=e28]: Start date
            - textbox "Start date" [ref=e29]
          - generic [ref=e30]:
            - generic [ref=e31]: Due date
            - textbox "Due date" [ref=e32]
          - generic [ref=e33]:
            - generic [ref=e34]: Start time
            - textbox "Start time" [disabled] [ref=e35]
          - generic [ref=e36]:
            - generic [ref=e37]: Due time
            - textbox "Due time" [disabled] [ref=e38]
          - generic [ref=e39]:
            - generic [ref=e40]: Time zone
            - textbox "Time zone" [ref=e41]:
              - /placeholder: America/New_York
          - generic [ref=e42]:
            - generic [ref=e43]: Priority
            - combobox "Priority" [ref=e44] [cursor=pointer]:
              - generic: none
              - img [ref=e45]
            - combobox [ref=e47]
          - generic [ref=e48]:
            - generic [ref=e49]: Status
            - combobox "Status" [ref=e50] [cursor=pointer]:
              - generic: To do
              - img [ref=e51]
            - combobox [ref=e53]
          - generic [ref=e54]:
            - generic [ref=e55]: Estimated minutes
            - spinbutton "Estimated minutes" [ref=e56]: "0"
        - group [ref=e57]:
          - generic "Task type, repeat, collaborators and dependencies" [ref=e58]
      - generic [ref=e59]:
        - button "Cancel" [ref=e60] [cursor=pointer]
        - button "Save task" [ref=e61] [cursor=pointer]
```

# Test source

```ts
  210 |       return saved;
  211 |     },
  212 |   });
  213 |   await page.route("**/api/capiro/planner.task.create", (route) =>
  214 |     fail
  215 |       ? route.fulfill({
  216 |           status: 409,
  217 |           json: { message: "Synthetic concurrent edit" },
  218 |         })
  219 |       : route.fallback(),
  220 |   );
  221 |   await page.goto("/modules/planner");
  222 |   await page.getByRole("button", { name: "+ New task", exact: true }).click();
  223 |   await page.getByLabel("Task name", { exact: true }).fill("Test new work");
  224 |   await page.getByRole("button", { name: "Save task", exact: true }).click();
  225 |   await expect(page.getByRole("alert")).toContainText(
  226 |     "Synthetic concurrent edit",
  227 |   );
  228 |   await expect(page.getByLabel("Task name", { exact: true })).toHaveValue(
  229 |     "Test new work",
  230 |   );
  231 |   fail = false;
  232 |   await page.getByRole("button", { name: "Save task", exact: true }).click();
  233 |   await expect(page.getByRole("dialog")).toBeHidden();
  234 |   await expect(page.getByRole("table")).toContainText("Test new work");
  235 |   expect(writes).toHaveLength(1);
  236 |   const request = writes[0] as { body: { data: Record<string, unknown> } };
  237 |   expect(request.body.data.name).toBe("Test new work");
  238 |   expect(request.body.data).not.toHaveProperty("tenantId");
  239 |   expect(request.body.data).not.toHaveProperty("actorId");
  240 |   await page.reload();
  241 |   await page
  242 |     .getByRole("button", { name: "Test new work", exact: true })
  243 |     .click();
  244 |   await page.getByRole("button", { name: "Edit task", exact: true }).click();
  245 |   await expect(page.getByLabel("Task name", { exact: true })).toHaveValue(
  246 |     "Test new work",
  247 |   );
  248 |   await page.getByLabel("Task name", { exact: true }).fill("Test updated work");
  249 |   await page.getByRole("button", { name: "Save task", exact: true }).click();
  250 |   await expect(
  251 |     page.getByRole("dialog", { name: "Edit task", exact: true }),
  252 |   ).toBeHidden();
  253 |   await expect(page.getByRole("dialog")).toBeHidden();
  254 |   await page.reload();
  255 |   await page
  256 |     .getByRole("button", { name: "Test updated work", exact: true })
  257 |     .click();
  258 |   await page.getByRole("button", { name: "Edit task", exact: true }).click();
  259 |   await expect(page.getByLabel("Task name", { exact: true })).toHaveValue(
  260 |     "Test updated work",
  261 |   );
  262 |   expect(writes).toHaveLength(2);
  263 |   expect(writes[1]).toMatchObject({
  264 |     params: { id: "51000000-0000-4000-8000-000000000002" },
  265 |     body: { version: 1, data: { name: "Test updated work" } },
  266 |   });
  267 | });
  268 | for (const width of [1440, 390]) {
  269 |   test(`Planner pending writes freeze the submitted draft and dismissal until rejection at ${width}`, async ({
  270 |     page,
  271 |   }) => {
  272 |     await page.setViewportSize({ width, height: 1040 });
  273 |     await operationFixtures(page, {
  274 |       "me.read": testIdentity,
  275 |       "planner.bootstrap": {
  276 |         me: { id: "test-user", name: "Test User" },
  277 |         people: [],
  278 |         projects: [],
  279 |       },
  280 |       "planner.tasks": { items: [blankTask], nextCursor: null },
  281 |     });
  282 |     let release!: () => void;
  283 |     const held = new Promise<void>((resolve) => {
  284 |       release = resolve;
  285 |     });
  286 |     let writes = 0;
  287 |     await page.route("**/api/capiro/planner.task.create", async (route) => {
  288 |       writes++;
  289 |       await held;
  290 |       await route.fulfill({
  291 |         status: 409,
  292 |         json: { message: "Synthetic concurrent edit" },
  293 |       });
  294 |     });
  295 |     await page.goto("/modules/planner");
  296 |     await page.getByRole("button", { name: "+ New task", exact: true }).click();
  297 |     const name = page.getByLabel("Task name", { exact: true });
  298 |     await page.getByRole("button", { name: "Save task", exact: true }).click();
  299 |     expect(writes).toBe(0);
  300 |     expect(
  301 |       await name.evaluate(
  302 |         (input) => (input as HTMLInputElement).validity.valueMissing,
  303 |       ),
  304 |     ).toBe(true);
  305 |     await name.fill("Test submitted draft");
  306 |     await page
  307 |       .getByText(
  308 |         width >= 1024
  309 |           ? "More task options"
> 310 |           : "Task type, repeat, collaborators and dependencies",
      |        ^ Error: locator.click: Test timeout of 30000ms exceeded.
  311 |         { exact: true },
  312 |       )
  313 |       .click();
  314 |     await page
  315 |       .getByRole("dialog")
  316 |       .getByLabel("Task type", { exact: true })
  317 |       .click();
  318 |     await page.getByRole("option", { name: "approval", exact: true }).click();
  319 |     await page.getByRole("button", { name: "Save task", exact: true }).click();
  320 |     try {
  321 |       await expect(
  322 |         page.getByRole("button", { name: "Saving…", exact: true }),
  323 |       ).toBeDisabled();
  324 |       await expect(name).toBeDisabled();
  325 |       for (const label of [
  326 |         "Assignee",
  327 |         "Priority",
  328 |         "Status",
  329 |         "Task type",
  330 |         "Approval",
  331 |         "Repeat",
  332 |       ]) {
  333 |         const trigger = page
  334 |           .getByRole("dialog")
  335 |           .getByLabel(label, { exact: true });
  336 |         await trigger.scrollIntoViewIfNeeded();
  337 |         const box = await trigger.boundingBox();
  338 |         expect(box).not.toBeNull();
  339 |         await page.mouse.click(
  340 |           box!.x + box!.width / 2,
  341 |           box!.y + box!.height / 2,
  342 |         );
  343 |         await expect(page.getByRole("listbox")).toHaveCount(0);
  344 |       }
  345 |       await expect(
  346 |         page.getByRole("button", { name: "Cancel", exact: true }),
  347 |       ).toBeDisabled();
  348 |       await page.keyboard.press("Escape");
  349 |       await expect(page.getByRole("dialog")).toBeVisible();
  350 |       await page
  351 |         .getByRole("button", { name: "Close dialog", exact: true })
  352 |         .click();
  353 |       await expect(page.getByRole("dialog")).toBeVisible();
  354 |       expect(writes).toBe(1);
  355 |     } finally {
  356 |       release();
  357 |     }
  358 |     await expect(page.getByRole("alert")).toContainText(
  359 |       "Synthetic concurrent edit",
  360 |     );
  361 |     await expect(name).toBeEnabled();
  362 |     await expect(name).toHaveValue("Test submitted draft");
  363 |     await page.getByRole("button", { name: "Cancel", exact: true }).click();
  364 |     await expect(page.getByRole("dialog")).toBeHidden();
  365 |   });
  366 | }
  367 | test("Engagement library opens shared notes, approval is a separate real operation and tabs work at phone width", async ({
  368 |   page,
  369 | }) => {
  370 |   let notes = [note];
  371 |   await operationFixtures(page, {
  372 |     "me.read": testIdentity,
  373 |     "clients.list": [
  374 |       {
  375 |         id: clientId,
  376 |         name: "Test Aerospace",
  377 |         profileStatus: "ACTIVE",
  378 |         status: "ACTIVE",
  379 |       },
  380 |     ],
  381 |     "engagement.meetings": [meeting],
  382 |     "engagement.library": {
  383 |       data: [{ ...meeting, notes: [{ id: note.id, status: "draft" }] }],
  384 |       total: 1,
  385 |       page: 1,
  386 |       limit: 25,
  387 |     },
  388 |     "engagement.meeting": meeting,
  389 |     "engagement.notes": () => notes,
  390 |     "engagement.debriefs": [],
  391 |     "engagement.note.approve": () => {
  392 |       notes = [{ ...note, status: "approved" }];
  393 |       return notes[0];
  394 |     },
  395 |   });
  396 |   await page.route(`**/api/backend/core/clients/${clientId}`, (route) =>
  397 |     route.fulfill({
  398 |       json: {
  399 |         id: clientId,
  400 |         name: "Synthetic client",
  401 |         status: "ACTIVE",
  402 |         profileStatus: "ACTIVE",
  403 |       },
  404 |     }),
  405 |   );
  406 |   await page.goto("/modules/engagement?view=library&clientId=" + clientId);
  407 |   await expect(
  408 |     page.getByRole("tab", { name: "Library", exact: true }),
  409 |   ).toHaveAttribute("aria-selected", "true");
  410 |   await page.getByRole("button", { name: /Test strategy review/ }).click();
```