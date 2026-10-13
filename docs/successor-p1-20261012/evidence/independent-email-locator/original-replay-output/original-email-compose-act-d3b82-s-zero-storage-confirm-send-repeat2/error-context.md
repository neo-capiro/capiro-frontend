# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: original-email-compose.spec.ts >> actor change while prepare awaits causes zero storage/confirm/send
- Location: ../../tmp/capiro-email-actor-review/original-email-compose.spec.ts:510:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/mailbox session changed or is unverified/)
Expected: visible
Error: strict mode violation: getByText(/mailbox session changed or is unverified/) resolved to 2 elements:
    1) <p>Your mailbox session changed or is unverified. Re…</p> aka getByRole('paragraph').filter({ hasText: 'Your mailbox session changed' })
    2) <p role="alert">Your mailbox session changed or is unverified. Re…</p> aka getByLabel('Email attachments').getByText('Your mailbox session changed')

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText(/mailbox session changed or is unverified/)

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
          - combobox "From mailbox" [disabled] [ref=e13]:
            - option "Choose a sending mailbox"
            - option "Selected mailbox unavailable" [disabled] [selected]
        - generic [ref=e14]: Your saved signature belongs to your user account, not to a mailbox. Availability does not guarantee provider consent or delivery.
        - status [ref=e15]: A current sending mailbox is unavailable. The draft is retained; another mailbox will not be substituted.
        - alert [ref=e16]:
          - paragraph [ref=e17]: Your mailbox session changed or is unverified. Refresh and review this draft.
        - button "Refresh mailboxes" [ref=e18] [cursor=pointer]
      - region "Email recipients" [ref=e19]:
        - generic [ref=e20]:
          - strong [ref=e21]: To
          - generic [ref=e22]:
            - button "Cc" [ref=e23] [cursor=pointer]
            - button "Bcc" [ref=e24] [cursor=pointer]
        - generic [ref=e26]:
          - text: Taylor Test <taylor@example.test>
          - button "Remove recipient taylor@example.test" [ref=e27] [cursor=pointer]: ×
        - button "+ Add recipient" [ref=e28] [cursor=pointer]
        - generic [ref=e29]: From your connected mailbox (Settings → Personal). Separate copied addresses with commas; up to 10 per field.
      - generic [ref=e30]:
        - text: Subject
        - textbox "Subject" [ref=e31]: Synthetic review
      - generic [ref=e32]:
        - generic [ref=e33]: Message
        - textbox "Message" [ref=e34]: Draft retained for explicit review.
      - button "Rewrite with Meri" [ref=e35] [cursor=pointer]
      - group "Draft rewrite status"
      - generic [ref=e36]:
        - checkbox "Append my saved signature" [disabled] [ref=e37]
        - text: Append my saved signature
      - generic [ref=e38]: No saved signature is available.
      - region "Email attachments" [ref=e39]:
        - generic [ref=e40]:
          - text: Attach file
          - button "Attach file" [ref=e41]
        - generic [ref=e42]: Up to 5 files, 3 MiB each. Uploaded files are saved to this client’s Files. Removing here only detaches them from this draft.
        - article [ref=e43]:
          - strong [ref=e44]: brief.pdf · 1 KiB
          - status [ref=e45]: Needs review
          - alert [ref=e46]: Your mailbox session changed or is unverified. Refresh and review this draft.
          - generic [ref=e47]:
            - button "Retry confirmation / upload" [ref=e48] [cursor=pointer]
            - button "Remove attachment brief.pdf" [ref=e49] [cursor=pointer]: Remove
      - button "Review email" [disabled] [ref=e50]
