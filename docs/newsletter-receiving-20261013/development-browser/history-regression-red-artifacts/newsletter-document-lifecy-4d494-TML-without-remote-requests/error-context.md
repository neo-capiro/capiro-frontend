# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: newsletter-document-lifecycle.spec.ts >> rich saved preview excludes local edits and sanitizes active HTML without remote requests
- Location: apps/web/test/browser/newsletter-document-lifecycle.spec.ts:238:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 2
Received: 3
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - link "Skip to content" [ref=e4] [cursor=pointer]:
      - /url: "#main-content"
    - banner [ref=e5]:
      - link "Capiro Home" [ref=e6] [cursor=pointer]:
        - /url: /
        - img "Capiro" [ref=e7]
      - navigation "Product modes" [ref=e8]:
        - link "Meri" [ref=e9] [cursor=pointer]:
          - /url: /meri
          - img [ref=e11]
        - link "Portfolio" [ref=e12] [cursor=pointer]:
          - /url: /
          - img [ref=e14]
        - link "Modules" [ref=e15] [cursor=pointer]:
          - /url: /modules
          - img [ref=e17]
      - navigation "Workspace actions" [ref=e18]:
        - link "Quick log" [ref=e19] [cursor=pointer]:
          - /url: /?log=1
          - img [ref=e21]
        - link "Master calendar" [ref=e22] [cursor=pointer]:
          - /url: /calendar
          - img [ref=e24]
        - link "Search intelligence" [ref=e25] [cursor=pointer]:
          - /url: /modules/intelligence
          - img [ref=e27]
        - button "Updates — unavailable" [disabled] [ref=e28]:
          - img [ref=e30]
        - link "Account settings" [ref=e31] [cursor=pointer]:
          - /url: /settings/personal
          - img [ref=e33]
    - generic [ref=e34]:
      - complementary [ref=e35]:
        - paragraph [ref=e36]: Modules
        - navigation "Modules" [ref=e37]:
          - link "Module hub" [ref=e38] [cursor=pointer]:
            - /url: /modules
            - img [ref=e40]
            - generic [ref=e41]: Module hub
          - link "Engagement" [ref=e42] [cursor=pointer]:
            - /url: /modules/engagement
            - img [ref=e44]
            - generic [ref=e45]: Engagement
          - link "Planner" [ref=e46] [cursor=pointer]:
            - /url: /modules/planner
            - img [ref=e48]
            - generic [ref=e49]: Planner
          - link "Calendar" [ref=e50] [cursor=pointer]:
            - /url: /modules/calendar
            - img [ref=e52]
            - generic [ref=e53]: Calendar
          - link "Workspace" [ref=e54] [cursor=pointer]:
            - /url: /modules/workspace
            - img [ref=e56]
            - generic [ref=e57]: Workspace
          - link "Strategies" [ref=e58] [cursor=pointer]:
            - /url: /modules/strategies
            - img [ref=e60]
            - generic [ref=e61]: Strategies
          - link "Directory" [ref=e62] [cursor=pointer]:
            - /url: /modules/directory
            - img [ref=e64]
            - generic [ref=e65]: Directory
          - link "Intelligence" [ref=e66] [cursor=pointer]:
            - /url: /modules/intelligence
            - img [ref=e68]
            - generic [ref=e69]: Intelligence
          - link "Research portfolios" [ref=e70] [cursor=pointer]:
            - /url: /modules/research-portfolios
            - img [ref=e72]
            - generic [ref=e73]: Research portfolios
        - link "Settings" [ref=e74] [cursor=pointer]:
          - /url: /settings/personal
          - img [ref=e76]
          - generic [ref=e77]: Settings
      - main [ref=e78]:
        - navigation "Breadcrumb" [ref=e79]:
          - link "← Modules" [ref=e80] [cursor=pointer]:
            - /url: /modules
          - generic [ref=e81]: /
          - combobox "Switch module" [ref=e82] [cursor=pointer]:
            - generic: Workspace
            - img [ref=e83]
        - generic [ref=e85]:
          - generic [ref=e86]:
            - generic [ref=e87]:
              - heading "Rich newsletter editor preview" [level=1] [ref=e88]
              - paragraph [ref=e89]: Edit locally, then explicitly create or review a saved rich document. Collaboration and delivery remain unavailable; leaving clears local edits, while uncertain write guards remain for this session and client scope.
            - button "Close preview" [ref=e91] [cursor=pointer]
          - region "Saved newsletter documents" [ref=e92]:
            - heading "Saved newsletter documents" [level=2] [ref=e93]
            - paragraph [ref=e94]: Loading the library or opening a document may activate an access invitation. These requests run only when you choose an action below. Library access does not imply that every document belongs to the selected client.
            - group [ref=e95]:
              - generic [ref=e96]:
                - button "Load saved newsletters" [ref=e97] [cursor=pointer]
                - button "Create saved document" [disabled] [ref=e98]
                - button "Read current saved document" [ref=e99] [cursor=pointer]
                - button "Save newsletter" [disabled] [ref=e100]
                - button "Preview saved state" [ref=e101] [cursor=pointer]
                - button "Stage newsletter" [ref=e102] [cursor=pointer]
              - generic [ref=e103]:
                - heading "Current library response" [level=3] [ref=e104]
                - list [ref=e105]:
                  - listitem [ref=e106]:
                    - text: Synthetic saved newsletter · revision 4 · Assigned client
                    - button "Review Synthetic saved newsletter" [ref=e107] [cursor=pointer]
            - paragraph [ref=e108]: "Current saved baseline: Synthetic saved newsletter · revision 4. Local content matches this baseline."
            - status [ref=e109]: Using the reviewed saved document. This does not confirm a previous uncertain attempt.
            - generic [ref=e110]:
              - generic [ref=e111]:
                - button "Collaboration and uploads" [disabled] [ref=e112]
                - generic [ref=e113]: Collaboration and asset operations are not included in this saved-document contract.
              - generic [ref=e114]:
                - button "Generate or send newsletter" [disabled] [ref=e115]
                - generic [ref=e116]: Generation, account review, prepare, test and delivery require separate supported operations and explicit intent.
          - group [ref=e117]:
            - generic [ref=e118]:
              - button "Undo" [disabled] [ref=e119]
              - button "Redo" [disabled] [ref=e120]
              - button "Mobile preview" [ref=e121] [cursor=pointer]
              - button "Plain text" [ref=e122] [cursor=pointer]
            - generic [ref=e123]:
              - generic [ref=e124]:
                - generic [ref=e125]: Newsletter name
                - textbox "Newsletter name" [ref=e126]: Synthetic saved newsletter
              - generic [ref=e127]:
                - generic [ref=e128]: Subject
                - textbox "Subject" [ref=e129]: Saved subject
              - generic [ref=e130]:
                - generic [ref=e131]: Preview text
                - textbox "Preview text" [ref=e132]
              - generic [ref=e133]:
                - generic [ref=e134]: From name
                - textbox "From name" [ref=e135]
              - generic [ref=e136]:
                - generic [ref=e137]: Reply-to email
                - textbox "Reply-to email" [ref=e138]
            - generic [ref=e139]:
              - navigation "Newsletter structure" [ref=e140]:
                - heading "Content" [level=2] [ref=e141]
                - generic [ref=e142]:
                  - heading "Header" [level=3] [ref=e143]
                  - list [ref=e144]:
                    - listitem [ref=e145]:
                      - button "Logo · YOUR FIRM" [ref=e146] [cursor=pointer]
                  - group [ref=e147]:
                    - generic "Add block to Header" [ref=e148] [cursor=pointer]
                - generic [ref=e149]:
                  - heading "Body" [level=3] [ref=e150]
                  - list [ref=e151]:
                    - listitem [ref=e152]:
                      - button "Heading · This week in policy" [ref=e153] [cursor=pointer]
                    - listitem [ref=e154]:
                      - button "Paragraph · Add your text here." [ref=e155] [cursor=pointer]
                  - group [ref=e156]:
                    - generic "Add block to Body" [ref=e157] [cursor=pointer]
                - generic [ref=e158]:
                  - heading "Footer" [level=3] [ref=e159]
                  - list [ref=e160]:
                    - listitem [ref=e161]:
                      - button "Footer" [ref=e162] [cursor=pointer]
                  - group [ref=e163]:
                    - generic "Add block to Footer" [ref=e164] [cursor=pointer]
                - paragraph [ref=e165]: Additional content tools, hosted surveys and product blocks are unavailable in this editor preview.
              - generic [ref=e166]:
                - paragraph [ref=e167]: Local preview · external images and links are disabled. Email clients may render differently.
                - iframe [ref=e168]:
                  - generic [active] [ref=f1e1]:
                    - generic [ref=f1e4]: YOUR FIRM
                    - generic [ref=f1e5]:
                      - heading "This week in policy" [level=1] [ref=f1e7]
                      - generic [ref=f1e9]: Add your text here.
                    - generic [ref=f1e12]:
                      - paragraph [ref=f1e13]: Copyright © 2026 *|LIST:COMPANY|*. All rights reserved.
                      - paragraph [ref=f1e14]: You are receiving this briefing because you subscribed to updates from our team.
                      - paragraph [ref=f1e15]:
                        - text: "Our mailing address is:"
                        - text: "*|HTML:LIST_ADDRESS|*"
                      - paragraph [ref=f1e16]: Want to change how you receive these emails?
                      - paragraph [ref=f1e17]: You can update your preferences or unsubscribe.
              - complementary [ref=e169]:
                - heading "Block settings" [level=2] [ref=e170]
                - paragraph [ref=e171]: Select a block to edit its content and style.
  - paragraph [ref=e172]: Explicit local test fixture · synthetic identity and records
