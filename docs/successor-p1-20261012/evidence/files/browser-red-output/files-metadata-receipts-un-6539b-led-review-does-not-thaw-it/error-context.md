# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: files-metadata-receipts.spec.ts >> unknown ACL save survives close/reopen and a failed review does not thaw it
- Location: apps/web/tests/browser/files-metadata-receipts.spec.ts:62:1

# Error details

```
Error: expect(locator).toBeChecked() failed

Locator:  getByRole('dialog', { name: 'Access: Test report.pdf', exact: true }).getByRole('radio', { name: 'Specific people' })
Expected: checked
Received: unchecked
Timeout:  5000ms

Call log:
  - Expect "toBeChecked" with timeout 5000ms
  - waiting for getByRole('dialog', { name: 'Access: Test report.pdf', exact: true }).getByRole('radio', { name: 'Specific people' })
    14 × locator resolved to <input required="" name="mode" type="radio"/>
       - unexpected value "unchecked"

```

```yaml
- radio "Specific people"
```

# Test source

```ts
  1  | import { expect, test, type Page } from "@playwright/test";
  2  | import { installFixtures, json, clientId, file } from "./fixtures";
  3  | 
  4  | async function openAccess(page: Page) {
  5  |   await page.getByRole("button", { name: `Actions for ${file.fileName}` }).click();
  6  |   await page.getByRole("menuitem", { name: "Manage access", exact: true }).click();
  7  |   const dialog = page.getByRole("dialog", { name: `Access: ${file.fileName}`, exact: true });
  8  |   await expect(dialog.getByRole("radio", { name: "All team members" })).toBeVisible();
  9  |   return dialog;
  10 | }
  11 | 
  12 | test("conflicting ACL receipt retains the draft and freezes repeat save until current GET review", async ({ page }, info) => {
  13 |   const unexpected = await installFixtures(page);
  14 |   let patches = 0; let reads = 0;
  15 |   await page.route("**/engagement/attachments?**", r => json(r, [file]));
  16 |   await page.route(`**/files/${file.id}/access`, r => {
  17 |     if (r.request().method() === "GET") { reads++; return json(r, file); }
  18 |     patches++; expect(r.request().postDataJSON()).toEqual({ viewerMode: "restricted", viewerUserIds: [] });
  19 |     return json(r, patches === 1 ? file : { ...file, viewerMode: "restricted" });
  20 |   });
  21 |   await page.goto(`/portfolio/${clientId}/files`);
  22 |   const dialog = await openAccess(page);
  23 |   await dialog.getByRole("radio", { name: "Specific people" }).check();
  24 |   await dialog.getByRole("button", { name: "Save access" }).click();
  25 |   await expect(dialog.getByRole("alert")).toContainText("unexpected response");
  26 |   await expect(dialog.getByRole("radio", { name: "Specific people" })).toBeChecked();
  27 |   await expect(dialog.getByRole("button", { name: "Save access" })).toBeDisabled();
  28 |   await expect(dialog.getByText(/save outcome is unknown/i)).toBeVisible();
  29 |   await page.screenshot({ path: info.outputPath("conflicting-acl.png") });
  30 |   const priorReads = reads;
  31 |   await dialog.getByRole("button", { name: "Review current file" }).click();
  32 |   await expect.poll(() => reads).toBeGreaterThan(priorReads);
  33 |   await expect(dialog.getByText(/Current saved access: All team members/)).toBeVisible();
  34 |   await expect(dialog.getByRole("radio", { name: "Specific people" })).toBeChecked();
  35 |   await expect(dialog.getByRole("button", { name: "Save access" })).toBeEnabled();
  36 |   expect(patches).toBe(1);
  37 |   await dialog.getByRole("button", { name: "Save access" }).click();
  38 |   await expect(dialog).toHaveCount(0); expect(patches).toBe(2); expect(unexpected).toEqual([]);
  39 | });
  40 | 
  41 | test("a contradictory folder receipt keeps the requested folder and needs current review", async ({ page }) => {
  42 |   const unexpected = await installFixtures(page); let patches = 0;
  43 |   await page.route("**/engagement/attachments?**", r => json(r, [file]));
  44 |   await page.route(`**/files/${file.id}/access`, r => json(r, file));
  45 |   await page.route(`**/files/${file.id}/folder`, r => { patches++; return json(r, file); });
  46 |   await page.goto(`/portfolio/${clientId}/files`);
  47 |   await page.getByRole("checkbox", { name: `Select ${file.fileName}` }).check();
  48 |   await page.getByRole("button", { name: "New folder", exact: true }).click();
  49 |   const dialog = page.getByRole("dialog", { name: "New folder", exact: true });
  50 |   await dialog.getByLabel("Folder name").fill("Reviewed destination");
  51 |   await dialog.getByRole("button", { name: "Create folder & move file" }).click();
  52 |   await expect(dialog.getByRole("alert")).toContainText("unexpected response");
  53 |   await expect(dialog.getByLabel("Folder name")).toHaveValue("Reviewed destination");
  54 |   await expect(dialog.getByRole("button", { name: "Create folder & move file" })).toBeDisabled();
  55 |   await dialog.getByRole("button", { name: "Review current file" }).click();
  56 |   await expect(dialog.getByText("Current saved folder: Reports")).toBeVisible();
  57 |   await expect(dialog.getByLabel("Folder name")).toHaveValue("Reviewed destination");
  58 |   await expect(dialog.getByRole("button", { name: "Create folder & move file" })).toBeEnabled();
  59 |   expect(patches).toBe(1); expect(unexpected).toEqual([]);
  60 | });
  61 | 
  62 | test("unknown ACL save survives close/reopen and a failed review does not thaw it", async ({ page }) => {
  63 |   await installFixtures(page); let patches = 0; let refuseRead = false;
  64 |   await page.route("**/engagement/attachments?**", r => json(r, [file]));
  65 |   await page.route(`**/files/${file.id}/access`, r => {
  66 |     if (r.request().method() === "GET") return refuseRead ? json(r, { message: "Synthetic review unavailable" }, 503) : json(r, file);
  67 |     patches++; return json(r, { message: "Synthetic ambiguous patch" }, 503);
  68 |   });
  69 |   await page.goto(`/portfolio/${clientId}/files`);let dialog = await openAccess(page);
  70 |   await dialog.getByRole("radio", { name: "Specific people" }).check();
  71 |   await dialog.getByRole("button", { name: "Save access" }).click();
  72 |   await expect(dialog.getByRole("alert")).toContainText("Synthetic ambiguous patch");
  73 |   await dialog.getByRole("button", { name: "Close", exact: true }).click();
  74 |   dialog = await openAccess(page);
> 75 |   await expect(dialog.getByRole("radio", { name: "Specific people" })).toBeChecked();
     |                                                                        ^ Error: expect(locator).toBeChecked() failed
  76 |   await expect(dialog.getByRole("button", { name: "Save access" })).toBeDisabled();
  77 |   refuseRead = true;
  78 |   await dialog.getByRole("button", { name: "Review current file" }).click();
  79 |   await expect(dialog.getByText("Synthetic review unavailable", { exact: false })).toBeVisible();
  80 |   await expect(dialog.getByRole("button", { name: "Save access" })).toBeDisabled();
  81 |   expect(patches).toBe(1);
  82 | });
  83 | 
```