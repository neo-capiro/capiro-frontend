# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: remaining-modules.spec.ts >> MS08 regression: All tasks defaults to named client groups and current-page counts
- Location: ../../workspace/capiro-remaining-modules/apps/web/test/browser/remaining-modules.spec.ts:63:1

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 400
Received:   179.65625
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
            - generic: Planner
            - img [ref=e83]
        - generic [ref=e85]:
          - generic [ref=e86]:
            - generic [ref=e87]:
              - heading "Planner" [level=1] [ref=e88]
              - paragraph [ref=e89]: Coordinate tasks, projects and capacity across your permitted work.
            - generic [ref=e90]:
              - combobox "Planner client scope" [ref=e92] [cursor=pointer]:
                - generic: Scope · All clients
                - img [ref=e93]
              - button "Refresh" [ref=e95] [cursor=pointer]
          - tablist "Planner sections" [ref=e96]:
            - tab "My tasks" [ref=e97] [cursor=pointer]
            - tab "All tasks" [selected] [ref=e98] [cursor=pointer]
            - tab "Projects" [ref=e99] [cursor=pointer]
            - tab "Inbox" [ref=e100] [cursor=pointer]
            - tab "Portfolios" [ref=e101] [cursor=pointer]
            - tab "Goals" [ref=e102] [cursor=pointer]
            - tab "Workload" [ref=e103] [cursor=pointer]
            - tab "Capacity" [ref=e104] [cursor=pointer]
            - tab "Reporting" [ref=e105] [cursor=pointer]
            - tab "Timesheets" [ref=e106] [cursor=pointer]
            - tab "Templates" [ref=e107] [cursor=pointer]
            - tab "Rules" [ref=e108] [cursor=pointer]
            - tab "Forms" [ref=e109] [cursor=pointer]
          - generic [ref=e110]:
            - generic [ref=e111]:
              - tablist "Task display" [ref=e112]:
                - tab "List" [selected] [ref=e113] [cursor=pointer]
                - tab "Board" [ref=e114] [cursor=pointer]
                - tab "Calendar" [ref=e115] [cursor=pointer]
                - tab "Timeline" [ref=e116] [cursor=pointer]
                - tab "Gantt" [ref=e117] [cursor=pointer]
              - button "+ New task" [ref=e118] [cursor=pointer]
            - generic [ref=e119]:
              - searchbox "Search tasks" [ref=e120]
              - combobox "Status" [ref=e121] [cursor=pointer]:
                - generic: Status · Open
                - img [ref=e122]
              - combobox "Assignee" [ref=e124] [cursor=pointer]:
                - generic: All assignees
                - img [ref=e125]
              - combobox "Priority" [ref=e127] [cursor=pointer]:
                - generic: Priority · All
                - img [ref=e128]
              - button "Import CSV" [ref=e130] [cursor=pointer]
              - combobox "Group by" [ref=e131] [cursor=pointer]:
                - generic: Group by · Client
                - img [ref=e132]
              - button "Save view" [ref=e134] [cursor=pointer]
            - paragraph [ref=e135]: Time is shown as hours:minutes. This page includes only work you can access. Client groups and counts include only the displayed page.
            - generic [ref=e136]:
              - region "Current Aerospace tasks" [ref=e137]:
                - generic [ref=e138]:
                  - heading "Current Aerospace" [level=2] [ref=e139]
                  - generic [ref=e140]: 2 shown · 2 open
                  - link "Open client ↗" [ref=e141] [cursor=pointer]:
                    - /url: /portfolio/30000000-0000-4000-8000-000000000001
                - table "Planner tasks" [ref=e143]:
                  - caption [ref=e144]: Planner tasks
                  - rowgroup [ref=e145]:
                    - row "Task name Project Assignee Due date Priority Status" [ref=e146]:
                      - columnheader "Task name" [ref=e147]
                      - columnheader "Project" [ref=e148]
                      - columnheader "Assignee" [ref=e149]
                      - columnheader "Due date" [ref=e150]
                      - columnheader "Priority" [ref=e151]
                      - columnheader "Status" [ref=e152]
                  - rowgroup [ref=e153]:
                    - row "Select Direct client work Complete Direct client work Direct client work — Test User Oct 12 high To do" [ref=e154]:
                      - cell "Select Direct client work Complete Direct client work Direct client work" [ref=e155]:
                        - generic [ref=e156]:
                          - checkbox "Select Direct client work" [ref=e157]
                          - button "Complete Direct client work" [ref=e158] [cursor=pointer]
                          - button "Direct client work" [ref=e159] [cursor=pointer]
                      - cell "—" [ref=e160]
                      - cell "Test User" [ref=e161]:
                        - generic "Test User" [ref=e162]: TU
                      - cell "Oct 12" [ref=e163]
                      - cell "high" [ref=e164]:
                        - generic [ref=e165]: high
                      - cell "To do" [ref=e166]:
                        - generic [ref=e167]: To do
                    - row "Select Project client work Complete Project client work Project client work Current project Test User Oct 12 high To do" [ref=e168]:
                      - cell "Select Project client work Complete Project client work Project client work" [ref=e169]:
                        - generic [ref=e170]:
                          - checkbox "Select Project client work" [ref=e171]
                          - button "Complete Project client work" [ref=e172] [cursor=pointer]
                          - button "Project client work" [ref=e173] [cursor=pointer]
                      - cell "Current project" [ref=e174]
                      - cell "Test User" [ref=e175]:
                        - generic "Test User" [ref=e176]: TU
                      - cell "Oct 12" [ref=e177]
                      - cell "high" [ref=e178]:
                        - generic [ref=e179]: high
                      - cell "To do" [ref=e180]:
                        - generic [ref=e181]: To do
              - region "Other Aerospace tasks" [ref=e182]:
                - generic [ref=e183]:
                  - heading "Other Aerospace" [level=2] [ref=e184]
                  - generic [ref=e185]: 1 shown · 1 open
                  - link "Open client ↗" [ref=e186] [cursor=pointer]:
                    - /url: /portfolio/30000000-0000-4000-8000-000000000002
                - table "Planner tasks" [ref=e188]:
                  - caption [ref=e189]: Planner tasks
                  - rowgroup [ref=e190]:
                    - row "Task name Project Assignee Due date Priority Status" [ref=e191]:
                      - columnheader "Task name" [ref=e192]
                      - columnheader "Project" [ref=e193]
                      - columnheader "Assignee" [ref=e194]
                      - columnheader "Due date" [ref=e195]
                      - columnheader "Priority" [ref=e196]
                      - columnheader "Status" [ref=e197]
                  - rowgroup [ref=e198]:
                    - row "Select Other client work Complete Other client work Other client work — Test User Oct 12 high To do" [ref=e199]:
                      - cell "Select Other client work Complete Other client work Other client work" [ref=e200]:
                        - generic [ref=e201]:
                          - checkbox "Select Other client work" [ref=e202]
                          - button "Complete Other client work" [disabled] [ref=e203]
                          - button "Other client work" [ref=e204] [cursor=pointer]
                      - cell "—" [ref=e205]
                      - cell "Test User" [ref=e206]:
                        - generic "Test User" [ref=e207]: TU
                      - cell "Oct 12" [ref=e208]
                      - cell "high" [ref=e209]:
                        - generic [ref=e210]: high
                      - cell "To do" [ref=e211]:
                        - generic [ref=e212]: To do
              - region "No client · firm work tasks" [ref=e213]:
                - generic [ref=e214]:
                  - heading "No client · firm work" [level=2] [ref=e215]
                  - generic [ref=e216]: 1 shown · 1 open
                - table "Planner tasks" [ref=e218]:
                  - caption [ref=e219]: Planner tasks
                  - rowgroup [ref=e220]:
                    - row "Task name Project Assignee Due date Priority Status" [ref=e221]:
                      - columnheader "Task name" [ref=e222]
                      - columnheader "Project" [ref=e223]
                      - columnheader "Assignee" [ref=e224]
                      - columnheader "Due date" [ref=e225]
                      - columnheader "Priority" [ref=e226]
                      - columnheader "Status" [ref=e227]
                  - rowgroup [ref=e228]:
                    - row "Select Firm work Complete Firm work Firm work — Test User Oct 12 high To do" [ref=e229]:
                      - cell "Select Firm work Complete Firm work Firm work" [ref=e230]:
                        - generic [ref=e231]:
                          - checkbox "Select Firm work" [ref=e232]
                          - button "Complete Firm work" [ref=e233] [cursor=pointer]
                          - button "Firm work" [ref=e234] [cursor=pointer]
                      - cell "—" [ref=e235]
                      - cell "Test User" [ref=e236]:
                        - generic "Test User" [ref=e237]: TU
                      - cell "Oct 12" [ref=e238]
                      - cell "high" [ref=e239]:
                        - generic [ref=e240]: high
                      - cell "To do" [ref=e241]:
                        - generic [ref=e242]: To do
  - paragraph [ref=e243]: Explicit local test fixture · synthetic identity and records
