# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: guarded.spec.ts >> facilities manager preserves the unknown create fence across close and reopen
- Location: apps/web/tests/browser/profile-presentation.spec.ts:323:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('dialog', { name: 'Facilities: Test Aerospace', exact: true }).getByLabel('Facility name', { exact: true })

```

# Page snapshot

```yaml
- generic:
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
                - generic:
                  - paragraph: Relationship history
                  - heading [level=2]: Activity timeline
              - generic:
                - generic:
                  - generic: Search activity
                  - searchbox
                - button: All activity
                - button: All dates
              - list:
                - listitem:
                  - generic:
                    - generic:
                      - strong: call today
                      - generic:
                        - time: 10/12/2026, 8:13:24 PM
                        - generic:
                          - button: ⋯
                    - generic: call
                    - paragraph: Synthetic activity detail
                - listitem:
                  - generic:
                    - generic:
                      - strong: note yesterday
                      - generic:
                        - time: 10/11/2026, 8:13:24 PM
                        - generic:
                          - button: ⋯
                    - generic: note
                    - paragraph: Synthetic activity detail
  - dialog "Add facility" [ref=e2]:
    - banner [ref=e3]:
      - heading "Add facility" [level=2] [ref=e4]
      - button "Close" [ref=e5] [cursor=pointer]:
        - img [ref=e6]
    - paragraph [ref=e9]: Location for Test Aerospace. Complete the address to request automatic geocoding.
    - generic [ref=e10]:
      - group "Facility details" [ref=e11]:
        - generic [ref=e12]: Facility details
        - generic [ref=e13]:
          - text: Facility name
          - textbox "Facility name" [active] [ref=e14]
        - generic [ref=e15]:
          - text: Street address
          - textbox "Street address" [ref=e16]
        - generic [ref=e17]:
          - generic [ref=e18]:
            - text: City
            - textbox "City" [ref=e19]
          - generic [ref=e20]:
            - text: State / territory
            - textbox "State / territory" [ref=e21]:
              - /placeholder: CA
          - generic [ref=e22]:
            - text: ZIP code
            - textbox "ZIP code" [ref=e23]
          - generic [ref=e24]:
            - text: Employees
            - spinbutton "Employees" [ref=e25]
          - generic [ref=e26]:
            - text: Congressional district
            - textbox "Congressional district" [ref=e27]:
              - /placeholder: 12 or 00
          - generic [ref=e28]:
            - text: State House district
            - textbox "State House district" [ref=e29]
          - generic [ref=e30]:
            - text: State Senate district
            - textbox "State Senate district" [ref=e31]
        - paragraph [ref=e32]: Use a bare House district number, or 00 for at-large. Leave districts blank to resolve from the address. A later successful geocode can replace manual state districts.
        - generic [ref=e33]:
          - generic [ref=e34]: Notes
          - textbox "Notes" [ref=e35]
      - generic [ref=e36]:
        - button "Cancel" [ref=e37] [cursor=pointer]
        - button "Add facility" [ref=e38] [cursor=pointer]
```

# Test source

```ts
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
  318 |     dialog.getByLabel("Facility name", { exact: true }),
  319 |   ).not.toBeVisible();
  320 |   expect(writes).toHaveLength(1);
  321 |   expect(unexpected).toEqual([]);
  322 | });
  323 | test("facilities manager preserves the unknown create fence across close and reopen", async ({
  324 |   page,
  325 | }) => {
  326 |   const unexpected = await setup(page);
  327 |   let writes = 0;
  328 |   await page.route(`**/clients/${clientId}/facilities`, (route) => {
  329 |     if (route.request().method() === "GET") return json(route, [facility]);
  330 |     writes++;
  331 |     return json(route, { message: "Synthetic ambiguous facility save" }, 503);
  332 |   });
  333 |   await page.goto(`/portfolio/${clientId}`);
  334 |   await page.getByRole("button", { name: "Add facility", exact: true }).click();
  335 |   const dialog = page.getByRole("dialog", {
  336 |     name: "Facilities: Test Aerospace",
  337 |     exact: true,
  338 |   });
  339 |   await dialog
  340 |     .getByLabel("Facility name", { exact: true })
> 341 |     .fill("Uncertain new lab");
      |      ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  342 |   await dialog
  343 |     .getByRole("button", { name: "Save facility", exact: true })
  344 |     .click();
  345 |   await expect(dialog.getByText(/creation result is unknown/i)).toBeVisible();
  346 |   await expect(
  347 |     dialog.getByRole("button", { name: "Save facility", exact: true }),
  348 |   ).toBeDisabled();
  349 |   await dialog.getByRole("button", { name: "Done", exact: true }).click();
  350 |   await page.getByRole("button", { name: "Add facility", exact: true }).click();
  351 |   await expect(
  352 |     dialog.getByRole("button", { name: "Save facility", exact: true }),
  353 |   ).toBeDisabled();
  354 |   expect(writes).toBe(1);
  355 |   expect(unexpected).toEqual([]);
  356 | });
  357 | 
```