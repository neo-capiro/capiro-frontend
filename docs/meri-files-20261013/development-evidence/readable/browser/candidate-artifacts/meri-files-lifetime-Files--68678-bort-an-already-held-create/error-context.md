# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: meri-files-lifetime.spec.ts >> Files authorized same-client verification does not abort an already held create
- Location: test/browser/meri-files-lifetime.spec.ts:212:1

# Error details

```
Error: expect(locator).toBeDisabled() failed

Locator: getByLabel('Document text', { exact: true })
Expected: disabled
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeDisabled" with timeout 5000ms
  - waiting for getByLabel('Document text', { exact: true })

```

```yaml
- banner:
  - link "Capiro Home":
    - /url: /
    - img "Capiro"
  - navigation "Product modes":
    - link "Meri":
      - /url: /meri?clientId=abcdef00-0000-4000-8000-000000000009
    - link "Portfolio":
      - /url: /portfolio/abcdef00-0000-4000-8000-000000000009
    - link "Modules":
      - /url: /modules?clientId=abcdef00-0000-4000-8000-000000000009
  - link "Quick log":
    - /url: /?log=1&clientId=abcdef00-0000-4000-8000-000000000009
  - link "Master calendar":
    - /url: /calendar?clientId=abcdef00-0000-4000-8000-000000000009
  - link "Search":
    - /url: /modules/intelligence?clientId=abcdef00-0000-4000-8000-000000000009
  - button "Updates — unavailable" [disabled]
  - link "Account settings":
    - /url: /settings/personal
- complementary "Meri navigation":
  - button "New conversation"
  - button "Search conversations" [disabled]
  - navigation "Meri workspace":
    - button "Conversations"
    - button "Files"
    - button "Runs" [disabled]
    - button "Approvals · 2" [disabled]
    - button "Memory" [disabled]
    - button "Routines" [disabled]
    - button "Data access" [disabled]
    - link "Recommendation actions":
      - /url: /meri/actions?clientId=abcdef00-0000-4000-8000-000000000009
  - region "Recent":
    - heading "Recent" [level=2]
    - button "Anduril meeting brief" [disabled]
    - button "FY27 funding landscape" [disabled]
    - button "Weekly client updates" [disabled]
  - link "Preferences":
    - /url: /settings/preferences
  - paragraph: Capiro · Your authorized workspace
- main:
  - heading "Files" [level=1]
  - paragraph: "Client: Synthetic action client. The service checks current authority for every request."
  - status: Document create request in progress.
  - region "Create a document":
    - heading "Create a document" [level=2]
    - paragraph: Write the text to save as a Word document or a plain text file.
    - text: Document title
    - textbox "Document title" [disabled]: Synthetic
    - text: File format
    - combobox "File format" [disabled]:
      - option "Word document (.docx)" [selected]
      - option "Plain text (.txt)"
    - text: Document text
    - textbox "Document text" [disabled]: Synthetic document
    - paragraph: Each line becomes a normal paragraph, including blank lines. Up to 1,000 paragraphs and 100,000 characters.
    - button "Create document" [disabled]
  - region "Immutable version":
    - heading "Immutable version" [level=2]
    - paragraph: Inspect a version ID you already know, or select one returned in this view. This is not a file library.
    - text: Known version ID
    - textbox "Known version ID" [disabled]
    - button "Inspect version ID" [disabled]
    - paragraph: No verified version is selected.
- contentinfo:
  - note:
    - strong: Conversation and workspace samples remain disconnected.
    - text: Document files require a verified document connection. Generated files remain drafts; native Office rendering is unverified.
```

# Test source

