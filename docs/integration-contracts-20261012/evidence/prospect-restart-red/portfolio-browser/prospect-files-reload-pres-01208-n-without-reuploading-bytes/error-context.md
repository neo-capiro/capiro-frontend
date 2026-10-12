# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: prospect-files.spec.ts >> reload preserves the original upload confirmation without reuploading bytes
- Location: tests/browser/prospect-files.spec.ts:202:1

# Error details

```
Error: expect(locator).toBeEnabled() failed

Locator: getByRole('region', { name: 'Prospect files', exact: true }).getByRole('button', { name: 'Recover original upload' })
Expected: enabled
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeEnabled" with timeout 5000ms
  - waiting for getByRole('region', { name: 'Prospect files', exact: true }).getByRole('button', { name: 'Recover original upload' })

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
      - /url: /portfolio?log=1
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
  - link "Settings":
    - /url: /settings
- main:
  - navigation "Breadcrumb":
    - link "← Prospects":
      - /url: /portfolio/prospects
    - text: / Test Prospect
  - text: TP
  - heading "Test Prospect" [level=1]
  - text: Prospect
  - 'button "Stage: Proposal"': Stage Proposal
  - button "Link existing client"
  - button "Edit details"
  - paragraph: Synthetic prospect for isolated validation.
  - link "https://prospect.test ↗":
    - /url: https://prospect.test/
  - paragraph: Focus Advocacy
  - separator
  - text: Owner Unassigned Added 10/1/2026 Virginia
  - heading "Pipeline stage" [level=2]
  - button "Change stage"
  - paragraph: Stage updates are currently unavailable. Your existing stage is preserved.
  - region "Prospect activity":
    - heading "Activity" [level=2]
    - button "Refresh activity"
    - group "Prospect activity type":
      - button "All" [pressed]
    - paragraph: No activity yet.
  - region "Federal strategy brief":
    - heading "Federal strategy brief" [level=2]
    - paragraph: A saved, versioned brief from the prospect’s authorized dossier evidence.
    - paragraph: No brief has been saved yet.
    - button "Generate from dossier"
    - text: Workspace filing and candidate objectives require separate supported workflows.
  - region "Prospect files":
    - heading "Files" [level=2]
    - paragraph: Files retain this prospect as their origin after conversion.
    - button "Refresh files"
    - list:
      - listitem:
        - strong: test.txt
        - text: Pending content checks · Uploader unavailable
        - button "Delete test.txt"
    - text: Preview and download links expire after five minutes. Refresh Files to request current links. Upload prospect file
    - button "Upload prospect file"
    - button "Upload file" [disabled]
    - button "Sharing unavailable" [disabled]
    - button "Sending unavailable" [disabled]
    - button "Text import unavailable" [disabled]
    - text: These files cannot be copied into client libraries, Outreach, Meri or generation workflows.
  - region "Prospect Workspace":
    - heading "Workspace documents" [level=2]
    - paragraph: Open this prospect’s manual drafts, saved versions and exports. Documents retain their prospect origin after conversion.
    - link "Open prospect Workspace":
      - /url: /modules/workspace?prospectId=70000000-0000-4000-8000-000000000001
    - text: Sharing, sending and generation are unavailable for prospect documents.
  - region "Proposal":
    - heading "Proposal" [level=2]
    - paragraph: Review available templates in Workspace. Creating and sending a proposal for this prospect is unavailable.
    - button "Browse templates"
    - text: Proposal documents and send history cannot be linked to this prospect yet.
  - heading "Next step" [level=2]
  - button "Edit"
  - paragraph: Review proposal
  - time: Due 11/5/2026, 2:00:00 PM
  - text: Owner Unassigned
  - region "Prospect contacts":
    - heading "Contacts" [level=2]
    - button "+ Add" [disabled]
    - status: Prospect contacts are unavailable for this account or service. No contact changes can be saved.
  - region "Prospect notes":
    - heading "Notes" [level=2]
    - button "+ Add note"
    - text: Shared with your firm.
    - paragraph: No notes yet.
  - button "Archive prospect"
```

# Test source

