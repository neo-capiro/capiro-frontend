# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: prospect-files.spec.ts >> wrong lineage suppresses file links and upload without broadening the request
- Location: tests/browser/prospect-files.spec.ts:121:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('region', { name: 'Prospect files', exact: true }).getByRole('alert')
Expected: visible
Error: strict mode violation: getByRole('region', { name: 'Prospect files', exact: true }).getByRole('alert') resolved to 2 elements:
    1) <div role="alert" class="status error">…</div> aka getByRole('alert').first()
    2) <div role="alert">…</div> aka getByRole('alert').nth(1)

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('region', { name: 'Prospect files', exact: true }).getByRole('alert')

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - link "Skip to content" [ref=e3] [cursor=pointer]:
    - /url: "#main"
  - banner [ref=e4]:
    - link "Capiro Home" [ref=e5] [cursor=pointer]:
      - /url: /
      - img "Capiro" [ref=e6]
    - navigation "Workspace" [ref=e7]:
      - link "Meri" [ref=e8] [cursor=pointer]:
        - /url: /meri
      - link "Portfolio" [ref=e9] [cursor=pointer]:
        - /url: /
      - link "Modules" [ref=e10] [cursor=pointer]:
        - /url: /modules
    - navigation "Global actions" [ref=e11]:
      - link "Quick log" [ref=e12] [cursor=pointer]:
        - /url: /portfolio?log=1
      - link "Master calendar" [ref=e13] [cursor=pointer]:
        - /url: /calendar
      - link "Search Portfolio" [ref=e14] [cursor=pointer]:
        - /url: /portfolio?search=1
      - button "Updates unavailable" [disabled] [ref=e15]
      - button "Test account" [ref=e17] [cursor=pointer]: T
  - generic [ref=e18]:
    - complementary "Portfolio navigation" [ref=e19]:
      - paragraph [ref=e20]: Portfolio
      - navigation "Portfolio" [ref=e21]:
        - link "Portfolio Overview" [ref=e22] [cursor=pointer]:
          - /url: /portfolio
          - generic [ref=e23]: Overview
        - link "Portfolio Clients" [ref=e24] [cursor=pointer]:
          - /url: /portfolio?type=CLIENT
          - generic [ref=e25]: Clients
        - link "Portfolio Prospects" [ref=e26] [cursor=pointer]:
          - /url: /portfolio/prospects
          - generic [ref=e27]: Prospects
      - link "Settings" [ref=e29] [cursor=pointer]:
        - /url: /settings
    - main [ref=e30]:
      - generic [ref=e31]:
        - navigation "Breadcrumb" [ref=e32]:
          - link "← Prospects" [ref=e33] [cursor=pointer]:
            - /url: /portfolio/prospects
          - generic [ref=e34]: /
          - generic [ref=e35]: Test Prospect
        - generic [ref=e36]:
          - generic [ref=e37]:
            - generic [ref=e38]: TP
            - heading "Test Prospect" [level=1] [ref=e39]
            - generic [ref=e40]: Prospect
          - generic [ref=e41]:
            - 'button "Stage: Proposal" [ref=e42] [cursor=pointer]':
              - generic [ref=e43]: Stage
              - text: Proposal
              - generic [ref=e44]: ⌄
            - button "Link existing client" [ref=e45] [cursor=pointer]
            - button "Edit details" [ref=e46] [cursor=pointer]
        - generic [ref=e47]:
          - generic [ref=e48]:
            - generic [ref=e49]:
              - paragraph [ref=e50]: Synthetic prospect for isolated validation.
              - link "https://prospect.test ↗" [ref=e51] [cursor=pointer]:
                - /url: https://prospect.test/
              - paragraph [ref=e52]: Focus Advocacy
              - separator [ref=e53]
              - generic [ref=e54]:
                - generic [ref=e55]: Owner
                - generic [ref=e56]: Unassigned
                - generic [ref=e57]: Added 10/1/2026
                - generic [ref=e58]: Virginia
            - generic [ref=e59]:
              - generic [ref=e60]:
                - heading "Pipeline stage" [level=2] [ref=e61]
                - button "Change stage" [ref=e62] [cursor=pointer]
              - paragraph [ref=e63]: Stage updates are currently unavailable. Your existing stage is preserved.
            - region "Prospect activity" [ref=e64]:
              - generic [ref=e65]:
                - heading "Activity" [level=2] [ref=e66]
                - button "Refresh activity" [ref=e67] [cursor=pointer]
              - group "Prospect activity type" [ref=e68]:
                - button "All" [pressed] [ref=e69] [cursor=pointer]
              - paragraph [ref=e70]: No activity yet.
            - region "Federal strategy brief" [ref=e71]:
              - heading "Federal strategy brief" [level=2] [ref=e72]
              - paragraph [ref=e73]: A saved, versioned brief from the prospect’s authorized dossier evidence.
              - paragraph [ref=e74]: No brief has been saved yet.
              - button "Generate from dossier" [ref=e75] [cursor=pointer]
              - generic [ref=e76]: Workspace filing and candidate objectives require separate supported workflows.
            - region "Prospect files" [ref=e77]:
              - heading "Files" [level=2] [ref=e78]
              - paragraph [ref=e79]: Files retain this prospect as their origin after conversion.
              - alert [ref=e80]:
                - paragraph [ref=e81]: The service returned an unexpected response. Please retry or contact support.
                - button "Retry" [ref=e82] [cursor=pointer]
              - button "Refresh files" [ref=e83] [cursor=pointer]
              - generic [ref=e84]: Preview and download links expire after five minutes. Refresh Files to request current links.
              - generic [ref=e85]:
                - text: Upload prospect file
                - button "Upload prospect file" [disabled] [ref=e86]
              - button "Upload file" [disabled] [ref=e87]
              - alert [ref=e88]:
                - paragraph [ref=e89]: The service returned an unexpected response. Please retry or contact support.
                - button "Retry saved upload recovery" [ref=e90] [cursor=pointer]
              - generic [ref=e91]:
                - button "Sharing unavailable" [disabled] [ref=e92]
                - button "Sending unavailable" [disabled] [ref=e93]
                - button "Text import unavailable" [disabled] [ref=e94]
              - generic [ref=e95]: These files cannot be copied into client libraries, Outreach, Meri or generation workflows.
            - region "Prospect Workspace" [ref=e96]:
              - heading "Workspace documents" [level=2] [ref=e97]
              - paragraph [ref=e98]: Open this prospect’s manual drafts, saved versions and exports. Documents retain their prospect origin after conversion.
              - link "Open prospect Workspace" [ref=e99] [cursor=pointer]:
                - /url: /modules/workspace?prospectId=70000000-0000-4000-8000-000000000001
              - generic [ref=e100]: Sharing, sending and generation are unavailable for prospect documents.
            - region "Proposal" [ref=e101]:
              - heading "Proposal" [level=2] [ref=e102]
              - paragraph [ref=e103]: Review available templates in Workspace. Creating and sending a proposal for this prospect is unavailable.
              - button "Browse templates" [ref=e105] [cursor=pointer]
              - generic [ref=e106]: Proposal documents and send history cannot be linked to this prospect yet.
          - generic [ref=e107]:
            - generic [ref=e108]:
              - generic [ref=e109]:
                - heading "Next step" [level=2] [ref=e110]
                - button "Edit" [ref=e111] [cursor=pointer]
              - paragraph [ref=e112]: Review proposal
              - time [ref=e113]:
                - generic [ref=e114]: Due 11/5/2026, 2:00:00 PM
              - generic [ref=e115]: Owner Unassigned
            - region "Prospect contacts" [ref=e116]:
              - generic [ref=e117]:
                - heading "Contacts" [level=2] [ref=e118]
                - button "+ Add" [disabled] [ref=e119]
              - status [ref=e121]: Prospect contacts are unavailable for this account or service. No contact changes can be saved.
            - region "Prospect notes" [ref=e122]:
              - generic [ref=e123]:
                - heading "Notes" [level=2] [ref=e124]
                - button "+ Add note" [ref=e125] [cursor=pointer]
              - generic [ref=e126]: Shared with your firm.
              - paragraph [ref=e127]: No notes yet.
            - button "Archive prospect" [ref=e128] [cursor=pointer]
