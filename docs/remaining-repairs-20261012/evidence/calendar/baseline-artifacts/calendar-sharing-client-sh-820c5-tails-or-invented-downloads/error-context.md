# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: calendar-sharing.spec.ts >> client shared feed lists only server-shared metadata without opening owner details or invented downloads
- Location: tests/browser/calendar-sharing.spec.ts:269:1

# Error details

```
Test timeout of 12000ms exceeded.
```

```
Error: locator.click: Test timeout of 12000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Shared meetings', exact: true })

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e5]:
      - paragraph [ref=e6]: Your accessible calendar
      - heading "Master Calendar" [level=1] [ref=e7]
    - generic [ref=e8]:
      - button "Meeting library" [ref=e9] [cursor=pointer]
      - button "Sync calendar" [ref=e10] [cursor=pointer]
      - button "New meeting" [ref=e11] [cursor=pointer]:
        - img [ref=e12]
        - text: New meeting
  - generic [ref=e13]:
    - combobox "Calendar scope" [ref=e14]:
      - option "Master view"
      - option "Test Aerospace" [selected]
    - button "Previous period" [ref=e15] [cursor=pointer]:
      - img [ref=e16]
    - button "Today" [ref=e18] [cursor=pointer]
    - button "Next period" [ref=e19] [cursor=pointer]:
      - img [ref=e20]
    - textbox "Calendar date" [ref=e22]: 2026-10-12
    - combobox "Calendar view" [ref=e23]:
      - option "Month"
      - option "Week"
      - option "Agenda" [selected]
    - combobox "Calendar timezone" [ref=e24]:
      - option "America/New_York"
      - option "America/Chicago"
      - option "America/Denver"
      - option "America/Los_Angeles"
      - option "Pacific/Honolulu"
      - option "UTC" [selected]
  - generic [ref=e25]:
    - textbox "Search calendar events" [ref=e26]:
      - /placeholder: Search events…
    - button "Meeting" [pressed] [ref=e27] [cursor=pointer]
    - button "Clear filters" [ref=e28] [cursor=pointer]
  - paragraph [ref=e29]: Master view includes meetings allowed by your calendar ownership and explicit client sharing. It does not grant access to teammates' private calendars.
  - generic [ref=e31]:
    - heading "2026-10-13" [level=2] [ref=e32]:
      - time [ref=e33]: 2026-10-13
    - article [ref=e34]:
      - generic [ref=e35]: Meeting
      - generic [ref=e36]:
        - heading "Synthetic sharing meeting" [level=3] [ref=e37]:
          - button "Synthetic sharing meeting" [ref=e38] [cursor=pointer]
        - generic [ref=e39]: Oct 13, 12:00 PM UTC · scheduled
        - text: Your accessible meetings
```

# Test source

