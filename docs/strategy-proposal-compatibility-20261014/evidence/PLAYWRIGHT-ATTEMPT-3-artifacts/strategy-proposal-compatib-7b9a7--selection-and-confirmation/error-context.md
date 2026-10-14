# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: strategy-proposal-compatibility.spec.ts >> same-ID content refresh invalidates selection and confirmation
- Location: test/browser/strategy-proposal-compatibility.spec.ts:366:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:5197/__test/strategy-proposal-refresh
Call log:
  - navigating to "http://127.0.0.1:5197/__test/strategy-proposal-refresh", waiting until "load"

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e6]:
    - heading "This site can’t be reached" [level=1] [ref=e7]
    - paragraph [ref=e8]:
      - strong [ref=e9]: 127.0.0.1
      - text: refused to connect.
    - generic [ref=e10]:
      - paragraph [ref=e11]: "Try:"
      - list [ref=e12]:
        - listitem [ref=e13]: Checking the connection
        - listitem [ref=e14]:
          - link "Checking the proxy and the firewall" [ref=e15] [cursor=pointer]:
            - /url: "#buttons"
    - generic [ref=e16]: ERR_CONNECTION_REFUSED
  - generic [ref=e17]:
    - button "Reload" [ref=e19] [cursor=pointer]
    - button "Details" [ref=e20] [cursor=pointer]
