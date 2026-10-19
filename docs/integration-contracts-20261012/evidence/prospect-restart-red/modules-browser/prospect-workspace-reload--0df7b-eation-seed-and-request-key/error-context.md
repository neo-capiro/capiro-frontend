# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: prospect-workspace.spec.ts >> reload preserves the original prospect creation seed and request key
- Location: test/browser/prospect-workspace.spec.ts:289:1

# Error details

```
Error: expect(locator).toBeEnabled() failed

Locator: getByRole('button', { name: 'Recover original draft' })
Expected: enabled
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeEnabled" with timeout 5000ms
  - waiting for getByRole('button', { name: 'Recover original draft' })

```

```yaml
- link "Skip to content":
  - /url: "#main-content"
- banner:
  - link "Capiro Home":
    - /url: /
    - img "Capiro"
  - navigation "Product modes":
    - link "Meri":
      - /url: /meri
    - link "Portfolio":
      - /url: /
    - link "Modules":
      - /url: /modules
  - navigation "Workspace actions":
    - link "Quick log":
      - /url: /?log=1
    - link "Master calendar":
      - /url: /calendar
    - link "Search intelligence":
      - /url: /modules/intelligence
    - button "Updates — unavailable" [disabled]
    - link "Account settings":
      - /url: /settings/personal
- complementary:
  - paragraph: Modules
  - navigation "Modules":
    - link "Module hub":
      - /url: /modules
    - link "Engagement":
      - /url: /modules/engagement
    - link "Planner":
      - /url: /modules/planner
    - link "Calendar":
      - /url: /modules/calendar
    - link "Workspace":
      - /url: /modules/workspace
    - link "Strategies":
      - /url: /modules/strategies
    - link "Directory":
      - /url: /modules/directory
    - link "Intelligence":
      - /url: /modules/intelligence
    - link "Research portfolios":
      - /url: /modules/research-portfolios
  - link "Settings":
    - /url: /settings/personal
- main:
  - navigation "Breadcrumb":
    - link "← Modules":
      - /url: /modules
    - combobox "Switch module": Workspace
  - link "← Prospect":
    - /url: /portfolio/prospects/30000000-0000-4000-8000-000000000001
  - heading "Prospect Workspace" [level=1]
  - paragraph: Manual documents for this exact prospect. Conversion retains their origin.
  - button "Refresh documents"
  - heading "Documents" [level=2]
  - paragraph: No documents are available for this prospect.
  - heading "New manual document" [level=2]
  - text: New prospect document title
  - textbox "New prospect document title"
  - button "Create manual draft" [disabled]
  - paragraph: Current membership, prospect status, converted-client access and document permissions are checked by the service. Ownership alone does not grant access.
  - button "Sharing unavailable" [disabled]
  - button "Sending unavailable" [disabled]
  - button "Generation unavailable" [disabled]
- paragraph: Explicit local test fixture · synthetic identity and records
```

# Test source

