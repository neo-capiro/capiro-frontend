# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: calendar-sharing.spec.ts >> cached shared feed disappears during held and failed refresh then returns current records
- Location: tests/browser/calendar-sharing.spec.ts:291:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByRole('alert')
Expected substring: "Synthetic shared feed unavailable"
Received string:    "You do not have permission for this operation.Retry"
Timeout: 5000ms

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for getByRole('alert')
    14 × locator resolved to <div role="alert" class="status error">…</div>
       - unexpected value "You do not have permission for this operation.Retry"

```

```yaml
- alert:
  - paragraph: You do not have permission for this operation.
  - button "Retry"
```

# Test source

```ts
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
  276 |     .click();
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
> 305 |   await expect(page.getByRole("alert")).toContainText(
      |                                         ^ Error: expect(locator).toContainText(expected) failed
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
  387 |           .click();
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
```