```ts
  146 | test("deletion requires confirmation and current list, with no uncertain automatic retry", async ({
  147 |   page,
  148 | }) => {
  149 |   const { writes } = await setup(page);
  150 |   await page.route(`**/engagement/attachments/${record.id}`, (route) =>
  151 |     route.abort("connectionreset"),
  152 |   );
  153 |   await page.goto(`/portfolio/prospects/${prospectId}`);
  154 |   const area = files(page);
  155 |   await area.getByRole("button", { name: `Delete ${record.fileName}` }).click();
  156 |   expect(writes).toEqual([]);
  157 |   await page
  158 |     .getByRole("dialog", { name: "Delete prospect file?" })
  159 |     .getByRole("button", { name: "Confirm delete" })
  160 |     .click();
  161 |   await expect(
  162 |     page.getByRole("dialog").getByRole("button", { name: "Confirm delete" }),
  163 |   ).toBeDisabled();
  164 |   expect(writes).toHaveLength(1);
  165 |   await page.keyboard.press("Escape");
  166 |   await expect(
  167 |     area.getByRole("button", { name: `Delete ${record.fileName}` }),
  168 |   ).toBeDisabled();
  169 |   await area.getByRole("button", { name: "Refresh files" }).click();
  170 |   await expect(
  171 |     area.getByRole("button", { name: `Delete ${record.fileName}` }),
  172 |   ).toBeEnabled();
  173 |   expect(writes).toHaveLength(1);
  174 | });
  175 | test("dismissed prospect retains historical files but cannot upload, including on mobile", async ({
  176 |   page,
  177 | }) => {
  178 |   await setup(page);
  179 |   await page.route(`**/business-development/prospects/${prospectId}`, (route) =>
  180 |     json(route, { ...prospect, status: "dismissed" }),
  181 |   );
  182 |   await page.setViewportSize({ width: 390, height: 844 });
  183 |   await page.goto(`/portfolio/prospects/${prospectId}`);
  184 |   const area = files(page);
  185 |   await expect(area.getByText(record.fileName, { exact: true })).toBeVisible();
  186 |   await expect(area.getByLabel("Upload prospect file")).toHaveCount(0);
  187 |   await expect(
  188 |     area.getByRole("button", { name: "Upload file", exact: true }),
  189 |   ).toBeDisabled();
  190 |   expect(
  191 |     await page.evaluate(
  192 |       () => document.documentElement.scrollWidth <= innerWidth,
  193 |     ),
  194 |   ).toBe(true);
  195 |   await area.scrollIntoViewIfNeeded();
  196 |   await page.screenshot({
  197 |     path: "work/prospect-files-mobile.png",
  198 |     fullPage: false,
  199 |   });
  200 | });
  201 | 
  202 | test("reload preserves the original upload confirmation without reuploading bytes", async ({
  203 |   page,
  204 | }) => {
  205 |   const { writes } = await setup(page);
  206 |   let storagePosts = 0,
  207 |     confirms = 0;
  208 |   await page.route("**/engagement/attachments/upload-url", (route) => {
  209 |     const body = route.request().postDataJSON();
  210 |     return json(route, {
  211 |       url: "https://storage.example.test/upload",
  212 |       s3Key: record.s3Key,
  213 |       uploadIntentId: otherId,
  214 |       requestId: body.requestId,
  215 |       expiresAt: "2099-10-12T12:00:00Z",
  216 |       fields: {
  217 |         key: record.s3Key,
  218 |         "Content-Type": "text/plain",
  219 |         "x-amz-checksum-algorithm": "SHA256",
  220 |         "x-amz-checksum-sha256": Buffer.from(checksum, "hex").toString(
  221 |           "base64",
  222 |         ),
  223 |       },
  224 |     });
  225 |   });
  226 |   await page.route("https://storage.example.test/upload", (route) => {
  227 |     storagePosts++;
  228 |     return route.fulfill({ status: 204 });
  229 |   });
  230 |   await page.route("**/engagement/attachments/confirm", (route) =>
  231 |     ++confirms === 1 ? route.abort("connectionreset") : json(route, record),
  232 |   );
  233 |   await page.goto(`/portfolio/prospects/${prospectId}`);
  234 |   const area = files(page);
  235 |   await expect(area.getByText(record.fileName, { exact: true })).toBeVisible();
  236 |   await area.getByLabel("Upload prospect file").setInputFiles({
  237 |     name: "test.txt",
  238 |     mimeType: "text/plain",
  239 |     buffer: Buffer.from("hello"),
  240 |   });
  241 |   await area.getByRole("button", { name: "Upload file", exact: true }).click();
  242 |   await expect(
  243 |     area.getByRole("button", { name: "Recover original upload" }),
  244 |   ).toBeEnabled();
  245 |   await page.reload();
> 246 |   await expect(area.getByRole("button", { name: "Recover original upload" })).toBeEnabled();
      |                                                                               ^ Error: expect(locator).toBeEnabled() failed
  247 |   await area.getByRole("button", { name: "Recover original upload" }).click();
  248 |   await expect(area.getByText(/test.txt uploaded/)).toBeVisible();
  249 |   expect(storagePosts).toBe(1);
  250 |   expect(confirms).toBe(2);
  251 |   expect(writes).toHaveLength(3);
  252 |   expect(writes[0]!.body).toEqual({
  253 |     prospectId,
  254 |     fileName: "test.txt",
  255 |     contentType: "text/plain",
  256 |     checksumSha256: checksum,
  257 |     requestId: expect.any(String),
  258 |     contentLength: 5,
  259 |   });
  260 |   expect(writes[1]!.body).toEqual(writes[2]!.body);
  261 | });
  262 | 
```