```ts
  208 |   await expect(page.getByLabel("Body content")).toHaveValue("My text");
  209 | });
  210 | test("mobile prospect manual editor preserves keyboard fields and stays in the viewport", async ({
  211 |   page,
  212 | }) => {
  213 |   await setup(page);
  214 |   await page.setViewportSize({ width: 390, height: 844 });
  215 |   await page.emulateMedia({ colorScheme: "dark" });
  216 |   await page.goto(detail);
  217 |   await page.getByLabel("Document title").focus();
  218 |   await expect(page.getByLabel("Document title")).toBeFocused();
  219 |   await page.getByLabel("Body content").fill("Manual only");
  220 |   expect(
  221 |     await page.evaluate(
  222 |       () => document.documentElement.scrollWidth <= innerWidth,
  223 |     ),
  224 |   ).toBe(true);
  225 |   await page.screenshot({
  226 |     path: "test-results/prospect-workspace-mobile.png",
  227 |     fullPage: true,
  228 |   });
  229 | });
  230 | 
  231 | test("leaving during save preflight aborts the write and retains the uncertain editor", async ({
  232 |   page,
  233 | }) => {
  234 |   const { writes } = await setup(page);
  235 |   let reads = 0,
  236 |     started = false;
  237 |   let release!: () => void;
  238 |   const held = new Promise<void>((resolve) => {
  239 |     release = resolve;
  240 |   });
  241 |   await page.route("**/api/capiro/workspace.draft?*", async (route) => {
  242 |     if (++reads === 2) {
  243 |       started = true;
  244 |       await held;
  245 |     }
  246 |     await route.fulfill({ json: draft }).catch(() => {});
  247 |   });
  248 |   await page.goto(detail);
  249 |   await page.getByLabel("Body content").fill("Interrupted manual text");
  250 |   await page.getByRole("button", { name: "Save draft", exact: true }).click();
  251 |   await expect.poll(() => started).toBe(true);
  252 |   await page.getByRole("button", { name: "← Workspace", exact: true }).click();
  253 |   await expect(
  254 |     page.getByRole("heading", { name: "Prospect Workspace", exact: true }),
  255 |   ).toBeVisible();
  256 |   release();
  257 |   await page.goBack();
  258 |   await expect(page.getByLabel("Body content")).toHaveValue(
  259 |     "Interrupted manual text",
  260 |   );
  261 |   await expect(
  262 |     page.getByRole("button", { name: "Save draft", exact: true }),
  263 |   ).toBeDisabled();
  264 |   expect(writes).toEqual([]);
  265 | });
  266 | 
  267 | test("expired creation sends one original request and clears the authenticated editor", async ({
  268 |   page,
  269 | }) => {
  270 |   const { writes } = await setup(page);
  271 |   await page.route("**/api/capiro/workspace.prospect.create", (route) =>
  272 |     route.fulfill({ status: 401, json: { message: "Expired" } }),
  273 |   );
  274 |   await page.goto(base);
  275 |   await page
  276 |     .getByLabel("New prospect document title")
  277 |     .fill("Private unsaved text");
  278 |   await page.getByRole("button", { name: "Create manual draft" }).click();
  279 |   await expect(
  280 |     page.getByRole("heading", { name: "Your session expired" }),
  281 |   ).toBeVisible();
  282 |   await expect(page.getByLabel("New prospect document title")).toHaveCount(0);
  283 |   await expect(
  284 |     page.getByRole("button", { name: "Recover original draft" }),
  285 |   ).toHaveCount(0);
  286 |   expect(writes).toHaveLength(1);
  287 | });
  288 | 
  289 | test("reload preserves the original prospect creation seed and request key", async ({
  290 |   page,
  291 | }) => {
  292 |   const { writes, errors } = await setup(page);
  293 |   let attempts = 0;
  294 |   await page.route("**/api/capiro/workspace.prospect.create", (route) =>
  295 |     ++attempts === 1
  296 |       ? route.abort("connectionreset")
  297 |       : route.fulfill({ json: draft }),
  298 |   );
  299 |   await page.goto(base);
  300 |   await page.getByLabel("New prospect document title").fill(draft.docTitle);
  301 |   await page.getByRole("button", { name: "Create manual draft" }).click();
  302 |   await expect(
  303 |     page.getByRole("button", { name: "Recover original draft" }),
  304 |   ).toBeEnabled();
  305 |   await page.reload();
  306 |   await expect(
  307 |     page.getByRole("button", { name: "Recover original draft" }),
> 308 |   ).toBeEnabled();
      |     ^ Error: expect(locator).toBeEnabled() failed
  309 |   await page.getByRole("button", { name: "Recover original draft" }).click();
  310 |   await expect(page.getByLabel("Document title")).toHaveValue(draft.docTitle);
  311 |   expect(writes).toHaveLength(2);
  312 |   expect(writes[0]!.body).toEqual(writes[1]!.body);
  313 |   expect(writes[0]!.body).toEqual({
  314 |     body: {
  315 |       prospectId,
  316 |       docTitle: draft.docTitle,
  317 |       requestId: expect.stringMatching(/^[a-f0-9-]{36}$/),
  318 |     },
  319 |   });
  320 |   expect(errors).toEqual([]);
  321 | });
  322 | test("reload preserves uncertain manual edits and the read-back requirement", async ({
  323 |   page,
  324 | }) => {
  325 |   const { writes } = await setup(page);
  326 |   await page.route("**/api/capiro/workspace.draft.update", (route) =>
  327 |     route.abort("connectionreset"),
  328 |   );
  329 |   await page.goto(detail);
  330 |   await page.getByLabel("Body content").fill("Keep this draft");
  331 |   await page.getByRole("button", { name: "Save draft", exact: true }).click();
  332 |   await expect(page.getByText(/previous save is not confirmed/)).toBeVisible();
  333 |   await expect(
  334 |     page.getByRole("button", { name: "Save draft", exact: true }),
  335 |   ).toBeDisabled();
  336 |   await page.reload();
  337 |   await expect(page.getByLabel("Body content")).toHaveValue("Keep this draft");
  338 |   await expect(
  339 |     page.getByRole("button", { name: "Save draft", exact: true }),
  340 |   ).toBeDisabled();
  341 |   expect(writes).toHaveLength(1);
  342 |   await page.getByRole("button", { name: "Read current document" }).click();
  343 |   await expect(
  344 |     page.getByRole("button", { name: "Save draft", exact: true }),
  345 |   ).toBeEnabled();
  346 |   expect(writes).toHaveLength(1);
  347 | });
  348 | 
```