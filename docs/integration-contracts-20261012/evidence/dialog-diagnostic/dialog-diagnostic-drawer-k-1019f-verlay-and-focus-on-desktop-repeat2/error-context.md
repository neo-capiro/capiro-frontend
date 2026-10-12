# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dialog-diagnostic.spec.ts >> drawer keeps its canonical layout, overlay and focus on desktop
- Location: tests/browser/dialog-diagnostic.spec.ts:173:5

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  getByRole('dialog', { name: 'Edit objective', exact: true })
Expected: 0
Received: 1
Timeout:  5000ms

Call log:
  - Expect "toHaveCount" with timeout 5000ms
  - waiting for getByRole('dialog', { name: 'Edit objective', exact: true })
    14 × locator resolved to 1 element
       - unexpected value "1"

```

# Page snapshot

```yaml
- generic [active]:
  - generic:
    - link:
      - /url: "#main"
      - text: Skip to content
    - banner:
      - link:
        - /url: /
        - img
      - navigation:
        - link:
          - /url: /meri
        - link:
          - /url: /
        - link:
          - /url: /modules
      - navigation:
        - link:
          - /url: /portfolio/10000000-0000-4000-8000-000000000001?log=1
        - link:
          - /url: /calendar
        - link:
          - /url: /portfolio?search=1
        - button [disabled]
        - generic:
          - button: T
    - generic:
      - complementary:
        - paragraph: Portfolio
        - navigation:
          - link:
            - /url: /portfolio
            - generic: Overview
          - link:
            - /url: /portfolio?type=CLIENT
            - generic: Clients
          - link:
            - /url: /portfolio/prospects
            - generic: Prospects
        - separator
        - paragraph: Test Aerospace
        - navigation:
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001
            - generic: Overview
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001/objectives
            - generic: Objectives
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001/calendar
            - generic: Calendar
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001/relationships
            - generic: Relationships
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001/work
            - generic: Work
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001/capabilities
            - generic: Capabilities
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001/bills
            - generic: Bill Tracker
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001/opportunities
            - generic: Opportunities
          - link:
            - /url: /portfolio/10000000-0000-4000-8000-000000000001/files
            - generic: Files
        - generic:
          - link:
            - /url: /settings
            - text: Settings
      - main:
        - generic:
          - generic:
            - navigation:
              - link:
                - /url: /portfolio
              - link:
                - /url: /portfolio
                - text: Portfolio
              - generic: /
              - link:
                - /url: /portfolio/10000000-0000-4000-8000-000000000001
                - text: Test Aerospace
              - generic: /
              - button: Objectives
            - generic:
              - button:
                - generic: Quick add
              - button:
                - generic: Meri actions
              - button:
                - img
          - region:
            - generic: TA
            - generic:
              - strong: Test Aerospace
              - paragraph: Aerospace
            - generic: active client
        - generic:
          - generic:
            - generic:
              - generic:
                - paragraph: Outcomes and institutional memory
                - heading [level=1]: Objectives
              - button:
                - img
                - text: New objective
            - generic:
              - region:
                - generic:
                  - generic:
                    - heading [level=2]: Advocacy history
                  - button:
                    - img
                    - text: New matter
                - paragraph: Advocacy records and linked events for this client.
                - generic:
                  - generic:
                    - generic:
                      - button [pressed]: Timeline
                      - button: Matters
                    - generic:
                      - generic: Search advocacy history
                      - searchbox
                    - generic:
                      - generic: Matter status
                      - combobox
                  - paragraph: 0 loaded events · Latest 500 at most; older history may be outside this view.
                  - generic:
                    - paragraph: No matching events in the loaded history.
                - generic:
                  - button: Unassigned records
              - generic:
                - generic:
                  - heading [level=2]: Current objectives
                  - combobox
                - article:
                  - generic:
                    - generic: Draft
                    - button:
                      - img
                  - heading [level=2]:
                    - button: Test outcome
                  - paragraph: Test problem
                  - separator
                  - paragraph: Minimum win Test minimum win
                  - generic:
                    - generic: Unassigned
                    - generic: 4/4 required fields
                  - button: Open objective
  - dialog "Edit objective" [ref=e2]:
    - banner [ref=e3]:
      - heading "Edit objective" [level=2] [ref=e4]
      - button "Close" [ref=e5] [cursor=pointer]:
        - img [ref=e6]
    - paragraph [ref=e9]: Define the outcome and the government action that would make a meaningful win.
    - generic [ref=e10]:
      - generic [ref=e11]:
        - generic [ref=e12]: Draft
        - generic [ref=e13]: Four required fields before review or ready.
      - group "Objective details" [ref=e14]:
        - generic [ref=e15]: Objective details
        - generic [ref=e16]:
          - generic [ref=e17]: Outcome
          - generic [ref=e18]: What should be different?
          - textbox "Outcome" [ref=e19]: Test outcome
        - generic [ref=e20]:
          - generic [ref=e21]: Government problem
          - generic [ref=e22]: What must government solve?
          - textbox "Government problem" [ref=e23]: Test problem
        - generic [ref=e24]:
          - text: Ask type
          - combobox "Ask type" [ref=e25]:
            - option "Choose an ask type"
            - option "Funding" [selected]
            - option "Policy or authority"
            - option "Both"
            - option "Protect existing funding"
            - option "Not sure, let Meri propose"
        - generic [ref=e26]:
          - generic [ref=e27]: Minimum win
          - generic [ref=e28]: What is the smallest result that matters?
          - textbox "Minimum win" [ref=e29]: Test minimum win
        - generic [ref=e30]:
          - generic [ref=e31]: Limits
          - generic [ref=e32]: Optional boundaries and constraints
          - textbox "Limits" [ref=e33]
      - region "Readiness" [ref=e34]:
        - generic [ref=e35]:
          - heading "Readiness" [level=3] [ref=e36]
          - generic [ref=e37]: i
        - status [ref=e38]: 4 of 4 required fields complete. Ready for review or confirmation.
        - list [ref=e39]:
          - listitem [ref=e40]:
            - generic [ref=e41]: ✓
            - generic [ref=e42]: Outcome
            - generic [ref=e43]: Done
          - listitem [ref=e44]:
            - generic [ref=e45]: ✓
            - generic [ref=e46]: Government problem
            - generic [ref=e47]: Done
          - listitem [ref=e48]:
            - generic [ref=e49]: ✓
            - generic [ref=e50]: Type of ask
            - generic [ref=e51]: Done
          - listitem [ref=e52]:
            - generic [ref=e53]: ✓
            - generic [ref=e54]: Minimum win
            - generic [ref=e55]: Done
      - generic [ref=e56]:
        - button "Save draft" [ref=e57] [cursor=pointer]
        - button "Request review" [ref=e58] [cursor=pointer]
        - button "Confirm ready" [ref=e59] [cursor=pointer]
