# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: meri-action-host-mobile-navigation.spec.ts >> 375px Meri navigation preserves the verified client through keyboard and Back/Forward without action dispatch
- Location: test/browser/meri-action-host-mobile-navigation.spec.ts:74:1

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  getByRole('link', { name: 'Conversations', exact: true })
Expected: 1
Received: 0
Timeout:  5000ms

Call log:
  - Expect "toHaveCount" with timeout 5000ms
  - waiting for getByRole('link', { name: 'Conversations', exact: true })
    14 × locator resolved to 0 elements
       - unexpected value "0"

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - banner [ref=e4]:
      - link "Capiro Home" [ref=e5] [cursor=pointer]:
        - /url: /
        - img "Capiro" [ref=e6]
      - navigation "Product modes" [ref=e7]:
        - link "Meri" [ref=e8] [cursor=pointer]:
          - /url: /meri?clientId=abcdef00-0000-4000-8000-000000000009
          - img [ref=e9]
        - link "Portfolio" [ref=e10] [cursor=pointer]:
          - /url: /portfolio/abcdef00-0000-4000-8000-000000000009
          - img [ref=e11]
        - link "Modules" [ref=e12] [cursor=pointer]:
          - /url: /modules?clientId=abcdef00-0000-4000-8000-000000000009
          - img [ref=e13]
      - generic [ref=e14]:
        - link "Quick log" [ref=e15] [cursor=pointer]:
          - /url: /?log=1&clientId=abcdef00-0000-4000-8000-000000000009
          - img [ref=e16]
        - link "Master calendar" [ref=e17] [cursor=pointer]:
          - /url: /calendar?clientId=abcdef00-0000-4000-8000-000000000009
          - img [ref=e18]
        - link "Search" [ref=e19] [cursor=pointer]:
          - /url: /modules/intelligence?clientId=abcdef00-0000-4000-8000-000000000009
          - img [ref=e20]
        - button "Updates — unavailable" [disabled] [ref=e21]:
          - img [ref=e22]
        - link "Account settings" [ref=e23] [cursor=pointer]:
          - /url: /settings/personal
          - img [ref=e24]
    - main [ref=e26]:
      - generic [ref=e27]:
        - generic [ref=e28]:
          - generic [ref=e29]:
            - button "Anduril" [disabled] [ref=e30]:
              - img [ref=e31]
              - text: Anduril
            - generic "Prototype label only; no authorized source data" [ref=e32]: Your authorized data
          - img "Meri" [ref=e33]
        - generic [ref=e34]:
          - generic [ref=e35]:
            - heading "Good morning, Jordan." [level=1] [ref=e36]
            - paragraph [ref=e37]: What would you like to work on?
          - region "Local draft composer" [ref=e38]:
            - group [ref=e40]:
              - textbox "Message draft" [ref=e42]:
                - /placeholder: Ask Meri to research, analyze, or create something…
              - group [ref=e43]:
                - generic [ref=e44]:
                  - button "Attach" [disabled] [ref=e45]:
                    - img [ref=e46]
                    - text: Attach
                  - button "Anduril" [disabled] [ref=e47]:
                    - img [ref=e48]
                    - text: Anduril
                - 'button "Send unavailable: disconnected fixture" [disabled] [ref=e49]':
                  - img [ref=e50]
                  - text: Send
              - paragraph [ref=e51]:
                - text: Enter to send · Shift + Enter for a new line
                - generic [ref=e52]: . Sending is currently unavailable in this disconnected synthetic fixture.
          - generic "Draft suggestions" [ref=e53]:
            - generic [ref=e54]:
              - generic [ref=e55]:
                - img [ref=e57]
                - button "Start research draft" [ref=e58] [cursor=pointer]: Start
              - heading "Research" [level=2] [ref=e59]
              - paragraph [ref=e60]: Explore a question
            - generic [ref=e61]:
              - generic [ref=e62]:
                - img [ref=e64]
                - button "Start create a brief draft" [ref=e65] [cursor=pointer]: Start
              - heading "Create a brief" [level=2] [ref=e66]
              - paragraph [ref=e67]: Turn evidence into a document
            - generic [ref=e68]:
              - generic [ref=e69]:
                - img [ref=e71]
                - button "Start analyze a file draft" [ref=e72] [cursor=pointer]: Start
              - heading "Analyze a file" [level=2] [ref=e73]
              - paragraph [ref=e74]: Find signals in your data
          - generic [ref=e75]:
            - button "Build a spreadsheet" [ref=e76] [cursor=pointer]
            - button "Create a presentation" [ref=e77] [cursor=pointer]
            - button "Use a template" [ref=e78] [cursor=pointer]
            - button "Browse workflows" [disabled] [ref=e79]
            - generic [ref=e80]: Workflow library is not implemented in this disconnected fixture.
  - note [ref=e81]:
    - strong [ref=e82]: Disconnected synthetic fixture.
    - text: Jordan, Anduril, recent titles, answer, citations and approval counts are samples. No signed-in identity, authorized source data or sending is available. Drafts stay in this page only.
