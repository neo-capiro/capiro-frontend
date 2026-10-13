# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: capability-list-registration-layout.spec.ts >> the complete capability page fits the 320px viewport including its shared header
- Location: tests/browser/capability-list-registration-layout.spec.ts:211:1

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
        - button "Test sensor Fielded No program line mapped" [ref=e57] [cursor=pointer]:
          - strong [ref=e58]: Test sensor
          - generic [ref=e59]:
            - generic [ref=e60]: Fielded
            - generic [ref=e61]: No program line mapped
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
  128 |   await info.attach("phone-overflow-elements", {
  129 |     contentType: "application/json",
  130 |     body: JSON.stringify(
  131 |       await page.evaluate(() => ({
  132 |         viewport: innerWidth,
  133 |         documentWidth: document.documentElement.scrollWidth,
  134 |         elements: [...document.querySelectorAll("body *")].flatMap((node) => {
  135 |           const bounds = node.getBoundingClientRect();
  136 |           return bounds.width && bounds.right > innerWidth + 1
  137 |             ? [
  138 |                 {
  139 |                   tag: node.tagName,
  140 |                   className: node.className,
  141 |                   right: bounds.right,
  142 |                   width: bounds.width,
  143 |                 },
  144 |               ]
  145 |             : [];
  146 |         }),
  147 |       })),
  148 |       null,
  149 |       2,
  150 |     ),
  151 |   });
  152 |   const phoneCard = await card.boundingBox();
  153 |   expect(phoneCard!.x).toBeGreaterThanOrEqual(0);
  154 |   expect(phoneCard!.x + phoneCard!.width).toBeLessThanOrEqual(320);
  155 |   await page.screenshot({
  156 |     path: info.outputPath("compact-long-320.png"),
  157 |     fullPage: true,
  158 |   });
  159 |   await page.setViewportSize({ width: 1440, height: 1040 });
  160 |   await expect(card.locator(".monogram")).toBeVisible();
  161 |   await expect(card.getByText(long.description, { exact: true })).toBeVisible();
  162 |   expect((await card.boundingBox())!.height).toBeGreaterThanOrEqual(168);
  163 |   await page.screenshot({
  164 |     path: info.outputPath("desktop-retained-card.png"),
  165 |     fullPage: true,
  166 |   });
  167 |   expect(unexpected).toEqual([]);
  168 | });
  169 | 
  170 | test("registration summary uses aligned divided rows and the Figma dialog width", async ({
  171 |   page,
  172 | }, info) => {
  173 |   const unexpected = await installRegistrationBoundary(page);
  174 |   const dialog = await openRegistrations(page);
  175 |   await expect(dialog.locator("dd").first()).toHaveText(registrationClient.uei);
  176 |   expect((await dialog.boundingBox())!.width).toBe(680);
  177 |   const rows = await dialog.locator("dl > div").evaluateAll((elements) =>
  178 |     elements.map((row) => {
  179 |       const style = getComputedStyle(row);
  180 |       const label = row.querySelector("dt")!.getBoundingClientRect();
  181 |       const value = row.querySelector("dd")!.getBoundingClientRect();
  182 |       return {
  183 |         padding: [style.paddingTop, style.paddingBottom],
  184 |         divider: style.borderBottomWidth,
  185 |         labelWidth: label.width,
  186 |         valueX: value.x,
  187 |         gap: value.x - label.right,
  188 |       };
  189 |     }),
  190 |   );
  191 |   expect(rows).toHaveLength(8);
  192 |   for (const row of rows) {
  193 |     expect(row.padding).toEqual(["10px", "10px"]);
  194 |     expect(row.divider).toBe("1px");
  195 |     expect(row.labelWidth).toBe(170);
  196 |     expect(row.gap).toBe(16);
  197 |     expect(row.valueX).toBe(rows[0]!.valueX);
  198 |   }
  199 |   await page.screenshot({
  200 |     path: info.outputPath("registrations-divided-desktop.png"),
  201 |     fullPage: true,
  202 |   });
  203 |   await page.keyboard.press("Escape");
  204 |   await expect(dialog).toHaveCount(0);
  205 |   await expect(
  206 |     page.getByRole("button", { name: "Registrations & codes", exact: true }),
  207 |   ).toBeFocused();
  208 |   expect(unexpected).toEqual([]);
  209 | });
  210 | 
  211 | test("the complete capability page fits the 320px viewport including its shared header", async ({
  212 |   page,
  213 | }, info) => {
  214 |   const unexpected = await installCapabilityBoundary(page);
  215 |   await page.setViewportSize({ width: 320, height: 844 });
  216 |   await page.goto(`/portfolio/${clientId}/capabilities`);
  217 |   await expect(
  218 |     page.getByRole("heading", { name: "Capabilities", exact: true }),
  219 |   ).toBeVisible();
  220 |   await page.screenshot({
  221 |     path: info.outputPath("whole-capability-page-320.png"),
  222 |     fullPage: true,
  223 |   });
  224 |   expect(
  225 |     await page.evaluate(
  226 |       () => document.documentElement.scrollWidth <= innerWidth,
  227 |     ),
> 228 |   ).toBe(true);
      |     ^ Error: expect(received).toBe(expected) // Object.is equality
  229 |   const header = page.getByRole("banner");
  230 |   const controls = [
  231 |     header.getByRole("button", { name: "Toggle navigation", exact: true }),
  232 |     header.getByRole("link", { name: "Capiro Home", exact: true }),
  233 |     header.getByRole("button", { name: "Switch workspace", exact: true }),
  234 |     header.getByRole("link", { name: "Quick log", exact: true }),
  235 |     header.getByRole("link", { name: "Master calendar", exact: true }),
  236 |     header.getByRole("link", { name: "Search Portfolio", exact: true }),
  237 |     header.getByRole("button", { name: "Test account", exact: true }),
  238 |   ];
  239 |   await controls[0]!.focus();
  240 |   for (const [index, control] of controls.entries()) {
  241 |     if (index) await page.keyboard.press("Tab");
  242 |     await expect(control).toBeVisible();
  243 |     await expect(control).toBeFocused();
  244 |     const bounds = await control.boundingBox();
  245 |     expect(bounds!.x).toBeGreaterThanOrEqual(0);
  246 |     expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
  247 |   }
  248 |   await expect(
  249 |     header.getByRole("button", { name: "Updates unavailable", exact: true }),
  250 |   ).toBeVisible();
  251 |   await expect(
  252 |     header.getByRole("button", { name: "Updates unavailable", exact: true }),
  253 |   ).toBeDisabled();
  254 |   expect(unexpected).toEqual([]);
  255 | });
  256 | 
  257 | test("registration rows wrap long values and preserve missing-value and EIN review states on phone", async ({
  258 |   page,
  259 | }, info) => {
  260 |   const unexpected = await installRegistrationBoundary(page);
  261 |   await page.route(`**/core/clients/${clientId}`, (route) =>
  262 |     json(route, {
  263 |       ...registrationClient,
  264 |       cageCode: null,
  265 |       applicantTypes: [
  266 |         "A long supplied organization category requiring wrapping",
  267 |       ],
  268 |       setAsideCertifications: ["EXISTING_UNKNOWN_CODE_".repeat(6)],
  269 |       intakeData: { ...registrationClient.intakeData, ein: "12-34" },
  270 |     }),
  271 |   );
  272 |   await page.setViewportSize({ width: 390, height: 844 });
  273 |   await page.emulateMedia({ colorScheme: "dark" });
  274 |   const dialog = await openRegistrations(page);
  275 |   await expect(
  276 |     dialog.locator("dl > div").filter({ hasText: "CAGE" }).locator("dd"),
  277 |   ).toHaveText("Not supplied");
  278 |   await expect(dialog.getByRole("status")).toContainText("EIN needs review");
  279 |   expect(
  280 |     await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth),
  281 |   ).toBe(true);
  282 |   expect(
  283 |     await page.evaluate(
  284 |       () => document.documentElement.scrollWidth <= innerWidth,
  285 |     ),
  286 |   ).toBe(true);
  287 |   await dialog.getByRole("status").scrollIntoViewIfNeeded();
  288 |   await page.screenshot({
  289 |     path: info.outputPath("registrations-long-dark-phone.png"),
  290 |     fullPage: true,
  291 |   });
  292 |   await dialog
  293 |     .getByRole("button", { name: "Edit registrations", exact: true })
  294 |     .click();
  295 |   await expect(dialog.getByLabel("UEI", { exact: true })).toBeEnabled();
  296 |   await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  297 |   await expect(dialog.locator("dd").first()).toHaveText(registrationClient.uei);
  298 |   expect(unexpected).toEqual([]);
  299 | });
  300 | 
```