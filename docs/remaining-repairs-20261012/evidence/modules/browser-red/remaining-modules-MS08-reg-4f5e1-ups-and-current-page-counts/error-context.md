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
  84  |   await page.screenshot({
  85  |     path: info.outputPath("planner-client-groups-desktop.png"),
  86  |     fullPage: true,
  87  |   });
  88  |   await choose(page, "Group by", "Group by · None");
  89  |   await expect(page.getByRole("table")).toHaveCount(1);
  90  |   await expect(
  91  |     page.getByRole("columnheader", { name: "Estimated" }),
  92  |   ).toBeVisible();
  93  |   await choose(page, "Group by", "Group by · Client");
  94  |   await choose(page, "Status", "Done");
  95  |   await expect(
  96  |     page.getByRole("heading", { name: "No tasks match this view" }),
  97  |   ).toBeVisible();
  98  |   await expect(
  99  |     page.getByRole("region", { name: `${client.name} tasks`, exact: true }),
  100 |   ).toHaveCount(0);
  101 | });
  102 | test("MS08 scope picker preserves All tasks, disposes drafts and restores scope through history", async ({
  103 |   page,
  104 | }) => {
  105 |   await setup(page, fixtures);
  106 |   await page.goto("/modules/planner?view=all-tasks");
  107 |   await page.getByRole("button", { name: "+ New task", exact: true }).click();
  108 |   await page.getByLabel("Task name", { exact: true }).fill("Former draft");
  109 |   await navigate(page, `/modules/planner?view=all-tasks&clientId=${clientId}`);
  110 |   await expect(page.getByRole("dialog")).toHaveCount(0);
  111 |   await expect(
  112 |     page.getByRole("tab", { name: "All tasks", exact: true }),
  113 |   ).toHaveAttribute("aria-selected", "true");
  114 |   await expect(
  115 |     page.getByRole("button", { name: "Firm work", exact: true }),
  116 |   ).toHaveCount(0);
  117 |   await expect(
  118 |     page.getByRole("button", { name: "Project client work", exact: true }),
  119 |   ).toBeVisible();
  120 |   await choose(page, "Planner client scope", otherClient.name);
  121 |   await expect(page).toHaveURL(
  122 |     `/modules/planner?view=all-tasks&clientId=${otherClientId}`,
  123 |   );
  124 |   await expect(
  125 |     page.getByRole("button", { name: "Other client work", exact: true }),
  126 |   ).toBeVisible();
  127 |   await expect(
  128 |     page.getByRole("button", { name: "Direct client work", exact: true }),
  129 |   ).toHaveCount(0);
  130 |   await page.goBack();
  131 |   await expect(
  132 |     page.getByRole("button", { name: "Project client work", exact: true }),
  133 |   ).toBeVisible();
  134 |   await page.goForward();
  135 |   await expect(
  136 |     page.getByRole("button", { name: "Other client work", exact: true }),
  137 |   ).toBeVisible();
  138 |   await choose(page, "Planner client scope", "Scope · All clients");
  139 |   await expect(
  140 |     page.getByRole("button", { name: "Firm work", exact: true }),
  141 |   ).toBeVisible();
  142 |   await page.getByRole("button", { name: "+ New task", exact: true }).click();
  143 |   await expect(page.getByLabel("Task name", { exact: true })).toHaveValue("");
  144 | });
  145 | test("MS08 failed current clients list removes former labels and disables picker until retry", async ({
  146 |   page,
  147 | }) => {
  148 |   let fail = false;
  149 |   await setup(page, fixtures);
  150 |   await page.route("**/api/capiro/clients.list*", (route) =>
  151 |     fail
  152 |       ? route.fulfill({ status: 403, json: { message: "Current list denied" } })
  153 |       : route.fallback(),
  154 |   );
  155 |   await page.goto("/modules/planner?view=all-tasks");
  156 |   await expect(
  157 |     page.getByRole("region", { name: `${client.name} tasks`, exact: true }),
  158 |   ).toBeVisible();
  159 |   fail = true;
  160 |   await page.getByRole("button", { name: "Refresh", exact: true }).click();
  161 |   await expect(
  162 |     page.getByRole("combobox", { name: "Planner client scope" }),
  163 |   ).toBeDisabled();
  164 |   await expect(
  165 |     page.getByRole("region", { name: `${client.name} tasks`, exact: true }),
  166 |   ).toHaveCount(0);
  167 |   await expect(page.getByRole("link", { name: "Open client" })).toHaveCount(0);
  168 |   await expect(
  169 |     page.getByRole("button", { name: "Direct client work", exact: true }),
  170 |   ).toBeVisible();
  171 |   fail = false;
  172 |   await page.getByRole("button", { name: "Retry client scopes" }).click();
```