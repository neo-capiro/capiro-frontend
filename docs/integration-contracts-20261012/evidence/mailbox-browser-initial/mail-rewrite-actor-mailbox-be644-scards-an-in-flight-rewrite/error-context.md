# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mail-rewrite.spec.ts >> actor mailbox identity discards an in-flight rewrite
- Location: tests/browser/mail-rewrite.spec.ts:246:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/mailbox session changed or is unverified/)
Expected: visible
Error: strict mode violation: getByText(/mailbox session changed or is unverified/) resolved to 2 elements:
    1) <p>Your mailbox session changed or is unverified. Re…</p> aka getByText('Your mailbox session changed').first()
    2) <p>Your mailbox session changed or is unverified. Re…</p> aka getByText('Your mailbox session changed').nth(1)

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText(/mailbox session changed or is unverified/)

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
  - dialog "New email" [active] [ref=e2]:
    - banner [ref=e3]:
      - heading "New email" [level=2] [ref=e4]
      - button "Close" [ref=e5] [cursor=pointer]:
        - img [ref=e6]
    - paragraph [ref=e9]: Sends through your own connected mailbox. Backend permissions and connection policy apply.
    - generic [ref=e10]:
      - generic [ref=e11]:
        - generic [ref=e12]:
          - text: From mailbox
          - combobox "From mailbox" [disabled] [ref=e13]:
            - option "Choose a sending mailbox"
            - option "Selected mailbox unavailable" [disabled] [selected]
        - generic [ref=e14]: Your saved signature belongs to your user account, not to a mailbox. Availability does not guarantee provider consent or delivery.
        - status [ref=e15]: A current sending mailbox is unavailable. The draft is retained; another mailbox will not be substituted.
        - alert [ref=e16]:
          - paragraph [ref=e17]: Your mailbox session changed or is unverified. Refresh and review this draft.
        - button "Refresh mailboxes" [ref=e18] [cursor=pointer]
      - region "Email recipients" [ref=e19]:
        - generic [ref=e20]:
          - strong [ref=e21]: To
          - generic [ref=e22]:
            - button "Cc" [ref=e23] [cursor=pointer]
            - button "Bcc" [ref=e24] [cursor=pointer]
        - generic [ref=e26]:
          - text: Taylor Test <taylor@example.test>
          - button "Remove recipient taylor@example.test" [ref=e27] [cursor=pointer]: ×
        - button "+ Add recipient" [ref=e28] [cursor=pointer]
        - generic [ref=e29]: From your connected mailbox (Settings → Personal). Separate copied addresses with commas; up to 10 per field.
      - generic [ref=e30]:
        - text: Subject
        - textbox "Subject" [ref=e31]: Synthetic review
      - generic [ref=e32]:
        - generic [ref=e33]: Message
        - textbox "Message" [ref=e34]: Original draft for review.
      - button "Rewrite with Meri" [ref=e35] [cursor=pointer]
      - alert [ref=e36]:
        - paragraph [ref=e37]: Your mailbox session changed or is unverified. Refresh and review this draft.
      - generic [ref=e38]:
        - checkbox "Append my saved signature" [disabled] [ref=e39]
        - text: Append my saved signature
      - generic [ref=e40]: No saved signature is available.
      - region "Email attachments" [ref=e41]:
        - generic [ref=e42]:
          - text: Attach file
          - button "Attach file" [ref=e43]
        - generic [ref=e44]: Up to 5 files, 3 MiB each. Uploaded files are saved to this client’s Files. Removing here only detaches them from this draft.
      - button "Review email" [disabled] [ref=e45]
