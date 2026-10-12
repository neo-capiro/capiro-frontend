# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: files-metadata-receipts.spec.ts >> a matching PATCH completing after client replacement cannot close or update the replacement view
- Location: apps/web/tests/browser/files-metadata-receipts.spec.ts:165:3

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 3

- Array []
+ Array [
+   "GET core/clients/10000000-0000-4000-8000-000000000002",
+ ]
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - paragraph [ref=e3]: Isolated synthetic capability documents
  - generic [ref=e4]:
    - banner [ref=e5]:
      - heading "Client files" [level=1] [ref=e6]
      - generic [ref=e7]:
        - button "New folder" [disabled] [ref=e8]
        - button "Upload" [ref=e9] [cursor=pointer]
        - button "Create with Meri" [disabled] [ref=e10]
    - generic [ref=e11]:
      - textbox "Search files" [ref=e12]
      - combobox "File source" [ref=e13]:
        - option "All sources" [selected]
      - combobox "Sort files" [ref=e14]:
        - option "Created · newest" [selected]
        - option "Name"
    - generic [ref=e15]:
      - complementary [ref=e16]:
        - generic [ref=e17]:
          - generic [ref=e18]: Folders
          - button "Access" [disabled] [ref=e19]
        - button "All files · 0" [pressed] [ref=e20] [cursor=pointer]
        - button "Unfiled 0" [ref=e21] [cursor=pointer]:
          - text: Unfiled
          - generic [ref=e23]: "0"
        - separator [ref=e24]
        - generic [ref=e25]: Visible file storage
        - paragraph [ref=e26]: 0.0 MiB
        - generic [ref=e27]: Storage quota is not provided by this service. Only accessible current attachments are counted.
      - generic [ref=e28]:
        - generic [ref=e29]:
          - generic [ref=e30]: 0 files · 0 selected
          - button "Move to folder" [disabled] [ref=e31]
        - generic [ref=e32]:
          - table [ref=e33]:
            - rowgroup [ref=e34]:
              - row "Select visible files Name Linked to / location Created Owner Status Actions" [ref=e35]:
                - columnheader "Select visible files" [ref=e36]:
                  - checkbox "Select visible files" [ref=e37]
                - columnheader "Name" [ref=e38]
                - columnheader "Linked to / location" [ref=e39]
                - columnheader "Created" [ref=e40]
                - columnheader "Owner" [ref=e41]
                - columnheader "Status" [ref=e42]
                - columnheader "Actions" [ref=e43]:
                  - generic [ref=e44]: Actions
            - rowgroup
          - paragraph [ref=e45]: No files match this view.
    - generic [ref=e46]: Meri destination is not configured.