```

# Test source

```ts
  422 |   ).toBeDisabled();
  423 |   expect(state.counts()).toMatchObject({
  424 |     prepares: 1,
  425 |     uploads: 1,
  426 |     confirms: 1,
  427 |     reads: 1,
  428 |   });
  429 |   state.setUsable();
  430 |   await page.getByRole("button", { name: "Check scan status" }).click();
  431 |   await expect(
  432 |     page.getByText("Ready to attach", { exact: true }),
  433 |   ).toBeVisible();
  434 |   await page.getByRole("button", { name: "Review email", exact: true }).click();
  435 |   await page.getByRole("button", { name: "Send email", exact: true }).click();
  436 |   await expect(page.getByText("Email sent.", { exact: true })).toBeVisible();
  437 |   expect(state.sent[0]).toMatchObject({ attachmentIds: [id] });
  438 |   expect(state.counts()).toMatchObject({
  439 |     prepares: 1,
  440 |     uploads: 1,
  441 |     confirms: 1,
  442 |     reads: 3,
  443 |   });
  444 | });
  445 | test("confirmation retry reuses storage attempt without another byte upload", async ({
  446 |   page,
  447 | }) => {
  448 |   const state = await setup(page, { confirmFailure: true });
  449 |   await compose(page);
  450 |   await attach(page);
  451 |   await expect(
  452 |     page.getByText("Confirmation temporarily unavailable", { exact: true }),
  453 |   ).toBeVisible();
  454 |   await page
  455 |     .getByRole("button", { name: "Retry confirmation / upload" })
  456 |     .click();
  457 |   await expect(
  458 |     page.getByText("Ready to attach", { exact: true }),
  459 |   ).toBeVisible();
  460 |   expect(state.counts()).toMatchObject({
  461 |     prepares: 1,
  462 |     uploads: 1,
  463 |     confirms: 2,
  464 |   });
  465 | });
  466 | test("oversize file refuses before prepare and draft removal never deletes Files", async ({
  467 |   page,
  468 | }) => {
  469 |   const state = await setup(page);
  470 |   await compose(page);
  471 |   await page.getByLabel("Attach file", { exact: true }).setInputFiles({
  472 |     name: "large.pdf",
  473 |     mimeType: "application/pdf",
  474 |     buffer: Buffer.alloc(3 * 1024 * 1024 + 1),
  475 |   });
  476 |   await expect(page.getByText(/3 MiB or smaller per file/)).toBeVisible();
  477 |   expect(state.counts().prepares).toBe(0);
  478 |   await page
  479 |     .getByRole("button", { name: "Remove attachment large.pdf" })
  480 |     .click();
  481 |   await expect(
  482 |     page.getByRole("button", { name: "Review email", exact: true }),
  483 |   ).toBeEnabled();
  484 | });
  485 | for (const status of [503, 200])
  486 |   test(`uncertain or malformed receipt freezes send attempt (${status})`, async ({
  487 |     page,
  488 |   }) => {
  489 |     const state = await setup(
  490 |       page,
  491 |       status === 503 ? { sendStatus: 503 } : { badReceipt: true },
  492 |     );
  493 |     await compose(page);
  494 |     await page
  495 |       .getByRole("button", { name: "Review email", exact: true })
  496 |       .click();
  497 |     await page.getByRole("button", { name: "Send email", exact: true }).click();
  498 |     await expect(
  499 |       page.getByRole("button", { name: "Send email", exact: true }),
  500 |     ).toBeDisabled();
  501 |     await page.keyboard.press("Escape");
  502 |     await expect(
  503 |       page.getByText(/This attempt cannot be retried here/),
  504 |     ).toBeVisible();
  505 |     await expect(page.getByLabel("Message", { exact: true })).toHaveValue(
  506 |       "Draft retained for explicit review.",
  507 |     );
  508 |     expect(state.sent).toHaveLength(1);
  509 |   });
  510 | test("actor change while prepare awaits causes zero storage/confirm/send", async ({
  511 |   page,
  512 | }) => {
  513 |   const state = await setup(page, { holdPrepare: true });
  514 |   await compose(page);
  515 |   await attach(page);
  516 |   await expect.poll(() => state.counts().prepares).toBe(1);
  517 |   state.actor();
  518 |   await page.evaluate(() => window.__mailRecheck?.());
  519 |   state.releasePrepare();
  520 |   await expect(
  521 |     page.getByText(/mailbox session changed or is unverified/),
> 522 |   ).toBeVisible();
      |     ^ Error: expect(locator).toBeVisible() failed
  523 |   expect(state.counts()).toMatchObject({ uploads: 0, confirms: 0 });
  524 |   expect(state.sent).toHaveLength(0);
  525 | });
  526 | test("unmounted actor lifetime refuses delayed upload dispatch", async ({
  527 |   page,
  528 | }) => {
  529 |   const state = await setup(page, { holdPrepare: true });
  530 |   await compose(page);
  531 |   await attach(page);
  532 |   await expect.poll(() => state.counts().prepares).toBe(1);
  533 |   await page.evaluate(() => window.__mailUnmount?.());
  534 |   state.releasePrepare();
  535 |   await expect(
  536 |     page.getByRole("button", { name: "Mail contact", exact: true }),
  537 |   ).toBeVisible();
  538 |   await expect.poll(() => state.counts().uploads).toBe(0);
  539 |   expect(state.counts().confirms).toBe(0);
  540 | });
  541 | test("reply to foreign-client thread refuses before mail send", async ({
  542 |   page,
  543 | }) => {
  544 |   const state = await setup(page, { replyClient: other });
  545 |   await compose(page, true, false);
  546 |   await expect(
  547 |     page.getByRole("button", { name: "Review email", exact: true }),
  548 |   ).toBeDisabled();
  549 |   await expect(page.getByText(/unexpected response/).last()).toBeVisible();
  550 |   await expect(page.getByLabel("Message", { exact: true })).toHaveValue(
  551 |     "Draft retained for explicit review.",
  552 |   );
  553 |   expect(state.sent).toHaveLength(0);
  554 | });
  555 | test("read-only role cannot upload or send", async ({ page }) => {
  556 |   const state = await setup(page, { role: "viewer" });
  557 |   await page.getByRole("button", { name: "Mail contact", exact: true }).click();
  558 |   await expect(
  559 |     page.getByRole("button", { name: "Review email", exact: true }),
  560 |   ).toBeDisabled();
  561 |   await expect(page.getByLabel("Attach file", { exact: true })).toBeDisabled();
  562 |   expect(state.sent).toHaveLength(0);
  563 | });
  564 | test("mobile dark attachment strip fits, keyboard enters picker and removes recipient", async ({
  565 |   page,
  566 | }) => {
  567 |   await page.setViewportSize({ width: 390, height: 844 });
  568 |   await setup(page);
  569 |   await page.emulateMedia({ colorScheme: "dark" });
  570 |   await compose(page);
  571 |   await attach(page);
  572 |   await expect(
  573 |     page.getByText("Ready to attach", { exact: true }),
  574 |   ).toBeVisible();
  575 |   await page
  576 |     .getByRole("button", { name: "+ Add recipient", exact: true })
  577 |     .focus();
  578 |   await page.keyboard.press("Enter");
  579 |   await expect(page.getByLabel("Search client contacts")).toBeVisible();
  580 |   await expect(page.locator('[role="dialog"]').first()).toHaveCSS(
  581 |     "font-family",
  582 |     /Geist/,
  583 |   );
  584 |   expect(
  585 |     await page.evaluate(
  586 |       () => document.documentElement.scrollWidth <= innerWidth,
  587 |     ),
  588 |   ).toBe(true);
  589 |   await expect(page.locator('[role="dialog"]').first()).toHaveCSS(
  590 |     "background-color",
  591 |     "rgb(27, 27, 27)",
  592 |   );
  593 |   await page
  594 |     .getByText("Ready to attach", { exact: true })
  595 |     .scrollIntoViewIfNeeded();
  596 |   await page.screenshot({
  597 |     path: process.env.PORTFOLIO_EMAIL_SCREENSHOT_DIR
  598 |       ? `${process.env.PORTFOLIO_EMAIL_SCREENSHOT_DIR}/email-attachment-mobile-dark.png`
  599 |       : "test-results/email-attachment-mobile-dark.png",
  600 |   });
  601 | });
  602 | test("prepared seed requires canonical availability and an explicit selected recipient", async ({
  603 |   page,
  604 | }) => {
  605 |   const state = await setup(page);
  606 |   await page
  607 |     .getByRole("button", { name: "Email prepared document", exact: true })
  608 |     .click();
  609 |   await page.getByLabel("From mailbox").selectOption(sendingMailbox.id);
  610 |   await expect(page.getByLabel("Subject", { exact: true })).toHaveValue(
  611 |     "Prepared review",
  612 |   );
  613 |   await expect(page.getByLabel("Message", { exact: true })).toHaveValue(
  614 |     "Prepared document for your review.",
  615 |   );
  616 |   await expect(
  617 |     page.getByRole("button", { name: "Review email", exact: true }),
  618 |   ).toBeDisabled();
  619 |   await page
  620 |     .getByRole("button", { name: "+ Add recipient", exact: true })
  621 |     .click();
  622 |   await page.getByLabel("Search client contacts").fill("Morgan");
```