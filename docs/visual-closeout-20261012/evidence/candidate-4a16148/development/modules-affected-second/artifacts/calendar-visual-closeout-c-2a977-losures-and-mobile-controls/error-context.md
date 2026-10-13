# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: calendar-visual-closeout.spec.ts >> compact Calendar retains scoped module navigation, history, source disclosures and mobile controls
- Location: test/browser/calendar-visual-closeout.spec.ts:6:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByLabel('Search displayed events')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByLabel('Search displayed events')

```

```yaml
- link "Skip to content":
  - /url: "#main-content"
- banner:
  - link "Capiro Home":
    - /url: /
    - img "Capiro"
  - navigation "Product modes":
    - link "Meri":
      - /url: /meri?clientId=30000000-0000-4000-8000-000000000001
    - link "Portfolio":
      - /url: /portfolio/30000000-0000-4000-8000-000000000001
    - link "Modules":
      - /url: /modules?clientId=30000000-0000-4000-8000-000000000001
  - navigation "Workspace actions":
    - link "Quick log":
      - /url: /?log=1
    - link "Master calendar":
      - /url: /calendar?clientId=30000000-0000-4000-8000-000000000001
    - link "Search intelligence":
      - /url: /modules/intelligence?clientId=30000000-0000-4000-8000-000000000001
    - button "Updates — unavailable" [disabled]
    - link "Account settings":
      - /url: /settings/personal
- complementary:
  - paragraph: Modules
  - navigation "Modules":
    - link "Module hub":
      - /url: /modules?clientId=30000000-0000-4000-8000-000000000001
    - link "Engagement":
      - /url: /modules/engagement?clientId=30000000-0000-4000-8000-000000000001
    - link "Planner":
      - /url: /modules/planner?clientId=30000000-0000-4000-8000-000000000001
    - link "Calendar":
      - /url: /modules/calendar?clientId=30000000-0000-4000-8000-000000000001
    - link "Workspace":
      - /url: /modules/workspace?clientId=30000000-0000-4000-8000-000000000001
    - link "Strategies":
      - /url: /modules/strategies?clientId=30000000-0000-4000-8000-000000000001
    - link "Directory":
      - /url: /modules/directory?clientId=30000000-0000-4000-8000-000000000001
    - link "Intelligence":
      - /url: /modules/intelligence?clientId=30000000-0000-4000-8000-000000000001
    - link "Research portfolios":
      - /url: /modules/research-portfolios?clientId=30000000-0000-4000-8000-000000000001
  - link "Settings":
    - /url: /settings/personal
- main:
  - group: Master calendar
  - heading "Master calendar" [level=1]
  - combobox "Calendar client scope":
    - option "Master view" [selected]
    - option "Synthetic Aerospace"
  - button "New meeting"
  - region "Master calendar":
    - button "Previous calendar period"
    - button "Today"
    - button "Next calendar period"
    - button "Choose calendar date": October 2026
    - paragraph: 0 items in view · Eastern time
    - button "Month"
    - button "Week"
    - button "Agenda" [pressed]
    - button "Meetings 0" [pressed]
    - button "Hearings Unavailable" [pressed]
    - button "Planner 0" [pressed]
    - button "Government Unavailable" [pressed]
    - button "Deadlines 0" [pressed]
    - paragraph: Master view · All client profiles · Your accessible meetings
    - textbox "Search calendar events":
      - /placeholder: Search displayed events
    - button "Clear filters"
    - table:
      - rowgroup:
        - row "When Event Source":
          - columnheader "When"
          - columnheader "Event"
          - columnheader "Source"
      - rowgroup
    - heading "No events match this view" [level=2]
    - paragraph: Adjust your filters or add a record to get started.
    - note:
      - paragraph: "Government unavailable: Unconfigured test operation: calendar.effectiveDates"
      - paragraph: "Hearings unavailable: Unconfigured test operation: legiwatch.calendar"
      - paragraph: "Federal Register deadlines unavailable: Unconfigured test operation: calendar.commentDeadlines"
      - paragraph: "Funding deadlines unavailable: Unconfigured test operation: intelligence.funding.search"
