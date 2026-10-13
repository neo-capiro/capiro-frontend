# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mail-rich-compose.spec.ts >> source replacement retires editor history and rich Meri Undo
- Location: apps/web/tests/browser/mail-rich-compose.spec.ts:317:1

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator:  getByRole('textbox', { name: 'Message', exact: true })
Expected: "Verified rewrite."
Received: ""
Timeout:  5000ms

Call log:
  - Expect "toHaveText" with timeout 5000ms
  - waiting for getByRole('textbox', { name: 'Message', exact: true })
    14 × locator resolved to <div tabindex="0" role="textbox" translate="no" aria-required="true" aria-multiline="true" contenteditable="true" aria-labelledby="_r_7_" class="tiptap ProseMirror _messageBody_1r7cj_68 ProseMirror-focused">…</div>
       - unexpected value ""

```

```yaml
- textbox "Message":
  - paragraph
```

# Test source

```ts
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
  314 |   expect(state.sends).toHaveLength(0);
  315 | });
  316 | 
  317 | test("source replacement retires editor history and rich Meri Undo", async ({
  318 |   page,
  319 | }) => {
  320 |   const state = await setup(page);
  321 |   await format(page, "Bold");
  322 |   await page
  323 |     .getByRole("button", { name: "Rewrite with Meri", exact: true })
  324 |     .click();
  325 |   await expect(message(page)).toHaveText("Verified rewrite.");
  326 |   await page.evaluate(() =>
  327 |     window.__mailChangeClient?.("10000000-0000-4000-8000-000000000099"),
  328 |   );
  329 |   await expect(
  330 |     page.getByRole("button", { name: "Undo Meri rewrite", exact: true }),
  331 |   ).toHaveCount(0);
  332 |   await message(page).press("ControlOrMeta+z");
> 333 |   await expect(message(page)).toHaveText("Verified rewrite.");
      |                               ^ Error: expect(locator).toHaveText(expected) failed
  334 |   expect(state.sends).toHaveLength(0);
  335 | });
  336 | 
  337 | test("toolbar Attach file opens the existing attachment picker with no extra request", async ({
  338 |   page,
  339 | }) => {
  340 |   const state = await setup(page);
  341 |   await format(page, "Bold");
  342 |   const chooserPromise = page.waitForEvent("filechooser");
  343 |   await page.getByRole("button", { name: "Attach file", exact: true }).click();
  344 |   const chooser = await chooserPromise;
  345 |   expect(await chooser.element().getAttribute("type")).toBe("file");
  346 |   expect(
  347 |     await chooser
  348 |       .element()
  349 |       .evaluate(
  350 |         (element) =>
  351 |           element ===
  352 |           document.querySelector(
  353 |             'section[aria-label="Email attachments"] input[type="file"]',
  354 |           ),
  355 |       ),
  356 |   ).toBe(true);
  357 |   await chooser.setFiles([]);
  358 |   expect(state.sends).toHaveLength(0);
  359 |   expect(state.rewrites).toHaveLength(0);
  360 |   expect(state.unexpected).toEqual([]);
  361 |   await page
  362 |     .getByRole("group", { name: "Message formatting" })
  363 |     .scrollIntoViewIfNeeded();
  364 |   await page.screenshot({ path: test.info().outputPath("desktop-rich.png") });
  365 | });
  366 | 
```