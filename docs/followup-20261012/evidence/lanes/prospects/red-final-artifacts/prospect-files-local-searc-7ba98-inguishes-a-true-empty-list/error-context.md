# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: prospect-files-local-search.spec.ts >> search distinguishes a true empty list
- Location: apps/web/tests/browser/prospect-files-local-search.spec.ts:147:3

# Error details

```
Error: expect(locator).toBeEnabled() failed

Locator: getByRole('region', { name: 'Prospect files', exact: true }).getByRole('searchbox', { name: 'Search files' })
Expected: enabled
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeEnabled" with timeout 5000ms
  - waiting for getByRole('region', { name: 'Prospect files', exact: true }).getByRole('searchbox', { name: 'Search files' })

```

```yaml
- link "Skip to content":
  - /url: "#main"
- banner:
  - link "Capiro Home":
    - /url: /
    - img "Capiro"
  - navigation "Workspace":
    - link "Meri":
      - /url: /meri
    - link "Portfolio":
      - /url: /
    - link "Modules":
      - /url: /modules
  - navigation "Global actions":
    - link "Quick log":
      - /url: /portfolio?log=1
    - link "Master calendar":
      - /url: /calendar
    - link "Search Portfolio":
      - /url: /portfolio?search=1
    - button "Updates unavailable" [disabled]
    - button "Test account": T
- complementary "Portfolio navigation":
  - paragraph: Portfolio
  - navigation "Portfolio":
    - link "Portfolio Overview":
      - /url: /portfolio
      - text: Overview
    - link "Portfolio Clients":
      - /url: /portfolio?type=CLIENT
      - text: Clients
    - link "Portfolio Prospects":
      - /url: /portfolio/prospects
      - text: Prospects
  - link "Settings":
    - /url: /settings
- main:
  - navigation "Breadcrumb":
    - link "← Prospects":
      - /url: /portfolio/prospects
    - text: / Test Prospect
  - text: TP
  - heading "Test Prospect" [level=1]
  - text: Prospect
  - 'button "Stage: Proposal"': Stage Proposal
  - button "Link existing client"
  - button "Edit details"
  - paragraph: Synthetic prospect for isolated validation.
  - link "https://prospect.test ↗":
    - /url: https://prospect.test/
  - paragraph: Focus Advocacy
  - separator
  - text: Owner Unassigned Added 10/1/2026 Virginia
  - heading "Pipeline stage" [level=2]
  - button "Change stage"
  - paragraph: Stage updates are currently unavailable. Your existing stage is preserved.
  - region "Prospect activity":
    - heading "Activity" [level=2]
    - button "Refresh activity"
    - group "Prospect activity type":
      - button "All" [pressed]
    - paragraph: No activity yet.
  - region "Federal strategy brief":
    - heading "Federal strategy brief" [level=2]
    - paragraph: A saved, versioned brief from the prospect’s authorized dossier evidence.
    - paragraph: No brief has been saved yet.
    - button "Generate from dossier"
    - text: Workspace filing and candidate objectives require separate supported workflows.
  - region "Prospect files":
    - heading "Files" [level=2]
    - paragraph: Files retain this prospect as their origin after conversion.
    - button "Refresh files"
    - list
    - paragraph: No files are available for this prospect.
    - text: Preview and download links expire after five minutes. Refresh Files to request current links. Upload prospect file
    - button "Upload prospect file"
    - button "Upload file" [disabled]
    - button "Sharing unavailable" [disabled]
    - button "Sending unavailable" [disabled]
    - button "Text import unavailable" [disabled]
    - text: These files cannot be copied into client libraries, Outreach, Meri or generation workflows.
  - region "Prospect Workspace":
    - heading "Workspace documents" [level=2]
    - paragraph: Open this prospect’s manual drafts, saved versions and exports. Documents retain their prospect origin after conversion.
    - link "Open prospect Workspace":
      - /url: /modules/workspace?prospectId=70000000-0000-4000-8000-000000000001
    - text: Sharing, sending and generation are unavailable for prospect documents.
  - region "Proposal":
    - heading "Proposal" [level=2]
    - paragraph: Review available templates in Workspace. Creating and sending a proposal for this prospect is unavailable.
    - button "Browse templates"
    - text: Proposal documents and send history cannot be linked to this prospect yet.
  - heading "Next step" [level=2]
  - button "Edit"
  - paragraph: Review proposal
  - time: Due 11/5/2026, 2:00:00 PM
  - text: Owner Unassigned
  - region "Prospect contacts":
    - heading "Contacts" [level=2]
    - button "+ Add" [disabled]
    - status: Prospect contacts are unavailable for this account or service. No contact changes can be saved.
  - region "Prospect notes":
    - heading "Notes" [level=2]
    - button "+ Add note"
    - text: Shared with your firm.
    - paragraph: No notes yet.
  - button "Archive prospect"
```

