# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: meri-action-host-lifetime.spec.ts >> Meri held query 401 cannot publish after session replacement
- Location: test/browser/meri-action-host-lifetime.spec.ts:23:5

# Error details

```
Error: locator.click: Test ended.
Call log:
  - waiting for getByRole('button', { name: /^Select recommendation:/ })

```

# Test source

```ts
  99  |     const request = route.request();
  100 |     requests.push({
  101 |       route: name,
  102 |       method: request.method(),
  103 |       body: request.method() === "GET" ? null : request.postDataJSON(),
  104 |       headers: await request.allHeaders(),
  105 |     });
  106 |     const override = queued.get(name)?.shift();
  107 |     if (override) return override(route);
  108 |     if (!defaults.has(name) && fallback.status === 501)
  109 |       unexpected.push(request.url());
  110 |     return route.fulfill(defaults.get(name) ?? fallback);
  111 |   };
  112 |   await page.route("**/api/backend/core/clients/*", (route) =>
  113 |     receive(route, "client", {
  114 |       json: new URL(route.request().url()).pathname.endsWith(
  115 |         otherActionClient.id,
  116 |       )
  117 |         ? otherActionClient
  118 |         : actionClient,
  119 |     }),
  120 |   );
  121 |   await page.route("**/api/action-followthrough/*", (route) => {
  122 |     const name = new URL(route.request().url()).pathname.split("/").pop()!;
  123 |     const reply =
  124 |       name === "session"
  125 |         ? {
  126 |             json: sessionReceipt(
  127 |               (route.request().postDataJSON() as { clientId: string }).clientId,
  128 |             ),
  129 |           }
  130 |         : {
  131 |             status: 501,
  132 |             json: { message: "No synthetic action response queued" },
  133 |           };
  134 |     return receive(route, name, reply);
  135 |   });
  136 |   const queue = (name: string, handler: Handler) =>
  137 |     queued.set(name, [...(queued.get(name) ?? []), handler]);
  138 |   return {
  139 |     requests,
  140 |     remote,
  141 |     errors,
  142 |     unexpected,
  143 |     calls: (name: string) =>
  144 |       requests.filter((request) => request.route === name),
  145 |     actions: () => requests.filter((request) => request.route !== "client"),
  146 |     reply(name: string, reply: Reply) {
  147 |       queue(name, (route) => route.fulfill(reply));
  148 |     },
  149 |     use(name: string) {
  150 |       const data = wire(name);
  151 |       defaults.set(data.route, {
  152 |         status: data.httpStatus,
  153 |         json: data.response,
  154 |       });
  155 |     },
  156 |     hold(name: string, reply: Reply) {
  157 |       const entered = deferred(),
  158 |         released = deferred(),
  159 |         settled = deferred();
  160 |       queue(name, async (route) => {
  161 |         const completed = requestCompletion(page, route.request());
  162 |         entered.resolve();
  163 |         await released.promise;
  164 |         try {
  165 |           await route.fulfill(reply);
  166 |           await completed;
  167 |         } finally {
  168 |           settled.resolve();
  169 |         }
  170 |       });
  171 |       return {
  172 |         entered: entered.promise,
  173 |         async release() {
  174 |           released.resolve();
  175 |           await settled.promise;
  176 |         },
  177 |       };
  178 |     },
  179 |   };
  180 | }
  181 | export async function connectActionHost(page: Page) {
  182 |   await expect(
  183 |     page.getByRole("button", { name: "Connect action service", exact: true }),
  184 |   ).toBeEnabled();
  185 |   await page
  186 |     .getByRole("button", { name: "Connect action service", exact: true })
  187 |     .click();
  188 |   await expect(
  189 |     page.getByRole("button", { name: "Find recommendations", exact: true }),
  190 |   ).toBeEnabled();
  191 | }
  192 | export async function selectAction(page: Page) {
  193 |   await page
  194 |     .getByRole("button", { name: "Find recommendations", exact: true })
  195 |     .click();
  196 |   await expect(
  197 |     page.getByRole("region", { name: "Returned recommendations" }),
  198 |   ).toBeVisible();
> 199 |   await page.getByRole("button", { name: /^Select recommendation:/ }).click();
      |                                                                       ^ Error: locator.click: Test ended.
  200 |   await expect(page.getByLabel("Task title", { exact: true })).toHaveValue(
  201 |     "Issue",
  202 |   );
  203 |   await page
  204 |     .getByLabel("Task title", { exact: true })
  205 |     .fill(actionContext.task.title);
  206 | }
  207 | export async function reviewAction(page: Page) {
  208 |   await page.getByRole("button", { name: "Review draft", exact: true }).click();
  209 |   await expect(
  210 |     page.getByRole("heading", { name: "Reviewed task intent", exact: true }),
  211 |   ).toBeVisible();
  212 | }
  213 | export async function prepareAction(page: Page) {
  214 |   await page
  215 |     .getByRole("button", { name: "Prepare approval proposal", exact: true })
  216 |     .click();
  217 |   await expect(
  218 |     page.getByRole("heading", {
  219 |       name: "Pending separate approval",
  220 |       exact: true,
  221 |     }),
  222 |   ).toBeVisible();
  223 | }
  224 | export function expectActionIsolation(
  225 |   fixture: Awaited<ReturnType<typeof actionHostFixture>>,
  226 | ) {
  227 |   expect(fixture.remote).toEqual([]);
  228 |   expect(fixture.errors).toEqual([]);
  229 |   expect(fixture.unexpected).toEqual([]);
  230 | }
  231 | export async function replaceActionIdentity(
  232 |   page: Page,
  233 |   detail: Record<string, string>,
  234 | ) {
  235 |   await page.evaluate(
  236 |     (detail) => dispatchEvent(new CustomEvent("test:session", { detail })),
  237 |     detail,
  238 |   );
  239 | }
  240 | 
```