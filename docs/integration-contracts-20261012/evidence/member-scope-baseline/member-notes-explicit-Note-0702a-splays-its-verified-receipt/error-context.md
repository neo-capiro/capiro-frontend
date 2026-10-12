# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: member-notes.spec.ts >> explicit Note save sends only supported fields and displays its verified receipt
- Location: tests/browser/member-notes.spec.ts:160:1

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  getByRole('dialog', { name: 'Quick log', exact: true }).getByRole('button', { name: 'Commitment', exact: true })
Expected: 0
Received: 1
Timeout:  5000ms

Call log:
  - Expect "toHaveCount" with timeout 5000ms
  - waiting for getByRole('dialog', { name: 'Quick log', exact: true }).getByRole('button', { name: 'Commitment', exact: true })
    14 × locator resolved to 1 element
       - unexpected value "1"

```

# Page snapshot

```yaml
- generic:
  - generic:
    - link:
      - /url: "#main"
      - text: Skip to content
    - banner:
      - link:
        - /url: /
        - img
      - navigation:
        - link:
          - /url: /meri
        - link:
          - /url: /
        - link:
          - /url: /modules
      - navigation:
        - link:
          - /url: /portfolio?log=1
        - link:
          - /url: /calendar
        - link:
          - /url: /portfolio?search=1
        - button [disabled]
        - generic:
          - button: T
    - generic:
      - complementary:
        - paragraph: Portfolio
        - navigation:
          - link:
            - /url: /portfolio
            - generic: Overview
          - link:
            - /url: /portfolio?type=CLIENT
            - generic: Clients
          - link:
            - /url: /portfolio/prospects
            - generic: Prospects
        - generic:
          - link:
            - /url: /settings
            - text: Settings
      - main:
        - generic:
          - generic:
            - generic:
              - paragraph: Your client portfolio
              - heading [level=1]: Portfolio 1
            - generic:
              - generic:
                - img
                - textbox:
                  - /placeholder: Search profiles…
              - button: New objective
              - button:
                - img
                - text: Add profile
          - region:
            - generic:
              - paragraph: Portfolio pulse
              - generic:
                - strong: —
                - generic: of work linked to an objective
            - generic:
              - strong: "1"
              - generic: Clients
            - generic:
              - strong: —
              - generic: Need attention
            - generic:
              - strong: —
              - generic: Objectives
            - generic:
              - strong: —
              - generic: Off track
            - generic:
              - strong: —
              - generic: Strategies
          - generic:
            - combobox
            - combobox
            - combobox
            - combobox
            - generic:
              - button:
                - img
              - button [pressed]:
                - img
          - generic:
            - region "Portfolio profiles":
              - navigation:
                - button [pressed]:
                  - text: All
                  - generic: "1"
                - button:
                  - text: Clients
                  - generic: "1"
                - link:
                  - /url: /portfolio/prospects
                  - text: Prospects
                - link:
                  - /url: /portfolio/prospects?pipeline=1
                  - text: Pipeline
              - status: 1 profile
              - button "Refresh profiles"
              - region "Organization profile order":
                - status:
                  - text: Saved profile ordering is unavailable in this environment. Profiles use their default order.
                  - button "Retry saved order"
                - generic:
                  - generic:
                    - article:
                      - link:
                        - /url: /portfolio/10000000-0000-4000-8000-000000000001
                        - generic: TA
                        - generic:
                          - heading [level=3]: Test Aerospace
                          - generic: Aerospace
                      - generic:
                        - generic: ACTIVE
                        - generic: —
                    - generic:
                      - button [disabled]:
                        - img
                      - generic: 1 of 1
                      - button [disabled]:
                        - img
                      - button [disabled]:
                        - img
                - paragraph: Drag any card to rearrange · your layout is saved to your profile
                - status
              - button: + Add profile
            - complementary:
              - generic:
                - heading [level=3]: Needs attention
                - generic: 0 shown
                - generic: ↑↓ Most urgent
              - paragraph: Updates automatically. Open an item in its client profile.
              - status: No alerts were returned for your accessible clients. Coverage is incomplete; this does not confirm there is nothing to review.
              - generic:
                - paragraph: "Limited feed: up to 50 alerts from the first 40 active clients, with up to 20 per client. Some sources may be unavailable."
                - generic:
                  - generic:
                    - text: Snapshot
                    - time: Oct 11, 6:00 AM UTC
                  - button: Refresh alerts
  - dialog "Quick log" [ref=e2]:
    - banner [ref=e3]:
      - heading "Quick log" [level=2] [ref=e4]
      - button "Close" [ref=e5] [cursor=pointer]:
        - img [ref=e6]
    - paragraph [ref=e9]: Record an activity for a client or a shared Directory note on a member.
    - generic [ref=e10]:
      - generic [ref=e11]: Log to
      - group "Log destination" [ref=e12]:
        - button "Client" [ref=e13] [cursor=pointer]
        - button "Member" [pressed] [ref=e14] [cursor=pointer]
    - generic [ref=e16]:
      - generic [ref=e17]:
        - generic [ref=e18]: Member
        - generic [ref=e19]:
          - generic [ref=e20]: SS
          - strong [ref=e21]: Sen. Synthetic Member
          - button "Change member" [ref=e22] [cursor=pointer]
      - generic [ref=e23]:
        - generic [ref=e24]: What kind of log
        - generic "Member log type" [ref=e25]:
          - generic [ref=e26]: Note
          - button "Call" [disabled] [ref=e27]
          - button "Meeting" [disabled] [ref=e28]
          - button "Email" [disabled] [ref=e29]
          - button "Commitment" [disabled] [ref=e30]
        - generic [ref=e31]: "Files to: Directory note on Sen. Synthetic Member."
      - generic [ref=e32]:
        - generic [ref=e33]: What happened
        - generic [ref=e34]: Shared with users in your tenant who can access Directory notes.
        - textbox "What happened" [active] [ref=e35]:
          - /placeholder: What was said, what was asked, what was promised…
          - text: Reviewed the public briefing.
      - generic [ref=e36]:
        - generic [ref=e37]: Saved time
        - paragraph [ref=e38]: The service records the time when the note is saved.
        - paragraph [ref=e39]: Staff selection, event time, client association, objective linking and Planner follow-up are unavailable for member notes.
      - contentinfo [ref=e40]:
        - generic [ref=e41]: 32/4000
        - button "Log it" [ref=e42] [cursor=pointer]
