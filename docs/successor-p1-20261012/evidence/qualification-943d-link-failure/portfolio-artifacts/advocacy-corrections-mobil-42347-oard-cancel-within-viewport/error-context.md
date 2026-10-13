# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: advocacy-corrections.spec.ts >> mobile dark correction keeps draft, readable review and keyboard cancel within viewport
- Location: tests/browser/advocacy-corrections.spec.ts:481:1

# Error details

```
Error: expect(locator).not.toBeVisible() failed

Locator:  getByRole('dialog', { name: 'Detach record', exact: true })
Expected: not visible
Received: visible

Call log:
  - Expect "not toBeVisible" with timeout 5000ms
  - waiting for getByRole('dialog', { name: 'Detach record', exact: true })

```

# Test source

```ts
  419 |   await expect(
  420 |     matter.getByRole("button", { name: "Merge another matter" }),
  421 |   ).toHaveCount(0);
  422 |   await expect(
  423 |     matter.getByRole("navigation", { name: `Correct ${recordTitle}` }),
  424 |   ).toHaveCount(0);
  425 |   await matter.getByRole("button", { name: "Close", exact: true }).click();
  426 |   await expect(
  427 |     page
  428 |       .getByRole("region", { name: "Advocacy history" })
  429 |       .getByRole("button", { name: "New matter" }),
  430 |   ).toBeDisabled();
  431 |   expect(state.posts).toHaveLength(0);
  432 |   expect(unexpected).toEqual([]);
  433 | });
  434 | 
  435 | test("unsafe or missing source does not become guessed source navigation", async ({
  436 |   page,
  437 | }) => {
  438 |   const { state, unexpected } = await installAdvocacy(page);
  439 |   state.sourceUrl = "javascript:alert(1)";
  440 |   const matter = await openMatter(page);
  441 |   await expect(matter).toContainText("Source link unavailable");
  442 |   await expect(matter.getByRole("link", { name: "View source" })).toHaveCount(
  443 |     0,
  444 |   );
  445 |   await expect(matter).toContainText("synthetic-source-id");
  446 |   expect(unexpected).toEqual([]);
  447 | });
  448 | 
  449 | for (const missing of ["user", "tenant"] as const) {
  450 |   test(`empty ${missing} identity fails closed before history writes`, async ({
  451 |     page,
  452 |   }) => {
  453 |     const { state, unexpected } = await installAdvocacy(page);
  454 |     await page.route("**/api/backend/core/me", (route) =>
  455 |       json(route, {
  456 |         user: {
  457 |           id: missing === "user" ? "  " : "user-test",
  458 |           email: "test@example.test",
  459 |         },
  460 |         tenant: {
  461 |           id: missing === "tenant" ? "  " : "tenant-test",
  462 |           name: "Synthetic tenant",
  463 |         },
  464 |         role: "user_admin",
  465 |       }),
  466 |     );
  467 |     await page.goto(route);
  468 |     const history = page.getByRole("region", { name: "Advocacy history" });
  469 |     await expect(history).toContainText(
  470 |       "This account cannot access advocacy history",
  471 |     );
  472 |     await expect(
  473 |       history.getByRole("button", { name: "New matter" }),
  474 |     ).toBeDisabled();
  475 |     expect(state.posts).toHaveLength(0);
  476 |     expect(state.gets).toHaveLength(0);
  477 |     expect(unexpected).toEqual([]);
  478 |   });
  479 | }
  480 | 
  481 | test("mobile dark correction keeps draft, readable review and keyboard cancel within viewport", async ({
  482 |   page,
  483 | }) => {
  484 |   const { state, unexpected } = await installAdvocacy(page);
  485 |   await page.setViewportSize({ width: 390, height: 844 });
  486 |   await page.emulateMedia({ colorScheme: "dark" });
  487 |   const dialog = await correct(page, "Not advocacy");
  488 |   await dialog.getByLabel("Reason (optional)").fill("Synthetic review reason");
  489 |   await page.evaluate(() => document.fonts.ready);
  490 |   expect(
  491 |     await dialog.evaluate(
  492 |       (element) => element.scrollWidth <= element.clientWidth,
  493 |     ),
  494 |   ).toBe(true);
  495 |   await page.screenshot({
  496 |     path: "work/advocacy-evidence/not-advocacy-mobile-dark.png",
  497 |     fullPage: false,
  498 |   });
  499 |   await dialog.getByRole("button", { name: "Cancel", exact: true }).focus();
  500 |   await page.keyboard.press("Enter");
  501 |   await expect(dialog).not.toBeVisible();
  502 |   expect(state.posts).toHaveLength(0);
  503 |   await page.setViewportSize({ width: 1440, height: 480 });
  504 |   const shortDialog = await correct(page, "Detach");
  505 |   const shortBounds = await shortDialog.boundingBox();
  506 |   if (!shortBounds)
  507 |     throw new Error("Short viewport correction geometry missing");
  508 |   expect(shortBounds.y).toBeGreaterThanOrEqual(16);
  509 |   expect(shortBounds.y + shortBounds.height).toBeLessThanOrEqual(464);
  510 |   expect(shortBounds.y + shortBounds.height / 2).toBeCloseTo(240, 0);
  511 |   await page.screenshot({
  512 |     path: "work/advocacy-evidence/detach-short-viewport-dark.png",
  513 |     fullPage: false,
  514 |   });
  515 |   await shortDialog
  516 |     .getByRole("button", { name: "Cancel", exact: true })
  517 |     .focus();
  518 |   await page.keyboard.press("Enter");
> 519 |   await expect(shortDialog).not.toBeVisible();
      |                                 ^ Error: expect(locator).not.toBeVisible() failed
  520 |   expect(state.posts).toHaveLength(0);
  521 |   expect(unexpected).toEqual([]);
  522 | });
  523 | 
```