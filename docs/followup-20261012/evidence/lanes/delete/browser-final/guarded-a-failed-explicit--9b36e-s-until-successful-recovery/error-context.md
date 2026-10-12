# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: guarded.spec.ts >> a failed explicit current read 403 revokes all cached file actions until successful recovery
- Location: apps/web/tests/browser/files-delete-recovery.spec.ts:193:7

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  getByRole('button', { name: 'Actions for Second current file.txt' })
Expected: 1
Received: 0
Timeout:  5000ms

Call log:
  - Expect "toHaveCount" with timeout 5000ms
  - waiting for getByRole('button', { name: 'Actions for Second current file.txt' })
    14 × locator resolved to 0 elements
       - unexpected value "0"

```

# Page snapshot

```yaml
- generic:
  - generic:
    - paragraph: Isolated synthetic capability documents
    - generic:
      - banner:
        - heading [level=1]: Client files
        - generic:
          - button [disabled]: New folder
          - button: Upload
          - button [disabled]: Create with Meri
      - generic:
        - textbox:
          - /placeholder: Search files
        - combobox
        - combobox
      - generic:
        - complementary:
          - generic:
            - generic: Folders
            - button [disabled]: Access
          - button [pressed]: Test Aerospace · 2
          - button:
            - text: Reports
            - generic: "2"
          - button:
            - text: Unfiled
            - generic: "0"
          - separator
          - generic: Visible file storage
          - paragraph: 0.0 MiB
          - generic: Storage quota is not provided by this service. Only accessible current attachments are counted.
        - generic:
          - generic:
            - generic: 2 files · 0 selected
            - button [disabled]: Move to folder
          - generic:
            - table:
              - rowgroup:
                - row:
                  - columnheader:
                    - checkbox
                  - columnheader: Name
                  - columnheader: Linked to / location
                  - columnheader: Created
                  - columnheader: Owner
                  - columnheader: Status
                  - columnheader:
                    - generic: Actions
              - rowgroup:
                - row:
                  - cell:
                    - checkbox
                  - cell:
                    - button:
                      - generic: txt
                      - text: Synthetic datasheet.txt
                    - generic: capability:40000000-0000-4000-8000-000000000001
                  - cell: Reports
                  - cell: 10/1/2026
                  - cell: Test user
                  - cell:
                    - generic: Text searchable
                  - cell:
                    - button: ⋯
                - row:
                  - cell:
                    - checkbox
                  - cell:
                    - button:
                      - generic: txt
                      - text: Second current file.txt
                    - generic: capability:40000000-0000-4000-8000-000000000001
                  - cell: Reports
                  - cell: 10/1/2026
                  - cell: Test user
                  - cell:
                    - generic: Text searchable
                  - cell:
                    - button: ⋯
      - generic: Meri destination is not configured.
  - dialog "Delete file" [ref=e2]:
    - banner [ref=e3]:
      - heading "Delete file" [level=2] [ref=e4]
      - button "Close" [active] [ref=e5] [cursor=pointer]:
        - img [ref=e6]
    - paragraph [ref=e9]: Delete Synthetic datasheet.txt? This removes the attachment and its stored object.
    - generic [ref=e10]:
      - alert [ref=e11]: The deletion outcome is unknown. Review current files before deciding whether to confirm deletion again.
      - button "Review current files" [ref=e12] [cursor=pointer]
      - button "Confirm delete" [disabled] [ref=e13]
