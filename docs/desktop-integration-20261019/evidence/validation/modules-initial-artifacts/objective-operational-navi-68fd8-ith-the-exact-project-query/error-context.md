# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: objective-operational-navigation.spec.ts >> current project link opens its real task workspace with the exact project query
- Location: test/browser/objective-operational-navigation.spec.ts:103:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Synthetic linked current project', exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('heading', { name: 'Synthetic linked current project', exact: true })

```

```yaml
- link "Skip to content":
  - /url: "#main-content"
- banner:
  - link "Capiro Home":
    - /url: /
    - img "Capiro"
  - button "Toggle sidebar" [expanded]
  - navigation "Product modes":
    - link "Meri":
      - /url: /meri?clientId=30000000-0000-4000-8000-000000000001
    - link "Portfolio":
      - /url: /portfolio/30000000-0000-4000-8000-000000000001
    - link "Modules":
      - /url: /modules?clientId=30000000-0000-4000-8000-000000000001
  - navigation "Workspace actions":
    - link "Quick log":
      - /url: /?log=1
    - link "Master calendar":
      - /url: /calendar?clientId=30000000-0000-4000-8000-000000000001
    - link "Search intelligence":
      - /url: /modules/intelligence?clientId=30000000-0000-4000-8000-000000000001
    - button "Updates — unavailable" [disabled]
    - link "Account settings":
      - /url: /settings/personal?clientId=30000000-0000-4000-8000-000000000001
- complementary:
  - paragraph: Modules
  - navigation "Modules":
    - link "Module hub":
      - /url: /modules?clientId=30000000-0000-4000-8000-000000000001
    - link "Engagement":
      - /url: /modules/engagement?clientId=30000000-0000-4000-8000-000000000001
    - link "Planner":
      - /url: /modules/planner?clientId=30000000-0000-4000-8000-000000000001
    - link "Calendar":
      - /url: /modules/calendar?clientId=30000000-0000-4000-8000-000000000001
    - link "Workspace":
      - /url: /modules/workspace?clientId=30000000-0000-4000-8000-000000000001
    - link "Strategies":
      - /url: /modules/strategies?clientId=30000000-0000-4000-8000-000000000001
    - link "Directory":
      - /url: /modules/directory?clientId=30000000-0000-4000-8000-000000000001
    - link "Intelligence":
      - /url: /modules/intelligence?clientId=30000000-0000-4000-8000-000000000001
    - link "Research portfolios":
      - /url: /modules/research-portfolios?clientId=30000000-0000-4000-8000-000000000001
  - link "Settings":
    - /url: /settings/personal?clientId=30000000-0000-4000-8000-000000000001
- main:
  - navigation "Breadcrumb":
    - link "← Modules":
      - /url: /modules?clientId=30000000-0000-4000-8000-000000000001
    - combobox "Switch module": Planner
  - heading "Planner" [level=1]
  - paragraph: Current project work.
  - button "Back to Projects"
  - alert:
    - heading "Unable to load this view" [level=2]
    - paragraph: This project is unavailable in the selected client scope.
