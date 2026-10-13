# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: guarded.spec.ts >> facilities manager preserves the unknown create fence across close and reopen
- Location: apps/web/tests/browser/profile-presentation.spec.ts:303:5

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
                      - alert:
                        - paragraph: No fixture for this contract
                        - button: Retry
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
                        - time: 10/12/2026, 12:00:00 PM
                        - generic:
                          - button: ⋯
                    - generic: call
                    - paragraph: Synthetic activity detail
                - listitem:
                  - generic:
                    - generic:
                      - strong: note yesterday
                      - generic:
                        - time: 10/11/2026, 12:00:00 PM
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
  221 |     });
  222 |     await sources.getByRole("button", { name: "manual", exact: true }).click();
  223 |     await expect(
  224 |       page.getByRole("cell", { name: "pdf Report.pdf", exact: true }),
  225 |     ).toBeVisible();
  226 |     await expect(
  227 |       page.getByRole("cell", { name: "txt Capability.txt", exact: true }),
  228 |     ).not.toBeVisible();
  229 |     await sources.getByRole("button", { name: "All", exact: true }).click();
  230 |     await page
  231 |       .getByRole("group", { name: "File view" })
  232 |       .getByRole("button", { name: "Folders", exact: true })
  233 |       .click();
  234 |     await expect(
  235 |       page.getByRole("button", { name: "Open folder Reports", exact: true }),
  236 |     ).toContainText("1 file");
  237 |     await page.screenshot({
  238 |       path: info.outputPath(`files-folders-${width}.png`),
  239 |       fullPage: true,
  240 |     });
  241 |     await page
  242 |       .getByRole("button", { name: "Open folder Reports", exact: true })
  243 |       .click();
  244 |     const result = page.getByRole("region", {
  245 |       name: "Folder Reports",
  246 |       exact: true,
  247 |     });
  248 |     await expect(
  249 |       result.getByRole("button", { name: "Upload here", exact: true }),
  250 |     ).toBeDisabled();
  251 |     await expect(result).toContainText(
  252 |       "Uploads cannot be placed directly in a named folder",
  253 |     );
  254 |     await expect(
  255 |       result.getByRole("checkbox", { name: "Select Report.pdf", exact: true }),
  256 |     ).toBeVisible();
  257 |     await result
  258 |       .getByRole("button", { name: "Test Aerospace", exact: true })
  259 |       .click();
  260 |     await expect(
  261 |       page.getByRole("button", { name: "Upload here", exact: true }),
  262 |     ).toBeEnabled();
  263 |     await page.screenshot({
  264 |       path: info.outputPath(`files-table-${width}.png`),
  265 |       fullPage: true,
  266 |     });
  267 |     await fit(page);
  268 |     expect(unexpected).toEqual([]);
  269 |   });
  270 | }
  271 | test("facilities manager saves inline edits through the existing receipt contract", async ({
  272 |   page,
  273 | }) => {
  274 |   const unexpected = await setup(page);
  275 |   let current = { ...facility };
  276 |   const writes: unknown[] = [];
  277 |   await page.route(`**/clients/${clientId}/facilities**`, (route) => {
  278 |     if (route.request().method() === "GET") return json(route, [current]);
  279 |     writes.push(route.request().postDataJSON());
  280 |     current = { ...current, ...route.request().postDataJSON() };
  281 |     return json(route, { ...current, tenantId: "tenant-test" });
  282 |   });
  283 |   await page.goto(`/portfolio/${clientId}`);
  284 |   await page.getByRole("button", { name: "Add facility", exact: true }).click();
  285 |   const dialog = page.getByRole("dialog", {
  286 |     name: "Facilities: Test Aerospace",
  287 |     exact: true,
  288 |   });
  289 |   await dialog.getByRole("button", { name: "Edit", exact: true }).click();
  290 |   await dialog.getByLabel("Facility name", { exact: true }).fill("Updated lab");
  291 |   await dialog
  292 |     .getByRole("button", { name: "Save facility", exact: true })
  293 |     .click();
  294 |   await expect(
  295 |     dialog.getByRole("heading", { name: "Updated lab", exact: true }),
  296 |   ).toBeVisible();
  297 |   await expect(
  298 |     dialog.getByLabel("Facility name", { exact: true }),
  299 |   ).not.toBeVisible();
  300 |   expect(writes).toHaveLength(1);
  301 |   expect(unexpected).toEqual([]);
  302 | });
  303 | test("facilities manager preserves the unknown create fence across close and reopen", async ({
  304 |   page,
  305 | }) => {
  306 |   const unexpected = await setup(page);
  307 |   let writes = 0;
  308 |   await page.route(`**/clients/${clientId}/facilities`, (route) => {
  309 |     if (route.request().method() === "GET") return json(route, [facility]);
  310 |     writes++;
  311 |     return json(route, { message: "Synthetic ambiguous facility save" }, 503);
  312 |   });
  313 |   await page.goto(`/portfolio/${clientId}`);
  314 |   await page.getByRole("button", { name: "Add facility", exact: true }).click();
  315 |   const dialog = page.getByRole("dialog", {
  316 |     name: "Facilities: Test Aerospace",
  317 |     exact: true,
  318 |   });
  319 |   await dialog
  320 |     .getByLabel("Facility name", { exact: true })
> 321 |     .fill("Uncertain new lab");
      |      ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  322 |   await dialog
  323 |     .getByRole("button", { name: "Save facility", exact: true })
  324 |     .click();
  325 |   await expect(dialog.getByText(/creation result is unknown/i)).toBeVisible();
  326 |   await expect(
  327 |     dialog.getByRole("button", { name: "Save facility", exact: true }),
  328 |   ).toBeDisabled();
  329 |   await dialog.getByRole("button", { name: "Done", exact: true }).click();
  330 |   await page.getByRole("button", { name: "Add facility", exact: true }).click();
  331 |   await expect(
  332 |     dialog.getByRole("button", { name: "Save facility", exact: true }),
  333 |   ).toBeDisabled();
  334 |   expect(writes).toBe(1);
  335 |   expect(unexpected).toEqual([]);
  336 | });
  337 | 
```