```

# Test source

```ts
  142 |   );
  143 |   await page.route(`**/engagement/attachments/${nativeFile.id}`, (r) => {
  144 |     deletes++;
  145 |     return json(r, {}, 503);
  146 |   });
  147 |   await page.goto(`/portfolio/${clientId}/files`);
  148 |   const dialog = await openDelete(page);
  149 |   await dialog.getByRole("button", { name: "Confirm delete" }).click();
  150 |   lifecycle = "delete_pending";
  151 |   await dialog.getByRole("button", { name: "Review current files" }).click();
  152 |   await expect(dialog.getByRole("status")).toContainText(
  153 |     "Deletion is still pending",
  154 |   );
  155 |   await expect(
  156 |     dialog.getByRole("button", { name: "Confirm delete" }),
  157 |   ).toBeDisabled();
  158 |   lifecycle = "delete_failed";
  159 |   await dialog.getByRole("button", { name: "Review current files" }).click();
  160 |   await expect(dialog.getByRole("status")).toContainText(
  161 |     "Current deletion status: Failed",
  162 |   );
  163 |   await expect(
  164 |     dialog.getByRole("button", { name: "Confirm delete" }),
  165 |   ).toBeEnabled();
  166 |   expect(deletes).toBe(1);
  167 |   expect(unexpected).toEqual([]);
  168 | });
  169 | 
  170 | test("a definite deletion refusal does not impose an unknown fence", async ({
  171 |   page,
  172 | }) => {
  173 |   const unexpected = await installDocumentFixtures(page);
  174 |   await page.route(`**/engagement/attachments/${nativeFile.id}`, (r) =>
  175 |     json(r, { message: "Synthetic definite refusal" }, 403),
  176 |   );
  177 |   await page.goto("/capability-documents.html?files");
  178 |   const dialog = await openDelete(page);
  179 |   await dialog.getByRole("button", { name: "Confirm delete" }).click();
  180 |   await expect(dialog.getByRole("alert")).toContainText(
  181 |     "You do not have permission for this operation.",
  182 |   );
  183 |   await expect(
  184 |     dialog.getByRole("button", { name: "Confirm delete" }),
  185 |   ).toBeEnabled();
  186 |   await expect(
  187 |     dialog.getByRole("button", { name: "Review current files" }),
  188 |   ).toHaveCount(0);
  189 |   expect(unexpected).toEqual([]);
  190 | });
  191 | 
  192 | for (const status of [403, 503]) {
  193 |   test(`a failed explicit current read ${status} revokes all cached file actions until successful recovery`, async ({
  194 |     page,
  195 |   }) => {
  196 |     const unexpected = await installDocumentFixtures(page);
  197 |     const other = {
  198 |       ...nativeFile,
  199 |       id: "60000000-0000-4000-8000-000000000002",
  200 |       fileName: "Second current file.txt",
  201 |     };
  202 |     let failed = false;
  203 |     let deletes = 0;
  204 |     await page.route("**/engagement/attachments?**", (r) =>
  205 |       failed
  206 |         ? json(r, { message: "Synthetic read unavailable" }, status)
  207 |         : json(r, [nativeFile, other]),
  208 |     );
  209 |     await page.route(`**/engagement/attachments/${nativeFile.id}`, (r) => {
  210 |       deletes++;
  211 |       return json(r, {}, 503);
  212 |     });
  213 |     await page.goto("/capability-documents.html?files");
  214 |     const dialog = await openDelete(page);
  215 |     await dialog.getByRole("button", { name: "Confirm delete" }).click();
  216 |     await expect(dialog.getByText(/deletion outcome is unknown/)).toBeVisible();
  217 |     failed = true;
  218 |     await dialog.getByRole("button", { name: "Review current files" }).click();
  219 |     await expect(dialog).toHaveCount(0);
  220 |     await expect(page.getByRole("alert")).toContainText(
  221 |       status === 403
  222 |         ? "You do not have permission for this operation."
  223 |         : "Synthetic read unavailable",
  224 |     );
  225 |     await expect(
  226 |       page.getByRole("button", { name: /^Actions for / }),
  227 |     ).toHaveCount(0);
  228 |     await expect(page.getByText(other.fileName, { exact: true })).toHaveCount(
  229 |       0,
  230 |     );
  231 |     await expect(
  232 |       page.getByRole("button", { name: "Upload", exact: true }),
  233 |     ).toBeDisabled();
  234 |     failed = false;
  235 |     await page.getByRole("button", { name: "Retry", exact: true }).click();
  236 |     await expect(dialog).toBeVisible();
  237 |     await expect(
  238 |       dialog.getByRole("button", { name: "Confirm delete" }),
  239 |     ).toBeDisabled();
  240 |     await expect(
  241 |       page.getByRole("button", { name: `Actions for ${other.fileName}` }),
> 242 |     ).toHaveCount(1);
      |       ^ Error: expect(locator).toHaveCount(expected) failed
  243 |     await dialog.getByRole("button", { name: "Review current files" }).click();
  244 |     await expect(
  245 |       dialog.getByRole("button", { name: "Confirm delete" }),
  246 |     ).toBeEnabled();
  247 |     expect(deletes).toBe(1);
  248 |     expect(unexpected).toEqual([]);
  249 |   });
  250 | }
  251 | 
  252 | for (const boundary of ["actor", "client", "unmount"] as const) {
  253 |   test(`a late deletion receipt after ${boundary} replacement cannot publish completion into the new view`, async ({
  254 |     page,
  255 |   }) => {
  256 |     const unexpected = await installDocumentFixtures(page);
  257 |     await page.route(
  258 |       "**/core/clients/10000000-0000-4000-8000-000000000002",
  259 |       (r) => json(r, { ...client, id: "10000000-0000-4000-8000-000000000002" }),
  260 |     );
  261 |     await page.goto("/capability-documents.html?files");
  262 |     const dialog = await openDelete(page);
  263 |     const held = await holdResponse(
  264 |       page,
  265 |       `**/engagement/attachments/${nativeFile.id}`,
  266 |       "DELETE",
  267 |       { ok: true },
  268 |     );
  269 |     try {
  270 |       await dialog.getByRole("button", { name: "Confirm delete" }).click();
  271 |       await held.started;
  272 |       await expect(
  273 |         dialog.getByRole("button", { name: "Confirm delete" }),
  274 |       ).toBeDisabled();
  275 |       await page.keyboard.press("Escape");
  276 |       await expect(dialog).toBeVisible();
  277 |       await changeDocumentView(page, boundary);
  278 |       await expect(dialog).toHaveCount(0);
  279 |     } finally {
  280 |       held.release();
  281 |     }
  282 |     await held.settled;
  283 |     await settleDocumentRequests(page);
  284 |     expect(held.calls()).toBe(1);
  285 |     await expect(page.getByText(/This is current visible state/)).toHaveCount(
  286 |       0,
  287 |     );
  288 |     if (boundary === "actor") {
  289 |       await changeDocumentView(page, "restore-actor");
  290 |       const reopened = await openDelete(page);
  291 |       await expect(
  292 |         reopened.getByRole("button", { name: "Confirm delete" }),
  293 |       ).toBeDisabled();
  294 |       await expect(
  295 |         reopened.getByRole("button", { name: "Review current files" }),
  296 |       ).toBeEnabled();
  297 |     }
  298 |     expect(unexpected).toEqual([]);
  299 |   });
  300 | }
  301 | 
  302 | test("a current read completing after actor replacement cannot release the old fence or leak its state", async ({
  303 |   page,
  304 | }) => {
  305 |   const unexpected = await installDocumentFixtures(page);
  306 |   await page.route(`**/engagement/attachments/${nativeFile.id}`, (r) =>
  307 |     json(r, {}, 503),
  308 |   );
  309 |   await page.goto("/capability-documents.html?files");
  310 |   const dialog = await openDelete(page);
  311 |   await dialog.getByRole("button", { name: "Confirm delete" }).click();
  312 |   const held = await holdResponse(page, "**/engagement/attachments?**", "GET", [
  313 |     nativeFile,
  314 |   ]);
  315 |   try {
  316 |     await dialog.getByRole("button", { name: "Review current files" }).click();
  317 |     await held.started;
  318 |     await changeDocumentView(page, "actor");
  319 |     await expect(dialog).toHaveCount(0);
  320 |   } finally {
  321 |     held.release();
  322 |   }
  323 |   await held.settled;
  324 |   await settleDocumentRequests(page);
  325 |   await expect(page.getByText(/This is current visible state/)).toHaveCount(0);
  326 |   await changeDocumentView(page, "restore-actor");
  327 |   const reopened = await openDelete(page);
  328 |   await expect(
  329 |     reopened.getByRole("button", { name: "Confirm delete" }),
  330 |   ).toBeDisabled();
  331 |   expect(unexpected).toEqual([]);
  332 | });
  333 | 
  334 | for (const status of [200, 403]) {
  335 |   test(`a superseded current read returning ${status} cannot replace or poison newer client files`, async ({
  336 |     page,
  337 |   }) => {
  338 |     const unexpected = await installDocumentFixtures(page);
  339 |     await page.route(`**/engagement/attachments/${nativeFile.id}`, (r) =>
  340 |       json(r, {}, 503),
  341 |     );
  342 |     await page.goto("/capability-documents.html?files");
```