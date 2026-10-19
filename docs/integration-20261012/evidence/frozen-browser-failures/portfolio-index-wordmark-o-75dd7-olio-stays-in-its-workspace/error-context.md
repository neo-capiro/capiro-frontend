# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: portfolio-index.spec.ts >> wordmark opens the configured Dashboard while Portfolio stays in its workspace
- Location: tests/browser/portfolio-index.spec.ts:40:1

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator: getByRole('link', { name: 'Capiro dashboard' })
Expected: "http://127.0.0.1:5191/existing/"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toHaveAttribute" with timeout 5000ms
  - waiting for getByRole('link', { name: 'Capiro dashboard' })

```

```yaml
- link "Skip to content":
  - /url: "#main"
- banner:
  - link "Capiro Home":
    - /url: /
    - img "Capiro"
  - navigation "Workspace":
    - link "Meri":
      - /url: /meri
    - link "Portfolio":
      - /url: /
    - link "Modules":
      - /url: /modules
  - navigation "Global actions":
    - link "Quick log":
      - /url: /portfolio?log=1
    - link "Master calendar":
      - /url: /calendar
    - link "Search Portfolio":
      - /url: /portfolio?search=1
    - button "Updates unavailable" [disabled]
    - button "Test account": T
- complementary "Portfolio navigation":
  - paragraph: Portfolio
  - navigation "Portfolio":
    - link "Portfolio Overview":
      - /url: /portfolio
      - text: Overview
    - link "Portfolio Clients":
      - /url: /portfolio?type=CLIENT
      - text: Clients
    - link "Portfolio Prospects":
      - /url: /portfolio/prospects
      - text: Prospects
  - link "Settings":
    - /url: /settings
- main:
  - paragraph: Your client portfolio
  - heading "Portfolio 2" [level=1]
  - textbox "Search profiles":
    - /placeholder: Search profiles…
  - button "New objective"
  - button "Add profile"
  - region "Portfolio pulse":
    - paragraph: Portfolio pulse
    - strong: —
    - text: of work linked to an objective
    - strong: "2"
    - text: Clients
    - strong: —
    - text: Need attention
    - strong: —
    - text: Objectives
    - strong: —
    - text: Off track
    - strong: —
    - text: Strategies
  - combobox "Profile status":
    - option "All statuses" [selected]
    - option "ACTIVE"
    - option "ONBOARDING"
  - combobox "Sector":
    - option "All sectors" [selected]
    - option "Aerospace"
    - option "Energy"
    - option "Homeland Security"
    - option "Manufacturing"
  - combobox "Account owner":
    - option "All owners" [selected]
    - option "Unassigned"
    - option "Sam Owner"
  - combobox "Sort profiles":
    - option "Saved order" [selected]
    - option "Recently added"
    - option "Name A–Z"
  - button "List view"
  - button "Card view" [pressed]
  - region "Portfolio profiles":
    - navigation "Profile type":
      - button "All 2" [pressed]
      - button "Clients 2"
      - link "Prospects":
        - /url: /portfolio/prospects
      - link "Pipeline":
        - /url: /portfolio/prospects?pipeline=1
    - status: 2 profiles
    - button "Refresh profiles"
    - region "Organization profile order":
      - status:
        - text: Saved profile ordering is unavailable in this environment. Profiles use their default order.
        - button "Retry saved order"
      - article:
        - link "Open Zephyr Aerospace":
          - /url: /portfolio/10000000-0000-4000-8000-000000000001
          - text: ZA
          - heading "Zephyr Aerospace" [level=3]
          - text: Aerospace
        - text: ACTIVE SO
      - button "Drag Zephyr Aerospace to rearrange" [disabled]
      - text: 1 of 2
      - button "Move Zephyr Aerospace earlier" [disabled]
      - button "Move Zephyr Aerospace later" [disabled]
      - article:
        - link "Open Alpha Energy":
          - /url: /portfolio/10000000-0000-4000-8000-000000000002
          - text: AE
          - heading "Alpha Energy" [level=3]
          - text: Energy · New York, NY
        - text: ONBOARDING —
      - button "Drag Alpha Energy to rearrange" [disabled]
      - text: 2 of 2
      - button "Move Alpha Energy earlier" [disabled]
      - button "Move Alpha Energy later" [disabled]
      - paragraph: Drag any card to rearrange · your layout is saved to your profile
      - status
    - button "+ Add profile"
  - complementary "Needs attention":
    - heading "Needs attention" [level=3]
    - text: 0 shown ↑↓ Most urgent
    - paragraph: Updates automatically. Open an item in its client profile.
    - status: No alerts were returned for your accessible clients. Coverage is incomplete; this does not confirm there is nothing to review.
    - paragraph: "Limited feed: up to 50 alerts from the first 40 active clients, with up to 20 per client. Some sources may be unavailable."
    - text: Snapshot
    - time: Oct 11, 6:00 AM UTC
    - button "Refresh alerts"
