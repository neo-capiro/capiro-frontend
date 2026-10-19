# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: capability-documents-upload.spec.ts >> bytes already sent cannot start confirmation after the source changes
- Location: tests/browser/capability-documents-upload.spec.ts:16:3

# Error details

```
Error: page.goto: Test ended.
Call log:
  - navigating to "http://127.0.0.1:5191/capability-documents.html", waiting until "load"

```

# Test source

```ts
  1   | import { expect, type Page } from "@playwright/test";
  2   | import {
  3   |   capabilityId,
  4   |   clientId,
  5   |   file,
  6   |   installFixtures,
  7   |   json,
  8   | } from "./fixtures";
  9   | export { holdResponse } from "./capability-boundary-fixtures";
  10  | export const source = `capability:${capabilityId}`;
  11  | export const nativeFile = {
  12  |   ...file,
  13  |   fileName: "Synthetic datasheet.txt",
  14  |   contentType: "text/plain",
  15  |   source,
  16  |   s3Key: "native-ticket-key",
  17  |   uploadedByUserId: "user-test",
  18  |   lifecycleStatus: "ready",
  19  |   scanStatus: "clean",
  20  |   extractionStatus: "extracted",
  21  |   usable: true,
  22  |   blockedReason: undefined,
  23  |   downloadUrl: "https://storage.example.test/old-download",
  24  |   previewUrl: null,
  25  | };
  26  | export const ticket = {
  27  |   url: "https://storage.example.test/upload",
  28  |   fields: { key: nativeFile.s3Key },
  29  |   s3Key: nativeFile.s3Key,
  30  | };
  31  | export const uploadReceipt = {
  32  |   ...nativeFile,
  33  |   fileName: "source.txt",
  34  |   byteSize: 5,
  35  |   lifecycleStatus: "quarantined",
  36  |   scanStatus: "pending",
  37  |   extractionStatus: "pending",
  38  |   usable: false,
  39  |   downloadUrl: null,
  40  |   previewUrl: null,
  41  | };
  42  | export async function installDocumentFixtures(page: Page) {
  43  |   const unexpected = await installFixtures(page);
  44  |   await page.route("**/core/engagement/attachments?**", (route) => {
  45  |     const requested = new URL(route.request().url()).searchParams.get(
  46  |       "clientId",
  47  |     );
  48  |     return json(route, requested === clientId ? [nativeFile] : []);
  49  |   });
  50  |   return unexpected;
  51  | }
  52  | export async function openDocuments(page: Page, waitForFile = true) {
> 53  |   await page.goto("/capability-documents.html");
      |              ^ Error: page.goto: Test ended.
  54  |   const editor = page.getByRole("dialog", {
  55  |     name: "Capability: Test sensor",
  56  |     exact: true,
  57  |   });
  58  |   await editor.getByRole("tab", { name: "Documents", exact: true }).click();
  59  |   if (waitForFile)
  60  |     await expect(
  61  |       editor.getByRole("button", { name: nativeFile.fileName, exact: true }),
  62  |     ).toBeVisible();
  63  |   return editor;
  64  | }
  65  | 
  66  | export async function observeDocumentNavigation(page: Page) {
  67  |   const destinations: string[] = [];
  68  |   await page.context().route("https://storage.example.test/**", (route) => {
  69  |     destinations.push(route.request().url());
  70  |     return route.fulfill({
  71  |       status: 200,
  72  |       contentType: "text/plain",
  73  |       headers: { "Content-Disposition": "attachment; filename=synthetic.txt" },
  74  |       body: "synthetic",
  75  |     });
  76  |   });
  77  |   return destinations;
  78  | }
  79  | export async function chooseUpload(page: Page) {
  80  |   await page
  81  |     .getByRole("button", { name: "Upload document", exact: true })
  82  |     .click();
  83  |   const dialog = page.getByRole("dialog", {
  84  |     name: "Upload files",
  85  |     exact: true,
  86  |   });
  87  |   await dialog.getByLabel("Select files", { exact: true }).setInputFiles({
  88  |     name: "source.txt",
  89  |     mimeType: "text/plain",
  90  |     buffer: Buffer.from("hello"),
  91  |   });
  92  |   await dialog
  93  |     .getByRole("button", { name: "Upload file", exact: true })
  94  |     .click();
  95  |   return dialog;
  96  | }
  97  | export function changeDocumentView(page: Page, change: string) {
  98  |   return page.evaluate(
  99  |     (value) => window.dispatchEvent(new Event(`file-documents-${value}`)),
  100 |     change,
  101 |   );
  102 | }
  103 | export async function settleDocumentRequests(page: Page) {
  104 |   await expect(
  105 |     page.getByLabel("Synthetic document requests pending"),
  106 |   ).toHaveText("0");
  107 |   await page.evaluate(
  108 |     () =>
  109 |       new Promise<void>((resolve) =>
  110 |         requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  111 |       ),
  112 |   );
  113 | }
  114 | 
```