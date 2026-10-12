# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: calendar-sharing.spec.ts >> client shared feed lists only server-shared metadata without opening owner details or invented downloads
- Location: tests/browser/calendar-sharing.spec.ts:270:1

# Error details

```
Test timeout of 20000ms exceeded.
```

```
Error: locator.click: Test timeout of 20000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Shared meetings', exact: true })

```

# Test source

```ts
  177 |   state.meeting.debriefs[0]!.status = "generated";
  178 |   state.files[0]!.usable = false;
  179 |   const dialog = await openSharing(page);
  180 |   for (const checkbox of await dialog.getByRole("checkbox").all())
  181 |     await expect(checkbox).toBeDisabled();
  182 |   await expect(dialog).toContainText("Private Research Portfolio preparation");
  183 |   await expect(dialog).toContainText("Approval required");
  184 |   await expect(
  185 |     dialog.getByRole("button", {
  186 |       name: "Share selected artifacts",
  187 |       exact: true,
  188 |     }),
  189 |   ).toBeDisabled();
  190 |   expect(state.writes).toEqual([]);
  191 | });
  192 | for (const scenario of ["uncertain", "foreign receipt"] as const)
  193 |   test(`${scenario} remains fenced after reopening and duplicate clicks`, async ({
  194 |     page,
  195 |   }) => {
  196 |     const { state } = await setup(page);
  197 |     state.receipt =
  198 |       scenario === "uncertain"
  199 |         ? {}
  200 |         : { ...sharedMeetingFixture(), tenantId: "foreign" };
  201 |     state.status = scenario === "uncertain" ? 503 : 200;
  202 |     await openSharing(page);
  203 |     const dialog = await choosePrepAndFile(page);
  204 |     const pause = held();
  205 |     state.hold = pause.promise;
  206 |     const button = dialog.getByRole("button", {
  207 |       name: "Confirm: Share selected artifacts",
  208 |     });
  209 |     await button.evaluate((node) => {
  210 |       (node as HTMLButtonElement).click();
  211 |       (node as HTMLButtonElement).click();
  212 |     });
  213 |     await expect.poll(() => state.writes.length).toBe(1);
  214 |     pause.release();
  215 |     await expect(dialog.getByRole("alert")).toContainText("may have changed");
  216 |     await page.keyboard.press("Escape");
  217 |     await page
  218 |       .getByRole("button", { name: "Share artifacts", exact: true })
  219 |       .click();
  220 |     const reopened = page.getByRole("dialog", {
  221 |       name: "Share artifacts with your organization?",
  222 |       exact: true,
  223 |     });
  224 |     await expect(reopened.getByRole("alert")).toContainText("may have changed");
  225 |     await expect(
  226 |       reopened.getByRole("button", {
  227 |         name: "Share selected artifacts",
  228 |         exact: true,
  229 |       }),
  230 |     ).toBeDisabled();
  231 |     expect(state.writes).toHaveLength(1);
  232 |   });
  233 | test("changed selected preparation is refused before sharing", async ({
  234 |   page,
  235 | }) => {
  236 |   const { state } = await setup(page);
  237 |   await openSharing(page);
  238 |   const dialog = await choosePrepAndFile(page);
  239 |   state.meeting.preps[0]!.summary = "Changed after user review";
  240 |   await dialog
  241 |     .getByRole("button", { name: "Confirm: Share selected artifacts" })
  242 |     .click();
  243 |   await expect(dialog.getByRole("alert")).toContainText(
  244 |     "changed or is not eligible",
  245 |   );
  246 |   expect(state.writes).toEqual([]);
  247 | });
  248 | test("actor replacement during held preflight produces zero writes", async ({
  249 |   page,
  250 | }) => {
  251 |   const { state } = await setup(page);
  252 |   await openSharing(page);
  253 |   const dialog = await choosePrepAndFile(page);
  254 |   const pause = held();
  255 |   const before = state.reads;
  256 |   state.readHold = pause.promise;
  257 |   await dialog
  258 |     .getByRole("button", { name: "Confirm: Share selected artifacts" })
  259 |     .click();
  260 |   await expect.poll(() => state.reads).toBeGreaterThan(before);
  261 |   await page.evaluate(() =>
  262 |     (
  263 |       window as unknown as { __sharingTest: { replaceActor: () => void } }
  264 |     ).__sharingTest.replaceActor(),
  265 |   );
  266 |   pause.release();
  267 |   await expect(dialog).toHaveCount(0);
  268 |   expect(state.writes).toEqual([]);
  269 | });
  270 | test("client shared feed lists only server-shared metadata without opening owner details or invented downloads", async ({
  271 |   page,
  272 | }) => {
  273 |   const { state, unexpected } = await setup(page);
  274 |   await page.goto(url);
  275 |   await page
  276 |     .getByRole("button", { name: "Shared meetings", exact: true })
> 277 |     .click();
      |      ^ Error: locator.click: Test timeout of 20000ms exceeded.
  278 |   const feed = page.getByRole("region", { name: "Client shared meetings" });
  279 |   await expect(
  280 |     feed.getByRole("heading", { name: sharingMeeting.subject }),
  281 |   ).toBeVisible();
  282 |   await expect(feed).toContainText("Their text is not provided by this feed");
  283 |   await expect(feed).toContainText(
  284 |     "File download and readiness are not provided",
  285 |   );
  286 |   await expect(feed.getByRole("link")).toHaveCount(0);
  287 |   expect(state.reads).toBe(0);
  288 |   expect(state.feedReads).toBe(1);
  289 |   expect(state.writes).toEqual([]);
  290 |   expect(unexpected).toEqual([]);
  291 | });
  292 | test("cached shared feed disappears during held and failed refresh then returns current records", async ({
  293 |   page,
  294 | }) => {
  295 |   const { state } = await setup(page);
  296 |   await page.goto(`${url}&shared=1`);
  297 |   const heading = page.getByRole("heading", { name: sharingMeeting.subject });
  298 |   await expect(heading).toBeVisible();
  299 |   const pause = held();
  300 |   state.feedHold = pause.promise;
  301 |   state.feedStatus = 403;
  302 |   await page.getByRole("button", { name: "Refresh shared meetings" }).click();
  303 |   await expect.poll(() => state.feedReads).toBe(2);
  304 |   await expect(heading).toHaveCount(0);
  305 |   pause.release();
  306 |   await expect(page.getByRole("alert")).toContainText(
  307 |     "Synthetic shared feed unavailable",
  308 |   );
  309 |   await expect(heading).toHaveCount(0);
  310 |   state.feedHold = undefined;
  311 |   state.feedStatus = 200;
  312 |   state.feed = [];
  313 |   await page.getByRole("button", { name: "Retry", exact: true }).click();
  314 |   await expect(
  315 |     page.getByText("No meetings are shared with this client."),
  316 |   ).toBeVisible();
  317 |   expect(state.writes).toEqual([]);
  318 | });
  319 | test("foreign client records are rejected and actor replacement does not reuse the prior feed", async ({
  320 |   page,
  321 | }) => {
  322 |   const { state } = await setup(page);
  323 |   await page.goto(`${url}&shared=1`);
  324 |   await expect(
  325 |     page.getByRole("heading", { name: sharingMeeting.subject }),
  326 |   ).toBeVisible();
  327 |   state.feed[0]!.client.id = "foreign-client";
  328 |   const pause = held();
  329 |   state.feedHold = pause.promise;
  330 |   await page.evaluate(() =>
  331 |     (
  332 |       window as unknown as { __sharingTest: { replaceActor: () => void } }
  333 |     ).__sharingTest.replaceActor(),
  334 |   );
  335 |   await expect.poll(() => state.feedReads).toBe(2);
  336 |   await expect(
  337 |     page.getByRole("heading", { name: sharingMeeting.subject }),
  338 |   ).toHaveCount(0);
  339 |   pause.release();
  340 |   await expect(page.getByRole("alert")).toBeVisible();
  341 |   expect(state.writes).toEqual([]);
  342 | });
  343 | test("sharing modal supports keyboard selection and fits original desktop and mobile sizes", async ({
  344 |   page,
  345 | }, testInfo) => {
  346 |   await setup(page);
  347 |   const dialog = await openSharing(page);
  348 |   await dialog.getByRole("checkbox", { name: /Meeting prep/ }).focus();
  349 |   await page.keyboard.press("Space");
  350 |   await expect(
  351 |     dialog.getByRole("checkbox", { name: /Meeting prep/ }),
  352 |   ).toBeChecked();
  353 |   for (const width of [1440, 390]) {
  354 |     await page.setViewportSize({ width, height: 980 });
  355 |     expect(
  356 |       await page.evaluate(
  357 |         () => document.documentElement.scrollWidth <= innerWidth,
  358 |       ),
  359 |     ).toBe(true);
  360 |     await page.screenshot({
  361 |       path: testInfo.outputPath(`sharing-${width}.png`),
  362 |       fullPage: true,
  363 |     });
  364 |   }
  365 | });
  366 | 
  367 | for (const draft of ["note", "meeting", "selection"] as const)
  368 |   test(`same-scope held meeting refresh preserves an open ${draft} draft`, async ({
  369 |     page,
  370 |   }) => {
  371 |     const { state } = await setup(page);
  372 |     if (draft === "selection") {
  373 |       await openSharing(page);
  374 |       await page.getByRole("checkbox", { name: /Meeting prep/ }).check();
  375 |     } else {
  376 |       await page.goto(`${url}&meeting=${sharingMeeting.id}`);
  377 |       if (draft === "note") {
```