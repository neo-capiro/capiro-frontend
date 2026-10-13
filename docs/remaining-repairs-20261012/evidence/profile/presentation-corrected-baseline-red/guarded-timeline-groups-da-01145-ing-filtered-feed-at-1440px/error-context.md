# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: guarded.spec.ts >> timeline groups dates and expands the existing filtered feed at 1440px
- Location: apps/web/tests/browser/profile-presentation.spec.ts:144:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('region', { name: 'Activity timeline', exact: true }).getByRole('heading', { name: 'Today', exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('region', { name: 'Activity timeline', exact: true }).getByRole('heading', { name: 'Today', exact: true })

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
    - paragraph: 1 locations · 1 states · 1 districts
    - button "Add facility"
    - button "Open district map"
    - list:
      - listitem:
        - button "Synthetic lab CA-01 12 staff":
          - strong: Synthetic lab
          - text: CA-01 12 staff
    - region "Geographic facility map":
      - group "Current congressional districts and facility pins":
        - button "District CA-01"
        - button "District VA-08"
      - button "Open facility Synthetic lab"
      - button "Zoom in"
      - button "Zoom out" [disabled]
      - button "Pan left": ←
      - button "Pan right": →
      - button "Reset map": ↺
      - paragraph: Current boundaries · 119 · 2 districts. Alaska and Hawaii use separate insets. Drag empty map space or focus the map and use arrow keys to pan, plus/minus to zoom.
  - heading "Client calendar" [level=2]
  - link "Open client calendar":
    - /url: /portfolio/10000000-0000-4000-8000-000000000001/calendar
  - paragraph: Meetings, preparation, notes and debriefs for this client.
  - link "Open calendar":
    - /url: /portfolio/10000000-0000-4000-8000-000000000001/calendar
  - region "Activity timeline":
    - paragraph: Relationship history
    - heading "Activity timeline" [level=2]
    - text: Search activity
    - searchbox "Search activity"
    - button "Activity type": All activity
    - 'button "Activity dates: All dates"': All dates
    - list:
      - listitem:
        - strong: call today
        - time: 10/12/2026, 8:11:25 PM
        - 'button "Activity actions: call today"': ⋯
        - text: call
        - paragraph: Synthetic activity detail
      - listitem:
        - strong: note yesterday
        - time: 10/11/2026, 8:11:25 PM
        - 'button "Activity actions: note yesterday"': ⋯
        - text: note
        - paragraph: Synthetic activity detail
```

# Test source

```ts
  56  |       warnings: [],
  57  |     }),
  58  |   );
  59  |   await page.route(
  60  |     "**/intelligence/district-nexus/boundaries/C/geojson",
  61  |     (route) => json(route, boundaryFixture),
  62  |   );
  63  |   await page.route(`**/clients/${clientId}/facilities`, (route) =>
  64  |     json(route, [facility]),
  65  |   );
  66  |   await page.route(`**/clients/${clientId}/activity*`, (route) =>
  67  |     json(route, activities),
  68  |   );
  69  |   await page.route("**/engagement/attachments?**", (route) =>
  70  |     json(route, [
  71  |       file,
  72  |       {
  73  |         ...file,
  74  |         id: "60000000-0000-4000-8000-000000000002",
  75  |         fileName: "Capability.txt",
  76  |         contentType: "text/plain",
  77  |         source: "capability:40000000-0000-4000-8000-000000000001",
  78  |         folder: null,
  79  |       },
  80  |     ]),
  81  |   );
  82  |   return unexpected;
  83  | }
  84  | async function fit(page: Page) {
  85  |   expect(
  86  |     await page.evaluate(
  87  |       () => document.documentElement.scrollWidth <= innerWidth,
  88  |     ),
  89  |   ).toBe(true);
  90  | }
  91  | for (const width of [1440, 360]) {
  92  |   test(`facilities manager shows saved cards and inline editable fields at ${width}px`, async ({
  93  |     page,
  94  |   }, info) => {
  95  |     await page.setViewportSize({ width, height: 1040 });
  96  |     const unexpected = await setup(page);
  97  |     await page.goto(`/portfolio/${clientId}`);
  98  |     await page
  99  |       .getByRole("button", { name: "Add facility", exact: true })
  100 |       .click();
  101 |     const dialog = page.getByRole("dialog", {
  102 |       name: "Facilities: Test Aerospace",
  103 |       exact: true,
  104 |     });
  105 |     await expect(
  106 |       dialog.getByRole("list", { name: "Saved facilities" }),
  107 |     ).toContainText("Synthetic lab");
  108 |     await expect(
  109 |       dialog.getByRole("combobox", { name: "State / territory" }),
  110 |     ).toBeVisible();
  111 |     const city = await dialog.getByLabel("City", { exact: true }).boundingBox();
  112 |     const state = await dialog
  113 |       .getByLabel("State / territory", { exact: true })
  114 |       .boundingBox();
  115 |     const zip = await dialog
  116 |       .getByLabel("ZIP code", { exact: true })
  117 |       .boundingBox();
  118 |     if (width === 1440) {
  119 |       expect((await dialog.boundingBox())!.width).toBe(700);
  120 |       expect(city!.y).toBe(state!.y);
  121 |       expect(state!.y).toBe(zip!.y);
  122 |     } else expect(state!.y).toBeGreaterThan(city!.y);
  123 |     await dialog.getByRole("button", { name: "Edit", exact: true }).click();
  124 |     await expect(
  125 |       dialog.getByLabel("Facility name", { exact: true }),
  126 |     ).toHaveValue(facility.name);
  127 |     await expect(
  128 |       dialog.getByLabel("State / territory", { exact: true }),
  129 |     ).toHaveValue("CA");
  130 |     await dialog.getByRole("button", { name: "Done", exact: true }).focus();
  131 |     await page.keyboard.press("Tab");
  132 |     expect(
  133 |       await dialog.evaluate((element) =>
  134 |         element.contains(document.activeElement),
  135 |       ),
  136 |     ).toBe(true);
  137 |     await page.screenshot({
  138 |       path: info.outputPath(`facilities-${width}.png`),
  139 |       fullPage: true,
  140 |     });
  141 |     await fit(page);
  142 |     expect(unexpected).toEqual([]);
  143 |   });
  144 |   test(`timeline groups dates and expands the existing filtered feed at ${width}px`, async ({
  145 |     page,
  146 |   }, info) => {
  147 |     await page.setViewportSize({ width, height: 1040 });
  148 |     const unexpected = await setup(page);
  149 |     await page.goto(`/portfolio/${clientId}`);
  150 |     const timeline = page.getByRole("region", {
  151 |       name: "Activity timeline",
  152 |       exact: true,
  153 |     });
  154 |     await expect(
  155 |       timeline.getByRole("heading", { name: "Today", exact: true }),
> 156 |     ).toBeVisible();
      |       ^ Error: expect(locator).toBeVisible() failed
  157 |     await expect(
  158 |       timeline.getByRole("heading", { name: "Yesterday", exact: true }),
  159 |     ).toBeVisible();
  160 |     await expect(timeline.locator("ol > li").first()).toHaveCSS(
  161 |       "min-height",
  162 |       "70px",
  163 |     );
  164 |     await timeline.screenshot({
  165 |       path: info.outputPath(`timeline-default-${width}.png`),
  166 |     });
  167 |     await timeline
  168 |       .getByRole("searchbox", { name: "Search activity", exact: true })
  169 |       .fill("call");
  170 |     await timeline
  171 |       .getByRole("button", { name: "Expand timeline ↗", exact: true })
  172 |       .click();
  173 |     const expanded = page.getByRole("dialog", {
  174 |       name: "Engagement timeline",
  175 |       exact: true,
  176 |     });
  177 |     await expect(
  178 |       expanded.getByRole("searchbox", { name: "Search activity", exact: true }),
  179 |     ).toHaveValue("call");
  180 |     await expect(
  181 |       expanded.getByText("call today", { exact: true }),
  182 |     ).toBeVisible();
  183 |     await expect(
  184 |       expanded.getByText("note yesterday", { exact: true }),
  185 |     ).not.toBeVisible();
  186 |     const icon = expanded.locator('img[src$="phone.svg"]');
  187 |     await expect(icon).toHaveJSProperty("complete", true);
  188 |     expect(
  189 |       await icon.evaluate(
  190 |         (element) =>
  191 |           element instanceof HTMLImageElement &&
  192 |           element.complete &&
  193 |           element.naturalWidth === 16,
  194 |       ),
  195 |     ).toBe(true);
  196 |     await expanded
  197 |       .getByRole("searchbox", { name: "Search activity", exact: true })
  198 |       .fill("");
  199 |     await expect(
  200 |       expanded.getByRole("button", {
  201 |         name: "Activity actions: note yesterday",
  202 |         exact: true,
  203 |       }),
  204 |     ).toHaveCount(0);
  205 |     await page.screenshot({
  206 |       path: info.outputPath(`timeline-expanded-${width}.png`),
  207 |       fullPage: true,
  208 |     });
  209 |     await page.keyboard.press("Tab");
  210 |     expect(
  211 |       await expanded.evaluate((element) =>
  212 |         element.contains(document.activeElement),
  213 |       ),
  214 |     ).toBe(true);
  215 |     await expanded
  216 |       .getByRole("button", { name: "Log activity", exact: true })
  217 |       .click();
  218 |     const quickLog = page.getByRole("dialog", {
  219 |       name: "Quick log",
  220 |       exact: true,
  221 |     });
  222 |     await expect(quickLog.getByLabel("Title", { exact: true })).toBeFocused();
  223 |     await page.keyboard.press("Escape");
  224 |     await expect(quickLog).not.toBeVisible();
  225 |     await expect(expanded).not.toBeVisible();
  226 |     await expect(
  227 |       timeline.getByText("note yesterday", { exact: true }),
  228 |     ).toBeVisible();
  229 |     await fit(page);
  230 |     expect(unexpected).toEqual([]);
  231 |   });
  232 |   test(`Files source chips and folder cards retain native provenance at ${width}px`, async ({
  233 |     page,
  234 |   }, info) => {
  235 |     await page.setViewportSize({ width, height: 1040 });
  236 |     const unexpected = await setup(page);
  237 |     await page.goto(`/portfolio/${clientId}/files`);
  238 |     const sources = page.getByRole("group", {
  239 |       name: "File source",
  240 |       exact: true,
  241 |     });
  242 |     await sources.getByRole("button", { name: "manual", exact: true }).click();
  243 |     await expect(
  244 |       page.getByRole("button", { name: "pdf Report.pdf", exact: true }),
  245 |     ).toBeVisible();
  246 |     await expect(
  247 |       page.getByRole("button", { name: "txt Capability.txt", exact: true }),
  248 |     ).not.toBeVisible();
  249 |     await sources.getByRole("button", { name: "All", exact: true }).click();
  250 |     await page
  251 |       .getByRole("group", { name: "File view" })
  252 |       .getByRole("button", { name: "Folders", exact: true })
  253 |       .click();
  254 |     await expect(
  255 |       page.getByRole("button", { name: "Open folder Reports", exact: true }),
  256 |     ).toContainText("1 file");
```