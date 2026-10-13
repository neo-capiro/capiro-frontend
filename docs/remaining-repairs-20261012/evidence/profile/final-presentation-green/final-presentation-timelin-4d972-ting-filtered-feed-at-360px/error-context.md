# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: final-presentation.spec.ts >> timeline groups dates and expands the existing filtered feed at 360px
- Location: apps/web/tests/browser/profile-presentation.spec.ts:144:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('dialog', { name: 'Engagement timeline', exact: true }).getByRole('button', { name: 'Log activity', exact: true })
    - locator resolved to <button class="button primary">Log activity</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - element is outside of the viewport
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - element is outside of the viewport
    - retrying click action
      - waiting 100ms
    53 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - element is outside of the viewport
     - retrying click action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic:
  - generic:
    - link:
      - /url: "#main"
      - text: Skip to content
    - banner:
      - button:
        - img
      - link:
        - /url: /
        - img
      - generic:
        - button
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
              - button: Overview
            - generic:
              - button:
                - generic: Quick add
              - button:
                - generic: Meri actions
              - button:
                - img
        - generic:
          - generic:
            - generic:
              - generic:
                - paragraph: Client profile
                - heading [level=1]: Overview
              - generic:
                - button:
                  - img
                  - text: Notes
                - link:
                  - /url: /portfolio/10000000-0000-4000-8000-000000000001/objectives?new=1
                  - text: New objective
            - generic:
              - generic:
                - generic:
                  - generic:
                    - generic: TA
                    - generic:
                      - generic:
                        - heading [level=1]: Test Aerospace
                        - generic: ACTIVE
                      - generic:
                        - text: Aerospace ·
                        - link:
                          - /url: https://example.test/
                          - text: https://example.test
                  - paragraph: Synthetic organization for isolated UI validation.
                  - generic:
                    - generic: Focus
                    - button:
                      - text: + Add
                      - generic: focus tag
                  - generic:
                    - generic: Owner Unassigned
                    - button:
                      - img
                      - text: Account team · 0
                - region:
                  - generic:
                    - heading [level=2]: Engagement pulse
                    - link:
                      - /url: "#activity-timeline"
                      - text: Open timeline →
                  - generic:
                    - generic:
                      - strong: "2"
                      - paragraph: Recent activity items
                    - generic:
                      - strong: "0"
                      - paragraph: Account team
                    - generic:
                      - strong: —
                      - paragraph: Objective coverage unavailable
                - generic:
                  - generic:
                    - heading [level=2]: Objectives
                    - link:
                      - /url: /portfolio/10000000-0000-4000-8000-000000000001/objectives?new=1
                      - img
                  - link:
                    - /url: /portfolio/10000000-0000-4000-8000-000000000001/objectives?objective=30000000-0000-4000-8000-000000000001
                    - generic:
                      - strong: Test outcome
                      - generic: Draft
                    - paragraph: Test minimum win
                  - link:
                    - /url: /portfolio/10000000-0000-4000-8000-000000000001/objectives
                    - text: View objectives
                    - img
              - generic:
                - region:
                  - generic:
                    - generic:
                      - heading [level=2]: District nexus
                      - paragraph: 1 locations · 1 states · 1 districts
                    - generic:
                      - button
                      - button
                  - generic:
                    - list:
                      - listitem:
                        - button:
                          - generic:
                            - generic:
                              - strong: Synthetic lab
                              - generic: CA-01
                            - generic: 12 staff
                    - region:
                      - generic:
                        - group:
                          - generic:
                            - button
                            - button
                        - button
                        - generic:
                          - button
                          - button [disabled]
                          - button: ←
                          - button: →
                          - button: ↺
                      - paragraph: Current boundaries · 119 · 2 districts. Alaska and Hawaii use separate insets. Drag empty map space or focus the map and use arrow keys to pan, plus/minus to zoom.
                - generic:
                  - generic:
                    - heading [level=2]: Client calendar
                    - link:
                      - /url: /portfolio/10000000-0000-4000-8000-000000000001/calendar
                      - img
                  - paragraph: Meetings, preparation, notes and debriefs for this client.
                  - link:
                    - /url: /portfolio/10000000-0000-4000-8000-000000000001/calendar
                    - text: Open calendar
            - region:
              - generic:
                - heading [level=2]: Activity timeline
                - button: Expand timeline ↗
              - generic:
                - generic:
                  - generic:
                    - generic: Search activity
                    - searchbox
                  - button: All activity
                  - button: All dates
              - generic:
                - list:
                  - listitem:
                    - heading [level=3]: Today
                    - generic:
                      - generic: ◔
                      - generic:
                        - generic:
                          - strong: call today
                          - generic:
                            - time: 8:14 PM
                            - generic:
                              - button: ⋯
                        - generic: call
                        - paragraph: Synthetic activity detail
                  - listitem:
                    - heading [level=3]: Yesterday
                    - generic:
                      - generic: ✎
                      - generic:
                        - generic:
                          - strong: note yesterday
                          - generic:
                            - time: 8:14 PM
                            - generic:
                              - button: ⋯
                        - generic: note
                        - paragraph: Synthetic activity detail
              - generic:
                - generic: 2 activities
  - dialog "Engagement timeline" [ref=e2]:
    - banner [ref=e3]:
      - heading "Engagement timeline" [level=2] [ref=e4]
      - button "Close" [ref=e5] [cursor=pointer]:
        - img [ref=e6]
    - paragraph [ref=e9]: Test Aerospace · Shared activity history
    - generic [ref=e10]:
      - button "Log activity" [ref=e12] [cursor=pointer]
      - generic "Activity filters" [ref=e14]:
        - generic [ref=e15]:
          - generic [ref=e16]: Search activity
          - searchbox "Search activity" [ref=e17]
        - button "Activity type" [active] [ref=e18] [cursor=pointer]: All activity
        - 'button "Activity dates: All dates" [ref=e19] [cursor=pointer]': All dates
      - list [ref=e21]:
        - listitem [ref=e22]:
          - heading "Today" [level=3] [ref=e23]
          - generic [ref=e26]:
            - strong [ref=e28]: call today
            - paragraph [ref=e29]: Synthetic activity detail
            - generic [ref=e30]:
              - generic [ref=e31]: call
              - time [ref=e32]: 8:14 PM
        - listitem [ref=e33]:
          - heading "Yesterday" [level=3] [ref=e34]
          - generic [ref=e37]:
            - strong [ref=e39]: note yesterday
            - paragraph [ref=e40]: Synthetic activity detail
            - generic [ref=e41]:
              - generic [ref=e42]: note
              - time [ref=e43]: 8:14 PM
      - contentinfo [ref=e44]:
        - generic [ref=e45]: 2 activities
        - button "Return to profile" [ref=e46] [cursor=pointer]
