# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: prospect-draft-pending-edit.spec.ts >> prospect fields freeze during held snapshot; failure preserves submitted text
- Location: apps/web/test/browser/prospect-draft-pending-edit.spec.ts:111:5

# Error details

```
Error: expect(locator).toBeDisabled() failed

Locator:  getByLabel('Document title', { exact: true })
Expected: disabled
Received: enabled
Timeout:  5000ms

Call log:
  - Expect "toBeDisabled" with timeout 5000ms
  - waiting for getByLabel('Document title', { exact: true })
    14 × locator resolved to <input maxlength="500" data-slot="input" id="workspace-document-title" value="Submitted prospect title" class="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:c…/>
       - unexpected value "enabled"

```

```yaml
- textbox "Document title": Submitted prospect title
```

# Test source

```ts
  17  |   id: otherId,
  18  |   draftId: draft.id,
  19  |   label: "Manual save",
  20  |   authorId: "test-user",
  21  |   authorKind: "human",
  22  |   createdAt: "2026-10-12T12:01:00Z",
  23  | };
  24  | type Phase = "update" | "snapshot";
  25  | type Outcome = "success" | "failure" | "lost receipt";
  26  | 
  27  | async function heldSave(
  28  |   page: Page,
  29  |   phase: Phase,
  30  |   outcome: Outcome = "success",
  31  | ) {
  32  |   await onlyLocalRequests(page);
  33  |   let current = {
  34  |     ...structuredClone(draft),
  35  |     config: {
  36  |       sections: ["Body", "Summary"],
  37  |       sectionContent: { Body: "", Summary: "" },
  38  |     },
  39  |   };
  40  |   await operationFixtures(page, {
  41  |     ...moduleRouteFixtures,
  42  |     "workspace.prospect.drafts": { drafts: [] },
  43  |     "workspace.draft": current,
  44  |     "workspace.draft.versions": [version],
  45  |   });
  46  |   const writes: string[] = [];
  47  |   let entered = false;
  48  |   let release!: () => void;
  49  |   const held = new Promise<void>((resolve) => {
  50  |     release = resolve;
  51  |   });
  52  |   await page.route("**/api/capiro/workspace.draft?*", (route) =>
  53  |     route.fulfill({ json: current }),
  54  |   );
  55  |   for (const operation of ["update", "snapshot"] as const)
  56  |     await page.route(
  57  |       `**/api/capiro/workspace.draft.${operation}`,
  58  |       async (route) => {
  59  |         writes.push(operation);
  60  |         if (operation === phase && !entered) {
  61  |           entered = true;
  62  |           await held;
  63  |           if (outcome === "failure")
  64  |             return route.fulfill({
  65  |               status: 500,
  66  |               json: { message: "Save failed" },
  67  |             });
  68  |           if (outcome === "lost receipt") return route.abort("connectionreset");
  69  |         }
  70  |         if (operation === "update") {
  71  |           const { body } = route.request().postDataJSON();
  72  |           current = {
  73  |             ...current,
  74  |             docTitle: body.docTitle,
  75  |             config: body.config,
  76  |             updatedAt: "2026-10-12T12:01:00Z",
  77  |           };
  78  |         }
  79  |         await route.fulfill({
  80  |           json: operation === "update" ? current : version,
  81  |         });
  82  |       },
  83  |     );
  84  |   return { writes, release, started: () => entered };
  85  | }
  86  | 
  87  | function fields(page: Page) {
  88  |   return [
  89  |     page.getByLabel("Document title", { exact: true }),
  90  |     page.getByLabel("Body content"),
  91  |     page.getByLabel("Summary content"),
  92  |   ];
  93  | }
  94  | async function beginSave(page: Page) {
  95  |   await page.goto(detail);
  96  |   const [title, body, summary] = fields(page);
  97  |   await title.fill(submitted.title);
  98  |   await body.fill(submitted.body);
  99  |   await summary.fill(submitted.summary);
  100 |   await page.getByRole("button", { name: "Save draft", exact: true }).click();
  101 | }
  102 | async function expectSubmitted(page: Page) {
  103 |   const [title, body, summary] = fields(page);
  104 |   await expect(title).toHaveValue(submitted.title);
  105 |   await expect(body).toHaveValue(submitted.body);
  106 |   await expect(summary).toHaveValue(submitted.summary);
  107 | }
  108 | 
  109 | for (const phase of ["update", "snapshot"] as const) {
  110 |   for (const outcome of ["success", "failure", "lost receipt"] as const) {
  111 |     test(`prospect fields freeze during held ${phase}; ${outcome} preserves submitted text`, async ({
  112 |       page,
  113 |     }) => {
  114 |       const control = await heldSave(page, phase, outcome);
  115 |       await beginSave(page);
  116 |       await expect.poll(control.started).toBe(true);
> 117 |       for (const field of fields(page)) await expect(field).toBeDisabled();
      |                                                             ^ Error: expect(locator).toBeDisabled() failed
  118 |       await expectSubmitted(page);
  119 |       control.release();
  120 |       const save = page.getByRole("button", {
  121 |         name: "Save draft",
  122 |         exact: true,
  123 |       });
  124 |       if (outcome === "success") {
  125 |         await expect(save).toBeEnabled();
  126 |         await expectSubmitted(page);
  127 |         expect(control.writes).toEqual(["update", "snapshot"]);
  128 |         await page.reload();
  129 |         await expectSubmitted(page);
  130 |         await expect(
  131 |           page.getByText(/previous save is not confirmed/),
  132 |         ).toHaveCount(0);
  133 |       } else {
  134 |         await expect(
  135 |           page.getByText(/previous save is not confirmed/),
  136 |         ).toBeVisible();
  137 |         await expect(save).toBeDisabled();
  138 |         const originalWrites =
  139 |           phase === "update" ? ["update"] : ["update", "snapshot"];
  140 |         expect(control.writes).toEqual(originalWrites);
  141 |         await page.reload();
  142 |         await expectSubmitted(page);
  143 |         await expect(save).toBeDisabled();
  144 |         await page
  145 |           .getByRole("button", { name: "Read current document" })
  146 |           .click();
  147 |         await expect(save).toBeEnabled();
  148 |         await expectSubmitted(page);
  149 |         expect(control.writes).toEqual(originalWrites);
  150 |         await save.click();
  151 |         await expect(save).toBeEnabled();
  152 |         expect(control.writes).toEqual([
  153 |           ...originalWrites,
  154 |           "update",
  155 |           "snapshot",
  156 |         ]);
  157 |       }
  158 |       for (const field of fields(page)) await expect(field).toBeEditable();
  159 |       await page.getByLabel("Body content").fill("Next deliberate edit");
  160 |       await expect(page.getByLabel("Body content")).toHaveValue(
  161 |         "Next deliberate edit",
  162 |       );
  163 |     });
  164 |   }
  165 | 
  166 |   test(`leaving during held ${phase} retains the original intent without continuing the old save`, async ({
  167 |     page,
  168 |   }) => {
  169 |     const control = await heldSave(page, phase);
  170 |     await beginSave(page);
  171 |     await expect.poll(control.started).toBe(true);
  172 |     for (const field of fields(page)) await expect(field).toBeDisabled();
  173 |     await page
  174 |       .getByRole("button", { name: "← Workspace", exact: true })
  175 |       .click();
  176 |     await expect(
  177 |       page.getByRole("heading", { name: "Prospect Workspace", exact: true }),
  178 |     ).toBeVisible();
  179 |     control.release();
  180 |     await page.goBack();
  181 |     await expectSubmitted(page);
  182 |     await expect(
  183 |       page.getByText(/previous save is not confirmed/),
  184 |     ).toBeVisible();
  185 |     await page.getByRole("button", { name: "Read current document" }).click();
  186 |     await expect(
  187 |       page.getByRole("button", { name: "Save draft", exact: true }),
  188 |     ).toBeEnabled();
  189 |     expect(control.writes).toEqual(
  190 |       phase === "update" ? ["update"] : ["update", "snapshot"],
  191 |     );
  192 |   });
  193 | }
  194 | 
  195 | for (const replacement of ["user", "tenant", "prospect"] as const)
  196 |   test(`a ${replacement} replacement during PATCH cannot restore or finish the former editor`, async ({
  197 |     page,
  198 |   }) => {
  199 |     const control = await heldSave(page, "update");
  200 |     await beginSave(page);
  201 |     await expect.poll(control.started).toBe(true);
  202 |     for (const field of fields(page)) await expect(field).toBeDisabled();
  203 |     if (replacement === "prospect") {
  204 |       await page.evaluate(
  205 |         (path) => {
  206 |           history.pushState({}, "", path);
  207 |           dispatchEvent(new PopStateEvent("popstate"));
  208 |         },
  209 |         detail.replace(prospectId, otherId),
  210 |       );
  211 |       await expect(page.getByRole("main").getByRole("alert")).toContainText(
  212 |         "does not match",
  213 |       );
  214 |     } else {
  215 |       await page.route("**/api/capiro/me.read?*", (route) =>
  216 |         route.fulfill({
  217 |           json: {
```