# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: calendar-artifact-receipts.spec.ts >> artifact captions distinguish omitted sharing metadata from explicit privacy
- Location: apps/web/tests/browser/calendar-artifact-receipts.spec.ts:358:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('article').filter({ hasText: 'Synthetic unknown debrief' }).getByText('Sharing status unavailable', { exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('article').filter({ hasText: 'Synthetic unknown debrief' }).getByText('Sharing status unavailable', { exact: true })

```

```yaml
- main:
  - heading "Synthetic artifact receipt review" [level=1]
  - button "Replace client"
  - button "Toggle artifacts"
  - paragraph: "Current client: client-one"
  - heading "Debriefs" [level=3]
  - button "Add debrief"
  - button "Use saved meeting notes" [disabled]
  - button "Transcript and attachments" [disabled]
  - button "Type Notes Manually" [disabled]
  - button "Record Voice Memo" [disabled]
  - text: Source extraction and debrief generation are unavailable in this environment.
  - article:
    - text: approved Private
    - paragraph: Synthetic unknown debrief
    - button "Export PDF"
    - button "Edit"
    - button "Share"
  - article:
    - text: approved Private
    - paragraph: Synthetic private debrief
    - button "Export PDF"
    - button "Edit"
    - button "Share"
  - article:
    - text: approved Shared with client team
    - paragraph: Synthetic shared debrief
    - button "Export PDF"
    - button "Edit"
    - button "Unshare"
  - article:
    - text: approved Confidential
    - paragraph: Synthetic confidential debrief
    - button "Export PDF"
    - button "Edit"
```

# Test source

```ts
  300 |         path: `${base}/${kind}/artifact-one`,
  301 |         method: "PATCH",
  302 |         body: { body: "Changed content", confidential: false },
  303 |       },
  304 |       {
  305 |         path: `${base}/${kind}/artifact-one/approve`,
  306 |         method: "POST",
  307 |         body: undefined,
  308 |       },
  309 |       {
  310 |         path: `${base}/artifacts/share`,
  311 |         method: "POST",
  312 |         body: { artifacts: [{ type: singular, id: "artifact-one" }] },
  313 |       },
  314 |       {
  315 |         path: `${base}/artifacts/unshare`,
  316 |         method: "POST",
  317 |         body: { artifacts: [{ type: singular, id: "artifact-one" }] },
  318 |       },
  319 |     ]);
  320 |   });
  321 | }
  322 | 
  323 | for (const kind of ["notes", "debriefs"]) {
  324 |   const singular = kind === "notes" ? "note" : "debrief";
  325 |   test(`${kind}: pending fields cannot accept a later draft before a valid receipt`, async ({
  326 |     page,
  327 |   }) => {
  328 |     const state = await setup(page, kind);
  329 |     const pending = held();
  330 |     state.hold = pending.promise;
  331 |     await draft(page, singular);
  332 |     await page.getByRole("button", { name: `Save ${singular}` }).click();
  333 |     await expect.poll(() => state.writes).toBe(1);
  334 |     if (kind === "debriefs")
  335 |       await expect(
  336 |         page.getByRole("button", {
  337 |           name: "Type Notes Manually",
  338 |           exact: true,
  339 |           includeHidden: true,
  340 |         }),
  341 |       ).toHaveCount(0);
  342 |     const content = page.getByLabel("Content", { exact: true });
  343 |     await content.press("End");
  344 |     await content.pressSequentially(" later draft");
  345 |     await expect(content).toHaveValue("Retain this synthetic draft");
  346 |     await expect(
  347 |       page.getByRole("checkbox", { name: "Confidential", exact: true }),
  348 |     ).toBeDisabled();
  349 |     pending.release();
  350 |     await expect(page.getByRole("dialog")).toHaveCount(0);
  351 |     expect(state.requests[0]?.body).toEqual({
  352 |       body: "Retain this synthetic draft",
  353 |       confidential: false,
  354 |     });
  355 |   });
  356 | }
  357 | 
  358 | test("artifact captions distinguish omitted sharing metadata from explicit privacy", async ({
  359 |   page,
  360 | }) => {
  361 |   const state = await setup(page, "debriefs");
  362 |   const cases = [
  363 |     {
  364 |       id: "unknown",
  365 |       sharedAt: undefined,
  366 |       confidential: false,
  367 |       caption: "Sharing status unavailable",
  368 |     },
  369 |     { id: "private", sharedAt: null, confidential: false, caption: "Private" },
  370 |     {
  371 |       id: "shared",
  372 |       sharedAt: "2026-10-10T15:00:00Z",
  373 |       confidential: false,
  374 |       caption: "Shared with client team",
  375 |     },
  376 |     {
  377 |       id: "confidential",
  378 |       sharedAt: undefined,
  379 |       confidential: true,
  380 |       caption: "Confidential",
  381 |     },
  382 |   ];
  383 |   state.items = cases.map(({ id, sharedAt, confidential }) => ({
  384 |     ...createdMetadata("debriefs"),
  385 |     id,
  386 |     sharedAt,
  387 |     sharedByUserId: undefined,
  388 |     confidential,
  389 |     status: "approved",
  390 |     body: `Synthetic ${id} debrief`,
  391 |     restricted: false,
  392 |   }));
  393 |   // JSON omits undefined stamps just as native GET /debriefs does. The other
  394 |   // rows exercise explicit values used by artifact reads that supply stamps.
  395 |   await page.reload();
  396 |   for (const { id, caption } of cases) {
  397 |     const artifact = page
  398 |       .getByRole("article")
  399 |       .filter({ hasText: `Synthetic ${id} debrief` });
> 400 |     await expect(artifact.getByText(caption, { exact: true })).toBeVisible();
      |                                                                ^ Error: expect(locator).toBeVisible() failed
  401 |     if (id === "unknown") {
  402 |       await expect(artifact.getByText("Private", { exact: true })).toHaveCount(
  403 |         0,
  404 |       );
  405 |       await expect(
  406 |         artifact.getByRole("button", { name: "Unshare", exact: true }),
  407 |       ).toHaveCount(0);
  408 |     }
  409 |   }
  410 |   expect(state.writes).toBe(0);
  411 | });
  412 | 
```