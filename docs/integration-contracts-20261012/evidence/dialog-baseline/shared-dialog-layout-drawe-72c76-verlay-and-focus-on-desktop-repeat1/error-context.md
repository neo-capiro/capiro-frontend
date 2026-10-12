# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: shared-dialog-layout.spec.ts >> drawer keeps its canonical layout, overlay and focus on desktop
- Location: tests/browser/shared-dialog-layout.spec.ts:143:5

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
  100 | }
  101 | 
  102 | async function expectOverlayAndFocus(page: Page, dialog: Locator) {
  103 |   const overlay = page.locator('[data-slot="dialog-overlay"]');
  104 |   await expect(overlay).toHaveCount(1);
  105 |   await expect(overlay).toBeVisible();
  106 |   await expect(overlay).toHaveCSS("position", "fixed");
  107 |   const coverage = await overlay.evaluate((element) => {
  108 |     const rect = element.getBoundingClientRect();
  109 |     return {
  110 |       left: rect.left,
  111 |       top: rect.top,
  112 |       width: rect.width,
  113 |       height: rect.height,
  114 |       viewportWidth: innerWidth,
  115 |       viewportHeight: innerHeight,
  116 |       zIndex: Number(getComputedStyle(element).zIndex),
  117 |     };
  118 |   });
  119 |   expect(coverage.left).toBe(0);
  120 |   expect(coverage.top).toBe(0);
  121 |   expect(coverage.width).toBe(coverage.viewportWidth);
  122 |   expect(coverage.height).toBe(coverage.viewportHeight);
  123 |   expect(
  124 |     await dialog.evaluate((element) =>
  125 |       Number(getComputedStyle(element).zIndex),
  126 |     ),
  127 |   ).toBeGreaterThan(coverage.zIndex);
  128 |   const close = dialog.getByRole("button", { name: "Close", exact: true });
  129 |   await expect(close).toHaveCount(1);
  130 |   await close.focus();
  131 |   await page.keyboard.press("Shift+Tab");
  132 |   await expect
  133 |     .poll(() =>
  134 |       dialog.evaluate((element) => element.contains(document.activeElement)),
  135 |     )
  136 |     .toBe(true);
  137 |   await page.keyboard.press("Tab");
  138 |   await expect(close).toBeFocused();
  139 | }
  140 | 
  141 | for (const viewport of viewports) {
  142 |   for (const surface of surfaces) {
  143 |     test(`${surface.name} keeps its canonical layout, overlay and focus on ${viewport.name}`, async ({
  144 |       page,
  145 |     }, testInfo) => {
  146 |       await page.setViewportSize(viewport);
  147 |       const unexpected = await installFixtures(page);
  148 |       if (surface.compact) {
  149 |         await page.route(
  150 |           `**/business-development/prospects/${prospectId}/contacts`,
  151 |           (route) =>
  152 |             route.request().method() === "GET"
  153 |               ? json(route, {
  154 |                   prospectId,
  155 |                   readOnly: false,
  156 |                   contacts: [],
  157 |                   nextCursor: null,
  158 |                 })
  159 |               : route.fallback(),
  160 |         );
  161 |       }
  162 |       await page.goto(surface.path);
  163 |       const scope = surface.compact
  164 |         ? page.getByRole("region", { name: "Prospect contacts", exact: true })
  165 |         : page;
  166 |       const trigger = scope.getByRole("button", {
  167 |         name: surface.trigger,
  168 |         exact: true,
  169 |       });
  170 |       const dialog = page.getByRole("dialog", {
  171 |         name: surface.title,
  172 |         exact: true,
  173 |       });
  174 |       await trigger.click();
  175 |       const bounds = await expectDialogGeometry(
  176 |         page,
  177 |         dialog,
  178 |         surface,
  179 |         viewport,
  180 |       );
  181 |       await expectOverlayAndFocus(page, dialog);
  182 |       await page.screenshot({ path: testInfo.outputPath("dialog-layout.png") });
  183 | 
  184 |       await page.keyboard.press("Escape");
  185 |       await expect(dialog).toHaveCount(0);
  186 |       await expect(page.locator('[data-slot="dialog-overlay"]')).toHaveCount(0);
  187 |       if (surface.compact) await expect(trigger).toBeFocused();
  188 | 
  189 |       await trigger.click();
  190 |       await dialog.getByRole("button", { name: "Close", exact: true }).click();
  191 |       await expect(dialog).toHaveCount(0);
  192 |       await expect(page.locator('[data-slot="dialog-overlay"]')).toHaveCount(0);
  193 |       if (surface.compact) await expect(trigger).toBeFocused();
  194 | 
  195 |       // Full-width phone drawers leave no exposed overlay to click.
  196 |       if (bounds.x > 4) {
  197 |         await trigger.click();
  198 |         await expect(dialog).toBeVisible();
  199 |         await page.mouse.click(4, 4);
> 200 |         await expect(dialog).toHaveCount(0);
      |                              ^ Error: expect(locator).toHaveCount(expected) failed
  201 |         await expect(page.locator('[data-slot="dialog-overlay"]')).toHaveCount(
  202 |           0,
  203 |         );
  204 |         if (surface.compact) await expect(trigger).toBeFocused();
  205 |       }
  206 |       expect(unexpected).toEqual([]);
  207 |     });
  208 |   }
  209 | }
  210 | 
```