```

# Test source

```ts
  171 |   );
  172 |   expect(state.sends()).toBe(0);
  173 | });
  174 | 
  175 | test("editing back to the original text still invalidates its earlier rewrite", async ({
  176 |   page,
  177 | }) => {
  178 |   const state = await setupRewrite(page);
  179 |   await startRewrite(page, state);
  180 |   await page.getByLabel("Message", { exact: true }).fill("Intermediate edit.");
  181 |   await page.getByLabel("Message", { exact: true }).fill(original);
  182 |   await expect.poll(() => state.aborted.size).toBe(1);
  183 |   await state.attempt(0).release({
  184 |     bodyHtml: "<p>Late stale result.</p>",
  185 |     verified: true,
  186 |   });
  187 |   await expect(page.getByLabel("Message", { exact: true })).toHaveValue(
  188 |     original,
  189 |   );
  190 |   await expect(
  191 |     page.getByRole("button", { name: "Rewrite with Meri", exact: true }),
  192 |   ).toBeEnabled();
  193 |   expect(state.sends()).toBe(0);
  194 | });
  195 | 
  196 | test("closing and reopening the composer cannot accept an earlier response", async ({
  197 |   page,
  198 | }) => {
  199 |   const state = await setupRewrite(page);
  200 |   await startRewrite(page, state);
  201 |   await page.keyboard.press("Escape");
  202 |   await expect(
  203 |     page.getByRole("dialog", { name: "New email", exact: true }),
  204 |   ).not.toBeVisible();
  205 |   await expect.poll(() => state.aborted.size).toBe(1);
  206 |   await openCompose(page);
  207 |   await page
  208 |     .getByLabel("Message", { exact: true })
  209 |     .fill("Reopened manual draft.");
  210 |   await state.attempt(0).release({
  211 |     bodyHtml: "<p>Closed composer result.</p>",
  212 |     verified: true,
  213 |   });
  214 |   await expect(page.getByLabel("Message", { exact: true })).toHaveValue(
  215 |     "Reopened manual draft.",
  216 |   );
  217 |   expect(state.sends()).toBe(0);
  218 | });
  219 | 
  220 | test("changing and restoring recipients discards the old source without leaving pending status", async ({
  221 |   page,
  222 | }) => {
  223 |   const state = await setupRewrite(page);
  224 |   await startRewrite(page, state);
  225 |   await page.getByRole("button", { name: "Cc", exact: true }).click();
  226 |   await page.getByLabel("Cc", { exact: true }).fill("copied@example.test");
  227 |   await expect.poll(() => state.aborted.size).toBe(1);
  228 |   await page.getByLabel("Cc", { exact: true }).fill("");
  229 |   await state.attempt(0).release({
  230 |     bodyHtml: "<p>Old recipient context.</p>",
  231 |     verified: true,
  232 |   });
  233 |   await expect(page.getByLabel("Message", { exact: true })).toHaveValue(
  234 |     original,
  235 |   );
  236 |   await expect(
  237 |     page.getByRole("button", { name: "Rewrite with Meri", exact: true }),
  238 |   ).toBeEnabled();
  239 |   await expect(
  240 |     page.getByRole("button", { name: "Review email", exact: true }),
  241 |   ).toBeEnabled();
  242 |   expect(state.sends()).toBe(0);
  243 | });
  244 | 
  245 | for (const change of ["invalidated", "actor"] as const) {
  246 |   test(`${change} mailbox identity discards an in-flight rewrite`, async ({
  247 |     page,
  248 |   }) => {
  249 |     const state = await setupRewrite(page);
  250 |     await startRewrite(page, state);
  251 |     if (change === "actor") {
  252 |       state.changeActor();
  253 |       await page.evaluate(() => window.__mailRecheck?.());
  254 |     } else {
  255 |       expect(await page.evaluate(() => window.__mailInvalidate?.())).toEqual({
  256 |         status: "success",
  257 |         fetchStatus: "idle",
  258 |         isInvalidated: true,
  259 |       });
  260 |     }
  261 |     await expect.poll(() => state.aborted.size).toBe(1);
  262 |     await state.attempt(0).release({
  263 |       bodyHtml: "<p>Revoked session result.</p>",
  264 |       verified: true,
  265 |     });
  266 |     await expect(page.getByLabel("Message", { exact: true })).toHaveValue(
  267 |       original,
  268 |     );
  269 |     await expect(
  270 |       page.getByText(/mailbox session changed or is unverified/),
> 271 |     ).toBeVisible();
      |       ^ Error: expect(locator).toBeVisible() failed
  272 |     expect(state.sends()).toBe(0);
  273 |   });
  274 | }
  275 | 
  276 | test("invalidated idle authority refuses rewrite before dispatch", async ({
  277 |   page,
  278 | }) => {
  279 |   const state = await setupRewrite(page);
  280 |   await page.evaluate(() => window.__mailInvalidate?.());
  281 |   await page
  282 |     .getByRole("button", { name: "Rewrite with Meri", exact: true })
  283 |     .click();
  284 |   await expect(
  285 |     page.getByText(/mailbox session changed or is unverified/),
  286 |   ).toBeVisible();
  287 |   await expect(page.getByLabel("Message", { exact: true })).toHaveValue(
  288 |     original,
  289 |   );
  290 |   expect(state.requests).toHaveLength(0);
  291 |   expect(state.sends()).toBe(0);
  292 | });
  293 | 
```