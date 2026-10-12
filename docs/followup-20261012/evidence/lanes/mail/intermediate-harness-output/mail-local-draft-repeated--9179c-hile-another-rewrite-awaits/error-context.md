# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mail-local-draft.spec.ts >> repeated rewrites retain one latest snapshot and Undo is unavailable while another rewrite awaits
- Location: apps/web/tests/browser/mail-local-draft.spec.ts:255:1

# Error details

```
ReferenceError: failed is not defined
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
        - textbox "Subject" [ref=e28]: Synthetic local review
      - generic [ref=e29]:
        - generic [ref=e30]: Message
        - textbox "Message" [ref=e31]: Verified rewritten draft.
      - button "Rewriting…" [disabled] [ref=e32]
      - button "Undo Meri rewrite" [disabled] [ref=e33]
      - group "Draft rewrite status"
      - generic [ref=e34]:
        - checkbox "Append my saved signature" [checked] [ref=e35]
        - text: Append my saved signature
      - region "Saved signature" [ref=e36]:
        - generic [ref=e37]:
          - iframe [ref=e38]:
            - paragraph [ref=f1e2]:
              - strong [ref=f1e3]: Synthetic Sender
              - text: Saved signature identity
          - generic [ref=e39]: Remote images and links are hidden in this preview.
      - region "Email attachments" [ref=e40]:
        - generic [ref=e41]:
          - text: Attach file
          - button "Attach file" [ref=e42]
        - generic [ref=e43]: Up to 5 files, 3 MiB each. Uploaded files are saved to this client’s Files. Removing here only detaches them from this draft.
      - button "Review email" [disabled] [ref=e44]
```

# Test source

