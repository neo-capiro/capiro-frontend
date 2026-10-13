# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: calendar-visual-closeout.spec.ts >> compact Calendar retains scoped module navigation, history, source disclosures and mobile controls
- Location: test/browser/calendar-visual-closeout.spec.ts:6:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Agenda', exact: true })

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - link "Skip to content" [ref=e4] [cursor=pointer]:
      - /url: "#main-content"
    - banner [ref=e5]:
      - link "Capiro Home" [ref=e6] [cursor=pointer]:
        - /url: /
        - img "Capiro" [ref=e7]
      - navigation "Product modes" [ref=e8]:
        - link "Meri" [ref=e9] [cursor=pointer]:
          - /url: /meri
          - img [ref=e11]
        - link "Portfolio" [ref=e12] [cursor=pointer]:
          - /url: /
          - img [ref=e14]
        - link "Modules" [ref=e15] [cursor=pointer]:
          - /url: /modules
          - img [ref=e17]
      - navigation "Workspace actions" [ref=e18]:
        - link "Quick log" [ref=e19] [cursor=pointer]:
          - /url: /?log=1
          - img [ref=e21]
        - link "Master calendar" [ref=e22] [cursor=pointer]:
          - /url: /calendar
          - img [ref=e24]
        - link "Search intelligence" [ref=e25] [cursor=pointer]:
          - /url: /modules/intelligence
          - img [ref=e27]
        - button "Updates — unavailable" [disabled] [ref=e28]:
          - img [ref=e30]
        - link "Account settings" [ref=e31] [cursor=pointer]:
          - /url: /settings/personal
          - img [ref=e33]
    - generic [ref=e34]:
      - complementary [ref=e35]:
        - paragraph [ref=e36]: Modules
        - navigation "Modules" [ref=e37]:
          - link "Module hub" [ref=e38] [cursor=pointer]:
            - /url: /modules
            - img [ref=e40]
            - generic [ref=e41]: Module hub
          - link "Engagement" [ref=e42] [cursor=pointer]:
            - /url: /modules/engagement
            - img [ref=e44]
            - generic [ref=e45]: Engagement
          - link "Planner" [ref=e46] [cursor=pointer]:
            - /url: /modules/planner
            - img [ref=e48]
            - generic [ref=e49]: Planner
          - link "Calendar" [ref=e50] [cursor=pointer]:
            - /url: /modules/calendar
            - img [ref=e52]
            - generic [ref=e53]: Calendar
          - link "Workspace" [ref=e54] [cursor=pointer]:
            - /url: /modules/workspace
            - img [ref=e56]
            - generic [ref=e57]: Workspace
          - link "Strategies" [ref=e58] [cursor=pointer]:
            - /url: /modules/strategies
            - img [ref=e60]
            - generic [ref=e61]: Strategies
          - link "Directory" [ref=e62] [cursor=pointer]:
            - /url: /modules/directory
            - img [ref=e64]
            - generic [ref=e65]: Directory
          - link "Intelligence" [ref=e66] [cursor=pointer]:
            - /url: /modules/intelligence
            - img [ref=e68]
            - generic [ref=e69]: Intelligence
          - link "Research portfolios" [ref=e70] [cursor=pointer]:
            - /url: /modules/research-portfolios
            - img [ref=e72]
            - generic [ref=e73]: Research portfolios
        - link "Settings" [ref=e74] [cursor=pointer]:
          - /url: /settings/personal
          - img [ref=e76]
          - generic [ref=e77]: Settings
      - main [ref=e78]:
        - alert [ref=e79]:
          - heading "Selected client unavailable" [level=2] [ref=e80]
          - paragraph [ref=e81]: This client could not be verified for your current session. Return to Portfolio to choose a permitted client.
          - link "Open Portfolio" [ref=e82] [cursor=pointer]:
            - /url: /
  - paragraph [ref=e83]: Explicit local test fixture · synthetic identity and records
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | import { onlyLocalRequests, operationFixtures } from "./fixtures";
  3  | import { moduleRouteFixtures } from "./module-route-fixtures";
  4  | 
  5  | const clientId = "30000000-0000-4000-8000-000000000001";
  6  | test("compact Calendar retains scoped module navigation, history, source disclosures and mobile controls", async ({
  7  |   page,
  8  | }, info) => {
  9  |   await onlyLocalRequests(page);
  10 |   await page.clock.setFixedTime(new Date("2026-10-08T16:00:00Z"));
  11 |   await operationFixtures(page, {
  12 |     ...moduleRouteFixtures,
  13 |     "clients.list": [
  14 |       {
  15 |         id: clientId,
  16 |         name: "Synthetic Aerospace",
  17 |         status: "ACTIVE",
  18 |         profileStatus: "ACTIVE",
  19 |       },
  20 |     ],
  21 |     "clients.get": {
  22 |       id: clientId,
  23 |       name: "Synthetic Aerospace",
  24 |       status: "ACTIVE",
  25 |       profileStatus: "ACTIVE",
  26 |     },
  27 |   });
  28 |   await page.goto(`/modules/calendar?clientId=${clientId}`);
> 29 |   await page.getByRole("button", { name: "Agenda", exact: true }).click();
     |                                                                   ^ Error: locator.click: Test timeout of 30000ms exceeded.
  30 |   const heading = page.getByRole("heading", {
  31 |     name: "Master calendar",
  32 |     exact: true,
  33 |   });
  34 |   expect((await heading.boundingBox())!.x).toBe(264);
  35 |   expect((await heading.boundingBox())!.y).toBeLessThan(150);
  36 |   expect(
  37 |     (await page
  38 |       .getByRole("button", { name: "Today", exact: true })
  39 |       .boundingBox())!.y,
  40 |   ).toBeLessThan(220);
  41 |   await expect(
  42 |     page.getByRole("navigation", { name: "Modules", exact: true }),
  43 |   ).toBeVisible();
  44 |   const disclosure = page
  45 |     .locator("summary")
  46 |     .filter({ hasText: "Master calendar" });
  47 |   await disclosure.focus();
  48 |   await disclosure.press("Enter");
  49 |   const switcher = page.getByRole("combobox", { name: "Switch module" });
  50 |   await expect(switcher).toBeVisible();
  51 |   await switcher.focus();
  52 |   await page.keyboard.press("Escape");
  53 |   await expect(disclosure).toBeFocused();
  54 |   await expect(switcher).not.toBeVisible();
  55 |   await disclosure.press("Enter");
  56 |   await switcher.click();
  57 |   await page.getByRole("option", { name: "Planner", exact: true }).click();
  58 |   await expect(page).toHaveURL(`/modules/planner?clientId=${clientId}`);
  59 |   await page.goBack();
  60 |   await expect(heading).toBeVisible();
  61 |   await page.goForward();
  62 |   await expect(page).toHaveURL(`/modules/planner?clientId=${clientId}`);
  63 |   await page.goBack();
  64 |   await page.getByLabel("Calendar client scope").selectOption("");
  65 |   await page.getByRole("button", { name: "Agenda", exact: true }).click();
  66 |   await expect(page.getByText(/Government unavailable:/)).toBeVisible();
  67 |   await expect(
  68 |     page.getByRole("button", { name: /Government Unavailable/ }),
  69 |   ).toBeVisible();
  70 |   await expect(page.getByLabel("Search displayed events")).toBeVisible();
  71 |   for (const asset of [
  72 |     "filter",
  73 |     "scope-chevron",
  74 |     "previous",
  75 |     "next",
  76 |     "check",
  77 |   ]) {
  78 |     const response = await page.request.get(
  79 |       `/design/modules/calendar/${asset}.svg`,
  80 |     );
  81 |     expect(response.ok()).toBe(true);
  82 |     expect(await response.text()).toContain("<svg");
  83 |   }
  84 |   await page.screenshot({
  85 |     path: info.outputPath("calendar-desktop-after.png"),
  86 |   });
  87 |   await page.setViewportSize({ width: 390, height: 844 });
  88 |   expect(
  89 |     await page.evaluate(
  90 |       () => document.documentElement.scrollWidth <= innerWidth,
  91 |     ),
  92 |   ).toBe(true);
  93 |   await page.getByLabel("Search displayed events").fill("synthetic");
  94 |   await expect(page.getByLabel("Search displayed events")).toHaveValue(
  95 |     "synthetic",
  96 |   );
  97 |   await page.screenshot({ path: info.outputPath("calendar-mobile-after.png") });
  98 | });
  99 | 
```