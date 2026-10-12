# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: relationships.spec.ts >> person-linked QuickLog retains its failed note and existing email provider refusal remains visible
- Location: tests/browser/relationships.spec.ts:454:1

# Error details

```
Error: expect(locator).toHaveValue(expected) failed

Locator: getByRole('dialog', { name: 'New email', exact: true }).getByLabel('Message', { exact: true })
Expected: "Synthetic message"
Error: Not an input element

Call log:
  - Expect "toHaveValue" with timeout 5000ms
  - waiting for getByRole('dialog', { name: 'New email', exact: true }).getByLabel('Message', { exact: true })

```

# Page snapshot

```yaml
- generic [active]:
  - generic:
    - link:
      - /url: "#main"
      - text: Skip to content
    - banner:
      - link:
        - /url: /
        - img
      - navigation:
        - link:
          - /url: /meri
        - link:
          - /url: /
        - link:
          - /url: /modules
      - navigation:
        - link:
          - /url: /portfolio/10000000-0000-4000-8000-000000000001?log=1
        - link:
          - /url: /calendar
        - link:
          - /url: /portfolio?search=1
        - button [disabled]
        - generic:
          - button: T
    - generic:
      - complementary:
        - paragraph: Portfolio
        - navigation:
          - link:
            - /url: /portfolio
            - generic: Overview
          - link:
            - /url: /portfolio?type=CLIENT
            - generic: Clients
          - link:
            - /url: /portfolio/prospects
            - generic: Prospects
        - separator
        - paragraph: Test Aerospace
        - navigation:
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001
            - generic: Overview
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001/objectives
            - generic: Objectives
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001/calendar
            - generic: Calendar
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001/relationships
            - generic: Relationships
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001/work
            - generic: Work
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001/capabilities
            - generic: Capabilities
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001/bills
            - generic: Bill Tracker
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001/opportunities
            - generic: Opportunities
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001/files
            - generic: Files
        - generic:
          - link:
            - /url: /settings
            - text: Settings
      - main:
        - generic:
          - generic:
            - navigation:
              - link:
                - /url: /portfolio
              - link:
                - /url: /portfolio
                - text: Portfolio
              - generic: /
              - link:
                - /url: /portfolio/10000000-0000-4000-8000-000000000001
                - text: Test Aerospace
              - generic: /
              - button: Relationships
            - generic:
              - button:
                - generic: Quick add
              - button:
                - generic: Meri actions
              - button:
                - img
          - region:
            - generic: TA
            - generic:
              - strong: Test Aerospace
              - paragraph: Aerospace
            - generic: active client
        - generic:
          - generic:
            - generic:
              - heading [level=1]: Relationships
              - generic:
                - button: Configure hierarchy
                - button: Add contact
            - navigation:
              - link:
                - /url: /portfolio/10000000-0000-4000-8000-000000000001/relationships?kind=organization
                - text: Organization
              - link:
                - /url: /portfolio/10000000-0000-4000-8000-000000000001/relationships?kind=government
                - text: Government relationships
            - generic:
              - generic:
                - textbox:
                  - /placeholder: Search name or title…
                - generic: 1 contacts · 1 placed
                - button: Title-based hierarchy
              - paragraph: Title tiers organize the roster. Blue lines show saved reports-to links.
              - generic "Organization chart":
                - application:
                  - button [ref=e2] [cursor=pointer]:
                    - paragraph [ref=e4]: leadership
                    - generic [ref=e5]:
                      - generic [ref=e6]: TT
                      - generic [ref=e7]:
                        - strong [ref=e8]: Taylor Test
                        - paragraph [ref=e9]: Director
                    - generic [ref=e10]: Manual placement
                    - generic [ref=e11]: Added 10/1/2026
                  - img
                  - generic:
                    - button:
                      - img
                    - button:
                      - img
                    - button:
                      - img
                  - generic:
                    - img
                  - generic:
                    - link:
                      - /url: https://reactflow.dev/attribution
                      - text: React Flow
              - generic:
                - heading [level=3]: Contact list
                - button: Taylor Test · Director
  - dialog:
    - banner:
      - heading [level=2]: Taylor Test
      - button:
        - img
    - paragraph: Director
    - generic:
      - generic:
        - group:
          - generic:
            - text: Name *
            - textbox: Taylor Test
          - paragraph: Saved titles may describe current or historical roles. Verify changes against a dated source; keep former roles and the source in Notes.
          - generic:
            - text: Title
            - textbox: Director
          - generic:
            - generic:
              - text: Email
              - textbox: taylor@example.test
            - generic:
              - text: Phone
              - textbox
          - generic:
            - text: Role
            - textbox
      - button: Log note
      - generic:
        - generic:
          - heading [level=3]: Message history
          - button: Mail
        - paragraph: No accessible messages for this contact.
        - generic: Up to 50 recent client threads from your accessible mailbox. Open a thread to read its full message history.
      - group:
        - generic:
          - heading [level=3]: Hierarchy placement
          - generic: Manual placement. Saved titles may be historical; verify roles against a dated source.
          - generic:
            - generic:
              - generic:
                - text: Level
                - combobox
              - generic:
                - text: Reports to
                - combobox
            - generic:
              - checkbox
              - text: Needs title review
            - generic:
              - button: Save placement
              - button: Reset to automatic
      - generic:
        - generic: Notes
        - textbox
    - contentinfo:
      - button: Remove
      - button: Cancel
      - button: Save contact
  - dialog "New email" [ref=e15]:
    - banner [ref=e16]:
      - heading "New email" [level=2] [ref=e17]
      - button "Close" [ref=e18] [cursor=pointer]:
        - img [ref=e19]
    - paragraph [ref=e22]: Sends through your own connected mailbox. Backend permissions and connection policy apply.
    - generic [ref=e23]:
      - generic [ref=e24]:
        - generic [ref=e25]:
          - text: From mailbox
          - combobox "From mailbox" [disabled] [ref=e26]:
            - option "Choose a sending mailbox"
            - option "Synthetic mailbox · sender@example.test" [selected]
        - generic [ref=e27]: Your saved signature belongs to your user account, not to a mailbox. Availability does not guarantee provider consent or delivery.
        - button "Refresh mailboxes" [disabled] [ref=e28]
      - region "Email recipients" [ref=e29]:
        - generic [ref=e30]:
          - strong [ref=e31]: To
          - generic [ref=e32]:
            - button "Cc" [disabled] [ref=e33]
            - button "Bcc" [disabled] [ref=e34]
        - generic [ref=e36]:
          - text: Taylor Test <taylor@example.test>
          - button "Remove recipient taylor@example.test" [disabled] [ref=e37]: ×
        - button "+ Add recipient" [disabled] [ref=e38]
        - generic [ref=e39]: From your connected mailbox (Settings → Personal). Separate copied addresses with commas; up to 10 per field.
      - generic [ref=e40]:
        - text: Subject
        - textbox "Subject" [disabled] [ref=e41]: Synthetic subject
      - generic [ref=e42]:
        - generic [ref=e43]: Message
        - generic [ref=e44]:
          - group "Message formatting" [ref=e45]:
            - button "Bold" [disabled] [ref=e46]: B
            - button "Italic" [disabled] [ref=e47]: I
            - button "Underline" [disabled] [ref=e48]: U
            - button "List" [disabled] [ref=e49]
            - button "Attach file" [disabled] [ref=e50]
          - textbox "Message" [ref=e52]:
            - paragraph [ref=e53]: Synthetic message
      - button "Rewrite with Meri" [disabled] [ref=e54]
      - group "Draft rewrite status"
      - generic [ref=e55]:
        - checkbox "Append my saved signature" [disabled] [ref=e56]
        - text: Append my saved signature
      - region "Saved signature" [ref=e57]:
        - generic [ref=e58]: No saved signature is available.
      - region "Email attachments" [ref=e59]:
        - generic [ref=e60]:
          - text: Attach file
          - button "Attach file" [disabled] [ref=e61]
        - generic [ref=e62]: Up to 5 files, 3 MiB each. Uploaded files are saved to this client’s Files. Removing here only detaches them from this draft.
      - alert [ref=e63]:
        - paragraph [ref=e64]: Mailbox not connected
      - alert [ref=e65]: Delivery may be uncertain. Check your Sent Items before sending again. This attempt cannot be retried here.
      - button "Review email" [disabled] [ref=e66]
```

