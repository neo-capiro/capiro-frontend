# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: capability-list-registration-layout.spec.ts >> phone capability rows retain native content and keyboard selection in light
- Location: tests/browser/capability-list-registration-layout.spec.ts:25:3

# Error details

```
Error: expect(locator).toBeHidden() failed

Locator:  locator('section').filter({ hasText: 'Capability areas' }).getByRole('button').first().locator('.monogram')
Expected: hidden
Received: visible
Timeout:  5000ms

Call log:
  - Expect "toBeHidden" with timeout 5000ms
  - waiting for locator('section').filter({ hasText: 'Capability areas' }).getByRole('button').first().locator('.monogram')
    14 × locator resolved to <span class="monogram">▦</span>
       - unexpected value "visible"

```

```yaml
- text: ▦
```

# Test source

```ts
  1   | import { expect, test } from "@playwright/test";
  2   | import { capability, clientId, json } from "./fixtures";
  3   | import { installCapabilityBoundary } from "./capability-boundary-fixtures";
  4   | import {
  5   |   installRegistrationBoundary,
  6   |   openRegistrations,
  7   |   registrationClient,
  8   | } from "./capability-registration-fixtures";
  9   | 
  10  | const areas = [
  11  |   { name: "Counter-UAS interceptors", trl: 6, peNumbers: ["0604134A"] },
  12  |   { name: "Autonomy software stack", trl: 9, peNumbers: ["0603461A"] },
  13  |   { name: "Sensor fusion", trl: 2, peNumbers: [] },
  14  |   { name: "Maritime autonomy", trl: null, peNumbers: [], peNumber: "0604454N" },
  15  | ].map((area, index) => ({
  16  |   ...capability,
  17  |   id: `20000000-0000-4000-8000-00000000000${index + 1}`,
  18  |   peNumber: null,
  19  |   description:
  20  |     "A supplied capability description remains available in its editor.",
  21  |   ...area,
  22  | }));
  23  | 
  24  | for (const colorScheme of ["light", "dark"] as const)
  25  |   test(`phone capability rows retain native content and keyboard selection in ${colorScheme}`, async ({
  26  |     page,
  27  |   }, info) => {
  28  |     const unexpected = await installCapabilityBoundary(page);
  29  |     await page.route(`**/core/clients/${clientId}/capabilities`, (route) =>
  30  |       json(route, areas),
  31  |     );
  32  |     await page.setViewportSize({ width: 390, height: 844 });
  33  |     await page.emulateMedia({ colorScheme });
  34  |     await page.goto(`/portfolio/${clientId}/capabilities`);
  35  |     const section = page
  36  |       .locator("section")
  37  |       .filter({ hasText: "Capability areas" });
  38  |     const rows = section.getByRole("button");
  39  |     await expect(rows).toHaveCount(4);
  40  |     const first = rows.first();
> 41  |     await expect(first.locator(".monogram")).toBeHidden();
      |                                              ^ Error: expect(locator).toBeHidden() failed
  42  |     await expect(
  43  |       first.getByText(areas[0]!.description, { exact: true }),
  44  |     ).toBeHidden();
  45  |     await expect(first).toContainText("PE 0604134A");
  46  |     await expect(rows.nth(1)).toContainText("Fielded");
  47  |     await expect(rows.nth(2)).toContainText("Research");
  48  |     await expect(rows.nth(2)).toContainText("No program line mapped");
  49  |     await expect(rows.nth(3)).toContainText("Not set");
  50  |     await expect(rows.nth(3)).toContainText("PE 0604454N");
  51  |     const geometry = await rows.evaluateAll((elements) =>
  52  |       elements.map((node) => {
  53  |         const bounds = node.getBoundingClientRect();
  54  |         const style = getComputedStyle(node);
  55  |         const title = node.querySelector("strong")!.getBoundingClientRect();
  56  |         const badge = node.querySelector(".chip")!.getBoundingClientRect();
  57  |         const mapping = node.querySelector("small")!.getBoundingClientRect();
  58  |         return {
  59  |           height: bounds.height,
  60  |           padding: [
  61  |             style.paddingTop,
  62  |             style.paddingRight,
  63  |             style.paddingBottom,
  64  |             style.paddingLeft,
  65  |           ],
  66  |           radius: style.borderRadius,
  67  |           titleY: title.y,
  68  |           badgeY: badge.y,
  69  |           mappingY: mapping.y,
  70  |           titleBottom: title.bottom,
  71  |           width: bounds.width,
  72  |         };
  73  |       }),
  74  |     );
  75  |     for (const row of geometry) {
  76  |       expect(row.height).toBeLessThan(85);
  77  |       expect(row.padding).toEqual(["12px", "16px", "12px", "16px"]);
  78  |       expect(row.radius).toBe("0px");
  79  |       expect(Math.abs(row.titleY - row.badgeY)).toBeLessThan(2);
  80  |       expect(row.mappingY - row.titleBottom).toBeGreaterThanOrEqual(6);
  81  |       expect(row.width).toBeGreaterThan(350);
  82  |     }
  83  |     await expect(section.locator("header")).toContainText(
  84  |       "Capability areas · 4",
  85  |     );
  86  |     await page.screenshot({
  87  |       path: info.outputPath(`compact-list-${colorScheme}.png`),
  88  |       fullPage: true,
  89  |     });
  90  |     await first.focus();
  91  |     await page.keyboard.press("Enter");
  92  |     const editor = page.getByRole("dialog", {
  93  |       name: `Capability: ${areas[0]!.name}`,
  94  |       exact: true,
  95  |     });
  96  |     await expect(editor).toBeVisible();
  97  |     await expect(editor.getByLabel("Description", { exact: true })).toHaveValue(
  98  |       areas[0]!.description,
  99  |     );
  100 |     await page.keyboard.press("Escape");
  101 |     await expect(editor).toHaveCount(0);
  102 |     await expect(first).toBeFocused();
  103 |     expect(unexpected).toEqual([]);
  104 |   });
  105 | 
  106 | test("compact rows wrap long supplied content and desktop retains descriptive cards", async ({
  107 |   page,
  108 | }, info) => {
  109 |   const unexpected = await installCapabilityBoundary(page);
  110 |   const long = {
  111 |     ...areas[0]!,
  112 |     name: "Long supplied capability name ".repeat(5),
  113 |     peNumbers: ["0604134A", "0603461A", "0604454N", "0605603A"],
  114 |   };
  115 |   await page.route(`**/core/clients/${clientId}/capabilities`, (route) =>
  116 |     json(route, [long]),
  117 |   );
  118 |   await page.setViewportSize({ width: 320, height: 844 });
  119 |   await page.goto(`/portfolio/${clientId}/capabilities`);
  120 |   const card = page
  121 |     .locator("section")
  122 |     .filter({ hasText: "Capability areas" })
  123 |     .getByRole("button");
  124 |   await expect(card).toContainText(long.name.trim());
  125 |   expect(
  126 |     await card.evaluate((node) => node.scrollWidth <= node.clientWidth),
  127 |   ).toBe(true);
  128 |   expect(
  129 |     await page.evaluate(
  130 |       () => document.documentElement.scrollWidth <= innerWidth,
  131 |     ),
  132 |   ).toBe(true);
  133 |   await page.screenshot({
  134 |     path: info.outputPath("compact-long-320.png"),
  135 |     fullPage: true,
  136 |   });
  137 |   await page.setViewportSize({ width: 1440, height: 1040 });
  138 |   await expect(card.locator(".monogram")).toBeVisible();
  139 |   await expect(card.getByText(long.description, { exact: true })).toBeVisible();
  140 |   expect((await card.boundingBox())!.height).toBeGreaterThanOrEqual(168);
  141 |   await page.screenshot({
```