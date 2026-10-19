# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: guarded.spec.ts >> Files source chips and folder cards retain native provenance at 360px
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
          - 'button "Switch client view: Files" [ref=e28] [cursor=pointer]': Files
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
        - heading "Client files" [level=1] [ref=e48]
        - generic [ref=e49]:
          - button "New folder" [disabled] [ref=e50]
          - button "Upload" [ref=e51] [cursor=pointer]
          - button "Create with Meri" [disabled] [ref=e52]
      - generic [ref=e53]:
        - textbox "Search files" [ref=e54]
        - combobox "File source" [ref=e55]:
          - option "All sources" [selected]
          - option "manual"
          - option "capability:40000000-0000-4000-8000-000000000001"
        - combobox "Sort files" [ref=e56]:
          - option "Created · newest" [selected]
          - option "Name"
      - generic [ref=e57]:
        - complementary [ref=e58]:
          - generic [ref=e59]:
            - generic [ref=e60]: Folders
            - button "Access" [disabled] [ref=e61]
          - button "Test Aerospace · 2" [pressed] [ref=e62] [cursor=pointer]
          - button "Reports 1" [ref=e63] [cursor=pointer]:
            - text: Reports
            - generic [ref=e65]: "1"
          - button "Unfiled 1" [ref=e66] [cursor=pointer]:
            - text: Unfiled
            - generic [ref=e68]: "1"
          - separator [ref=e69]
          - generic [ref=e70]: Visible file storage
          - paragraph [ref=e71]: 0.0 MiB
          - generic [ref=e72]: Storage quota is not provided by this service. Only accessible current attachments are counted.
        - generic [ref=e73]:
          - generic [ref=e74]:
            - generic [ref=e75]: 2 files · 0 selected
            - button "Move to folder" [disabled] [ref=e76]
          - table [ref=e78]:
            - rowgroup [ref=e79]:
              - row "Select visible files Name Linked to / location Created Owner Status Actions" [ref=e80]:
                - columnheader "Select visible files" [ref=e81]:
                  - checkbox "Select visible files" [ref=e82]
                - columnheader "Name" [ref=e83]
                - columnheader "Linked to / location" [ref=e84]
                - columnheader "Created" [ref=e85]
                - columnheader "Owner" [ref=e86]
                - columnheader "Status" [ref=e87]
                - columnheader "Actions" [ref=e88]:
                  - generic [ref=e89]: Actions
            - rowgroup [ref=e90]:
              - row "Select Report.pdf pdf Report.pdf manual Reports 10/1/2026 Unknown Text searchable Actions for Report.pdf" [ref=e91]:
                - cell "Select Report.pdf" [ref=e92]:
                  - checkbox "Select Report.pdf" [ref=e93]
                - cell "pdf Report.pdf manual" [ref=e94]:
                  - button "pdf Report.pdf" [ref=e95] [cursor=pointer]:
                    - generic [ref=e96]: pdf
                    - text: Report.pdf
                  - generic [ref=e97]: manual
                - cell "Reports" [ref=e98]
                - cell "10/1/2026" [ref=e99]
                - cell "Unknown" [ref=e100]
                - cell "Text searchable" [ref=e101]:
                  - generic [ref=e102]: Text searchable
                - cell "Actions for Report.pdf" [ref=e103]:
                  - button "Actions for Report.pdf" [ref=e104] [cursor=pointer]: ⋯
              - row "Select Capability.txt txt Capability.txt capability:40000000-0000-4000-8000-000000000001 Unfiled 10/1/2026 Unknown Text searchable Actions for Capability.txt" [ref=e105]:
                - cell "Select Capability.txt" [ref=e106]:
                  - checkbox "Select Capability.txt" [ref=e107]
                - cell "txt Capability.txt capability:40000000-0000-4000-8000-000000000001" [ref=e108]:
                  - button "txt Capability.txt" [ref=e109] [cursor=pointer]:
                    - generic [ref=e110]: txt
                    - text: Capability.txt
                  - generic [ref=e111]: capability:40000000-0000-4000-8000-000000000001
                - cell "Unfiled" [ref=e112]
                - cell "10/1/2026" [ref=e113]
                - cell "Unknown" [ref=e114]
                - cell "Text searchable" [ref=e115]:
                  - generic [ref=e116]: Text searchable
                - cell "Actions for Capability.txt" [ref=e117]:
                  - button "Actions for Capability.txt" [ref=e118] [cursor=pointer]: ⋯
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