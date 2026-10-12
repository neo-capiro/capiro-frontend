# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: guarded.spec.ts >> facilities manager shows saved cards and inline editable fields at 360px
- Location: apps/web/tests/browser/profile-presentation.spec.ts:71:7

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
  1   | import { test, expect, type Page } from "@playwright/test";
  2   | import { clientId, installFixtures, json } from "./fixtures";
  3   | import { facility } from "../facility-map-fixtures";
  4   | import type { Activity } from "../../src/features/portfolio/client-profile/contracts";
  5   | 
  6   | const activity = (id: string, kind: string, occurredAt: string): Activity => ({
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
  19  | const activities = [
  20  |   activity("today", "call", "2026-10-12T12:00:00Z"),
  21  |   activity("yesterday", "note", "2026-10-11T12:00:00Z"),
  22  | ];
  23  | const file = {
  24  |   id: "60000000-0000-4000-8000-000000000001",
  25  |   clientId,
  26  |   fileName: "Report.pdf",
  27  |   contentType: "application/pdf",
  28  |   byteSize: 512,
  29  |   source: "manual",
  30  |   folder: "Reports",
  31  |   viewerMode: "all",
  32  |   viewerUserIds: [],
  33  |   uploadedByUserId: null,
  34  |   createdAt: "2026-10-01T12:00:00Z",
  35  |   lifecycleStatus: "active",
  36  |   scanStatus: "clean",
  37  |   extractionStatus: "extracted",
  38  |   indexedAt: null,
  39  | };
  40  | async function setup(page: Page) {
  41  |   const unexpected = await installFixtures(page);
  42  |   await page.route(`**/clients/${clientId}/facilities`, (route) =>
  43  |     json(route, [facility]),
  44  |   );
  45  |   await page.route(`**/clients/${clientId}/activity*`, (route) =>
  46  |     json(route, activities),
  47  |   );
  48  |   await page.route("**/engagement/attachments?**", (route) =>
  49  |     json(route, [
  50  |       file,
  51  |       {
  52  |         ...file,
  53  |         id: "60000000-0000-4000-8000-000000000002",
  54  |         fileName: "Capability.txt",
  55  |         contentType: "text/plain",
  56  |         source: "capability:40000000-0000-4000-8000-000000000001",
  57  |         folder: null,
  58  |       },
  59  |     ]),
  60  |   );
  61  |   return unexpected;
  62  | }
  63  | async function fit(page: Page) {
  64  |   expect(
  65  |     await page.evaluate(
  66  |       () => document.documentElement.scrollWidth <= innerWidth,
  67  |     ),
  68  |   ).toBe(true);
  69  | }
  70  | for (const width of [1440, 360]) {
  71  |   test(`facilities manager shows saved cards and inline editable fields at ${width}px`, async ({
  72  |     page,
  73  |   }, info) => {
  74  |     await page.setViewportSize({ width, height: 1040 });
  75  |     const unexpected = await setup(page);
  76  |     await page.goto(`/portfolio/${clientId}`);
  77  |     await page
  78  |       .getByRole("button", { name: "Add facility", exact: true })
  79  |       .click();
  80  |     const dialog = page.getByRole("dialog", {
  81  |       name: "Facilities: Test Aerospace",
  82  |       exact: true,
  83  |     });
  84  |     await expect(
  85  |       dialog.getByRole("list", { name: "Saved facilities" }),
> 86  |     ).toContainText("Synthetic lab");
      |       ^ Error: expect(locator).toContainText(expected) failed
  87  |     await expect(
  88  |       dialog.getByRole("combobox", { name: "State / territory" }),
  89  |     ).toBeVisible();
  90  |     const city = await dialog.getByLabel("City", { exact: true }).boundingBox();
  91  |     const state = await dialog
  92  |       .getByLabel("State / territory", { exact: true })
  93  |       .boundingBox();
  94  |     const zip = await dialog
  95  |       .getByLabel("ZIP code", { exact: true })
  96  |       .boundingBox();
  97  |     if (width === 1440) {
  98  |       expect((await dialog.boundingBox())!.width).toBe(700);
  99  |       expect(city!.y).toBe(state!.y);
  100 |       expect(state!.y).toBe(zip!.y);
  101 |     } else expect(state!.y).toBeGreaterThan(city!.y);
  102 |     await dialog.getByRole("button", { name: "Edit", exact: true }).click();
  103 |     await expect(
  104 |       dialog.getByLabel("Facility name", { exact: true }),
  105 |     ).toHaveValue(facility.name);
  106 |     await expect(
  107 |       dialog.getByLabel("State / territory", { exact: true }),
  108 |     ).toHaveValue("CA");
  109 |     await dialog.getByRole("button", { name: "Done", exact: true }).focus();
  110 |     await page.keyboard.press("Tab");
  111 |     expect(
  112 |       await dialog.evaluate((element) =>
  113 |         element.contains(document.activeElement),
  114 |       ),
  115 |     ).toBe(true);
  116 |     await page.screenshot({
  117 |       path: info.outputPath(`facilities-${width}.png`),
  118 |       fullPage: true,
  119 |     });
  120 |     await fit(page);
  121 |     expect(unexpected).toEqual([]);
  122 |   });
  123 |   test(`timeline groups dates and expands the existing filtered feed at ${width}px`, async ({
  124 |     page,
  125 |   }, info) => {
  126 |     await page.setViewportSize({ width, height: 1040 });
  127 |     await page.clock.setFixedTime(new Date("2026-10-12T18:00:00Z"));
  128 |     const unexpected = await setup(page);
  129 |     await page.goto(`/portfolio/${clientId}`);
  130 |     const timeline = page.getByRole("region", {
  131 |       name: "Activity timeline",
  132 |       exact: true,
  133 |     });
  134 |     await expect(
  135 |       timeline.getByRole("heading", { name: "Today", exact: true }),
  136 |     ).toBeVisible();
  137 |     await expect(
  138 |       timeline.getByRole("heading", { name: "Yesterday", exact: true }),
  139 |     ).toBeVisible();
  140 |     await expect(timeline.locator("ol > li").first()).toHaveCSS(
  141 |       "min-height",
  142 |       "70px",
  143 |     );
  144 |     await timeline.screenshot({
  145 |       path: info.outputPath(`timeline-default-${width}.png`),
  146 |     });
  147 |     await timeline
  148 |       .getByRole("searchbox", { name: "Search activity", exact: true })
  149 |       .fill("call");
  150 |     await timeline
  151 |       .getByRole("button", { name: "Expand timeline ↗", exact: true })
  152 |       .click();
  153 |     const expanded = page.getByRole("dialog", {
  154 |       name: "Engagement timeline",
  155 |       exact: true,
  156 |     });
  157 |     await expect(
  158 |       expanded.getByRole("searchbox", { name: "Search activity", exact: true }),
  159 |     ).toHaveValue("call");
  160 |     await expect(
  161 |       expanded.getByText("call today", { exact: true }),
  162 |     ).toBeVisible();
  163 |     await expect(
  164 |       expanded.getByText("note yesterday", { exact: true }),
  165 |     ).not.toBeVisible();
  166 |     const icon = expanded.locator('img[src$="phone.svg"]');
  167 |     await expect(icon).toHaveJSProperty("complete", true);
  168 |     expect(
  169 |       await icon.evaluate(
  170 |         (element) =>
  171 |           element instanceof HTMLImageElement &&
  172 |           element.complete &&
  173 |           element.naturalWidth === 16,
  174 |       ),
  175 |     ).toBe(true);
  176 |     await expanded
  177 |       .getByRole("searchbox", { name: "Search activity", exact: true })
  178 |       .fill("");
  179 |     await expect(
  180 |       expanded.getByRole("button", {
  181 |         name: "Activity actions: note yesterday",
  182 |         exact: true,
  183 |       }),
  184 |     ).toHaveCount(0);
  185 |     await page.screenshot({
  186 |       path: info.outputPath(`timeline-expanded-${width}.png`),
```