# Test source

```ts
  411 |     });
  412 |     await new Promise<void>((resolve) => {
  413 |       release = resolve;
  414 |     });
  415 |     saved = { ...person, hierarchyLevel: "team" };
  416 |     return json(route, saved);
  417 |   });
  418 |   await page.goto(`${path}?person=${personId}`);
  419 |   const drawer = page.getByRole("dialog", { name: person.name, exact: true });
  420 |   await drawer
  421 |     .getByRole("combobox", { name: "Level", exact: true })
  422 |     .selectOption("team");
  423 |   await drawer
  424 |     .getByRole("button", { name: "Save placement", exact: true })
  425 |     .click();
  426 |   await expect.poll(() => Boolean(release)).toBe(true);
  427 |   await expect(
  428 |     drawer.getByRole("button", { name: "Save contact", exact: true }),
  429 |   ).toBeDisabled();
  430 |   await expect(
  431 |     drawer.getByRole("button", { name: "Remove", exact: true }),
  432 |   ).toBeDisabled();
  433 |   await drawer
  434 |     .locator("form")
  435 |     .nth(1)
  436 |     .evaluate((form) => {
  437 |       form.dispatchEvent(
  438 |         new Event("submit", { bubbles: true, cancelable: true }),
  439 |       );
  440 |     });
  441 |   await page.keyboard.press("Escape");
  442 |   await expect(drawer).toBeVisible();
  443 |   expect(attempts).toBe(1);
  444 |   release!();
  445 |   await expect(
  446 |     drawer.getByRole("combobox", { name: "Level", exact: true }),
  447 |   ).toHaveValue("team");
  448 |   await expect(
  449 |     drawer.getByRole("button", { name: "Save contact", exact: true }),
  450 |   ).toBeEnabled();
  451 |   expect(unexpected).toEqual([]);
  452 | });
  453 | 
  454 | test("person-linked QuickLog retains its failed note and existing email provider refusal remains visible", async ({
  455 |   page,
  456 | }) => {
  457 |   const unexpected = await installFixtures(page);
  458 |   let notes = 0;
  459 |   let sends = 0;
  460 |   await page.route(`**/clients/${clientId}/activity`, (route) => {
  461 |     expect(route.request().method()).toBe("POST");
  462 |     notes++;
  463 |     expect(route.request().postDataJSON()).toMatchObject({
  464 |       personId,
  465 |       kind: "note",
  466 |       title: "Follow-up",
  467 |       body: "Dated note",
  468 |     });
  469 |     return json(route, { message: "Note unavailable" }, 409);
  470 |   });
  471 |   await page.route("**/engagement/mail/send", (route) => {
  472 |     sends++;
  473 |     expect(route.request().postDataJSON()).toMatchObject({
  474 |       clientId,
  475 |       personIds: [personId],
  476 |       to: [{ email: person.email, name: person.name }],
  477 |     });
  478 |     return json(route, { message: "Mailbox not connected" }, 409);
  479 |   });
  480 |   await page.goto(`${path}?person=${personId}`);
  481 |   const drawer = page.getByRole("dialog", { name: person.name, exact: true });
  482 |   await drawer.getByRole("button", { name: "Log note", exact: true }).click();
  483 |   const note = page.getByRole("dialog", { name: "Quick log", exact: true });
  484 |   await note.getByLabel("Title", { exact: true }).fill("Follow-up");
  485 |   await note.getByLabel("Details", { exact: true }).fill("Dated note");
  486 |   await note.getByRole("button", { name: "Save activity" }).click();
  487 |   await expect(note.getByRole("alert")).toContainText("Note unavailable");
  488 |   await expect(note.getByLabel("Details", { exact: true })).toHaveValue(
  489 |     "Dated note",
  490 |   );
  491 |   await note.getByRole("button", { name: "Close", exact: true }).click();
  492 |   await drawer.getByRole("button", { name: "Mail", exact: true }).click();
  493 |   const mail = page.getByRole("dialog", { name: "New email", exact: true });
  494 |   await mail.getByLabel("Subject", { exact: true }).fill("Synthetic subject");
  495 |   await mail.getByLabel("Message", { exact: true }).fill("Synthetic message");
  496 |   await mail.getByLabel("From mailbox").selectOption(sendingMailbox.id);
  497 |   await mail.getByRole("button", { name: "Review email", exact: true }).click();
  498 |   const confirmation = page.getByRole("dialog", {
  499 |     name: "Send email",
  500 |     exact: true,
  501 |   });
  502 |   await confirmation
  503 |     .getByRole("button", { name: "Send email", exact: true })
  504 |     .click();
  505 |   await expect(
  506 |     confirmation.getByText("Mailbox not connected", { exact: true }),
  507 |   ).toBeVisible();
  508 |   await confirmation
  509 |     .getByRole("button", { name: "Close", exact: true })
  510 |     .click();
> 511 |   await expect(mail.getByLabel("Message", { exact: true })).toHaveValue(
      |                                                             ^ Error: expect(locator).toHaveValue(expected) failed
  512 |     "Synthetic message",
  513 |   );
  514 |   await expect(mail.getByText("Email sent.", { exact: true })).toHaveCount(0);
  515 |   expect(notes).toBe(1);
  516 |   expect(sends).toBe(1);
  517 |   expect(unexpected).toEqual([]);
  518 | });
  519 | 
  520 | test("existing client-filtered email history opens the permitted full thread from the contact drawer", async ({
  521 |   page,
  522 | }) => {
  523 |   const unexpected = await installFixtures(page);
  524 |   const threadId = "a0000000-0000-4000-8000-000000000001";
  525 |   const thread = {
  526 |     id: threadId,
  527 |     clientId,
  528 |     subject: "Synthetic briefing",
  529 |     snippet: "Summary",
  530 |     connectionEmail: "test@example.test",
  531 |     participants: [{ email: person.email, name: person.name }],
  532 |     messages: [
  533 |       {
  534 |         id: "b0000000-0000-4000-8000-000000000001",
  535 |         subject: "Synthetic briefing",
  536 |         fromEmail: person.email,
  537 |         fromName: person.name,
  538 |         toRecipients: [],
  539 |         ccRecipients: [],
  540 |         bodyText: "Accessible synthetic thread content",
  541 |         sentAt: null,
  542 |         receivedAt: "2026-10-10T12:00:00Z",
  543 |         createdAt: "2026-10-10T12:00:00Z",
  544 |       },
  545 |     ],
  546 |   };
  547 |   await page.route("**/engagement/mail-threads?**", (route) => {
  548 |     const url = new URL(route.request().url());
  549 |     expect(url.searchParams.get("clientId")).toBe(clientId);
  550 |     expect(url.searchParams.get("recipientEmails")).toBe(person.email);
  551 |     return json(route, [thread]);
  552 |   });
  553 |   await page.route(`**/engagement/mail-threads/${threadId}`, (route) =>
  554 |     json(route, thread),
  555 |   );
  556 |   await page.goto(`${path}?person=${personId}`);
  557 |   const drawer = page.getByRole("dialog", { name: person.name, exact: true });
  558 |   await drawer.getByRole("button", { name: /Synthetic briefing/ }).click();
  559 |   const history = page.getByRole("dialog", {
  560 |     name: "Synthetic briefing",
  561 |     exact: true,
  562 |   });
  563 |   await expect(
  564 |     history.getByText("Accessible synthetic thread content", { exact: true }),
  565 |   ).toBeVisible();
  566 |   await expect(
  567 |     history.getByRole("button", {
  568 |       name: `Reply to ${person.name}`,
  569 |       exact: true,
  570 |     }),
  571 |   ).toBeVisible();
  572 |   expect(unexpected).toEqual([]);
  573 | });
  574 | 
```