```

# Test source

```ts
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
  208 |     });
  209 |     await page.keyboard.press("Tab");
  210 |     expect(
  211 |       await expanded.evaluate((element) =>
  212 |         element.contains(document.activeElement),
  213 |       ),
  214 |     ).toBe(true);
  215 |     await expanded
  216 |       .getByRole("button", { name: "Log activity", exact: true })
> 217 |       .click();
      |        ^ Error: locator.click: Test timeout of 30000ms exceeded.
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
  257 |     await page.screenshot({
  258 |       path: info.outputPath(`files-folders-${width}.png`),
  259 |       fullPage: true,
  260 |     });
  261 |     await page
  262 |       .getByRole("button", { name: "Open folder Reports", exact: true })
  263 |       .click();
  264 |     const result = page.getByRole("region", {
  265 |       name: "Folder Reports",
  266 |       exact: true,
  267 |     });
  268 |     await expect(
  269 |       result.getByRole("button", { name: "Upload here", exact: true }),
  270 |     ).toBeDisabled();
  271 |     await expect(result).toContainText(
  272 |       "Uploads cannot be placed directly in a named folder",
  273 |     );
  274 |     await expect(
  275 |       result.getByRole("checkbox", { name: "Select Report.pdf", exact: true }),
  276 |     ).toBeVisible();
  277 |     await result
  278 |       .getByRole("button", { name: "Test Aerospace", exact: true })
  279 |       .click();
  280 |     await expect(
  281 |       page.getByRole("button", { name: "Upload here", exact: true }),
  282 |     ).toBeEnabled();
  283 |     await page.screenshot({
  284 |       path: info.outputPath(`files-table-${width}.png`),
  285 |       fullPage: true,
  286 |     });
  287 |     await fit(page);
  288 |     expect(unexpected).toEqual([]);
  289 |   });
  290 | }
  291 | test("facilities manager saves inline edits through the existing receipt contract", async ({
  292 |   page,
  293 | }) => {
  294 |   const unexpected = await setup(page);
  295 |   let current = { ...facility };
  296 |   const writes: unknown[] = [];
  297 |   await page.route(`**/clients/${clientId}/facilities**`, (route) => {
  298 |     if (route.request().method() === "GET") return json(route, [current]);
  299 |     writes.push(route.request().postDataJSON());
  300 |     current = { ...current, ...route.request().postDataJSON() };
  301 |     return json(route, { ...current, tenantId: "tenant-test" });
  302 |   });
  303 |   await page.goto(`/portfolio/${clientId}`);
  304 |   await page.getByRole("button", { name: "Add facility", exact: true }).click();
  305 |   const dialog = page.getByRole("dialog", {
  306 |     name: "Facilities: Test Aerospace",
  307 |     exact: true,
  308 |   });
  309 |   await dialog.getByRole("button", { name: "Edit", exact: true }).click();
  310 |   await dialog.getByLabel("Facility name", { exact: true }).fill("Updated lab");
  311 |   await dialog
  312 |     .getByRole("button", { name: "Save facility", exact: true })
  313 |     .click();
  314 |   await expect(
  315 |     dialog.getByRole("heading", { name: "Updated lab", exact: true }),
  316 |   ).toBeVisible();
  317 |   await expect(
```