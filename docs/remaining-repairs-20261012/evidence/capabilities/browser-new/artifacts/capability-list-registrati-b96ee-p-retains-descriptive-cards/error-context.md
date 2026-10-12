# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: capability-list-registration-layout.spec.ts >> compact rows wrap long supplied content and desktop retains descriptive cards
- Location: tests/browser/capability-list-registration-layout.spec.ts:106:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - link "Skip to content" [ref=e3] [cursor=pointer]:
    - /url: "#main"
  - banner [ref=e4]:
    - button "Toggle navigation" [ref=e5] [cursor=pointer]:
      - img [ref=e6]
    - link "Capiro Home" [ref=e7] [cursor=pointer]:
      - /url: /
      - img "Capiro" [ref=e8]
    - button "Switch workspace" [ref=e10] [cursor=pointer]
    - navigation "Global actions" [ref=e11]:
      - link "Quick log" [ref=e12] [cursor=pointer]:
        - /url: /portfolio/10000000-0000-4000-8000-000000000001?log=1
      - link "Master calendar" [ref=e13] [cursor=pointer]:
        - /url: /calendar
      - link "Search Portfolio" [ref=e14] [cursor=pointer]:
        - /url: /portfolio?search=1
      - button "Updates unavailable" [disabled] [ref=e15]
      - button "Test account" [ref=e17] [cursor=pointer]: T
  - main [ref=e19]:
    - generic [ref=e20]:
      - generic [ref=e21]:
        - navigation "Breadcrumb" [ref=e22]:
          - link "Back to Portfolio" [ref=e23] [cursor=pointer]:
            - /url: /portfolio
          - link "Portfolio" [ref=e24] [cursor=pointer]:
            - /url: /portfolio
          - generic [ref=e25]: /
          - link "Test Aerospace" [ref=e26] [cursor=pointer]:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001
          - generic [ref=e27]: /
          - 'button "Switch client view: Capabilities" [ref=e28] [cursor=pointer]': Capabilities
        - generic [ref=e29]:
          - button "Quick add" [ref=e30] [cursor=pointer]:
            - generic [ref=e31]: Quick add
          - button "Meri actions" [ref=e32] [cursor=pointer]:
            - generic [ref=e33]: Meri actions
          - button "More actions for Test Aerospace" [ref=e34] [cursor=pointer]:
            - img [ref=e35]
      - region "Client identity" [ref=e39]:
        - generic [ref=e40]: TA
        - generic [ref=e41]:
          - strong [ref=e42]: Test Aerospace
          - paragraph [ref=e43]: Aerospace
        - generic [ref=e44]: active client
    - generic [ref=e46]:
      - generic [ref=e47]:
        - heading "Capabilities" [level=1] [ref=e48]
        - generic [ref=e49]:
          - button "Add capability" [ref=e50] [cursor=pointer]
          - button "Registrations & codes" [ref=e51] [cursor=pointer]
      - generic [ref=e52]:
        - paragraph [ref=e54]:
          - text: Capability areas
          - generic [ref=e55]: · 1
        - button "Long supplied capability name Long supplied capability name Long supplied capability name Long supplied capability name Long supplied capability name Prototype PE 0604134A, 0603461A, 0604454N, 0605603A" [ref=e57] [cursor=pointer]:
          - strong [ref=e58]: Long supplied capability name Long supplied capability name Long supplied capability name Long supplied capability name Long supplied capability name
          - generic [ref=e59]:
            - generic [ref=e60]: Prototype
            - generic [ref=e61]: PE 0604134A, 0603461A, 0604454N, 0605603A
      - generic [ref=e62]:
        - generic [ref=e63]:
          - generic [ref=e64]:
            - paragraph [ref=e65]: Where capabilities create fit
            - heading "1 fit matches" [level=3] [ref=e66]
          - button "Refresh" [ref=e67] [cursor=pointer]
        - generic [ref=e68]: Computed 10/11/2026, 12:00:00 PM
        - article [ref=e69]:
          - generic [ref=e70]:
            - strong [ref=e71]: Synthetic fit program
            - generic [ref=e72]: Fit 90/100
          - paragraph [ref=e73]: Explicit synthetic capability reference
          - link "Open target ↗" [ref=e74] [cursor=pointer]:
            - /url: http://127.0.0.1:5191/existing/program-elements/0604134A
      - region "Past performance" [ref=e75]:
        - generic [ref=e76]:
          - generic [ref=e77]:
            - paragraph [ref=e78]: Past performance
            - heading "Saved submissions" [level=2] [ref=e79]
            - paragraph [ref=e80]: Saved capability submissions and their recorded outcomes.
          - button "Refresh history" [ref=e81] [cursor=pointer]
        - generic [ref=e82]:
          - paragraph [ref=e83]: 0 saved submissions shown.
          - paragraph [ref=e84]: No saved submissions in this history feed.
          - list
        - paragraph [ref=e85]: Removing a saved submission keeps its capability and documents.
      - paragraph [ref=e86]:
        - text: "Past advocacy:"
        - link "Advocacy history ↗" [ref=e87] [cursor=pointer]:
          - /url: /portfolio/10000000-0000-4000-8000-000000000001/objectives