```ts
  135 |   test(`Files current ${status} refusal clears known versions and download resources`, async ({
  136 |     page,
  137 |   }) => {
  138 |     const fixture = await filesFixture(page);
  139 |     await page.goto(filesUrl());
  140 |     await connectFiles(page);
  141 |     await createDocument(page);
  142 |     await page
  143 |       .getByRole("button", { name: "Verify download", exact: true })
  144 |       .click();
  145 |     await expect(
  146 |       page.getByRole("link", { name: "Download Synthetic.docx" }),
  147 |     ).toBeVisible();
  148 |     fixture.reply("inspect", {
  149 |       status,
  150 |       json: {
  151 |         error: {
  152 |           code: status === 401 ? "UNAUTHENTICATED" : "ACCESS_DENIED",
  153 |           outcome: "READ_UNAVAILABLE",
  154 |         },
  155 |       },
  156 |     });
  157 |     await page
  158 |       .getByRole("button", { name: "Inspect selected version", exact: true })
  159 |       .click();
  160 |     await expect(
  161 |       page.getByRole("region", { name: "Document connection" }),
  162 |     ).toContainText("Current document access is unavailable");
  163 |     await expect(
  164 |       page.getByRole("heading", { name: "Synthetic.docx", exact: true }),
  165 |     ).toHaveCount(0);
  166 |     await expect(
  167 |       page.getByRole("link", { name: "Download Synthetic.docx" }),
  168 |     ).toHaveCount(0);
  169 |     expect((await urls(page)).revoked).toHaveLength(1);
  170 |     expect(fixture.calls("inspect")).toHaveLength(1);
  171 |     expect(fixture.host.calls("session")).toHaveLength(1);
  172 |     expectFilesIsolation(fixture);
  173 |   });
  174 | }
  175 | 
  176 | test("Files same-client held verification retains typed draft and known version after current success", async ({
  177 |   page,
  178 | }) => {
  179 |   const fixture = await filesFixture(page);
  180 |   await page.goto(filesUrl());
  181 |   await connectFiles(page);
  182 |   await createDocument(page);
  183 |   await page
  184 |     .getByLabel("Document text", { exact: true })
  185 |     .fill("Retained same-client private draft");
  186 |   const before = fixture.requests.length;
  187 |   const held = fixture.host.hold("client", { json: actionClient });
  188 |   await page.clock.setSystemTime(new Date(actionClock + 31_000));
  189 |   await page.evaluate(() => {
  190 |     dispatchEvent(new Event("offline"));
  191 |     dispatchEvent(new Event("online"));
  192 |   });
  193 |   await held.entered;
  194 |   await expect(page.getByLabel("Document text", { exact: true })).toBeHidden();
  195 |   await expect(versionPanel(page)).toBeHidden();
  196 |   expect(fixture.requests).toHaveLength(before);
  197 |   await held.release();
  198 |   await expect(page.getByLabel("Document text", { exact: true })).toHaveValue(
  199 |     "Retained same-client private draft",
  200 |   );
  201 |   await expect(
  202 |     page.getByRole("heading", { name: "Synthetic.docx", exact: true }),
  203 |   ).toBeVisible();
  204 |   await expect(
  205 |     page.getByRole("button", { name: "Inspect selected version", exact: true }),
  206 |   ).toBeEnabled();
  207 |   expect(fixture.host.calls("session")).toHaveLength(1);
  208 |   expect(fixture.requests).toHaveLength(before);
  209 |   expectFilesIsolation(fixture);
  210 | });
  211 | 
  212 | test("Files authorized same-client verification does not abort an already held create", async ({
  213 |   page,
  214 | }) => {
  215 |   const fixture = await filesFixture(page);
  216 |   const write = fixture.hold("create", { json: fixture.first });
  217 |   await page.goto(filesUrl());
  218 |   await connectFiles(page);
  219 |   await fillDocument(page);
  220 |   await page
  221 |     .getByRole("button", { name: "Create document", exact: true })
  222 |     .click();
  223 |   await write.entered;
  224 |   const verify = fixture.host.hold("client", { json: actionClient });
  225 |   await page.clock.setSystemTime(new Date(actionClock + 31_000));
  226 |   await page.evaluate(() => {
  227 |     dispatchEvent(new Event("offline"));
  228 |     dispatchEvent(new Event("online"));
  229 |   });
  230 |   await verify.entered;
  231 |   await expect(page.getByLabel("Document text", { exact: true })).toBeHidden();
  232 |   await verify.release();
  233 |   await expect(
  234 |     page.getByLabel("Document text", { exact: true }),
> 235 |   ).toBeDisabled();
      |     ^ Error: expect(locator).toBeDisabled() failed
  236 |   expect(await write.release()).toBe("finished");
  237 |   await expect(
  238 |     page.getByRole("heading", { name: "Synthetic.docx", exact: true }),
  239 |   ).toBeVisible();
  240 |   await expect(
  241 |     page.getByRole("region", { name: "Unresolved document write" }),
  242 |   ).toHaveCount(0);
  243 |   expect(fixture.writes()).toHaveLength(1);
  244 |   expect(fixture.host.calls("session")).toHaveLength(1);
  245 |   expectFilesIsolation(fixture);
  246 | });
  247 | 
  248 | test("Files a denied same-client refresh destroys retained private state without new document requests", async ({
  249 |   page,
  250 | }) => {
  251 |   const fixture = await filesFixture(page);
  252 |   await page.goto(filesUrl());
  253 |   await connectFiles(page);
  254 |   await createDocument(page);
  255 |   const before = fixture.requests.length;
  256 |   const held = fixture.host.hold("client", {
  257 |     status: 403,
  258 |     json: { message: "Synthetic access revoked" },
  259 |   });
  260 |   await page.clock.setSystemTime(new Date(actionClock + 31_000));
  261 |   await page.evaluate(() => {
  262 |     dispatchEvent(new Event("offline"));
  263 |     dispatchEvent(new Event("online"));
  264 |   });
  265 |   await held.entered;
  266 |   await held.release();
  267 |   await expect(
  268 |     page.getByRole("heading", {
  269 |       name: "Selected client unavailable",
  270 |       exact: true,
  271 |     }),
  272 |   ).toBeVisible();
  273 |   await expect(page.getByLabel("Document text", { exact: true })).toHaveCount(
  274 |     0,
  275 |   );
  276 |   await expect(
  277 |     page.getByRole("heading", { name: "Synthetic.docx", exact: true }),
  278 |   ).toHaveCount(0);
  279 |   expect(fixture.requests).toHaveLength(before);
  280 |   expectFilesIsolation(fixture);
  281 | });
  282 | 
  283 | test("Files sign-out removes draft and verified download without a background operation", async ({
  284 |   page,
  285 | }) => {
  286 |   const fixture = await filesFixture(page);
  287 |   await page.goto(filesUrl());
  288 |   await connectFiles(page);
  289 |   await createDocument(page);
  290 |   await page
  291 |     .getByRole("button", { name: "Verify download", exact: true })
  292 |     .click();
  293 |   await expect(
  294 |     page.getByRole("link", { name: "Download Synthetic.docx" }),
  295 |   ).toBeVisible();
  296 |   const before = fixture.requests.length;
  297 |   await page.evaluate(() =>
  298 |     dispatchEvent(
  299 |       new CustomEvent("test:session", {
  300 |         detail: { userId: null, sessionId: null, orgId: null },
  301 |       }),
  302 |     ),
  303 |   );
  304 |   await expect(
  305 |     page.getByRole("heading", { name: "Synthetic.docx", exact: true }),
  306 |   ).toHaveCount(0);
  307 |   await expect(page.getByLabel("Document text", { exact: true })).toHaveCount(
  308 |     0,
  309 |   );
  310 |   expect((await urls(page)).revoked).toHaveLength(1);
  311 |   expect(fixture.requests).toHaveLength(before);
  312 |   expectFilesIsolation(fixture);
  313 | });
  314 | 
```