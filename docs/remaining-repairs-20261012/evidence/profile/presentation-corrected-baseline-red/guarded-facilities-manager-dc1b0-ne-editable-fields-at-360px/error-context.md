# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: guarded.spec.ts >> facilities manager shows saved cards and inline editable fields at 360px
- Location: apps/web/tests/browser/profile-presentation.spec.ts:92:7

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByRole('dialog', { name: 'Facilities: Test Aerospace', exact: true }).getByRole('list', { name: 'Saved facilities' })
Expected substring: "Synthetic lab"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for getByRole('dialog', { name: 'Facilities: Test Aerospace', exact: true }).getByRole('list', { name: 'Saved facilities' })

```

```yaml
- dialog "Add facility":
  - banner:
    - heading "Add facility" [level=2]
    - button "Close"
  - paragraph: Location for Test Aerospace. Complete the address to request automatic geocoding.
  - group "Facility details":
    - text: Facility details Facility name
    - textbox "Facility name"
    - text: Street address
    - textbox "Street address"
    - text: City
    - textbox "City"
    - text: State / territory
    - textbox "State / territory":
      - /placeholder: CA
    - text: ZIP code
    - textbox "ZIP code"
    - text: Employees
    - spinbutton "Employees"
    - text: Congressional district
    - textbox "Congressional district":
      - /placeholder: 12 or 00
    - text: State House district
    - textbox "State House district"
    - text: State Senate district
    - textbox "State Senate district"
    - paragraph: Use a bare House district number, or 00 for at-large. Leave districts blank to resolve from the address. A later successful geocode can replace manual state districts.
    - text: Notes
    - textbox "Notes"
  - button "Cancel"
  - button "Add facility"
```

# Test source

```ts
  7   |   id,
  8   |   kind,
  9   |   occurredAt,
  10  |   title: `${kind} ${id}`,
  11  |   body: "Synthetic activity detail",
  12  |   origin: "recorded",
  13  |   sourceId: null,
  14  |   sourceType: null,
  15  |   dueAt: null,
  16  |   settledAt: null,
  17  |   pinned: false,
  18  | });
  19  | const file = {
  20  |   id: "60000000-0000-4000-8000-000000000001",
  21  |   clientId,
  22  |   fileName: "Report.pdf",
  23  |   contentType: "application/pdf",
  24  |   byteSize: 512,
  25  |   source: "manual",
  26  |   folder: "Reports",
  27  |   viewerMode: "all",
  28  |   viewerUserIds: [],
  29  |   uploadedByUserId: null,
  30  |   createdAt: "2026-10-01T12:00:00Z",
  31  |   lifecycleStatus: "active",
  32  |   scanStatus: "clean",
  33  |   extractionStatus: "extracted",
  34  |   indexedAt: null,
  35  | };
  36  | async function setup(page: Page) {
  37  |   const unexpected = await installFixtures(page);
  38  |   const dates = await page.evaluate(() => {
  39  |     const today = new Date();
  40  |     const yesterday = new Date(today);
  41  |     yesterday.setDate(yesterday.getDate() - 1);
  42  |     return [today.toISOString(), yesterday.toISOString()];
  43  |   });
  44  |   const activities = [
  45  |     activity("today", "call", dates[0]!),
  46  |     activity("yesterday", "note", dates[1]!),
  47  |   ];
  48  |   await page.route("**/intelligence/district-nexus/boundaries?*", (route) =>
  49  |     json(route, {
  50  |       status: "current",
  51  |       vintage: "119",
  52  |       generatedAt: "2026-10-11T00:00:00Z",
  53  |       districtCount: 2,
  54  |       source: "census_cartographic_500k",
  55  |       hash: "synthetic-boundary",
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
> 107 |     ).toContainText("Synthetic lab");
      |       ^ Error: expect(locator).toContainText(expected) failed
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
  156 |     ).toBeVisible();
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
```