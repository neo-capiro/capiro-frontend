# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: prospect-draft-restart-acceptance.spec.ts >> lost prospect draft creation retains its original request through reload rather than creating a duplicate draft
- Location: test/browser/prospect-draft-restart-acceptance.spec.ts:6:1

# Error details

```
Error: expect(received).toHaveLength(expected)

Expected length: 2
Received length: 1
Received array:  [{"docTitle": "Independent uncertain prospect draft", "prospectId": "30000000-0000-4000-8000-000000000001", "requestId": "d81dd602-0895-4460-81f0-a8a6feb38d5f"}]
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
              - button "← Workspace" [ref=e88] [cursor=pointer]
              - heading "Independent uncertain prospect draft" [level=1] [ref=e89]
              - paragraph [ref=e90]: Document · Firm
            - generic [ref=e91]:
              - button "History" [ref=e92] [cursor=pointer]
              - button "Save draft" [ref=e93] [cursor=pointer]
          - paragraph [ref=e94]: "Immutable prospect origin: 30000000-0000-4000-8000-000000000001. Manual edits only."
          - button "Read current document" [ref=e95] [cursor=pointer]
          - generic [ref=e96]:
            - button "Export saved PDF" [ref=e97] [cursor=pointer]
            - button "Export saved DOCX" [ref=e98] [cursor=pointer]
            - paragraph [ref=e99]: Exports contain saved content. Sharing, sending and generation remain unavailable.
          - generic [ref=e100]:
            - generic [ref=e101]: Document title
            - textbox "Document title" [ref=e102]: Independent uncertain prospect draft
          - generic [ref=e103]:
            - heading "Body" [level=2] [ref=e106]
            - textbox "Body content" [ref=e107]
  - paragraph [ref=e108]: Explicit local test fixture · synthetic identity and records
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | import { randomUUID } from "node:crypto";
  3  | import { onlyLocalRequests, operationFixtures } from "./fixtures";
  4  | import { moduleRouteFixtures } from "./module-route-fixtures";
  5  | import { draft, prospectId } from "../../tests/prospect-resources-fixtures";
  6  | test("lost prospect draft creation retains its original request through reload rather than creating a duplicate draft", async ({
  7  |   page,
  8  | }) => {
  9  |   await onlyLocalRequests(page);
  10 |   const records = new Map<string, typeof draft>(),
  11 |     posts: unknown[] = [];
  12 |   await operationFixtures(page, {
  13 |     ...moduleRouteFixtures,
  14 |     "workspace.prospect.drafts": () => ({
  15 |       drafts: [...records.values()].map((record) => ({
  16 |         ...record,
  17 |         versions: [],
  18 |       })),
  19 |     }),
  20 |     "workspace.draft": (input: any) =>
  21 |       [...records.values()].find((record) => record.id === input.params.id),
  22 |     "workspace.draft.versions": [],
  23 |   });
  24 |   await page.route("**/api/capiro/workspace.prospect.create", async (route) => {
  25 |     const { body } = route.request().postDataJSON();
  26 |     posts.push(body);
  27 |     if (!records.has(body.requestId)) {
  28 |       const id = randomUUID();
  29 |       records.set(body.requestId, {
  30 |         ...structuredClone(draft),
  31 |         id,
  32 |         docTitle: body.docTitle,
  33 |         documents: [{ ...draft.documents[0]!, id: randomUUID(), draftId: id }],
  34 |       });
  35 |     }
  36 |     if (posts.length === 1)
  37 |       return route.fulfill({
  38 |         status: 503,
  39 |         json: { message: "Synthetic response lost AFTER draft commit" },
  40 |       });
  41 |     return route.fulfill({ json: records.get(body.requestId) });
  42 |   });
  43 |   await page.goto(`/modules/workspace?prospectId=${prospectId}`);
  44 |   await page
  45 |     .getByLabel("New prospect document title")
  46 |     .fill("Independent uncertain prospect draft");
  47 |   await page
  48 |     .getByRole("button", { name: "Create manual draft", exact: true })
  49 |     .click();
  50 |   await expect(
  51 |     page.getByRole("button", { name: "Recover original draft", exact: true }),
  52 |   ).toBeEnabled();
  53 |   expect(records.size).toBe(1);
  54 |   await page.reload();
  55 |   await expect(page.getByLabel("New prospect document title")).toHaveValue(
  56 |     "Independent uncertain prospect draft",
  57 |   );
  58 |   await expect(
  59 |     page.getByRole("button", { name: "Recover original draft", exact: true }),
  60 |   ).toBeEnabled();
  61 |   expect(posts).toHaveLength(1);
  62 |   await page
  63 |     .getByRole("button", { name: "Recover original draft", exact: true })
  64 |     .click();
  65 |   await expect(page.getByLabel("Document title")).toHaveValue(
  66 |     "Independent uncertain prospect draft",
  67 |   );
> 68 |   expect(posts).toHaveLength(2);
     |                 ^ Error: expect(received).toHaveLength(expected)
  69 |   expect(posts[0]).toEqual(posts[1]);
  70 |   expect(
  71 |     records.size,
  72 |     "a replacement key cannot recover an uncertain original draft",
  73 |   ).toBe(1);
  74 | });
  75 | 
```