```

# Test source

```ts
  1   | import { test, expect, type Page } from "@playwright/test";
  2   | import { client, clientId, installFixtures, json } from "./fixtures";
  3   | const secondId = "10000000-0000-4000-8000-000000000002";
  4   | const rows = [
  5   |   { ...client, name: "Zephyr Aerospace" },
  6   |   {
  7   |     ...client,
  8   |     id: secondId,
  9   |     name: "Alpha Energy",
  10  |     sectorTag: "ENERGY",
  11  |     profileStatus: "ONBOARDING",
  12  |     intakeData: {
  13  |       city: "New York",
  14  |       state: "NY",
  15  |       sectors: ["ENERGY", "Manufacturing", "HOMELAND_SECURITY"],
  16  |     },
  17  |   },
  18  | ];
  19  | const assignments = {
  20  |   [clientId]: {
  21  |     accountOwnerUserId: "owner-1",
  22  |     accountOwner: {
  23  |       id: "owner-1",
  24  |       firstName: "Sam",
  25  |       lastName: "Owner",
  26  |       email: "sam@example.test",
  27  |     },
  28  |   },
  29  |   [secondId]: { accountOwnerUserId: null, accountOwner: null },
  30  | };
  31  | async function indexFixtures(page: Page) {
  32  |   const unexpected = await installFixtures(page);
  33  |   await page.route("**/api/backend/core/clients", (route) => json(route, rows));
  34  |   await page.route("**/api/backend/core/client-account-owners", (route) =>
  35  |     json(route, assignments),
  36  |   );
  37  |   return unexpected;
  38  | }
  39  | 
  40  | test("wordmark opens the configured Dashboard while Portfolio stays in its workspace", async ({
  41  |   page,
  42  | }) => {
  43  |   const unexpected = await indexFixtures(page);
  44  |   await page.goto("/portfolio");
  45  |   await expect(
  46  |     page.getByRole("link", { name: "Capiro dashboard" }),
> 47  |   ).toHaveAttribute("href", "http://127.0.0.1:5191/existing/");
      |     ^ Error: expect(locator).toHaveAttribute(expected) failed
  48  |   await expect(
  49  |     page.getByRole("navigation", { name: "Workspace" }).getByRole("link", {
  50  |       name: "Portfolio",
  51  |     }),
  52  |   ).toHaveAttribute("href", "/portfolio");
  53  |   expect(unexpected).toEqual([]);
  54  | });
  55  | 
  56  | test("deep links restore combined filters and legacy layout; clearing preserves chosen presentation", async ({
  57  |   page,
  58  | }) => {
  59  |   const unexpected = await indexFixtures(page);
  60  |   await page.goto(
  61  |     "/portfolio?layout=list&q=sam%20owner&status=ACTIVE&sector=Aerospace&owner=owner-1&type=CLIENT&sort=name",
  62  |   );
  63  |   const table = page.getByRole("table", { name: "Portfolio profiles" });
  64  |   await expect(table.getByRole("row")).toHaveCount(2);
  65  |   await expect(table).toContainText("Zephyr Aerospace");
  66  |   await expect(page.getByRole("button", { name: "List view" })).toHaveAttribute(
  67  |     "aria-pressed",
  68  |     "true",
  69  |   );
  70  |   await expect(page.getByLabel("Account owner", { exact: true })).toHaveValue(
  71  |     "owner-1",
  72  |   );
  73  |   await expect(
  74  |     page.getByRole("region", { name: "Portfolio profiles" }),
  75  |   ).toContainText("1 profile of 2");
  76  |   await page
  77  |     .getByRole("button", { name: "Clear filters", exact: true })
  78  |     .click();
  79  |   await expect(page).toHaveURL(/layout=list&sort=name$/);
  80  |   await expect(table.getByRole("row")).toHaveCount(3);
  81  |   await expect(table.getByRole("row").nth(1)).toContainText("Alpha Energy");
  82  |   await page.screenshot({
  83  |     path: "work/index/list-desktop.png",
  84  |     fullPage: true,
  85  |   });
  86  |   await page.reload();
  87  |   await expect(table.getByRole("row").nth(1)).toContainText("Alpha Energy");
  88  |   await page.getByRole("button", { name: "Card view" }).click();
  89  |   await expect(page).toHaveURL(/sort=name&view=cards$/);
  90  |   await expect(page.getByRole("article").first()).toContainText("Alpha Energy");
  91  |   await page.getByLabel("Sort profiles").selectOption("recent");
  92  |   await expect(page.getByRole("article").first()).toContainText(
  93  |     "Zephyr Aerospace",
  94  |   );
  95  |   await expect(page.locator(".page")).toHaveCSS("padding-top", "36px");
  96  |   await page.screenshot({
  97  |     path: "work/index/cards-desktop.png",
  98  |     fullPage: true,
  99  |   });
  100 |   await expect(
  101 |     page.getByRole("link", { name: "Open Zephyr Aerospace" }),
  102 |   ).toHaveAttribute("href", `/portfolio/${clientId}`);
  103 |   await expect(
  104 |     page
  105 |       .getByRole("navigation", { name: "Profile type" })
  106 |       .getByRole("link", { name: "Pipeline", exact: true }),
  107 |   ).toHaveAttribute("href", "/portfolio/prospects?pipeline=1");
  108 |   expect(unexpected).toEqual([]);
  109 | });
  110 | 
  111 | test("real fields drive search/status/sector/known unassigned; no matching results has a clear recovery", async ({
  112 |   page,
  113 | }) => {
  114 |   const unexpected = await indexFixtures(page);
  115 |   await page.goto("/portfolio");
  116 |   await page.getByLabel("Search profiles").fill("Energy");
  117 |   await page.getByLabel("Sector", { exact: true }).selectOption("ENERGY");
  118 |   await page
  119 |     .getByLabel("Profile status", { exact: true })
  120 |     .selectOption("ONBOARDING");
  121 |   await page
  122 |     .getByLabel("Account owner", { exact: true })
  123 |     .selectOption("unassigned");
  124 |   await expect(page.getByRole("article")).toHaveCount(1);
  125 |   await expect(page.getByRole("article")).toContainText("Alpha Energy");
  126 |   await expect(page.getByRole("article")).toContainText(
  127 |     "Energy · New York, NY",
  128 |   );
  129 |   await page
  130 |     .getByLabel("Sector", { exact: true })
  131 |     .selectOption("Manufacturing");
  132 |   await page.getByLabel("Search profiles").fill("Manufacturing");
  133 |   await expect(page.getByRole("article")).toHaveCount(1);
  134 |   await expect(page.getByRole("article")).toContainText("Alpha Energy");
  135 |   await page
  136 |     .getByLabel("Sector", { exact: true })
  137 |     .selectOption("HOMELAND_SECURITY");
  138 |   await expect(page.getByLabel("Sector", { exact: true })).toContainText(
  139 |     "Homeland Security",
  140 |   );
  141 |   await page.getByLabel("Search profiles").fill("Homeland Security");
  142 |   await expect(page.getByRole("article")).toHaveCount(1);
  143 |   await page.getByLabel("Search profiles").fill("New York, NY");
  144 |   await expect(page.getByRole("article")).toHaveCount(1);
  145 |   await expect(page.getByRole("article")).toContainText("Alpha Energy");
  146 |   await page.getByLabel("Search profiles").fill("Not a real organization");
  147 |   await expect(
```