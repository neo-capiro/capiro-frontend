# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: prospect-files-local-search.spec.ts >> prospect route replacement starts with a clear search and only the new current collection
- Location: apps/web/tests/browser/prospect-files-local-search.spec.ts:248:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Replacement Prospect', exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('heading', { name: 'Replacement Prospect', exact: true })

```

```yaml
- link "Skip to content":
  - /url: "#main"
- banner:
  - link "Capiro Home":
    - /url: /
    - img "Capiro"
  - navigation "Workspace":
    - link "Meri":
      - /url: /meri
    - link "Portfolio":
      - /url: /
    - link "Modules":
      - /url: /modules
  - navigation "Global actions":
    - link "Quick log":
      - /url: /portfolio?log=1
    - link "Master calendar":
      - /url: /calendar
    - link "Search Portfolio":
      - /url: /portfolio?search=1
    - button "Updates unavailable" [disabled]
    - button "Test account": T
- complementary "Portfolio navigation":
  - paragraph: Portfolio
  - navigation "Portfolio":
    - link "Portfolio Overview":
      - /url: /portfolio
      - text: Overview
    - link "Portfolio Clients":
      - /url: /portfolio?type=CLIENT
      - text: Clients
    - link "Portfolio Prospects":
      - /url: /portfolio/prospects
      - text: Prospects
  - link "Settings":
    - /url: /settings
- main:
  - navigation "Breadcrumb":
    - link "← Prospects":
      - /url: /portfolio/prospects
    - text: / Company details
  - alert:
    - paragraph: No fixture for this contract
    - button "Retry"
