# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: guarded.spec.ts >> Files source chips and folder cards retain native provenance at 1440px
- Location: apps/web/tests/browser/profile-presentation.spec.ts:232:7

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
  217 |       .click();
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
> 242 |     await sources.getByRole("button", { name: "manual", exact: true }).click();
      |                                                                        ^ Error: locator.click: Test timeout of 30000ms exceeded.
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
  341 |     .fill("Uncertain new lab");
  342 |   await dialog
```