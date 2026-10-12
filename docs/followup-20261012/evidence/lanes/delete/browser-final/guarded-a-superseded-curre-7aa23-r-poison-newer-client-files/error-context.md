# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: guarded.spec.ts >> a superseded current read returning 403 cannot replace or poison newer client files
- Location: apps/web/tests/browser/files-delete-recovery.spec.ts:335:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('dialog', { name: 'Delete file', exact: true }).getByText(/current files changed during review/)
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('dialog', { name: 'Delete file', exact: true }).getByText(/current files changed during review/)

```

```yaml
- dialog "Delete file":
  - banner:
    - heading "Delete file" [level=2]
    - button "Close"
  - paragraph: Delete Synthetic datasheet.txt? This removes the attachment and its stored object.
  - status:
    - paragraph: "Current file: Newer current file.txt."
    - paragraph: "Current deletion status: No pending deletion reported."
    - text: This is current visible state. It does not confirm the earlier deletion.
  - button "Confirm delete"
```

# Test source

```ts
  280 |       held.release();
  281 |     }
  282 |     await held.settled;
  283 |     await settleDocumentRequests(page);
  284 |     expect(held.calls()).toBe(1);
  285 |     await expect(page.getByText(/This is current visible state/)).toHaveCount(
  286 |       0,
  287 |     );
  288 |     if (boundary === "actor") {
  289 |       await changeDocumentView(page, "restore-actor");
  290 |       const reopened = await openDelete(page);
  291 |       await expect(
  292 |         reopened.getByRole("button", { name: "Confirm delete" }),
  293 |       ).toBeDisabled();
  294 |       await expect(
  295 |         reopened.getByRole("button", { name: "Review current files" }),
  296 |       ).toBeEnabled();
  297 |     }
  298 |     expect(unexpected).toEqual([]);
  299 |   });
  300 | }
  301 | 
  302 | test("a current read completing after actor replacement cannot release the old fence or leak its state", async ({
  303 |   page,
  304 | }) => {
  305 |   const unexpected = await installDocumentFixtures(page);
  306 |   await page.route(`**/engagement/attachments/${nativeFile.id}`, (r) =>
  307 |     json(r, {}, 503),
  308 |   );
  309 |   await page.goto("/capability-documents.html?files");
  310 |   const dialog = await openDelete(page);
  311 |   await dialog.getByRole("button", { name: "Confirm delete" }).click();
  312 |   const held = await holdResponse(page, "**/engagement/attachments?**", "GET", [
  313 |     nativeFile,
  314 |   ]);
  315 |   try {
  316 |     await dialog.getByRole("button", { name: "Review current files" }).click();
  317 |     await held.started;
  318 |     await changeDocumentView(page, "actor");
  319 |     await expect(dialog).toHaveCount(0);
  320 |   } finally {
  321 |     held.release();
  322 |   }
  323 |   await held.settled;
  324 |   await settleDocumentRequests(page);
  325 |   await expect(page.getByText(/This is current visible state/)).toHaveCount(0);
  326 |   await changeDocumentView(page, "restore-actor");
  327 |   const reopened = await openDelete(page);
  328 |   await expect(
  329 |     reopened.getByRole("button", { name: "Confirm delete" }),
  330 |   ).toBeDisabled();
  331 |   expect(unexpected).toEqual([]);
  332 | });
  333 | 
  334 | for (const status of [200, 403]) {
  335 |   test(`a superseded current read returning ${status} cannot replace or poison newer client files`, async ({
  336 |     page,
  337 |   }) => {
  338 |     const unexpected = await installDocumentFixtures(page);
  339 |     await page.route(`**/engagement/attachments/${nativeFile.id}`, (r) =>
  340 |       json(r, {}, 503),
  341 |     );
  342 |     await page.goto("/capability-documents.html?files");
  343 |     const dialog = await openDelete(page);
  344 |     await dialog.getByRole("button", { name: "Confirm delete" }).click();
  345 |     let release!: () => void;
  346 |     let received!: () => void;
  347 |     const gate = new Promise<void>((resolve) => {
  348 |       release = resolve;
  349 |     });
  350 |     const started = new Promise<void>((resolve) => {
  351 |       received = resolve;
  352 |     });
  353 |     let reads = 0;
  354 |     await page.route("**/engagement/attachments?**", async (r) => {
  355 |       if (++reads === 1) {
  356 |         received();
  357 |         await gate;
  358 |         return json(
  359 |           r,
  360 |           status === 200 ? [nativeFile] : { message: "Obsolete refusal" },
  361 |           status,
  362 |         );
  363 |       }
  364 |       return json(r, [{ ...nativeFile, fileName: "Newer current file.txt" }]);
  365 |     });
  366 |     try {
  367 |       await dialog
  368 |         .getByRole("button", { name: "Review current files" })
  369 |         .click();
  370 |       await started;
  371 |       await changeDocumentView(page, "files");
  372 |       await expect(
  373 |         page.getByLabel("Synthetic original document cache"),
  374 |       ).toContainText("Newer current file.txt");
  375 |     } finally {
  376 |       release();
  377 |     }
  378 |     await expect(
  379 |       dialog.getByText(/current files changed during review/),
> 380 |     ).toBeVisible();
      |       ^ Error: expect(locator).toBeVisible() failed
  381 |     await expect(
  382 |       dialog.getByRole("button", { name: "Confirm delete" }),
  383 |     ).toBeDisabled();
  384 |     await expect(
  385 |       page.getByLabel("Synthetic original document cache"),
  386 |     ).toContainText("Newer current file.txt");
  387 |     expect(unexpected).toEqual([]);
  388 |   });
  389 | }
  390 | 
```