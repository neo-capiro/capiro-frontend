# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: newsletter-document-navigation.spec.ts >> rich pending stage stays fenced across history navigation and late 503
- Location: apps/web/test/browser/newsletter-document-navigation.spec.ts:67:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.goBack: Test timeout of 30000ms exceeded.
Call log:
  - waiting for navigation until "load"

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
            - button "Close preview" [disabled] [ref=e91]
          - region "Saved newsletter documents" [ref=e92]:
            - heading "Saved newsletter documents" [level=2] [ref=e93]
            - paragraph [ref=e94]: Loading the library or opening a document may activate an access invitation. These requests run only when you choose an action below. Library access does not imply that every document belongs to the selected client.
            - group [ref=e95]:
              - generic [ref=e96]:
                - button "Load saved newsletters" [disabled] [ref=e97]
                - button "Create saved document" [disabled] [ref=e98]
                - button "Read current saved document" [disabled] [ref=e99]
                - button "Save newsletter" [disabled] [ref=e100]
                - button "Preview saved state" [disabled] [ref=e101]
                - button "Stage newsletter" [disabled] [ref=e102]
              - generic [ref=e103]:
                - heading "Current library response" [level=3] [ref=e104]
                - list [ref=e105]:
                  - listitem [ref=e106]:
                    - text: Synthetic saved newsletter · revision 4 · Assigned client
                    - button "Review Synthetic saved newsletter" [disabled] [ref=e107]
            - paragraph [ref=e108]: "Current saved baseline: Synthetic saved newsletter · revision 4. Local content matches this baseline."
            - status [ref=e109]: stage in progress…
            - alert [ref=e110]: This saved revision has an uncertain stage attempt. Document readback cannot recover its missing stage ID; this revision will not be staged again here.
            - generic [ref=e111]:
              - generic [ref=e112]:
                - button "Collaboration and uploads" [disabled] [ref=e113]
                - generic [ref=e114]: Collaboration and asset operations are not included in this saved-document contract.
              - generic [ref=e115]:
                - button "Generate or send newsletter" [disabled] [ref=e116]
                - generic [ref=e117]: Generation, account review, prepare, test and delivery require separate supported operations and explicit intent.
          - group [ref=e118]:
            - generic [ref=e119]:
              - button "Undo" [disabled] [ref=e120]
              - button "Redo" [disabled] [ref=e121]
              - button "Mobile preview" [disabled] [ref=e122]
              - button "Plain text" [disabled] [ref=e123]
            - generic [ref=e124]:
              - generic [ref=e125]:
                - generic [ref=e126]: Newsletter name
                - textbox "Newsletter name" [disabled] [ref=e127]: Synthetic saved newsletter
              - generic [ref=e128]:
                - generic [ref=e129]: Subject
                - textbox "Subject" [disabled] [ref=e130]: Saved subject
              - generic [ref=e131]:
                - generic [ref=e132]: Preview text
                - textbox "Preview text" [disabled] [ref=e133]
              - generic [ref=e134]:
                - generic [ref=e135]: From name
                - textbox "From name" [disabled] [ref=e136]
              - generic [ref=e137]:
                - generic [ref=e138]: Reply-to email
                - textbox "Reply-to email" [disabled] [ref=e139]
            - generic [ref=e140]:
              - navigation "Newsletter structure" [ref=e141]:
                - heading "Content" [level=2] [ref=e142]
                - generic [ref=e143]:
                  - heading "Header" [level=3] [ref=e144]
                  - list [ref=e145]:
                    - listitem [ref=e146]:
                      - button "Logo · YOUR FIRM" [disabled] [ref=e147]
                  - group [ref=e148]:
                    - generic "Add block to Header" [ref=e149] [cursor=pointer]
                - generic [ref=e150]:
                  - heading "Body" [level=3] [ref=e151]
                  - list [ref=e152]:
                    - listitem [ref=e153]:
                      - button "Heading · This week in policy" [disabled] [ref=e154]
                    - listitem [ref=e155]:
                      - button "Paragraph · Add your text here." [disabled] [ref=e156]
                  - group [ref=e157]:
                    - generic "Add block to Body" [ref=e158] [cursor=pointer]
                - generic [ref=e159]:
                  - heading "Footer" [level=3] [ref=e160]
                  - list [ref=e161]:
                    - listitem [ref=e162]:
                      - button "Footer" [disabled] [ref=e163]
                  - group [ref=e164]:
                    - generic "Add block to Footer" [ref=e165] [cursor=pointer]
                - paragraph [ref=e166]: Additional content tools, hosted surveys and product blocks are unavailable in this editor preview.
              - generic [ref=e167]:
                - paragraph [ref=e168]: Local preview · external images and links are disabled. Email clients may render differently.
                - iframe [ref=e169]:
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
              - complementary [ref=e170]:
                - heading "Block settings" [level=2] [ref=e171]
                - paragraph [ref=e172]: Select a block to edit its content and style.
  - paragraph [ref=e173]: Explicit local test fixture · synthetic identity and records
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | import {
  3   |   documentFixture,
  4   |   documentId,
  5   |   stageId,
  6   |   editorUrl,
  7   |   button,
  8   |   enterEditor,
  9   |   adoptDocument,
  10  |   closeAndReopen,
  11  |   heldResponse,
  12  |   expectIsolated,
  13  |   clientId,
  14  |   otherClientId,
  15  |   navigate,
  16  | } from "./newsletter-document-fixtures";
  17  | 
  18  | test("rich pending create remains fenced after history close/reopen and an empty library", async ({
  19  |   page,
  20  | }) => {
  21  |   const fixture = await documentFixture(page);
  22  |   await page.goto("/modules/workspace");
  23  |   await button(page, "Rich newsletter preview").click();
  24  |   await page.getByLabel("Newsletter name").fill("Private creation draft");
  25  |   const held = heldResponse();
  26  |   fixture.queue("create", async (route) => {
  27  |     await held.wait;
  28  |     await route.fulfill({
  29  |       status: 503,
  30  |       json: { message: "Lost create receipt" },
  31  |     });
  32  |     held.finished();
  33  |   });
  34  |   await button(page, "Create saved document").click();
  35  |   await expect(
  36  |     page.getByText("create in progress…", { exact: true }),
  37  |   ).toBeVisible();
  38  |   await expect(page.getByLabel("Newsletter name")).toBeDisabled();
  39  |   await expect(button(page, "Close preview")).toBeDisabled();
  40  |   await page.goBack();
  41  |   await expect(
  42  |     page.getByRole("heading", { name: "Workspace", exact: true }),
  43  |   ).toBeVisible();
  44  |   held.release();
  45  |   await held.settled;
  46  |   await button(page, "Rich newsletter preview").click();
  47  |   await expect(page.getByLabel("Newsletter name")).toHaveValue(
  48  |     "Untitled newsletter",
  49  |   );
  50  |   await expect(button(page, "Create saved document")).toBeDisabled();
  51  |   await expect(page.getByText(/Creation remains uncertain/)).toBeVisible();
  52  |   fixture.control.items = [];
  53  |   await button(page, "Load saved newsletters").click();
  54  |   await expect(page.getByText(/No documents were returned/)).toBeVisible();
  55  |   await expect(button(page, "Create saved document")).toBeDisabled();
  56  |   fixture.control.items = undefined;
  57  |   await adoptDocument(page);
  58  |   await expect(page.getByText(/Creation remains uncertain/)).toBeVisible();
  59  |   await closeAndReopen(page);
  60  |   await expect(button(page, "Create saved document")).toBeDisabled();
  61  |   expect(fixture.calls("create")).toHaveLength(1);
  62  |   expect(fixture.calls("save")).toEqual([]);
  63  |   expectIsolated(fixture);
  64  | });
  65  | 
  66  | for (const status of [200, 503]) {
  67  |   test(`rich pending stage stays fenced across history navigation and late ${status}`, async ({
  68  |     page,
  69  |   }) => {
  70  |     const fixture = await documentFixture(page);
  71  |     await page.goto("/modules/workspace");
  72  |     await button(page, "Rich newsletter preview").click();
  73  |     await adoptDocument(page);
  74  |     const held = heldResponse();
  75  |     fixture.queue("stage", async (route) => {
  76  |       await held.wait;
  77  |       await route.fulfill({
  78  |         status,
  79  |         json:
  80  |           status === 200
  81  |             ? {
  82  |                 id: stageId,
  83  |                 documentId,
  84  |                 revision: 4,
  85  |                 name: "Late stage",
  86  |                 createdAt: "2026-10-13T02:00:00.000Z",
  87  |                 route: `/engagement/outreach?newsletterStage=${stageId}`,
  88  |               }
  89  |             : { message: "Lost stage receipt" },
  90  |       });
  91  |       held.finished();
  92  |     });
  93  |     await button(page, "Stage newsletter").click();
  94  |     await expect(
  95  |       page.getByText("stage in progress…", { exact: true }),
  96  |     ).toBeVisible();
> 97  |     await page.goBack();
      |                ^ Error: page.goBack: Test timeout of 30000ms exceeded.
  98  |     await expect(
  99  |       page.getByRole("heading", { name: "Workspace", exact: true }),
  100 |     ).toBeVisible();
  101 |     held.release();
  102 |     await held.settled;
  103 |     await button(page, "Rich newsletter preview").click();
  104 |     fixture.control.current = {
  105 |       ...fixture.control.current,
  106 |       id: documentId.toUpperCase(),
  107 |     };
  108 |     await adoptDocument(page);
  109 |     await expect(button(page, "Stage newsletter")).toBeDisabled();
  110 |     await expect(
  111 |       page.getByText(/This saved revision has an uncertain stage attempt/),
  112 |     ).toBeVisible();
  113 |     await expect(page.getByText(/Stage .* received for document/)).toHaveCount(
  114 |       0,
  115 |     );
  116 |     await expect(page.locator(`a[href*="${stageId}"]`)).toHaveCount(0);
  117 |     expect(fixture.calls("stage")).toHaveLength(1);
  118 |     await expect(page).toHaveURL(editorUrl);
  119 |     expectIsolated(fixture);
  120 |   });
  121 | }
  122 | 
  123 | test("rich unknown save after reopen needs a successful owner read and separate adoption", async ({
  124 |   page,
  125 | }) => {
  126 |   const fixture = await documentFixture(page);
  127 |   await enterEditor(page);
  128 |   await adoptDocument(page);
  129 |   await page.getByLabel("Newsletter name").fill("Disposed private local edits");
  130 |   fixture.queue("save", (route) =>
  131 |     route.fulfill({ status: 503, json: { message: "Lost save receipt" } }),
  132 |   );
  133 |   await button(page, "Save newsletter").click();
  134 |   await expect(
  135 |     page.getByText(/Save could not be confirmed and will not be repeated/),
  136 |   ).toBeVisible();
  137 |   await closeAndReopen(page);
  138 |   fixture.queue("detail", (route) =>
  139 |     route.fulfill({ status: 403, json: { message: "Current detail denied" } }),
  140 |   );
  141 |   await button(page, "Load saved newsletters").click();
  142 |   await button(page, "Review Synthetic saved newsletter").click();
  143 |   await expect(page.getByText(/The current read failed/)).toBeVisible();
  144 |   await expect(
  145 |     page.getByRole("region", { name: "Review current saved newsletter" }),
  146 |   ).toHaveCount(0);
  147 |   await expect(button(page, "Save newsletter")).toBeDisabled();
  148 |   await expect(button(page, "Stage newsletter")).toBeDisabled();
  149 |   expect(fixture.calls("save")).toHaveLength(1);
  150 |   await button(page, "Review Synthetic saved newsletter").click();
  151 |   await expect(
  152 |     page.getByRole("region", { name: "Review current saved newsletter" }),
  153 |   ).toBeVisible();
  154 |   await expect(page.getByLabel("Newsletter name")).toHaveValue(
  155 |     "Untitled newsletter",
  156 |   );
  157 |   await expect(button(page, "Save newsletter")).toBeDisabled();
  158 |   await button(page, "Adopt saved document and replace local draft").click();
  159 |   await page.getByLabel("Newsletter name").fill("New deliberate save");
  160 |   await button(page, "Save newsletter").click();
  161 |   await expect(
  162 |     page.getByText("Saved revision 5.", { exact: true }),
  163 |   ).toBeVisible();
  164 |   expect(fixture.calls("save")).toHaveLength(2);
  165 |   expect(fixture.calls("save")[1]!.input).toMatchObject({
  166 |     body: { revision: 4, name: "New deliberate save" },
  167 |   });
  168 |   expectIsolated(fixture);
  169 | });
  170 | 
  171 | for (const replacement of ["client", "session"] as const) {
  172 |   test(`rich held save cannot restore prior private material after ${replacement} replacement`, async ({
  173 |     page,
  174 |   }) => {
  175 |     const fixture = await documentFixture(page);
  176 |     await enterEditor(page, `${editorUrl}&clientId=${clientId}`);
  177 |     await adoptDocument(page);
  178 |     await page.getByLabel("Newsletter name").fill("Private old scope draft");
  179 |     const held = heldResponse();
  180 |     fixture.queue("save", async (route) => {
  181 |       const submitted = route.request().postDataJSON().body;
  182 |       await held.wait;
  183 |       await route.fulfill({
  184 |         json: { ...fixture.control.current, ...submitted, revision: 5 },
  185 |       });
  186 |       held.finished();
  187 |     });
  188 |     await button(page, "Save newsletter").click();
  189 |     await expect(
  190 |       page.getByText("save in progress…", { exact: true }),
  191 |     ).toBeVisible();
  192 |     await expect(page.getByLabel("Newsletter name")).toBeDisabled();
  193 |     if (replacement === "client")
  194 |       await navigate(page, `${editorUrl}&clientId=${otherClientId}`);
  195 |     else
  196 |       await page.evaluate(() =>
  197 |         window.dispatchEvent(
```