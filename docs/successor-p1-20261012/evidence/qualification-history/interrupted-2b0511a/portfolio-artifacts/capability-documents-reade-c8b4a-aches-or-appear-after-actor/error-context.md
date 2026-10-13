# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: capability-documents-readers.spec.ts >> a held extracted-text receipt cannot invalidate caches or appear after actor
- Location: tests/browser/capability-documents-readers.spec.ts:104:3

# Error details

```
Error: locator.click: Test ended.
Call log:
  - waiting for getByRole('dialog', { name: 'Capability: Test sensor', exact: true }).getByRole('button', { name: 'Synthetic datasheet.txt', exact: true })
    - locator resolved to <button type="button" class="_name_a6ejj_50">Synthetic datasheet.txt</button>
  - attempting click action
    - waiting for element to be visible, enabled and stable

```

# Test source

```ts
  11  | 
  12  | for (const change of ["actor", "tenant", "role"]) {
  13  |   test(`a replacement ${change} hides old filenames, preview and extracted text before its fresh authorized list`, async ({
  14  |     page,
  15  |   }) => {
  16  |     const unexpected = await installDocumentFixtures(page);
  17  |     await page.route(
  18  |       `**/core/engagement/attachments/${nativeFile.id}/extract-text`,
  19  |       (route) =>
  20  |         json(route, {
  21  |           attachmentId: nativeFile.id,
  22  |           text: "Original reader extracted text",
  23  |         }),
  24  |     );
  25  |     const editor = await openDocuments(page);
  26  |     await editor
  27  |       .getByRole("button", { name: nativeFile.fileName, exact: true })
  28  |       .click();
  29  |     const preview = page.getByRole("dialog", {
  30  |       name: nativeFile.fileName,
  31  |       exact: true,
  32  |     });
  33  |     await preview
  34  |       .getByRole("button", { name: "Read extracted text", exact: true })
  35  |       .click();
  36  |     await expect(
  37  |       preview.getByText("Original reader extracted text", { exact: true }),
  38  |     ).toBeVisible();
  39  |     const held = await holdResponse(
  40  |       page,
  41  |       "**/core/engagement/attachments?**",
  42  |       "GET",
  43  |       [{ ...nativeFile, fileName: "Replacement reader document.txt" }],
  44  |     );
  45  |     try {
  46  |       await changeDocumentView(page, change);
  47  |       await expect(preview).toHaveCount(0);
  48  |       await expect(
  49  |         page.getByText("Original reader extracted text", { exact: true }),
  50  |       ).toHaveCount(0);
  51  |       await expect(
  52  |         editor.getByRole("button", { name: nativeFile.fileName, exact: true }),
  53  |       ).toHaveCount(0);
  54  |       await expect(
  55  |         editor.getByRole("status", { name: "Loading documents", exact: true }),
  56  |       ).toBeVisible();
  57  |       await held.started;
  58  |     } finally {
  59  |       held.release();
  60  |     }
  61  |     await held.settled;
  62  |     await expect(
  63  |       editor.getByRole("button", {
  64  |         name: "Replacement reader document.txt",
  65  |         exact: true,
  66  |       }),
  67  |     ).toBeVisible();
  68  |     await expect(
  69  |       page.getByText("Original reader extracted text", { exact: true }),
  70  |     ).toHaveCount(0);
  71  |     expect(unexpected).toEqual([]);
  72  |   });
  73  | }
  74  | 
  75  | test("revoked identity immediately removes cached document names and preview text without another file request", async ({
  76  |   page,
  77  | }) => {
  78  |   const unexpected = await installDocumentFixtures(page);
  79  |   let reads = 0;
  80  |   await page.route("**/core/engagement/attachments?**", (route) => {
  81  |     reads += 1;
  82  |     return json(route, [nativeFile]);
  83  |   });
  84  |   const editor = await openDocuments(page);
  85  |   await editor
  86  |     .getByRole("button", { name: nativeFile.fileName, exact: true })
  87  |     .click();
  88  |   await changeDocumentView(page, "invalidate");
  89  |   await expect(
  90  |     page.getByRole("dialog", { name: nativeFile.fileName, exact: true }),
  91  |   ).toHaveCount(0);
  92  |   await expect(
  93  |     editor.getByRole("button", { name: nativeFile.fileName, exact: true }),
  94  |   ).toHaveCount(0);
  95  |   await expect(
  96  |     editor.getByRole("button", { name: "Upload document", exact: true }),
  97  |   ).toBeDisabled();
  98  |   await expect(editor.getByRole("alert")).toBeVisible();
  99  |   expect(reads).toBe(1);
  100 |   expect(unexpected).toEqual([]);
  101 | });
  102 | 
  103 | for (const change of ["actor", "source", "unmount"]) {
  104 |   test(`a held extracted-text receipt cannot invalidate caches or appear after ${change}`, async ({
  105 |     page,
  106 |   }) => {
  107 |     const unexpected = await installDocumentFixtures(page);
  108 |     const editor = await openDocuments(page);
  109 |     await editor
  110 |       .getByRole("button", { name: nativeFile.fileName, exact: true })
> 111 |       .click();
      |        ^ Error: locator.click: Test ended.
  112 |     const preview = page.getByRole("dialog", {
  113 |       name: nativeFile.fileName,
  114 |       exact: true,
  115 |     });
  116 |     const held = await holdResponse(
  117 |       page,
  118 |       `**/core/engagement/attachments/${nativeFile.id}/extract-text`,
  119 |       "POST",
  120 |       { attachmentId: nativeFile.id, text: "Obsolete extracted receipt" },
  121 |     );
  122 |     await preview
  123 |       .getByRole("button", { name: "Read extracted text", exact: true })
  124 |       .click();
  125 |     await held.started;
  126 |     await changeDocumentView(page, change);
  127 |     await expect(preview).toHaveCount(0);
  128 |     const before = await page
  129 |       .getByLabel("Synthetic original document cache")
  130 |       .textContent();
  131 |     held.release();
  132 |     await held.settled;
  133 |     await settleDocumentRequests(page);
  134 |     // Reader replacement may finish its own GET, but no cached query is invalidated by the obsolete POST.
  135 |     const cached = JSON.parse(
  136 |       (await page
  137 |         .getByLabel("Synthetic original document cache")
  138 |         .textContent())!,
  139 |     );
  140 |     expect(
  141 |       cached.every((query: { isInvalidated: boolean }) => !query.isInvalidated),
  142 |     ).toBe(true);
  143 |     if (change === "unmount" || change === "source")
  144 |       expect(
  145 |         await page
  146 |           .getByLabel("Synthetic original document cache")
  147 |           .textContent(),
  148 |       ).toBe(before);
  149 |     await expect(
  150 |       page.getByText("Obsolete extracted receipt", { exact: true }),
  151 |     ).toHaveCount(0);
  152 |     expect(unexpected).toEqual([]);
  153 |   });
  154 | }
  155 | 
  156 | test("a wrong extraction identity stays unconfirmed and never triggers a list refresh or automatic retry", async ({
  157 |   page,
  158 | }) => {
  159 |   const unexpected = await installDocumentFixtures(page);
  160 |   let reads = 0,
  161 |     extracts = 0;
  162 |   await page.route("**/core/engagement/attachments?**", (route) => {
  163 |     reads += 1;
  164 |     return json(route, [nativeFile]);
  165 |   });
  166 |   await page.route(
  167 |     `**/core/engagement/attachments/${nativeFile.id}/extract-text`,
  168 |     (route) => {
  169 |       extracts += 1;
  170 |       return json(route, {
  171 |         attachmentId: "60000000-0000-4000-8000-000000000009",
  172 |         text: "Wrong file text",
  173 |       });
  174 |     },
  175 |   );
  176 |   const editor = await openDocuments(page);
  177 |   await editor
  178 |     .getByRole("button", { name: nativeFile.fileName, exact: true })
  179 |     .click();
  180 |   const preview = page.getByRole("dialog", {
  181 |     name: nativeFile.fileName,
  182 |     exact: true,
  183 |   });
  184 |   await preview
  185 |     .getByRole("button", { name: "Read extracted text", exact: true })
  186 |     .click();
  187 |   await expect(preview.getByRole("alert")).toContainText(
  188 |     "service may have completed",
  189 |   );
  190 |   await expect(
  191 |     preview.getByRole("button", { name: "Read extracted text", exact: true }),
  192 |   ).toBeDisabled();
  193 |   await expect(
  194 |     preview.getByText("Wrong file text", { exact: true }),
  195 |   ).toHaveCount(0);
  196 |   expect({ reads, extracts }).toEqual({ reads: 1, extracts: 1 });
  197 |   expect(unexpected).toEqual([]);
  198 | });
  199 | 
  200 | test("mounting Documents with invalidated identity waits for a fresh session without render-phase updates", async ({
  201 |   page,
  202 | }) => {
  203 |   const unexpected = await installDocumentFixtures(page);
  204 |   const renderErrors: string[] = [];
  205 |   page.on("console", (message) => {
  206 |     if (
  207 |       message.type() === "error" &&
  208 |       message.text().includes("Cannot update a component")
  209 |     )
  210 |       renderErrors.push(message.text());
  211 |   });
```