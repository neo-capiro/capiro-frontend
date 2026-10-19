# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: strategy-proposal-compatibility.spec.ts >> approved-only opaque entry retains its exact application index and raw audit
- Location: test/browser/strategy-proposal-compatibility.spec.ts:252:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('dialog', { name: 'Review proposed changes', exact: true, includeHidden: true }).locator('section').filter({ has: getByRole('dialog', { name: 'Review proposed changes', exact: true, includeHidden: true }).getByRole('heading', { name: 'Stored application selection details', exact: true }) })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('dialog', { name: 'Review proposed changes', exact: true, includeHidden: true }).locator('section').filter({ has: getByRole('dialog', { name: 'Review proposed changes', exact: true, includeHidden: true }).getByRole('heading', { name: 'Stored application selection details', exact: true }) })

```

```yaml
- dialog "Review proposed changes":
  - banner:
    - heading "Review proposed changes" [level=2]
    - paragraph: Plan pin 51000000-000 · low risk
    - button "Close dialog": ×
  - heading "Stored selection for application" [level=2]
  - paragraph: Only supported changes can be selected.
  - checkbox "Unsupported change This stored operation cannot be selected or applied." [disabled]
  - strong: Unsupported change
  - text: This stored operation cannot be selected or applied.
  - checkbox "Synthetic selective change update · Date unchanged" [checked]
  - strong: Synthetic selective change
  - text: update · Date unchanged
  - heading "Original change details" [level=2]
  - paragraph: All stored operations remain auditable in their original order.
  - table "Original change details":
    - caption: Original change details
    - rowgroup:
      - row "OPERATION ACTION STEP AFTER":
        - columnheader "OPERATION"
        - columnheader "ACTION"
        - columnheader "STEP"
        - columnheader "AFTER"
    - rowgroup:
      - row "1 Unsupported Unsupported change Original details retained":
        - cell "1"
        - cell "Unsupported"
        - cell "Unsupported change"
        - cell "Original details retained"
      - row "2 remove Synthetic removable change":
        - cell "2"
        - cell "remove"
        - cell "Synthetic removable change"
        - cell
      - row "3 update Synthetic selective change":
        - cell "3"
        - cell "update"
        - cell "Synthetic selective change"
        - cell
  - group: Original stored details · Operation 1
  - group: Original stored details · Operation 2
  - group: Original stored details · Operation 3
  - heading "Stored application selection details" [level=2]
  - paragraph: All stored operations remain auditable in their original order.
  - table "Stored application selection details":
    - caption: Stored application selection details
    - rowgroup:
      - row "OPERATION ACTION STEP AFTER":
        - columnheader "OPERATION"
        - columnheader "ACTION"
        - columnheader "STEP"
        - columnheader "AFTER"
    - rowgroup:
      - row "1 Unsupported Unsupported change Original details retained":
        - cell "1"
        - cell "Unsupported"
        - cell "Unsupported change"
        - cell "Original details retained"
      - row "2 update Synthetic selective change":
        - cell "2"
        - cell "update"
        - cell "Synthetic selective change"
        - cell
  - group: Original stored details · Operation 1
  - group: Original stored details · Operation 2
  - heading "Audit details" [level=2]
  - paragraph: Synthetic mixed queue proposal
  - paragraph: Created 10/14/2026, 12:00:00 PM · low risk · approved
  - paragraph: Synthetic original · fixture/original
  - contentinfo:
    - button "Reject change set"
    - button "Approve selected" [disabled]
    - button "Apply 1 changes"
