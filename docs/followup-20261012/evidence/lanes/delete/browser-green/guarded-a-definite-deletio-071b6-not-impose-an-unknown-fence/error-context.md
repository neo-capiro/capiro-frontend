# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: guarded.spec.ts >> a definite deletion refusal does not impose an unknown fence
- Location: apps/web/tests/browser/files-delete-recovery.spec.ts:170:5

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByRole('dialog', { name: 'Delete file', exact: true }).getByRole('alert')
Expected substring: "Synthetic definite refusal"
Received string:    "You do not have permission for this operation."
Timeout: 5000ms

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for getByRole('dialog', { name: 'Delete file', exact: true }).getByRole('alert')
    14 × locator resolved to <div role="alert" class="status error">…</div>
       - unexpected value "You do not have permission for this operation."

```

```yaml
- alert:
  - paragraph: You do not have permission for this operation.
```

# Test source

```ts
  80  |     page.getByRole("button", { name: `Actions for ${nativeFile.fileName}` }),
  81  |   ).toHaveCount(0);
  82  |   expect(deletes).toBe(2);
  83  |   expect(unexpected).toEqual([]);
  84  | });
  85  | 
  86  | test("an absent current file is unavailable, not a deletion confirmation", async ({
  87  |   page,
  88  | }, info) => {
  89  |   const unexpected = await installFixtures(page);
  90  |   await page.setViewportSize({ width: 360, height: 800 });
  91  |   let dispatched = false;
  92  |   await page.route("**/engagement/attachments?**", (r) =>
  93  |     json(r, dispatched ? [] : [nativeFile]),
  94  |   );
  95  |   await page.route(`**/engagement/attachments/${nativeFile.id}`, (r) => {
  96  |     dispatched = true;
  97  |     return json(r, {}, 503);
  98  |   });
  99  |   await page.goto(`/portfolio/${clientId}/files`);
  100 |   const dialog = await openDelete(page);
  101 |   await dialog.getByRole("button", { name: "Confirm delete" }).click();
  102 |   await expect(dialog.getByText(/deletion outcome is unknown/)).toBeVisible();
  103 |   await dialog.getByRole("button", { name: "Review current files" }).click();
  104 |   await expect(dialog.getByRole("status")).toContainText(
  105 |     "not in the current visible client files",
  106 |   );
  107 |   await expect(dialog.getByRole("status")).toContainText(
  108 |     "does not confirm the earlier deletion",
  109 |   );
  110 |   await expect(
  111 |     dialog.getByRole("button", { name: "Confirm delete" }),
  112 |   ).toBeDisabled();
  113 |   const geometry = await dialog.evaluate((el) => ({
  114 |     left: el.getBoundingClientRect().left,
  115 |     right: el.getBoundingClientRect().right,
  116 |     client: el.clientWidth,
  117 |     scroll: el.scrollWidth,
  118 |   }));
  119 |   expect(geometry.left).toBeGreaterThanOrEqual(0);
  120 |   expect(geometry.right).toBeLessThanOrEqual(360);
  121 |   expect(geometry.scroll).toBeLessThanOrEqual(geometry.client);
  122 |   for (const key of ["Tab", "Tab", "Shift+Tab"]) {
  123 |     await page.keyboard.press(key);
  124 |     await expect
  125 |       .poll(() => dialog.evaluate((el) => el.contains(document.activeElement)))
  126 |       .toBe(true);
  127 |   }
  128 |   await page.screenshot({ path: info.outputPath("delete-absent-mobile.png") });
  129 |   await page.keyboard.press("Escape");
  130 |   await expect(dialog).toHaveCount(0);
  131 |   expect(unexpected).toEqual([]);
  132 | });
  133 | 
  134 | test("pending current deletion stays fenced until a later explicit review reports a recoverable file", async ({
  135 |   page,
  136 | }) => {
  137 |   const unexpected = await installFixtures(page);
  138 |   let lifecycle = "ready";
  139 |   let deletes = 0;
  140 |   await page.route("**/engagement/attachments?**", (r) =>
  141 |     json(r, [{ ...nativeFile, lifecycleStatus: lifecycle }]),
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
> 180 |   await expect(dialog.getByRole("alert")).toContainText(
      |                                           ^ Error: expect(locator).toContainText(expected) failed
  181 |     "Synthetic definite refusal",
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
  192 | test("a failed explicit current read retains the unknown fence and can be reviewed again", async ({
  193 |   page,
  194 | }) => {
  195 |   const unexpected = await installDocumentFixtures(page);
  196 |   await page.route(`**/engagement/attachments/${nativeFile.id}`, (r) =>
  197 |     json(r, {}, 503),
  198 |   );
  199 |   await page.goto("/capability-documents.html?files");
  200 |   const dialog = await openDelete(page);
  201 |   await dialog.getByRole("button", { name: "Confirm delete" }).click();
  202 |   let failed = true;
  203 |   await page.route("**/engagement/attachments?**", (r) =>
  204 |     failed
  205 |       ? json(r, { message: "Synthetic read unavailable" }, 503)
  206 |       : json(r, [nativeFile]),
  207 |   );
  208 |   await dialog.getByRole("button", { name: "Review current files" }).click();
  209 |   await expect(dialog.getByText("Synthetic read unavailable")).toBeVisible();
  210 |   await expect(
  211 |     dialog.getByRole("button", { name: "Confirm delete" }),
  212 |   ).toBeDisabled();
  213 |   failed = false;
  214 |   await dialog.getByRole("button", { name: "Review current files" }).click();
  215 |   await expect(
  216 |     dialog.getByRole("button", { name: "Confirm delete" }),
  217 |   ).toBeEnabled();
  218 |   expect(unexpected).toEqual([]);
  219 | });
  220 | 
  221 | for (const boundary of ["actor", "client", "unmount"] as const) {
  222 |   test(`a late deletion receipt after ${boundary} replacement cannot publish completion into the new view`, async ({
  223 |     page,
  224 |   }) => {
  225 |     const unexpected = await installDocumentFixtures(page);
  226 |     await page.route(
  227 |       "**/core/clients/10000000-0000-4000-8000-000000000002",
  228 |       (r) => json(r, { ...client, id: "10000000-0000-4000-8000-000000000002" }),
  229 |     );
  230 |     await page.goto("/capability-documents.html?files");
  231 |     const dialog = await openDelete(page);
  232 |     const held = await holdResponse(
  233 |       page,
  234 |       `**/engagement/attachments/${nativeFile.id}`,
  235 |       "DELETE",
  236 |       { ok: true },
  237 |     );
  238 |     try {
  239 |       await dialog.getByRole("button", { name: "Confirm delete" }).click();
  240 |       await held.started;
  241 |       await expect(
  242 |         dialog.getByRole("button", { name: "Confirm delete" }),
  243 |       ).toBeDisabled();
  244 |       await page.keyboard.press("Escape");
  245 |       await expect(dialog).toBeVisible();
  246 |       await changeDocumentView(page, boundary);
  247 |       await expect(dialog).toHaveCount(0);
  248 |     } finally {
  249 |       held.release();
  250 |     }
  251 |     await held.settled;
  252 |     await settleDocumentRequests(page);
  253 |     expect(held.calls()).toBe(1);
  254 |     await expect(page.getByText(/This is current visible state/)).toHaveCount(
  255 |       0,
  256 |     );
  257 |     if (boundary === "actor") {
  258 |       await changeDocumentView(page, "restore-actor");
  259 |       const reopened = await openDelete(page);
  260 |       await expect(
  261 |         reopened.getByRole("button", { name: "Confirm delete" }),
  262 |       ).toBeDisabled();
  263 |       await expect(
  264 |         reopened.getByRole("button", { name: "Review current files" }),
  265 |       ).toBeEnabled();
  266 |     }
  267 |     expect(unexpected).toEqual([]);
  268 |   });
  269 | }
  270 | 
  271 | test("a current read completing after actor replacement cannot release the old fence or leak its state", async ({
  272 |   page,
  273 | }) => {
  274 |   const unexpected = await installDocumentFixtures(page);
  275 |   await page.route(`**/engagement/attachments/${nativeFile.id}`, (r) =>
  276 |     json(r, {}, 503),
  277 |   );
  278 |   await page.goto("/capability-documents.html?files");
  279 |   const dialog = await openDelete(page);
  280 |   await dialog.getByRole("button", { name: "Confirm delete" }).click();
```