# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: prospect-workspace.spec.ts >> reload preserves uncertain manual edits and the read-back requirement
- Location: test/browser/prospect-workspace.spec.ts:322:1

# Error details

```
Error: expect(locator).toHaveValue(expected) failed

Locator:  getByLabel('Body content')
Expected: "Keep this draft"
Received: ""
Timeout:  5000ms

Call log:
  - Expect "toHaveValue" with timeout 5000ms
  - waiting for getByLabel('Body content')
    14 × locator resolved to <textarea data-slot="textarea" aria-label="Body content" class="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:…></textarea>
       - unexpected value ""

```

```yaml
- textbox "Body content"
```

# Test source

```ts
  237 |   let release!: () => void;
  238 |   const held = new Promise<void>((resolve) => {
  239 |     release = resolve;
  240 |   });
  241 |   await page.route("**/api/capiro/workspace.draft?*", async (route) => {
  242 |     if (++reads === 2) {
  243 |       started = true;
  244 |       await held;
  245 |     }
  246 |     await route.fulfill({ json: draft }).catch(() => {});
  247 |   });
  248 |   await page.goto(detail);
  249 |   await page.getByLabel("Body content").fill("Interrupted manual text");
  250 |   await page.getByRole("button", { name: "Save draft", exact: true }).click();
  251 |   await expect.poll(() => started).toBe(true);
  252 |   await page.getByRole("button", { name: "← Workspace", exact: true }).click();
  253 |   await expect(
  254 |     page.getByRole("heading", { name: "Prospect Workspace", exact: true }),
  255 |   ).toBeVisible();
  256 |   release();
  257 |   await page.goBack();
  258 |   await expect(page.getByLabel("Body content")).toHaveValue(
  259 |     "Interrupted manual text",
  260 |   );
  261 |   await expect(
  262 |     page.getByRole("button", { name: "Save draft", exact: true }),
  263 |   ).toBeDisabled();
  264 |   expect(writes).toEqual([]);
  265 | });
  266 | 
  267 | test("expired creation sends one original request and clears the authenticated editor", async ({
  268 |   page,
  269 | }) => {
  270 |   const { writes } = await setup(page);
  271 |   await page.route("**/api/capiro/workspace.prospect.create", (route) =>
  272 |     route.fulfill({ status: 401, json: { message: "Expired" } }),
  273 |   );
  274 |   await page.goto(base);
  275 |   await page
  276 |     .getByLabel("New prospect document title")
  277 |     .fill("Private unsaved text");
  278 |   await page.getByRole("button", { name: "Create manual draft" }).click();
  279 |   await expect(
  280 |     page.getByRole("heading", { name: "Your session expired" }),
  281 |   ).toBeVisible();
  282 |   await expect(page.getByLabel("New prospect document title")).toHaveCount(0);
  283 |   await expect(
  284 |     page.getByRole("button", { name: "Recover original draft" }),
  285 |   ).toHaveCount(0);
  286 |   expect(writes).toHaveLength(1);
  287 | });
  288 | 
  289 | test("reload preserves the original prospect creation seed and request key", async ({
  290 |   page,
  291 | }) => {
  292 |   const { writes, errors } = await setup(page);
  293 |   let attempts = 0;
  294 |   await page.route("**/api/capiro/workspace.prospect.create", (route) =>
  295 |     ++attempts === 1
  296 |       ? route.abort("connectionreset")
  297 |       : route.fulfill({ json: draft }),
  298 |   );
  299 |   await page.goto(base);
  300 |   await page.getByLabel("New prospect document title").fill(draft.docTitle);
  301 |   await page.getByRole("button", { name: "Create manual draft" }).click();
  302 |   await expect(
  303 |     page.getByRole("button", { name: "Recover original draft" }),
  304 |   ).toBeEnabled();
  305 |   await page.reload();
  306 |   await expect(
  307 |     page.getByRole("button", { name: "Recover original draft" }),
  308 |   ).toBeEnabled();
  309 |   await page.getByRole("button", { name: "Recover original draft" }).click();
  310 |   await expect(page.getByLabel("Document title")).toHaveValue(draft.docTitle);
  311 |   expect(writes).toHaveLength(2);
  312 |   expect(writes[0]!.body).toEqual(writes[1]!.body);
  313 |   expect(writes[0]!.body).toEqual({
  314 |     body: {
  315 |       prospectId,
  316 |       docTitle: draft.docTitle,
  317 |       requestId: expect.stringMatching(/^[a-f0-9-]{36}$/),
  318 |     },
  319 |   });
  320 |   expect(errors).toEqual([]);
  321 | });
  322 | test("reload preserves uncertain manual edits and the read-back requirement", async ({
  323 |   page,
  324 | }) => {
  325 |   const { writes } = await setup(page);
  326 |   await page.route("**/api/capiro/workspace.draft.update", (route) =>
  327 |     route.abort("connectionreset"),
  328 |   );
  329 |   await page.goto(detail);
  330 |   await page.getByLabel("Body content").fill("Keep this draft");
  331 |   await page.getByRole("button", { name: "Save draft", exact: true }).click();
  332 |   await expect(page.getByText(/previous save is not confirmed/)).toBeVisible();
  333 |   await expect(
  334 |     page.getByRole("button", { name: "Save draft", exact: true }),
  335 |   ).toBeDisabled();
  336 |   await page.reload();
> 337 |   await expect(page.getByLabel("Body content")).toHaveValue("Keep this draft");
      |                                                 ^ Error: expect(locator).toHaveValue(expected) failed
  338 |   await expect(
  339 |     page.getByRole("button", { name: "Save draft", exact: true }),
  340 |   ).toBeDisabled();
  341 |   expect(writes).toHaveLength(1);
  342 |   await page.getByRole("button", { name: "Read current document" }).click();
  343 |   await expect(
  344 |     page.getByRole("button", { name: "Save draft", exact: true }),
  345 |   ).toBeEnabled();
  346 |   expect(writes).toHaveLength(1);
  347 | });
  348 | 
```