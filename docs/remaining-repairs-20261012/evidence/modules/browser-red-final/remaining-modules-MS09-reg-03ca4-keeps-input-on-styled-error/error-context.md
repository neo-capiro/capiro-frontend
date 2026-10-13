# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: remaining-modules.spec.ts >> MS09 regression: public form uses bounded card hierarchy and keeps input on styled error
- Location: ../../workspace/capiro-remaining-modules/apps/web/test/browser/remaining-modules.spec.ts:379:1

# Error details

```
Error: expect(locator).toHaveCSS(expected) failed

Locator:  getByRole('heading', { name: 'Request a briefing', exact: true })
Expected: "40px"
Received: "15px"
Timeout:  5000ms

Call log:
  - Expect "toHaveCSS" with timeout 5000ms
  - waiting for getByRole('heading', { name: 'Request a briefing', exact: true })
    14 × locator resolved to <h2>Request a briefing</h2>
       - unexpected value "15px"

```

```yaml
- heading "Request a briefing" [level=2]
```

# Test source

```ts
  301 |   await expect(grouping).toContainText("None");
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
> 401 |   await expect(title).toHaveCSS("font-size", "40px");
      |                       ^ Error: expect(locator).toHaveCSS(expected) failed
  402 |   const submit = page.getByRole("button", {
  403 |     name: "Submit request",
  404 |     exact: true,
  405 |   });
  406 |   expect((await submit.boundingBox())!.width).toBeLessThan(200);
  407 |   await page.getByLabel("What needs to be done?").fill("Keep this draft");
  408 |   await submit.click();
  409 |   await expect(page.getByRole("alert")).toHaveCSS(
  410 |     "background-color",
  411 |     "rgb(243, 231, 229)",
  412 |   );
  413 |   await expect(page.getByLabel("What needs to be done?")).toHaveValue(
  414 |     "Keep this draft",
  415 |   );
  416 |   expect((await page.getByRole("alert").boundingBox())!.y).toBeLessThan(
  417 |     (await submit.boundingBox())!.y,
  418 |   );
  419 |   await page.screenshot({
  420 |     path: info.outputPath("public-form-error-desktop.png"),
  421 |     fullPage: true,
  422 |   });
  423 |   await page.setViewportSize({ width: 390, height: 844 });
  424 |   expect(
  425 |     await page.evaluate(() => document.documentElement.scrollWidth),
  426 |   ).toBeLessThanOrEqual(390);
  427 |   await page.screenshot({
  428 |     path: info.outputPath("public-form-error-phone.png"),
  429 |     fullPage: true,
  430 |   });
  431 |   fail = false;
  432 |   await submit.click();
  433 |   await expect(
  434 |     page.getByRole("heading", { name: "Your request was received." }),
  435 |   ).toBeVisible();
  436 |   expect(writes).toBe(1);
  437 | });
  438 | test("MS09 preserves malformed-receipt and replaced-token controls", async ({
  439 |   page,
  440 | }) => {
  441 |   let held: Route | undefined,
  442 |     writes = 0;
  443 |   const nextToken = token.replace(/a/g, "b");
  444 |   await setup(page, {
  445 |     "public-form.read": (input) => ({
  446 |       ...form,
  447 |       name:
  448 |         (input as { params: { token: string } }).params.token === token
  449 |           ? form.name
  450 |           : "Replacement request",
  451 |     }),
  452 |   });
  453 |   await page.route("**/api/capiro/public-form.submit", (route) => {
  454 |     writes++;
  455 |     if (writes === 1) return route.fulfill({ json: { received: false } });
  456 |     held = route;
  457 |   });
  458 |   await page.goto(`/forms/${token}`);
  459 |   await page
  460 |     .getByLabel("What needs to be done?")
  461 |     .fill("Preserve until verified");
  462 |   await page
  463 |     .getByRole("button", { name: "Submit request", exact: true })
  464 |     .click();
  465 |   await expect(page.getByRole("alert")).toBeVisible();
  466 |   await expect(page.getByLabel("What needs to be done?")).toHaveValue(
  467 |     "Preserve until verified",
  468 |   );
  469 |   await expect(
  470 |     page.getByRole("heading", { name: "Your request was received." }),
  471 |   ).toHaveCount(0);
  472 |   await page
  473 |     .getByRole("button", { name: "Submit request", exact: true })
  474 |     .click();
  475 |   await expect.poll(() => Boolean(held)).toBe(true);
  476 |   await navigate(page, `/forms/${nextToken}`);
  477 |   await expect(
  478 |     page.getByRole("heading", { name: "Replacement request" }),
  479 |   ).toBeVisible();
  480 |   await held!.fulfill({ json: { received: true } }).catch(() => {});
  481 |   await expect(page.getByLabel("What needs to be done?")).toHaveValue("");
  482 |   await expect(
  483 |     page.getByRole("heading", { name: "Your request was received." }),
  484 |   ).toHaveCount(0);
  485 |   expect(writes).toBe(2);
  486 | });
  487 | 
```