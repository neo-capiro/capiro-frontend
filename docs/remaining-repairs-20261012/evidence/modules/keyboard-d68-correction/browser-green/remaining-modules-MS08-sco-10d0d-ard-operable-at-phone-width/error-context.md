# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: remaining-modules.spec.ts >> MS08 scope and grouping controls remain keyboard operable at phone width
- Location: apps/web/test/browser/remaining-modules.spec.ts:277:1

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator: getByRole('combobox', { name: 'Planner client scope' })
Expected: "true"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toHaveAttribute" with timeout 5000ms
  - waiting for getByRole('combobox', { name: 'Planner client scope' })

```

```yaml
- listbox:
  - option "Scope · All clients" [selected]
  - option "Current Aerospace"
  - option "Other Aerospace"
```

# Test source

```ts
  188 |       JSON.parse(new URL(route.request().url()).searchParams.get("input")!)
  189 |         .query,
  190 |     );
  191 |     return failed
  192 |       ? route.fulfill({
  193 |           status: 503,
  194 |           json: { message: "Task page unavailable" },
  195 |         })
  196 |       : route.fallback();
  197 |   });
  198 |   await page.goto(`/modules/planner?view=all-tasks&clientId=${clientId}`);
  199 |   await expect(
  200 |     page.getByRole("button", { name: "Direct client work", exact: true }),
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
  286 |   await expect(scope).toBeFocused();
  287 |   await page.keyboard.press("Enter");
> 288 |   await expect(scope).toHaveAttribute("aria-expanded", "true");
      |                       ^ Error: expect(locator).toHaveAttribute(expected) failed
  289 |   await expect(page.getByRole("listbox")).toBeVisible();
  290 |   await expect(
  291 |     page.getByRole("option", { name: "Scope · All clients", exact: true }),
  292 |   ).toBeFocused();
  293 |   await page.keyboard.press("ArrowDown");
  294 |   await expect(
  295 |     page.getByRole("option", { name: client.name, exact: true }),
  296 |   ).toBeFocused();
  297 |   await page.keyboard.press("Enter");
  298 |   await expect(scope).toContainText(client.name);
  299 |   await expect(
  300 |     page.getByRole("button", { name: "Direct client work", exact: true }),
  301 |   ).toBeVisible();
  302 |   const grouping = page.getByRole("combobox", {
  303 |     name: "Group by",
  304 |     exact: true,
  305 |   });
  306 |   await grouping.focus();
  307 |   await expect(grouping).toBeFocused();
  308 |   await page.keyboard.press("Enter");
  309 |   await expect(grouping).toHaveAttribute("aria-expanded", "true");
  310 |   await expect(page.getByRole("listbox")).toBeVisible();
  311 |   await expect(
  312 |     page.getByRole("option", { name: "Group by · Client", exact: true }),
  313 |   ).toBeFocused();
  314 |   await page.keyboard.press("ArrowDown");
  315 |   await expect(
  316 |     page.getByRole("option", { name: "Group by · None", exact: true }),
  317 |   ).toBeFocused();
  318 |   await page.keyboard.press("Enter");
  319 |   await expect(grouping).toContainText("None");
  320 |   await expect(page.getByRole("table")).toHaveCount(1);
  321 |   await choose(page, "Group by", "Group by · Client");
  322 |   await page.screenshot({
  323 |     path: info.outputPath("planner-client-groups-phone.png"),
  324 |     fullPage: true,
  325 |   });
  326 | });
  327 | test("MS07 regression: Workspace filters share a compact desktop row and wrap on phones", async ({
  328 |   page,
  329 | }, info) => {
  330 |   const row = {
  331 |     id: projectId,
  332 |     kind: "draft",
  333 |     name: "Current policy newsletter",
  334 |     blueprint: "Newsletter",
  335 |     client: client.name,
  336 |     status: "draft",
  337 |     updatedAt: "2026-10-08",
  338 |     owner: { id: "test-user", name: "Test User", initials: "TU" },
  339 |     route: "/modules/workspace",
  340 |   };
  341 |   await setup(page, {
  342 |     "workspace.documents": { items: [row], nextCursor: null },
  343 |   });
  344 |   await page.goto("/modules/workspace");
  345 |   const search = page.getByLabel("Search documents");
  346 |   await expect(page.getByRole("table")).toContainText(row.name);
  347 |   const boxes = await Promise.all(
  348 |     [
  349 |       search,
  350 |       ...(await page
  351 |         .getByRole("combobox", { name: /Filter documents by/ })
  352 |         .all()),
  353 |     ].map((locator) => locator.boundingBox()),
  354 |   );
  355 |   expect(
  356 |     Math.max(...boxes.map((box) => box!.y)) -
  357 |       Math.min(...boxes.map((box) => box!.y)),
  358 |   ).toBeLessThan(8);
  359 |   expect(boxes.slice(1).every((box) => box!.width <= 190)).toBe(true);
  360 |   await choose(page, "Filter documents by client", client.name);
  361 |   await expect(page.getByRole("table")).toContainText(row.name);
  362 |   await search.fill("no matching record");
  363 |   await expect(page.getByRole("table")).not.toContainText(row.name);
  364 |   await search.clear();
  365 |   await page.screenshot({
  366 |     path: info.outputPath("workspace-filters-desktop.png"),
  367 |     fullPage: true,
  368 |   });
  369 |   await page.setViewportSize({ width: 390, height: 844 });
  370 |   for (const trigger of await page
  371 |     .getByRole("combobox", { name: /Filter documents by/ })
  372 |     .all()) {
  373 |     const box = await trigger.boundingBox();
  374 |     expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  375 |   }
  376 |   await page.screenshot({
  377 |     path: info.outputPath("workspace-filters-phone.png"),
  378 |     fullPage: true,
  379 |   });
  380 | });
  381 | const token = "20000000-0000-4000-8000-000000000001." + "a".repeat(64),
  382 |   question = "30000000-0000-4000-8000-000000000001";
  383 | const form = {
  384 |   name: "Request a briefing",
  385 |   description: "Ask the team to prepare a staff briefing.",
  386 |   fields: [
  387 |     {
  388 |       id: question,
```