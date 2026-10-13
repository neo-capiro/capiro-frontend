# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mail-rich-compose.spec.ts >> toolbar Attach file opens the existing attachment picker with no extra request
- Location: apps/web/tests/browser/mail-rich-compose.spec.ts:337:1

# Error details

```
Error: locator.click: Error: strict mode violation: getByRole('button', { name: 'Attach file', exact: true }) resolved to 2 elements:
    1) <button type="button" class="button ghost">Attach file</button> aka getByLabel('Message formatting').getByRole('button', { name: 'Attach file' })
    2) <input type="file"/> aka getByLabel('Attach file')

Call log:
  - waiting for getByRole('button', { name: 'Attach file', exact: true })

```

```
Error: page.waitForEvent: Test ended.
=========================== logs ===========================
waiting for event "filechooser"
============================================================
```

# Page snapshot

```yaml
- generic:
  - generic:
    - main:
      - heading [level=1]: Relationships
      - paragraph: Synthetic mailbox acceptance; no provider delivery.
      - button: Mail contact
      - button: Reply to thread
      - button: Email prepared document
  - dialog "New email" [ref=e2]:
    - banner [ref=e3]:
      - heading "New email" [level=2] [ref=e4]
      - button "Close" [ref=e5] [cursor=pointer]:
        - img [ref=e6]
    - paragraph [ref=e9]: Sends through your own connected mailbox. Backend permissions and connection policy apply.
    - generic [ref=e10]:
      - generic [ref=e11]:
        - generic [ref=e12]:
          - text: From mailbox
          - combobox "From mailbox" [ref=e13]:
            - option "Choose a sending mailbox"
            - option "Synthetic mailbox · sender@example.test" [selected]
        - generic [ref=e14]: Your saved signature belongs to your user account, not to a mailbox. Availability does not guarantee provider consent or delivery.
        - button "Refresh mailboxes" [ref=e15] [cursor=pointer]
      - region "Email recipients" [ref=e16]:
        - generic [ref=e17]:
          - strong [ref=e18]: To
          - generic [ref=e19]:
            - button "Cc" [ref=e20] [cursor=pointer]
            - button "Bcc" [ref=e21] [cursor=pointer]
        - generic [ref=e23]:
          - text: Taylor Test <taylor@example.test>
          - button "Remove recipient taylor@example.test" [ref=e24] [cursor=pointer]: ×
        - button "+ Add recipient" [ref=e25] [cursor=pointer]
        - generic [ref=e26]: From your connected mailbox (Settings → Personal). Separate copied addresses with commas; up to 10 per field.
      - generic [ref=e27]:
        - text: Subject
        - textbox "Subject" [ref=e28]: Rich synthetic message
      - generic [ref=e29]:
        - generic [ref=e30]: Message
        - generic [ref=e31]:
          - group "Message formatting" [ref=e32]:
            - button "Bold" [pressed] [ref=e33] [cursor=pointer]: B
            - button "Italic" [ref=e34] [cursor=pointer]: I
            - button "Underline" [ref=e35] [cursor=pointer]: U
            - button "List" [ref=e36] [cursor=pointer]
            - button "Attach file" [ref=e37] [cursor=pointer]
          - textbox "Message" [active] [ref=e39]:
            - paragraph [ref=e40]:
              - strong [ref=e41]: Original rich draft.
      - button "Rewrite with Meri" [ref=e42] [cursor=pointer]
      - group "Draft rewrite status"
      - generic [ref=e43]:
        - checkbox "Append my saved signature" [checked] [ref=e44]
        - text: Append my saved signature
      - region "Saved signature" [ref=e45]:
        - generic [ref=e46]:
          - iframe [ref=e47]:
            - paragraph [ref=f1e2]: Saved synthetic signature
          - generic [ref=e48]: Remote images and links are hidden in this preview.
      - region "Email attachments" [ref=e49]:
        - generic [ref=e50]:
          - text: Attach file
          - button "Attach file" [ref=e51]
        - generic [ref=e52]: Up to 5 files, 3 MiB each. Uploaded files are saved to this client’s Files. Removing here only detaches them from this draft.
      - button "Review email" [ref=e53] [cursor=pointer]
```

# Test source

```ts
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
  333 |   await expect(message(page)).toHaveText("Verified rewrite.");
  334 |   expect(state.sends).toHaveLength(0);
  335 | });
  336 | 
  337 | test("toolbar Attach file opens the existing attachment picker with no extra request", async ({
  338 |   page,
  339 | }) => {
  340 |   const state = await setup(page);
  341 |   await format(page, "Bold");
> 342 |   const chooserPromise = page.waitForEvent("filechooser");
      |                               ^ Error: page.waitForEvent: Test ended.
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