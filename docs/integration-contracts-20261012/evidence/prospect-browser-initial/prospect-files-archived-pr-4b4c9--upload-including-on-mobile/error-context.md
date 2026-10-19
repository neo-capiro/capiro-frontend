# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: prospect-files.spec.ts >> archived prospect retains historical files but cannot upload, including on mobile
- Location: tests/browser/prospect-files.spec.ts:177:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('region', { name: 'Prospect files', exact: true }).getByText('test.txt', { exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('region', { name: 'Prospect files', exact: true }).getByText('test.txt', { exact: true })

```

```yaml
- link "Skip to content":
  - /url: "#main"
- banner:
  - button "Toggle navigation"
  - link "Capiro Home":
    - /url: /
    - img "Capiro"
  - button "Switch workspace"
  - navigation "Global actions":
    - link "Quick log":
      - /url: /portfolio?log=1
    - link "Master calendar":
      - /url: /calendar
    - link "Search Portfolio":
      - /url: /portfolio?search=1
    - button "Updates unavailable" [disabled]
    - button "Test account": T
- main:
  - navigation "Breadcrumb":
    - link "← Prospects":
      - /url: /portfolio/prospects
    - text: / Company details
  - alert:
    - paragraph: The service returned an unexpected response. Please retry or contact support.
    - button "Retry"
```

# Test source

```ts
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
  97  |   await area
  98  |     .getByLabel("Upload prospect file")
  99  |     .setInputFiles({
  100 |       name: "test.txt",
  101 |       mimeType: "text/plain",
  102 |       buffer: Buffer.from("hello"),
  103 |     });
  104 |   await area.getByRole("button", { name: "Upload file", exact: true }).click();
  105 |   await expect(
  106 |     area.getByRole("button", { name: "Recover original upload" }),
  107 |   ).toBeEnabled();
  108 |   await area.getByRole("button", { name: "Recover original upload" }).click();
  109 |   await expect(area.getByText(/test.txt uploaded/)).toBeVisible();
  110 |   expect(storagePosts).toBe(1);
  111 |   expect(confirms).toBe(2);
  112 |   expect(writes).toHaveLength(3);
  113 |   expect(writes[0]!.body).toEqual({
  114 |     prospectId,
  115 |     fileName: "test.txt",
  116 |     contentType: "text/plain",
  117 |     checksumSha256: checksum,
  118 |     requestId: expect.any(String),
  119 |     contentLength: 5,
  120 |   });
  121 |   expect(writes[1]!.body).toEqual(writes[2]!.body);
  122 | });
  123 | test("wrong lineage suppresses file links and upload without broadening the request", async ({
  124 |   page,
  125 | }) => {
  126 |   const { writes } = await setup(page);
  127 |   await page.route(
  128 |     "**/api/backend/core/engagement/attachments?prospectId=*",
  129 |     (route) =>
  130 |       json(route, [
  131 |         {
  132 |           ...record,
  133 |           prospectId: otherId,
  134 |           usable: true,
  135 |           downloadUrl: "https://example.test/file",
  136 |         },
  137 |       ]),
  138 |   );
  139 |   await page.goto(`/portfolio/prospects/${prospectId}`);
  140 |   const area = files(page);
  141 |   await expect(area.getByRole("alert")).toBeVisible();
  142 |   await expect(area.getByRole("link")).toHaveCount(0);
  143 |   await expect(
  144 |     area.getByRole("button", { name: "Upload file", exact: true }),
  145 |   ).toBeDisabled();
  146 |   expect(writes).toEqual([]);
  147 | });
  148 | test("deletion requires confirmation and current list, with no uncertain automatic retry", async ({
  149 |   page,
  150 | }) => {
  151 |   const { writes } = await setup(page);
  152 |   await page.route(`**/engagement/attachments/${record.id}`, (route) =>
  153 |     route.abort("connectionreset"),
  154 |   );
  155 |   await page.goto(`/portfolio/prospects/${prospectId}`);
  156 |   const area = files(page);
  157 |   await area.getByRole("button", { name: `Delete ${record.fileName}` }).click();
  158 |   expect(writes).toEqual([]);
  159 |   await page
  160 |     .getByRole("dialog", { name: "Delete prospect file?" })
  161 |     .getByRole("button", { name: "Confirm delete" })
  162 |     .click();
  163 |   await expect(
  164 |     page.getByRole("dialog").getByRole("button", { name: "Confirm delete" }),
  165 |   ).toBeDisabled();
  166 |   expect(writes).toHaveLength(1);
  167 |   await page.keyboard.press("Escape");
  168 |   await expect(
  169 |     area.getByRole("button", { name: `Delete ${record.fileName}` }),
  170 |   ).toBeDisabled();
  171 |   await area.getByRole("button", { name: "Refresh files" }).click();
  172 |   await expect(
  173 |     area.getByRole("button", { name: `Delete ${record.fileName}` }),
  174 |   ).toBeEnabled();
  175 |   expect(writes).toHaveLength(1);
  176 | });
  177 | test("archived prospect retains historical files but cannot upload, including on mobile", async ({
  178 |   page,
  179 | }) => {
  180 |   await setup(page);
  181 |   await page.route(`**/business-development/prospects/${prospectId}`, (route) =>
  182 |     json(route, { ...prospect, status: "archived" }),
  183 |   );
  184 |   await page.setViewportSize({ width: 390, height: 844 });
  185 |   await page.goto(`/portfolio/prospects/${prospectId}`);
  186 |   const area = files(page);
> 187 |   await expect(area.getByText(record.fileName, { exact: true })).toBeVisible();
      |                                                                  ^ Error: expect(locator).toBeVisible() failed
  188 |   await expect(area.getByLabel("Upload prospect file")).toHaveCount(0);
  189 |   await expect(
  190 |     area.getByRole("button", { name: "Upload file", exact: true }),
  191 |   ).toBeDisabled();
  192 |   expect(
  193 |     await page.evaluate(
  194 |       () => document.documentElement.scrollWidth <= innerWidth,
  195 |     ),
  196 |   ).toBe(true);
  197 |   await area.scrollIntoViewIfNeeded();
  198 |   await page.screenshot({
  199 |     path: "work/prospect-files-mobile.png",
  200 |     fullPage: false,
  201 |   });
  202 | });
  203 | 
```