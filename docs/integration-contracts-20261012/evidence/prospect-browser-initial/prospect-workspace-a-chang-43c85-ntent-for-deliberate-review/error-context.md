# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: prospect-workspace.spec.ts >> a changed document blocks PATCH and shows the saved content for deliberate review
- Location: test/browser/prospect-workspace.spec.ts:178:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByText('Current saved content', { exact: true })

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
              - heading "Synthetic prospect document" [level=1] [ref=e89]
              - paragraph [ref=e90]: Document · Firm
            - generic [ref=e91]:
              - button "History" [ref=e92] [cursor=pointer]
              - button "Save draft" [ref=e93] [cursor=pointer]
          - paragraph [ref=e94]: "Immutable prospect origin: 30000000-0000-4000-8000-000000000001. Manual edits only."
          - status [ref=e95]: "Current document read: Synthetic prospect document, updated 2026-10-12T12:02:00Z. Your edits are retained. Review them before a deliberate save; content and version writes are separate operations."
          - button "Read current document" [ref=e96] [cursor=pointer]
          - generic [ref=e97]:
            - button "Export saved PDF" [ref=e98] [cursor=pointer]
            - button "Export saved DOCX" [ref=e99] [cursor=pointer]
            - paragraph [ref=e100]: Exports contain saved content. Sharing, sending and generation remain unavailable.
          - generic [ref=e101]:
            - generic [ref=e102]: Document title
            - textbox "Document title" [ref=e103]: Synthetic prospect document
          - generic [ref=e104]:
            - heading "Body" [level=2] [ref=e107]
            - textbox "Body content" [ref=e108]: My text
  - paragraph [ref=e109]: Explicit local test fixture · synthetic identity and records
```

# Test source

```ts
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
  164 | test("prospect Newsletter origin cannot open its sending workflow", async ({
  165 |   page,
  166 | }) => {
  167 |   const { writes } = await setup(page);
  168 |   await page.route("**/api/capiro/workspace.draft?*", (route) =>
  169 |     route.fulfill({ json: { ...draft, product: "Newsletter" } }),
  170 |   );
  171 |   await page.goto(`/modules/workspace?draftId=${draft.id}`);
  172 |   await expect(page.getByText(/Immutable prospect origin/)).toBeVisible();
  173 |   await expect(
  174 |     page.getByRole("button", { name: /send|generat|share/i }),
  175 |   ).toHaveCount(0);
  176 |   expect(writes).toEqual([]);
  177 | });
  178 | test("a changed document blocks PATCH and shows the saved content for deliberate review", async ({
  179 |   page,
  180 | }) => {
  181 |   const { writes } = await setup(page);
  182 |   let reads = 0;
  183 |   await page.route("**/api/capiro/workspace.draft?*", (route) =>
  184 |     route.fulfill({
  185 |       json:
  186 |         ++reads === 1
  187 |           ? draft
  188 |           : {
  189 |               ...draft,
  190 |               updatedAt: "2026-10-12T12:02:00Z",
  191 |               config: {
  192 |                 sections: ["Body"],
  193 |                 sectionContent: { Body: "Another editor's text" },
  194 |               },
  195 |             },
  196 |     }),
  197 |   );
  198 |   await page.goto(detail);
  199 |   await page.getByLabel("Body content").fill("My text");
  200 |   await page.getByRole("button", { name: "Save draft", exact: true }).click();
  201 |   await expect(page.getByRole("alert")).toContainText("changed since");
  202 |   expect(writes).toEqual([]);
  203 |   await page.getByRole("button", { name: "Read current document" }).click();
> 204 |   await page.getByText("Current saved content", { exact: true }).click();
      |                                                                  ^ Error: locator.click: Test timeout of 30000ms exceeded.
  205 |   await expect(
  206 |     page.getByText("Another editor's text", { exact: true }),
  207 |   ).toBeVisible();
  208 |   await expect(page.getByLabel("Body content")).toHaveValue("My text");
  209 | });
  210 | test("mobile prospect manual editor preserves keyboard fields and stays in the viewport", async ({
  211 |   page,
  212 | }) => {
  213 |   await setup(page);
  214 |   await page.setViewportSize({ width: 390, height: 844 });
  215 |   await page.emulateMedia({ colorScheme: "dark" });
  216 |   await page.goto(detail);
  217 |   await page.getByLabel("Document title").focus();
  218 |   await expect(page.getByLabel("Document title")).toBeFocused();
  219 |   await page.getByLabel("Body content").fill("Manual only");
  220 |   expect(
  221 |     await page.evaluate(
  222 |       () => document.documentElement.scrollWidth <= innerWidth,
  223 |     ),
  224 |   ).toBe(true);
  225 |   await page.screenshot({
  226 |     path: "test-results/prospect-workspace-mobile.png",
  227 |     fullPage: true,
  228 |   });
  229 | });
  230 | 
```