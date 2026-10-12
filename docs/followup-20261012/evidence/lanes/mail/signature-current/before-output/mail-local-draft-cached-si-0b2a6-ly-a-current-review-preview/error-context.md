# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mail-local-draft.spec.ts >> cached signature loading refetch cannot supply a current review preview
- Location: apps/web/tests/browser/mail-local-draft.spec.ts:428:3

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  getByRole('dialog', { name: 'Send email', exact: true }).locator('iframe[title="Saved signature preview"]')
Expected: 0
Received: 1
Timeout:  5000ms

Call log:
  - Expect "toHaveCount" with timeout 5000ms
  - waiting for getByRole('dialog', { name: 'Send email', exact: true }).locator('iframe[title="Saved signature preview"]')
    14 × locator resolved to 1 element
       - unexpected value "1"

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
  - dialog:
    - banner:
      - heading [level=2]: New email
      - button:
        - img
    - paragraph: Sends through your own connected mailbox. Backend permissions and connection policy apply.
    - generic:
      - generic:
        - generic:
          - text: From mailbox
          - combobox
        - generic: Your saved signature belongs to your user account, not to a mailbox. Availability does not guarantee provider consent or delivery.
        - button: Refresh mailboxes
      - region:
        - generic:
          - strong: To
          - generic:
            - button: Cc
            - button: Bcc
        - generic:
          - generic:
            - text: Taylor Test <taylor@example.test>
            - button: ×
        - button: + Add recipient
        - generic: From your connected mailbox (Settings → Personal). Separate copied addresses with commas; up to 10 per field.
      - generic:
        - text: Subject
        - textbox: Synthetic local review
      - generic:
        - generic: Message
        - textbox: Original local draft.
      - button: Rewrite with Meri
      - generic:
        - checkbox [checked]
        - text: Append my saved signature
      - region:
        - generic:
          - iframe [ref=e2]:
            - paragraph [ref=f2e2]:
              - strong [ref=f2e3]: Synthetic Sender
              - text: Saved signature identity
          - generic: Remote images and links are hidden in this preview.
      - region:
        - generic:
          - text: Attach file
          - button
        - generic: Up to 5 files, 3 MiB each. Uploaded files are saved to this client’s Files. Removing here only detaches them from this draft.
      - button: Review email
  - dialog "Send email" [ref=e4]:
    - banner [ref=e5]:
      - heading "Send email" [level=2] [ref=e6]
      - button "Close" [active] [ref=e7] [cursor=pointer]:
        - img [ref=e8]
    - paragraph [ref=e11]: Send “Synthetic local review” through your connected mailbox?
    - generic [ref=e12]:
      - paragraph [ref=e13]: "From: Synthetic mailbox · sender@example.test"
      - paragraph [ref=e14]: "To: taylor@example.test"
      - paragraph [ref=e15]: Original local draft.
      - generic [ref=e16]: 0 attachment(s), rechecked before sending.
      - generic [ref=e17]:
        - generic [ref=e18]: Your saved signature is added when this email is sent.
        - generic [ref=e19]:
          - iframe [ref=e20]:
            - paragraph [ref=f3e2]:
              - strong [ref=f3e3]: Synthetic Sender
              - text: Saved signature identity
          - generic [ref=e21]: Remote images and links are hidden in this preview.
    - button "Send email" [ref=e22] [cursor=pointer]
