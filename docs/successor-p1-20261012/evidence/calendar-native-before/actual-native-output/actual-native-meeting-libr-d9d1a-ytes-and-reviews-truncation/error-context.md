# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: actual-native-meeting-library.spec.ts >> Transcript shares canonical upload, retries extraction without duplicate bytes and reviews truncation
- Location: ../../tmp/capiro-debrief-fixture-review/actual-native-meeting-library.spec.ts:308:5

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
    13 × locator resolved to <div role="dialog" tabindex="-1" id="radix-_r_1f_" data-state="open" aria-modal="true" data-slot="dialog-content" aria-labelledby="radix-_r_1g_" aria-describedby="radix-_r_1h_" class="bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg b…>…</div>
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
  375 |     json(route, {
  376 |       meetingPrepComprehensiveEnabled: false,
  377 |       runtime: { externalActionsEnabled: true },
  378 |     }),
  379 |   );
  380 |   await page.route("**/core/engagement/attachments/upload-url", (route) => {
  381 |     expect(route.request().postDataJSON()).toMatchObject({
  382 |       meetingId,
  383 |       clientId,
  384 |       fileName: "source.txt",
  385 |     });
  386 |     return json(route, {
  387 |       url: "https://storage.example.test/upload",
  388 |       fields: { key: "source-key" },
  389 |       s3Key: "source-key",
  390 |     });
  391 |   });
  392 |   await page.route("https://storage.example.test/upload", async (route) => {
  393 |     storage++;
  394 |     await route.fulfill({ status: 204 });
  395 |   });
  396 |   await page.route("**/core/engagement/attachments/confirm", (route) => {
  397 |     confirms++;
  398 |     return json(route, {
  399 |       ...file,
  400 |       meetingId,
  401 |       s3Key: "source-key",
  402 |       fileName: "source.txt",
  403 |       contentType: "text/plain",
  404 |     });
  405 |   });
  406 |   await page.route(
  407 |     `**/core/engagement/attachments/${file.id}/extract-text`,
  408 |     (route) => {
  409 |       extracts++;
  410 |       return extracts === 1
  411 |         ? json(route, { message: "Scan pending" }, 400)
  412 |         : json(route, {
  413 |             attachmentId: file.id,
  414 |             text: "Reviewed synthetic source",
  415 |             truncated: true,
  416 |             disclosure: "Not independently scanned",
  417 |           });
  418 |     },
  419 |   );
  420 |   await page.goto(
  421 |     `/calendar?view=agenda&date=2026-10-15&zone=UTC&meeting=${meetingId}`,
  422 |   );
  423 |   const meeting = page.getByRole("dialog", { name: initialMeeting.subject });
  424 |   await meeting.getByRole("button", { name: "Debriefs", exact: true }).click();
  425 |   await meeting
  426 |     .getByRole("button", { name: "Transcript and attachments", exact: true })
  427 |     .click();
  428 |   const dialog = page.getByRole("dialog", {
  429 |     name: "Transcript and attachments",
  430 |     exact: true,
  431 |   });
  432 |   await dialog.getByLabel("Meeting source file").setInputFiles({
  433 |     name: "source.txt",
  434 |     mimeType: "text/plain",
  435 |     buffer: Buffer.from("Source text"),
  436 |   });
  437 |   await dialog
  438 |     .getByRole("button", { name: "Upload and extract", exact: true })
  439 |     .click();
  440 |   await expect(dialog.getByRole("alert")).toContainText("Scan pending");
  441 |   await dialog
  442 |     .getByRole("button", { name: "Retry extraction", exact: true })
  443 |     .click();
  444 |   await expect(dialog.getByLabel("Extracted meeting source")).toHaveValue(
  445 |     "Reviewed synthetic source",
  446 |   );
  447 |   await expect(dialog.getByText(/Only part of this source/)).toBeVisible();
  448 |   await expect(dialog.getByText("Not independently scanned")).toBeVisible();
  449 |   expect({ storage, confirms, extracts }).toEqual({
  450 |     storage: 1,
  451 |     confirms: 1,
  452 |     extracts: 2,
  453 |   });
  454 |   expect(generations).toBe(0);
  455 |   await page.screenshot({
  456 |     path: "work/screens/meeting-transcript-review.png",
  457 |     fullPage: true,
  458 |   });
  459 |   await dialog
  460 |     .getByRole("button", { name: "Use extracted source", exact: true })
  461 |     .click();
  462 |   const editor = page.getByRole("dialog", {
  463 |     name: "Review generated debrief",
  464 |     exact: true,
  465 |   });
  466 |   await expect(editor).toBeVisible();
  467 |   await expect(editor.getByLabel("Content")).toHaveValue(
  468 |     /Synthetic generated recap/,
  469 |   );
  470 |   expect(generations).toBe(1);
  471 |   expect(saved).toBe(false);
  472 |   await editor
  473 |     .getByRole("button", { name: "Save debrief", exact: true })
  474 |     .click();