```ts
  176 |   state.meeting.debriefs[0]!.status = "generated";
  177 |   state.files[0]!.usable = false;
  178 |   const dialog = await openSharing(page);
  179 |   for (const checkbox of await dialog.getByRole("checkbox").all())
  180 |     await expect(checkbox).toBeDisabled();
  181 |   await expect(dialog).toContainText("Private Research Portfolio preparation");
  182 |   await expect(dialog).toContainText("Approval required");
  183 |   await expect(
  184 |     dialog.getByRole("button", {
  185 |       name: "Share selected artifacts",
  186 |       exact: true,
  187 |     }),
  188 |   ).toBeDisabled();
  189 |   expect(state.writes).toEqual([]);
  190 | });
  191 | for (const scenario of ["uncertain", "foreign receipt"] as const)
  192 |   test(`${scenario} remains fenced after reopening and duplicate clicks`, async ({
  193 |     page,
  194 |   }) => {
  195 |     const { state } = await setup(page);
  196 |     state.receipt =
  197 |       scenario === "uncertain"
  198 |         ? {}
  199 |         : { ...sharedMeetingFixture(), tenantId: "foreign" };
  200 |     state.status = scenario === "uncertain" ? 503 : 200;
  201 |     await openSharing(page);
  202 |     const dialog = await choosePrepAndFile(page);
  203 |     const pause = held();
  204 |     state.hold = pause.promise;
  205 |     const button = dialog.getByRole("button", {
  206 |       name: "Confirm: Share selected artifacts",
  207 |     });
  208 |     await button.evaluate((node) => {
  209 |       (node as HTMLButtonElement).click();
  210 |       (node as HTMLButtonElement).click();
  211 |     });
  212 |     await expect.poll(() => state.writes.length).toBe(1);
  213 |     pause.release();
  214 |     await expect(dialog.getByRole("alert")).toContainText("may have changed");
  215 |     await page.keyboard.press("Escape");
  216 |     await page
  217 |       .getByRole("button", { name: "Share artifacts", exact: true })
  218 |       .click();
  219 |     const reopened = page.getByRole("dialog", {
  220 |       name: "Share artifacts with your organization?",
  221 |       exact: true,
  222 |     });
  223 |     await expect(reopened.getByRole("alert")).toContainText("may have changed");
  224 |     await expect(
  225 |       reopened.getByRole("button", {
  226 |         name: "Share selected artifacts",
  227 |         exact: true,
  228 |       }),
  229 |     ).toBeDisabled();
  230 |     expect(state.writes).toHaveLength(1);
  231 |   });
  232 | test("changed selected preparation is refused before sharing", async ({
  233 |   page,
  234 | }) => {
  235 |   const { state } = await setup(page);
  236 |   await openSharing(page);
  237 |   const dialog = await choosePrepAndFile(page);
  238 |   state.meeting.preps[0]!.summary = "Changed after user review";
  239 |   await dialog
  240 |     .getByRole("button", { name: "Confirm: Share selected artifacts" })
  241 |     .click();
  242 |   await expect(dialog.getByRole("alert")).toContainText(
  243 |     "changed or is not eligible",
  244 |   );
  245 |   expect(state.writes).toEqual([]);
  246 | });
  247 | test("actor replacement during held preflight produces zero writes", async ({
  248 |   page,
  249 | }) => {
  250 |   const { state } = await setup(page);
  251 |   await openSharing(page);
  252 |   const dialog = await choosePrepAndFile(page);
  253 |   const pause = held();
  254 |   const before = state.reads;
  255 |   state.readHold = pause.promise;
  256 |   await dialog
  257 |     .getByRole("button", { name: "Confirm: Share selected artifacts" })
  258 |     .click();
  259 |   await expect.poll(() => state.reads).toBeGreaterThan(before);
  260 |   await page.evaluate(() =>
  261 |     (
  262 |       window as unknown as { __sharingTest: { replaceActor: () => void } }
  263 |     ).__sharingTest.replaceActor(),
  264 |   );
  265 |   pause.release();
  266 |   await expect(dialog).toHaveCount(0);
  267 |   expect(state.writes).toEqual([]);
  268 | });
  269 | test("client shared feed lists only server-shared metadata without opening owner details or invented downloads", async ({
  270 |   page,
  271 | }) => {
  272 |   const { state, unexpected } = await setup(page);
  273 |   await page.goto(url);
  274 |   await page
  275 |     .getByRole("button", { name: "Shared meetings", exact: true })
> 276 |     .click();
      |      ^ Error: locator.click: Test timeout of 12000ms exceeded.
  277 |   const feed = page.getByRole("region", { name: "Client shared meetings" });
  278 |   await expect(
  279 |     feed.getByRole("heading", { name: sharingMeeting.subject }),
  280 |   ).toBeVisible();
  281 |   await expect(feed).toContainText("Their text is not provided by this feed");
  282 |   await expect(feed).toContainText(
  283 |     "File download and readiness are not provided",
  284 |   );
  285 |   await expect(feed.getByRole("link")).toHaveCount(0);
  286 |   expect(state.reads).toBe(0);
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
```