# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: remaining-modules.spec.ts >> MS09 regression: public form uses bounded card hierarchy and keeps input on styled error
- Location: ../../workspace/capiro-remaining-modules/apps/web/test/browser/remaining-modules.spec.ts:376:1

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
  298 |   await expect(grouping).toContainText("None");
  299 |   await expect(page.getByRole("table")).toHaveCount(1);
  300 |   await choose(page, "Group by", "Group by · Client");
  301 |   await page.screenshot({
  302 |     path: info.outputPath("planner-client-groups-phone.png"),
  303 |     fullPage: true,
  304 |   });
  305 | });
  306 | test("MS07 regression: Workspace filters share a compact desktop row and wrap on phones", async ({
  307 |   page,
  308 | }, info) => {
  309 |   const row = {
  310 |     id: projectId,
  311 |     kind: "draft",
  312 |     name: "Current policy newsletter",
  313 |     blueprint: "Newsletter",
  314 |     client: client.name,
  315 |     status: "draft",
  316 |     updatedAt: "2026-10-08",
  317 |     owner: { id: "test-user", name: "Test User", initials: "TU" },
  318 |     route: "/modules/workspace",
  319 |   };
  320 |   await setup(page, {
  321 |     "workspace.documents": { items: [row], nextCursor: null },
  322 |   });
  323 |   await page.goto("/modules/workspace");
  324 |   const search = page.getByLabel("Search documents");
  325 |   await expect(page.getByRole("table")).toContainText(row.name);
  326 |   const boxes = await Promise.all(
  327 |     [
  328 |       search,
  329 |       ...(await page
  330 |         .getByRole("combobox", { name: /Filter documents by/ })
  331 |         .all()),
  332 |     ].map((locator) => locator.boundingBox()),
  333 |   );
  334 |   expect(
  335 |     Math.max(...boxes.map((box) => box!.y)) -
  336 |       Math.min(...boxes.map((box) => box!.y)),
  337 |   ).toBeLessThan(8);
  338 |   expect(boxes.slice(1).every((box) => box!.width <= 190)).toBe(true);
  339 |   await choose(page, "Filter documents by client", client.name);
  340 |   await expect(page.getByRole("table")).toContainText(row.name);
  341 |   await search.fill("no matching record");
  342 |   await expect(page.getByRole("table")).not.toContainText(row.name);
  343 |   await search.clear();
  344 |   await page.screenshot({
  345 |     path: info.outputPath("workspace-filters-desktop.png"),
  346 |     fullPage: true,
  347 |   });
  348 |   await page.setViewportSize({ width: 390, height: 844 });
  349 |   for (const trigger of await page
  350 |     .getByRole("combobox", { name: /Filter documents by/ })
  351 |     .all()) {
  352 |     const box = await trigger.boundingBox();
  353 |     expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  354 |   }
  355 |   await page.screenshot({
  356 |     path: info.outputPath("workspace-filters-phone.png"),
  357 |     fullPage: true,
  358 |   });
  359 | });
  360 | const token = "20000000-0000-4000-8000-000000000001." + "a".repeat(64),
  361 |   question = "30000000-0000-4000-8000-000000000001";
  362 | const form = {
  363 |   name: "Request a briefing",
  364 |   description: "Ask the team to prepare a staff briefing.",
  365 |   fields: [
  366 |     {
  367 |       id: question,
  368 |       label: "What needs to be done?",
  369 |       type: "text",
  370 |       required: true,
  371 |       options: [],
  372 |       maxLength: 500,
  373 |     },
  374 |   ],
  375 | };
  376 | test("MS09 regression: public form uses bounded card hierarchy and keeps input on styled error", async ({
  377 |   page,
  378 | }, info) => {
  379 |   let fail = true,
  380 |     writes = 0;
  381 |   await setup(page, {
  382 |     "public-form.read": form,
  383 |     "public-form.submit": () => {
  384 |       writes++;
  385 |       return { received: true };
  386 |     },
  387 |   });
  388 |   await page.route("**/api/capiro/public-form.submit", (route) =>
  389 |     fail
  390 |       ? route.fulfill({
  391 |           status: 422,
  392 |           json: { message: "Please revise this request." },
  393 |         })
  394 |       : route.fallback(),
  395 |   );
  396 |   await page.goto(`/forms/${token}`);
  397 |   const title = page.getByRole("heading", { name: form.name, exact: true });
> 398 |   await expect(title).toHaveCSS("font-size", "40px");
      |                       ^ Error: expect(locator).toHaveCSS(expected) failed
  399 |   const submit = page.getByRole("button", {
  400 |     name: "Submit request",
  401 |     exact: true,
  402 |   });
  403 |   expect((await submit.boundingBox())!.width).toBeLessThan(200);
  404 |   await page.getByLabel("What needs to be done?").fill("Keep this draft");
  405 |   await submit.click();
  406 |   await expect(page.getByRole("alert")).toHaveCSS(
  407 |     "background-color",
  408 |     "rgb(243, 231, 229)",
  409 |   );
  410 |   await expect(page.getByLabel("What needs to be done?")).toHaveValue(
  411 |     "Keep this draft",
  412 |   );
  413 |   expect((await page.getByRole("alert").boundingBox())!.y).toBeLessThan(
  414 |     (await submit.boundingBox())!.y,
  415 |   );
  416 |   await page.screenshot({
  417 |     path: info.outputPath("public-form-error-desktop.png"),
  418 |     fullPage: true,
  419 |   });
  420 |   await page.setViewportSize({ width: 390, height: 844 });
  421 |   expect(
  422 |     await page.evaluate(() => document.documentElement.scrollWidth),
  423 |   ).toBeLessThanOrEqual(390);
  424 |   await page.screenshot({
  425 |     path: info.outputPath("public-form-error-phone.png"),
  426 |     fullPage: true,
  427 |   });
  428 |   fail = false;
  429 |   await submit.click();
  430 |   await expect(
  431 |     page.getByRole("heading", { name: "Your request was received." }),
  432 |   ).toBeVisible();
  433 |   expect(writes).toBe(1);
  434 | });
  435 | test("MS09 preserves malformed-receipt and replaced-token controls", async ({
  436 |   page,
  437 | }) => {
  438 |   let held: Route | undefined,
  439 |     writes = 0;
  440 |   const nextToken = token.replace(/a/g, "b");
  441 |   await setup(page, {
  442 |     "public-form.read": (input) => ({
  443 |       ...form,
  444 |       name:
  445 |         (input as { params: { token: string } }).params.token === token
  446 |           ? form.name
  447 |           : "Replacement request",
  448 |     }),
  449 |   });
  450 |   await page.route("**/api/capiro/public-form.submit", (route) => {
  451 |     writes++;
  452 |     if (writes === 1) return route.fulfill({ json: { received: false } });
  453 |     held = route;
  454 |   });
  455 |   await page.goto(`/forms/${token}`);
  456 |   await page
  457 |     .getByLabel("What needs to be done?")
  458 |     .fill("Preserve until verified");
  459 |   await page
  460 |     .getByRole("button", { name: "Submit request", exact: true })
  461 |     .click();
  462 |   await expect(page.getByRole("alert")).toBeVisible();
  463 |   await expect(page.getByLabel("What needs to be done?")).toHaveValue(
  464 |     "Preserve until verified",
  465 |   );
  466 |   await expect(
  467 |     page.getByRole("heading", { name: "Your request was received." }),
  468 |   ).toHaveCount(0);
  469 |   await page
  470 |     .getByRole("button", { name: "Submit request", exact: true })
  471 |     .click();
  472 |   await expect.poll(() => Boolean(held)).toBe(true);
  473 |   await navigate(page, `/forms/${nextToken}`);
  474 |   await expect(
  475 |     page.getByRole("heading", { name: "Replacement request" }),
  476 |   ).toBeVisible();
  477 |   await held!.fulfill({ json: { received: true } }).catch(() => {});
  478 |   await expect(page.getByLabel("What needs to be done?")).toHaveValue("");
  479 |   await expect(
  480 |     page.getByRole("heading", { name: "Your request was received." }),
  481 |   ).toHaveCount(0);
  482 |   expect(writes).toBe(2);
  483 | });
  484 | 
```