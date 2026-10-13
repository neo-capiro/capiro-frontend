# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: calendar-sharing.spec.ts >> same-scope held meeting refresh preserves an open meeting draft
- Location: tests/browser/calendar-sharing.spec.ts:367:3

# Error details

```
Test timeout of 20000ms exceeded.
```

```
Error: locator.click: Test timeout of 20000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Edit meeting', exact: true })
    - locator resolved to <button class="button">Edit meeting</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div data-state="open" aria-hidden="true" data-aria-hidden="true" data-slot="dialog-overlay" class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50"></div> intercepts pointer events
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div data-state="open" aria-hidden="true" data-aria-hidden="true" data-slot="dialog-overlay" class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50"></div> intercepts pointer events
    - retrying click action
      - waiting 100ms
    34 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <div data-state="open" aria-hidden="true" data-aria-hidden="true" data-slot="dialog-overlay" class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50"></div> intercepts pointer events
     - retrying click action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic:
  - generic:
    - generic:
      - banner:
        - generic:
          - paragraph: Your accessible calendar
          - heading [level=1]: Master Calendar
        - generic:
          - button: Shared meetings
          - button: Meeting library
          - button: Sync calendar
          - button:
            - img
            - text: New meeting
      - generic:
        - combobox
        - button:
          - img
        - button: Today
        - button:
          - img
        - textbox: 2026-10-12
        - combobox
        - combobox
      - generic:
        - group:
          - button [pressed]: All meetings
          - button: Needs prep
          - button: Needs debrief
        - textbox:
          - /placeholder: Search events…
        - button [pressed]: Meeting
        - button: Clear filters
      - paragraph: Master view includes meetings allowed by your calendar ownership and explicit client sharing. It does not grant access to teammates' private calendars.
      - generic:
        - table:
          - caption: Meeting preparation, notes and debrief status
          - rowgroup:
            - row:
              - columnheader: When
              - columnheader: Meeting
              - columnheader: Prep
              - columnheader: Meeting notes
              - columnheader: Debrief
          - rowgroup:
            - row:
              - cell: Oct 13, 12:00 PM UTC
              - rowheader:
                - button: Synthetic sharing meeting
                - generic: Synthetic meeting room
              - cell: Approved
              - cell: Approved
              - cell: Approved
  - dialog "Synthetic sharing meeting" [ref=e2]:
    - banner [ref=e3]:
      - heading "Synthetic sharing meeting" [level=2] [ref=e4]
      - button "Close" [active] [ref=e5] [cursor=pointer]:
        - img [ref=e6]
    - paragraph [ref=e9]: Synthetic sharing meeting
    - generic [ref=e10]:
      - region "Meeting identity" [ref=e11]:
        - generic [ref=e12]:
          - generic [ref=e13]: Meeting 91000000-0000-4000-8000-000000000001 · Test Aerospace
          - text: Upcoming
        - generic [ref=e14]: private
        - paragraph [ref=e15]: Oct 13, 12:00 PM UTC – Oct 13, 1:00 PM UTC · In person
        - paragraph [ref=e16]:
          - img [ref=e17]
          - text: Synthetic meeting room
        - group [ref=e20]:
          - generic "Attendees · 0" [ref=e21] [cursor=pointer]
        - generic [ref=e22]:
          - button "Edit meeting" [ref=e23] [cursor=pointer]
          - button "Share artifacts" [ref=e24] [cursor=pointer]
          - button "Client assignment" [ref=e25] [cursor=pointer]
      - navigation "Meeting sections" [ref=e26]:
        - button "Information" [ref=e27] [cursor=pointer]
        - button "Preparation" [pressed] [ref=e28] [cursor=pointer]
        - button "Notes" [ref=e29] [cursor=pointer]
        - button "Debriefs" [ref=e30] [cursor=pointer]
      - region "Meeting preparation" [ref=e31]:
        - generic [ref=e32]: approvedPrivate until shared
        - note [ref=e33]: Preparation generation is unavailable in this environment.
        - generic [ref=e34]:
          - button "Regenerate" [disabled] [ref=e35]
          - button "Edit prep" [ref=e36] [cursor=pointer]
          - button "Prep settings" [ref=e37] [cursor=pointer]
        - generic [ref=e38]:
          - generic [ref=e39]: Refine preparation
          - generic [ref=e40]: 0/4000 characters
          - textbox "Refine preparation" [ref=e41]:
            - /placeholder: Add context for Meri to use when regenerating…
        - generic [ref=e42]:
          - generic [ref=e43]:
            - heading "Summary" [level=3] [ref=e44]
            - paragraph [ref=e45]: Synthetic approved preparation
          - generic [ref=e46]:
            - heading "Agenda" [level=3] [ref=e47]
            - paragraph [ref=e48]: No agenda.
          - generic [ref=e49]:
            - heading "Talking points" [level=3] [ref=e50]
            - paragraph [ref=e51]: No talking points.
          - generic [ref=e52]:
            - heading "Watch-outs" [level=3] [ref=e53]
            - paragraph [ref=e54]: No watch-outs.
          - generic [ref=e55]:
            - heading "Follow-ups" [level=3] [ref=e56]
            - paragraph [ref=e57]: No follow-ups.
          - generic [ref=e58]:
            - heading "Email evidence" [level=3] [ref=e59]
            - paragraph [ref=e60]: No email evidence.
        - generic [ref=e61]:
          - button "Print / Save as PDF" [ref=e62] [cursor=pointer]
          - button "Email PDF" [ref=e63] [cursor=pointer]
        - button "View sources and citations" [ref=e64] [cursor=pointer]
        - generic [ref=e65]:
          - text: Saved
          - time [ref=e66]: Oct 12, 2026, 12:00 PM
      - region "Meeting attachment approvals" [ref=e67]:
        - heading "Meeting attachments" [level=3] [ref=e68]
        - paragraph [ref=e69]: Approval records your review of a file. It does not perform a security scan, extract text or share the file.
        - article [ref=e70]:
          - strong [ref=e71]: Synthetic questions.pdf
          - paragraph [ref=e72]: "Approved · 10/12/2026, 12:00:00 PM · Scan: clean"
        - button "Refresh attachment status" [ref=e73] [cursor=pointer]
```