# Test source

```ts
  54  |     release = resolve;
  55  |   });
  56  |   return { promise, release };
  57  | }
  58  | async function setup(
  59  |   page: Page,
  60  |   initial: ProspectAttachment[] = [ready, pending],
  61  | ) {
  62  |   const unexpected = await installFixtures(page);
  63  |   await page.clock.setFixedTime(new Date("2026-10-12T12:00:00Z"));
  64  |   const state = {
  65  |     records: initial,
  66  |     member: { ...actor },
  67  |     status: 200,
  68  |     listGate: undefined as ReturnType<typeof deferred> | undefined,
  69  |     identityGate: undefined as ReturnType<typeof deferred> | undefined,
  70  |     reads: [] as string[],
  71  |     writes: [] as string[],
  72  |   };
  73  |   page.on("request", (request) => {
  74  |     if (request.url().includes("/api/backend/") && request.method() !== "GET")
  75  |       state.writes.push(request.url());
  76  |   });
  77  |   await page.route("**/api/backend/core/me", async (route) => {
  78  |     await state.identityGate?.promise;
  79  |     await json(route, {
  80  |       user: { id: state.member.userId, email: "synthetic@example.test" },
  81  |       tenant: { id: state.member.tenantId, name: "Synthetic firm" },
  82  |       role: "user_admin",
  83  |     });
  84  |   });
  85  |   await page.route(
  86  |     "**/api/backend/core/engagement/attachments?prospectId=*",
  87  |     async (route) => {
  88  |       state.reads.push(route.request().url());
  89  |       await state.listGate?.promise;
  90  |       await json(
  91  |         route,
  92  |         state.status === 200
  93  |           ? state.records
  94  |           : { error: "Current files unavailable" },
  95  |         state.status,
  96  |       );
  97  |     },
  98  |   );
  99  |   return { state, unexpected };
  100 | }
  101 | 
  102 | test("loaded file search filters case-insensitively, trims and clears without requests or changing readiness", async ({
  103 |   page,
  104 | }, testInfo) => {
  105 |   const { state, unexpected } = await setup(page);
  106 |   await openFiles(page);
  107 |   const area = files(page);
  108 |   await expect(area.getByText(ready.fileName, { exact: true })).toBeVisible();
  109 |   const search = area.getByRole("searchbox", { name: "Search files" });
  110 |   await expect(search).toBeVisible();
  111 |   const reads = state.reads.length;
  112 |   await search.fill("  aGeNcY  ");
  113 |   await expect(area.locator("li strong")).toHaveText([ready.fileName]);
  114 |   await expect(
  115 |     area.getByRole("link", { name: `Preview ${ready.fileName}` }),
  116 |   ).toHaveAttribute("href", ready.previewUrl!);
  117 |   await expect(
  118 |     area.getByRole("link", { name: `Download ${ready.fileName}` }),
  119 |   ).toHaveAttribute("href", ready.downloadUrl!);
  120 |   await area.getByRole("button", { name: "Clear file search" }).click();
  121 |   await expect(search).toHaveValue("");
  122 |   await expect(area.locator("li strong")).toHaveText([
  123 |     ready.fileName,
  124 |     pending.fileName,
  125 |   ]);
  126 |   await search.fill("notes");
  127 |   await expect(area.locator("li strong")).toHaveText([pending.fileName]);
  128 |   await expect(area.getByText(/Pending content checks/)).toBeVisible();
  129 |   await expect(
  130 |     area.getByRole("link", { name: /Preview|Download/ }),
  131 |   ).toHaveCount(0);
  132 |   await area.screenshot({ path: testInfo.outputPath("search-desktop.png") });
  133 |   await page.setViewportSize({ width: 390, height: 844 });
  134 |   await expect(search).toBeVisible();
  135 |   await area.screenshot({ path: testInfo.outputPath("search-mobile.png") });
  136 |   expect(
  137 |     await page.evaluate(
  138 |       () => document.documentElement.scrollWidth <= innerWidth,
  139 |     ),
  140 |   ).toBe(true);
  141 |   expect(state.reads).toHaveLength(reads);
  142 |   expect(state.writes).toEqual([]);
  143 |   expect(unexpected).toEqual([]);
  144 | });
  145 | 
  146 | for (const empty of [false, true])
  147 |   test(`search distinguishes ${empty ? "a true empty list" : "no matching files"}`, async ({
  148 |     page,
  149 |   }) => {
  150 |     const { state } = await setup(page, empty ? [] : [ready, pending]);
  151 |     await openFiles(page);
  152 |     const area = files(page);
  153 |     const search = area.getByRole("searchbox", { name: "Search files" });
> 154 |     await expect(search).toBeEnabled();
      |                          ^ Error: expect(locator).toBeEnabled() failed
  155 |     await search.fill("unmatched filename");
  156 |     await expect(
  157 |       area.getByText(
  158 |         empty
  159 |           ? "No files are available for this prospect."
  160 |           : "No files match your search.",
  161 |         { exact: true },
  162 |       ),
  163 |     ).toBeVisible();
  164 |     await expect(
  165 |       area.getByText(
  166 |         empty
  167 |           ? "No files match your search."
  168 |           : "No files are available for this prospect.",
  169 |         { exact: true },
  170 |       ),
  171 |     ).toHaveCount(0);
  172 |     await expect(area.getByLabel("Upload prospect file")).toBeEnabled();
  173 |     await area.getByRole("button", { name: "Clear file search" }).click();
  174 |     await expect(area.locator("li strong")).toHaveCount(empty ? 0 : 2);
  175 |     expect(state.writes).toEqual([]);
  176 |   });
  177 | 
  178 | for (const status of [403, 503])
  179 |   test(`a ${status} current file read conceals filtered results until successful recovery`, async ({
  180 |     page,
  181 |   }) => {
  182 |     const { state } = await setup(page);
  183 |     await openFiles(page);
  184 |     const area = files(page);
  185 |     const search = area.getByRole("searchbox", { name: "Search files" });
  186 |     await search.fill("agency");
  187 |     await expect(area.locator("li strong")).toHaveText([ready.fileName]);
  188 |     state.status = status;
  189 |     state.listGate = deferred();
  190 |     await area.getByRole("button", { name: "Refresh files" }).click();
  191 |     await expect(search).toBeDisabled();
  192 |     await expect(area.locator("li")).toHaveCount(0);
  193 |     state.listGate.release();
  194 |     await expect(area.getByRole("alert")).toBeVisible();
  195 |     await expect(
  196 |       area.getByRole("link", { name: /Preview|Download/ }),
  197 |     ).toHaveCount(0);
  198 |     await expect(area.getByText(/No files (match|are available)/)).toHaveCount(
  199 |       0,
  200 |     );
  201 |     state.status = 200;
  202 |     state.records = [{ ...pending, fileName: "Agency revision.txt" }];
  203 |     state.listGate = deferred();
  204 |     await area.getByRole("button", { name: "Refresh files" }).click();
  205 |     await expect(search).toBeDisabled();
  206 |     await expect(area.locator("li")).toHaveCount(0);
  207 |     state.listGate.release();
  208 |     await expect(search).toBeEnabled();
  209 |     await expect(area.locator("li strong")).toHaveText(["Agency revision.txt"]);
  210 |     expect(state.writes).toEqual([]);
  211 |   });
  212 | 
  213 | for (const key of ["userId", "tenantId"] as const)
  214 |   test(`${key} replacement discards the prior file search and results`, async ({
  215 |     page,
  216 |   }) => {
  217 |     const { state } = await setup(page);
  218 |     await openFiles(page);
  219 |     const area = files(page);
  220 |     const search = area.getByRole("searchbox", { name: "Search files" });
  221 |     await search.fill("agency");
  222 |     await expect(area.locator("li strong")).toHaveText([ready.fileName]);
  223 |     state.member[key] = otherId;
  224 |     state.records = [
  225 |       {
  226 |         ...pending,
  227 |         tenantId: state.member.tenantId,
  228 |         fileName: "Replacement member file.txt",
  229 |       },
  230 |     ];
  231 |     state.identityGate = deferred();
  232 |     await page.clock.setFixedTime(new Date("2026-10-12T12:00:31Z"));
  233 |     await page.evaluate(() => dispatchEvent(new Event("offline")));
  234 |     await page.evaluate(() => dispatchEvent(new Event("online")));
  235 |     await expect(
  236 |       area.getByText(/require current prospect access/),
  237 |     ).toBeVisible();
  238 |     await expect(area.locator("li")).toHaveCount(0);
  239 |     state.identityGate.release();
  240 |     await expect(search).toBeEnabled();
  241 |     await expect(search).toHaveValue("");
  242 |     await expect(area.locator("li strong")).toHaveText([
  243 |       "Replacement member file.txt",
  244 |     ]);
  245 |     expect(state.writes).toEqual([]);
  246 |   });
  247 | 
  248 | test("prospect route replacement starts with a clear search and only the new current collection", async ({
  249 |   page,
  250 | }) => {
  251 |   const { state } = await setup(page);
  252 |   await openFiles(page);
  253 |   const area = files(page);
  254 |   await area.getByRole("searchbox", { name: "Search files" }).fill("agency");
```