```

# Test source

```ts
  1   | import { test, expect, type Locator, type Page } from "@playwright/test";
  2   | import {
  3   |   actionHostFixture,
  4   |   actionClient,
  5   |   actionUrl,
  6   |   expectActionIsolation,
  7   | } from "./meri-action-host-fixtures";
  8   | 
  9   | const homeUrl = `/meri?clientId=${actionClient.id}`;
  10  | type ActionFixture = Awaited<ReturnType<typeof actionHostFixture>>;
  11  | type Destination = "home" | "actions";
  12  | 
  13  | /** Reach the real control in the sequential keyboard order, without focus(). */
  14  | async function tabTo(page: Page, target: Locator) {
  15  |   await expect(target).toBeVisible();
  16  |   for (let step = 0; step < 32; step += 1) {
  17  |     await page.keyboard.press("Tab");
  18  |     if (await target.evaluate((element) => element === document.activeElement))
  19  |       return;
  20  |   }
  21  |   await expect(target).toBeFocused();
  22  | }
  23  | 
  24  | async function expectRoute(
  25  |   page: Page,
  26  |   fixture: ActionFixture,
  27  |   destination: Destination,
  28  | ) {
  29  |   await expect(page).toHaveURL(destination === "home" ? homeUrl : actionUrl());
  30  |   if (destination === "home") {
  31  |     await expect(
  32  |       page.getByLabel("Message draft", { exact: true }),
  33  |     ).toBeVisible();
  34  |   } else {
  35  |     await expect(
  36  |       page.getByRole("button", { name: "Connect action service", exact: true }),
  37  |     ).toBeEnabled();
  38  |   }
  39  |   expect(fixture.calls("client").length).toBeGreaterThan(0);
  40  |   expect(fixture.actions()).toEqual([]);
  41  |   expectActionIsolation(fixture);
  42  | }
  43  | 
  44  | async function expectMobileRoute(
  45  |   page: Page,
  46  |   fixture: ActionFixture,
  47  |   destination: Destination,
  48  | ) {
  49  |   await expectRoute(page, fixture, destination);
  50  |   const home = page.getByRole("link", { name: "Conversations", exact: true });
  51  |   const actions = page.getByRole("link", {
  52  |     name: "Recommendation actions",
  53  |     exact: true,
  54  |   });
> 55  |   await expect(home).toHaveCount(1);
      |                      ^ Error: expect(locator).toHaveCount(expected) failed
  56  |   await expect(actions).toHaveCount(1);
  57  |   await expect(home).toBeVisible();
  58  |   await expect(actions).toBeVisible();
  59  |   await expect(home).toHaveAttribute("href", homeUrl);
  60  |   await expect(actions).toHaveAttribute("href", actionUrl());
  61  |   await expect(destination === "home" ? home : actions).toHaveAttribute(
  62  |     "aria-current",
  63  |     "page",
  64  |   );
  65  |   await expect(destination === "home" ? actions : home).not.toHaveAttribute(
  66  |     "aria-current",
  67  |     /.*/,
  68  |   );
  69  |   expect(
  70  |     await page.evaluate(() => document.documentElement.scrollWidth),
  71  |   ).toBeLessThanOrEqual(375);
  72  | }
  73  | 
  74  | test("375px Meri navigation preserves the verified client through keyboard and Back/Forward without action dispatch", async ({
  75  |   page,
  76  | }) => {
  77  |   await page.setViewportSize({ width: 375, height: 812 });
  78  |   const fixture = await actionHostFixture(page);
  79  |   await page.goto(homeUrl);
  80  |   await expectMobileRoute(page, fixture, "home");
  81  |   await tabTo(
  82  |     page,
  83  |     page.getByRole("link", { name: "Recommendation actions", exact: true }),
  84  |   );
  85  |   await page.keyboard.press("Enter");
  86  |   await expectMobileRoute(page, fixture, "actions");
  87  |   await tabTo(
  88  |     page,
  89  |     page.getByRole("link", { name: "Conversations", exact: true }),
  90  |   );
  91  |   await page.keyboard.press("Enter");
  92  |   await expectMobileRoute(page, fixture, "home");
  93  |   await page.goBack();
  94  |   await expectMobileRoute(page, fixture, "actions");
  95  |   await page.goBack();
  96  |   await expectMobileRoute(page, fixture, "home");
  97  |   await page.goForward();
  98  |   await expectMobileRoute(page, fixture, "actions");
  99  |   await page.goForward();
  100 |   await expectMobileRoute(page, fixture, "home");
  101 | });
  102 | 
  103 | test("1440px Meri retains one visible sidebar destination per route without duplicate mobile links", async ({
  104 |   page,
  105 | }) => {
  106 |   await page.setViewportSize({ width: 1440, height: 1000 });
  107 |   const fixture = await actionHostFixture(page);
  108 |   await page.goto(homeUrl);
  109 |   await expectRoute(page, fixture, "home");
  110 |   const sidebar = page.getByRole("complementary", { name: "Meri navigation" });
  111 |   const actions = page.getByRole("link", {
  112 |     name: "Recommendation actions",
  113 |     exact: true,
  114 |   });
  115 |   const home = page.getByRole("button", { name: "Conversations", exact: true });
  116 |   await expect(sidebar).toBeVisible();
  117 |   await expect(actions).toHaveCount(1);
  118 |   await expect(actions).toBeVisible();
  119 |   await expect(actions).toHaveAttribute("href", actionUrl());
  120 |   await expect(home).toHaveCount(1);
  121 |   await expect(home).toBeVisible();
  122 |   await expect(home).toHaveAttribute("aria-current", "page");
  123 |   await expect(actions).not.toHaveAttribute("aria-current", /.*/);
  124 |   await expect(
  125 |     page.getByRole("link", { name: "Conversations", exact: true }),
  126 |   ).toHaveCount(0);
  127 |   await tabTo(page, actions);
  128 |   await page.keyboard.press("Enter");
  129 |   await expectRoute(page, fixture, "actions");
  130 |   await expect(actions).toHaveCount(1);
  131 |   await expect(actions).toHaveAttribute("aria-current", "page");
  132 |   await expect(home).not.toHaveAttribute("aria-current", /.*/);
  133 |   await expect(home).toHaveCount(1);
  134 |   await expect(
  135 |     page.getByRole("link", { name: "Conversations", exact: true }),
  136 |   ).toHaveCount(0);
  137 |   await tabTo(page, home);
  138 |   await page.keyboard.press("Enter");
  139 |   await expectRoute(page, fixture, "home");
  140 |   await expect(home).toHaveAttribute("aria-current", "page");
  141 |   await expect(actions).not.toHaveAttribute("aria-current", /.*/);
  142 | });
  143 | 
```