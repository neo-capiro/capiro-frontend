# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: guarded.spec.ts >> Files source chips and folder cards retain native provenance at 360px
- Location: apps/web/tests/browser/profile-presentation.spec.ts:212:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('cell', { name: 'pdf Report.pdf', exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('cell', { name: 'pdf Report.pdf', exact: true })

```

```yaml
- link "Skip to content":
  - /url: "#main"
- banner:
  - button "Toggle navigation"
  - link "Capiro Home":
    - /url: /
    - img "Capiro"
  - button "Switch workspace"
  - navigation "Global actions":
    - link "Quick log":
      - /url: /portfolio/10000000-0000-4000-8000-000000000001?log=1
    - link "Master calendar":
      - /url: /calendar
    - link "Search Portfolio":
      - /url: /portfolio?search=1
    - button "Updates unavailable" [disabled]
    - button "Test account": T
- main:
  - navigation "Breadcrumb":
    - link "Back to Portfolio":
      - /url: /portfolio
    - link "Portfolio":
      - /url: /portfolio
    - link "Test Aerospace":
      - /url: /portfolio/10000000-0000-4000-8000-000000000001
    - 'button "Switch client view: Files"': Files
  - button "Quick add"
  - button "Meri actions"
  - button "More actions for Test Aerospace"
  - region "Client identity":
    - text: TA
    - strong: Test Aerospace
    - paragraph: Aerospace
    - text: active client
  - heading "Client files" [level=1]
  - button "New folder" [disabled]
  - button "Upload"
  - button "Create with Meri" [disabled]
  - textbox "Search files":
    - /placeholder: Search files…
  - group "File source":
    - button "All"
    - button "manual" [pressed]
    - button "capability:40000000-0000-4000-8000-000000000001"
  - text: Sort by
  - combobox "Sort files":
    - option "Created · newest" [selected]
    - option "Name"
  - group "File view":
    - button "Folders"
    - button "All files" [pressed]
  - complementary:
    - text: Folders
    - button "Access" [disabled]
    - button "Test Aerospace · 2" [pressed]
    - button "Reports 1"
    - button "Unfiled 1"
    - separator
    - text: Visible file storage
    - paragraph: 0.0 MiB
    - text: Storage quota is not provided by this service. Only accessible current attachments are counted.
  - region "All client files":
    - button "Test Aerospace"
    - text: 1 files
    - button "Upload here"
    - text: 1 files · 0 selected
    - button "Move to folder" [disabled]
    - table:
      - rowgroup:
        - row "Select visible files Name Linked to / location Created Owner Status Actions":
          - columnheader "Select visible files":
            - checkbox "Select visible files"
          - columnheader "Name"
          - columnheader "Linked to / location"
          - columnheader "Created"
          - columnheader "Owner"
          - columnheader "Status"
          - columnheader "Actions"
      - rowgroup:
        - row "Select Report.pdf pdf Report.pdf manual Reports 10/1/2026 Unknown Text searchable Actions for Report.pdf":
          - cell "Select Report.pdf":
            - checkbox "Select Report.pdf"
          - cell "pdf Report.pdf manual":
            - button "pdf Report.pdf"
            - text: manual
          - cell "Reports"
          - cell "10/1/2026"
          - cell "Unknown"
          - cell "Text searchable"
          - cell "Actions for Report.pdf":
            - button "Actions for Report.pdf": ⋯
```

# Test source

```ts
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
  222 |     await sources.getByRole("button", { name: "manual", exact: true }).click();
  223 |     await expect(
  224 |       page.getByRole("cell", { name: "pdf Report.pdf", exact: true }),
> 225 |     ).toBeVisible();
      |       ^ Error: expect(locator).toBeVisible() failed
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
  323 |     .getByRole("button", { name: "Save facility", exact: true })
  324 |     .click();
  325 |   await expect(dialog.getByText(/creation result is unknown/i)).toBeVisible();
```