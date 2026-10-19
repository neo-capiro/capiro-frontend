# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: modules.spec.ts >> Engagement Manager primary route renders through the canonical session/API boundary
- Location: test/browser/modules.spec.ts:16:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Engagement Manager', exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('heading', { name: 'Engagement Manager', exact: true })

```

```yaml
- link "Skip to content":
  - /url: "#main-content"
- banner:
  - link "Capiro Home":
    - /url: /
    - img "Capiro"
  - button "Toggle sidebar" [expanded]
  - navigation "Product modes":
    - link "Meri":
      - /url: /meri
    - link "Portfolio":
      - /url: /
    - link "Modules":
      - /url: /modules
  - navigation "Workspace actions":
    - link "Quick log":
      - /url: /?log=1
    - link "Master calendar":
      - /url: /calendar
    - link "Search intelligence":
      - /url: /modules/intelligence
    - button "Updates — unavailable" [disabled]
    - link "Account settings":
      - /url: /settings/personal
- complementary:
  - paragraph: Modules
  - navigation "Modules":
    - link "Module hub":
      - /url: /modules
    - link "Engagement":
      - /url: /modules/engagement
    - link "Planner":
      - /url: /modules/planner
    - link "Calendar":
      - /url: /modules/calendar
    - link "Workspace":
      - /url: /modules/workspace
    - link "Strategies":
      - /url: /modules/strategies
    - link "Directory":
      - /url: /modules/directory
    - link "Intelligence":
      - /url: /modules/intelligence
    - link "Research portfolios":
      - /url: /modules/research-portfolios
  - link "Settings":
    - /url: /settings/personal
- main:
  - navigation "Breadcrumb":
    - link "← Modules":
      - /url: /modules
    - combobox "Switch module": Engagement
  - heading "Engagement" [level=1]
  - paragraph: Your draft and sent campaigns. Open one to continue, or start a new campaign.
  - combobox "Engagement client scope":
    - option "All permitted clients" [selected]
  - searchbox "Search outreach"
  - button "+ New outreach"
  - text: From
  - textbox "From": 2025-10-19
  - text: To
  - textbox "To": 2026-10-19
  - checkbox "Show deleted"
  - text: Show deleted
  - region "Campaign drafts":
    - heading "Campaign drafts" [level=2]
    - button "+ New campaign"
    - table "Outreach campaigns":
      - caption: Outreach campaigns
      - rowgroup:
        - row "Campaign Goal Targets Status Date":
          - columnheader "Campaign"
          - columnheader "Goal"
          - columnheader "Targets"
          - columnheader "Status"
          - columnheader "Date"
      - rowgroup:
        - row "No records found":
          - cell "No records found"
  - region "Outreach drafts":
    - heading "Outreach record drafts" [level=2]
    - table "Outreach records":
      - caption: Outreach records
      - rowgroup:
        - row "Outreach Client Type Recipients Status Created":
          - columnheader "Outreach"
          - columnheader "Client"
          - columnheader "Type"
          - columnheader "Recipients"
          - columnheader "Status"
          - columnheader "Created"
      - rowgroup:
        - row "No records found":
          - cell "No records found"
  - paragraph: Editing a draft does not send mail. Delivery requires an audited immutable draft and a reviewed send intent.
- complementary "Local test fixture": Explicit local test fixture · synthetic identity and records
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | import { operationFixtures, onlyLocalRequests } from "./fixtures";
  3  | import { moduleRouteFixtures } from "./module-route-fixtures";
  4  |
  5  | const routes = [
  6  |   { slug: "engagement", heading: "Engagement Manager" },
  7  |   { slug: "planner", heading: "Planner" },
  8  |   { slug: "calendar", heading: "Master calendar" },
  9  |   { slug: "workspace", heading: "Workspace" },
  10 |   { slug: "strategies", heading: "Strategies" },
  11 |   { slug: "directory", heading: "Directory" },
  12 |   { slug: "intelligence", heading: "Intelligence Center" },
  13 |   { slug: "research-portfolios", heading: "Research Portfolios" },
  14 | ];
  15 | for (const { slug, heading } of routes)
  16 |   test(`${heading} primary route renders through the canonical session/API boundary`, async ({
  17 |     page,
  18 |   }) => {
  19 |     const failures: string[] = [];
  20 |     page.on("pageerror", (error) => failures.push(error.message));
  21 |     page.on("response", (response) => {
  22 |       if (response.url().includes("/api/capiro/") && !response.ok())
  23 |         failures.push(
  24 |           `${response.status()}:${new URL(response.url()).pathname}`,
  25 |         );
  26 |     });
  27 |     await onlyLocalRequests(page);
  28 |     await operationFixtures(page, moduleRouteFixtures);
  29 |     await page.goto(`/modules/${slug}`);
  30 |     await expect(
  31 |       page.getByRole("heading", { name: heading, exact: true }),
> 32 |     ).toBeVisible();
     |       ^ Error: expect(locator).toBeVisible() failed
  33 |     await expect(page.getByRole("main")).not.toContainText("Loading…");
  34 |     await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  35 |     expect(failures).toEqual([]);
  36 |     await page.screenshot({
  37 |       path: `test-results/module-${slug}.png`,
  38 |       fullPage: true,
  39 |       animations: "disabled",
  40 |     });
  41 |   });
  42 |
```