```

# Test source

```ts
  1   | import { expect, test, type Page, type Route } from "@playwright/test";
  2   | import {
  3   |   bootstrap,
  4   |   client,
  5   |   clientId,
  6   |   navigate,
  7   |   nextTask,
  8   |   otherClient,
  9   |   otherClientId,
  10  |   setup,
  11  | } from "./next-modules-fixtures";
  12  | const projectId = "60000000-0000-4000-8000-000000000001";
  13  | const project = {
  14  |   id: projectId,
  15  |   name: "Current project",
  16  |   description: "",
  17  |   color: "#123456",
  18  |   privacy: "private",
  19  |   defaultView: "list",
  20  |   sections: [],
  21  |   fields: [],
  22  |   members: [],
  23  |   startOn: null,
  24  |   dueOn: null,
  25  |   health: "on_track",
  26  |   clientId,
  27  |   ownerId: "test-user",
  28  |   version: 1,
  29  |   archived: false,
  30  |   createdAt: "2026-10-08",
  31  |   updatedAt: "2026-10-08",
  32  |   access: "admin",
  33  | };
  34  | const tasks = [
  35  |   { ...nextTask, name: "Direct client work", clientId },
  36  |   {
  37  |     ...nextTask,
  38  |     id: "51000000-0000-4000-8000-000000000002",
  39  |     name: "Project client work",
  40  |     memberships: [{ projectId, sectionId: null, position: 0 }],
  41  |   },
  42  |   {
  43  |     ...nextTask,
  44  |     id: "51000000-0000-4000-8000-000000000003",
  45  |     name: "Other client work",
  46  |     clientId: otherClientId,
  47  |     access: "viewer",
  48  |   },
  49  |   {
  50  |     ...nextTask,
  51  |     id: "51000000-0000-4000-8000-000000000004",
  52  |     name: "Firm work",
  53  |   },
  54  | ];
  55  | const fixtures = {
  56  |   "planner.bootstrap": { ...bootstrap, projects: [project] },
  57  |   "planner.tasks": { items: tasks, nextCursor: null },
  58  | };
  59  | async function choose(page: Page, name: string, option: string) {
  60  |   await page.getByRole("combobox", { name, exact: true }).click();
  61  |   await page.getByRole("option", { name: option, exact: true }).click();
  62  | }
  63  | test("MS08 regression: All tasks defaults to named client groups and current-page counts", async ({
  64  |   page,
  65  | }, info) => {
  66  |   await setup(page, fixtures);
  67  |   await page.goto("/modules/planner?view=all-tasks");
  68  |   const alpha = page.getByRole("region", {
  69  |     name: `${client.name} tasks`,
  70  |     exact: true,
  71  |   });
  72  |   await expect(alpha).toContainText("2 shown · 2 open");
  73  |   await expect(alpha).toContainText("Direct client work");
  74  |   await expect(alpha).toContainText("Project client work");
  75  |   await expect(
  76  |     alpha.getByRole("link", { name: "Open client" }),
  77  |   ).toHaveAttribute("href", `/portfolio/${clientId}`);
  78  |   await expect(
  79  |     page.getByRole("region", { name: "No client · firm work tasks" }),
  80  |   ).toContainText("Firm work");
  81  |   await expect(
  82  |     page.getByRole("button", { name: "Complete Other client work" }),
  83  |   ).toBeDisabled();
  84  |   expect(
  85  |     (await alpha.getByRole("cell").first().boundingBox())!.width,
> 86  |   ).toBeGreaterThan(400);
      |     ^ Error: expect(received).toBeGreaterThan(expected)
  87  |   await page.screenshot({
  88  |     path: info.outputPath("planner-client-groups-desktop.png"),
  89  |     fullPage: true,
  90  |   });
  91  |   await choose(page, "Group by", "Group by · None");
  92  |   await expect(page.getByRole("table")).toHaveCount(1);
  93  |   await expect(
  94  |     page.getByRole("columnheader", { name: "Estimated" }),
  95  |   ).toBeVisible();
  96  |   await choose(page, "Group by", "Group by · Client");
  97  |   await choose(page, "Status", "Done");
  98  |   await expect(
  99  |     page.getByRole("heading", { name: "No tasks match this view" }),
  100 |   ).toBeVisible();
  101 |   await expect(
  102 |     page.getByRole("region", { name: `${client.name} tasks`, exact: true }),
  103 |   ).toHaveCount(0);
  104 | });
  105 | test("MS08 scope picker preserves All tasks, disposes drafts and restores scope through history", async ({
  106 |   page,
  107 | }) => {
  108 |   await setup(page, fixtures);
  109 |   await page.goto("/modules/planner?view=all-tasks");
  110 |   await page.getByRole("button", { name: "+ New task", exact: true }).click();
  111 |   await page.getByLabel("Task name", { exact: true }).fill("Former draft");
  112 |   await navigate(page, `/modules/planner?view=all-tasks&clientId=${clientId}`);
  113 |   await expect(page.getByRole("dialog")).toHaveCount(0);
  114 |   await expect(
  115 |     page.getByRole("tab", { name: "All tasks", exact: true }),
  116 |   ).toHaveAttribute("aria-selected", "true");
  117 |   await expect(
  118 |     page.getByRole("button", { name: "Firm work", exact: true }),
  119 |   ).toHaveCount(0);
  120 |   await expect(
  121 |     page.getByRole("button", { name: "Project client work", exact: true }),
  122 |   ).toBeVisible();
  123 |   await choose(page, "Planner client scope", otherClient.name);
  124 |   await expect(page).toHaveURL(
  125 |     `/modules/planner?view=all-tasks&clientId=${otherClientId}`,
  126 |   );
  127 |   await expect(
  128 |     page.getByRole("button", { name: "Other client work", exact: true }),
  129 |   ).toBeVisible();
  130 |   await expect(
  131 |     page.getByRole("button", { name: "Direct client work", exact: true }),
  132 |   ).toHaveCount(0);
  133 |   await page.goBack();
  134 |   await expect(
  135 |     page.getByRole("button", { name: "Project client work", exact: true }),
  136 |   ).toBeVisible();
  137 |   await page.goForward();
  138 |   await expect(
  139 |     page.getByRole("button", { name: "Other client work", exact: true }),
  140 |   ).toBeVisible();
  141 |   await choose(page, "Planner client scope", "Scope · All clients");
  142 |   await expect(
  143 |     page.getByRole("button", { name: "Firm work", exact: true }),
  144 |   ).toBeVisible();
  145 |   await page.getByRole("button", { name: "+ New task", exact: true }).click();
  146 |   await expect(page.getByLabel("Task name", { exact: true })).toHaveValue("");
  147 | });
  148 | test("MS08 failed current clients list removes former labels and disables picker until retry", async ({
  149 |   page,
  150 | }) => {
  151 |   let fail = false;
  152 |   await setup(page, fixtures);
  153 |   await page.route("**/api/capiro/clients.list*", (route) =>
  154 |     fail
  155 |       ? route.fulfill({ status: 403, json: { message: "Current list denied" } })
  156 |       : route.fallback(),
  157 |   );
  158 |   await page.goto("/modules/planner?view=all-tasks");
  159 |   await expect(
  160 |     page.getByRole("region", { name: `${client.name} tasks`, exact: true }),
  161 |   ).toBeVisible();
  162 |   fail = true;
  163 |   await page.getByRole("button", { name: "Refresh", exact: true }).click();
  164 |   await expect(
  165 |     page.getByRole("combobox", { name: "Planner client scope" }),
  166 |   ).toBeDisabled();
  167 |   await expect(
  168 |     page.getByRole("region", { name: `${client.name} tasks`, exact: true }),
  169 |   ).toHaveCount(0);
  170 |   await expect(page.getByRole("link", { name: "Open client" })).toHaveCount(0);
  171 |   await expect(
  172 |     page.getByRole("button", { name: "Direct client work", exact: true }),
  173 |   ).toBeVisible();
  174 |   fail = false;
  175 |   await page.getByRole("button", { name: "Retry client scopes" }).click();
  176 |   await expect(
  177 |     page.getByRole("region", { name: `${client.name} tasks`, exact: true }),
  178 |   ).toBeVisible();
  179 | });
  180 | test("MS08 failed current task page hides groups and recovers without inventing filters", async ({
  181 |   page,
  182 | }) => {
  183 |   let failed = false;
  184 |   const inputs: Record<string, unknown>[] = [];
  185 |   await setup(page, fixtures);
  186 |   await page.route("**/api/capiro/planner.tasks*", (route) => {
```