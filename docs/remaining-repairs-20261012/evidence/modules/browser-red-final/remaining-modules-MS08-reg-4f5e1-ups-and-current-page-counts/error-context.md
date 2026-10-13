# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: remaining-modules.spec.ts >> MS08 regression: All tasks defaults to named client groups and current-page counts
- Location: ../../workspace/capiro-remaining-modules/apps/web/test/browser/remaining-modules.spec.ts:63:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByRole('region', { name: 'Current Aerospace tasks', exact: true })
Expected substring: "2 shown · 2 open"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for getByRole('region', { name: 'Current Aerospace tasks', exact: true })

```

```yaml
- link "Skip to content":
  - /url: "#main-content"
- banner:
  - link "Capiro Home":
    - /url: /
    - img "Capiro"
  - navigation "Product modes":
    - link "Meri":
      - /url: /meri
    - link "Portfolio":
      - /url: /
    - link "Modules":
      - /url: /modules
  - navigation "Workspace actions":
    - link "Quick log":
      - /url: /?log=1
    - link "Master calendar":
      - /url: /calendar
    - link "Search intelligence":
      - /url: /modules/intelligence
    - button "Updates — unavailable" [disabled]
    - link "Account settings":
      - /url: /settings/personal
- complementary:
  - paragraph: Modules
  - navigation "Modules":
    - link "Module hub":
      - /url: /modules
    - link "Engagement":
      - /url: /modules/engagement
    - link "Planner":
      - /url: /modules/planner
    - link "Calendar":
      - /url: /modules/calendar
    - link "Workspace":
      - /url: /modules/workspace
    - link "Strategies":
      - /url: /modules/strategies
    - link "Directory":
      - /url: /modules/directory
    - link "Intelligence":
      - /url: /modules/intelligence
    - link "Research portfolios":
      - /url: /modules/research-portfolios
  - link "Settings":
    - /url: /settings/personal
- main:
  - navigation "Breadcrumb":
    - link "← Modules":
      - /url: /modules
    - combobox "Switch module": Planner
  - heading "Planner" [level=1]
  - paragraph: Coordinate tasks, projects and capacity across your permitted work.
  - button "Refresh"
  - tablist "Planner sections":
    - tab "My tasks"
    - tab "All tasks" [selected]
    - tab "Projects"
    - tab "Inbox"
    - tab "Portfolios"
    - tab "Goals"
    - tab "Workload"
    - tab "Capacity"
    - tab "Reporting"
    - tab "Timesheets"
    - tab "Templates"
    - tab "Rules"
    - tab "Forms"
  - tablist "Task display":
    - tab "List" [selected]
    - tab "Board"
    - tab "Calendar"
    - tab "Timeline"
    - tab "Gantt"
  - button "+ New task"
  - searchbox "Search tasks"
  - combobox "Status": Status · Open
  - combobox "Assignee": All assignees
  - combobox "Priority": Priority · All
  - button "Import CSV"
  - button "Save view"
  - paragraph: Time is shown as hours:minutes. This page includes only work you can access.
  - table "Planner tasks":
    - caption: Planner tasks
    - rowgroup:
      - row "Task name Assignee Due date Priority Status Estimated Actual":
        - columnheader "Task name"
        - columnheader "Assignee"
        - columnheader "Due date"
        - columnheader "Priority"
        - columnheader "Status"
        - columnheader "Estimated"
        - columnheader "Actual"
    - rowgroup:
      - row "Select Direct client work Complete Direct client work Direct client work Test User Oct 12 high To do 1:30 0:15":
        - cell "Select Direct client work Complete Direct client work Direct client work":
          - checkbox "Select Direct client work"
          - button "Complete Direct client work"
          - button "Direct client work"
        - cell "Test User"
        - cell "Oct 12"
        - cell "high"
        - cell "To do"
        - cell "1:30"
        - cell "0:15"
      - row "Select Project client work Complete Project client work Project client work Test User Oct 12 high To do 1:30 0:15":
        - cell "Select Project client work Complete Project client work Project client work":
          - checkbox "Select Project client work"
          - button "Complete Project client work"
          - button "Project client work"
        - cell "Test User"
        - cell "Oct 12"
        - cell "high"
        - cell "To do"
        - cell "1:30"
        - cell "0:15"
      - row "Select Other client work Complete Other client work Other client work Test User Oct 12 high To do 1:30 0:15":
        - cell "Select Other client work Complete Other client work Other client work":
          - checkbox "Select Other client work"
          - button "Complete Other client work" [disabled]
          - button "Other client work"
        - cell "Test User"
        - cell "Oct 12"
        - cell "high"
        - cell "To do"
        - cell "1:30"
        - cell "0:15"
      - row "Select Firm work Complete Firm work Firm work Test User Oct 12 high To do 1:30 0:15":
        - cell "Select Firm work Complete Firm work Firm work":
          - checkbox "Select Firm work"
          - button "Complete Firm work"
          - button "Firm work"
        - cell "Test User"
        - cell "Oct 12"
        - cell "high"
        - cell "To do"
        - cell "1:30"
        - cell "0:15"
- paragraph: Explicit local test fixture · synthetic identity and records
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
> 72  |   await expect(alpha).toContainText("2 shown · 2 open");
      |                       ^ Error: expect(locator).toContainText(expected) failed
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
  86  |   ).toBeGreaterThan(400);
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
```