```

# Test source

```ts
  145 |     await expect(
  146 |       page.getByText(
  147 |         status === 409
  148 |           ? /The saved revision changed/
  149 |           : /Save could not be confirmed and will not be repeated/,
  150 |       ),
  151 |     ).toBeVisible();
  152 |     await expect(page.getByLabel("Newsletter name")).toHaveValue(
  153 |       "Retained local name",
  154 |     );
  155 |     await expect(page.getByLabel("Subject", { exact: true })).toHaveValue(
  156 |       "Retained local subject",
  157 |     );
  158 |     await expect(button(page, "Save newsletter")).toBeDisabled();
  159 |     await expect(button(page, "Stage newsletter")).toBeDisabled();
  160 |     await page
  161 |       .getByLabel("Subject", { exact: true })
  162 |       .fill("Continued local edit");
  163 |     fixture.control.current = {
  164 |       ...saved,
  165 |       revision: 6,
  166 |       name: "Changed owner document",
  167 |       config: { ...saved.config, subject: "Changed owner subject" },
  168 |     };
  169 |     await button(page, "Read current saved document").click();
  170 |     await expect(
  171 |       page.getByRole("region", { name: "Review current saved newsletter" }),
  172 |     ).toContainText("Changed owner document");
  173 |     await expect(page.getByLabel("Newsletter name")).toHaveValue(
  174 |       "Retained local name",
  175 |     );
  176 |     await expect(button(page, "Save newsletter")).toBeDisabled();
  177 |     expect(fixture.calls("save")).toHaveLength(1);
  178 |     await button(page, "Rebase local draft onto reviewed revision").click();
  179 |     await expect(
  180 |       page.getByText(/Local edits retained against the reviewed revision/),
  181 |     ).toBeVisible();
  182 |     await button(page, "Save newsletter").click();
  183 |     await expect(
  184 |       page.getByText("Saved revision 7.", { exact: true }),
  185 |     ).toBeVisible();
  186 |     expect(fixture.calls("save")).toHaveLength(2);
  187 |     expect(fixture.calls("save")[1]!.input).toEqual({
  188 |       params: { id: saved.id },
  189 |       body: {
  190 |         revision: 6,
  191 |         name: "Retained local name",
  192 |         config: { ...saved.config, subject: "Continued local edit" },
  193 |         design: saved.design,
  194 |       },
  195 |     });
  196 |     expectIsolated(fixture);
  197 |   });
  198 | }
  199 | 
  200 | test("rich explicit adoption replaces uncertain local edits without attributing the owner state", async ({
  201 |   page,
  202 | }) => {
  203 |   const fixture = await documentFixture(page);
  204 |   await enterEditor(page);
  205 |   await adoptDocument(page);
  206 |   await page.getByLabel("Newsletter name").fill("Discarded local edits");
  207 |   fixture.queue("save", (route) => route.abort("connectionreset"));
  208 |   await button(page, "Save newsletter").click();
  209 |   await expect(
  210 |     page.getByText(/Save could not be confirmed and will not be repeated/),
  211 |   ).toBeVisible();
  212 |   fixture.control.current = {
  213 |     ...fixture.control.current,
  214 |     revision: 6,
  215 |     name: "Reviewed owner name",
  216 |   };
  217 |   await button(page, "Read current saved document").click();
  218 |   await expect(
  219 |     page.getByRole("region", { name: "Review current saved newsletter" }),
  220 |   ).toBeVisible();
  221 |   await expect(page.getByLabel("Newsletter name")).toHaveValue(
  222 |     "Discarded local edits",
  223 |   );
  224 |   await button(page, "Adopt saved document and replace local draft").click();
  225 |   await expect(page.getByLabel("Newsletter name")).toHaveValue(
  226 |     "Reviewed owner name",
  227 |   );
  228 |   await expect(
  229 |     page.getByText(
  230 |       "Using the reviewed saved document. This does not confirm a previous uncertain attempt.",
  231 |     ),
  232 |   ).toBeVisible();
  233 |   await expect(button(page, "Undo")).toBeDisabled();
  234 |   expect(fixture.calls("save")).toHaveLength(1);
  235 |   expectIsolated(fixture);
  236 | });
  237 | 
  238 | test("rich saved preview excludes local edits and sanitizes active HTML without remote requests", async ({
  239 |   page,
  240 | }) => {
  241 |   const fixture = await documentFixture(page);
  242 |   await enterEditor(page);
  243 |   const historyLength = await page.evaluate(() => history.length);
  244 |   await adoptDocument(page);
> 245 |   expect(await page.evaluate(() => history.length)).toBe(historyLength);
      |                                                     ^ Error: expect(received).toBe(expected) // Object.is equality
  246 |   await page
  247 |     .getByLabel("Subject", { exact: true })
  248 |     .fill("Unsaved private subject");
  249 |   fixture.queue("preview", (route) =>
  250 |     route.fulfill({
  251 |       json: {
  252 |         html: '<html><head><style>body{color:rgb(12,34,56)}@import url("https://example.test/track.css");</style></head><body><h1>Saved owner heading</h1><script>parent.alert("unsafe")</script><form action="https://example.test/post"><input name="secret"></form><iframe src="https://example.test/frame"></iframe><img src="https://example.test/pixel" alt="Hidden image"><a href="https://example.test/link">Safe link text</a></body></html>',
  253 |         plainText: "Saved owner plain text",
  254 |         checks: [],
  255 |       },
  256 |     }),
  257 |   );
  258 |   await button(page, "Preview saved state").click();
  259 |   const frame = page.frameLocator('iframe[title="Saved newsletter preview"]');
  260 |   await expect(
  261 |     frame.getByRole("heading", { name: "Saved owner heading" }),
  262 |   ).toBeVisible();
  263 |   await expect(
  264 |     frame.locator("script,form,input,iframe,a[href],img[src^='https://']"),
  265 |   ).toHaveCount(0);
  266 |   await expect(
  267 |     frame.getByText("Safe link text", { exact: true }),
  268 |   ).toBeVisible();
  269 |   await expect(
  270 |     page.locator('iframe[title="Saved newsletter preview"]'),
  271 |   ).toHaveAttribute("sandbox", "");
  272 |   await expect(
  273 |     frame.locator('meta[http-equiv="Content-Security-Policy"]'),
  274 |   ).toHaveAttribute("content", /default-src 'none'/);
  275 |   await page.getByText("Saved plain text", { exact: true }).click();
  276 |   await expect(
  277 |     page.getByText("Saved owner plain text", { exact: true }),
  278 |   ).toBeVisible();
  279 |   expect(await page.evaluate(() => history.length)).toBe(historyLength);
  280 |   fixture.queue("preview", (route) =>
  281 |     route.fulfill({
  282 |       json: {
  283 |         html: "<h1>Next saved owner heading</h1>",
  284 |         plainText: "Next saved plain text",
  285 |         checks: [],
  286 |       },
  287 |     }),
  288 |   );
  289 |   await button(page, "Preview saved state").click();
  290 |   await expect(
  291 |     frame.getByRole("heading", { name: "Next saved owner heading" }),
  292 |   ).toBeVisible();
  293 |   await expect(
  294 |     frame.getByRole("heading", { name: "Saved owner heading", exact: true }),
  295 |   ).toHaveCount(0);
  296 |   expect(await page.evaluate(() => history.length)).toBe(historyLength);
  297 |   expect(fixture.calls("preview")).toEqual([
  298 |     {
  299 |       operation: "preview",
  300 |       method: "POST",
  301 |       input: { params: { id: documentId }, body: { liveMergeTags: false } },
  302 |     },
  303 |     {
  304 |       operation: "preview",
  305 |       method: "POST",
  306 |       input: { params: { id: documentId }, body: { liveMergeTags: false } },
  307 |     },
  308 |   ]);
  309 |   expect(fixture.calls("save")).toEqual([]);
  310 |   await expect(button(page, "Stage newsletter")).toBeDisabled();
  311 |   expectIsolated(fixture);
  312 | });
  313 | 
```