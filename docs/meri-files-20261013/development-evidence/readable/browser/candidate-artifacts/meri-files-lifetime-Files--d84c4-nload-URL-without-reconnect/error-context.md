# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: meri-files-lifetime.spec.ts >> Files expiry removes an idle draft, known version and owned download URL without reconnect
- Location: test/browser/meri-files-lifetime.spec.ts:101:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByLabel('Document text', { exact: true })

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - banner [ref=e4]:
      - link "Capiro Home" [ref=e5] [cursor=pointer]:
        - /url: /
        - img "Capiro" [ref=e6]
      - navigation "Product modes" [ref=e7]:
        - link "Meri" [ref=e8] [cursor=pointer]:
          - /url: /meri?clientId=abcdef00-0000-4000-8000-000000000009
          - img [ref=e9]
        - link "Portfolio" [ref=e10] [cursor=pointer]:
          - /url: /portfolio/abcdef00-0000-4000-8000-000000000009
          - img [ref=e11]
        - link "Modules" [ref=e12] [cursor=pointer]:
          - /url: /modules?clientId=abcdef00-0000-4000-8000-000000000009
          - img [ref=e13]
      - generic [ref=e14]:
        - link "Quick log" [ref=e15] [cursor=pointer]:
          - /url: /?log=1&clientId=abcdef00-0000-4000-8000-000000000009
          - img [ref=e16]
        - link "Master calendar" [ref=e17] [cursor=pointer]:
          - /url: /calendar?clientId=abcdef00-0000-4000-8000-000000000009
          - img [ref=e18]
        - link "Search" [ref=e19] [cursor=pointer]:
          - /url: /modules/intelligence?clientId=abcdef00-0000-4000-8000-000000000009
          - img [ref=e20]
        - button "Updates — unavailable" [disabled] [ref=e21]:
          - img [ref=e22]
        - link "Account settings" [ref=e23] [cursor=pointer]:
          - /url: /settings/personal
          - img [ref=e24]
    - generic [ref=e25]:
      - complementary "Meri navigation" [ref=e26]:
        - button "New conversation" [ref=e27] [cursor=pointer]:
          - img [ref=e28]
          - text: New conversation
        - button "Search conversations" [disabled] [ref=e29]:
          - img [ref=e30]
          - text: Search conversations
        - navigation "Meri workspace" [ref=e32]:
          - button "Conversations" [ref=e33] [cursor=pointer]:
            - img [ref=e34]
            - text: Conversations
          - button "Files" [ref=e35] [cursor=pointer]:
            - img [ref=e36]
            - text: Files
          - button "Runs" [disabled] [ref=e37]:
            - img [ref=e38]
            - text: Runs
          - button "Approvals · 2" [disabled] [ref=e39]:
            - img [ref=e40]
            - text: Approvals · 2
          - button "Memory" [disabled] [ref=e41]:
            - img [ref=e42]
            - text: Memory
          - button "Routines" [disabled] [ref=e43]:
            - img [ref=e44]
            - text: Routines
          - button "Data access" [disabled] [ref=e45]:
            - img [ref=e46]
            - text: Data access
          - link "Recommendation actions" [ref=e47] [cursor=pointer]:
            - /url: /meri/actions?clientId=abcdef00-0000-4000-8000-000000000009
        - region "Recent" [ref=e48]:
          - heading "Recent" [level=2] [ref=e49]
          - button "Anduril meeting brief" [disabled] [ref=e50]
          - button "FY27 funding landscape" [disabled] [ref=e51]
          - button "Weekly client updates" [disabled] [ref=e52]
        - generic [ref=e53]:
          - link "Preferences" [ref=e55] [cursor=pointer]:
            - /url: /settings/preferences
          - paragraph [ref=e56]: Capiro · Your authorized workspace
      - main [ref=e57]:
        - generic [ref=e59]:
          - generic [ref=e60]:
            - heading "Files" [level=1] [ref=e61]
            - paragraph [ref=e62]: "Client: Synthetic action client. The service checks current authority for every request."
          - status [ref=e63]: Operations run only when you choose an action.
          - generic [ref=e64]:
            - region "Create a document" [ref=e65]:
              - heading "Create a document" [level=2] [ref=e66]
              - paragraph [ref=e67]: Write the text to save as a Word document or a plain text file.
              - generic [ref=e68]:
                - generic [ref=e69]:
                  - generic [ref=e70]: Document title
                  - textbox "Document title" [ref=e71]: Synthetic
                - generic [ref=e72]:
                  - generic [ref=e73]: File format
                  - combobox "File format" [ref=e74]:
                    - option "Word document (.docx)" [selected]
                    - option "Plain text (.txt)"
                - generic [ref=e75]:
                  - generic [ref=e76]: Document text
                  - textbox "Document text" [ref=e77]: Synthetic document
                - paragraph [ref=e78]: Each line becomes a normal paragraph, including blank lines. Up to 1,000 paragraphs and 100,000 characters.
                - button "Create document" [ref=e80] [cursor=pointer]
            - region "Immutable version" [ref=e81]:
              - heading "Immutable version" [level=2] [ref=e82]
              - paragraph [ref=e83]: Inspect a version ID you already know, or select one returned in this view. This is not a file library.
              - generic [ref=e84]:
                - generic [ref=e85]:
                  - generic [ref=e86]: Known version ID
                  - textbox "Known version ID" [ref=e87]: 55555555-5555-4555-8555-555555555555
                - button "Inspect version ID" [ref=e88] [cursor=pointer]
              - generic [ref=e89]:
                - generic [ref=e90]: Versions returned in this view (up to 10)
                - combobox "Versions returned in this view (up to 10)" [ref=e91]:
                  - option "Synthetic.docx · 55555555-5555-4555-8555-555555555555" [selected]
              - heading "Synthetic.docx" [level=3] [ref=e92]
              - generic [ref=e93]:
                - term [ref=e94]: Version ID
                - definition [ref=e95]: 55555555-5555-4555-8555-555555555555
                - term [ref=e96]: Parent version
                - definition [ref=e97]: None — original version
                - term [ref=e98]: Artifact ID
                - definition [ref=e99]: 44444444-4444-4444-8444-444444444444
                - term [ref=e100]: Format
                - definition [ref=e101]: DOCX
                - term [ref=e102]: Created
                - definition [ref=e103]:
                  - time [ref=e104]: 2026-10-13T08:00:00.000Z
                - term [ref=e105]: Bytes
                - definition [ref=e106]: "18"
                - term [ref=e107]: SHA-256
                - definition [ref=e108]: 95a5a3b9cf4ddcc7a93e4a0d4c6de680257932fbf5994ad15daa64142aaae3a0
                - term [ref=e109]: Generation
                - definition [ref=e110]: Draft
                - term [ref=e111]: Preview
                - definition [ref=e112]: Pending
                - term [ref=e113]: Byte inspection receipt
                - definition [ref=e114]: Not requested in this view
              - generic [ref=e115]:
                - heading "Structural inspection" [level=3] [ref=e116]
                - generic [ref=e117]:
                  - term [ref=e118]: Paragraphs
                  - definition [ref=e119]: "1"
                  - term [ref=e120]: Tables
                  - definition [ref=e121]: "0"
                  - term [ref=e122]: Pictures
                  - definition [ref=e123]: "0"
                - paragraph [ref=e124]: Native opening and rendering have not been verified. No Office preview is available here.
              - generic [ref=e125]:
                - button "Inspect selected version" [ref=e126] [cursor=pointer]
                - button "Revise selected version" [ref=e127] [cursor=pointer]
                - button "Verify download" [ref=e128] [cursor=pointer]
              - generic [ref=e129]:
                - status [ref=e130]: Download bytes match the selected immutable version’s size and SHA-256.
                - link "Download Synthetic.docx" [ref=e131] [cursor=pointer]:
                  - /url: blob:http://127.0.0.1:5197/1592a995-7c27-48bd-b4fd-c214b3516af0
  - contentinfo [ref=e132]:
    - note [ref=e133]:
      - strong [ref=e134]: Conversation and workspace samples remain disconnected.
      - text: Document files require a verified document connection. Generated files remain drafts; native Office rendering is unverified.