```

# Test source

```ts
  173 |     await area.getByRole("button", { name: "Clear file search" }).click();
  174 |     await expect(area.locator("li strong")).toHaveCount(empty ? 0 : 2);
  175 |     expect(state.writes).toEqual([]);
  176 |   });
  177 | 
  178 | for (const status of [403, 503])
  179 |   test(`a ${status} current file read conceals filtered results until successful recovery`, async ({
  180 |     page,
  181 |   }) => {
  182 |     const { state } = await setup(page);
  183 |     await openFiles(page);
  184 |     const area = files(page);
  185 |     const search = area.getByRole("searchbox", { name: "Search files" });
  186 |     await search.fill("agency");
  187 |     await expect(area.locator("li strong")).toHaveText([ready.fileName]);
  188 |     state.status = status;
  189 |     state.listGate = deferred();
  190 |     await area.getByRole("button", { name: "Refresh files" }).click();
  191 |     await expect(search).toBeDisabled();
  192 |     await expect(area.locator("li")).toHaveCount(0);
  193 |     state.listGate.release();
  194 |     await expect(area.getByRole("alert")).toBeVisible();
  195 |     await expect(
  196 |       area.getByRole("link", { name: /Preview|Download/ }),
  197 |     ).toHaveCount(0);
  198 |     await expect(area.getByText(/No files (match|are available)/)).toHaveCount(
  199 |       0,
  200 |     );
  201 |     state.status = 200;
  202 |     state.records = [{ ...pending, fileName: "Agency revision.txt" }];
  203 |     state.listGate = deferred();
  204 |     await area.getByRole("button", { name: "Refresh files" }).click();
  205 |     await expect(search).toBeDisabled();
  206 |     await expect(area.locator("li")).toHaveCount(0);
  207 |     state.listGate.release();
  208 |     await expect(search).toBeEnabled();
  209 |     await expect(area.locator("li strong")).toHaveText(["Agency revision.txt"]);
  210 |     expect(state.writes).toEqual([]);
  211 |   });
  212 | 
  213 | for (const key of ["userId", "tenantId"] as const)
  214 |   test(`${key} replacement discards the prior file search and results`, async ({
  215 |     page,
  216 |   }) => {
  217 |     const { state } = await setup(page);
  218 |     await openFiles(page);
  219 |     const area = files(page);
  220 |     const search = area.getByRole("searchbox", { name: "Search files" });
  221 |     await search.fill("agency");
  222 |     await expect(area.locator("li strong")).toHaveText([ready.fileName]);
  223 |     state.member[key] = otherId;
  224 |     state.records = [
  225 |       {
  226 |         ...pending,
  227 |         tenantId: state.member.tenantId,
  228 |         fileName: "Replacement member file.txt",
  229 |       },
  230 |     ];
  231 |     state.identityGate = deferred();
  232 |     await page.clock.setFixedTime(new Date("2026-10-12T12:00:31Z"));
  233 |     await page.evaluate(() => dispatchEvent(new Event("offline")));
  234 |     await page.evaluate(() => dispatchEvent(new Event("online")));
  235 |     await expect(
  236 |       area.getByText(/require current prospect access/),
  237 |     ).toBeVisible();
  238 |     await expect(area.locator("li")).toHaveCount(0);
  239 |     state.identityGate.release();
  240 |     await expect(search).toBeEnabled();
  241 |     await expect(search).toHaveValue("");
  242 |     await expect(area.locator("li strong")).toHaveText([
  243 |       "Replacement member file.txt",
  244 |     ]);
  245 |     expect(state.writes).toEqual([]);
  246 |   });
  247 | 
  248 | test("prospect route replacement starts with a clear search and only the new current collection", async ({
  249 |   page,
  250 | }) => {
  251 |   const { state } = await setup(page);
  252 |   await openFiles(page);
  253 |   const area = files(page);
  254 |   await area.getByRole("searchbox", { name: "Search files" }).fill("agency");
  255 |   await page.route(`**/api/backend/core/prospects/${otherId}`, (route) =>
  256 |     json(route, {
  257 |       ...prospect,
  258 |       id: otherId,
  259 |       displayName: "Replacement Prospect",
  260 |     }),
  261 |   );
  262 |   await page.route(`**/api/backend/core/prospects/${otherId}/**`, (route) =>
  263 |     json(route, []),
  264 |   );
  265 |   state.records = [{ ...pending, prospectId: otherId }];
  266 |   state.listGate = deferred();
  267 |   await page.evaluate((path) => {
  268 |     history.pushState({}, "", path);
  269 |     dispatchEvent(new PopStateEvent("popstate"));
  270 |   }, `/portfolio/prospects/${otherId}`);
  271 |   await expect(
  272 |     page.getByRole("heading", { name: "Replacement Prospect", exact: true }),
> 273 |   ).toBeVisible();
      |     ^ Error: expect(locator).toBeVisible() failed
  274 |   await expect(area.locator("li")).toHaveCount(0);
  275 |   state.listGate.release();
  276 |   const search = area.getByRole("searchbox", { name: "Search files" });
  277 |   await expect(search).toBeEnabled();
  278 |   await expect(search).toHaveValue("");
  279 |   await expect(area.locator("li strong")).toHaveText([pending.fileName]);
  280 |   expect(state.reads.at(-1)).toContain(`prospectId=${otherId}`);
  281 |   expect(state.writes).toEqual([]);
  282 | });
  283 | 
  284 | test("search cannot expose a mixed-lineage collection", async ({ page }) => {
  285 |   const { state } = await setup(page, [{ ...ready, prospectId: otherId }]);
  286 |   await openFiles(page);
  287 |   const area = files(page);
  288 |   await expect(area.getByRole("alert")).toBeVisible();
  289 |   await expect(
  290 |     area.getByRole("searchbox", { name: "Search files" }),
  291 |   ).toBeDisabled();
  292 |   await expect(area.locator("li")).toHaveCount(0);
  293 |   await expect(area.getByRole("link")).toHaveCount(0);
  294 |   await expect(area.getByText(/No files (match|are available)/)).toHaveCount(0);
  295 |   expect(state.writes).toEqual([]);
  296 | });
  297 | 
  298 | test("filtering retains selected upload bytes and original upload readiness and open actions", async ({
  299 |   page,
  300 | }) => {
  301 |   const { state } = await setup(page);
  302 |   let storagePosts = 0;
  303 |   const uploaded: ProspectAttachment = {
  304 |     ...attachment,
  305 |     viewerMode: "all",
  306 |     prospectId,
  307 |     fileName: "test.txt",
  308 |     usable: false,
  309 |   };
  310 |   await page.route("**/engagement/attachments/upload-url", (route) => {
  311 |     const body = route.request().postDataJSON();
  312 |     return json(route, {
  313 |       url: "https://storage.example.test/upload",
  314 |       s3Key: uploaded.s3Key,
  315 |       uploadIntentId: otherId,
  316 |       requestId: body.requestId,
  317 |       expiresAt: "2099-10-12T12:00:00Z",
  318 |       fields: {
  319 |         key: uploaded.s3Key,
  320 |         "Content-Type": "text/plain",
  321 |         "x-amz-checksum-algorithm": "SHA256",
  322 |         "x-amz-checksum-sha256": Buffer.from(checksum, "hex").toString(
  323 |           "base64",
  324 |         ),
  325 |       },
  326 |     });
  327 |   });
  328 |   await page.route("https://storage.example.test/upload", (route) => {
  329 |     storagePosts++;
  330 |     return route.fulfill({ status: 204 });
  331 |   });
  332 |   await page.route("**/engagement/attachments/confirm", (route) => {
  333 |     state.records = [uploaded];
  334 |     return json(route, uploaded);
  335 |   });
  336 |   await openFiles(page);
  337 |   const area = files(page);
  338 |   await area.getByLabel("Upload prospect file").setInputFiles({
  339 |     name: "test.txt",
  340 |     mimeType: "text/plain",
  341 |     buffer: Buffer.from("hello"),
  342 |   });
  343 |   const search = area.getByRole("searchbox", { name: "Search files" });
  344 |   await search.fill("agency");
  345 |   await expect(
  346 |     area.getByRole("link", { name: `Preview ${ready.fileName}` }),
  347 |   ).toHaveAttribute("href", ready.previewUrl!);
  348 |   await area.getByRole("button", { name: "Upload file", exact: true }).click();
  349 |   await expect(area.getByText(/test.txt uploaded/)).toBeVisible();
  350 |   await expect(area.getByText("No files match your search.")).toBeVisible();
  351 |   await area.getByRole("button", { name: "Clear file search" }).click();
  352 |   await expect(area.locator("li strong")).toHaveText([uploaded.fileName]);
  353 |   await expect(
  354 |     area.getByRole("link", { name: /Preview|Download/ }),
  355 |   ).toHaveCount(0);
  356 |   expect(storagePosts).toBe(1);
  357 |   expect(state.writes).toHaveLength(2);
  358 | });
  359 | 
```