- paragraph: Explicit local test fixture · synthetic identity and records
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | import { onlyLocalRequests, operationFixtures } from "./fixtures";
  3   | import { moduleRouteFixtures } from "./module-route-fixtures";
  4   | 
  5   | const clientId = "30000000-0000-4000-8000-000000000001";
  6   | test("compact Calendar retains scoped module navigation, history, source disclosures and mobile controls", async ({
  7   |   page,
  8   | }, info) => {
  9   |   await onlyLocalRequests(page);
  10  |   await page.clock.setFixedTime(new Date("2026-10-08T16:00:00Z"));
  11  |   await operationFixtures(page, {
  12  |     ...moduleRouteFixtures,
  13  |     "clients.list": [
  14  |       {
  15  |         id: clientId,
  16  |         name: "Synthetic Aerospace",
  17  |         status: "ACTIVE",
  18  |         profileStatus: "ACTIVE",
  19  |       },
  20  |     ],
  21  |   });
  22  |   await page.route(`**/api/backend/core/clients/${clientId}`, (route) =>
  23  |     route.fulfill({
  24  |       json: {
  25  |         id: clientId,
  26  |         name: "Synthetic Aerospace",
  27  |         status: "ACTIVE",
  28  |         profileStatus: "ACTIVE",
  29  |       },
  30  |     }),
  31  |   );
  32  |   await page.goto(`/modules/calendar?clientId=${clientId}`);
  33  |   await page.getByRole("button", { name: "Agenda", exact: true }).click();
  34  |   const heading = page.getByRole("heading", {
  35  |     name: "Master calendar",
  36  |     exact: true,
  37  |   });
  38  |   expect((await heading.boundingBox())!.x).toBe(264);
  39  |   expect((await heading.boundingBox())!.y).toBeLessThan(150);
  40  |   expect(
  41  |     (await page
  42  |       .getByRole("button", { name: "Today", exact: true })
  43  |       .boundingBox())!.y,
  44  |   ).toBeLessThan(220);
  45  |   await expect(
  46  |     page.getByRole("navigation", { name: "Modules", exact: true }),
  47  |   ).toBeVisible();
  48  |   const disclosure = page
  49  |     .locator("summary")
  50  |     .filter({ hasText: "Master calendar" });
  51  |   await disclosure.focus();
  52  |   await disclosure.press("Enter");
  53  |   const switcher = page.getByRole("combobox", { name: "Switch module" });
  54  |   await expect(switcher).toBeVisible();
  55  |   await switcher.focus();
  56  |   await page.keyboard.press("Escape");
  57  |   await expect(disclosure).toBeFocused();
  58  |   await expect(switcher).not.toBeVisible();
  59  |   await disclosure.press("Enter");
  60  |   await switcher.click();
  61  |   await page.getByRole("option", { name: "Planner", exact: true }).click();
  62  |   await expect(page).toHaveURL(`/modules/planner?clientId=${clientId}`);
  63  |   await page.goBack();
  64  |   await expect(heading).toBeVisible();
  65  |   await page.goForward();
  66  |   await expect(page).toHaveURL(`/modules/planner?clientId=${clientId}`);
  67  |   await page.goBack();
  68  |   await page.getByLabel("Calendar client scope").selectOption("");
  69  |   await page.getByRole("button", { name: "Agenda", exact: true }).click();
  70  |   await expect(page.getByText(/Government unavailable:/)).toBeVisible();
  71  |   await expect(
  72  |     page.getByRole("button", { name: /Government Unavailable/ }),
  73  |   ).toBeVisible();
> 74  |   await expect(page.getByLabel("Search displayed events")).toBeVisible();
      |                                                            ^ Error: expect(locator).toBeVisible() failed
  75  |   for (const asset of [
  76  |     "filter",
  77  |     "scope-chevron",
  78  |     "previous",
  79  |     "next",
  80  |     "check",
  81  |   ]) {
  82  |     const response = await page.request.get(
  83  |       `/design/modules/calendar/${asset}.svg`,
  84  |     );
  85  |     expect(response.ok()).toBe(true);
  86  |     expect(await response.text()).toContain("<svg");
  87  |   }
  88  |   await page.screenshot({
  89  |     path: info.outputPath("calendar-desktop-after.png"),
  90  |   });
  91  |   await page.setViewportSize({ width: 390, height: 844 });
  92  |   expect(
  93  |     await page.evaluate(
  94  |       () => document.documentElement.scrollWidth <= innerWidth,
  95  |     ),
  96  |   ).toBe(true);
  97  |   await page.getByLabel("Search displayed events").fill("synthetic");
  98  |   await expect(page.getByLabel("Search displayed events")).toHaveValue(
  99  |     "synthetic",
  100 |   );
  101 |   await page.screenshot({ path: info.outputPath("calendar-mobile-after.png") });
  102 | });
  103 | 
```