```

# Test source

```ts
  270 |   await expect(button(modal, "Reject change set")).toBeEnabled();
  271 |   const audit = modal.locator("section").filter({
  272 |     has: modal.getByRole("heading", {
  273 |       name: "Stored application selection details",
  274 |       exact: true,
  275 |     }),
  276 |   });
  277 |   await expect(audit).toBeVisible();
  278 |   await audit.locator("summary").filter({ hasText: "Operation 1" }).click();
  279 |   await expect(audit.locator("pre").first()).toHaveText(
  280 |     JSON.stringify(opaque, null, 2),
  281 |   );
  282 |   await expect(audit.locator("pre").first()).toBeVisible();
  283 |   const original = modal.locator("section").filter({
  284 |     has: modal.getByRole("heading", {
  285 |       name: "Original change details",
  286 |       exact: true,
  287 |     }),
  288 |   });
  289 |   await expect(original).toContainText("Opaque audit entry");
  290 |   await expect(original).toContainText("Synthetic removable change");
  291 |   await button(modal, "Apply 1 changes").click();
  292 |   await button(page, "Confirm decision").click();
  293 |   await expect(modal).toHaveCount(0);
  294 |   expect(state.writes).toEqual([
  295 |     { key: "apply", input: { params: { id }, body: { opIndexes: [1] } } },
  296 |   ]);
  297 |   expectIsolated(state);
  298 | });
  299 | 
  300 | test("stale409 stays visible with both dialogs and never retries the mutation", async ({
  301 |   page,
  302 | }) => {
  303 |   const state = await fixture(page);
  304 |   await page.route("**/api/capiro/strategies.proposal.apply", (route) => {
  305 |     state.writes.push({ key: "apply", input: route.request().postDataJSON() });
  306 |     return route.fulfill({
  307 |       status: 409,
  308 |       json: { message: "Synthetic pinned plan changed. Reload the proposal." },
  309 |     });
  310 |   });
  311 |   await openFirstReview(page);
  312 |   await button(review(page), "Apply 2 changes").click();
  313 |   await button(page, "Confirm decision").click();
  314 |   await expect(page.getByRole("alert")).toContainText(
  315 |     "Synthetic pinned plan changed. Reload the proposal.",
  316 |   );
  317 |   await expect(review(page)).toBeVisible();
  318 |   await expect(
  319 |     page.getByRole("dialog", { name: "Apply selected changes?", exact: true }),
  320 |   ).toBeVisible();
  321 |   expect(state.writes).toHaveLength(1);
  322 |   await button(page, "Back to review").click();
  323 |   await expect(review(page)).toBeVisible();
  324 |   expect(state.writes).toHaveLength(1);
  325 |   expectIsolated(state);
  326 | });
  327 | 
  328 | test("synchronous duplicate confirmation sends one pending request", async ({
  329 |   page,
  330 | }) => {
  331 |   const state = await fixture(page);
  332 |   let held: Route | undefined;
  333 |   await page.route("**/api/capiro/strategies.proposal.apply", (route) => {
  334 |     state.writes.push({ key: "apply", input: route.request().postDataJSON() });
  335 |     held = route;
  336 |   });
  337 |   await page.goto("/__test/strategy-proposal-refresh");
  338 |   await button(review(page), "Apply 2 changes").click();
  339 |   await button(page, "Confirm decision").evaluate(
  340 |     (button: HTMLButtonElement) => {
  341 |       button.click();
  342 |       button.click();
  343 |     },
  344 |   );
  345 |   await expect.poll(() => Boolean(held)).toBe(true);
  346 |   await expect(button(page, "Saving…")).toBeDisabled();
  347 |   expect(state.writes).toHaveLength(1);
  348 |   await held!.fulfill({ json: detail });
  349 |   await expect(page.getByTestId("proposal-saved")).toHaveText(
  350 |     "Saved callbacks: 1",
  351 |   );
  352 |   await expect(page.getByTestId("proposal-closed")).toHaveText(
  353 |     "Closed callbacks: 1",
  354 |   );
  355 |   expect(state.writes).toHaveLength(1);
  356 |   expectIsolated(state);
  357 | });
  358 | 
  359 | for (const kind of [
  360 |   "content",
  361 |   "status",
  362 |   "pin",
  363 |   "approved-empty",
  364 |   "unavailable",
  365 | ]) {
  366 |   test(`same-ID ${kind} refresh invalidates selection and confirmation`, async ({
  367 |     page,
  368 |   }) => {
  369 |     const state = await fixture(page);
> 370 |     await page.goto("/__test/strategy-proposal-refresh");
      |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:5197/__test/strategy-proposal-refresh
  371 |     await review(page).getByRole("checkbox").nth(1).uncheck();
  372 |     await button(review(page), "Approve selected").click();
  373 |     await expect(button(page, "Confirm decision")).toBeVisible();
  374 |     await refresh(page, kind);
  375 |     await expect(button(page, "Confirm decision")).toHaveCount(0);
  376 |     await expect(review(page)).toContainText(
  377 |       "The stored proposal changed. Review the current operations before confirming.",
  378 |     );
  379 |     for (const checkbox of await review(page).getByRole("checkbox").all())
  380 |       await expect(checkbox).not.toBeChecked();
  381 |     if (kind === "approved-empty")
  382 |       await expect(review(page).getByRole("checkbox")).toHaveCount(0);
  383 |     await expect(button(review(page), "Approve selected")).toBeDisabled();
  384 |     await expect(
  385 |       review(page).getByRole("button", { name: /^Apply / }),
  386 |     ).toBeDisabled();
  387 |     expect(state.writes).toEqual([]);
  388 |     expectIsolated(state);
  389 |   });
  390 | }
  391 | 
  392 | test("refresh during a pending request retires old completion callbacks and selection", async ({
  393 |   page,
  394 | }) => {
  395 |   const state = await fixture(page);
  396 |   let held: Route | undefined;
  397 |   let settled = false;
  398 |   page.on("requestfinished", (request) => {
  399 |     if (request.url().endsWith("strategies.proposal.apply")) settled = true;
  400 |   });
  401 |   page.on("requestfailed", (request) => {
  402 |     if (request.url().endsWith("strategies.proposal.apply")) settled = true;
  403 |   });
  404 |   await page.route("**/api/capiro/strategies.proposal.apply", (route) => {
  405 |     state.writes.push({ key: "apply", input: route.request().postDataJSON() });
  406 |     held = route;
  407 |   });
  408 |   await page.goto("/__test/strategy-proposal-refresh");
  409 |   await button(review(page), "Apply 2 changes").click();
  410 |   await button(page, "Confirm decision").click();
  411 |   await expect.poll(() => Boolean(held)).toBe(true);
  412 |   await refresh(page, "content");
  413 |   await expect(button(page, "Confirm decision")).toHaveCount(0);
  414 |   await expect(review(page)).toContainText("Replacement recognized step");
  415 |   await held!.fulfill({ json: detail }).catch(() => {});
  416 |   await expect.poll(() => settled).toBe(true);
  417 |   await expect(page.getByTestId("proposal-saved")).toHaveText(
  418 |     "Saved callbacks: 0",
  419 |   );
  420 |   await expect(page.getByTestId("proposal-closed")).toHaveText(
  421 |     "Closed callbacks: 0",
  422 |   );
  423 |   await expect(review(page)).toBeVisible();
  424 |   for (const checkbox of await review(page).getByRole("checkbox").all())
  425 |     await expect(checkbox).not.toBeChecked();
  426 |   expect(state.writes).toHaveLength(1);
  427 |   expectIsolated(state);
  428 | });
  429 | 
  430 | for (const status of ["rejected", "undone", "stale", "superseded"]) {
  431 |   test(`${status} review preserves audit but denies approve/apply/reject/undo`, async ({
  432 |     page,
  433 |   }) => {
  434 |     const state = await fixture(page);
  435 |     await page.goto(`/__test/strategy-proposal-refresh?status=${status}`);
  436 |     await expect(review(page)).toContainText("Original stored details");
  437 |     for (const name of ["Approve selected", "Reject change set"])
  438 |       await expect(
  439 |         review(page).getByRole("button", { name, exact: true }),
  440 |       ).toBeDisabled();
  441 |     await expect(
  442 |       review(page).getByRole("button", { name: /^Apply / }),
  443 |     ).toBeDisabled();
  444 |     await expect(button(review(page), "Undo applied changes")).toHaveCount(0);
  445 |     expect(state.writes).toEqual([]);
  446 |     expectIsolated(state);
  447 |   });
  448 | }
  449 | 
```