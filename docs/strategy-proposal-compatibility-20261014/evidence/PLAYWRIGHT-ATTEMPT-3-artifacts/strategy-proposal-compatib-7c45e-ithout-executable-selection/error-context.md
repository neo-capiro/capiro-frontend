# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: strategy-proposal-compatibility.spec.ts >> unsupported-only proposal remains readable and rejectable without executable selection
- Location: test/browser/strategy-proposal-compatibility.spec.ts:226:1

# Error details

```
Error: page.goto: Page crashed
Call log:
  - navigating to "http://127.0.0.1:5197/modules/strategies?view=review", waiting until "load"

```

# Test source

```ts
  30  |   return strategyChangeSet.parse({
  31  |     id,
  32  |     strategyId: id,
  33  |     summary: "Synthetic mixed queue proposal",
  34  |     ops: originalOps,
  35  |     risk: "low",
  36  |     status: "proposed",
  37  |     strategyVersionId: id,
  38  |     appliedVersionId: null,
  39  |     createdAt: "2026-10-14T12:00:00Z",
  40  |     appliedAt: null,
  41  |     approvedAt: null,
  42  |     ...extra,
  43  |   });
  44  | }
  45  | const detail = {
  46  |   id,
  47  |   clientId: id,
  48  |   title: "Synthetic strategy",
  49  |   type: "regulatory",
  50  |   ownerUserId: null,
  51  |   goal: null,
  52  |   meriContext: null,
  53  |   targetDate: null,
  54  |   lastEditedAt: "2026-10-14T12:00:00Z",
  55  |   nodes: [],
  56  | };
  57  | type Write = { key: string; input: unknown };
  58  | async function fixture(page: Page, rows = [proposal()]) {
  59  |   const state = {
  60  |     rows,
  61  |     writes: [] as Write[],
  62  |     pageErrors: [] as string[],
  63  |     external: [] as string[],
  64  |   };
  65  |   page.on("pageerror", (error) => state.pageErrors.push(error.message));
  66  |   page.on("request", (request) => {
  67  |     if (new URL(request.url()).hostname !== "127.0.0.1")
  68  |       state.external.push(request.url());
  69  |   });
  70  |   await onlyLocalRequests(page);
  71  |   await operationFixtures(page, {
  72  |     ...moduleRouteFixtures,
  73  |     "strategies.firm-review": [],
  74  |     "strategies.proposals": () => state.rows,
  75  |     "strategies.proposal.approve": (input) => {
  76  |       state.writes.push({ key: "approve", input });
  77  |       state.rows = [
  78  |         proposal({
  79  |           status: "approved",
  80  |           approvedOps: [recognized],
  81  |           approvedAt: "2026-10-14T12:10:00Z",
  82  |         }),
  83  |         ...state.rows.slice(1),
  84  |       ];
  85  |       return state.rows[0];
  86  |     },
  87  |     "strategies.proposal.reject": (input) => {
  88  |       state.writes.push({ key: "reject", input });
  89  |       const rejected = strategyChangeSet.parse({
  90  |         ...state.rows[0]!,
  91  |         status: "rejected",
  92  |       });
  93  |       state.rows = [rejected, ...state.rows.slice(1)];
  94  |       return rejected;
  95  |     },
  96  |     "strategies.proposal.apply": (input) => {
  97  |       state.writes.push({ key: "apply", input });
  98  |       state.rows = [
  99  |         {
  100 |           ...state.rows[0]!,
  101 |           status: "applied",
  102 |           appliedAt: "2026-10-14T12:20:00Z",
  103 |         },
  104 |         ...state.rows.slice(1),
  105 |       ];
  106 |       return detail;
  107 |     },
  108 |     "strategies.proposal.undo": (input) => {
  109 |       state.writes.push({ key: "undo", input });
  110 |       state.rows = [
  111 |         { ...state.rows[0]!, status: "undone" },
  112 |         ...state.rows.slice(1),
  113 |       ];
  114 |       return detail;
  115 |     },
  116 |   });
  117 |   return state;
  118 | }
  119 | function button(scope: Page | Locator, name: string) {
  120 |   return scope.getByRole("button", { name, exact: true });
  121 | }
  122 | function review(page: Page) {
  123 |   return page.getByRole("dialog", {
  124 |     name: "Review proposed changes",
  125 |     exact: true,
  126 |     includeHidden: true,
  127 |   });
  128 | }
  129 | async function openFirstReview(page: Page) {
> 130 |   await page.goto("/modules/strategies?view=review");
      |              ^ Error: page.goto: Page crashed
  131 |   await button(page, "Review change details").first().click();
  132 |   await expect(review(page)).toBeVisible();
  133 | }
  134 | async function refresh(page: Page, kind: string) {
  135 |   await page.evaluate(
  136 |     (detail) =>
  137 |       dispatchEvent(new CustomEvent("test:proposal-refresh", { detail })),
  138 |     kind,
  139 |   );
  140 | }
  141 | function expectIsolated(state: Awaited<ReturnType<typeof fixture>>) {
  142 |   expect(state.external).toEqual([]);
  143 |   expect(state.pageErrors).toEqual([]);
  144 | }
  145 | 
  146 | for (const colorScheme of ["light", "dark"] as const) {
  147 |   test(`desktop ${colorScheme}: mixed queue preserves unsupported audit and compact approval/apply indexes`, async ({
  148 |     page,
  149 |   }, info) => {
  150 |     await page.emulateMedia({ colorScheme });
  151 |     const state = await fixture(page, [
  152 |       proposal(),
  153 |       proposal({
  154 |         id: otherId,
  155 |         summary: "Synthetic opaque-only queue entry",
  156 |         ops: [
  157 |           { title: "Missing discriminator" },
  158 |           { op: 17 },
  159 |           null,
  160 |           "Stored text",
  161 |           [],
  162 |           { op: "add", title: 4 },
  163 |           { op: "update", sources: [{ section: null }] },
  164 |         ],
  165 |       }),
  166 |     ]);
  167 |     await page.goto("/modules/strategies?view=review");
  168 |     await expect(
  169 |       page.getByText("Synthetic opaque-only queue entry", { exact: true }),
  170 |     ).toBeVisible();
  171 |     await expect(page.getByRole("main")).toContainText("Unsupported change");
  172 |     await expect(
  173 |       page.getByText("Unsupported change", { exact: true }).first(),
  174 |     ).toBeVisible();
  175 |     await button(page, "Review change details").first().click();
  176 |     const modal = review(page);
  177 |     await expect(modal.getByRole("checkbox")).toHaveCount(3);
  178 |     await expect(modal.getByRole("checkbox").nth(0)).toBeDisabled();
  179 |     await expect(modal.getByRole("checkbox").nth(0)).not.toBeChecked();
  180 |     await expect(modal.getByRole("checkbox").nth(1)).toBeChecked();
  181 |     await expect(modal.getByRole("checkbox").nth(2)).toBeChecked();
  182 |     await modal.getByRole("checkbox").nth(1).uncheck();
  183 |     await button(modal, "Approve selected").click();
  184 |     await button(page, "Confirm decision").click();
  185 |     await expect(modal).toHaveCount(0);
  186 |     expect(state.writes).toEqual([
  187 |       { key: "approve", input: { params: { id }, body: { opIndexes: [2] } } },
  188 |     ]);
  189 |     await expect(
  190 |       page.getByText("Synthetic opaque-only queue entry", { exact: true }),
  191 |     ).toBeVisible();
  192 |     await button(page, "Review change details").first().click();
  193 |     await expect(modal.getByRole("checkbox")).toHaveCount(1);
  194 |     await expect(modal.getByRole("checkbox").nth(0)).toBeChecked();
  195 |     await expect(modal).toContainText("Original stored details");
  196 |     await expect(modal).toContainText("Opaque audit entry");
  197 |     await expect(modal).toContainText("Synthetic removable change");
  198 |     await expect(modal).toContainText("fixture/original");
  199 |     await page.screenshot({
  200 |       path: info.outputPath(`strategy-compatibility-${colorScheme}.png`),
  201 |       fullPage: true,
  202 |       animations: "disabled",
  203 |     });
  204 |     await button(modal, "Apply 1 changes").click();
  205 |     await button(page, "Confirm decision").click();
  206 |     await expect(modal).toHaveCount(0);
  207 |     expect(state.writes[1]).toEqual({
  208 |       key: "apply",
  209 |       input: { params: { id }, body: { opIndexes: [0] } },
  210 |     });
  211 |     await button(page, "Undo applied changes").click();
  212 |     await expect(button(modal, "Approve selected")).toBeDisabled();
  213 |     await expect(modal.getByRole("button", { name: /^Apply / })).toBeDisabled();
  214 |     await button(modal, "Undo applied changes").click();
  215 |     await button(page, "Confirm decision").click();
  216 |     await expect(modal).toHaveCount(0);
  217 |     expect(state.writes.map((write) => write.key)).toEqual([
  218 |       "approve",
  219 |       "apply",
  220 |       "undo",
  221 |     ]);
  222 |     expectIsolated(state);
  223 |   });
  224 | }
  225 | 
  226 | test("unsupported-only proposal remains readable and rejectable without executable selection", async ({
  227 |   page,
  228 | }) => {
  229 |   const state = await fixture(page, [
  230 |     proposal({ ops: [originalOps[0], null, "Stored opaque primitive"] }),
```