- complementary "Local test fixture": Explicit local test fixture · synthetic identity and records
```

# Test source

```ts
  18  |
  19  | const strategy = strategyDetail.parse({
  20  |   id: "50000000-0000-4000-8000-000000000001",
  21  |   clientId,
  22  |   title: "Synthetic linked current Strategy",
  23  |   type: "regulatory",
  24  |   ownerUserId: null,
  25  |   goal: "Review the current permitted working timeline.",
  26  |   meriContext: null,
  27  |   targetDate: null,
  28  |   lastEditedAt: "2026-10-16T12:00:00Z",
  29  |   nodes: [],
  30  | });
  31  | const secondStrategy = {
  32  |   ...strategy,
  33  |   id: "50000000-0000-4000-8000-000000000002",
  34  |   title: "Synthetic replacement current Strategy",
  35  | };
  36  | const project = projectSchema.parse({
  37  |   id: "60000000-0000-4000-8000-000000000001",
  38  |   name: "Synthetic linked current project",
  39  |   description: "Current permitted project work.",
  40  |   color: "#123456",
  41  |   privacy: "private",
  42  |   defaultView: "list",
  43  |   sections: [],
  44  |   fields: [],
  45  |   members: [],
  46  |   startOn: null,
  47  |   dueOn: null,
  48  |   health: "on_track",
  49  |   clientId,
  50  |   ownerId: "test-user",
  51  |   version: 1,
  52  |   archived: false,
  53  |   createdAt: "2026-10-08T12:00:00Z",
  54  |   updatedAt: "2026-10-08T12:00:00Z",
  55  |   access: "admin",
  56  | });
  57  | const projectTask = {
  58  |   ...nextTask,
  59  |   name: "Synthetic linked project task",
  60  |   clientId,
  61  |   memberships: [{ projectId: project.id, sectionId: null, position: 0 }],
  62  | };
  63  | const currentFixtures = {
  64  |   ...moduleRouteFixtures,
  65  |   "clients.list": [client, otherClient],
  66  |   "strategies.calendars": {
  67  |     congress: [],
  68  |     ppbeLanes: [],
  69  |     ppbeCurrentPhases: [],
  70  |     source: {},
  71  |   },
  72  | };
  73  | const strategyUrl = (id: string) =>
  74  |   `/modules/strategies?clientId=${clientId}&strategy=${id}`;
  75  | const projectUrl = (id: string) =>
  76  |   `/modules/planner?clientId=${clientId}&view=projects&project=${id}`;
  77  |
  78  | test("current Strategy link opens the real working timeline after its exact current read", async ({
  79  |   page,
  80  | }) => {
  81  |   const reads: unknown[] = [];
  82  |   await setup(page, {
  83  |     ...currentFixtures,
  84  |     "strategies.detail": (input) => {
  85  |       reads.push(input);
  86  |       return strategy;
  87  |     },
  88  |   });
  89  |   await page.goto(strategyUrl(strategy.id));
  90  |   await expect(
  91  |     page.getByRole("heading", { name: strategy.title, exact: true }),
  92  |   ).toBeVisible();
  93  |   await expect(
  94  |     page.getByRole("heading", { name: /Working timeline/ }),
  95  |   ).toBeVisible();
  96  |   await expect(
  97  |     page.getByRole("button", { name: "Add step", exact: true }),
  98  |   ).toHaveCount(2);
  99  |   await expect(page.getByLabel("Fiscal horizon")).toBeVisible();
  100 |   expect(reads).toContainEqual({ params: { id: strategy.id } });
  101 | });
  102 |
  103 | test("current project link opens its real task workspace with the exact project query", async ({
  104 |   page,
  105 | }) => {
  106 |   const reads: unknown[] = [];
  107 |   await setup(page, {
  108 |     ...currentFixtures,
  109 |     "planner.bootstrap": { ...bootstrap, projects: [project] },
  110 |     "planner.tasks": (input) => {
  111 |       reads.push(input);
  112 |       return { items: [projectTask], nextCursor: null };
  113 |     },
  114 |   });
  115 |   await page.goto(projectUrl(project.id));
  116 |   await expect(
  117 |     page.getByRole("heading", { name: project.name, exact: true }),
> 118 |   ).toBeVisible();
      |     ^ Error: expect(locator).toBeVisible() failed
  119 |   await expect(
  120 |     page.getByRole("button", { name: projectTask.name, exact: true }),
  121 |   ).toBeVisible();
  122 |   await expect(
  123 |     page.getByRole("tab", { name: "List", exact: true }),
  124 |   ).toHaveAttribute("aria-selected", "true");
  125 |   await expect(
  126 |     page.getByRole("button", { name: "Back to Projects", exact: true }),
  127 |   ).toBeVisible();
  128 |   expect(reads).toContainEqual({ query: { projectId: project.id } });
  129 | });
  130 |
  131 | test("current Strategy link refuses foreign IDs and foreign client receipts", async ({
  132 |   page,
  133 | }) => {
  134 |   let strategyResponse = secondStrategy;
  135 |   await setup(page, {
  136 |     ...currentFixtures,
  137 |     "strategies.detail": () => strategyResponse,
  138 |   });
  139 |   for (const fault of ["id", "client"] as const) {
  140 |     await test.step(`Strategy ${fault} mismatch`, async () => {
  141 |       strategyResponse =
  142 |         fault === "id"
  143 |           ? secondStrategy
  144 |           : { ...strategy, clientId: otherClientId };
  145 |       await page.goto(strategyUrl(strategy.id));
  146 |       await expect(page.getByRole("alert")).toContainText(
  147 |         "This Strategy is unavailable in the selected client scope.",
  148 |       );
  149 |       await expect(
  150 |         page.getByRole("heading", { name: /Working timeline/ }),
  151 |       ).toHaveCount(0);
  152 |       await expect(
  153 |         page.getByRole("heading", {
  154 |           name: strategyResponse.title,
  155 |           exact: true,
  156 |         }),
  157 |       ).toHaveCount(0);
  158 |     });
  159 |   }
  160 | });
  161 |
  162 | test("current project link refuses missing, foreign, archived and duplicate bootstrap targets without a catalog fallback", async ({
  163 |   page,
  164 | }) => {
  165 |   let projects: (typeof project)[] = [];
  166 |   let taskReads = 0;
  167 |   await setup(page, {
  168 |     ...currentFixtures,
  169 |     "planner.bootstrap": () => ({ ...bootstrap, projects }),
  170 |     "planner.tasks": () => {
  171 |       taskReads++;
  172 |       return { items: [projectTask], nextCursor: null };
  173 |     },
  174 |   });
  175 |   for (const [fault, records] of [
  176 |     ["missing", []],
  177 |     ["foreign client", [{ ...project, clientId: otherClientId }]],
  178 |     ["archived", [{ ...project, archived: true }]],
  179 |     ["duplicate", [project, { ...project }]],
  180 |   ] as const) {
  181 |     await test.step(fault, async () => {
  182 |       projects = [...records];
  183 |       await page.goto(projectUrl(project.id));
  184 |       await expect(page.getByRole("alert")).toContainText(
  185 |         "This project is unavailable in the selected client scope.",
  186 |       );
  187 |       await expect(
  188 |         page.getByRole("heading", { name: project.name, exact: true }),
  189 |       ).toHaveCount(0);
  190 |       await expect(
  191 |         page.getByRole("button", { name: projectTask.name, exact: true }),
  192 |       ).toHaveCount(0);
  193 |       await expect(
  194 |         page.getByRole("tablist", { name: "Planner sections", exact: true }),
  195 |       ).toHaveCount(0);
  196 |       expect(taskReads).toBe(0);
  197 |     });
  198 |   }
  199 | });
  200 |
  201 | function deferred() {
  202 |   let resolve!: () => void;
  203 |   const promise = new Promise<void>((done) => {
  204 |     resolve = done;
  205 |   });
  206 |   return { promise, resolve };
  207 | }
  208 |
  209 | async function settleReplacedRead(page: Page) {
  210 |   await page.evaluate(
  211 |     () =>
  212 |       new Promise<void>((resolve) => {
  213 |         requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  214 |       }),
  215 |   );
  216 | }
  217 |
  218 | test("replacing a current Strategy URL suppresses the held previous target", async ({
```
