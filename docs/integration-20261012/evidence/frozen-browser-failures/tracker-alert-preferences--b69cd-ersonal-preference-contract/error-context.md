# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tracker-alert-preferences.spec.ts >> Core Configure does not expose or request the Intel personal-preference contract
- Location: tests/browser/tracker-alert-preferences.spec.ts:574:1

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  getByRole('button', { name: 'My alert preferences' })
Expected: 0
Received: 1
Timeout:  5000ms

Call log:
  - Expect "toHaveCount" with timeout 5000ms
  - waiting for getByRole('button', { name: 'My alert preferences' })
    14 × locator resolved to 1 element
       - unexpected value "1"

```

# Page snapshot

```yaml
- generic:
  - generic:
    - main:
      - paragraph: Synthetic Tracker checks. All service requests are intercepted.
      - generic:
        - heading [level=1]: Bill Tracker
        - generic:
          - generic:
            - heading [level=2]: Tracked bills
            - generic: 0 tracked bills
          - generic:
            - button: Configure
            - button: Track bill
          - generic:
            - generic:
              - strong: "0"
              - generic: Tracked bills
            - generic:
              - strong: —
              - generic: Material changes
            - generic:
              - strong: —
              - generic: Watchlist coverage
          - generic:
            - textbox:
              - /placeholder: Filter loaded bills
            - button [pressed]: Table view
            - button: Board view
          - generic:
            - table:
              - caption: Tracked bills and service passage estimates
              - rowgroup:
                - row:
                  - columnheader: Bill
                  - columnheader: Title
                  - columnheader: Latest action
                  - columnheader: Stage
                  - columnheader: Pass estimate
          - paragraph: No tracked bills yet. Search for a bill to start tracking.
          - paragraph: Showing 0 loaded bills of 0. Passage estimates come from the service.
  - dialog "Configure Bill Tracker" [ref=e2]:
    - banner [ref=e3]:
      - heading "Configure Bill Tracker" [level=2] [ref=e4]
      - button "Close" [active] [ref=e5] [cursor=pointer]:
        - img [ref=e6]
    - paragraph [ref=e9]: Shared client targeting. Changes take effect when you save; notification settings are separate.
    - generic [ref=e10]:
      - paragraph [ref=e11]: Choose your personal email and SMS preferences for this client.
      - button "My alert preferences" [disabled] [ref=e12]
    - status "Current data unavailable" [ref=e13]:
      - heading "Current data unavailable" [level=3] [ref=e14]
      - paragraph [ref=e15]: Your local edits are retained. Refresh the current client and targeting data before continuing.
      - button "Retry" [ref=e16] [cursor=pointer]
