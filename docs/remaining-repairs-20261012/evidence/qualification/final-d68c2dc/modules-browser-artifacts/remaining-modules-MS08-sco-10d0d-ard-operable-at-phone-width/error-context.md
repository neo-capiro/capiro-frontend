# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: remaining-modules.spec.ts >> MS08 scope and grouping controls remain keyboard operable at phone width
- Location: test/browser/remaining-modules.spec.ts:277:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByRole('combobox', { name: 'Group by', exact: true })
Expected substring: "None"
Received string:    "Group by · Client"
Timeout: 5000ms

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for getByRole('combobox', { name: 'Group by', exact: true })
    14 × locator resolved to <button dir="ltr" type="button" role="combobox" data-state="closed" data-size="default" aria-expanded="false" aria-label="Group by" aria-autocomplete="none" data-slot="select-trigger" class="border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex w-fit it…>…</button>
       - unexpected value "Group by · Client"

```

```yaml
- combobox "Group by": Group by · Client
```

# Test source

```ts
  201 |   ).toBeVisible();
  202 |   failed = true;
  203 |   await page.getByRole("searchbox", { name: "Search tasks" }).fill("failed");
  204 |   await expect(page.getByRole("alert")).toContainText("Task page unavailable");
  205 |   await expect(page.getByRole("table")).toHaveCount(0);
  206 |   failed = false;
  207 |   await page.getByRole("button", { name: "Try again", exact: true }).click();
  208 |   await expect(
  209 |     page.getByRole("button", { name: "Direct client work", exact: true }),
  210 |   ).toBeVisible();
  211 |   expect(inputs.every((input) => !("clientId" in input))).toBe(true);
  212 | });
  213 | for (const unavailable of [false, true])
  214 |   test(`MS08 independently verified client remains named when picker is ${unavailable ? "unavailable" : "empty"}`, async ({
  215 |     page,
  216 |   }) => {
  217 |     await setup(page, fixtures);
  218 |     await page.route("**/api/capiro/clients.list*", (route) =>
  219 |       route.fulfill(
  220 |         unavailable
  221 |           ? { status: 503, json: { message: "Picker unavailable" } }
  222 |           : { json: [] },
  223 |       ),
  224 |     );
  225 |     await page.goto(`/modules/planner?view=all-tasks&clientId=${clientId}`);
  226 |     await expect(
  227 |       page.getByRole("combobox", { name: "Planner client scope" }),
  228 |     ).toContainText(client.name);
  229 |     await expect(
  230 |       page.getByRole("region", { name: `${client.name} tasks`, exact: true }),
  231 |     ).toContainText("Project client work");
  232 |     await expect(
  233 |       page.getByRole("link", { name: "Open client" }),
  234 |     ).toHaveAttribute("href", `/portfolio/${clientId}`);
  235 |   });
  236 | test("MS08 replacement rejects held former task read and unverified selected client", async ({
  237 |   page,
  238 | }) => {
  239 |   let held: Route | undefined,
  240 |     fresh = false;
  241 |   await setup(page, fixtures);
  242 |   await page.route("**/api/capiro/planner.tasks*", (route) => {
  243 |     if (!fresh) {
  244 |       held = route;
  245 |       return;
  246 |     }
  247 |     return route.fulfill({ json: { items: [tasks[3]], nextCursor: null } });
  248 |   });
  249 |   await page.goto("/modules/planner?view=all-tasks");
  250 |   await expect.poll(() => Boolean(held)).toBe(true);
  251 |   fresh = true;
  252 |   await page.evaluate(() =>
  253 |     dispatchEvent(
  254 |       new CustomEvent("test:session", {
  255 |         detail: { orgId: "other-org", sessionId: "other-session" },
  256 |       }),
  257 |     ),
  258 |   );
  259 |   await expect(
  260 |     page.getByRole("button", { name: "Firm work", exact: true }),
  261 |   ).toBeVisible();
  262 |   await held!
  263 |     .fulfill({ json: { items: tasks, nextCursor: null } })
  264 |     .catch(() => {});
  265 |   await expect(
  266 |     page.getByRole("button", { name: "Direct client work", exact: true }),
  267 |   ).toHaveCount(0);
  268 |   await page.route(`**/api/backend/core/clients/${clientId}`, (route) =>
  269 |     route.fulfill({ json: otherClient }),
  270 |   );
  271 |   await choose(page, "Planner client scope", client.name);
  272 |   await expect(
  273 |     page.getByRole("heading", { name: "Selected client unavailable" }),
  274 |   ).toBeVisible();
  275 |   await expect(page.getByRole("table")).toHaveCount(0);
  276 | });
  277 | test("MS08 scope and grouping controls remain keyboard operable at phone width", async ({
  278 |   page,
  279 | }, info) => {
  280 |   await setup(page, fixtures);
  281 |   await page.setViewportSize({ width: 390, height: 844 });
  282 |   await page.goto("/modules/planner?view=all-tasks");
  283 |   const scope = page.getByRole("combobox", { name: "Planner client scope" });
  284 |   await expect(scope).toBeEnabled();
  285 |   await scope.focus();
  286 |   await page.keyboard.press("Enter");
  287 |   await page.keyboard.press("ArrowDown");
  288 |   await page.keyboard.press("Enter");
  289 |   await expect(scope).toContainText(client.name);
  290 |   await expect(
  291 |     page.getByRole("button", { name: "Direct client work", exact: true }),
  292 |   ).toBeVisible();
  293 |   const grouping = page.getByRole("combobox", {
  294 |     name: "Group by",
  295 |     exact: true,
  296 |   });
  297 |   await grouping.focus();
  298 |   await page.keyboard.press("Enter");
  299 |   await page.keyboard.press("ArrowDown");
  300 |   await page.keyboard.press("Enter");
> 301 |   await expect(grouping).toContainText("None");
      |                          ^ Error: expect(locator).toContainText(expected) failed
  302 |   await expect(page.getByRole("table")).toHaveCount(1);
  303 |   await choose(page, "Group by", "Group by · Client");
  304 |   await page.screenshot({
  305 |     path: info.outputPath("planner-client-groups-phone.png"),
  306 |     fullPage: true,
  307 |   });
  308 | });
  309 | test("MS07 regression: Workspace filters share a compact desktop row and wrap on phones", async ({
  310 |   page,
  311 | }, info) => {
  312 |   const row = {
  313 |     id: projectId,
  314 |     kind: "draft",
  315 |     name: "Current policy newsletter",
  316 |     blueprint: "Newsletter",
  317 |     client: client.name,
  318 |     status: "draft",
  319 |     updatedAt: "2026-10-08",
  320 |     owner: { id: "test-user", name: "Test User", initials: "TU" },
  321 |     route: "/modules/workspace",
  322 |   };
  323 |   await setup(page, {
  324 |     "workspace.documents": { items: [row], nextCursor: null },
  325 |   });
  326 |   await page.goto("/modules/workspace");
  327 |   const search = page.getByLabel("Search documents");
  328 |   await expect(page.getByRole("table")).toContainText(row.name);
  329 |   const boxes = await Promise.all(
  330 |     [
  331 |       search,
  332 |       ...(await page
  333 |         .getByRole("combobox", { name: /Filter documents by/ })
  334 |         .all()),
  335 |     ].map((locator) => locator.boundingBox()),
  336 |   );
  337 |   expect(
  338 |     Math.max(...boxes.map((box) => box!.y)) -
  339 |       Math.min(...boxes.map((box) => box!.y)),
  340 |   ).toBeLessThan(8);
  341 |   expect(boxes.slice(1).every((box) => box!.width <= 190)).toBe(true);
  342 |   await choose(page, "Filter documents by client", client.name);
  343 |   await expect(page.getByRole("table")).toContainText(row.name);
  344 |   await search.fill("no matching record");
  345 |   await expect(page.getByRole("table")).not.toContainText(row.name);
  346 |   await search.clear();
  347 |   await page.screenshot({
  348 |     path: info.outputPath("workspace-filters-desktop.png"),
  349 |     fullPage: true,
  350 |   });
  351 |   await page.setViewportSize({ width: 390, height: 844 });
  352 |   for (const trigger of await page
  353 |     .getByRole("combobox", { name: /Filter documents by/ })
  354 |     .all()) {
  355 |     const box = await trigger.boundingBox();
  356 |     expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  357 |   }
  358 |   await page.screenshot({
  359 |     path: info.outputPath("workspace-filters-phone.png"),
  360 |     fullPage: true,
  361 |   });
  362 | });
  363 | const token = "20000000-0000-4000-8000-000000000001." + "a".repeat(64),
  364 |   question = "30000000-0000-4000-8000-000000000001";
  365 | const form = {
  366 |   name: "Request a briefing",
  367 |   description: "Ask the team to prepare a staff briefing.",
  368 |   fields: [
  369 |     {
  370 |       id: question,
  371 |       label: "What needs to be done?",
  372 |       type: "text",
  373 |       required: true,
  374 |       options: [],
  375 |       maxLength: 500,
  376 |     },
  377 |   ],
  378 | };
  379 | test("MS09 regression: public form uses bounded card hierarchy and keeps input on styled error", async ({
  380 |   page,
  381 | }, info) => {
  382 |   let fail = true,
  383 |     writes = 0;
  384 |   await setup(page, {
  385 |     "public-form.read": form,
  386 |     "public-form.submit": () => {
  387 |       writes++;
  388 |       return { received: true };
  389 |     },
  390 |   });
  391 |   await page.route("**/api/capiro/public-form.submit", (route) =>
  392 |     fail
  393 |       ? route.fulfill({
  394 |           status: 422,
  395 |           json: { message: "Please revise this request." },
  396 |         })
  397 |       : route.fallback(),
  398 |   );
  399 |   await page.goto(`/forms/${token}`);
  400 |   const title = page.getByRole("heading", { name: form.name, exact: true });
  401 |   await expect(title).toHaveCSS("font-size", "40px");
```