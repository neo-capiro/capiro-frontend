# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: prospect-current-read.spec.ts >> client route replacement discards a failed Prospects editor and requires a current successful read on return
- Location: apps/web/tests/browser/prospect-current-read.spec.ts:248:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Test Aerospace', exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('heading', { name: 'Test Aerospace', exact: true })

```

# Test source

```ts
  160 |   }, info) => {
  161 |     const control = await setup(page);
  162 |     await page.goto(listPath);
  163 |     await page.getByRole("link", { name: /Test Prospect/ }).click();
  164 |     await expect(
  165 |       page.getByRole("heading", { name: "Test Prospect", exact: true }),
  166 |     ).toBeVisible();
  167 |     control.fail(status);
  168 |     await page.clock.fastForward(31_000);
  169 |     await page.getByRole("link", { name: "← Prospects", exact: true }).click();
  170 |     await expectUnavailable(page, status);
  171 |     await page.screenshot({
  172 |       path: info.outputPath(`current-read-${status}.png`),
  173 |     });
  174 |     await recover(page, control);
  175 |   });
  176 | 
  177 |   test(`a ${status} failed cached filter read cannot expose its earlier list or pipeline`, async ({
  178 |     page,
  179 |   }) => {
  180 |     const control = await setup(page);
  181 |     await page.goto(listPath);
  182 |     await expect(
  183 |       page.getByRole("link", { name: /Test Prospect/ }),
  184 |     ).toBeVisible();
  185 |     await page.getByLabel("Search prospects").fill("Synthetic");
  186 |     await expect.poll(control.reads).toBe(2);
  187 |     await expect(
  188 |       page.getByRole("link", { name: /Test Prospect/ }),
  189 |     ).toBeVisible();
  190 |     control.fail(status);
  191 |     await page.clock.fastForward(31_000);
  192 |     await page.getByLabel("Search prospects").fill("");
  193 |     await expectUnavailable(page, status);
  194 |     await recover(page, control);
  195 |   });
  196 | 
  197 |   for (const overlay of ["pipeline", "create"] as const)
  198 |     test(`a ${status} current read failure discards the open ${overlay} editor`, async ({
  199 |       page,
  200 |     }) => {
  201 |       const control = await setup(page);
  202 |       await page.goto(listPath);
  203 |       await expect(
  204 |         page.getByRole("link", { name: /Test Prospect/ }),
  205 |       ).toBeVisible();
  206 |       if (overlay === "pipeline") {
  207 |         await page
  208 |           .getByRole("button", { name: "Pipeline", exact: true })
  209 |           .click();
  210 |         await page
  211 |           .getByRole("button", { name: "Change stage", exact: true })
  212 |           .click();
  213 |         await page.getByLabel("New stage").selectOption("closed_won");
  214 |       } else {
  215 |         await page
  216 |           .getByRole("button", { name: "+ Add prospect", exact: true })
  217 |           .click();
  218 |         await page.getByLabel("Company name").fill("Discard this stale editor");
  219 |       }
  220 |       control.fail(status);
  221 |       await page.clock.fastForward(31_000);
  222 |       await page.evaluate(() => dispatchEvent(new Event("offline")));
  223 |       await page.evaluate(() => dispatchEvent(new Event("online")));
  224 |       await expectUnavailable(page, status);
  225 |       await expect(page).not.toHaveURL(/[?&](pipeline|new)=/);
  226 |       await recover(page, control);
  227 |       if (overlay === "pipeline") {
  228 |         await page
  229 |           .getByRole("button", { name: "Pipeline", exact: true })
  230 |           .click();
  231 |         await expect(
  232 |           page.getByRole("dialog", { name: "Change prospect stage" }),
  233 |         ).toHaveCount(0);
  234 |         await page
  235 |           .getByRole("button", { name: "Change stage", exact: true })
  236 |           .click();
  237 |         await expect(page.getByLabel("New stage")).toHaveValue("proposal");
  238 |       } else {
  239 |         await page
  240 |           .getByRole("button", { name: "+ Add prospect", exact: true })
  241 |           .click();
  242 |         await expect(page.getByLabel("Company name")).toHaveValue("");
  243 |       }
  244 |       expect(control.writes).toEqual([]);
  245 |     });
  246 | }
  247 | 
  248 | test("client route replacement discards a failed Prospects editor and requires a current successful read on return", async ({
  249 |   page,
  250 | }) => {
  251 |   const control = await setup(page);
  252 |   await page.goto(`${listPath}?new=1`);
  253 |   await page.getByLabel("Company name").fill("Former view private input");
  254 |   await replaceRoute(page, `/portfolio/${clientId}`);
  255 |   await expect(page.getByRole("dialog", { name: "Add prospect" })).toHaveCount(
  256 |     0,
  257 |   );
  258 |   await expect(
  259 |     page.getByRole("heading", { name: "Test Aerospace", exact: true }),
> 260 |   ).toBeVisible();
      |     ^ Error: expect(locator).toBeVisible() failed
  261 |   control.fail(403);
  262 |   await page.clock.fastForward(31_000);
  263 |   await replaceRoute(page, `${listPath}?new=1`);
  264 |   await expectUnavailable(page, 403);
  265 |   await recover(page, control);
  266 |   await page
  267 |     .getByRole("button", { name: "+ Add prospect", exact: true })
  268 |     .click();
  269 |   await expect(page.getByLabel("Company name")).toHaveValue("");
  270 | });
  271 | 
```