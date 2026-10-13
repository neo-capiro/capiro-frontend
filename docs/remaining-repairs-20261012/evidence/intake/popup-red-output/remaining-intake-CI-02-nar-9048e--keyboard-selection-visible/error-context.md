# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: remaining-intake.spec.ts >> CI-02 narrow dark view switcher keeps keyboard selection visible
- Location: apps/web/tests/browser/remaining-intake.spec.ts:335:1

# Error details

```
Error: expect(received).toBeGreaterThanOrEqual(expected)

Expected: >= 120
Received:    78
```

# Page snapshot

```yaml
- generic [ref=e1]:
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
          - 'button "Switch client view: Overview" [expanded] [ref=e28] [cursor=pointer]': Overview
        - generic [ref=e29]:
          - button "Quick add" [ref=e30] [cursor=pointer]:
            - generic [ref=e31]: Quick add
          - button "Meri actions" [ref=e32] [cursor=pointer]:
            - generic [ref=e33]: Meri actions
          - button "More actions for Test Aerospace" [ref=e34] [cursor=pointer]:
            - img [ref=e35]
      - generic [ref=e40]:
        - generic [ref=e41]:
          - generic [ref=e42]:
            - paragraph [ref=e43]: Client profile
            - heading "Overview" [level=1] [ref=e44]
          - generic [ref=e45]:
            - button "Notes" [ref=e46] [cursor=pointer]:
              - img [ref=e47]
              - text: Notes
            - link "New objective" [ref=e50] [cursor=pointer]:
              - /url: /portfolio/10000000-0000-4000-8000-000000000001/objectives?new=1
        - generic [ref=e51]:
          - generic [ref=e52]:
            - generic [ref=e53]:
              - generic [ref=e54]:
                - generic [ref=e55]: TA
                - generic [ref=e56]:
                  - generic [ref=e57]:
                    - heading "Test Aerospace" [level=1] [ref=e58]
                    - generic [ref=e59]: ACTIVE
                  - generic [ref=e60]:
                    - text: Aerospace ·
                    - link "https://example.test" [ref=e61] [cursor=pointer]:
                      - /url: https://example.test/
              - paragraph [ref=e62]: Synthetic organization for isolated UI validation.
              - generic "Client focus tags" [ref=e63]:
                - generic [ref=e64]: Focus
                - button "+ Add focus tag" [ref=e65] [cursor=pointer]:
                  - text: + Add
                  - generic [ref=e66]: focus tag
              - generic [ref=e67]:
                - generic [ref=e68]: Owner Unassigned
                - button "Account team · 0" [ref=e69] [cursor=pointer]:
                  - img [ref=e70]
                  - text: Account team · 0
            - region "Engagement pulse" [ref=e75]:
              - generic [ref=e76]:
                - heading "Engagement pulse" [level=2] [ref=e77]
                - link "Open timeline →" [ref=e78] [cursor=pointer]:
                  - /url: "#activity-timeline"
              - generic [ref=e79]:
                - generic [ref=e80]:
                  - strong [ref=e81]: "0"
                  - paragraph [ref=e82]: Recent activity items
                - generic [ref=e83]:
                  - strong [ref=e84]: "0"
                  - paragraph [ref=e85]: Account team
                - generic [ref=e86]:
                  - strong [ref=e87]: —
                  - paragraph [ref=e88]: Objective coverage unavailable
            - region "Client details" [ref=e89]:
              - generic [ref=e90]:
                - heading "Client details" [level=2] [ref=e91]
                - button "Government info" [ref=e92] [cursor=pointer]
              - generic [ref=e93]:
                - generic [ref=e94]:
                  - term [ref=e95]: Primary POC at client
                  - definition [ref=e96]: Not provided
                - generic [ref=e97]:
                  - term [ref=e98]: Main company email
                  - definition [ref=e99]: Not provided
                - generic [ref=e100]:
                  - term [ref=e101]: Main company phone
                  - definition [ref=e102]: Not provided
                - generic [ref=e103]:
                  - term [ref=e104]: Engagement start date
                  - definition [ref=e105]: Not provided
                - generic [ref=e106]:
                  - term [ref=e107]: Small Business Classification
                  - definition [ref=e108]: Not provided
                - generic [ref=e109]:
                  - term [ref=e110]: Funding priorities
                  - definition [ref=e111]: Not provided
                - generic [ref=e112]:
                  - term [ref=e113]: Internal notes
                  - definition [ref=e114]: Not provided
            - generic [ref=e115]:
              - generic [ref=e116]:
                - heading "Objectives" [level=2] [ref=e117]
                - link "New objective" [ref=e118] [cursor=pointer]:
                  - /url: /portfolio/10000000-0000-4000-8000-000000000001/objectives?new=1
                  - img [ref=e119]
              - link "Test outcome Draft Test minimum win" [ref=e120] [cursor=pointer]:
                - /url: /portfolio/10000000-0000-4000-8000-000000000001/objectives?objective=30000000-0000-4000-8000-000000000001
                - generic [ref=e121]:
                  - strong [ref=e122]: Test outcome
                  - generic [ref=e123]: Draft
                - paragraph [ref=e124]: Test minimum win
              - link "View objectives" [ref=e125] [cursor=pointer]:
                - /url: /portfolio/10000000-0000-4000-8000-000000000001/objectives
                - text: View objectives
                - img [ref=e126]
          - generic [ref=e129]:
            - region "District nexus" [ref=e130]:
              - generic [ref=e131]:
                - generic [ref=e132]:
                  - heading "District nexus" [level=2] [ref=e133]
                  - paragraph [ref=e134]: 0 locations · 0 states · 0 districts
                - generic [ref=e135]:
                  - button "Add facility" [ref=e136] [cursor=pointer]
                  - button "Open district map" [ref=e137] [cursor=pointer]
              - generic [ref=e138]:
                - list
                - img "United States map illustration. No coordinate pins are available." [ref=e140]
              - paragraph [ref=e141]: No facilities yet. Add a location with the plus action.
            - generic [ref=e142]:
              - generic [ref=e143]:
                - heading "Client calendar" [level=2] [ref=e144]
                - link "Open client calendar" [ref=e145] [cursor=pointer]:
                  - /url: /portfolio/10000000-0000-4000-8000-000000000001/calendar
                  - img [ref=e146]
              - paragraph [ref=e149]: Meetings, preparation, notes and debriefs for this client.
              - link "Open calendar" [ref=e150] [cursor=pointer]:
                - /url: /portfolio/10000000-0000-4000-8000-000000000001/calendar
        - region "Activity timeline" [ref=e151]:
          - generic [ref=e153]:
            - paragraph [ref=e154]: Relationship history
            - heading "Activity timeline" [level=2] [ref=e155]
          - generic "Activity filters" [ref=e156]:
            - generic [ref=e157]:
              - generic [ref=e158]: Search activity
              - searchbox "Search activity" [ref=e159]
            - button "Activity type" [ref=e160] [cursor=pointer]: All activity
            - 'button "Activity dates: All dates" [ref=e161] [cursor=pointer]': All dates
          - paragraph [ref=e162]: No activity to show.
  - dialog [ref=e164]:
    - generic [ref=e165]:
      - combobox "Jump to a view" [expanded] [active] [ref=e166]
      - generic [ref=e167]: ⌘J / Ctrl J
    - paragraph [ref=e168]: Test Aerospace views
    - listbox "Client views" [ref=e169]:
      - option "Overview" [ref=e170] [cursor=pointer]:
        - generic [ref=e172]:
          - strong [ref=e173]: Overview
          - generic [ref=e174]: Tiles at a glance
        - generic [ref=e175]: G O
      - option "Objectives" [ref=e176] [cursor=pointer]:
        - generic [ref=e178]:
          - strong [ref=e179]: Objectives
          - generic [ref=e180]: Outcomes, strategy and Planner project
        - generic [ref=e181]: G J
      - option "Calendar" [ref=e182] [cursor=pointer]:
        - generic [ref=e184]:
          - strong [ref=e185]: Calendar
          - generic [ref=e186]: Meetings, hearings, plans, deadlines
        - generic [ref=e187]: G C
      - option "Relationships" [ref=e188] [cursor=pointer]:
        - generic [ref=e190]:
          - strong [ref=e191]: Relationships
          - generic [ref=e192]: Targets, people, organization
        - generic [ref=e193]: G R
      - option "Work" [ref=e194] [cursor=pointer]:
        - generic [ref=e196]:
          - strong [ref=e197]: Work
          - generic [ref=e198]: Strategies, tasks and documents
        - generic [ref=e199]: G W
      - option "Capabilities" [ref=e200] [cursor=pointer]:
        - generic [ref=e202]:
          - strong [ref=e203]: Capabilities
          - generic [ref=e204]: Capability areas, codes, documents
        - generic [ref=e205]: G K
      - option "Bill Tracker" [ref=e206] [cursor=pointer]:
        - generic [ref=e208]:
          - strong [ref=e209]: Bill Tracker
          - generic [ref=e210]: Tracked bills, stages, and latest updates
      - option "Opportunities" [ref=e211] [cursor=pointer]:
        - generic [ref=e213]:
          - strong [ref=e214]: Opportunities
          - generic [ref=e215]: Grants, contracts, budget programs
        - generic [ref=e216]: G Q
      - option "Files" [selected] [ref=e217] [cursor=pointer]:
        - generic [ref=e219]:
          - strong [ref=e220]: Files
          - generic [ref=e221]: Client documents and folders
        - generic [ref=e222]: G F
```

