# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: meeting-review.spec.ts >> disabled generation capability and portal role send no source generation
- Location: tests/browser/meeting-review.spec.ts:398:1

# Error details

```
Error: expect(locator).toBeDisabled() failed

Locator: getByRole('button', { name: 'Use saved meeting notes', exact: true })
Expected: disabled
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeDisabled" with timeout 5000ms
  - waiting for getByRole('button', { name: 'Use saved meeting notes', exact: true })

```

```yaml
- main:
  - heading "Synthetic saved-note meeting" [level=1]
  - region "Meeting attachment approvals":
    - heading "Meeting attachments" [level=3]
    - paragraph: Approval records your review of a file. It does not perform a security scan, extract text or share the file.
    - status: A current authorized meeting session is required. Reopen this meeting after verifying access.
    - button "Refresh attachment status" [disabled]
  - heading "Debriefs" [level=3]
  - button "Add debrief" [disabled]
  - paragraph: No debriefs yet.
```

# Test source

```ts
  318 |     dialog.getByRole("region", { name: "Selected saved note" }),
  319 |   ).toContainText("Changed after review");
  320 |   await dialog
  321 |     .getByRole("button", { name: "Generate Debrief", exact: true })
  322 |     .click();
  323 |   await expect(
  324 |     page.getByRole("dialog", { name: "Review generated debrief" }),
  325 |   ).toBeVisible();
  326 |   expect(state.generations).toEqual([
  327 |     { method: "manual", sourceText: "Changed after review" },
  328 |   ]);
  329 |   expect(state.saves).toBe(0);
  330 |   expect(unexpected).toEqual([]);
  331 | });
  332 | test("wrong-parent notes are rejected before rendering source or POST", async ({
  333 |   page,
  334 | }) => {
  335 |   const { state } = await setup(page);
  336 |   state.notes = [{ ...note, meetingId: "foreign" }];
  337 |   const dialog = await openSource(page);
  338 |   await expect(dialog.getByRole("alert")).toContainText("unexpected response");
  339 |   await expect(
  340 |     dialog.getByRole("region", { name: "Selected saved note" }),
  341 |   ).toHaveCount(0);
  342 |   expect(state.generations).toEqual([]);
  343 |   expect(state.saves).toBe(0);
  344 | });
  345 | test("generation failure keeps source in the existing explicit retry flow without saving", async ({
  346 |   page,
  347 | }) => {
  348 |   const { state, unexpected } = await setup(page);
  349 |   state.generationStatus = 503;
  350 |   const dialog = await chooseSource(page);
  351 |   await dialog
  352 |     .getByRole("button", { name: "Generate Debrief", exact: true })
  353 |     .click();
  354 |   const progress = page.getByRole("dialog", {
  355 |     name: "Generate meeting debrief",
  356 |     exact: true,
  357 |   });
  358 |   await expect(progress.getByRole("alert")).toContainText(
  359 |     "Generation unavailable",
  360 |   );
  361 |   await expect(
  362 |     progress.getByRole("button", {
  363 |       name: "Generate again from this source",
  364 |       exact: true,
  365 |     }),
  366 |   ).toBeVisible();
  367 |   expect(state.generations).toHaveLength(1);
  368 |   expect(state.saves).toBe(0);
  369 |   expect(unexpected).toEqual([]);
  370 | });
  371 | for (const name of [
  372 |   "review-actor-change",
  373 |   "review-identity-invalidate",
  374 |   "review-unmount",
  375 | ]) {
  376 |   test(`held source preflight refuses ${name} before generation`, async ({
  377 |     page,
  378 |   }) => {
  379 |     const { state } = await setup(page);
  380 |     const dialog = await chooseSource(page);
  381 |     const hold = held();
  382 |     state.noteHold = hold.promise;
  383 |     const prior = state.noteReads;
  384 |     await dialog
  385 |       .getByRole("button", { name: "Generate Debrief", exact: true })
  386 |       .click();
  387 |     await expect.poll(() => state.noteReads).toBe(prior + 1);
  388 |     await event(page, name);
  389 |     hold.release();
  390 |     await expect.poll(() => state.noteCompleted).toBe(prior + 1);
  391 |     await expect(
  392 |       page.getByRole("dialog", { name: "Review generated debrief" }),
  393 |     ).toHaveCount(0);
  394 |     expect(state.generations).toEqual([]);
  395 |     expect(state.saves).toBe(0);
  396 |   });
  397 | }
  398 | test("disabled generation capability and portal role send no source generation", async ({
  399 |   page,
  400 | }) => {
  401 |   const { state } = await setup(page, { enabled: false });
  402 |   await page.goto("/__test/meeting-review");
  403 |   await expect(
  404 |     page.getByRole("button", { name: "Use saved meeting notes", exact: true }),
  405 |   ).toBeDisabled();
  406 |   expect(state.noteReads).toBe(0);
  407 |   expect(state.generations).toEqual([]);
  408 |   await page.route("**/core/me", (route) =>
  409 |     json(route, {
  410 |       user: { id: "user-test", email: null },
  411 |       tenant: { id: "tenant-test", name: "Synthetic" },
  412 |       role: "client_portal_user",
  413 |     }),
  414 |   );
  415 |   await page.reload();
  416 |   await expect(
  417 |     page.getByRole("button", { name: "Use saved meeting notes", exact: true }),
> 418 |   ).toBeDisabled();
      |     ^ Error: expect(locator).toBeDisabled() failed
  419 |   await expect(
  420 |     page.getByRole("dialog", { name: "Use saved meeting notes", exact: true }),
  421 |   ).toHaveCount(0);
  422 |   expect(state.generations).toEqual([]);
  423 | });
  424 | test("approval requires explicit reviewed file acknowledgement and records no scan, extraction or share", async ({
  425 |   page,
  426 | }, info) => {
  427 |   const { state, unexpected } = await setup(page);
  428 |   await page.goto("/__test/meeting-review");
  429 |   const region = page.getByRole("region", {
  430 |     name: "Meeting attachment approvals",
  431 |   });
  432 |   await expect(
  433 |     region.getByRole("button", { name: "Approve attachment", exact: true }),
  434 |   ).toBeDisabled();
  435 |   await expect(region).toContainText(
  436 |     "does not perform a security scan, extract text or share",
  437 |   );
  438 |   await expect(
  439 |     region.getByRole("link", {
  440 |       name: `Review ${attachment.fileName}`,
  441 |       exact: true,
  442 |     }),
  443 |   ).toHaveAttribute("href", attachment.downloadUrl!);
  444 |   await approve(page);
  445 |   await expect(region.getByText(/^Approved ·/)).toBeVisible();
  446 |   await expect(
  447 |     region.getByRole("button", { name: "Approve attachment", exact: true }),
  448 |   ).toHaveCount(0);
  449 |   await page.screenshot({
  450 |     path: info.outputPath("attachment-approval-desktop.png"),
  451 |   });
  452 |   expect(state.approvals).toBe(1);
  453 |   expect(state.generations).toEqual([]);
  454 |   expect(state.saves).toBe(0);
  455 |   expect(unexpected).toEqual([]);
  456 | });
  457 | test("unusable or nonviewer attachment never exposes approval", async ({
  458 |   page,
  459 | }) => {
  460 |   const { state } = await setup(page);
  461 |   state.files = [
  462 |     {
  463 |       ...attachment,
  464 |       usable: false,
  465 |       lifecycleStatus: "quarantined",
  466 |       scanStatus: "pending",
  467 |       blockedReason: "scan_pending",
  468 |     },
  469 |   ];
  470 |   await page.goto("/__test/meeting-review");
  471 |   const region = page.getByRole("region", {
  472 |     name: "Meeting attachment approvals",
  473 |   });
  474 |   await expect(region).toContainText(
  475 |     "File unavailable for review: scan_pending",
  476 |   );
  477 |   await expect(
  478 |     region.getByRole("button", { name: "Approve attachment", exact: true }),
  479 |   ).toHaveCount(0);
  480 |   state.files = [
  481 |     {
  482 |       ...attachment,
  483 |       viewerMode: "restricted",
  484 |       viewerUserIds: [],
  485 |       uploadedByUserId: "other",
  486 |     },
  487 |   ];
  488 |   await region
  489 |     .getByRole("button", { name: "Refresh attachment status", exact: true })
  490 |     .click();
  491 |   await expect(region.getByRole("alert")).toContainText("unexpected response");
  492 |   expect(state.approvals).toBe(0);
  493 | });
  494 | test("changed file preflight rejects old acknowledgement, requiring review of current file", async ({
  495 |   page,
  496 | }) => {
  497 |   const { state } = await setup(page);
  498 |   await page.goto("/__test/meeting-review");
  499 |   const region = page.getByRole("region", {
  500 |     name: "Meeting attachment approvals",
  501 |   });
  502 |   await region.getByRole("checkbox").check();
  503 |   state.files = [{ ...attachment, s3Key: "synthetic/replacement.pdf" }];
  504 |   await region
  505 |     .getByRole("button", { name: "Approve attachment", exact: true })
  506 |     .click();
  507 |   await expect(region.getByRole("alert")).toContainText("attachment changed");
  508 |   expect(state.approvals).toBe(0);
  509 |   await region
  510 |     .getByRole("button", { name: "Refresh attachment status", exact: true })
  511 |     .click();
  512 |   await expect(region.getByRole("checkbox")).not.toBeChecked();
  513 |   await expect(
  514 |     region.getByRole("button", { name: "Approve attachment", exact: true }),
  515 |   ).toBeDisabled();
  516 | });
  517 | test("lost approval reply freezes repeat; unapproved read cannot resolve but actual approved status can", async ({
  518 |   page,
```