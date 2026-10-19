# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: meri-action-host-lifetime.spec.ts >> Meri held query 200 cannot publish after user replacement
- Location: test/browser/meri-action-host-lifetime.spec.ts:23:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /^Select recommendation:/ })

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
          - button "Files" [disabled] [ref=e35]:
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
            - heading "Recommendation follow-through" [level=1] [ref=e61]
            - paragraph [ref=e62]: "Client: Synthetic action client. The service checks current authority for every request."
          - generic [ref=e63]:
            - button "Refresh recommendations" [ref=e64] [cursor=pointer]
            - status [ref=e65]: Requests run only when you choose an action.
          - region "Returned recommendations" [ref=e67]:
            - heading "Recommendations" [level=2] [ref=e68]
            - paragraph [ref=e69]: These recommendations are not accepted tasks.
            - generic "Recommendation coverage" [ref=e70]:
              - paragraph [ref=e71]: These are recommendations. They have not been accepted as tasks.
              - paragraph [ref=e72]: "Bounded first page: 1 returned; reported total 1 for this scope. No additional pages are fetched automatically."
              - paragraph [ref=e73]: "Enumeration: unknown; truncated: false; history: unsupported."
              - paragraph [ref=e74]: "Requested sources: action_items_complete; checked: action_items_complete; unavailable: none."
              - paragraph [ref=e75]: Native coverage is a source assertion; no qualified freshness, snapshot or exhaustive absence.
              - paragraph [ref=e76]: Receipt lineage does not authenticate native cursor contents or establish current source truth.
              - paragraph [ref=e77]: "action_items_complete: partial; freshness unknown; as of unknown; synchronized unknown; retrieved 2026-10-12T20:00:00.059Z."
              - paragraph [ref=e78]: "Page source: healthy; complete: true; partial: false; pagination complete: true; more pages: false; exact total for this scope: true; absence supported: false."
              - paragraph [ref=e79]: Structural page assertion only
              - paragraph [ref=e80]: "Evidence ready: false. Continuation cursor: none supplied; required reads: 0; remaining sources: none supplied."
            - list [ref=e81]:
              - listitem [ref=e82]:
                - article [ref=e83]:
                  - heading "Issue" [level=3] [ref=e84]
                  - paragraph [ref=e85]: Recommend
                  - paragraph [ref=e86]: "Suggested due date: Not supplied"
                  - 'button "Select recommendation : Issue" [ref=e87] [cursor=pointer]':
                    - text: Select recommendation
                    - generic [ref=e88]: ": Issue"
  - note [ref=e89]:
    - strong [ref=e90]: Conversation and workspace samples remain disconnected.
    - text: Recommendation actions require a verified action connection.
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
      |                                                                       ^ Error: locator.click: Test timeout of 30000ms exceeded.
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