# Test source

```ts
  259 |   const unexpected = await installFixtures(page);
  260 |   await page.setViewportSize({ width: 390, height: 844 });
  261 |   await page.goto(`/portfolio/${clientId}`);
  262 |   await page
  263 |     .getByRole("button", { name: "Government info", exact: true })
  264 |     .click();
  265 |   const dialog = page.getByRole("dialog", {
  266 |     name: "Government info",
  267 |     exact: true,
  268 |   });
  269 |   await expect(
  270 |     dialog.getByText("Not provided", { exact: true }).first(),
  271 |   ).toBeVisible();
  272 |   expect(
  273 |     await dialog.evaluate(
  274 |       (element) => element.scrollWidth <= element.clientWidth,
  275 |     ),
  276 |   ).toBe(true);
  277 |   const box = await dialog.boundingBox();
  278 |   expect(box!.x).toBeGreaterThanOrEqual(0);
  279 |   expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  280 |   await page.keyboard.press("Tab");
  281 |   expect(
  282 |     await dialog.evaluate((element) =>
  283 |       element.contains(document.activeElement),
  284 |     ),
  285 |   ).toBe(true);
  286 |   await page.screenshot({ path: info.outputPath("government-mobile.png") });
  287 |   await page.keyboard.press("Escape");
  288 |   await expect(dialog).not.toBeVisible();
  289 |   expect(unexpected).toEqual([]);
  290 | });
  291 | 
  292 | test("CI-04 all three choice groups stack without horizontal overflow on mobile", async ({
  293 |   page,
  294 | }, info) => {
  295 |   const unexpected = await installFixtures(page);
  296 |   await page.setViewportSize({ width: 390, height: 844 });
  297 |   await page.goto("/portfolio");
  298 |   await page
  299 |     .getByRole("button", { name: "Add profile", exact: true })
  300 |     .first()
  301 |     .click();
  302 |   await page.getByRole("button", { name: /Manual entry/ }).click();
  303 |   const dialog = page.getByRole("dialog", { name: "Add profile", exact: true });
  304 |   for (const [tab, group] of [
  305 |     ["1. Company Info", "Small Business Classification"],
  306 |     ["2. Government Registration", "Federal set-aside certifications"],
  307 |     ["3. Sector & Tracks", "Active submission tracks"],
  308 |   ] as const) {
  309 |     await dialog.getByRole("button", { name: tab, exact: true }).click();
  310 |     const boxes = await dialog
  311 |       .getByRole("group", { name: group })
  312 |       .locator("label")
  313 |       .evaluateAll((labels) =>
  314 |         labels.map((label) => ({
  315 |           x: label.getBoundingClientRect().x,
  316 |           y: label.getBoundingClientRect().y,
  317 |         })),
  318 |       );
  319 |     expect(new Set(boxes.map((box) => Math.round(box.x))).size).toBe(1);
  320 |     expect(new Set(boxes.map((box) => Math.round(box.y))).size).toBe(
  321 |       boxes.length,
  322 |     );
  323 |     expect(
  324 |       await dialog.evaluate(
  325 |         (element) => element.scrollWidth <= element.clientWidth,
  326 |       ),
  327 |     ).toBe(true);
  328 |     await page.screenshot({
  329 |       path: info.outputPath(`${tab[0]}-choices-mobile.png`),
  330 |     });
  331 |   }
  332 |   expect(unexpected).toEqual([]);
  333 | });
  334 | 
  335 | test("CI-02 narrow dark view switcher keeps keyboard selection visible", async ({
  336 |   page,
  337 | }, info) => {
  338 |   const unexpected = await installFixtures(page);
  339 |   await page.setViewportSize({ width: 390, height: 600 });
  340 |   await page.emulateMedia({ colorScheme: "dark" });
  341 |   await page.goto(`/portfolio/${clientId}`);
  342 |   await expect(
  343 |     page.getByRole("button", { name: "Switch client view: Overview" }),
  344 |   ).toBeVisible();
  345 |   await page.keyboard.press("Control+j");
  346 |   const search = page.getByRole("combobox", { name: "Jump to a view" });
  347 |   await expect(search).toBeFocused();
  348 |   await search.press("ArrowUp");
  349 |   const selected = page.getByRole("option", { name: "Files", exact: true });
  350 |   await expect(selected).toHaveAttribute("aria-selected", "true");
  351 |   const box = await selected.boundingBox();
  352 |   expect(box!.y).toBeGreaterThanOrEqual(0);
  353 |   expect(box!.y + box!.height).toBeLessThanOrEqual(600);
  354 |   const inputBox = await search.boundingBox();
  355 |   const listBox = await page
  356 |     .getByRole("listbox", { name: "Client views" })
  357 |     .boundingBox();
  358 |   const popupBox = await page.getByRole("dialog").boundingBox();
> 359 |   expect(inputBox!.y).toBeGreaterThanOrEqual(popupBox!.y);
      |                       ^ Error: expect(received).toBeGreaterThanOrEqual(expected)
  360 |   expect(inputBox!.y + inputBox!.height).toBeLessThanOrEqual(listBox!.y);
  361 |   await page.screenshot({
  362 |     path: info.outputPath("view-switcher-mobile-dark.png"),
  363 |   });
  364 |   await search.press("Enter");
  365 |   await expect(page).toHaveURL(new RegExp(`/portfolio/${clientId}/files$`));
  366 |   expect(unexpected).toEqual([]);
  367 | });
  368 | 
```