```

# Test source

```ts
  361 |     } else {
  362 |       await page.keyboard.press("Escape");
  363 |       await open(page);
  364 |     }
  365 |     await expect(
  366 |       page.getByRole("button", { name: "Undo Meri rewrite", exact: true }),
  367 |     ).toHaveCount(0);
  368 |     expect(state.rewrites).toHaveLength(1);
  369 |     expect(state.sends).toEqual([]);
  370 |   });
  371 | 
  372 | test("append selection is local to the message and controls review inclusion", async ({
  373 |   page,
  374 | }) => {
  375 |   const state = await setup(page);
  376 |   await open(page);
  377 |   await page.getByLabel("Append my saved signature").uncheck();
  378 |   await page.getByRole("button", { name: "Review email", exact: true }).click();
  379 |   const review = page.getByRole("dialog", { name: "Send email", exact: true });
  380 |   await expect(
  381 |     review.locator('iframe[title="Saved signature preview"]'),
  382 |   ).toHaveCount(0);
  383 |   await page.keyboard.press("Escape");
  384 |   await page.getByLabel("Append my saved signature").check();
  385 |   await page.getByRole("button", { name: "Review email", exact: true }).click();
  386 |   await expect(
  387 |     review
  388 |       .frameLocator('iframe[title="Saved signature preview"]')
  389 |       .getByText("Synthetic Sender", { exact: true }),
  390 |   ).toBeVisible();
  391 |   expect(state.signature.enabled).toBe(true);
  392 |   expect(state.sends).toEqual([]);
  393 | });
  394 | 
  395 | test("saved signature and Undo remain usable in desktop and mobile dark review", async ({
  396 |   page,
  397 | }, testInfo) => {
  398 |   await setup(page);
  399 |   await open(page);
  400 |   await rewrite(page);
  401 |   await page.screenshot({
  402 |     path: testInfo.outputPath("mail-local-desktop.png"),
  403 |   });
  404 |   await page.setViewportSize({ width: 390, height: 844 });
  405 |   await page.emulateMedia({ colorScheme: "dark" });
  406 |   const dialog = page.getByRole("dialog", { name: "New email", exact: true });
  407 |   await expect(dialog).toBeVisible();
  408 |   expect(
  409 |     await dialog.evaluate(
  410 |       (element) => element.scrollWidth <= element.clientWidth,
  411 |     ),
  412 |   ).toBe(true);
  413 |   await page
  414 |     .getByRole("button", { name: "Undo Meri rewrite", exact: true })
  415 |     .scrollIntoViewIfNeeded();
  416 |   await page.screenshot({
  417 |     path: testInfo.outputPath("mail-local-mobile-dark.png"),
  418 |   });
  419 |   await page
  420 |     .getByRole("button", { name: "Undo Meri rewrite", exact: true })
  421 |     .click();
  422 |   await expect(page.getByLabel("Message", { exact: true })).toHaveValue(
  423 |     original,
  424 |   );
  425 | });
  426 | 
  427 | for (const response of [403, 503, "loading"] as const)
  428 |   test(`cached signature ${response} refetch cannot supply a current review preview`, async ({
  429 |     page,
  430 |   }) => {
  431 |     await page.clock.install();
  432 |     const state = await setup(page);
  433 |     await open(page);
  434 |     await expect(
  435 |       page
  436 |         .frameLocator('iframe[title="Saved signature preview"]')
  437 |         .getByText("Synthetic Sender", { exact: true }),
  438 |     ).toBeVisible();
  439 |     await page.keyboard.press("Escape");
  440 |     await expect(
  441 |       page.getByRole("dialog", { name: "New email", exact: true }),
  442 |     ).toHaveCount(0);
  443 |     await page.clock.fastForward(31_000);
  444 |     state.signatureStatus = response === "loading" ? 200 : response;
  445 |     state.holdSignature = response === "loading";
  446 |     await open(page);
  447 |     await expect.poll(() => state.signatureReads).toBe(2);
  448 |     const signature = page.getByRole("region", { name: "Saved signature" });
  449 |     if (response !== "loading")
  450 |       await expect(signature.getByRole("alert")).toBeVisible();
  451 |     try {
  452 |       await page
  453 |         .getByRole("button", { name: "Review email", exact: true })
  454 |         .click();
  455 |       const review = page.getByRole("dialog", {
  456 |         name: "Send email",
  457 |         exact: true,
  458 |       });
  459 |       await expect(
  460 |         review.locator('iframe[title="Saved signature preview"]'),
> 461 |       ).toHaveCount(0);
      |         ^ Error: expect(locator).toHaveCount(expected) failed
  462 |       await expect(
  463 |         review.getByText(
  464 |           response === "loading"
  465 |             ? "Signature preview was still loading when this review opened. Close this review and review again after it loads."
  466 |             : "Saved signature preview is unavailable. Close this review to retry loading it.",
  467 |           { exact: true },
  468 |         ),
  469 |       ).toBeVisible();
  470 |       await expect(
  471 |         review.getByText(
  472 |           "Your saved signature will be requested when this email is sent.",
  473 |           { exact: true },
  474 |         ),
  475 |       ).toBeVisible();
  476 |       await expect(
  477 |         signature.locator('iframe[title="Saved signature preview"]'),
  478 |       ).toHaveCount(0);
  479 |       await review
  480 |         .getByRole("button", { name: "Send email", exact: true })
  481 |         .click();
  482 |       await expect.poll(() => state.sends.length).toBe(1);
  483 |       expect(state.sends[0]).toMatchObject({
  484 |         bodyHtml: `<p>${original}</p>`,
  485 |         appendSignature: true,
  486 |       });
  487 |       expect(state.sends[0]?.bodyHtml).not.toContain("Synthetic Sender");
  488 |       expect(state.rewrites).toEqual([]);
  489 |       expect(state.remote).toEqual([]);
  490 |     } finally {
  491 |       state.releaseSignature();
  492 |     }
  493 |   });
  494 | 
```