```

# Test source

```ts
  130 | }
  131 | 
  132 | async function expectOverlayAndFocus(page: Page, dialog: Locator) {
  133 |   const overlay = page.locator('[data-slot="dialog-overlay"]');
  134 |   await expect(overlay).toHaveCount(1);
  135 |   await expect(overlay).toBeVisible();
  136 |   await expect(overlay).toHaveCSS("position", "fixed");
  137 |   const coverage = await overlay.evaluate((element) => {
  138 |     const rect = element.getBoundingClientRect();
  139 |     return {
  140 |       left: rect.left,
  141 |       top: rect.top,
  142 |       width: rect.width,
  143 |       height: rect.height,
  144 |       viewportWidth: innerWidth,
  145 |       viewportHeight: innerHeight,
  146 |       zIndex: Number(getComputedStyle(element).zIndex),
  147 |     };
  148 |   });
  149 |   expect(coverage.left).toBe(0);
  150 |   expect(coverage.top).toBe(0);
  151 |   expect(coverage.width).toBe(coverage.viewportWidth);
  152 |   expect(coverage.height).toBe(coverage.viewportHeight);
  153 |   expect(
  154 |     await dialog.evaluate((element) =>
  155 |       Number(getComputedStyle(element).zIndex),
  156 |     ),
  157 |   ).toBeGreaterThan(coverage.zIndex);
  158 |   const close = dialog.getByRole("button", { name: "Close", exact: true });
  159 |   await expect(close).toHaveCount(1);
  160 |   await close.focus();
  161 |   await page.keyboard.press("Shift+Tab");
  162 |   await expect
  163 |     .poll(() =>
  164 |       dialog.evaluate((element) => element.contains(document.activeElement)),
  165 |     )
  166 |     .toBe(true);
  167 |   await page.keyboard.press("Tab");
  168 |   await expect(close).toBeFocused();
  169 | }
  170 | 
  171 | for (const viewport of viewports) {
  172 |   for (const surface of surfaces) {
  173 |     test(`${surface.name} keeps its canonical layout, overlay and focus on ${viewport.name}`, async ({
  174 |       page,
  175 |     }, testInfo) => {
  176 |       await page.setViewportSize(viewport);
  177 |       const unexpected = await installFixtures(page);
  178 |       if (surface.compact) {
  179 |         await page.route(
  180 |           `**/business-development/prospects/${prospectId}/contacts`,
  181 |           (route) =>
  182 |             route.request().method() === "GET"
  183 |               ? json(route, {
  184 |                   prospectId,
  185 |                   readOnly: false,
  186 |                   contacts: [],
  187 |                   nextCursor: null,
  188 |                 })
  189 |               : route.fallback(),
  190 |         );
  191 |       }
  192 |       await page.goto(surface.path);
  193 |       const scope = surface.compact
  194 |         ? page.getByRole("region", { name: "Prospect contacts", exact: true })
  195 |         : page;
  196 |       const trigger = scope.getByRole("button", {
  197 |         name: surface.trigger,
  198 |         exact: true,
  199 |       });
  200 |       const dialog = page.getByRole("dialog", {
  201 |         name: surface.title,
  202 |         exact: true,
  203 |       });
  204 |       await trigger.click();
  205 |       const bounds = await expectDialogGeometry(
  206 |         page,
  207 |         dialog,
  208 |         surface,
  209 |         viewport,
  210 |       );
  211 |       await expectOverlayAndFocus(page, dialog);
  212 |       await page.screenshot({ path: testInfo.outputPath("dialog-layout.png") });
  213 | 
  214 |       await page.keyboard.press("Escape");
  215 |       await expect(dialog).toHaveCount(0);
  216 |       await expect(page.locator('[data-slot="dialog-overlay"]')).toHaveCount(0);
  217 |       if (surface.compact) await expect(trigger).toBeFocused();
  218 | 
  219 |       await trigger.click();
  220 |       await dialog.getByRole("button", { name: "Close", exact: true }).click();
  221 |       await expect(dialog).toHaveCount(0);
  222 |       await expect(page.locator('[data-slot="dialog-overlay"]')).toHaveCount(0);
  223 |       if (surface.compact) await expect(trigger).toBeFocused();
  224 | 
  225 |       // Full-width phone drawers leave no exposed overlay to click.
  226 |       if (bounds.x > 4) {
  227 |         await trigger.click();
  228 |         await expect(dialog).toBeVisible();
  229 |         await page.mouse.click(4, 4);
> 230 |         await expect(dialog).toHaveCount(0);
      |                              ^ Error: expect(locator).toHaveCount(expected) failed
  231 |         await expect(page.locator('[data-slot="dialog-overlay"]')).toHaveCount(
  232 |           0,
  233 |         );
  234 |         if (surface.compact) await expect(trigger).toBeFocused();
  235 |       }
  236 |       expect(unexpected).toEqual([]);
  237 |     });
  238 |   }
  239 | }
  240 | 
```