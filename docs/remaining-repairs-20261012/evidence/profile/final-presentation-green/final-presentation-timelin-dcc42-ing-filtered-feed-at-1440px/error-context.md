# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: final-presentation.spec.ts >> timeline groups dates and expands the existing filtered feed at 1440px
- Location: apps/web/tests/browser/profile-presentation.spec.ts:144:7

# Error details

```
Error: expect(locator).toBeFocused() failed

Locator:  getByRole('dialog', { name: 'Quick log', exact: true }).getByLabel('Title', { exact: true })
Expected: focused
Received: inactive
Timeout:  5000ms

Call log:
  - Expect "toBeFocused" with timeout 5000ms
  - waiting for getByRole('dialog', { name: 'Quick log', exact: true }).getByLabel('Title', { exact: true })
    14 × locator resolved to <input value="" required="" name="title" maxlength="300"/>
       - unexpected value "inactive"

```

```yaml
- textbox "Title"
```

# Test source

```ts
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
  217 |       .click();
  218 |     const quickLog = page.getByRole("dialog", {
  219 |       name: "Quick log",
  220 |       exact: true,
  221 |     });
> 222 |     await expect(quickLog.getByLabel("Title", { exact: true })).toBeFocused();
      |                                                                 ^ Error: expect(locator).toBeFocused() failed
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
  318 |     dialog.getByLabel("Facility name", { exact: true }),
  319 |   ).not.toBeVisible();
  320 |   expect(writes).toHaveLength(1);
  321 |   expect(unexpected).toEqual([]);
  322 | });
```