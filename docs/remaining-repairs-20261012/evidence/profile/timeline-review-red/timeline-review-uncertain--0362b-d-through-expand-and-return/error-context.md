# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: timeline-review.spec.ts >> uncertain activity stays fenced through expand and return
- Location: apps/web/tests/browser/timeline-presentation-lifetime.spec.ts:26:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('region', { name: 'Activity timeline', exact: true }).getByRole('button', { name: 'Review latest activity', exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('region', { name: 'Activity timeline', exact: true }).getByRole('button', { name: 'Review latest activity', exact: true })

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
      - /url: /portfolio/10000000-0000-4000-8000-000000000001?log=1
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
  - separator
  - paragraph: Test Aerospace
  - navigation "Client":
    - link "Overview":
      - /url: /portfolio/10000000-0000-4000-8000-000000000001
    - link "Objectives":
      - /url: /portfolio/10000000-0000-4000-8000-000000000001/objectives
    - link "Calendar":
      - /url: /portfolio/10000000-0000-4000-8000-000000000001/calendar
    - link "Relationships":
      - /url: /portfolio/10000000-0000-4000-8000-000000000001/relationships
    - link "Work":
      - /url: /portfolio/10000000-0000-4000-8000-000000000001/work
    - link "Capabilities":
      - /url: /portfolio/10000000-0000-4000-8000-000000000001/capabilities
    - link "Bill Tracker":
      - /url: /portfolio/10000000-0000-4000-8000-000000000001/bills
    - link "Opportunities":
      - /url: /portfolio/10000000-0000-4000-8000-000000000001/opportunities
    - link "Files":
      - /url: /portfolio/10000000-0000-4000-8000-000000000001/files
  - link "Settings":
    - /url: /settings
- main:
  - navigation "Breadcrumb":
    - link "Back to Portfolio":
      - /url: /portfolio
    - link "Portfolio":
      - /url: /portfolio
    - link "Test Aerospace":
      - /url: /portfolio/10000000-0000-4000-8000-000000000001
    - 'button "Switch client view: Overview"': Overview
  - button "Quick add"
  - button "Meri actions"
  - button "More actions for Test Aerospace"
  - paragraph: Client profile
  - heading "Overview" [level=1]
  - button "Notes"
  - link "New objective":
    - /url: /portfolio/10000000-0000-4000-8000-000000000001/objectives?new=1
  - text: TA
  - heading "Test Aerospace" [level=1]
  - text: ACTIVE Aerospace ·
  - link "https://example.test":
    - /url: https://example.test/
  - paragraph: Synthetic organization for isolated UI validation.
  - text: Focus
  - button "+ Add focus tag"
  - text: Owner Unassigned
  - button "Account team · 0"
  - region "Engagement pulse":
    - heading "Engagement pulse" [level=2]
    - link "Open timeline →":
      - /url: "#activity-timeline"
    - strong: "2"
    - paragraph: Recent activity items
    - strong: "0"
    - paragraph: Account team
    - strong: —
    - paragraph: Objective coverage unavailable
  - heading "Objectives" [level=2]
  - link "New objective":
    - /url: /portfolio/10000000-0000-4000-8000-000000000001/objectives?new=1
  - link "Test outcome Draft Test minimum win":
    - /url: /portfolio/10000000-0000-4000-8000-000000000001/objectives?objective=30000000-0000-4000-8000-000000000001
    - strong: Test outcome
    - text: Draft
    - paragraph: Test minimum win
  - link "View objectives":
    - /url: /portfolio/10000000-0000-4000-8000-000000000001/objectives
  - region "District nexus":
    - heading "District nexus" [level=2]
    - paragraph: 0 locations · 0 states · 0 districts
    - button "Add facility"
    - button "Open district map"
    - list
    - img "United States map illustration. No coordinate pins are available."
    - paragraph: No facilities yet. Add a location with the plus action.
  - heading "Client calendar" [level=2]
  - link "Open client calendar":
    - /url: /portfolio/10000000-0000-4000-8000-000000000001/calendar
  - paragraph: Meetings, preparation, notes and debriefs for this client.
  - link "Open calendar":
    - /url: /portfolio/10000000-0000-4000-8000-000000000001/calendar
  - region "Activity timeline":
    - heading "Activity timeline" [level=2]
    - button "Expand timeline ↗"
    - text: Search activity
    - searchbox "Search activity"
    - button "Activity type": All activity
    - 'button "Activity dates: All dates"': All dates
    - region "Today":
      - heading "Today" [level=3]
      - list:
        - listitem:
          - strong: Newer note
          - time: 12:00 PM
          - 'button "Activity actions: Newer note"': ⋯
          - text: note
          - paragraph: Recorded detail
    - region "Yesterday":
      - heading "Yesterday" [level=3]
      - list:
        - listitem:
          - strong: Uncertain timeline note
          - time: 12:00 PM
          - 'button "Activity actions: Uncertain timeline note"': ⋯
          - text: note
          - paragraph: Recorded detail
    - text: 2 activities
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | import { clientId, installFixtures, json } from "./fixtures";
  3   | const note = {
  4   |   id: "90000000-0000-4000-8000-000000000001",
  5   |   kind: "note",
  6   |   title: "Uncertain timeline note",
  7   |   body: "Recorded detail",
  8   |   occurredAt: "2026-10-11T12:00:00Z",
  9   |   origin: "recorded",
  10  |   sourceType: null,
  11  |   sourceId: null,
  12  |   dueAt: null,
  13  |   settledAt: null,
  14  |   pinned: false,
  15  | };
  16  | const newer = {
  17  |   ...note,
  18  |   id: "90000000-0000-4000-8000-000000000002",
  19  |   title: "Newer note",
  20  |   occurredAt: "2026-10-12T12:00:00Z",
  21  | };
  22  | for (const transition of [
  23  |   "expand and return",
  24  |   "native pinned regrouping",
  25  | ] as const)
  26  |   test(`uncertain activity stays fenced through ${transition}`, async ({
  27  |     page,
  28  |   }) => {
  29  |     const unexpected = await installFixtures(page);
  30  |     let current = [newer, note];
  31  |     let writes = 0;
  32  |     await page.route(`**/clients/${clientId}/activity**`, (route) => {
  33  |       if (route.request().method() === "GET") return json(route, current);
  34  |       writes++;
  35  |       if (transition === "native pinned regrouping")
  36  |         current = [{ ...note, pinned: true }, newer];
  37  |       return json(route, { message: "Synthetic uncertain timeline pin" }, 503);
  38  |     });
  39  |     await page.goto(`/portfolio/${clientId}`);
  40  |     const timeline = page.getByRole("region", {
  41  |       name: "Activity timeline",
  42  |       exact: true,
  43  |     });
  44  |     await timeline
  45  |       .getByRole("button", {
  46  |         name: `Activity actions: ${note.title}`,
  47  |         exact: true,
  48  |       })
  49  |       .click();
  50  |     await page.getByRole("menuitem", { name: "Pin note", exact: true }).click();
  51  |     await expect.poll(() => writes).toBe(1);
  52  |     if (transition === "expand and return") {
  53  |       await expect(
  54  |         timeline.getByRole("button", {
  55  |           name: "Review latest activity",
  56  |           exact: true,
  57  |         }),
  58  |       ).toBeVisible();
  59  |       await timeline
  60  |         .getByRole("button", { name: "Expand timeline ↗", exact: true })
  61  |         .click();
  62  |       await page
  63  |         .getByRole("dialog", { name: "Engagement timeline", exact: true })
  64  |         .getByRole("button", { name: "Return to profile", exact: true })
  65  |         .click();
  66  |     }
  67  |     await expect(
  68  |       timeline.getByRole("button", {
  69  |         name: "Review latest activity",
  70  |         exact: true,
  71  |       }),
> 72  |     ).toBeVisible();
      |       ^ Error: expect(locator).toBeVisible() failed
  73  |     await timeline
  74  |       .getByRole("button", {
  75  |         name: `Activity actions: ${note.title}`,
  76  |         exact: true,
  77  |       })
  78  |       .click();
  79  |     await expect(
  80  |       page.getByRole("menuitem", { name: /^Pin note$|^Unpin note$/ }),
  81  |     ).toHaveAttribute("data-disabled", "");
  82  |     await page.keyboard.press("Escape");
  83  |     expect(writes).toBe(1);
  84  |     expect(unexpected).toEqual([]);
  85  |   });
  86  | 
  87  | test("pending activity stays fenced while its response is held across expand and return", async ({
  88  |   page,
  89  | }) => {
  90  |   const unexpected = await installFixtures(page);
  91  |   let writes = 0;
  92  |   let release!: () => void;
  93  |   const pending = new Promise<void>((resolve) => {
  94  |     release = resolve;
  95  |   });
  96  |   await page.route(`**/clients/${clientId}/activity**`, async (route) => {
  97  |     if (route.request().method() === "GET") return json(route, [note]);
  98  |     writes++;
  99  |     await pending;
  100 |     return json(route, { message: "Synthetic held pin reply" }, 503).catch(
  101 |       () => {},
  102 |     );
  103 |   });
  104 |   await page.goto(`/portfolio/${clientId}`);
  105 |   const timeline = page.getByRole("region", {
  106 |     name: "Activity timeline",
  107 |     exact: true,
  108 |   });
  109 |   const action = timeline.getByRole("button", {
  110 |     name: `Activity actions: ${note.title}`,
  111 |     exact: true,
  112 |   });
  113 |   await action.click();
  114 |   await page.getByRole("menuitem", { name: "Pin note", exact: true }).click();
  115 |   await expect.poll(() => writes).toBe(1);
  116 |   try {
  117 |     await timeline
  118 |       .getByRole("button", { name: "Expand timeline ↗", exact: true })
  119 |       .click();
  120 |     await page
  121 |       .getByRole("dialog", { name: "Engagement timeline", exact: true })
  122 |       .getByRole("button", { name: "Return to profile", exact: true })
  123 |       .click();
  124 |     await expect(action).toBeDisabled();
  125 |   } finally {
  126 |     release();
  127 |   }
  128 |   await expect(
  129 |     timeline.getByRole("button", {
  130 |       name: "Review latest activity",
  131 |       exact: true,
  132 |     }),
  133 |   ).toBeVisible();
  134 |   expect(writes).toBe(1);
  135 |   expect(unexpected).toEqual([]);
  136 | });
  137 | 
  138 | test("expanded Log activity reuses the existing Quick log uncertain creation owner", async ({
  139 |   page,
  140 | }) => {
  141 |   const unexpected = await installFixtures(page);
  142 |   let writes = 0;
  143 |   await page.route(`**/clients/${clientId}/activity**`, (route) => {
  144 |     if (route.request().method() === "GET") return json(route, [note]);
  145 |     writes++;
  146 |     return json(route, { message: "Synthetic uncertain new activity" }, 503);
  147 |   });
  148 |   await page.goto(`/portfolio/${clientId}?log=1&context=preserved`);
  149 |   const log = page.getByRole("dialog", { name: "Quick log", exact: true });
  150 |   await log
  151 |     .getByLabel("Title", { exact: true })
  152 |     .fill("Uncertain original activity");
  153 |   await log.getByRole("button", { name: "Save activity", exact: true }).click();
  154 |   await expect(log.getByText(/save result is uncertain/i)).toBeVisible();
  155 |   await log.getByRole("button", { name: "Close", exact: true }).click();
  156 |   const timeline = page.getByRole("region", {
  157 |     name: "Activity timeline",
  158 |     exact: true,
  159 |   });
  160 |   await timeline
  161 |     .getByRole("button", { name: "Expand timeline ↗", exact: true })
  162 |     .click();
  163 |   await page
  164 |     .getByRole("dialog", { name: "Engagement timeline", exact: true })
  165 |     .getByRole("button", { name: "Log activity", exact: true })
  166 |     .click();
  167 |   await expect(
  168 |     log.getByRole("button", { name: "Save activity", exact: true }),
  169 |   ).toBeDisabled();
  170 |   await expect(log.getByText(/save result is uncertain/i)).toBeVisible();
  171 |   expect(new URL(page.url()).searchParams.get("context")).toBe("preserved");
  172 |   expect(new URL(page.url()).searchParams.get("log")).toBe("1");
```