```

# Test source

```ts
  32  |     await page.setViewportSize({ width: 390, height: 844 });
  33  |     await page.emulateMedia({ colorScheme });
  34  |     await page.goto(`/portfolio/${clientId}/capabilities`);
  35  |     const section = page
  36  |       .locator("section")
  37  |       .filter({ hasText: "Capability areas" });
  38  |     const rows = section.getByRole("button");
  39  |     await expect(rows).toHaveCount(4);
  40  |     const first = rows.first();
  41  |     await expect(first.locator(".monogram")).toBeHidden();
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
> 132 |   ).toBe(true);
      |     ^ Error: expect(received).toBe(expected) // Object.is equality
  133 |   await page.screenshot({
  134 |     path: info.outputPath("compact-long-320.png"),
  135 |     fullPage: true,
  136 |   });
  137 |   await page.setViewportSize({ width: 1440, height: 1040 });
  138 |   await expect(card.locator(".monogram")).toBeVisible();
  139 |   await expect(card.getByText(long.description, { exact: true })).toBeVisible();
  140 |   expect((await card.boundingBox())!.height).toBeGreaterThanOrEqual(168);
  141 |   await page.screenshot({
  142 |     path: info.outputPath("desktop-retained-card.png"),
  143 |     fullPage: true,
  144 |   });
  145 |   expect(unexpected).toEqual([]);
  146 | });
  147 | 
  148 | test("registration summary uses aligned divided rows and the Figma dialog width", async ({
  149 |   page,
  150 | }, info) => {
  151 |   const unexpected = await installRegistrationBoundary(page);
  152 |   const dialog = await openRegistrations(page);
  153 |   await expect(dialog.locator("dd").first()).toHaveText(registrationClient.uei);
  154 |   expect((await dialog.boundingBox())!.width).toBe(680);
  155 |   const rows = await dialog.locator("dl > div").evaluateAll((elements) =>
  156 |     elements.map((row) => {
  157 |       const style = getComputedStyle(row);
  158 |       const label = row.querySelector("dt")!.getBoundingClientRect();
  159 |       const value = row.querySelector("dd")!.getBoundingClientRect();
  160 |       return {
  161 |         padding: [style.paddingTop, style.paddingBottom],
  162 |         divider: style.borderBottomWidth,
  163 |         labelWidth: label.width,
  164 |         valueX: value.x,
  165 |         gap: value.x - label.right,
  166 |       };
  167 |     }),
  168 |   );
  169 |   expect(rows).toHaveLength(8);
  170 |   for (const row of rows) {
  171 |     expect(row.padding).toEqual(["10px", "10px"]);
  172 |     expect(row.divider).toBe("1px");
  173 |     expect(row.labelWidth).toBe(170);
  174 |     expect(row.gap).toBe(16);
  175 |     expect(row.valueX).toBe(rows[0]!.valueX);
  176 |   }
  177 |   await page.screenshot({
  178 |     path: info.outputPath("registrations-divided-desktop.png"),
  179 |     fullPage: true,
  180 |   });
  181 |   await page.keyboard.press("Escape");
  182 |   await expect(dialog).toHaveCount(0);
  183 |   await expect(
  184 |     page.getByRole("button", { name: "Registrations & codes", exact: true }),
  185 |   ).toBeFocused();
  186 |   expect(unexpected).toEqual([]);
  187 | });
  188 | 
  189 | test("registration rows wrap long values and preserve missing-value and EIN review states on phone", async ({
  190 |   page,
  191 | }, info) => {
  192 |   const unexpected = await installRegistrationBoundary(page);
  193 |   await page.route(`**/core/clients/${clientId}`, (route) =>
  194 |     json(route, {
  195 |       ...registrationClient,
  196 |       cageCode: null,
  197 |       applicantTypes: [
  198 |         "A long supplied organization category requiring wrapping",
  199 |       ],
  200 |       setAsideCertifications: ["EXISTING_UNKNOWN_CODE_".repeat(6)],
  201 |       intakeData: { ...registrationClient.intakeData, ein: "12-34" },
  202 |     }),
  203 |   );
  204 |   await page.setViewportSize({ width: 390, height: 844 });
  205 |   await page.emulateMedia({ colorScheme: "dark" });
  206 |   const dialog = await openRegistrations(page);
  207 |   await expect(
  208 |     dialog.locator("dl > div").filter({ hasText: "CAGE" }).locator("dd"),
  209 |   ).toHaveText("Not supplied");
  210 |   await expect(dialog.getByRole("status")).toContainText("EIN needs review");
  211 |   expect(
  212 |     await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth),
  213 |   ).toBe(true);
  214 |   expect(
  215 |     await page.evaluate(
  216 |       () => document.documentElement.scrollWidth <= innerWidth,
  217 |     ),
  218 |   ).toBe(true);
  219 |   await dialog.getByRole("status").scrollIntoViewIfNeeded();
  220 |   await page.screenshot({
  221 |     path: info.outputPath("registrations-long-dark-phone.png"),
  222 |     fullPage: true,
  223 |   });
  224 |   await dialog
  225 |     .getByRole("button", { name: "Edit registrations", exact: true })
  226 |     .click();
  227 |   await expect(dialog.getByLabel("UEI", { exact: true })).toBeEnabled();
  228 |   await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  229 |   await expect(dialog.locator("dd").first()).toHaveText(registrationClient.uei);
  230 |   expect(unexpected).toEqual([]);
  231 | });
  232 | 
```