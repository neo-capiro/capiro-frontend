# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: capability-documents-visual.spec.ts >> capability document rows and authored status variants at phone-dark
- Location: tests/browser/capability-documents-visual.spec.ts:54:3

# Error details

```
Error: expect(locator).toBeFocused() failed

Locator: getByRole('dialog', { name: 'Capability: Test sensor', exact: true }).getByRole('region', { name: 'Documents', exact: true }).getByRole('button', { name: 'Synthetic datasheet.txt', exact: true })
Expected: focused
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeFocused" with timeout 5000ms
  - waiting for getByRole('dialog', { name: 'Capability: Test sensor', exact: true }).getByRole('region', { name: 'Documents', exact: true }).getByRole('button', { name: 'Synthetic datasheet.txt', exact: true })

```

```yaml
- paragraph: Isolated synthetic capability documents
- paragraph: Document view unmounted
```

# Test source

```ts
  63  |     const longName =
  64  |       "Synthetic-ultra-long-capability-datasheet-without-breakable-spaces-012345678901234567890123456789.txt";
  65  |     await page.route("**/core/engagement/attachments?**", (route) =>
  66  |       phase === "error"
  67  |         ? json(route, { message: "Synthetic service unavailable" }, 500)
  68  |         : json(
  69  |             route,
  70  |             phase === "empty"
  71  |               ? []
  72  |               : [
  73  |                   nativeFile,
  74  |                   {
  75  |                     ...nativeFile,
  76  |                     id: "60000000-0000-4000-8000-000000000002",
  77  |                     fileName: longName,
  78  |                   },
  79  |                   {
  80  |                     ...nativeFile,
  81  |                     id: "60000000-0000-4000-8000-000000000003",
  82  |                     fileName: "Awaiting verification.pdf",
  83  |                     usable: false,
  84  |                     lifecycleStatus: "quarantined",
  85  |                     scanStatus: "pending",
  86  |                     blockedReason: "scan_pending",
  87  |                     scanDisclosure: "Awaiting malware scan",
  88  |                     downloadUrl: null,
  89  |                   },
  90  |                 ],
  91  |           ),
  92  |     );
  93  |     const editor = await openDocuments(page);
  94  |     const documents = editor.getByRole("region", {
  95  |       name: "Documents",
  96  |       exact: true,
  97  |     });
  98  |     await expect(documents.getByRole("listitem")).toHaveCount(3);
  99  |     await expect(
  100 |       documents.getByRole("button", { name: longName, exact: true }),
  101 |     ).toBeVisible();
  102 |     await expect(
  103 |       documents.getByRole("link", {
  104 |         name: "Download Awaiting verification.pdf",
  105 |         exact: true,
  106 |       }),
  107 |     ).toBeDisabled();
  108 |     await expect(
  109 |       documents.getByText("Awaiting malware scan", { exact: true }),
  110 |     ).toBeVisible();
  111 |     const upload = documents.getByRole("button", {
  112 |       name: "Upload document",
  113 |       exact: true,
  114 |     });
  115 |     expect((await upload.boundingBox())!.height).toBe(30);
  116 |     const rowStyle = await documents
  117 |       .getByRole("listitem")
  118 |       .first()
  119 |       .locator(":scope > div")
  120 |       .evaluate((element) => {
  121 |         const style = getComputedStyle(element);
  122 |         return {
  123 |           top: style.paddingTop,
  124 |           side: style.paddingLeft,
  125 |           gap: style.gap,
  126 |           radius: style.borderRadius,
  127 |           border: style.borderTopWidth,
  128 |         };
  129 |       });
  130 |     expect(rowStyle).toEqual({
  131 |       top: "10px",
  132 |       side: "12px",
  133 |       gap: "10px",
  134 |       radius: "8px",
  135 |       border: "1px",
  136 |     });
  137 |     expect(
  138 |       await documents
  139 |         .getByRole("button", { name: nativeFile.fileName, exact: true })
  140 |         .evaluate((element) => getComputedStyle(element).fontSize),
  141 |     ).toBe("13px");
  142 |     const bounds = await editor.boundingBox();
  143 |     expect(bounds!.width).toBe(screen.width < 680 ? screen.width - 32 : 720);
  144 |     await noOverflow(page, editor);
  145 |     await page.screenshot({
  146 |       path: info.outputPath(`documents-ready-${screen.name}.png`),
  147 |       fullPage: true,
  148 |     });
  149 | 
  150 |     const name = documents.getByRole("button", {
  151 |       name: nativeFile.fileName,
  152 |       exact: true,
  153 |     });
  154 |     await name.focus();
  155 |     await name.press("Enter");
  156 |     const preview = page.getByRole("dialog", {
  157 |       name: nativeFile.fileName,
  158 |       exact: true,
  159 |     });
  160 |     await expect(preview).toBeVisible();
  161 |     await page.keyboard.press("Escape");
  162 |     await expect(preview).toHaveCount(0);
> 163 |     await expect(name).toBeFocused();
      |                        ^ Error: expect(locator).toBeFocused() failed
  164 | 
  165 |     phase = "error";
  166 |     await changeDocumentView(page, "files");
  167 |     await expect(documents.getByRole("alert")).toContainText(
  168 |       "Documents could not be loaded.",
  169 |     );
  170 |     await expect(documents.getByRole("listitem")).toHaveCount(0);
  171 |     await expect(upload).toBeDisabled();
  172 |     await noOverflow(page, editor);
  173 |     await page.screenshot({
  174 |       path: info.outputPath(`documents-error-${screen.name}.png`),
  175 |       fullPage: true,
  176 |     });
  177 |     phase = "empty";
  178 |     const retry = documents.getByRole("button", { name: "Retry", exact: true });
  179 |     await retry.focus();
  180 |     await retry.press("Enter");
  181 |     await expect(
  182 |       documents.getByText("No documents yet for this capability.", {
  183 |         exact: true,
  184 |       }),
  185 |     ).toBeVisible();
  186 |     await expect(upload).toBeEnabled();
  187 |     await noOverflow(page, editor);
  188 |     await page.screenshot({
  189 |       path: info.outputPath(`documents-empty-${screen.name}.png`),
  190 |       fullPage: true,
  191 |     });
  192 |     expect(errors).toEqual([]);
  193 |     expect(unexpected).toEqual([]);
  194 |   });
  195 | }
  196 | 
  197 | test("the authored loading skeleton announces one status while document access is pending", async ({
  198 |   page,
  199 | }, info) => {
  200 |   const unexpected = await installDocumentFixtures(page);
  201 |   await page.setViewportSize({ width: 390, height: 844 });
  202 |   const held = await holdResponse(
  203 |     page,
  204 |     "**/core/engagement/attachments?**",
  205 |     "GET",
  206 |     [],
  207 |   );
  208 |   const editor = await openDocuments(page, false);
  209 |   await held.started;
  210 |   await expect(
  211 |     editor.getByRole("status", { name: "Loading documents", exact: true }),
  212 |   ).toBeVisible();
  213 |   await expect(
  214 |     editor.getByRole("button", { name: "Upload document", exact: true }),
  215 |   ).toBeDisabled();
  216 |   await expect(editor.getByRole("listitem")).toHaveCount(0);
  217 |   await noOverflow(page, editor);
  218 |   await page.screenshot({
  219 |     path: info.outputPath("documents-loading-phone.png"),
  220 |     fullPage: true,
  221 |   });
  222 |   held.release();
  223 |   await held.settled;
  224 |   await expect(
  225 |     editor.getByText("No documents yet for this capability.", { exact: true }),
  226 |   ).toBeVisible();
  227 |   expect(unexpected).toEqual([]);
  228 | });
  229 | 
```