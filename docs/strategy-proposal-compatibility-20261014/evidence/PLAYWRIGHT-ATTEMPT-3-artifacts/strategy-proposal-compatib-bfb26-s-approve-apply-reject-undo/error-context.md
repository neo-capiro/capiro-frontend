# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: strategy-proposal-compatibility.spec.ts >> rejected review preserves audit but denies approve/apply/reject/undo
- Location: test/browser/strategy-proposal-compatibility.spec.ts:431:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:5197/__test/strategy-proposal-refresh?status=rejected
Call log:
  - navigating to "http://127.0.0.1:5197/__test/strategy-proposal-refresh?status=rejected", waiting until "load"

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
  370 |     await page.goto("/__test/strategy-proposal-refresh");
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
> 435 |     await page.goto(`/__test/strategy-proposal-refresh?status=${status}`);
      |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:5197/__test/strategy-proposal-refresh?status=rejected
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