```

# Test source

```ts
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
  123 |   });
  124 |   await page.goto(`/portfolio/${clientId}/files`);
  125 |   const dialog = await openAccess(page);
  126 |   await dialog.getByRole("radio", { name: "Specific people" }).check();
  127 |   await dialog.getByRole("checkbox", { name: /Viewer 0 Test/ }).check();
  128 |   await dialog.getByRole("checkbox", { name: /Viewer 1 Test/ }).check();
  129 |   await dialog.getByRole("button", { name: "Save access" }).click();
  130 |   await expect(dialog).toHaveCount(0);
  131 |   expect(saved).toBe(true);
  132 |   expect(unexpected).toEqual([]);
  133 | });
  134 | 
  135 | test("a definite access rejection retains an editable draft", async ({
  136 |   page,
  137 | }) => {
  138 |   const unexpected = await installFixtures(page);
  139 |   await page.route("**/engagement/attachments?**", (r) => json(r, [file]));
  140 |   await page.route(`**/files/${file.id}/access`, (r) =>
  141 |     r.request().method() === "GET"
  142 |       ? json(r, file)
  143 |       : json(r, { message: "Synthetic invalid viewer" }, 422),
  144 |   );
  145 |   await page.goto(`/portfolio/${clientId}/files`);
  146 |   const dialog = await openAccess(page);
  147 |   await dialog.getByRole("radio", { name: "Specific people" }).check();
  148 |   await dialog.getByRole("button", { name: "Save access" }).click();
  149 |   await expect(dialog.getByRole("alert")).toContainText(
  150 |     "Synthetic invalid viewer",
  151 |   );
  152 |   await expect(
  153 |     dialog.getByRole("radio", { name: "Specific people" }),
  154 |   ).toBeChecked();
  155 |   await expect(
  156 |     dialog.getByRole("button", { name: "Save access" }),
  157 |   ).toBeEnabled();
  158 |   await expect(
  159 |     dialog.getByRole("button", { name: "Review current file" }),
  160 |   ).toHaveCount(0);
  161 |   expect(unexpected).toEqual([]);
  162 | });
  163 | 
  164 | for (const boundary of ["actor", "client", "unmount"] as const) {
  165 |   test(`a matching PATCH completing after ${boundary} replacement cannot close or update the replacement view`, async ({
  166 |     page,
  167 |   }) => {
  168 |     const unexpected = await installDocumentFixtures(page);
  169 |     await page.route(`**/files/${nativeFile.id}/access`, (r) =>
  170 |       json(r, nativeFile),
  171 |     );
  172 |     await page.goto("/capability-documents.html?files");
  173 |     const dialog = await openAccess(page, nativeFile.fileName);
  174 |     const held = await holdResponse(
  175 |       page,
  176 |       `**/files/${nativeFile.id}/access`,
  177 |       "PATCH",
  178 |       { ...nativeFile, viewerMode: "restricted" },
  179 |     );
  180 |     try {
  181 |       await dialog.getByRole("radio", { name: "Specific people" }).check();
  182 |       await dialog.getByRole("button", { name: "Save access" }).click();
  183 |       await held.started;
  184 |       await changeDocumentView(page, boundary);
  185 |       await expect(dialog).toHaveCount(0);
  186 |     } finally {
  187 |       held.release();
  188 |     }
  189 |     await held.settled;
  190 |     await settleDocumentRequests(page);
  191 |     expect(held.calls()).toBe(1);
  192 |     await expect(page.getByText(/Current saved access:/)).toHaveCount(0);
  193 |     if (boundary === "actor") {
  194 |       await changeDocumentView(page, "restore-actor");
  195 |       const reopened = await openAccess(page, nativeFile.fileName);
  196 |       await expect(
  197 |         reopened.getByRole("radio", { name: "Specific people" }),
  198 |       ).toBeChecked();
  199 |       await expect(
  200 |         reopened.getByRole("button", { name: "Save access" }),
  201 |       ).toBeDisabled();
  202 |       await expect(
  203 |         reopened.getByRole("button", { name: "Review current file" }),
  204 |       ).toBeEnabled();
  205 |     }
> 206 |     expect(unexpected).toEqual([]);
      |                        ^ Error: expect(received).toEqual(expected) // deep equality
  207 |   });
  208 | }
  209 | 
  210 | test("a review completing after actor replacement cannot clear the original unknown save", async ({
  211 |   page,
  212 | }) => {
  213 |   const unexpected = await installDocumentFixtures(page);
  214 |   await page.route(`**/files/${nativeFile.id}/access`, (r) =>
  215 |     json(r, nativeFile),
  216 |   );
  217 |   await page.goto("/capability-documents.html?files");
  218 |   const dialog = await openAccess(page, nativeFile.fileName);
  219 |   await dialog.getByRole("radio", { name: "Specific people" }).check();
  220 |   await dialog.getByRole("button", { name: "Save access" }).click();
  221 |   await expect(dialog.getByText(/save outcome is unknown/i)).toBeVisible();
  222 |   const held = await holdResponse(
  223 |     page,
  224 |     `**/files/${nativeFile.id}/access`,
  225 |     "GET",
  226 |     nativeFile,
  227 |   );
  228 |   try {
  229 |     await dialog.getByRole("button", { name: "Review current file" }).click();
  230 |     await held.started;
  231 |     await changeDocumentView(page, "actor");
  232 |     await expect(dialog).toHaveCount(0);
  233 |   } finally {
  234 |     held.release();
  235 |   }
  236 |   await held.settled;
  237 |   await settleDocumentRequests(page);
  238 |   await changeDocumentView(page, "restore-actor");
  239 |   const reopened = await openAccess(page, nativeFile.fileName);
  240 |   await expect(
  241 |     reopened.getByRole("radio", { name: "Specific people" }),
  242 |   ).toBeChecked();
  243 |   await expect(
  244 |     reopened.getByRole("button", { name: "Save access" }),
  245 |   ).toBeDisabled();
  246 |   await expect(
  247 |     reopened.getByRole("button", { name: "Review current file" }),
  248 |   ).toBeEnabled();
  249 |   expect(unexpected).toEqual([]);
  250 | });
  251 | 
  252 | test("a contradictory folder receipt keeps the requested folder and needs current review", async ({
  253 |   page,
  254 | }) => {
  255 |   const unexpected = await installFixtures(page);
  256 |   let patches = 0;
  257 |   await page.route("**/engagement/attachments?**", (r) => json(r, [file]));
  258 |   await page.route(`**/files/${file.id}/access`, (r) => json(r, file));
  259 |   await page.route(`**/files/${file.id}/folder`, (r) => {
  260 |     patches++;
  261 |     return json(r, file);
  262 |   });
  263 |   await page.goto(`/portfolio/${clientId}/files`);
  264 |   await page.getByRole("checkbox", { name: `Select ${file.fileName}` }).check();
  265 |   await page.getByRole("button", { name: "New folder", exact: true }).click();
  266 |   const dialog = page.getByRole("dialog", { name: "New folder", exact: true });
  267 |   await dialog.getByLabel("Folder name").fill("Reviewed destination");
  268 |   await dialog
  269 |     .getByRole("button", { name: "Create folder & move file" })
  270 |     .click();
  271 |   await expect(dialog.getByRole("alert")).toContainText("unexpected response");
  272 |   await expect(dialog.getByLabel("Folder name")).toHaveValue(
  273 |     "Reviewed destination",
  274 |   );
  275 |   await expect(
  276 |     dialog.getByRole("button", { name: "Create folder & move file" }),
  277 |   ).toBeDisabled();
  278 |   await dialog.getByRole("button", { name: "Review current file" }).click();
  279 |   await expect(dialog.getByText("Current saved folder: Reports")).toBeVisible();
  280 |   await expect(dialog.getByLabel("Folder name")).toHaveValue(
  281 |     "Reviewed destination",
  282 |   );
  283 |   await expect(
  284 |     dialog.getByRole("button", { name: "Create folder & move file" }),
  285 |   ).toBeEnabled();
  286 |   expect(patches).toBe(1);
  287 |   expect(unexpected).toEqual([]);
  288 | });
  289 | 
  290 | test("unknown ACL save survives close/reopen and a failed review does not thaw it", async ({
  291 |   page,
  292 | }) => {
  293 |   await installFixtures(page);
  294 |   let patches = 0;
  295 |   let refuseRead = false;
  296 |   await page.route("**/engagement/attachments?**", (r) => json(r, [file]));
  297 |   await page.route(`**/files/${file.id}/access`, (r) => {
  298 |     if (r.request().method() === "GET")
  299 |       return refuseRead
  300 |         ? json(r, { message: "Synthetic review unavailable" }, 503)
  301 |         : json(r, file);
  302 |     patches++;
  303 |     return json(r, { message: "Synthetic ambiguous patch" }, 503);
  304 |   });
  305 |   await page.goto(`/portfolio/${clientId}/files`);
  306 |   let dialog = await openAccess(page);
```