```ts
  169 |   ).toHaveCount(0);
  170 |   await expect(
  171 |     page.locator('iframe[title="Saved signature preview"]'),
  172 |   ).toHaveAttribute("sandbox", "");
  173 |   expect(state.remote).toEqual([]);
  174 |   expect(state.sends).toEqual([]);
  175 | });
  176 | 
  177 | for (const html of [null, ""])
  178 |   test(`empty signature ${String(html)} has no misleading preview`, async ({
  179 |     page,
  180 |   }) => {
  181 |     await setup(page, { html, enabled: false });
  182 |     await open(page);
  183 |     await expect(
  184 |       page.getByText("No saved signature is available.", { exact: true }),
  185 |     ).toBeVisible();
  186 |     await expect(page.getByLabel("Append my saved signature")).toBeDisabled();
  187 |     await expect(
  188 |       page.locator('iframe[title="Saved signature preview"]'),
  189 |     ).toHaveCount(0);
  190 |   });
  191 | 
  192 | test("signature read failure remains distinct from empty and can be retried deliberately", async ({
  193 |   page,
  194 | }) => {
  195 |   const state = await setup(page);
  196 |   state.signatureStatus = 503;
  197 |   await open(page);
  198 |   const signature = page.getByRole("region", { name: "Saved signature" });
  199 |   await expect(signature.getByRole("alert")).toContainText(
  200 |     "Signature temporarily unavailable",
  201 |   );
  202 |   await expect(
  203 |     page.getByText("No saved signature is available.", { exact: true }),
  204 |   ).toHaveCount(0);
  205 |   state.signatureStatus = 200;
  206 |   await signature.getByRole("button", { name: "Retry signature" }).click();
  207 |   await expect(
  208 |     signature
  209 |       .frameLocator('iframe[title="Saved signature preview"]')
  210 |       .getByText("Synthetic Sender", { exact: true }),
  211 |   ).toBeVisible();
  212 |   expect(state.sends).toEqual([]);
  213 | });
  214 | 
  215 | test("local Undo restores exactly the body preceding the latest verified rewrite with no extra requests", async ({
  216 |   page,
  217 | }) => {
  218 |   const state = await setup(page);
  219 |   await open(page);
  220 |   await rewrite(page);
  221 |   await page
  222 |     .getByRole("button", { name: "Undo Meri rewrite", exact: true })
  223 |     .click();
  224 |   await expect(page.getByLabel("Message", { exact: true })).toHaveValue(
  225 |     original,
  226 |   );
  227 |   await expect(
  228 |     page.getByRole("button", { name: "Undo Meri rewrite", exact: true }),
  229 |   ).toHaveCount(0);
  230 |   expect(state.rewrites).toHaveLength(1);
  231 |   expect(state.sends).toEqual([]);
  232 | });
  233 | 
  234 | test("manual edits retire Undo and the next rewrite snapshots the new local draft", async ({
  235 |   page,
  236 | }) => {
  237 |   const state = await setup(page);
  238 |   await open(page);
  239 |   await rewrite(page);
  240 |   await page.getByLabel("Message", { exact: true }).fill("Newer manual work.");
  241 |   await expect(
  242 |     page.getByRole("button", { name: "Undo Meri rewrite", exact: true }),
  243 |   ).toHaveCount(0);
  244 |   await rewrite(page);
  245 |   await page
  246 |     .getByRole("button", { name: "Undo Meri rewrite", exact: true })
  247 |     .click();
  248 |   await expect(page.getByLabel("Message", { exact: true })).toHaveValue(
  249 |     "Newer manual work.",
  250 |   );
  251 |   expect(state.rewrites).toHaveLength(2);
  252 |   expect(state.sends).toEqual([]);
  253 | });
  254 | 
  255 | test("repeated rewrites retain one latest snapshot and Undo is unavailable while another rewrite awaits", async ({
  256 |   page,
  257 | }) => {
  258 |   const state = await setup(page);
  259 |   await open(page);
  260 |   await rewrite(page);
  261 |   state.hold = true;
  262 |   state.rewriteResult.bodyHtml = "<p>Second verified revision.</p>";
  263 |   await page
  264 |     .getByRole("button", { name: "Rewrite with Meri", exact: true })
  265 |     .click();
  266 |   await expect.poll(() => state.rewrites.length).toBe(2);
  267 |   await expect(
  268 |     page.getByRole("button", { name: "Undo Meri rewrite", exact: true }),
> 269 |   ).toBeDisabled();
      |                   ^ ReferenceError: failed is not defined
  270 |   state.release();
  271 |   await expect(page.getByLabel("Message", { exact: true })).toHaveValue(
  272 |     "Second verified revision.",
  273 |   );
  274 |   await page
  275 |     .getByRole("button", { name: "Undo Meri rewrite", exact: true })
  276 |     .click();
  277 |   await expect(page.getByLabel("Message", { exact: true })).toHaveValue(
  278 |     "Verified rewritten draft.",
  279 |   );
  280 |   await expect(
  281 |     page.getByRole("button", { name: "Undo Meri rewrite", exact: true }),
  282 |   ).toHaveCount(0);
  283 |   expect(state.rewrites).toHaveLength(2);
  284 |   expect(state.sends).toEqual([]);
  285 | });
  286 | 
  287 | for (const failed of [false, true])
  288 |   test(`${failed ? "failed" : "unverified"} subsequent rewrite retains the prior valid Undo`, async ({
  289 |     page,
  290 |   }) => {
  291 |     const state = await setup(page);
  292 |     await open(page);
  293 |     await rewrite(page);
  294 |     state.rewriteResult.verified = false;
  295 |     state.rewriteStatus = failed ? 503 : 200;
  296 |     await page
  297 |       .getByRole("button", { name: "Rewrite with Meri", exact: true })
  298 |       .click();
  299 |     await expect.poll(() => state.rewrites.length).toBe(2);
  300 |     if (failed) await expect(page.getByRole("group", { name: "Draft rewrite status" })).toContainText("Synthetic rewrite failure");
  301 |     else await expect(page.getByText(/Meri could not verify/)).toBeVisible();
  302 |     await expect(
  303 |       page.getByRole("button", { name: "Undo Meri rewrite", exact: true }),
  304 |     ).toBeEnabled();
  305 |     await page
  306 |       .getByRole("button", { name: "Undo Meri rewrite", exact: true })
  307 |       .click();
  308 |     await expect(page.getByLabel("Message", { exact: true })).toHaveValue(
  309 |       original,
  310 |     );
  311 |     expect(state.sends).toEqual([]);
  312 |   });
  313 | 
  314 | for (const change of [
  315 |   "recipients",
  316 |   "client",
  317 |   "actor",
  318 |   "invalidated",
  319 |   "close",
  320 | ] as const)
  321 |   test(`${change} replacement retires an earlier Undo snapshot`, async ({
  322 |     page,
  323 |   }) => {
  324 |     const state = await setup(page);
  325 |     await open(page);
  326 |     await rewrite(page);
  327 |     if (change === "recipients") {
  328 |       await page.getByRole("button", { name: "Cc", exact: true }).click();
  329 |       await page.getByLabel("Cc", { exact: true }).fill("copy@example.test");
  330 |       await page.getByLabel("Cc", { exact: true }).fill("");
  331 |     } else if (change === "client") {
  332 |       await page.evaluate(() =>
  333 |         window.__mailChangeClient?.("10000000-0000-4000-8000-000000000002"),
  334 |       );
  335 |       await expect(
  336 |         page.getByRole("button", { name: "Undo Meri rewrite", exact: true }),
  337 |       ).toHaveCount(0);
  338 |       await page.evaluate(() =>
  339 |         window.__mailChangeClient?.("10000000-0000-4000-8000-000000000001"),
  340 |       );
  341 |     } else if (change === "actor") {
  342 |       state.actor = "actor-b";
  343 |       await page.evaluate(() => window.__mailRecheck?.());
  344 |       state.actor = "actor-a";
  345 |       await page.evaluate(() => window.__mailRecheck?.());
  346 |     } else if (change === "invalidated") {
  347 |       await page.evaluate(() => window.__mailInvalidate?.());
  348 |       await page.evaluate(() => window.__mailRecheck?.());
  349 |     } else {
  350 |       await page.keyboard.press("Escape");
  351 |       await open(page);
  352 |     }
  353 |     await expect(
  354 |       page.getByRole("button", { name: "Undo Meri rewrite", exact: true }),
  355 |     ).toHaveCount(0);
  356 |     expect(state.rewrites).toHaveLength(1);
  357 |     expect(state.sends).toEqual([]);
  358 |   });
  359 | 
  360 | test("append selection is local to the message and controls review inclusion", async ({
  361 |   page,
  362 | }) => {
  363 |   const state = await setup(page);
  364 |   await open(page);
  365 |   await page.getByLabel("Append my saved signature").uncheck();
  366 |   await page.getByRole("button", { name: "Review email", exact: true }).click();
  367 |   const review = page.getByRole("dialog", { name: "Send email", exact: true });
  368 |   await expect(
  369 |     review.locator('iframe[title="Saved signature preview"]'),
```