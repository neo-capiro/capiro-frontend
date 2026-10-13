# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: meri-files-navigation.spec.ts >> Files unknown write remains fenced through cross-mode Back/Forward and reconnect
- Location: test/browser/meri-files-navigation.spec.ts:14:3

# Error details

```
Error: expect(locator).toBeEditable() failed

Locator:  getByLabel('Document title', { exact: true })
Expected: editable
Received: disabled
Timeout:  5000ms

Call log:
  - Expect "toBeEditable" with timeout 5000ms
  - waiting for getByLabel('Document title', { exact: true })
    14 × locator resolved to <input disabled value="" required="" maxlength="200" data-slot="input" class="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacit…/>
       - unexpected value "disabled"

```

```yaml
- textbox "Document title" [disabled]
```

# Test source

```ts
  102 |   const first = documentReceipt(format),
  103 |     revision = documentReceipt(format, true);
  104 |   const versions = new Map([
  105 |     [ids.version, first],
  106 |     [ids.revision, revision],
  107 |   ]);
  108 |   const queue = (operation: DocumentRoute, handler: Handler) =>
  109 |     queued.set(operation, [...(queued.get(operation) ?? []), handler]);
  110 |   await page.addInitScript(() => {
  111 |     const observation = { created: [] as string[], revoked: [] as string[] };
  112 |     Object.defineProperty(window, "__documentUrls", { value: observation });
  113 |     const create = URL.createObjectURL.bind(URL),
  114 |       revoke = URL.revokeObjectURL.bind(URL);
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
> 202 |   ).toBeEditable();
      |     ^ Error: expect(locator).toBeEditable() failed
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
  215 |     .fill(
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