```

# Test source

```ts
  39  |   page.getByRole("region", { name: "Prospect files", exact: true });
  40  | test("current prospect files retain readiness and do not expose unsupported actions", async ({
  41  |   page,
  42  | }) => {
  43  |   const { writes, unexpected } = await setup(page);
  44  |   await page.goto(`/portfolio/prospects/${prospectId}`);
  45  |   const area = files(page);
  46  |   await expect(area.getByText(record.fileName, { exact: true })).toBeVisible();
  47  |   await expect(area.getByText(/Pending content checks/)).toBeVisible();
  48  |   await expect(
  49  |     area.getByRole("link", { name: /Preview|Download/ }),
  50  |   ).toHaveCount(0);
  51  |   for (const name of [
  52  |     "Sharing unavailable",
  53  |     "Sending unavailable",
  54  |     "Text import unavailable",
  55  |   ])
  56  |     await expect(area.getByRole("button", { name })).toBeDisabled();
  57  |   await expect(
  58  |     page.getByRole("link", { name: "Open prospect Workspace" }),
  59  |   ).toHaveAttribute("href", `/modules/workspace?prospectId=${prospectId}`);
  60  |   expect(writes).toEqual([]);
  61  |   expect(unexpected).toEqual([]);
  62  | });
  63  | test("upload loss retains one exact intent and confirms without reuploading bytes", async ({
  64  |   page,
  65  | }) => {
  66  |   const { writes } = await setup(page);
  67  |   let storagePosts = 0,
  68  |     confirms = 0;
  69  |   await page.route("**/engagement/attachments/upload-url", (route) => {
  70  |     const body = route.request().postDataJSON();
  71  |     return json(route, {
  72  |       url: "https://storage.example.test/upload",
  73  |       s3Key: record.s3Key,
  74  |       uploadIntentId: otherId,
  75  |       requestId: body.requestId,
  76  |       expiresAt: "2099-10-12T12:00:00Z",
  77  |       fields: {
  78  |         key: record.s3Key,
  79  |         "Content-Type": "text/plain",
  80  |         "x-amz-checksum-algorithm": "SHA256",
  81  |         "x-amz-checksum-sha256": Buffer.from(checksum, "hex").toString(
  82  |           "base64",
  83  |         ),
  84  |       },
  85  |     });
  86  |   });
  87  |   await page.route("https://storage.example.test/upload", (route) => {
  88  |     storagePosts++;
  89  |     return route.fulfill({ status: 204 });
  90  |   });
  91  |   await page.route("**/engagement/attachments/confirm", (route) =>
  92  |     ++confirms === 1 ? route.abort("connectionreset") : json(route, record),
  93  |   );
  94  |   await page.goto(`/portfolio/prospects/${prospectId}`);
  95  |   const area = files(page);
  96  |   await expect(area.getByText(record.fileName, { exact: true })).toBeVisible();
  97  |   await area.getByLabel("Upload prospect file").setInputFiles({
  98  |     name: "test.txt",
  99  |     mimeType: "text/plain",
  100 |     buffer: Buffer.from("hello"),
  101 |   });
  102 |   await area.getByRole("button", { name: "Upload file", exact: true }).click();
  103 |   await expect(
  104 |     area.getByRole("button", { name: "Recover original upload" }),
  105 |   ).toBeEnabled();
  106 |   await area.getByRole("button", { name: "Recover original upload" }).click();
  107 |   await expect(area.getByText(/test.txt uploaded/)).toBeVisible();
  108 |   expect(storagePosts).toBe(1);
  109 |   expect(confirms).toBe(2);
  110 |   expect(writes).toHaveLength(3);
  111 |   expect(writes[0]!.body).toEqual({
  112 |     prospectId,
  113 |     fileName: "test.txt",
  114 |     contentType: "text/plain",
  115 |     checksumSha256: checksum,
  116 |     requestId: expect.any(String),
  117 |     contentLength: 5,
  118 |   });
  119 |   expect(writes[1]!.body).toEqual(writes[2]!.body);
  120 | });
  121 | test("wrong lineage suppresses file links and upload without broadening the request", async ({
  122 |   page,
  123 | }) => {
  124 |   const { writes } = await setup(page);
  125 |   await page.route(
  126 |     "**/api/backend/core/engagement/attachments?prospectId=*",
  127 |     (route) =>
  128 |       json(route, [
  129 |         {
  130 |           ...record,
  131 |           prospectId: otherId,
  132 |           usable: true,
  133 |           downloadUrl: "https://example.test/file",
  134 |         },
  135 |       ]),
  136 |   );
  137 |   await page.goto(`/portfolio/prospects/${prospectId}`);
  138 |   const area = files(page);
> 139 |   await expect(area.getByRole("alert")).toBeVisible();
      |                                         ^ Error: expect(locator).toBeVisible() failed
  140 |   await expect(area.getByRole("link")).toHaveCount(0);
  141 |   await expect(
  142 |     area.getByRole("button", { name: "Upload file", exact: true }),
  143 |   ).toBeDisabled();
  144 |   expect(writes).toEqual([]);
  145 | });
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
```