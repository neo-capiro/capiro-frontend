# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: meri-files-workflow.spec.ts >> Files xlsx 1440px creates revises inspects and verifies synthetic bytes with native limits visible
- Location: test/browser/meri-files-workflow.spec.ts:19:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByLabel('Complete sheets (JSON)', { exact: true })

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
            - region "Create a workbook" [ref=e65]:
              - heading "Create a workbook" [level=2] [ref=e66]
              - paragraph [ref=e67]: This connection creates Excel (.xlsx) workbooks. Enter typed sheets and cells as JSON. The service validates the complete content before admission.
              - generic [ref=e68]:
                - generic [ref=e69]:
                  - generic [ref=e70]: Workbook title
                  - textbox "Workbook title" [active] [ref=e71]: Synthetic
                - generic [ref=e72]:
                  - generic [ref=e73]: Complete sheets (JSON)
                  - textbox "Complete sheets (JSON)" [ref=e74]: "[ { \"name\": \"Summary\", \"rows\": [ [{\"value\":\"Item\"}, {\"value\":\"Amount\"}], [{\"value\":\"Example\"}, {\"value\":25}], [{\"value\":\"Total\"}, {\"formula\":\"=SUM(B2:B2)\"}] ] } ]"
                - generic [ref=e75]:
                  - paragraph [ref=e76]:
                    - text: Each sheet has a name and rows of typed cells. Use
                    - code [ref=e77]: value
                    - text: for a string, number, boolean or null; use
                    - code [ref=e78]: formula
                    - text: for a formula beginning with =. Literal strings beginning with = remain literal strings. Optional
                    - code [ref=e79]: numberFormat
                    - text: formats a cell.
                  - paragraph [ref=e80]: The complete sheet array replaces the prior workbook content when revising. Formula caches remain unverified and require recalculation in Excel. Inspection does not load the old workbook into this editor.
                - group [ref=e81]:
                  - generic "Show typed workbook example" [ref=e82]
                - button "Create workbook" [ref=e84] [cursor=pointer]
            - region "Immutable version" [ref=e85]:
              - heading "Immutable version" [level=2] [ref=e86]
              - paragraph [ref=e87]: Inspect a version ID you already know, or select one returned in this view. This is not a file library.
              - generic [ref=e88]:
                - generic [ref=e89]:
                  - generic [ref=e90]: Known version ID
                  - textbox "Known version ID" [ref=e91]
                - button "Inspect version ID" [disabled] [ref=e92]
              - paragraph [ref=e93]: No verified version is selected.
  - contentinfo [ref=e94]:
    - note [ref=e95]:
      - strong [ref=e96]: Conversation and workspace samples remain disconnected.
      - text: Document files require a verified document connection. Generated files remain drafts; native Office rendering is unverified.