```

# Test source

```ts
  498 |         return json(route, {
  499 |           ...trackerPreferences,
  500 |           clientId: currentClient,
  501 |           userId: currentIdentity.user.clerkUserId,
  502 |           tenantId: currentIdentity.tenant.id,
  503 |         });
  504 |       writes++;
  505 |       const body = route.request().postDataJSON();
  506 |       await new Promise<void>((resolve) => {
  507 |         release = resolve;
  508 |       });
  509 |       await json(route, { ...trackerPreferences, ...body });
  510 |       completed = true;
  511 |     });
  512 |     const dialog = await open(page);
  513 |     await dialog.getByLabel("Minimum importance").selectOption("high");
  514 |     await dialog
  515 |       .getByRole("button", { name: "Save preferences", exact: true })
  516 |       .click();
  517 |     await expect.poll(() => writes).toBe(1);
  518 |     if (transition === "actor" || transition === "clerk") {
  519 |       currentIdentity = {
  520 |         ...trackerIdentity,
  521 |         user: {
  522 |           ...trackerIdentity.user,
  523 |           id:
  524 |             transition === "actor"
  525 |               ? "another-database-user"
  526 |               : trackerActor.userId,
  527 |           clerkUserId: "user_another_tracker",
  528 |         },
  529 |       };
  530 |       await event(page, "tracker-test-identity", currentIdentity);
  531 |     } else if (transition === "role") {
  532 |       await event(page, "tracker-test-identity", {
  533 |         ...trackerIdentity,
  534 |         role: "client_portal_user",
  535 |       });
  536 |     } else if (transition === "client") {
  537 |       currentClient = "10000000-0000-4000-8000-000000000002";
  538 |       await event(page, "tracker-test-client", currentClient);
  539 |     } else
  540 |       await event(
  541 |         page,
  542 |         transition === "unmount"
  543 |           ? "tracker-test-unmount"
  544 |           : "tracker-test-invalidate-identity",
  545 |       );
  546 |     if (["actor", "clerk", "client"].includes(transition))
  547 |       await expect(
  548 |         dialogFor(page).getByLabel("Minimum importance"),
  549 |       ).toHaveValue("medium");
  550 |     else
  551 |       await expect(
  552 |         page.getByLabel("Email address", { exact: true }),
  553 |       ).toHaveCount(0);
  554 |     release?.();
  555 |     await expect.poll(() => completed).toBe(true);
  556 |     await page.evaluate(
  557 |       () =>
  558 |         new Promise<void>((resolve) =>
  559 |           requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  560 |         ),
  561 |     );
  562 |     await expect(
  563 |       page.getByText("Preferences saved.", { exact: true }),
  564 |     ).toHaveCount(0);
  565 |     if (["actor", "clerk", "client"].includes(transition))
  566 |       await expect(
  567 |         dialogFor(page).getByLabel("Minimum importance"),
  568 |       ).toHaveValue("medium");
  569 |     expect(writes).toBe(1);
  570 |     expect(unexpected).toEqual([]);
  571 |   });
  572 | }
  573 | 
  574 | test("Core Configure does not expose or request the Intel personal-preference contract", async ({
  575 |   page,
  576 | }) => {
  577 |   const unexpected = await install(page);
  578 |   await page.route(
  579 |     `**/core/intelligence/clients/${trackerClientId}/tracker/board*`,
  580 |     (route) => json(route, { columns: [], total: 0 }),
  581 |   );
  582 |   await page.route("**/core/intelligence/issue-areas", (route) =>
  583 |     json(route, { issueAreas: [] }),
  584 |   );
  585 |   await page.route(
  586 |     `**/core/intelligence/clients/${trackerClientId}/tracker/watchlist`,
  587 |     (route) => json(route, { message: "Synthetic targeting unavailable" }, 404),
  588 |   );
  589 |   let prefCalls = 0;
  590 |   await page.route(routePattern, (route) => {
  591 |     prefCalls++;
  592 |     return json(route, trackerPreferences);
  593 |   });
  594 |   await page.goto("/tracker-boundary.html?mode=board&backend=core");
  595 |   await page.getByRole("button", { name: "Configure", exact: true }).click();
  596 |   await expect(
  597 |     page.getByRole("button", { name: "My alert preferences" }),
> 598 |   ).toHaveCount(0);
      |     ^ Error: expect(locator).toHaveCount(expected) failed
  599 |   expect(prefCalls).toBe(0);
  600 |   expect(unexpected).toEqual([]);
  601 | });
  602 | 
  603 | for (const viewport of [
  604 |   { name: "desktop", width: 1440, height: 1100 },
  605 |   { name: "phone", width: 390, height: 1440 },
  606 | ]) {
  607 |   test(`the ${viewport.name} preference form follows the new Figma structure and remains keyboard accessible`, async ({
  608 |     page,
  609 |   }, testInfo) => {
  610 |     await page.setViewportSize(viewport);
  611 |     const unexpected = await install(page);
  612 |     await page.route(routePattern, (route) =>
  613 |       json(route, {
  614 |         ...trackerPreferences,
  615 |         smsPhone: null,
  616 |         smsPhoneVerified: false,
  617 |       }),
  618 |     );
  619 |     const dialog = await open(page);
  620 |     await page.evaluate(() => document.fonts.ready);
  621 |     const bounds = await dialog.boundingBox();
  622 |     expect(bounds!.width).toBeLessThanOrEqual(viewport.width - 32);
  623 |     expect(bounds!.x).toBeGreaterThanOrEqual(15);
  624 |     expect(
  625 |       await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth),
  626 |     ).toBe(true);
  627 |     const email = await dialog
  628 |       .getByLabel("Email address", { exact: true })
  629 |       .boundingBox();
  630 |     const sms = await dialog
  631 |       .getByLabel("Phone number", { exact: true })
  632 |       .boundingBox();
  633 |     if (viewport.name === "desktop")
  634 |       expect(Math.abs(email!.y - sms!.y)).toBeLessThan(2);
  635 |     else expect(sms!.y).toBeGreaterThan(email!.y + email!.height);
  636 |     await dialog.getByLabel("Minimum importance").focus();
  637 |     await expect(dialog.getByLabel("Minimum importance")).toBeFocused();
  638 |     await page.keyboard.press("Tab");
  639 |     await expect(dialog.getByLabel("Jurisdictions")).toBeFocused();
  640 |     await dialog.screenshot({
  641 |       path: testInfo.outputPath(`tracker-preferences-${viewport.name}.png`),
  642 |     });
  643 |     if (viewport.name === "phone") {
  644 |       await page.setViewportSize({ width: 390, height: 844 });
  645 |       await dialog
  646 |         .getByRole("button", { name: "Cancel", exact: true })
  647 |         .scrollIntoViewIfNeeded();
  648 |       await expect(
  649 |         dialog.getByRole("button", { name: "Cancel", exact: true }),
  650 |       ).toBeInViewport();
  651 |     }
  652 |     await page.keyboard.press("Escape");
  653 |     await expect(dialog).not.toBeVisible();
  654 |     expect(unexpected).toEqual([]);
  655 |   });
  656 | }
  657 | 
```