```

# Test source

```ts
  70  | const fulfill = (route: Route, json: unknown, status = 200) =>
  71  |   route.fulfill({ json, status });
  72  | async function setup(page: Page, government = false) {
  73  |   const unexpected = await (government
  74  |     ? installGovernmentFixtures(page)
  75  |     : installFixtures(page));
  76  |   const searches: string[] = [];
  77  |   const writes: { path: string; body: unknown }[] = [];
  78  |   page.on("request", (request) => {
  79  |     if (request.url().includes("/api/backend/") && request.method() !== "GET")
  80  |       writes.push({ path: request.url(), body: request.postDataJSON() });
  81  |   });
  82  |   await page.route("**/api/backend/core/me", (route) =>
  83  |     fulfill(route, identity),
  84  |   );
  85  |   await page.route(searchEndpoint, (route) => {
  86  |     searches.push(new URL(route.request().url()).searchParams.get("q") ?? "");
  87  |     return fulfill(route, result());
  88  |   });
  89  |   await page.route(detailEndpoint, (route) => fulfill(route, detail));
  90  |   await page.route(noteEndpoint, (route) => fulfill(route, receipt));
  91  |   return { unexpected, searches, writes };
  92  | }
  93  | async function openMember(page: Page, path = "/portfolio?log=1&keep=scope") {
  94  |   await page.goto(path);
  95  |   await page.getByRole("button", { name: "Member", exact: true }).click();
  96  |   await expect(
  97  |     page.getByRole("searchbox", { name: "Member", exact: true }),
  98  |   ).toBeVisible();
  99  | }
  100 | async function selectMember(page: Page, path?: string) {
  101 |   await openMember(page, path);
  102 |   await page
  103 |     .getByRole("searchbox", { name: "Member", exact: true })
  104 |     .fill("synthetic");
  105 |   await page.getByRole("button", { name: /^Sen\. Synthetic Member/ }).click();
  106 |   await expect(
  107 |     page.getByRole("textbox", { name: "What happened" }),
  108 |   ).toBeVisible();
  109 | }
  110 | const saveButton = (page: Page) =>
  111 |   page.getByRole("button", { name: "Log it", exact: true });
  112 | async function draft(page: Page, path?: string) {
  113 |   await selectMember(page, path);
  114 |   await page
  115 |     .getByRole("textbox", { name: "What happened" })
  116 |     .fill(`  ${noteText}\n`);
  117 | }
  118 | async function event(page: Page, name: string) {
  119 |   await page.evaluate((value) => window.dispatchEvent(new Event(value)), name);
  120 | }
  121 | 
  122 | test("global entry searches real members, preserves Client handoff and closes without writes", async ({
  123 |   page,
  124 | }) => {
  125 |   const { writes, searches, unexpected } = await setup(page);
  126 |   await openMember(page);
  127 |   const search = page.getByRole("searchbox", { name: "Member", exact: true });
  128 |   await search.fill("s");
  129 |   await expect(
  130 |     page.getByText("Search for a member to record a shared Directory note."),
  131 |   ).toBeVisible();
  132 |   expect(searches).toEqual([]);
  133 |   await search.fill("synthetic");
  134 |   const choice = page.getByRole("button", { name: /^Sen\. Synthetic Member/ });
  135 |   await choice.focus();
  136 |   await page.keyboard.press("Enter");
  137 |   await expect(
  138 |     page.getByText(
  139 |       "Shared with users in your tenant who can access Directory notes.",
  140 |     ),
  141 |   ).toBeVisible();
  142 |   await page
  143 |     .getByRole("button", { name: "Change member", exact: true })
  144 |     .click();
  145 |   await expect(search).toHaveValue("synthetic");
  146 |   await page.getByRole("button", { name: "Client", exact: true }).click();
  147 |   await page
  148 |     .getByRole("combobox", { name: "Client", exact: true })
  149 |     .selectOption(clientId);
  150 |   await page.getByRole("button", { name: "Continue", exact: true }).click();
  151 |   await expect(page).toHaveURL(`/portfolio/${clientId}?log=1`);
  152 |   await expect(
  153 |     page.getByRole("textbox", { name: "Title", exact: true }),
  154 |   ).toBeVisible();
  155 |   await page.keyboard.press("Escape");
  156 |   expect(writes).toEqual([]);
  157 |   expect(unexpected).toEqual([]);
  158 | });
  159 | 
  160 | test("explicit Note save sends only supported fields and displays its verified receipt", async ({
  161 |   page,
  162 | }) => {
  163 |   const { writes, unexpected } = await setup(page);
  164 |   await draft(page);
  165 |   const dialog = page.getByRole("dialog", { name: "Quick log", exact: true });
  166 |   await expect(dialog).toHaveCSS("width", "640px");
  167 |   await expect(
  168 |     page.getByText("The service records the time when the note is saved."),
  169 |   ).toBeVisible();
> 170 |   await expect(dialog.getByRole("button", { name: "Commitment", exact: true })).toHaveCount(0);
      |                                                                                 ^ Error: expect(locator).toHaveCount(expected) failed
  171 |   await expect(dialog.getByText(/We owe|They owe|Counterparty/)).toHaveCount(0);
  172 |   for (const name of ["Call", "Meeting", "Email"])
  173 |     await expect(
  174 |       page.getByRole("button", { name, exact: true }),
  175 |     ).toBeDisabled();
  176 |   const activeNote = page.getByText("Note", { exact: true });
  177 |   await expect(activeNote).toHaveCSS("color", "rgb(255, 255, 255)");
  178 |   await expect(activeNote).toHaveCSS("background-image", /linear-gradient/);
  179 |   await expect(page.getByRole("textbox", { name: "What happened" })).toHaveCSS(
  180 |     "height",
  181 |     "110px",
  182 |   );
  183 |   await page.screenshot({
  184 |     path: "work/member-note-desktop.png",
  185 |     fullPage: true,
  186 |   });
  187 |   await saveButton(page).click();
  188 |   await expect(page.getByText(/^Note saved to Directory/)).toBeVisible();
  189 |   await expect(
  190 |     page.getByRole("button", { name: "Saved", exact: true }),
  191 |   ).toBeDisabled();
  192 |   expect(writes).toHaveLength(1);
  193 |   expect(writes[0]!.path).toContain(`/directory/contacts/${member.id}/notes`);
  194 |   expect(writes[0]!.body).toEqual({
  195 |     body: noteText,
  196 |     directoryContactName: member.name,
  197 |   });
  198 |   await page.keyboard.press("Escape");
  199 |   await expect(dialog).toHaveCount(0);
  200 |   await expect(page).toHaveURL(/keep=scope/);
  201 |   await expect(page).not.toHaveURL(/log=/);
  202 |   expect(unexpected).toEqual([]);
  203 | });
  204 | 
  205 | test("paging is explicit and an empty member search does not fabricate results", async ({
  206 |   page,
  207 | }) => {
  208 |   const { writes } = await setup(page);
  209 |   const pages: number[] = [];
  210 |   await page.route(searchEndpoint, (route) => {
  211 |     const url = new URL(route.request().url());
  212 |     const pageNumber = Number(url.searchParams.get("page"));
  213 |     pages.push(pageNumber);
  214 |     return fulfill(
  215 |       route,
  216 |       url.searchParams.get("q") === "absent"
  217 |         ? { ...result(), total: 0, contacts: [] }
  218 |         : result(pageNumber, 21),
  219 |     );
  220 |   });
  221 |   await openMember(page);
  222 |   const search = page.getByRole("searchbox", { name: "Member", exact: true });
  223 |   await search.fill("synthetic");
  224 |   await page.getByRole("button", { name: "Next members" }).click();
  225 |   await expect(page.getByText("Page 2", { exact: true })).toBeVisible();
  226 |   expect(pages).toEqual([1, 2]);
  227 |   await search.fill("absent");
  228 |   await expect(page.getByText("No members match your search.")).toBeVisible();
  229 |   await expect(
  230 |     page.getByRole("button", { name: /^Sen\. Synthetic Member/ }),
  231 |   ).toHaveCount(0);
  232 |   expect(writes).toEqual([]);
  233 | });
  234 | 
  235 | test("search failure and retry preserve the query without writing", async ({
  236 |   page,
  237 | }) => {
  238 |   const { writes } = await setup(page);
  239 |   let attempts = 0;
  240 |   await page.route(searchEndpoint, (route) =>
  241 |     fulfill(
  242 |       route,
  243 |       ++attempts === 1
  244 |         ? { message: "Directory temporarily unavailable" }
  245 |         : result(),
  246 |       attempts === 1 ? 400 : 200,
  247 |     ),
  248 |   );
  249 |   await openMember(page);
  250 |   await page
  251 |     .getByRole("searchbox", { name: "Member", exact: true })
  252 |     .fill("synthetic");
  253 |   await expect(page.getByRole("alert")).toContainText(
  254 |     "Directory temporarily unavailable",
  255 |   );
  256 |   await page.getByRole("button", { name: "Retry member search" }).click();
  257 |   await expect(
  258 |     page.getByRole("button", { name: /^Sen\. Synthetic Member/ }),
  259 |   ).toBeVisible();
  260 |   expect(attempts).toBe(2);
  261 |   expect(writes).toEqual([]);
  262 | });
  263 | 
  264 | test("wrong member detail blocks dispatch and retains unsaved text", async ({
  265 |   page,
  266 | }) => {
  267 |   const { writes } = await setup(page);
  268 |   await page.route(detailEndpoint, (route) =>
  269 |     fulfill(route, { ...detail, id: "member-other" }),
  270 |   );
```