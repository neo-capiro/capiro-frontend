# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: meeting-library.spec.ts >> Transcript shares canonical upload, retries extraction without duplicate bytes and reviews truncation
- Location: tests/browser/meeting-library.spec.ts:308:1

# Error details

```
Error: expect(locator).not.toBeVisible() failed

Locator:  getByRole('dialog', { name: 'Review generated debrief', exact: true })
Expected: not visible
Received: visible
Timeout:  5000ms

Call log:
  - Expect "not toBeVisible" with timeout 5000ms
  - waiting for getByRole('dialog', { name: 'Review generated debrief', exact: true })
    14 × locator resolved to <div role="dialog" tabindex="-1" id="radix-_r_16_" data-state="open" aria-modal="true" data-slot="dialog-content" aria-labelledby="radix-_r_17_" aria-describedby="radix-_r_18_" class="bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg b…>…</div>
       - unexpected value "visible"

```

```yaml
- dialog "Review generated debrief":
  - banner
  - paragraph: Review generated debrief
  - text: Content
  - textbox "Content": Synthetic generated recap Notes Synthetic generated notes
  - checkbox "Confidential" [disabled]
  - text: Confidential Edits require approval again. Saving does not send email.
  - alert
  - button "Save debrief" [disabled]
```

# Test source