> 475 |   await expect(editor).not.toBeVisible();
      |                            ^ Error: expect(locator).not.toBeVisible() failed
  476 |   expect(saved).toBe(true);
  477 |   expect(unexpected).toEqual([]);
  478 | });
  479 | 
  480 | test("Lost storage reply retries same-key confirmation; wrong parent receipt cannot reach extraction", async ({
  481 |   page,
  482 | }) => {
  483 |   const { unexpected } = await setup(page);
  484 |   let storage = 0,
  485 |     confirms = 0,
  486 |     extracts = 0;
  487 |   await page.route("**/core/engagement/capabilities", (route) =>
  488 |     json(route, {
  489 |       meetingPrepComprehensiveEnabled: false,
  490 |       runtime: { externalActionsEnabled: true },
  491 |     }),
  492 |   );
  493 |   await page.route("**/core/engagement/attachments/upload-url", (route) =>
  494 |     json(route, {
  495 |       url: "https://storage.example.test/upload",
  496 |       fields: { key: "same-key" },
  497 |       s3Key: "same-key",
  498 |     }),
  499 |   );
  500 |   await page.route("https://storage.example.test/upload", async (route) => {
  501 |     storage++;
  502 |     await route.abort("failed");
  503 |   });
  504 |   await page.route("**/core/engagement/attachments/confirm", (route) => {
  505 |     confirms++;
  506 |     expect(route.request().postDataJSON().s3Key).toBe("same-key");
  507 |     return json(route, {
  508 |       ...file,
  509 |       meetingId: confirms === 1 ? otherClient.id : meetingId,
  510 |       s3Key: "same-key",
  511 |       fileName: "source.txt",
  512 |       contentType: "text/plain",
  513 |     });
  514 |   });
  515 |   await page.route(
  516 |     `**/core/engagement/attachments/${file.id}/extract-text`,
  517 |     (route) => {
  518 |       extracts++;
  519 |       return json(route, {
  520 |         attachmentId: file.id,
  521 |         text: "Recovered source",
  522 |         truncated: false,
  523 |       });
  524 |     },
  525 |   );
  526 |   await page.goto(
  527 |     `/calendar?view=agenda&date=2026-10-15&zone=UTC&meeting=${meetingId}`,
  528 |   );
  529 |   const meeting = page.getByRole("dialog", { name: initialMeeting.subject });
  530 |   await meeting.getByRole("button", { name: "Debriefs", exact: true }).click();
  531 |   await meeting
  532 |     .getByRole("button", { name: "Transcript and attachments", exact: true })
  533 |     .click();
  534 |   const dialog = page.getByRole("dialog", {
  535 |     name: "Transcript and attachments",
  536 |     exact: true,
  537 |   });
  538 |   await dialog.getByLabel("Meeting source file").setInputFiles({
  539 |     name: "source.txt",
  540 |     mimeType: "text/plain",
  541 |     buffer: Buffer.from("Source"),
  542 |   });
  543 |   await dialog
  544 |     .getByRole("button", { name: "Upload and extract", exact: true })
  545 |     .click();
  546 |   await expect(dialog.getByRole("alert")).toContainText(
  547 |     "completion is unknown",
  548 |   );
  549 |   await dialog
  550 |     .getByRole("button", { name: "Retry confirmation", exact: true })
  551 |     .click();
  552 |   await expect(dialog.getByRole("alert")).toContainText("unexpected response");
  553 |   expect(extracts).toBe(0);
  554 |   await dialog
  555 |     .getByRole("button", { name: "Retry confirmation", exact: true })
  556 |     .click();
  557 |   await expect(dialog.getByLabel("Extracted meeting source")).toHaveValue(
  558 |     "Recovered source",
  559 |   );
  560 |   expect({ storage, confirms, extracts }).toEqual({
  561 |     storage: 1,
  562 |     confirms: 2,
  563 |     extracts: 1,
  564 |   });
  565 |   expect(unexpected).toEqual([]);
  566 | });
  567 | 
  568 | function barrier() {
  569 |   let release!: () => void;
  570 |   const promise = new Promise<void>((resolve) => {
  571 |     release = resolve;
  572 |   });
  573 |   return { promise, release };
  574 | }
  575 | async function leaveMeeting(page: Page) {
```