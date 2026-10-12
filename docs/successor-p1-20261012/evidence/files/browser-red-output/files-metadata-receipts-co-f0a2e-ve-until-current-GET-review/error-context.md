# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: files-metadata-receipts.spec.ts >> conflicting ACL receipt retains the draft and freezes repeat save until current GET review
- Location: apps/web/tests/browser/files-metadata-receipts.spec.ts:12:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByRole('dialog', { name: 'Access: Test report.pdf', exact: true }).getByRole('alert')
Expected substring: "unexpected response"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for getByRole('dialog', { name: 'Access: Test report.pdf', exact: true }).getByRole('alert')

```

```yaml
- link "Skip to content":
  - /url: "#main"
- banner:
  - link "Capiro Home":
    - /url: /
    - img "Capiro"
  - navigation "Workspace":
    - link "Meri":
      - /url: /meri
    - link "Portfolio":
      - /url: /
    - link "Modules":
      - /url: /modules
  - navigation "Global actions":
    - link "Quick log":
      - /url: /portfolio/10000000-0000-4000-8000-000000000001?log=1
    - link "Master calendar":
      - /url: /calendar
    - link "Search Portfolio":
      - /url: /portfolio?search=1
    - button "Updates unavailable" [disabled]
    - button "Test account": T
- complementary "Portfolio navigation":
  - paragraph: Portfolio
  - navigation "Portfolio":
    - link "Portfolio Overview":
      - /url: /portfolio
      - text: Overview
    - link "Portfolio Clients":
      - /url: /portfolio?type=CLIENT
      - text: Clients
    - link "Portfolio Prospects":
      - /url: /portfolio/prospects
      - text: Prospects
  - separator
  - paragraph: Test Aerospace
  - navigation "Client":
    - link "Overview":
      - /url: /portfolio/10000000-0000-4000-8000-000000000001
    - link "Objectives":
      - /url: /portfolio/10000000-0000-4000-8000-000000000001/objectives
    - link "Calendar":
      - /url: /portfolio/10000000-0000-4000-8000-000000000001/calendar
    - link "Relationships":
      - /url: /portfolio/10000000-0000-4000-8000-000000000001/relationships
    - link "Work":
      - /url: /portfolio/10000000-0000-4000-8000-000000000001/work
    - link "Capabilities":
      - /url: /portfolio/10000000-0000-4000-8000-000000000001/capabilities
    - link "Bill Tracker":
      - /url: /portfolio/10000000-0000-4000-8000-000000000001/bills
    - link "Opportunities":
      - /url: /portfolio/10000000-0000-4000-8000-000000000001/opportunities
    - link "Files":
      - /url: /portfolio/10000000-0000-4000-8000-000000000001/files
  - link "Settings":
    - /url: /settings
- main:
  - navigation "Breadcrumb":
    - link "Back to Portfolio":
      - /url: /portfolio
    - link "Portfolio":
      - /url: /portfolio
    - link "Test Aerospace":
      - /url: /portfolio/10000000-0000-4000-8000-000000000001
    - 'button "Switch client view: Files"': Files
  - button "Quick add"
  - button "Meri actions"
  - button "More actions for Test Aerospace"
  - region "Client identity":
    - text: TA
    - strong: Test Aerospace
    - paragraph: Aerospace
    - text: active client
  - heading "Client files" [level=1]
  - button "New folder" [disabled]
  - button "Upload"
  - button "Create with Meri" [disabled]
  - textbox "Search files"
  - combobox "File source":
    - option "All sources" [selected]
    - option "manual"
  - combobox "Sort files":
    - option "Created · newest" [selected]
    - option "Name"
  - complementary:
    - text: Folders
    - button "Access" [disabled]
    - button "Test Aerospace · 1" [pressed]
    - button "Reports 1"
    - button "Unfiled 0"
    - separator
    - text: Visible file storage
    - paragraph: 0.0 MiB
    - text: Storage quota is not provided by this service. Only accessible current attachments are counted.
  - text: 1 files · 0 selected
  - button "Move to folder" [disabled]
  - table:
    - rowgroup:
      - row "Select visible files Name Linked to / location Created Owner Status Actions":
        - columnheader "Select visible files":
          - checkbox "Select visible files"
        - columnheader "Name"
        - columnheader "Linked to / location"
        - columnheader "Created"
        - columnheader "Owner"
        - columnheader "Status"
        - columnheader "Actions"
    - rowgroup:
      - row "Select Test report.pdf pdf Test report.pdf manual Reports 10/1/2026 Test user scan_pending Actions for Test report.pdf":
        - cell "Select Test report.pdf":
          - checkbox "Select Test report.pdf"
        - cell "pdf Test report.pdf manual":
          - button "pdf Test report.pdf"
          - text: manual
        - cell "Reports"
        - cell "10/1/2026"
        - cell "Test user"
        - cell "scan_pending"
        - cell "Actions for Test report.pdf":
          - button "Actions for Test report.pdf": ⋯
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
> 25 |   await expect(dialog.getByRole("alert")).toContainText("unexpected response");
     |                                           ^ Error: expect(locator).toContainText(expected) failed
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
  75 |   await expect(dialog.getByRole("radio", { name: "Specific people" })).toBeChecked();
  76 |   await expect(dialog.getByRole("button", { name: "Save access" })).toBeDisabled();
  77 |   refuseRead = true;
  78 |   await dialog.getByRole("button", { name: "Review current file" }).click();
  79 |   await expect(dialog.getByText("Synthetic review unavailable", { exact: false })).toBeVisible();
  80 |   await expect(dialog.getByRole("button", { name: "Save access" })).toBeDisabled();
  81 |   expect(patches).toBe(1);
  82 | });
  83 | 
```