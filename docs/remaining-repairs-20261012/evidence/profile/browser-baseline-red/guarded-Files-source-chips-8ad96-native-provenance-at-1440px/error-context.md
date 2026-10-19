# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: guarded.spec.ts >> Files source chips and folder cards retain native provenance at 1440px
- Location: apps/web/tests/browser/profile-presentation.spec.ts:212:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('group', { name: 'File source', exact: true }).getByRole('button', { name: 'manual', exact: true })

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - link "Skip to content" [ref=e3] [cursor=pointer]:
    - /url: "#main"
  - banner [ref=e4]:
    - link "Capiro Home" [ref=e5] [cursor=pointer]:
      - /url: /
      - img "Capiro" [ref=e6]
    - navigation "Workspace" [ref=e7]:
      - link "Meri" [ref=e8] [cursor=pointer]:
        - /url: /meri
      - link "Portfolio" [ref=e9] [cursor=pointer]:
        - /url: /
      - link "Modules" [ref=e10] [cursor=pointer]:
        - /url: /modules
    - navigation "Global actions" [ref=e11]:
      - link "Quick log" [ref=e12] [cursor=pointer]:
        - /url: /portfolio/10000000-0000-4000-8000-000000000001?log=1
      - link "Master calendar" [ref=e13] [cursor=pointer]:
        - /url: /calendar
      - link "Search Portfolio" [ref=e14] [cursor=pointer]:
        - /url: /portfolio?search=1
      - button "Updates unavailable" [disabled] [ref=e15]
      - button "Test account" [ref=e17] [cursor=pointer]: T
  - generic [ref=e18]:
    - complementary "Portfolio navigation" [ref=e19]:
      - paragraph [ref=e20]: Portfolio
      - navigation "Portfolio" [ref=e21]:
        - link "Portfolio Overview" [ref=e22] [cursor=pointer]:
          - /url: /portfolio
          - generic [ref=e23]: Overview
        - link "Portfolio Clients" [ref=e24] [cursor=pointer]:
          - /url: /portfolio?type=CLIENT
          - generic [ref=e25]: Clients
        - link "Portfolio Prospects" [ref=e26] [cursor=pointer]:
          - /url: /portfolio/prospects
          - generic [ref=e27]: Prospects
      - separator [ref=e28]
      - paragraph [ref=e29]: Test Aerospace
      - navigation "Client" [ref=e30]:
        - link "Overview" [ref=e31] [cursor=pointer]:
          - /url: /portfolio/10000000-0000-4000-8000-000000000001
          - generic [ref=e32]: Overview
        - link "Objectives" [ref=e33] [cursor=pointer]:
          - /url: /portfolio/10000000-0000-4000-8000-000000000001/objectives
          - generic [ref=e34]: Objectives
        - link "Calendar" [ref=e35] [cursor=pointer]:
          - /url: /portfolio/10000000-0000-4000-8000-000000000001/calendar
          - generic [ref=e36]: Calendar
        - link "Relationships" [ref=e37] [cursor=pointer]:
          - /url: /portfolio/10000000-0000-4000-8000-000000000001/relationships
          - generic [ref=e38]: Relationships
        - link "Work" [ref=e39] [cursor=pointer]:
          - /url: /portfolio/10000000-0000-4000-8000-000000000001/work
          - generic [ref=e40]: Work
        - link "Capabilities" [ref=e41] [cursor=pointer]:
          - /url: /portfolio/10000000-0000-4000-8000-000000000001/capabilities
          - generic [ref=e42]: Capabilities
        - link "Bill Tracker" [ref=e43] [cursor=pointer]:
          - /url: /portfolio/10000000-0000-4000-8000-000000000001/bills
          - generic [ref=e44]: Bill Tracker
        - link "Opportunities" [ref=e45] [cursor=pointer]:
          - /url: /portfolio/10000000-0000-4000-8000-000000000001/opportunities
          - generic [ref=e46]: Opportunities
        - link "Files" [ref=e47] [cursor=pointer]:
          - /url: /portfolio/10000000-0000-4000-8000-000000000001/files
          - generic [ref=e48]: Files
      - link "Settings" [ref=e50] [cursor=pointer]:
        - /url: /settings
    - main [ref=e51]:
      - generic [ref=e52]:
        - generic [ref=e53]:
          - navigation "Breadcrumb" [ref=e54]:
            - link "Back to Portfolio" [ref=e55] [cursor=pointer]:
              - /url: /portfolio
            - link "Portfolio" [ref=e56] [cursor=pointer]:
              - /url: /portfolio
            - generic [ref=e57]: /
            - link "Test Aerospace" [ref=e58] [cursor=pointer]:
              - /url: /portfolio/10000000-0000-4000-8000-000000000001
            - generic [ref=e59]: /
            - 'button "Switch client view: Files" [ref=e60] [cursor=pointer]': Files
          - generic [ref=e61]:
            - button "Quick add" [ref=e62] [cursor=pointer]:
              - generic [ref=e63]: Quick add
            - button "Meri actions" [ref=e64] [cursor=pointer]:
              - generic [ref=e65]: Meri actions
            - button "More actions for Test Aerospace" [ref=e66] [cursor=pointer]:
              - img [ref=e67]
        - region "Client identity" [ref=e71]:
          - generic [ref=e72]: TA
          - generic [ref=e73]:
            - strong [ref=e74]: Test Aerospace
            - paragraph [ref=e75]: Aerospace
          - generic [ref=e76]: active client
      - generic [ref=e78]:
        - generic [ref=e79]:
          - heading "Client files" [level=1] [ref=e80]
          - generic [ref=e81]:
            - button "New folder" [disabled] [ref=e82]
            - button "Upload" [ref=e83] [cursor=pointer]
            - button "Create with Meri" [disabled] [ref=e84]
        - generic [ref=e85]:
          - textbox "Search files" [ref=e86]
          - combobox "File source" [ref=e87]:
            - option "All sources" [selected]
            - option "manual"
            - option "capability:40000000-0000-4000-8000-000000000001"
          - combobox "Sort files" [ref=e88]:
            - option "Created · newest" [selected]
            - option "Name"
        - generic [ref=e89]:
          - complementary [ref=e90]:
            - generic [ref=e91]:
              - generic [ref=e92]: Folders
              - button "Access" [disabled] [ref=e93]
            - button "Test Aerospace · 2" [pressed] [ref=e94] [cursor=pointer]
            - button "Reports 1" [ref=e95] [cursor=pointer]:
              - text: Reports
              - generic [ref=e97]: "1"
            - button "Unfiled 1" [ref=e98] [cursor=pointer]:
              - text: Unfiled
              - generic [ref=e100]: "1"
            - separator [ref=e101]
            - generic [ref=e102]: Visible file storage
            - paragraph [ref=e103]: 0.0 MiB
            - generic [ref=e104]: Storage quota is not provided by this service. Only accessible current attachments are counted.
          - generic [ref=e105]:
            - generic [ref=e106]:
              - generic [ref=e107]: 2 files · 0 selected
              - button "Move to folder" [disabled] [ref=e108]
            - table [ref=e110]:
              - rowgroup [ref=e111]:
                - row "Select visible files Name Linked to / location Created Owner Status Actions" [ref=e112]:
                  - columnheader "Select visible files" [ref=e113]:
                    - checkbox "Select visible files" [ref=e114]
                  - columnheader "Name" [ref=e115]
                  - columnheader "Linked to / location" [ref=e116]
                  - columnheader "Created" [ref=e117]
                  - columnheader "Owner" [ref=e118]
                  - columnheader "Status" [ref=e119]
                  - columnheader "Actions" [ref=e120]:
                    - generic [ref=e121]: Actions
              - rowgroup [ref=e122]:
                - row "Select Report.pdf pdf Report.pdf manual Reports 10/1/2026 Unknown Text searchable Actions for Report.pdf" [ref=e123]:
                  - cell "Select Report.pdf" [ref=e124]:
                    - checkbox "Select Report.pdf" [ref=e125]
                  - cell "pdf Report.pdf manual" [ref=e126]:
                    - button "pdf Report.pdf" [ref=e127] [cursor=pointer]:
                      - generic [ref=e128]: pdf
                      - text: Report.pdf
                    - generic [ref=e129]: manual
                  - cell "Reports" [ref=e130]
                  - cell "10/1/2026" [ref=e131]
                  - cell "Unknown" [ref=e132]
                  - cell "Text searchable" [ref=e133]:
                    - generic [ref=e134]: Text searchable
                  - cell "Actions for Report.pdf" [ref=e135]:
                    - button "Actions for Report.pdf" [ref=e136] [cursor=pointer]: ⋯
                - row "Select Capability.txt txt Capability.txt capability:40000000-0000-4000-8000-000000000001 Unfiled 10/1/2026 Unknown Text searchable Actions for Capability.txt" [ref=e137]:
                  - cell "Select Capability.txt" [ref=e138]:
                    - checkbox "Select Capability.txt" [ref=e139]
                  - cell "txt Capability.txt capability:40000000-0000-4000-8000-000000000001" [ref=e140]:
                    - button "txt Capability.txt" [ref=e141] [cursor=pointer]:
                      - generic [ref=e142]: txt
                      - text: Capability.txt
                    - generic [ref=e143]: capability:40000000-0000-4000-8000-000000000001
                  - cell "Unfiled" [ref=e144]
                  - cell "10/1/2026" [ref=e145]
                  - cell "Unknown" [ref=e146]
                  - cell "Text searchable" [ref=e147]:
                    - generic [ref=e148]: Text searchable
                  - cell "Actions for Capability.txt" [ref=e149]:
                    - button "Actions for Capability.txt" [ref=e150] [cursor=pointer]: ⋯
