# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: email-compose.spec.ts >> prepared seed requires canonical availability and an explicit selected recipient
- Location: tests/browser/email-compose.spec.ts:602:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Review email', exact: true })
    - locator resolved to <button disabled class="button primary">Review email</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
      - waiting 100ms
    53 × waiting for element to be visible, enabled and stable
       - element is not enabled
     - retrying click action
       - waiting 500ms

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
          - combobox "From mailbox" [ref=e13]:
            - option "Choose a sending mailbox" [selected]
            - option "Synthetic mailbox · sender@example.test"
        - generic [ref=e14]: Your saved signature belongs to your user account, not to a mailbox. Availability does not guarantee provider consent or delivery.
        - status [ref=e15]: Choose a sending mailbox before reviewing this email.
        - button "Refresh mailboxes" [ref=e16] [cursor=pointer]
      - region "Email recipients" [ref=e17]:
        - generic [ref=e18]:
          - strong [ref=e19]: To
          - generic [ref=e20]:
            - button "Cc" [ref=e21] [cursor=pointer]
            - button "Bcc" [ref=e22] [cursor=pointer]
        - generic [ref=e24]:
          - text: Morgan Test <morgan@example.test>
          - button "Remove recipient morgan@example.test" [ref=e25] [cursor=pointer]: ×
        - button "+ Add recipient" [expanded] [ref=e26] [cursor=pointer]
        - generic [ref=e27]:
          - generic [ref=e28]:
            - text: Search client contacts
            - textbox "Search client contacts" [ref=e29]:
              - /placeholder: Search name or email…
              - text: Morgan
          - paragraph [ref=e30]: No additional matching contacts with a valid email.
        - generic [ref=e31]: From your connected mailbox (Settings → Personal). Separate copied addresses with commas; up to 10 per field.
      - generic [ref=e32]:
        - text: Subject
        - textbox "Subject" [ref=e33]: Prepared review
      - generic [ref=e34]:
        - generic [ref=e35]: Message
        - textbox "Message" [ref=e36]: Prepared document for your review.
      - button "Rewrite with Meri" [ref=e37] [cursor=pointer]
      - generic [ref=e38]:
        - checkbox "Append my saved signature" [disabled] [ref=e39]
        - text: Append my saved signature
      - generic [ref=e40]: No saved signature is available.
      - region "Email attachments" [ref=e41]:
        - generic [ref=e42]:
          - text: Attach file
          - button "Attach file" [ref=e43]
        - generic [ref=e44]: Up to 5 files, 3 MiB each. Uploaded files are saved to this client’s Files. Removing here only detaches them from this draft.
        - article [ref=e45]:
          - strong [ref=e46]: brief.pdf
          - status [ref=e47]: Ready to attach
          - button "Remove attachment brief.pdf" [ref=e49] [cursor=pointer]: Remove
      - button "Review email" [disabled] [ref=e50]
```

# Test source

```ts
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
  609 |   await expect(page.getByLabel("Subject", { exact: true })).toHaveValue(
  610 |     "Prepared review",
  611 |   );
  612 |   await expect(page.getByLabel("Message", { exact: true })).toHaveValue(
  613 |     "Prepared document for your review.",
  614 |   );
  615 |   await expect(
  616 |     page.getByRole("button", { name: "Review email", exact: true }),
  617 |   ).toBeDisabled();
  618 |   await page
  619 |     .getByRole("button", { name: "+ Add recipient", exact: true })
  620 |     .click();
  621 |   await page.getByLabel("Search client contacts").fill("Morgan");
  622 |   await page
  623 |     .getByRole("button", { name: "Morgan Test · morgan@example.test" })
  624 |     .click();
  625 |   await expect(
  626 |     page.getByRole("button", { name: "Review email", exact: true }),
  627 |   ).toBeDisabled();
  628 |   await page
  629 |     .getByRole("button", { name: "Check scan status", exact: true })
  630 |     .click();
  631 |   await expect(
  632 |     page.getByText("Ready to attach", { exact: true }),
  633 |   ).toBeVisible();
> 634 |   await page.getByRole("button", { name: "Review email", exact: true }).click();
      |                                                                         ^ Error: locator.click: Test timeout of 30000ms exceeded.
  635 |   await page.getByRole("button", { name: "Send email", exact: true }).click();
  636 |   await expect(page.getByText("Email sent.", { exact: true })).toBeVisible();
  637 |   expect(state.counts()).toMatchObject({
  638 |     prepares: 0,
  639 |     uploads: 0,
  640 |     confirms: 0,
  641 |     reads: 2,
  642 |   });
  643 |   expect(state.sent[0]).toMatchObject({
  644 |     to: [{ email: "morgan@example.test", name: "Morgan Test" }],
  645 |     attachmentIds: [id],
  646 |   });
  647 | });
  648 | test("actor change during send attachment preflight causes zero mail POST", async ({
  649 |   page,
  650 | }) => {
  651 |   const state = await setup(page, { holdRead: true });
  652 |   await compose(page);
  653 |   await attach(page);
  654 |   await expect(
  655 |     page.getByText("Ready to attach", { exact: true }),
  656 |   ).toBeVisible();
  657 |   await page.getByRole("button", { name: "Review email", exact: true }).click();
  658 |   await page.getByRole("button", { name: "Send email", exact: true }).click();
  659 |   await expect.poll(() => state.counts().reads).toBe(2);
  660 |   state.actor();
  661 |   await page.evaluate(() => window.__mailRecheck?.());
  662 |   state.releaseRead();
  663 |   await expect(
  664 |     page.getByText(/mailbox session changed or is unverified/).last(),
  665 |   ).toBeVisible();
  666 |   expect(state.sent).toHaveLength(0);
  667 | });
  668 | 
```