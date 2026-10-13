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
  128 |   await info.attach("phone-overflow-elements", {
  129 |     contentType: "application/json",
  130 |     body: JSON.stringify(await page.evaluate(() => ({
  131 |       viewport: innerWidth,
  132 |       documentWidth: document.documentElement.scrollWidth,
  133 |       elements: [...document.querySelectorAll("body *")].flatMap((node) => {
  134 |         const bounds = node.getBoundingClientRect();
  135 |         return bounds.width && bounds.right > innerWidth + 1
  136 |           ? [{ tag: node.tagName, className: node.className, right: bounds.right, width: bounds.width }]
  137 |           : [];
  138 |       }),
  139 |     })), null, 2),
  140 |   });
  141 |   expect(
  142 |     await page.evaluate(
  143 |       () => document.documentElement.scrollWidth <= innerWidth,
  144 |     ),
> 145 |   ).toBe(true);
      |     ^ Error: expect(received).toBe(expected) // Object.is equality
  146 |   await page.screenshot({
  147 |     path: info.outputPath("compact-long-320.png"),
  148 |     fullPage: true,
  149 |   });
  150 |   await page.setViewportSize({ width: 1440, height: 1040 });
  151 |   await expect(card.locator(".monogram")).toBeVisible();
  152 |   await expect(card.getByText(long.description, { exact: true })).toBeVisible();
  153 |   expect((await card.boundingBox())!.height).toBeGreaterThanOrEqual(168);
  154 |   await page.screenshot({
  155 |     path: info.outputPath("desktop-retained-card.png"),
  156 |     fullPage: true,
  157 |   });
  158 |   expect(unexpected).toEqual([]);
  159 | });
  160 | 
  161 | test("registration summary uses aligned divided rows and the Figma dialog width", async ({
  162 |   page,
  163 | }, info) => {
  164 |   const unexpected = await installRegistrationBoundary(page);
  165 |   const dialog = await openRegistrations(page);
  166 |   await expect(dialog.locator("dd").first()).toHaveText(registrationClient.uei);
  167 |   expect((await dialog.boundingBox())!.width).toBe(680);
  168 |   const rows = await dialog.locator("dl > div").evaluateAll((elements) =>
  169 |     elements.map((row) => {
  170 |       const style = getComputedStyle(row);
  171 |       const label = row.querySelector("dt")!.getBoundingClientRect();
  172 |       const value = row.querySelector("dd")!.getBoundingClientRect();
  173 |       return {
  174 |         padding: [style.paddingTop, style.paddingBottom],
  175 |         divider: style.borderBottomWidth,
  176 |         labelWidth: label.width,
  177 |         valueX: value.x,
  178 |         gap: value.x - label.right,
  179 |       };
  180 |     }),
  181 |   );
  182 |   expect(rows).toHaveLength(8);
  183 |   for (const row of rows) {
  184 |     expect(row.padding).toEqual(["10px", "10px"]);
  185 |     expect(row.divider).toBe("1px");
  186 |     expect(row.labelWidth).toBe(170);
  187 |     expect(row.gap).toBe(16);
  188 |     expect(row.valueX).toBe(rows[0]!.valueX);
  189 |   }
  190 |   await page.screenshot({
  191 |     path: info.outputPath("registrations-divided-desktop.png"),
  192 |     fullPage: true,
  193 |   });
  194 |   await page.keyboard.press("Escape");
  195 |   await expect(dialog).toHaveCount(0);
  196 |   await expect(
  197 |     page.getByRole("button", { name: "Registrations & codes", exact: true }),
  198 |   ).toBeFocused();
  199 |   expect(unexpected).toEqual([]);
  200 | });
  201 | 
  202 | test("registration rows wrap long values and preserve missing-value and EIN review states on phone", async ({
  203 |   page,
  204 | }, info) => {
  205 |   const unexpected = await installRegistrationBoundary(page);
  206 |   await page.route(`**/core/clients/${clientId}`, (route) =>
  207 |     json(route, {
  208 |       ...registrationClient,
  209 |       cageCode: null,
  210 |       applicantTypes: [
  211 |         "A long supplied organization category requiring wrapping",
  212 |       ],
  213 |       setAsideCertifications: ["EXISTING_UNKNOWN_CODE_".repeat(6)],
  214 |       intakeData: { ...registrationClient.intakeData, ein: "12-34" },
  215 |     }),
  216 |   );
  217 |   await page.setViewportSize({ width: 390, height: 844 });
  218 |   await page.emulateMedia({ colorScheme: "dark" });
  219 |   const dialog = await openRegistrations(page);
  220 |   await expect(
  221 |     dialog.locator("dl > div").filter({ hasText: "CAGE" }).locator("dd"),
  222 |   ).toHaveText("Not supplied");
  223 |   await expect(dialog.getByRole("status")).toContainText("EIN needs review");
  224 |   expect(
  225 |     await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth),
  226 |   ).toBe(true);
  227 |   expect(
  228 |     await page.evaluate(
  229 |       () => document.documentElement.scrollWidth <= innerWidth,
  230 |     ),
  231 |   ).toBe(true);
  232 |   await dialog.getByRole("status").scrollIntoViewIfNeeded();
  233 |   await page.screenshot({
  234 |     path: info.outputPath("registrations-long-dark-phone.png"),
  235 |     fullPage: true,
  236 |   });
  237 |   await dialog
  238 |     .getByRole("button", { name: "Edit registrations", exact: true })
  239 |     .click();
  240 |   await expect(dialog.getByLabel("UEI", { exact: true })).toBeEnabled();
  241 |   await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  242 |   await expect(dialog.locator("dd").first()).toHaveText(registrationClient.uei);
  243 |   expect(unexpected).toEqual([]);
  244 | });
  245 | 
```