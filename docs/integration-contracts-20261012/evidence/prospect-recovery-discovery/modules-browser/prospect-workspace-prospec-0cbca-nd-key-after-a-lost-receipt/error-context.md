# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: prospect-workspace.spec.ts >> prospect creation recovers its original seed and key after a lost receipt
- Location: test/browser/prospect-workspace.spec.ts:41:1

# Error details

```
Error: expect(received).toHaveLength(expected)

Expected length: 2
Received length: 1
Received array:  [{"body": {"body": {"docTitle": "Synthetic prospect document", "prospectId": "30000000-0000-4000-8000-000000000001", "requestId": "d0a6bfde-2451-4b76-885e-54647f3f8b58"}}, "key": "workspace.prospect.create"}]
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
        - status [ref=e85]:
          - paragraph [ref=e86]: Checking saved prospect edits…
          - button "← Workspace" [ref=e87] [cursor=pointer]
  - paragraph [ref=e88]: Explicit local test fixture · synthetic identity and records
```

# Test source

```ts
  1   | import { test, expect, type Page } from "@playwright/test";
  2   | import { onlyLocalRequests, operationFixtures } from "./fixtures";
  3   | import { moduleRouteFixtures } from "./module-route-fixtures";
  4   | import {
  5   |   draft,
  6   |   prospectId,
  7   |   otherId,
  8   | } from "../../tests/prospect-resources-fixtures";
  9   | const base = `/modules/workspace?prospectId=${prospectId}`;
  10  | const detail = `${base}&draftId=${draft.id}`;
  11  | const version = {
  12  |   id: otherId,
  13  |   draftId: draft.id,
  14  |   label: "Manual save",
  15  |   authorId: "test-user",
  16  |   authorKind: "human",
  17  |   createdAt: "2026-10-12T12:01:00Z",
  18  | };
  19  | async function setup(page: Page) {
  20  |   await onlyLocalRequests(page);
  21  |   const errors: string[] = [];
  22  |   page.on("pageerror", (error) => errors.push(error.message));
  23  |   await operationFixtures(page, {
  24  |     ...moduleRouteFixtures,
  25  |     "workspace.prospect.drafts": { drafts: [] },
  26  |     "workspace.draft": draft,
  27  |     "workspace.draft.versions": [version],
  28  |   });
  29  |   const writes: { key: string; body: unknown }[] = [];
  30  |   page.on("request", (request) => {
  31  |     if (request.url().includes("/api/capiro/") && request.method() !== "GET")
  32  |       writes.push({
  33  |         key: decodeURIComponent(
  34  |           new URL(request.url()).pathname.split("/").pop()!,
  35  |         ),
  36  |         body: request.postDataJSON(),
  37  |       });
  38  |   });
  39  |   return { writes, errors };
  40  | }
  41  | test("prospect creation recovers its original seed and key after a lost receipt", async ({
  42  |   page,
  43  | }) => {
  44  |   const { writes, errors } = await setup(page);
  45  |   let attempts = 0;
  46  |   await page.route("**/api/capiro/workspace.prospect.create", (route) =>
  47  |     ++attempts === 1
  48  |       ? route.abort("connectionreset")
  49  |       : route.fulfill({ json: draft }),
  50  |   );
  51  |   await page.goto(base);
  52  |   await page.getByLabel("New prospect document title").fill(draft.docTitle);
  53  |   await page.getByRole("button", { name: "Create manual draft" }).click();
  54  |   await expect(
  55  |     page.getByRole("button", { name: "Recover original draft" }),
  56  |   ).toBeEnabled();
  57  |   await page.getByRole("button", { name: "Refresh documents" }).click();
  58  |   await expect(
  59  |     page.getByRole("button", { name: "Recover original draft" }),
  60  |   ).toBeEnabled();
  61  |   await page.getByRole("button", { name: "Recover original draft" }).click();
  62  |   await expect(page.getByLabel("Document title")).toHaveValue(draft.docTitle);
> 63  |   expect(writes).toHaveLength(2);
      |                  ^ Error: expect(received).toHaveLength(expected)
  64  |   expect(writes[0]!.body).toEqual(writes[1]!.body);
  65  |   expect(writes[0]!.body).toEqual({
  66  |     body: {
  67  |       prospectId,
  68  |       docTitle: draft.docTitle,
  69  |       requestId: expect.stringMatching(/^[a-f0-9-]{36}$/),
  70  |     },
  71  |   });
  72  |   expect(errors).toEqual([]);
  73  | });
  74  | test("manual content, version history and exports use only reviewed draft operations", async ({
  75  |   page,
  76  | }) => {
  77  |   const { writes, errors } = await setup(page);
  78  |   let current = structuredClone(draft);
  79  |   await page.route("**/api/capiro/workspace.draft?*", (route) =>
  80  |     route.fulfill({ json: current }),
  81  |   );
  82  |   await page.route("**/api/capiro/workspace.draft.update", (route) => {
  83  |     const { body } = route.request().postDataJSON();
  84  |     current = {
  85  |       ...current,
  86  |       docTitle: body.docTitle,
  87  |       config: body.config,
  88  |       updatedAt: "2026-10-12T12:01:00Z",
  89  |     };
  90  |     return route.fulfill({ json: current });
  91  |   });
  92  |   await page.route("**/api/capiro/workspace.draft.snapshot", (route) =>
  93  |     route.fulfill({ json: version }),
  94  |   );
  95  |   await page.route("**/api/capiro/workspace.draft.pdf?*", (route) =>
  96  |     route.fulfill({
  97  |       status: 200,
  98  |       contentType: "application/pdf",
  99  |       body: Buffer.from("%PDF-1.4\nsynthetic fixture"),
  100 |     }),
  101 |   );
  102 |   await page.goto(detail);
  103 |   await page.getByLabel("Body content").fill("Manually written prospect text.");
  104 |   await page.getByRole("button", { name: "Save draft", exact: true }).click();
  105 |   await expect.poll(() => writes.length).toBe(2);
  106 |   await expect(page.getByLabel("Body content")).toHaveValue(
  107 |     "Manually written prospect text.",
  108 |   );
  109 |   expect(writes.map((write) => write.key)).toEqual([
  110 |     "workspace.draft.update",
  111 |     "workspace.draft.snapshot",
  112 |   ]);
  113 |   await page.getByRole("button", { name: "History", exact: true }).click();
  114 |   await expect(page.getByRole("dialog")).toContainText("Manual save");
  115 |   await page.keyboard.press("Escape");
  116 |   const download = page.waitForEvent("download");
  117 |   await page.getByRole("button", { name: "Export saved PDF" }).click();
  118 |   expect((await download).suggestedFilename()).toBe("workspace-document.pdf");
  119 |   expect(errors).toEqual([]);
  120 |   expect(writes).toHaveLength(2);
  121 | });
  122 | test("an uncertain save retains edits across navigation and requires read-back before explicit save", async ({
  123 |   page,
  124 | }) => {
  125 |   const { writes } = await setup(page);
  126 |   await page.route("**/api/capiro/workspace.draft.update", (route) =>
  127 |     route.abort("connectionreset"),
  128 |   );
  129 |   await page.goto(detail);
  130 |   await page.getByLabel("Body content").fill("Keep this draft");
  131 |   await page.getByRole("button", { name: "Save draft", exact: true }).click();
  132 |   await expect(page.getByText(/previous save is not confirmed/)).toBeVisible();
  133 |   await expect(
  134 |     page.getByRole("button", { name: "Save draft", exact: true }),
  135 |   ).toBeDisabled();
  136 |   await page.getByRole("button", { name: "← Workspace", exact: true }).click();
  137 |   await page.goBack();
  138 |   await expect(page.getByLabel("Body content")).toHaveValue("Keep this draft");
  139 |   await expect(
  140 |     page.getByRole("button", { name: "Save draft", exact: true }),
  141 |   ).toBeDisabled();
  142 |   expect(writes).toHaveLength(1);
  143 |   await page.getByRole("button", { name: "Read current document" }).click();
  144 |   await expect(
  145 |     page.getByRole("button", { name: "Save draft", exact: true }),
  146 |   ).toBeEnabled();
  147 |   expect(writes).toHaveLength(1);
  148 | });
  149 | for (const field of ["prospectId", "tenantId"] as const)
  150 |   test(`a wrong ${field} never exposes the document or writes`, async ({
  151 |     page,
  152 |   }) => {
  153 |     const { writes } = await setup(page);
  154 |     await page.route("**/api/capiro/workspace.draft?*", (route) =>
  155 |       route.fulfill({ json: { ...draft, [field]: otherId } }),
  156 |     );
  157 |     await page.goto(detail);
  158 |     await expect(page.getByRole("main").getByRole("alert")).toContainText(
  159 |       "does not match",
  160 |     );
  161 |     await expect(page.getByLabel("Document title")).toHaveCount(0);
  162 |     expect(writes).toEqual([]);
  163 |   });
```