```

# Test source

```ts
  115 |     URL.createObjectURL = (value) => {
  116 |       const url = create(value);
  117 |       observation.created.push(url);
  118 |       return url;
  119 |     };
  120 |     URL.revokeObjectURL = (url) => {
  121 |       observation.revoked.push(url);
  122 |       revoke(url);
  123 |     };
  124 |   });
  125 |   await page.route("**/api/documents/*", async (route) => {
  126 |     const request = route.request();
  127 |     const operation = new URL(request.url()).pathname
  128 |       .split("/")
  129 |       .pop() as DocumentRoute;
  130 |     expect(["create", "revise", "inspect", "download"]).toContain(operation);
  131 |     expect(request.method()).toBe("POST");
  132 |     const body = receiveDocumentRequest(
  133 |       operation,
  134 |       new TextEncoder().encode(request.postData() ?? ""),
  135 |     );
  136 |     requests.push({
  137 |       operation,
  138 |       body,
  139 |       method: request.method(),
  140 |       headers: await request.allHeaders(),
  141 |     });
  142 |     const override = queued.get(operation)?.shift();
  143 |     if (override) return override(route);
  144 |     if (operation === "create") return route.fulfill({ json: first });
  145 |     if (operation === "revise") return route.fulfill({ json: revision });
  146 |     const value = versions.get((body as { versionId: string }).versionId);
  147 |     expect(value).toBeDefined();
  148 |     return route.fulfill(
  149 |       operation === "inspect"
  150 |         ? { json: inspected(value!) }
  151 |         : await downloadReply(value!),
  152 |     );
  153 |   });
  154 |   return {
  155 |     host,
  156 |     requests,
  157 |     first,
  158 |     revision,
  159 |     format,
  160 |     calls: (operation: DocumentRoute) =>
  161 |       requests.filter((entry) => entry.operation === operation),
  162 |     writes: () =>
  163 |       requests.filter(
  164 |         (entry) => entry.operation === "create" || entry.operation === "revise",
  165 |       ),
  166 |     reply(operation: DocumentRoute, reply: Reply) {
  167 |       queue(operation, (route) => route.fulfill(reply));
  168 |     },
  169 |     hold(operation: DocumentRoute, reply: Reply) {
  170 |       const entered = deferred<void>(),
  171 |         released = deferred<void>(),
  172 |         settled = deferred<"finished" | "aborted">();
  173 |       queue(operation, async (route) => {
  174 |         const completed = completion(page, route.request());
  175 |         entered.resolve();
  176 |         await released.promise;
  177 |         try {
  178 |           await route.fulfill(reply);
  179 |         } catch (error) {
  180 |           if (!route.request().failure()) throw error;
  181 |         }
  182 |         settled.resolve(await completed);
  183 |       });
  184 |       return {
  185 |         entered: entered.promise,
  186 |         async release() {
  187 |           released.resolve();
  188 |           return settled.promise;
  189 |         },
  190 |       };
  191 |     },
  192 |   };
  193 | }
  194 | export async function connectFiles(page: Page, format: Format = "docx") {
  195 |   await page
  196 |     .getByRole("button", { name: "Connect document service", exact: true })
  197 |     .click();
  198 |   await expect(
  199 |     page.getByLabel(format === "docx" ? "Document title" : "Workbook title", {
  200 |       exact: true,
  201 |     }),
  202 |   ).toBeEditable();
  203 | }
  204 | export async function fillDocument(page: Page, format: Format = "docx") {
  205 |   await page
  206 |     .getByLabel(format === "docx" ? "Document title" : "Workbook title", {
  207 |       exact: true,
  208 |     })
  209 |     .fill("Synthetic");
  210 |   await page
  211 |     .getByLabel(
  212 |       format === "docx" ? "Document text" : "Complete sheets (JSON)",
  213 |       { exact: true },
  214 |     )
> 215 |     .fill(
      |      ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  216 |       format === "docx"
  217 |         ? "Synthetic document"
  218 |         : '[{"name":"Data","rows":[[{"value":"Synthetic"},{"formula":"=1+1"}]]}]',
  219 |     );
  220 | }
  221 | export async function createDocument(page: Page, format: Format = "docx") {
  222 |   await fillDocument(page, format);
  223 |   await page
  224 |     .getByRole("button", {
  225 |       name: format === "docx" ? "Create document" : "Create workbook",
  226 |       exact: true,
  227 |     })
  228 |     .click();
  229 |   await expect(
  230 |     page.getByRole("heading", { name: `Synthetic.${format}`, exact: true }),
  231 |   ).toBeVisible();
  232 | }
  233 | export const versionPanel = (page: Page) =>
  234 |   page.getByRole("region", { name: "Immutable version", exact: true });
  235 | export function expectFilesIsolation(
  236 |   fixture: Awaited<ReturnType<typeof filesFixture>>,
  237 | ) {
  238 |   expectActionIsolation(fixture.host);
  239 |   expect(
  240 |     fixture.host.actions().filter((entry) => entry.route !== "session"),
  241 |   ).toEqual([]);
  242 |   for (const request of fixture.requests)
  243 |     expect(request.headers.authorization).toBe(
  244 |       `Bearer action_session_${"a".repeat(43)}`,
  245 |     );
  246 | }
  247 | export async function urls(page: Page) {
  248 |   return page.evaluate(
  249 |     () =>
  250 |       (
  251 |         window as unknown as {
  252 |           __documentUrls: { created: string[]; revoked: string[] };
  253 |         }
  254 |       ).__documentUrls,
  255 |   );
  256 | }
  257 | 
```