```ts
  364 |     json(route, {
  365 |       meetingPrepComprehensiveEnabled: false,
  366 |       runtime: { externalActionsEnabled: true },
  367 |     }),
  368 |   );
  369 |   await page.route("**/core/engagement/attachments/upload-url", (route) => {
  370 |     expect(route.request().postDataJSON()).toMatchObject({
  371 |       meetingId,
  372 |       clientId,
  373 |       fileName: "source.txt",
  374 |     });
  375 |     return json(route, {
  376 |       url: "https://storage.example.test/upload",
  377 |       fields: { key: "source-key" },
  378 |       s3Key: "source-key",
  379 |     });
  380 |   });
  381 |   await page.route("https://storage.example.test/upload", async (route) => {
  382 |     storage++;
  383 |     await route.fulfill({ status: 204 });
  384 |   });
  385 |   await page.route("**/core/engagement/attachments/confirm", (route) => {
  386 |     confirms++;
  387 |     return json(route, {
  388 |       ...file,
  389 |       meetingId,
  390 |       s3Key: "source-key",
  391 |       fileName: "source.txt",
  392 |       contentType: "text/plain",
  393 |     });
  394 |   });
  395 |   await page.route(
  396 |     `**/core/engagement/attachments/${file.id}/extract-text`,
  397 |     (route) => {
  398 |       extracts++;
  399 |       return extracts === 1
  400 |         ? json(route, { message: "Scan pending" }, 400)
  401 |         : json(route, {
  402 |             attachmentId: file.id,
  403 |             text: "Reviewed synthetic source",
  404 |             truncated: true,
  405 |             disclosure: "Not independently scanned",
  406 |           });
  407 |     },
  408 |   );
  409 |   await page.goto(
  410 |     `/calendar?view=agenda&date=2026-10-15&zone=UTC&meeting=${meetingId}`,
  411 |   );
  412 |   const meeting = page.getByRole("dialog", { name: initialMeeting.subject });
  413 |   await meeting.getByRole("button", { name: "Debriefs", exact: true }).click();
  414 |   await meeting
  415 |     .getByRole("button", { name: "Transcript and attachments", exact: true })
  416 |     .click();
  417 |   const dialog = page.getByRole("dialog", {
  418 |     name: "Transcript and attachments",
  419 |     exact: true,
  420 |   });
  421 |   await dialog.getByLabel("Meeting source file").setInputFiles({
  422 |     name: "source.txt",
  423 |     mimeType: "text/plain",
  424 |     buffer: Buffer.from("Source text"),
  425 |   });
  426 |   await dialog
  427 |     .getByRole("button", { name: "Upload and extract", exact: true })
  428 |     .click();
  429 |   await expect(dialog.getByRole("alert")).toContainText("Scan pending");
  430 |   await dialog
  431 |     .getByRole("button", { name: "Retry extraction", exact: true })
  432 |     .click();
  433 |   await expect(dialog.getByLabel("Extracted meeting source")).toHaveValue(
  434 |     "Reviewed synthetic source",
  435 |   );
  436 |   await expect(dialog.getByText(/Only part of this source/)).toBeVisible();
  437 |   await expect(dialog.getByText("Not independently scanned")).toBeVisible();
  438 |   expect({ storage, confirms, extracts }).toEqual({
  439 |     storage: 1,
  440 |     confirms: 1,
  441 |     extracts: 2,
  442 |   });
  443 |   expect(generations).toBe(0);
  444 |   await page.screenshot({
  445 |     path: "work/screens/meeting-transcript-review.png",
  446 |     fullPage: true,
  447 |   });
  448 |   await dialog
  449 |     .getByRole("button", { name: "Use extracted source", exact: true })
  450 |     .click();
  451 |   const editor = page.getByRole("dialog", {
  452 |     name: "Review generated debrief",
  453 |     exact: true,
  454 |   });
  455 |   await expect(editor).toBeVisible();
  456 |   await expect(editor.getByLabel("Content")).toHaveValue(
  457 |     /Synthetic generated recap/,
  458 |   );
  459 |   expect(generations).toBe(1);
  460 |   expect(saved).toBe(false);
  461 |   await editor
  462 |     .getByRole("button", { name: "Save debrief", exact: true })
  463 |     .click();
> 464 |   await expect(editor).not.toBeVisible();
      |                            ^ Error: expect(locator).not.toBeVisible() failed
  465 |   expect(saved).toBe(true);
  466 |   expect(unexpected).toEqual([]);
  467 | });
  468 | 
  469 | test("Lost storage reply retries same-key confirmation; wrong parent receipt cannot reach extraction", async ({
  470 |   page,
  471 | }) => {
  472 |   const { unexpected } = await setup(page);
  473 |   let storage = 0,
  474 |     confirms = 0,
  475 |     extracts = 0;
  476 |   await page.route("**/core/engagement/capabilities", (route) =>
  477 |     json(route, {
  478 |       meetingPrepComprehensiveEnabled: false,
  479 |       runtime: { externalActionsEnabled: true },
  480 |     }),
  481 |   );
  482 |   await page.route("**/core/engagement/attachments/upload-url", (route) =>
  483 |     json(route, {
  484 |       url: "https://storage.example.test/upload",
  485 |       fields: { key: "same-key" },
  486 |       s3Key: "same-key",
  487 |     }),
  488 |   );
  489 |   await page.route("https://storage.example.test/upload", async (route) => {
  490 |     storage++;
  491 |     await route.abort("failed");
  492 |   });
  493 |   await page.route("**/core/engagement/attachments/confirm", (route) => {
  494 |     confirms++;
  495 |     expect(route.request().postDataJSON().s3Key).toBe("same-key");
  496 |     return json(route, {
  497 |       ...file,
  498 |       meetingId: confirms === 1 ? otherClient.id : meetingId,
  499 |       s3Key: "same-key",
  500 |       fileName: "source.txt",
  501 |       contentType: "text/plain",
  502 |     });
  503 |   });
  504 |   await page.route(
  505 |     `**/core/engagement/attachments/${file.id}/extract-text`,
  506 |     (route) => {
  507 |       extracts++;
  508 |       return json(route, {
  509 |         attachmentId: file.id,
  510 |         text: "Recovered source",
  511 |         truncated: false,
  512 |       });
  513 |     },
  514 |   );
  515 |   await page.goto(
  516 |     `/calendar?view=agenda&date=2026-10-15&zone=UTC&meeting=${meetingId}`,
  517 |   );
  518 |   const meeting = page.getByRole("dialog", { name: initialMeeting.subject });
  519 |   await meeting.getByRole("button", { name: "Debriefs", exact: true }).click();
  520 |   await meeting
  521 |     .getByRole("button", { name: "Transcript and attachments", exact: true })
  522 |     .click();
  523 |   const dialog = page.getByRole("dialog", {
  524 |     name: "Transcript and attachments",
  525 |     exact: true,
  526 |   });
  527 |   await dialog.getByLabel("Meeting source file").setInputFiles({
  528 |     name: "source.txt",
  529 |     mimeType: "text/plain",
  530 |     buffer: Buffer.from("Source"),
  531 |   });
  532 |   await dialog
  533 |     .getByRole("button", { name: "Upload and extract", exact: true })
  534 |     .click();
  535 |   await expect(dialog.getByRole("alert")).toContainText(
  536 |     "completion is unknown",
  537 |   );
  538 |   await dialog
  539 |     .getByRole("button", { name: "Retry confirmation", exact: true })
  540 |     .click();
  541 |   await expect(dialog.getByRole("alert")).toContainText("unexpected response");
  542 |   expect(extracts).toBe(0);
  543 |   await dialog
  544 |     .getByRole("button", { name: "Retry confirmation", exact: true })
  545 |     .click();
  546 |   await expect(dialog.getByLabel("Extracted meeting source")).toHaveValue(
  547 |     "Recovered source",
  548 |   );
  549 |   expect({ storage, confirms, extracts }).toEqual({
  550 |     storage: 1,
  551 |     confirms: 2,
  552 |     extracts: 1,
  553 |   });
  554 |   expect(unexpected).toEqual([]);
  555 | });
  556 | 
  557 | function barrier() {
  558 |   let release!: () => void;
  559 |   const promise = new Promise<void>((resolve) => {
  560 |     release = resolve;
  561 |   });
  562 |   return { promise, release };
  563 | }
  564 | async function leaveMeeting(page: Page) {
```