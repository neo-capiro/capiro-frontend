# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: prospect-workspace.spec.ts >> leaving during save preflight aborts the write and retains the uncertain editor
- Location: test/browser/prospect-workspace.spec.ts:231:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByLabel('Body content')

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - link "Skip to content" [ref=e4] [cursor=pointer]:
      - /url: "#main-content"
    - banner [ref=e5]:
      - link "Capiro Home" [ref=e6] [cursor=pointer]:
        - /url: /
        - img "Capiro" [ref=e7]
      - navigation "Product modes" [ref=e8]:
        - link "Meri" [ref=e9] [cursor=pointer]:
          - /url: /meri
          - img [ref=e11]
        - link "Portfolio" [ref=e12] [cursor=pointer]:
          - /url: /
          - img [ref=e14]
        - link "Modules" [ref=e15] [cursor=pointer]:
          - /url: /modules
          - img [ref=e17]
      - navigation "Workspace actions" [ref=e18]:
        - link "Quick log" [ref=e19] [cursor=pointer]:
          - /url: /?log=1
          - img [ref=e21]
        - link "Master calendar" [ref=e22] [cursor=pointer]:
          - /url: /calendar
          - img [ref=e24]
        - link "Search intelligence" [ref=e25] [cursor=pointer]:
          - /url: /modules/intelligence
          - img [ref=e27]
        - button "Updates — unavailable" [disabled] [ref=e28]:
          - img [ref=e30]
        - link "Account settings" [ref=e31] [cursor=pointer]:
          - /url: /settings/personal
          - img [ref=e33]
    - generic [ref=e34]:
      - complementary [ref=e35]:
        - paragraph [ref=e36]: Modules
        - navigation "Modules" [ref=e37]:
          - link "Module hub" [ref=e38] [cursor=pointer]:
            - /url: /modules
            - img [ref=e40]
            - generic [ref=e41]: Module hub
          - link "Engagement" [ref=e42] [cursor=pointer]:
            - /url: /modules/engagement
            - img [ref=e44]
            - generic [ref=e45]: Engagement
          - link "Planner" [ref=e46] [cursor=pointer]:
            - /url: /modules/planner
            - img [ref=e48]
            - generic [ref=e49]: Planner
          - link "Calendar" [ref=e50] [cursor=pointer]:
            - /url: /modules/calendar
            - img [ref=e52]
            - generic [ref=e53]: Calendar
          - link "Workspace" [ref=e54] [cursor=pointer]:
            - /url: /modules/workspace
            - img [ref=e56]
            - generic [ref=e57]: Workspace
          - link "Strategies" [ref=e58] [cursor=pointer]:
            - /url: /modules/strategies
            - img [ref=e60]
            - generic [ref=e61]: Strategies
          - link "Directory" [ref=e62] [cursor=pointer]:
            - /url: /modules/directory
            - img [ref=e64]
            - generic [ref=e65]: Directory
          - link "Intelligence" [ref=e66] [cursor=pointer]:
            - /url: /modules/intelligence
            - img [ref=e68]
            - generic [ref=e69]: Intelligence
          - link "Research portfolios" [ref=e70] [cursor=pointer]:
            - /url: /modules/research-portfolios
            - img [ref=e72]
            - generic [ref=e73]: Research portfolios
        - link "Settings" [ref=e74] [cursor=pointer]:
          - /url: /settings/personal
          - img [ref=e76]
          - generic [ref=e77]: Settings
      - main [ref=e78]:
        - navigation "Breadcrumb" [ref=e79]:
          - link "← Modules" [ref=e80] [cursor=pointer]:
            - /url: /modules
          - generic [ref=e81]: /
          - combobox "Switch module" [ref=e82] [cursor=pointer]:
            - generic: Workspace
            - img [ref=e83]
        - status [ref=e85]:
          - paragraph [ref=e86]: Checking saved prospect edits…
          - button "← Workspace" [ref=e87] [cursor=pointer]
  - paragraph [ref=e88]: Explicit local test fixture · synthetic identity and records
```

# Test source

```ts
  149 | for (const field of ["prospectId", "tenantId"] as const)
  150 |   test(`a wrong ${field} never exposes the document or writes`, async ({
  151 |     page,
  152 |   }) => {
  153 |     const { writes } = await setup(page);
  154 |     await page.route("**/api/capiro/workspace.draft?*", (route) =>
  155 |       route.fulfill({ json: { ...draft, [field]: otherId } }),
  156 |     );
  157 |     await page.goto(detail);
  158 |     await expect(page.getByRole("main").getByRole("alert")).toContainText(
  159 |       "does not match",
  160 |     );
  161 |     await expect(page.getByLabel("Document title")).toHaveCount(0);
  162 |     expect(writes).toEqual([]);
  163 |   });
  164 | test("prospect Newsletter origin cannot open its sending workflow", async ({
  165 |   page,
  166 | }) => {
  167 |   const { writes } = await setup(page);
  168 |   await page.route("**/api/capiro/workspace.draft?*", (route) =>
  169 |     route.fulfill({ json: { ...draft, product: "Newsletter" } }),
  170 |   );
  171 |   await page.goto(`/modules/workspace?draftId=${draft.id}`);
  172 |   await expect(page.getByText(/Immutable prospect origin/)).toBeVisible();
  173 |   await expect(
  174 |     page.getByRole("button", { name: /send|generat|share/i }),
  175 |   ).toHaveCount(0);
  176 |   expect(writes).toEqual([]);
  177 | });
  178 | test("a changed document blocks PATCH and shows the saved content for deliberate review", async ({
  179 |   page,
  180 | }) => {
  181 |   const { writes } = await setup(page);
  182 |   let reads = 0;
  183 |   await page.route("**/api/capiro/workspace.draft?*", (route) =>
  184 |     route.fulfill({
  185 |       json:
  186 |         ++reads === 1
  187 |           ? draft
  188 |           : {
  189 |               ...draft,
  190 |               updatedAt: "2026-10-12T12:02:00Z",
  191 |               config: {
  192 |                 sections: ["Body"],
  193 |                 sectionContent: { Body: "Another editor's text" },
  194 |               },
  195 |             },
  196 |     }),
  197 |   );
  198 |   await page.goto(detail);
  199 |   await page.getByLabel("Body content").fill("My text");
  200 |   await page.getByRole("button", { name: "Save draft", exact: true }).click();
  201 |   await expect(page.getByRole("alert")).toContainText("changed since");
  202 |   expect(writes).toEqual([]);
  203 |   await page.getByRole("button", { name: "Read current document" }).click();
  204 |   await page.getByText("Current saved content", { exact: true }).click();
  205 |   await expect(
  206 |     page.getByText("Another editor's text", { exact: true }),
  207 |   ).toBeVisible();
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
> 249 |   await page.getByLabel("Body content").fill("Interrupted manual text");
      |                                         ^ Error: locator.fill: Test timeout of 30000ms exceeded.
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
  308 |   ).toBeEnabled();
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