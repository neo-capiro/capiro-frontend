# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: email-compose.spec.ts >> overlay clicks respect context gestures and dismiss only the top email review
- Location: tests/browser/email-compose.spec.ts:187:1

# Error details

```
Error: expect(locator).toBeFocused() failed

Locator:  getByRole('button', { name: 'Review email', exact: true })
Expected: focused
Received: inactive
Timeout:  5000ms

Call log:
  - Expect "toBeFocused" with timeout 5000ms
  - waiting for getByRole('button', { name: 'Review email', exact: true })
    14 × locator resolved to <button class="button primary">Review email</button>
       - unexpected value "inactive"

```

```yaml
- button "Review email"
```

# Test source

```ts
  111 |       }
  112 |       return json(file);
  113 |     }
  114 |     if (path === "engagement/attachments") {
  115 |       expect(new URL(route.request().url()).searchParams.get("clientId")).toBe(
  116 |         clientId,
  117 |       );
  118 |       reads++;
  119 |       if (options.holdRead && reads > 1)
  120 |         await new Promise<void>((resolve) => {
  121 |           releaseRead = resolve;
  122 |         });
  123 |       return json([
  124 |         {
  125 |           ...file,
  126 |           usable,
  127 |           blockedReason: usable ? undefined : "Awaiting malware scan",
  128 |           scanStatus: usable ? "clean" : "pending",
  129 |           lifecycleStatus: usable ? "ready" : "quarantined",
  130 |           scanDisclosure: usable ? undefined : "Awaiting malware scan",
  131 |         },
  132 |       ]);
  133 |     }
  134 |     if (path === "engagement/mail/send") {
  135 |       sent.push(route.request().postDataJSON());
  136 |       return json(
  137 |         options.badReceipt
  138 |           ? { ok: true }
  139 |           : options.sendStatus
  140 |             ? { message: "Delivery could not be confirmed" }
  141 |             : { ok: true, threadId: id, messageId: other },
  142 |         options.sendStatus ?? 200,
  143 |       );
  144 |     }
  145 |     return json({ message: `Unexpected fixture route: ${path}` }, 500);
  146 |   });
  147 |   await page.route("https://storage.example.test/**", async (route) => {
  148 |     uploads++;
  149 |     await route.fulfill({ status: 204 });
  150 |   });
  151 |   await page.goto("/__test/email-compose");
  152 |   return {
  153 |     sent,
  154 |     counts: () => ({ prepares, uploads, confirms, reads }),
  155 |     setUsable: () => {
  156 |       usable = true;
  157 |     },
  158 |     actor: () => {
  159 |       user = "actor-b";
  160 |     },
  161 |     releasePrepare: () => releasePrepare?.(),
  162 |     releaseRead: () => releaseRead?.(),
  163 |   };
  164 | }
  165 | async function compose(page: Page, reply = false) {
  166 |   await page
  167 |     .getByRole("button", {
  168 |       name: reply ? "Reply to thread" : "Mail contact",
  169 |       exact: true,
  170 |     })
  171 |     .click();
  172 |   await page.getByLabel("Subject", { exact: true }).fill("Synthetic review");
  173 |   await page
  174 |     .getByLabel("Message", { exact: true })
  175 |     .fill("Draft retained for explicit review.");
  176 |   await expect(
  177 |     page.getByRole("button", { name: "Review email", exact: true }),
  178 |   ).toBeEnabled();
  179 | }
  180 | async function attach(page: Page) {
  181 |   await page.getByLabel("Attach file", { exact: true }).setInputFiles({
  182 |     name: "brief.pdf",
  183 |     mimeType: "application/pdf",
  184 |     buffer: Buffer.from("%PDF-fixture"),
  185 |   });
  186 | }
  187 | test("overlay clicks respect context gestures and dismiss only the top email review", async ({
  188 |   page,
  189 | }) => {
  190 |   const state = await setup(page);
  191 |   await compose(page);
  192 |   await page.getByRole("button", { name: "Review email", exact: true }).click();
  193 |   const review = page.getByRole("dialog", { name: "Send email", exact: true });
  194 |   await expect(review).toBeVisible();
  195 |   await page.mouse.click(4, 4, { button: "right" });
  196 |   await expect(review).toBeVisible();
  197 |   await page.keyboard.down("Control");
  198 |   await page.mouse.click(4, 4);
  199 |   await page.keyboard.up("Control");
  200 |   await expect(review).toBeVisible();
  201 |   await page.mouse.click(4, 4);
  202 |   await expect(review).toHaveCount(0);
  203 |   await expect(
  204 |     page.getByRole("dialog", { name: "New email", exact: true }),
  205 |   ).toBeVisible();
  206 |   await expect(page.getByLabel("Message", { exact: true })).toHaveValue(
  207 |     "Draft retained for explicit review.",
  208 |   );
  209 |   await expect(
  210 |     page.getByRole("button", { name: "Review email", exact: true }),
> 211 |   ).toBeFocused();
      |     ^ Error: expect(locator).toBeFocused() failed
  212 |   expect(state.sent).toHaveLength(0);
  213 | });
  214 | test("invalidated successful idle identity refuses mail dispatch and retains draft", async ({
  215 |   page,
  216 | }) => {
  217 |   const state = await setup(page);
  218 |   await compose(page);
  219 |   await page.getByRole("button", { name: "Review email", exact: true }).click();
  220 |   expect(await page.evaluate(() => window.__mailInvalidate?.())).toEqual({
  221 |     status: "success",
  222 |     fetchStatus: "idle",
  223 |     isInvalidated: true,
  224 |   });
  225 |   await page.getByRole("button", { name: "Send email", exact: true }).click();
  226 |   await expect(
  227 |     page.getByText(/mailbox session changed or is unverified/).last(),
  228 |   ).toBeVisible({ timeout: 2000 });
  229 |   expect(state.sent).toHaveLength(0);
  230 |   await page.keyboard.press("Escape");
  231 |   await expect(page.getByLabel("Message", { exact: true })).toHaveValue(
  232 |     "Draft retained for explicit review.",
  233 |   );
  234 | });
  235 | test("invalidated successful idle identity refuses upload prepare dispatch", async ({
  236 |   page,
  237 | }) => {
  238 |   const state = await setup(page);
  239 |   await compose(page);
  240 |   expect(await page.evaluate(() => window.__mailInvalidate?.())).toEqual({
  241 |     status: "success",
  242 |     fetchStatus: "idle",
  243 |     isInvalidated: true,
  244 |   });
  245 |   await attach(page);
  246 |   await expect(
  247 |     page.getByText(/mailbox session changed or is unverified/).last(),
  248 |   ).toBeVisible({ timeout: 2000 });
  249 |   expect(state.counts()).toMatchObject({
  250 |     prepares: 0,
  251 |     uploads: 0,
  252 |     confirms: 0,
  253 |   });
  254 |   expect(state.sent).toHaveLength(0);
  255 | });
  256 | test("contact picker and CC/BCC survive explicit review and send exact receipt", async ({
  257 |   page,
  258 | }) => {
  259 |   const state = await setup(page);
  260 |   await compose(page);
  261 |   await page
  262 |     .getByRole("button", { name: "+ Add recipient", exact: true })
  263 |     .click();
  264 |   await page.getByLabel("Search client contacts").fill("morgan");
  265 |   await page
  266 |     .getByRole("button", { name: "Morgan Test · morgan@example.test" })
  267 |     .click();
  268 |   await expect(
  269 |     page.getByRole("button", { name: "Remove recipient morgan@example.test" }),
  270 |   ).toBeVisible();
  271 |   await page.getByRole("button", { name: "Cc", exact: true }).click();
  272 |   await page.getByLabel("Cc", { exact: true }).fill("copied@example.test");
  273 |   await page.getByRole("button", { name: "Bcc", exact: true }).click();
  274 |   await page.getByLabel("Bcc", { exact: true }).fill("blind@example.test");
  275 |   await page.screenshot({
  276 |     path: process.env.PORTFOLIO_EMAIL_SCREENSHOT_DIR
  277 |       ? `${process.env.PORTFOLIO_EMAIL_SCREENSHOT_DIR}/email-picker-desktop-light.png`
  278 |       : "test-results/email-picker-desktop-light.png",
  279 |   });
  280 |   await page.getByRole("button", { name: "Review email", exact: true }).click();
  281 |   await expect(
  282 |     page.getByText("Bcc: blind@example.test", { exact: true }),
  283 |   ).toBeVisible();
  284 |   await page.getByRole("button", { name: "Send email", exact: true }).click();
  285 |   await expect(page.getByText("Email sent.", { exact: true })).toBeVisible();
  286 |   expect(state.sent).toHaveLength(1);
  287 |   expect(state.sent[0]).toMatchObject({
  288 |     clientId,
  289 |     personIds: [id, other],
  290 |     to: [
  291 |       { email: "taylor@example.test", name: "Taylor Test" },
  292 |       { email: "morgan@example.test", name: "Morgan Test" },
  293 |     ],
  294 |     cc: [{ email: "copied@example.test" }],
  295 |     bcc: [{ email: "blind@example.test" }],
  296 |   });
  297 | });
  298 | test("invalid/duplicate copied recipient retains draft and never sends", async ({
  299 |   page,
  300 | }) => {
  301 |   const state = await setup(page);
  302 |   await compose(page);
  303 |   await page.getByRole("button", { name: "Cc", exact: true }).click();
  304 |   await page.getByLabel("Cc", { exact: true }).fill("TAYLOR@example.test");
  305 |   await page.getByRole("button", { name: "Review email", exact: true }).click();
  306 |   await expect(page.getByText(/only once across/)).toBeVisible();
  307 |   await expect(page.getByLabel("Message", { exact: true })).toHaveValue(
  308 |     "Draft retained for explicit review.",
  309 |   );
  310 |   expect(state.sent).toHaveLength(0);
  311 | });
```