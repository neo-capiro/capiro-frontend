# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: guarded.spec.ts >> unknown deletion survives close/reopen until deliberate current review and a new confirmation
- Location: apps/web/tests/browser/files-delete-recovery.spec.ts:21:5

# Error details

```
Error: expect(locator).toBeDisabled() failed

Locator:  getByRole('dialog', { name: 'Delete file', exact: true }).getByRole('button', { name: 'Confirm delete' })
Expected: disabled
Received: enabled
Timeout:  5000ms

Call log:
  - Expect "toBeDisabled" with timeout 5000ms
  - waiting for getByRole('dialog', { name: 'Delete file', exact: true }).getByRole('button', { name: 'Confirm delete' })
    14 × locator resolved to <button class="button primary">Confirm delete</button>
       - unexpected value "enabled"

```

```yaml
- button "Confirm delete"
```

# Test source

```ts
  1   | import { expect, test, type Page } from "@playwright/test";
  2   | import { client, clientId, installFixtures, json } from "./fixtures";
  3   | import {
  4   |   changeDocumentView,
  5   |   holdResponse,
  6   |   installDocumentFixtures,
  7   |   nativeFile,
  8   |   settleDocumentRequests,
  9   | } from "./capability-documents-fixtures";
  10  | 
  11  | async function openDelete(page: Page) {
  12  |   await page
  13  |     .getByRole("button", { name: `Actions for ${nativeFile.fileName}` })
  14  |     .click();
  15  |   await page
  16  |     .getByRole("menuitem", { name: "Delete file", exact: true })
  17  |     .click();
  18  |   return page.getByRole("dialog", { name: "Delete file", exact: true });
  19  | }
  20  | 
  21  | test("unknown deletion survives close/reopen until deliberate current review and a new confirmation", async ({
  22  |   page,
  23  | }, info) => {
  24  |   const unexpected = await installFixtures(page);
  25  |   let deletes = 0;
  26  |   let reads = 0;
  27  |   await page.route("**/engagement/attachments?**", (r) => {
  28  |     reads++;
  29  |     return json(
  30  |       r,
  31  |       deletes === 2
  32  |         ? []
  33  |         : [
  34  |             {
  35  |               ...nativeFile,
  36  |               lifecycleStatus: deletes ? "delete_failed" : "ready",
  37  |             },
  38  |           ],
  39  |     );
  40  |   });
  41  |   await page.route(`**/engagement/attachments/${nativeFile.id}`, (r) => {
  42  |     deletes++;
  43  |     return deletes === 1
  44  |       ? json(r, { message: "Synthetic ambiguous delete" }, 503)
  45  |       : json(r, { ok: true });
  46  |   });
  47  |   await page.goto(`/portfolio/${clientId}/files`);
  48  |   let dialog = await openDelete(page);
  49  |   await dialog.getByRole("button", { name: "Confirm delete" }).click();
  50  |   await expect(dialog.getByText("Synthetic ambiguous delete")).toBeVisible();
  51  |   await expect(
  52  |     dialog.getByRole("button", { name: "Confirm delete" }),
> 53  |   ).toBeDisabled();
      |     ^ Error: expect(locator).toBeDisabled() failed
  54  |   await expect(dialog.getByText(/deletion outcome is unknown/)).toBeVisible();
  55  |   await page.screenshot({
  56  |     path: info.outputPath("delete-unknown-desktop.png"),
  57  |   });
  58  |   await dialog.getByRole("button", { name: "Close", exact: true }).click();
  59  |   dialog = await openDelete(page);
  60  |   await expect(
  61  |     dialog.getByRole("button", { name: "Confirm delete" }),
  62  |   ).toBeDisabled();
  63  |   const before = reads;
  64  |   await dialog.getByRole("button", { name: "Review current files" }).focus();
  65  |   await page.keyboard.press("Enter");
  66  |   await expect(dialog.getByRole("status")).toContainText(
  67  |     "Current deletion status: Failed",
  68  |   );
  69  |   await expect(dialog.getByRole("status")).toContainText(
  70  |     "does not confirm the earlier deletion",
  71  |   );
  72  |   await expect(
  73  |     dialog.getByRole("button", { name: "Confirm delete" }),
  74  |   ).toBeEnabled();
  75  |   expect(reads).toBeGreaterThan(before);
  76  |   expect(deletes).toBe(1);
  77  |   await dialog.getByRole("button", { name: "Confirm delete" }).click();
  78  |   await expect(dialog).toHaveCount(0);
  79  |   await expect(
  80  |     page.getByRole("button", { name: `Actions for ${nativeFile.fileName}` }),
  81  |   ).toHaveCount(0);
  82  |   expect(deletes).toBe(2);
  83  |   expect(unexpected).toEqual([]);
  84  | });
  85  | 
  86  | test("an absent current file is unavailable, not a deletion confirmation", async ({
  87  |   page,
  88  | }, info) => {
  89  |   const unexpected = await installFixtures(page);
  90  |   await page.setViewportSize({ width: 360, height: 800 });
  91  |   let dispatched = false;
  92  |   await page.route("**/engagement/attachments?**", (r) =>
  93  |     json(r, dispatched ? [] : [nativeFile]),
  94  |   );
  95  |   await page.route(`**/engagement/attachments/${nativeFile.id}`, (r) => {
  96  |     dispatched = true;
  97  |     return json(r, {}, 503);
  98  |   });
  99  |   await page.goto(`/portfolio/${clientId}/files`);
  100 |   const dialog = await openDelete(page);
  101 |   await dialog.getByRole("button", { name: "Confirm delete" }).click();
  102 |   await expect(dialog.getByText(/deletion outcome is unknown/)).toBeVisible();
  103 |   await dialog.getByRole("button", { name: "Review current files" }).click();
  104 |   await expect(dialog.getByRole("status")).toContainText(
  105 |     "not in the current visible client files",
  106 |   );
  107 |   await expect(dialog.getByRole("status")).toContainText(
  108 |     "does not confirm the earlier deletion",
  109 |   );
  110 |   await expect(
  111 |     dialog.getByRole("button", { name: "Confirm delete" }),
  112 |   ).toBeDisabled();
  113 |   const geometry = await dialog.evaluate((el) => ({
  114 |     left: el.getBoundingClientRect().left,
  115 |     right: el.getBoundingClientRect().right,
  116 |     client: el.clientWidth,
  117 |     scroll: el.scrollWidth,
  118 |   }));
  119 |   expect(geometry.left).toBeGreaterThanOrEqual(0);
  120 |   expect(geometry.right).toBeLessThanOrEqual(360);
  121 |   expect(geometry.scroll).toBeLessThanOrEqual(geometry.client);
  122 |   for (const key of ["Tab", "Tab", "Shift+Tab"]) {
  123 |     await page.keyboard.press(key);
  124 |     await expect
  125 |       .poll(() => dialog.evaluate((el) => el.contains(document.activeElement)))
  126 |       .toBe(true);
  127 |   }
  128 |   await page.screenshot({ path: info.outputPath("delete-absent-mobile.png") });
  129 |   await page.keyboard.press("Escape");
  130 |   await expect(dialog).toHaveCount(0);
  131 |   expect(unexpected).toEqual([]);
  132 | });
  133 | 
  134 | test("pending current deletion stays fenced until a later explicit review reports a recoverable file", async ({
  135 |   page,
  136 | }) => {
  137 |   const unexpected = await installFixtures(page);
  138 |   let lifecycle = "ready";
  139 |   let deletes = 0;
  140 |   await page.route("**/engagement/attachments?**", (r) =>
  141 |     json(r, [{ ...nativeFile, lifecycleStatus: lifecycle }]),
  142 |   );
  143 |   await page.route(`**/engagement/attachments/${nativeFile.id}`, (r) => {
  144 |     deletes++;
  145 |     return json(r, {}, 503);
  146 |   });
  147 |   await page.goto(`/portfolio/${clientId}/files`);
  148 |   const dialog = await openDelete(page);
  149 |   await dialog.getByRole("button", { name: "Confirm delete" }).click();
  150 |   lifecycle = "delete_pending";
  151 |   await dialog.getByRole("button", { name: "Review current files" }).click();
  152 |   await expect(dialog.getByRole("status")).toContainText(
  153 |     "Deletion is still pending",
```