```

# Test source

```ts
  16  |   otherActionClient,
  17  |   replaceActionIdentity,
  18  | } from "./meri-action-host-fixtures";
  19  | 
  20  | for (const identity of [
  21  |   { name: "user", detail: { userId: "synthetic-new-user" } },
  22  |   { name: "session", detail: { sessionId: "synthetic-new-session" } },
  23  |   { name: "organization", detail: { orgId: "synthetic-new-org" } },
  24  | ] as const) {
  25  |   for (const status of [200, 401]) {
  26  |     test(`Files late create ${status} cannot publish or revoke the replacement ${identity.name}`, async ({
  27  |       page,
  28  |     }) => {
  29  |       const fixture = await filesFixture(page);
  30  |       const held = fixture.hold(
  31  |         "create",
  32  |         status === 200
  33  |           ? { json: fixture.first }
  34  |           : {
  35  |               status,
  36  |               json: { error: { code: "UNAUTHENTICATED", outcome: "UNKNOWN" } },
  37  |             },
  38  |       );
  39  |       await page.goto(filesUrl());
  40  |       await connectFiles(page);
  41  |       await fillDocument(page);
  42  |       await page
  43  |         .getByRole("button", { name: "Create document", exact: true })
  44  |         .click();
  45  |       await held.entered;
  46  |       await expect(
  47  |         page.getByLabel("Document title", { exact: true }),
  48  |       ).toBeDisabled();
  49  |       await replaceActionIdentity(page, identity.detail);
  50  |       await expect(
  51  |         page.getByRole("button", { name: "Connect document service" }),
  52  |       ).toBeEnabled();
  53  |       const terminal = await held.release();
  54  |       expect(["finished", "aborted"]).toContain(terminal);
  55  |       await expect(
  56  |         page.getByRole("heading", { name: "Synthetic.docx", exact: true }),
  57  |       ).toHaveCount(0);
  58  |       await connectFiles(page);
  59  |       await expect(
  60  |         page.getByLabel("Document title", { exact: true }),
  61  |       ).toHaveValue("");
  62  |       await createDocument(page);
  63  |       expect(fixture.calls("create")).toHaveLength(2);
  64  |       expect(fixture.host.calls("session")).toHaveLength(2);
  65  |       expectFilesIsolation(fixture);
  66  |     });
  67  |   }
  68  | }
  69  | 
  70  | test("Files held create cannot restore details after selected-client replacement", async ({
  71  |   page,
  72  | }) => {
  73  |   const fixture = await filesFixture(page);
  74  |   const held = fixture.hold("create", { json: fixture.first });
  75  |   await page.goto(filesUrl());
  76  |   await connectFiles(page);
  77  |   await fillDocument(page);
  78  |   await page
  79  |     .getByRole("button", { name: "Create document", exact: true })
  80  |     .click();
  81  |   await held.entered;
  82  |   await navigate(page, filesUrl(otherActionClient.id));
  83  |   await expect(
  84  |     page.getByRole("region", { name: "Document connection" }),
  85  |   ).toContainText(otherActionClient.name);
  86  |   await held.release();
  87  |   await connectFiles(page);
  88  |   await expect(page.getByLabel("Document title", { exact: true })).toHaveValue(
  89  |     "",
  90  |   );
  91  |   await expect(
  92  |     page.getByRole("heading", { name: "Synthetic.docx", exact: true }),
  93  |   ).toHaveCount(0);
  94  |   expect(fixture.host.calls("session")[1]!.body).toEqual({
  95  |     clientId: otherActionClient.id,
  96  |   });
  97  |   expect(fixture.calls("create")).toHaveLength(1);
  98  |   expectFilesIsolation(fixture);
  99  | });
  100 | 
  101 | test("Files expiry removes an idle draft, known version and owned download URL without reconnect", async ({
  102 |   page,
  103 | }) => {
  104 |   const fixture = await filesFixture(page);
  105 |   await page.goto(filesUrl());
  106 |   await connectFiles(page);
  107 |   await createDocument(page);
  108 |   await page
  109 |     .getByRole("button", { name: "Verify download", exact: true })
  110 |     .click();
  111 |   await expect(
  112 |     page.getByRole("link", { name: "Download Synthetic.docx" }),
  113 |   ).toBeVisible();
  114 |   await page
  115 |     .getByLabel("Document text", { exact: true })
> 116 |     .fill("Unsubmitted private text");
      |      ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  117 |   const before = fixture.requests.length;
  118 |   await page.clock.fastForward(60_001);
  119 |   await expect(
  120 |     page.getByRole("region", { name: "Document connection" }),
  121 |   ).toContainText("Current document access is unavailable");
  122 |   await expect(page.getByLabel("Document text", { exact: true })).toHaveCount(
  123 |     0,
  124 |   );
  125 |   await expect(
  126 |     page.getByRole("link", { name: "Download Synthetic.docx" }),
  127 |   ).toHaveCount(0);
  128 |   expect((await urls(page)).revoked).toHaveLength(1);
  129 |   expect(fixture.host.calls("session")).toHaveLength(1);
  130 |   expect(fixture.requests).toHaveLength(before);
  131 |   expectFilesIsolation(fixture);
  132 | });
  133 | 
  134 | for (const status of [401, 403]) {
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
```