```

# Test source

```ts
  122 |   });
  123 |   test(`timeline groups dates and expands the existing filtered feed at ${width}px`, async ({
  124 |     page,
  125 |   }, info) => {
  126 |     await page.setViewportSize({ width, height: 1040 });
  127 |     await page.clock.setFixedTime(new Date("2026-10-12T18:00:00Z"));
  128 |     const unexpected = await setup(page);
  129 |     await page.goto(`/portfolio/${clientId}`);
  130 |     const timeline = page.getByRole("region", {
  131 |       name: "Activity timeline",
  132 |       exact: true,
  133 |     });
  134 |     await expect(
  135 |       timeline.getByRole("heading", { name: "Today", exact: true }),
  136 |     ).toBeVisible();
  137 |     await expect(
  138 |       timeline.getByRole("heading", { name: "Yesterday", exact: true }),
  139 |     ).toBeVisible();
  140 |     await expect(timeline.locator("ol > li").first()).toHaveCSS(
  141 |       "min-height",
  142 |       "70px",
  143 |     );
  144 |     await timeline.screenshot({
  145 |       path: info.outputPath(`timeline-default-${width}.png`),
  146 |     });
  147 |     await timeline
  148 |       .getByRole("searchbox", { name: "Search activity", exact: true })
  149 |       .fill("call");
  150 |     await timeline
  151 |       .getByRole("button", { name: "Expand timeline ↗", exact: true })
  152 |       .click();
  153 |     const expanded = page.getByRole("dialog", {
  154 |       name: "Engagement timeline",
  155 |       exact: true,
  156 |     });
  157 |     await expect(
  158 |       expanded.getByRole("searchbox", { name: "Search activity", exact: true }),
  159 |     ).toHaveValue("call");
  160 |     await expect(
  161 |       expanded.getByText("call today", { exact: true }),
  162 |     ).toBeVisible();
  163 |     await expect(
  164 |       expanded.getByText("note yesterday", { exact: true }),
  165 |     ).not.toBeVisible();
  166 |     const icon = expanded.locator('img[src$="phone.svg"]');
  167 |     await expect(icon).toHaveJSProperty("complete", true);
  168 |     expect(
  169 |       await icon.evaluate(
  170 |         (element) =>
  171 |           element instanceof HTMLImageElement &&
  172 |           element.complete &&
  173 |           element.naturalWidth === 16,
  174 |       ),
  175 |     ).toBe(true);
  176 |     await expanded
  177 |       .getByRole("searchbox", { name: "Search activity", exact: true })
  178 |       .fill("");
  179 |     await expect(
  180 |       expanded.getByRole("button", {
  181 |         name: "Activity actions: note yesterday",
  182 |         exact: true,
  183 |       }),
  184 |     ).toHaveCount(0);
  185 |     await page.screenshot({
  186 |       path: info.outputPath(`timeline-expanded-${width}.png`),
  187 |       fullPage: true,
  188 |     });
  189 |     await page.keyboard.press("Tab");
  190 |     expect(
  191 |       await expanded.evaluate((element) =>
  192 |         element.contains(document.activeElement),
  193 |       ),
  194 |     ).toBe(true);
  195 |     await expanded
  196 |       .getByRole("button", { name: "Log activity", exact: true })
  197 |       .click();
  198 |     const quickLog = page.getByRole("dialog", {
  199 |       name: "Quick log",
  200 |       exact: true,
  201 |     });
  202 |     await expect(quickLog.getByLabel("Title", { exact: true })).toBeFocused();
  203 |     await page.keyboard.press("Escape");
  204 |     await expect(quickLog).not.toBeVisible();
  205 |     await expect(expanded).not.toBeVisible();
  206 |     await expect(
  207 |       timeline.getByText("note yesterday", { exact: true }),
  208 |     ).toBeVisible();
  209 |     await fit(page);
  210 |     expect(unexpected).toEqual([]);
  211 |   });
  212 |   test(`Files source chips and folder cards retain native provenance at ${width}px`, async ({
  213 |     page,
  214 |   }, info) => {
  215 |     await page.setViewportSize({ width, height: 1040 });
  216 |     const unexpected = await setup(page);
  217 |     await page.goto(`/portfolio/${clientId}/files`);
  218 |     const sources = page.getByRole("group", {
  219 |       name: "File source",
  220 |       exact: true,
  221 |     });
> 222 |     await sources.getByRole("button", { name: "manual", exact: true }).click();
      |                                                                        ^ Error: locator.click: Test timeout of 30000ms exceeded.
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
  321 |     .fill("Uncertain new lab");
  322 |   await dialog
```