# Test source

```ts
  287 |   expect(state.feedReads).toBe(1);
  288 |   expect(state.writes).toEqual([]);
  289 |   expect(unexpected).toEqual([]);
  290 | });
  291 | test("cached shared feed disappears during held and failed refresh then returns current records", async ({
  292 |   page,
  293 | }) => {
  294 |   const { state } = await setup(page);
  295 |   await page.goto(`${url}&shared=1`);
  296 |   const heading = page.getByRole("heading", { name: sharingMeeting.subject });
  297 |   await expect(heading).toBeVisible();
  298 |   const pause = held();
  299 |   state.feedHold = pause.promise;
  300 |   state.feedStatus = 403;
  301 |   await page.getByRole("button", { name: "Refresh shared meetings" }).click();
  302 |   await expect.poll(() => state.feedReads).toBe(2);
  303 |   await expect(heading).toHaveCount(0);
  304 |   pause.release();
  305 |   await expect(page.getByRole("alert")).toContainText(
  306 |     "Synthetic shared feed unavailable",
  307 |   );
  308 |   await expect(heading).toHaveCount(0);
  309 |   state.feedHold = undefined;
  310 |   state.feedStatus = 200;
  311 |   state.feed = [];
  312 |   await page.getByRole("button", { name: "Retry", exact: true }).click();
  313 |   await expect(
  314 |     page.getByText("No meetings are shared with this client."),
  315 |   ).toBeVisible();
  316 |   expect(state.writes).toEqual([]);
  317 | });
  318 | test("foreign client records are rejected and actor replacement does not reuse the prior feed", async ({
  319 |   page,
  320 | }) => {
  321 |   const { state } = await setup(page);
  322 |   await page.goto(`${url}&shared=1`);
  323 |   await expect(
  324 |     page.getByRole("heading", { name: sharingMeeting.subject }),
  325 |   ).toBeVisible();
  326 |   state.feed[0]!.client.id = "foreign-client";
  327 |   const pause = held();
  328 |   state.feedHold = pause.promise;
  329 |   await page.evaluate(() =>
  330 |     (
  331 |       window as unknown as { __sharingTest: { replaceActor: () => void } }
  332 |     ).__sharingTest.replaceActor(),
  333 |   );
  334 |   await expect.poll(() => state.feedReads).toBe(2);
  335 |   await expect(
  336 |     page.getByRole("heading", { name: sharingMeeting.subject }),
  337 |   ).toHaveCount(0);
  338 |   pause.release();
  339 |   await expect(page.getByRole("alert")).toBeVisible();
  340 |   expect(state.writes).toEqual([]);
  341 | });
  342 | test("sharing modal supports keyboard selection and fits original desktop and mobile sizes", async ({
  343 |   page,
  344 | }, testInfo) => {
  345 |   await setup(page);
  346 |   const dialog = await openSharing(page);
  347 |   await dialog.getByRole("checkbox", { name: /Meeting prep/ }).focus();
  348 |   await page.keyboard.press("Space");
  349 |   await expect(
  350 |     dialog.getByRole("checkbox", { name: /Meeting prep/ }),
  351 |   ).toBeChecked();
  352 |   for (const width of [1440, 390]) {
  353 |     await page.setViewportSize({ width, height: 980 });
  354 |     expect(
  355 |       await page.evaluate(
  356 |         () => document.documentElement.scrollWidth <= innerWidth,
  357 |       ),
  358 |     ).toBe(true);
  359 |     await page.screenshot({
  360 |       path: testInfo.outputPath(`sharing-${width}.png`),
  361 |       fullPage: true,
  362 |     });
  363 |   }
  364 | });
  365 | 
  366 | for (const draft of ["note", "meeting", "selection"] as const)
  367 |   test(`same-scope held meeting refresh preserves an open ${draft} draft`, async ({
  368 |     page,
  369 |   }) => {
  370 |     const { state } = await setup(page);
  371 |     if (draft === "selection") {
  372 |       await openSharing(page);
  373 |       await page.getByRole("checkbox", { name: /Meeting prep/ }).check();
  374 |     } else {
  375 |       await page.goto(`${url}&meeting=${sharingMeeting.id}`);
  376 |       if (draft === "note") {
  377 |         await page.getByRole("button", { name: "Notes", exact: true }).click();
  378 |         await page
  379 |           .getByRole("button", { name: "Add note", exact: true })
  380 |           .click();
  381 |         await page
  382 |           .getByLabel("Content", { exact: true })
  383 |           .fill("Retain this local synthetic note draft");
  384 |       } else {
  385 |         await page
  386 |           .getByRole("button", { name: "Edit meeting", exact: true })
> 387 |           .click();
      |            ^ Error: locator.click: Test timeout of 20000ms exceeded.
  388 |         await page
  389 |           .getByLabel("Subject", { exact: true })
  390 |           .fill("Retain this local synthetic meeting draft");
  391 |       }
  392 |     }
  393 |     const pause = held();
  394 |     state.readHold = pause.promise;
  395 |     const before = state.reads;
  396 |     await page.evaluate(() => {
  397 |       void (
  398 |         window as unknown as { __sharingTest: { refreshMeeting: () => void } }
  399 |       ).__sharingTest.refreshMeeting();
  400 |     });
  401 |     await expect.poll(() => state.reads).toBeGreaterThan(before);
  402 |     for (const finished of [false, true]) {
  403 |       if (finished) {
  404 |         state.readHold = undefined;
  405 |         pause.release();
  406 |       }
  407 |       if (draft === "selection")
  408 |         await expect(
  409 |           page.getByRole("checkbox", { name: /Meeting prep/ }),
  410 |         ).toBeChecked();
  411 |       else
  412 |         await expect(
  413 |           page.getByLabel(draft === "note" ? "Content" : "Subject", {
  414 |             exact: true,
  415 |           }),
  416 |         ).toHaveValue(
  417 |           draft === "note"
  418 |             ? "Retain this local synthetic note draft"
  419 |             : "Retain this local synthetic meeting draft",
  420 |         );
  421 |     }
  422 |     expect(state.writes).toEqual([]);
  423 |   });
  424 | 
```