```

# Test source

```ts
  177 |     await expect(modal.getByRole("checkbox")).toHaveCount(3);
  178 |     await expect(modal.getByRole("checkbox").nth(0)).toBeDisabled();
  179 |     await expect(modal.getByRole("checkbox").nth(0)).not.toBeChecked();
  180 |     await expect(modal.getByRole("checkbox").nth(1)).toBeChecked();
  181 |     await expect(modal.getByRole("checkbox").nth(2)).toBeChecked();
  182 |     await modal.getByRole("checkbox").nth(1).uncheck();
  183 |     await button(modal, "Approve selected").click();
  184 |     await button(page, "Confirm decision").click();
  185 |     await expect(modal).toHaveCount(0);
  186 |     expect(state.writes).toEqual([
  187 |       { key: "approve", input: { params: { id }, body: { opIndexes: [2] } } },
  188 |     ]);
  189 |     await expect(
  190 |       page.getByText("Synthetic opaque-only queue entry", { exact: true }),
  191 |     ).toBeVisible();
  192 |     await button(page, "Review change details").first().click();
  193 |     await expect(modal.getByRole("checkbox")).toHaveCount(1);
  194 |     await expect(modal.getByRole("checkbox").nth(0)).toBeChecked();
  195 |     await expect(modal).toContainText("Original stored details");
  196 |     await expect(modal).toContainText("Opaque audit entry");
  197 |     await expect(modal).toContainText("Synthetic removable change");
  198 |     await expect(modal).toContainText("fixture/original");
  199 |     await page.screenshot({
  200 |       path: info.outputPath(`strategy-compatibility-${colorScheme}.png`),
  201 |       fullPage: true,
  202 |       animations: "disabled",
  203 |     });
  204 |     await button(modal, "Apply 1 changes").click();
  205 |     await button(page, "Confirm decision").click();
  206 |     await expect(modal).toHaveCount(0);
  207 |     expect(state.writes[1]).toEqual({
  208 |       key: "apply",
  209 |       input: { params: { id }, body: { opIndexes: [0] } },
  210 |     });
  211 |     await button(page, "Undo applied changes").click();
  212 |     await expect(button(modal, "Approve selected")).toBeDisabled();
  213 |     await expect(modal.getByRole("button", { name: /^Apply / })).toBeDisabled();
  214 |     await button(modal, "Undo applied changes").click();
  215 |     await button(page, "Confirm decision").click();
  216 |     await expect(modal).toHaveCount(0);
  217 |     expect(state.writes.map((write) => write.key)).toEqual([
  218 |       "approve",
  219 |       "apply",
  220 |       "undo",
  221 |     ]);
  222 |     expectIsolated(state);
  223 |   });
  224 | }
  225 | 
  226 | test("unsupported-only proposal remains readable and rejectable without executable selection", async ({
  227 |   page,
  228 | }) => {
  229 |   const state = await fixture(page, [
  230 |     proposal({ ops: [originalOps[0], null, "Stored opaque primitive"] }),
  231 |   ]);
  232 |   await openFirstReview(page);
  233 |   const modal = review(page);
  234 |   await expect(modal.getByRole("checkbox")).toHaveCount(3);
  235 |   for (const checkbox of await modal.getByRole("checkbox").all()) {
  236 |     await expect(checkbox).toBeDisabled();
  237 |     await expect(checkbox).not.toBeChecked();
  238 |   }
  239 |   await expect(modal).toContainText(
  240 |     "This stored operation cannot be selected or applied.",
  241 |   );
  242 |   await expect(modal).toContainText("Stored opaque primitive");
  243 |   await expect(button(modal, "Approve selected")).toBeDisabled();
  244 |   await expect(modal.getByRole("button", { name: /^Apply / })).toBeDisabled();
  245 |   await button(modal, "Reject change set").click();
  246 |   await button(page, "Confirm decision").click();
  247 |   await expect(modal).toHaveCount(0);
  248 |   expect(state.writes).toEqual([{ key: "reject", input: { params: { id } } }]);
  249 |   expectIsolated(state);
  250 | });
  251 | 
  252 | test("approved-only opaque entry retains its exact application index and raw audit", async ({
  253 |   page,
  254 | }) => {
  255 |   const opaque = {
  256 |     op: "synthetic-approved-opaque",
  257 |     title: "Only approved audit",
  258 |     approvedProof: { stored: "approved-index-zero" },
  259 |   };
  260 |   const state = await fixture(page, [
  261 |     proposal({ status: "approved", approvedOps: [opaque, recognized] }),
  262 |   ]);
  263 |   await openFirstReview(page);
  264 |   const modal = review(page);
  265 |   await expect(modal.getByRole("checkbox")).toHaveCount(2);
  266 |   await expect(modal.getByRole("checkbox").nth(0)).toBeDisabled();
  267 |   await expect(modal.getByRole("checkbox").nth(0)).not.toBeChecked();
  268 |   await expect(modal.getByRole("checkbox").nth(1)).toBeChecked();
  269 |   await expect(button(modal, "Approve selected")).toBeDisabled();
  270 |   await expect(button(modal, "Reject change set")).toBeEnabled();
  271 |   const audit = modal.locator("section").filter({
  272 |     has: modal.getByRole("heading", {
  273 |       name: "Stored application selection details",
  274 |       exact: true,
  275 |     }),
  276 |   });
> 277 |   await expect(audit).toBeVisible();
      |                       ^ Error: expect(locator).toBeVisible() failed
  278 |   await audit.locator("summary").filter({ hasText: "Operation 1" }).click();
  279 |   await expect(audit.locator("pre").first()).toHaveText(
  280 |     JSON.stringify(opaque, null, 2),
  281 |   );
  282 |   await expect(audit.locator("pre").first()).toBeVisible();
  283 |   const original = modal.locator("section").filter({
  284 |     has: modal.getByRole("heading", {
  285 |       name: "Original change details",
  286 |       exact: true,
  287 |     }),
  288 |   });
  289 |   await expect(original).toContainText("Opaque audit entry");
  290 |   await expect(original).toContainText("Synthetic removable change");
  291 |   await button(modal, "Apply 1 changes").click();
  292 |   await button(page, "Confirm decision").click();
  293 |   await expect(modal).toHaveCount(0);
  294 |   expect(state.writes).toEqual([
  295 |     { key: "apply", input: { params: { id }, body: { opIndexes: [1] } } },
  296 |   ]);
  297 |   expectIsolated(state);
  298 | });
  299 | 
  300 | test("stale409 stays visible with both dialogs and never retries the mutation", async ({
  301 |   page,
  302 | }) => {
  303 |   const state = await fixture(page);
  304 |   await page.route("**/api/capiro/strategies.proposal.apply", (route) => {
  305 |     state.writes.push({ key: "apply", input: route.request().postDataJSON() });
  306 |     return route.fulfill({
  307 |       status: 409,
  308 |       json: { message: "Synthetic pinned plan changed. Reload the proposal." },
  309 |     });
  310 |   });
  311 |   await openFirstReview(page);
  312 |   await button(review(page), "Apply 2 changes").click();
  313 |   await button(page, "Confirm decision").click();
  314 |   await expect(page.getByRole("alert")).toContainText(
  315 |     "Synthetic pinned plan changed. Reload the proposal.",
  316 |   );
  317 |   await expect(review(page)).toBeVisible();
  318 |   await expect(
  319 |     page.getByRole("dialog", { name: "Apply selected changes?", exact: true }),
  320 |   ).toBeVisible();
  321 |   expect(state.writes).toHaveLength(1);
  322 |   await button(page, "Back to review").click();
  323 |   await expect(review(page)).toBeVisible();
  324 |   expect(state.writes).toHaveLength(1);
  325 |   expectIsolated(state);
  326 | });
  327 | 
  328 | test("synchronous duplicate confirmation sends one pending request", async ({
  329 |   page,
  330 | }) => {
  331 |   const state = await fixture(page);
  332 |   let held: Route | undefined;
  333 |   await page.route("**/api/capiro/strategies.proposal.apply", (route) => {
  334 |     state.writes.push({ key: "apply", input: route.request().postDataJSON() });
  335 |     held = route;
  336 |   });
  337 |   await page.goto("/__test/strategy-proposal-refresh");
  338 |   await button(review(page), "Apply 2 changes").click();
  339 |   await button(page, "Confirm decision").evaluate(
  340 |     (button: HTMLButtonElement) => {
  341 |       button.click();
  342 |       button.click();
  343 |     },
  344 |   );
  345 |   await expect.poll(() => Boolean(held)).toBe(true);
  346 |   await expect(button(page, "Saving…")).toBeDisabled();
  347 |   expect(state.writes).toHaveLength(1);
  348 |   await held!.fulfill({ json: detail });
  349 |   await expect(page.getByTestId("proposal-saved")).toHaveText(
  350 |     "Saved callbacks: 1",
  351 |   );
  352 |   await expect(page.getByTestId("proposal-closed")).toHaveText(
  353 |     "Closed callbacks: 1",
  354 |   );
  355 |   expect(state.writes).toHaveLength(1);
  356 |   expectIsolated(state);
  357 | });
  358 | 
  359 | for (const kind of [
  360 |   "content",
  361 |   "status",
  362 |   "pin",
  363 |   "approved-empty",
  364 |   "unavailable",
  365 | ]) {
  366 |   test(`same-ID ${kind} refresh invalidates selection and confirmation`, async ({
  367 |     page,
  368 |   }) => {
  369 |     const state = await fixture(page);
  370 |     await page.goto("/__test/strategy-proposal-refresh");
  371 |     await review(page).getByRole("checkbox").nth(1).uncheck();
  372 |     await button(review(page), "Approve selected").click();
  373 |     await expect(button(page, "Confirm decision")).toBeVisible();
  374 |     await refresh(page, kind);
  375 |     await expect(button(page, "Confirm decision")).toHaveCount(0);
  376 |     await expect(review(page)).toContainText(
  377 |       "The stored proposal changed. Review the current operations before confirming.",
```