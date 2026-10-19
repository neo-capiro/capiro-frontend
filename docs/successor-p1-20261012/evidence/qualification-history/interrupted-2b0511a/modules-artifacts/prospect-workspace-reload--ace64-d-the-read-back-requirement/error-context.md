# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: prospect-workspace.spec.ts >> reload preserves uncertain manual edits and the read-back requirement
- Location: test/browser/prospect-workspace.spec.ts:331:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator:  getByText(/previous save is not confirmed/)
Expected: visible
Received: undefined

```

# Test source

```ts
  241 |   let saving = false,
  242 |     started = false;
  243 |   let release!: () => void;
  244 |   const held = new Promise<void>((resolve) => {
  245 |     release = resolve;
  246 |   });
  247 |   await page.route("**/api/capiro/workspace.draft?*", async (route) => {
  248 |     if (saving && !started) {
  249 |       started = true;
  250 |       await held;
  251 |     }
  252 |     await route.fulfill({ json: draft }).catch(() => {});
  253 |   });
  254 |   await page.goto(detail);
  255 |   await page.getByLabel("Body content").fill("Interrupted manual text");
  256 |   saving = true;
  257 |   await page.getByRole("button", { name: "Save draft", exact: true }).click();
  258 |   await expect.poll(() => started).toBe(true);
  259 |   await page.getByRole("button", { name: "← Workspace", exact: true }).click();
  260 |   await expect(
  261 |     page.getByRole("heading", { name: "Prospect Workspace", exact: true }),
  262 |   ).toBeVisible();
  263 |   release();
  264 |   await page.goBack();
  265 |   await expect(page.getByLabel("Body content")).toHaveValue(
  266 |     "Interrupted manual text",
  267 |   );
  268 |   await expect(
  269 |     page.getByRole("button", { name: "Save draft", exact: true }),
  270 |   ).toBeDisabled();
  271 |   expect(writes).toEqual([]);
  272 | });
  273 | 
  274 | test("expired creation sends one original request and clears the authenticated editor", async ({
  275 |   page,
  276 | }) => {
  277 |   const { writes } = await setup(page);
  278 |   await page.route("**/api/capiro/workspace.prospect.create", (route) =>
  279 |     route.fulfill({ status: 401, json: { message: "Expired" } }),
  280 |   );
  281 |   await page.goto(base);
  282 |   await page
  283 |     .getByLabel("New prospect document title")
  284 |     .fill("Private unsaved text");
  285 |   await page.getByRole("button", { name: "Create manual draft" }).click();
  286 |   await expect(
  287 |     page.getByRole("heading", { name: "Your session expired" }),
  288 |   ).toBeVisible();
  289 |   await expect(page.getByLabel("New prospect document title")).toHaveCount(0);
  290 |   await expect(
  291 |     page.getByRole("button", { name: "Recover original draft" }),
  292 |   ).toHaveCount(0);
  293 |   expect(writes).toHaveLength(1);
  294 | });
  295 | 
  296 | test("reload preserves the original prospect creation seed and request key", async ({
  297 |   page,
  298 | }) => {
  299 |   const { writes, errors } = await setup(page);
  300 |   let attempts = 0;
  301 |   await page.route("**/api/capiro/workspace.prospect.create", (route) =>
  302 |     ++attempts === 1
  303 |       ? route.abort("connectionreset")
  304 |       : route.fulfill({ json: draft }),
  305 |   );
  306 |   await page.goto(base);
  307 |   await page.getByLabel("New prospect document title").fill(draft.docTitle);
  308 |   await page.getByRole("button", { name: "Create manual draft" }).click();
  309 |   await expect(
  310 |     page.getByRole("button", { name: "Recover original draft" }),
  311 |   ).toBeEnabled();
  312 |   await page.reload();
  313 |   await expect(
  314 |     page.getByRole("button", { name: "Recover original draft" }),
  315 |   ).toBeEnabled();
  316 |   await page.getByRole("button", { name: "Recover original draft" }).click();
  317 |   await expect(page.getByLabel("Document title", { exact: true })).toHaveValue(
  318 |     draft.docTitle,
  319 |   );
  320 |   expect(writes).toHaveLength(2);
  321 |   expect(writes[0]!.body).toEqual(writes[1]!.body);
  322 |   expect(writes[0]!.body).toEqual({
  323 |     body: {
  324 |       prospectId,
  325 |       docTitle: draft.docTitle,
  326 |       requestId: expect.stringMatching(/^[a-f0-9-]{36}$/),
  327 |     },
  328 |   });
  329 |   expect(errors).toEqual([]);
  330 | });
  331 | test("reload preserves uncertain manual edits and the read-back requirement", async ({
  332 |   page,
  333 | }) => {
  334 |   const { writes } = await setup(page);
  335 |   await page.route("**/api/capiro/workspace.draft.update", (route) =>
  336 |     route.abort("connectionreset"),
  337 |   );
  338 |   await page.goto(detail);
  339 |   await page.getByLabel("Body content").fill("Keep this draft");
  340 |   await page.getByRole("button", { name: "Save draft", exact: true }).click();
> 341 |   await expect(page.getByText(/previous save is not confirmed/)).toBeVisible();
      |                                                                  ^ Error: expect(locator).toBeVisible() failed
  342 |   await expect(
  343 |     page.getByRole("button", { name: "Save draft", exact: true }),
  344 |   ).toBeDisabled();
  345 |   await page.reload();
  346 |   await expect(page.getByLabel("Body content")).toHaveValue("Keep this draft");
  347 |   await expect(
  348 |     page.getByRole("button", { name: "Save draft", exact: true }),
  349 |   ).toBeDisabled();
  350 |   expect(writes).toHaveLength(1);
  351 |   await page.getByRole("button", { name: "Read current document" }).click();
  352 |   await expect(
  353 |     page.getByRole("button", { name: "Save draft", exact: true }),
  354 |   ).toBeEnabled();
  355 |   expect(writes).toHaveLength(1);
  356 | });
  357 | 
  358 | for (const kind of ["creation", "manual-save"] as const) {
  359 |   test(`replacement Core actor cannot restore the former ${kind} input after reload`, async ({
  360 |     page,
  361 |   }) => {
  362 |     const { writes } = await setup(page);
  363 |     await page.route("**/api/capiro/workspace.prospect.create", (route) =>
  364 |       route.abort("connectionreset"),
  365 |     );
  366 |     await page.route("**/api/capiro/workspace.draft.update", (route) =>
  367 |       route.abort("connectionreset"),
  368 |     );
  369 |     await page.goto(kind === "creation" ? base : detail);
  370 |     if (kind === "creation") {
  371 |       await page
  372 |         .getByLabel("New prospect document title")
  373 |         .fill("Former actor private seed");
  374 |       await page
  375 |         .getByRole("button", { name: "Create manual draft", exact: true })
  376 |         .click();
  377 |       await expect(
  378 |         page.getByRole("button", {
  379 |           name: "Recover original draft",
  380 |           exact: true,
  381 |         }),
  382 |       ).toBeEnabled();
  383 |     } else {
  384 |       await page.getByLabel("Body content").fill("Former actor private edits");
  385 |       await page
  386 |         .getByRole("button", { name: "Save draft", exact: true })
  387 |         .click();
  388 |       await expect(
  389 |         page.getByText(/previous save is not confirmed/),
  390 |       ).toBeVisible();
  391 |       await expect.poll(() => writes.length).toBe(1);
  392 |     }
  393 |     await page.route("**/api/capiro/me.read?*", (route) =>
  394 |       route.fulfill({
  395 |         json: {
  396 |           ...testIdentity,
  397 |           user: {
  398 |             ...testIdentity.user,
  399 |             id: otherId,
  400 |             clerkUserId: "replacement-user",
  401 |           },
  402 |         },
  403 |       }),
  404 |     );
  405 |     await page.reload();
  406 |     if (kind === "creation") {
  407 |       await expect(page.getByLabel("New prospect document title")).toHaveValue(
  408 |         "",
  409 |       );
  410 |       await expect(
  411 |         page.getByRole("button", {
  412 |           name: "Recover original draft",
  413 |           exact: true,
  414 |         }),
  415 |       ).toHaveCount(0);
  416 |     } else {
  417 |       await expect(page.getByLabel("Body content")).toHaveValue("");
  418 |       await expect(
  419 |         page.getByText(/previous save is not confirmed/),
  420 |       ).toHaveCount(0);
  421 |     }
  422 |     expect(writes).toHaveLength(1);
  423 |   });
  424 | }
  425 | 
  426 | for (const kind of ["creation", "manual-save"] as const) {
  427 |   test(`unavailable browser journal blocks ${kind} without a backend write`, async ({
  428 |     page,
  429 |   }) => {
  430 |     const { writes } = await setup(page);
  431 |     await page.addInitScript(() =>
  432 |       Object.defineProperty(window, "indexedDB", {
  433 |         get() {
  434 |           throw new DOMException("Synthetic blocked storage", "SecurityError");
  435 |         },
  436 |       }),
  437 |     );
  438 |     await page.goto(kind === "creation" ? base : detail);
  439 |     await expect(
  440 |       page.getByRole("button", {
  441 |         name:
```