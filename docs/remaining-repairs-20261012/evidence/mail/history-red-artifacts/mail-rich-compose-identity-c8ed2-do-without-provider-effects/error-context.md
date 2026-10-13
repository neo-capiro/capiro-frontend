# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mail-rich-compose.spec.ts >> identity invalidation revokes rich Undo without provider effects
- Location: apps/web/tests/browser/mail-rich-compose.spec.ts:294:1

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator:  getByRole('textbox', { name: 'Message', exact: true })
Expected: "Verified rewrite."
Received: "Original rich draft."
Timeout:  5000ms

Call log:
  - Expect "toHaveText" with timeout 5000ms
  - waiting for getByRole('textbox', { name: 'Message', exact: true })
    14 × locator resolved to <div tabindex="0" role="textbox" translate="no" aria-required="true" aria-multiline="true" contenteditable="true" aria-labelledby="_r_3_" class="tiptap ProseMirror _messageBody_1de57_68 ProseMirror-focused">…</div>
       - unexpected value "Original rich draft."

```

```yaml
- textbox "Message":
  - paragraph:
    - strong: Original rich draft.
```

# Test source

```ts
  215 |   await expect(
  216 |     message(page).locator("script,style,img[src],a,iframe,[onerror],[href]"),
  217 |   ).toHaveCount(0);
  218 |   const reviewed = await review(page);
  219 |   await expect(
  220 |     reviewed.getByRole("region", { name: "Message preview" }).locator("strong"),
  221 |   ).toHaveText("Safe bold");
  222 |   expect(
  223 |     await page.evaluate(
  224 |       () => (window as unknown as { __mailPasted?: boolean }).__mailPasted,
  225 |     ),
  226 |   ).toBeUndefined();
  227 |   await expect(
  228 |     reviewed
  229 |       .getByRole("region", { name: "Message preview" })
  230 |       .locator("img,script,style,a,iframe,[onerror],[href]"),
  231 |   ).toHaveCount(0);
  232 |   await reviewed
  233 |     .getByRole("button", { name: "Send email", exact: true })
  234 |     .click();
  235 |   await expect.poll(() => state.sends.length).toBe(1);
  236 |   expect(state.sends[0]?.bodyHtml).not.toMatch(
  237 |     /<(?:img|script|style|a|iframe)\b|onerror=|href=/,
  238 |   );
  239 |   expect(state.unexpected).toEqual([]);
  240 | });
  241 | 
  242 | test("empty and oversized rich bodies cannot be reviewed, and typed text is retained", async ({
  243 |   page,
  244 | }) => {
  245 |   const state = await setup(page);
  246 |   await expect(
  247 |     page.getByRole("button", { name: "Bold", exact: true }),
  248 |   ).toBeVisible();
  249 |   await review(page);
  250 |   await expect(
  251 |     page.getByRole("dialog", { name: "Send email", exact: true }),
  252 |   ).toHaveCount(0);
  253 |   await expect(
  254 |     page.getByText("Enter a message.", { exact: true }),
  255 |   ).toBeVisible();
  256 |   const long = "a".repeat(8001);
  257 |   await message(page).fill(long);
  258 |   await review(page);
  259 |   await expect(
  260 |     page.getByText("Keep the message to 8,000 characters.", { exact: true }),
  261 |   ).toBeVisible();
  262 |   await expect(message(page)).toHaveText(long);
  263 |   expect(state.sends).toHaveLength(0);
  264 | });
  265 | 
  266 | test("keyboard formatting and mobile toolbar remain reachable", async ({
  267 |   page,
  268 | }) => {
  269 |   await page.setViewportSize({ width: 390, height: 844 });
  270 |   const state = await setup(page);
  271 |   await expect(
  272 |     page.getByRole("button", { name: "Bold", exact: true }),
  273 |   ).toBeVisible();
  274 |   await message(page).fill("Keyboard rich draft.");
  275 |   await message(page).press("ControlOrMeta+a");
  276 |   await message(page).press("ControlOrMeta+b");
  277 |   await expect(message(page).locator("strong")).toHaveText(
  278 |     "Keyboard rich draft.",
  279 |   );
  280 |   for (const name of ["Bold", "Italic", "Underline", "List"]) {
  281 |     const button = page.getByRole("button", { name, exact: true });
  282 |     await button.focus();
  283 |     await expect(button).toBeFocused();
  284 |     const box = await button.boundingBox();
  285 |     expect(box!.x).toBeGreaterThanOrEqual(0);
  286 |     expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  287 |   }
  288 |   await page.screenshot({
  289 |     path: test.info().outputPath("mobile-rich.png"),
  290 |   });
  291 |   expect(state.unexpected).toEqual([]);
  292 | });
  293 | 
  294 | test("identity invalidation revokes rich Undo without provider effects", async ({
  295 |   page,
  296 | }) => {
  297 |   const state = await setup(page);
  298 |   await format(page, "Bold");
  299 |   await page
  300 |     .getByRole("button", { name: "Rewrite with Meri", exact: true })
  301 |     .click();
  302 |   await expect(
  303 |     page.getByRole("button", { name: "Undo Meri rewrite", exact: true }),
  304 |   ).toBeVisible();
  305 |   await page.evaluate(() =>
  306 |     (
  307 |       window as unknown as { __mailInvalidate: () => Promise<unknown> }
  308 |     ).__mailInvalidate(),
  309 |   );
  310 |   await expect(
  311 |     page.getByRole("button", { name: "Undo Meri rewrite", exact: true }),
  312 |   ).toHaveCount(0);
  313 |   await expect(message(page)).toHaveText("Verified rewrite.");
  314 |   await message(page).press("ControlOrMeta+z");
> 315 |   await expect(message(page)).toHaveText("Verified rewrite.");
      |                               ^ Error: expect(locator).toHaveText(expected) failed
  316 |   expect(state.sends).toHaveLength(0);
  317 | });
  318 | 
  319 | test("source replacement retires editor history and rich Meri Undo", async ({
  320 |   page,
  321 | }) => {
  322 |   const state = await setup(page);
  323 |   await format(page, "Bold");
  324 |   await page
  325 |     .getByRole("button", { name: "Rewrite with Meri", exact: true })
  326 |     .click();
  327 |   await expect(message(page)).toHaveText("Verified rewrite.");
  328 |   await page.evaluate(() =>
  329 |     window.__mailChangeClient?.("10000000-0000-4000-8000-000000000099"),
  330 |   );
  331 |   await expect(
  332 |     page.getByRole("button", { name: "Undo Meri rewrite", exact: true }),
  333 |   ).toHaveCount(0);
  334 |   await message(page).press("ControlOrMeta+z");
  335 |   await expect(message(page)).toHaveText("Verified rewrite.");
  336 |   expect(state.sends).toHaveLength(0);
  337 | });
  338 | 
  339 | test("toolbar Attach file opens the existing attachment picker with no extra request", async ({
  340 |   page,
  341 | }) => {
  342 |   const state = await setup(page);
  343 |   await format(page, "Bold");
  344 |   const chooserPromise = page.waitForEvent("filechooser");
  345 |   await page
  346 |     .getByRole("group", { name: "Message formatting" })
  347 |     .getByRole("button", { name: "Attach file", exact: true })
  348 |     .click();
  349 |   const chooser = await chooserPromise;
  350 |   expect(await chooser.element().getAttribute("type")).toBe("file");
  351 |   expect(
  352 |     await chooser
  353 |       .element()
  354 |       .evaluate(
  355 |         (element) =>
  356 |           element ===
  357 |           document.querySelector(
  358 |             'section[aria-label="Email attachments"] input[type="file"]',
  359 |           ),
  360 |       ),
  361 |   ).toBe(true);
  362 |   await chooser.setFiles([]);
  363 |   expect(state.sends).toHaveLength(0);
  364 |   expect(state.rewrites).toHaveLength(0);
  365 |   expect(state.unexpected).toEqual([]);
  366 |   await page
  367 |     .getByRole("group", { name: "Message formatting" })
  368 |     .scrollIntoViewIfNeeded();
  369 |   await page.screenshot({ path: test.info().outputPath("desktop-rich.png") });
  370 | });
  371 | 
  372 | test("ordinary formatting and typing keep native Undo after a verified rewrite", async ({
  373 |   page,
  374 | }) => {
  375 |   const state = await setup(page);
  376 |   await format(page, "Bold");
  377 |   await page
  378 |     .getByRole("button", { name: "Rewrite with Meri", exact: true })
  379 |     .click();
  380 |   await expect(message(page)).toHaveText("Verified rewrite.");
  381 |   await message(page).press("ControlOrMeta+a");
  382 |   await message(page).press("ControlOrMeta+b");
  383 |   await expect(message(page).locator("strong")).toHaveText("Verified rewrite.");
  384 |   await message(page).press("ControlOrMeta+z");
  385 |   await expect(message(page).locator("strong")).toHaveCount(0);
  386 |   await expect(message(page)).toHaveText("Verified rewrite.");
  387 |   await message(page).press("End");
  388 |   await message(page).pressSequentially(" Added locally.");
  389 |   await expect(message(page)).toHaveText("Verified rewrite. Added locally.");
  390 |   await message(page).press("ControlOrMeta+z");
  391 |   await expect(message(page)).toHaveText("Verified rewrite.");
  392 |   expect(state.rewrites).toHaveLength(1);
  393 |   expect(state.sends).toHaveLength(0);
  394 | });
  395 | 
```