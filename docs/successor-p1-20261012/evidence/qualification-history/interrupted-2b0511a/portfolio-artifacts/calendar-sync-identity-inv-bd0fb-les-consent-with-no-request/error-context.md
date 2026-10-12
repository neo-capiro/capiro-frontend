# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: calendar-sync.spec.ts >> identity invalidation while idle immediately disables consent with no request
- Location: tests/browser/calendar-sync.spec.ts:290:1

# Error details

```
Error: locator.selectOption: Test ended.
Call log:
  - waiting for getByRole('dialog').getByRole('combobox', { name: 'Connected account', exact: true })

```

# Test source

```ts
  198 |   await page.emulateMedia({ colorScheme: "dark" });
  199 |   const response = holdCalendarSyncResponse();
  200 |   const state = await installCalendarSyncFixtures(page, {
  201 |     responseGate: response.promise,
  202 |   });
  203 |   try {
  204 |     await page.goto("/__test/calendar-sync");
  205 |     const dialog = await open(page);
  206 |     await dialog
  207 |       .getByRole("combobox", { name: "Connected account", exact: true })
  208 |       .selectOption(syncMicrosoftId);
  209 |     await dialog
  210 |       .getByRole("button", { name: "Import calendar meetings" })
  211 |       .click();
  212 |     await expect(dialog).toHaveAccessibleName("Syncing calendar");
  213 |     await expect(dialog).toHaveCSS("padding", "16px");
  214 |     await expect(dialog).toHaveCSS("background-color", "rgb(27, 27, 27)");
  215 |     expect((await dialog.boundingBox())?.width).toBe(358);
  216 |     await expect
  217 |       .poll(() =>
  218 |         page.evaluate(
  219 |           async () => (await document.fonts.load('14px "Geist Test"')).length,
  220 |         ),
  221 |       )
  222 |       .toBeGreaterThan(0);
  223 |     await page.screenshot({
  224 |       path: testInfo.outputPath("calendar-sync-mobile-dark.png"),
  225 |     });
  226 |     await page.keyboard.press("Escape");
  227 |     await expect(dialog).not.toBeVisible();
  228 |     expect(state.writes).toHaveLength(1);
  229 |   } finally {
  230 |     response.release();
  231 |   }
  232 | });
  233 | 
  234 | test("actual actor change while dispatched hides late receipt and preserves original actor fence", async ({
  235 |   page,
  236 | }) => {
  237 |   const state = await installCalendarSyncFixtures(page, { delay: 500 });
  238 |   await page.goto("/__test/calendar-sync");
  239 |   const dialog = await open(page);
  240 |   await dialog
  241 |     .getByRole("combobox", { name: "Connected account", exact: true })
  242 |     .selectOption(syncMicrosoftId);
  243 |   await dialog
  244 |     .getByRole("button", { name: "Import calendar meetings" })
  245 |     .click();
  246 |   await expect.poll(() => state.writes.length).toBe(1);
  247 |   await page.evaluate(() => window.__syncActor?.(true));
  248 |   await expect(dialog.getByLabel("Calendar sync result")).toHaveCount(0);
  249 |   await page.evaluate(() => window.__syncActor?.(false));
  250 |   await expect(dialog).toContainText("Sync outcome unknown");
  251 |   expect(state.writes).toHaveLength(1);
  252 | });
  253 | 
  254 | test("rapid duplicate consent does not dispatch a second provider request", async ({
  255 |   page,
  256 | }) => {
  257 |   const state = await installCalendarSyncFixtures(page, {
  258 |     preflightDelay: 300,
  259 |   });
  260 |   await page.goto("/__test/calendar-sync");
  261 |   const dialog = await open(page);
  262 |   await dialog
  263 |     .getByRole("combobox", { name: "Connected account", exact: true })
  264 |     .selectOption(syncMicrosoftId);
  265 |   await dialog
  266 |     .getByRole("button", { name: "Import calendar meetings" })
  267 |     .dblclick();
  268 |   await expect(dialog.getByLabel("Calendar sync result")).toBeVisible();
  269 |   expect(state.writes).toHaveLength(1);
  270 | });
  271 | 
  272 | test("disconnected accounts are honestly unavailable without reconnect controls", async ({
  273 |   page,
  274 | }) => {
  275 |   const state = await installCalendarSyncFixtures(page, {
  276 |     status: "needs_configuration",
  277 |   });
  278 |   await page.goto("/__test/calendar-sync");
  279 |   const dialog = await open(page);
  280 |   await expect(dialog).toContainText(
  281 |     "No connected Microsoft or Google calendar is available",
  282 |   );
  283 |   await expect(
  284 |     dialog.getByRole("button", { name: "Import calendar meetings" }),
  285 |   ).toBeDisabled();
  286 |   await expect(dialog.getByRole("link")).toHaveCount(0);
  287 |   expect(state.writes).toEqual([]);
  288 | });
  289 | 
  290 | test("identity invalidation while idle immediately disables consent with no request", async ({
  291 |   page,
  292 | }) => {
  293 |   const state = await installCalendarSyncFixtures(page);
  294 |   await page.goto("/__test/calendar-sync");
  295 |   const dialog = await open(page);
  296 |   await dialog
  297 |     .getByRole("combobox", { name: "Connected account", exact: true })
> 298 |     .selectOption(syncMicrosoftId);
      |      ^ Error: locator.selectOption: Test ended.
  299 |   await expect(
  300 |     dialog.getByRole("button", { name: "Import calendar meetings" }),
  301 |   ).toBeEnabled();
  302 |   await page.evaluate(() => window.__syncInvalidate?.());
  303 |   await expect(
  304 |     dialog.getByRole("button", { name: "Import calendar meetings" }),
  305 |   ).toBeDisabled();
  306 |   expect(state.writes).toEqual([]);
  307 | });
  308 | 
```