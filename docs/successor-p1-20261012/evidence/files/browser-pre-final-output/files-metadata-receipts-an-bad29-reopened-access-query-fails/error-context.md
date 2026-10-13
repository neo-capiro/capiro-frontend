# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: files-metadata-receipts.spec.ts >> an unknown draft can recover even when the reopened access query fails
- Location: apps/web/tests/browser/files-metadata-receipts.spec.ts:256:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('dialog', { name: 'Access: Test report.pdf', exact: true }).getByRole('radio', { name: 'All team members' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('dialog', { name: 'Access: Test report.pdf', exact: true }).getByRole('radio', { name: 'All team members' })

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
  1   | import { expect, test, type Page } from "@playwright/test";
  2   | import { installFixtures, json, clientId, client, file } from "./fixtures";
  3   | import {
  4   |   changeDocumentView,
  5   |   holdResponse,
  6   |   installDocumentFixtures,
  7   |   nativeFile,
  8   |   settleDocumentRequests,
  9   | } from "./capability-documents-fixtures";
  10  | 
  11  | async function openAccess(page: Page, name = file.fileName) {
  12  |   await page.getByRole("button", { name: `Actions for ${name}` }).click();
  13  |   await page
  14  |     .getByRole("menuitem", { name: "Manage access", exact: true })
  15  |     .click();
  16  |   const dialog = page.getByRole("dialog", {
  17  |     name: `Access: ${name}`,
  18  |     exact: true,
  19  |   });
  20  |   await expect(
  21  |     dialog.getByRole("radio", { name: "All team members" }),
> 22  |   ).toBeVisible();
      |     ^ Error: expect(locator).toBeVisible() failed
  23  |   return dialog;
  24  | }
  25  | 
  26  | test("conflicting ACL receipt retains the draft and freezes repeat save until current GET review", async ({
  27  |   page,
  28  | }, info) => {
  29  |   const unexpected = await installFixtures(page);
  30  |   let patches = 0;
  31  |   let reads = 0;
  32  |   await page.route("**/engagement/attachments?**", (r) => json(r, [file]));
  33  |   await page.route(`**/files/${file.id}/access`, (r) => {
  34  |     if (r.request().method() === "GET") {
  35  |       reads++;
  36  |       return json(r, file);
  37  |     }
  38  |     patches++;
  39  |     expect(r.request().postDataJSON()).toEqual({
  40  |       viewerMode: "restricted",
  41  |       viewerUserIds: [],
  42  |     });
  43  |     return json(
  44  |       r,
  45  |       patches === 1 ? file : { ...file, viewerMode: "restricted" },
  46  |     );
  47  |   });
  48  |   await page.goto(`/portfolio/${clientId}/files`);
  49  |   const dialog = await openAccess(page);
  50  |   await dialog.getByRole("radio", { name: "Specific people" }).check();
  51  |   await dialog.getByRole("button", { name: "Save access" }).click();
  52  |   await expect(dialog.getByRole("alert")).toContainText("unexpected response");
  53  |   await expect(
  54  |     dialog.getByRole("radio", { name: "Specific people" }),
  55  |   ).toBeChecked();
  56  |   await expect(
  57  |     dialog.getByRole("button", { name: "Save access" }),
  58  |   ).toBeDisabled();
  59  |   await expect(dialog.getByText(/save outcome is unknown/i)).toBeVisible();
  60  |   await page.screenshot({ path: info.outputPath("conflicting-acl.png") });
  61  |   const priorReads = reads;
  62  |   await dialog.getByRole("button", { name: "Review current file" }).click();
  63  |   await expect.poll(() => reads).toBeGreaterThan(priorReads);
  64  |   await expect(
  65  |     dialog.getByText(/Current saved access: All team members/),
  66  |   ).toBeVisible();
  67  |   await expect(
  68  |     dialog.getByRole("radio", { name: "Specific people" }),
  69  |   ).toBeChecked();
  70  |   await expect(
  71  |     dialog.getByRole("button", { name: "Save access" }),
  72  |   ).toBeEnabled();
  73  |   expect(patches).toBe(1);
  74  |   await dialog.getByRole("button", { name: "Save access" }).click();
  75  |   await expect(dialog).toHaveCount(0);
  76  |   expect(patches).toBe(2);
  77  |   expect(unexpected).toEqual([]);
  78  | });
  79  | 
  80  | test("a matching reordered restricted viewer set completes the save", async ({
  81  |   page,
  82  | }) => {
  83  |   const unexpected = await installFixtures(page);
  84  |   const ids = [
  85  |     "00000000-0000-4000-8000-000000000001",
  86  |     "00000000-0000-4000-8000-000000000002",
  87  |   ];
  88  |   let saved = false;
  89  |   await page.route("**/core/client-account-owners/options", (r) =>
  90  |     json(
  91  |       r,
  92  |       ids.map((id, index) => ({
  93  |         id,
  94  |         email: `viewer${index}@example.test`,
  95  |         firstName: `Viewer ${index}`,
  96  |         lastName: "Test",
  97  |       })),
  98  |     ),
  99  |   );
  100 |   await page.route("**/engagement/attachments?**", (r) =>
  101 |     json(r, [
  102 |       saved ? { ...file, viewerMode: "restricted", viewerUserIds: ids } : file,
  103 |     ]),
  104 |   );
  105 |   await page.route(`**/files/${file.id}/access`, (r) => {
  106 |     if (r.request().method() === "GET")
  107 |       return json(
  108 |         r,
  109 |         saved
  110 |           ? { ...file, viewerMode: "restricted", viewerUserIds: ids }
  111 |           : file,
  112 |       );
  113 |     expect(r.request().postDataJSON()).toEqual({
  114 |       viewerMode: "restricted",
  115 |       viewerUserIds: ids,
  116 |     });
  117 |     saved = true;
  118 |     return json(r, {
  119 |       ...file,
  120 |       viewerMode: "restricted",
  121 |       viewerUserIds: [...ids].reverse(),
  122 |     });
```