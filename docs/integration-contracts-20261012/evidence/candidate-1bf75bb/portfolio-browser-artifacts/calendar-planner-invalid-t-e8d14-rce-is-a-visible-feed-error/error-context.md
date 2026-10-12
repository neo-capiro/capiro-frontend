# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: calendar-planner.spec.ts >> invalid timed Planner source is a visible feed error
- Location: tests/browser/calendar-planner.spec.ts:87:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: 'Retry', exact: true })
Expected: visible
Error: strict mode violation: getByRole('button', { name: 'Retry', exact: true }) resolved to 2 elements:
    1) <button class="button">Retry</button> aka getByRole('button', { name: 'Retry' }).first()
    2) <button class="button">Retry</button> aka getByRole('button', { name: 'Retry' }).nth(1)

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('button', { name: 'Retry', exact: true })

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - link "Skip to content" [ref=e3] [cursor=pointer]:
    - /url: "#main"
  - banner [ref=e4]:
    - link "Capiro Home" [ref=e5] [cursor=pointer]:
      - /url: /
      - img "Capiro" [ref=e6]
    - navigation "Workspace" [ref=e7]:
      - link "Meri" [ref=e8] [cursor=pointer]:
        - /url: /meri
      - link "Portfolio" [ref=e9] [cursor=pointer]:
        - /url: /
      - link "Modules" [ref=e10] [cursor=pointer]:
        - /url: /modules
    - navigation "Global actions" [ref=e11]:
      - link "Quick log" [ref=e12] [cursor=pointer]:
        - /url: /portfolio?log=1
      - link "Master calendar" [ref=e13] [cursor=pointer]:
        - /url: /calendar
      - link "Search Portfolio" [ref=e14] [cursor=pointer]:
        - /url: /portfolio?search=1
      - button "Updates unavailable" [disabled] [ref=e15]
      - button "Test account" [ref=e17] [cursor=pointer]: T
  - generic [ref=e18]:
    - complementary "Portfolio navigation" [ref=e19]:
      - paragraph [ref=e20]: Portfolio
      - navigation "Portfolio" [ref=e21]:
        - link "Portfolio Overview" [ref=e22] [cursor=pointer]:
          - /url: /portfolio
          - generic [ref=e23]: Overview
        - link "Portfolio Clients" [ref=e24] [cursor=pointer]:
          - /url: /portfolio?type=CLIENT
          - generic [ref=e25]: Clients
        - link "Portfolio Prospects" [ref=e26] [cursor=pointer]:
          - /url: /portfolio/prospects
          - generic [ref=e27]: Prospects
      - link "Settings" [ref=e29] [cursor=pointer]:
        - /url: /settings
    - main [ref=e30]:
      - generic [ref=e31]:
        - generic [ref=e32]:
          - generic [ref=e33]:
            - paragraph [ref=e34]: Your accessible calendar
            - heading "Master Calendar" [level=1] [ref=e35]
          - generic [ref=e36]:
            - button "Meeting library" [ref=e37] [cursor=pointer]
            - button "Sync calendar" [ref=e38] [cursor=pointer]
            - button "New meeting" [ref=e39] [cursor=pointer]:
              - img [ref=e40]
              - text: New meeting
        - generic [ref=e41]:
          - combobox "Calendar scope" [ref=e42]:
            - option "Master view" [selected]
            - option "Test Aerospace"
          - button "Previous period" [ref=e43] [cursor=pointer]:
            - img [ref=e44]
          - button "Today" [ref=e46] [cursor=pointer]
          - button "Next period" [ref=e47] [cursor=pointer]:
            - img [ref=e48]
          - textbox "Calendar date" [ref=e50]: 2026-10-15
          - combobox "Calendar view" [ref=e51]:
            - option "Month"
            - option "Week"
            - option "Agenda" [selected]
          - combobox "Calendar timezone" [ref=e52]:
            - option "America/New_York"
            - option "America/Chicago"
            - option "America/Denver"
            - option "America/Los_Angeles"
            - option "Pacific/Honolulu"
            - option "UTC" [selected]
        - generic [ref=e53]:
          - textbox "Search calendar events" [ref=e54]:
            - /placeholder: Search events…
          - button "Meeting" [pressed] [ref=e55] [cursor=pointer]
          - button "Hearing" [pressed] [ref=e56] [cursor=pointer]
          - button "Planner" [pressed] [ref=e57] [cursor=pointer]
          - button "Deadline" [pressed] [ref=e58] [cursor=pointer]
          - button "Government" [pressed] [ref=e59] [cursor=pointer]
          - generic "Forecast dates do not have a published source contract" [ref=e60]: Government forecasts unavailable
          - button "Clear filters" [ref=e61] [cursor=pointer]
        - generic [ref=e62]:
          - alert [ref=e64]:
            - paragraph [ref=e65]: The service returned an unexpected response. Please retry or contact support.
            - button "Retry" [ref=e66] [cursor=pointer]
          - status [ref=e68]: Deadline source currently returns at most 50 upcoming records within the next 30 days. It cannot establish a complete historical or extended calendar.
          - alert [ref=e70]:
            - paragraph [ref=e71]: Synthetic publisher effective-date source unavailable
            - button "Retry" [ref=e72] [cursor=pointer]
        - paragraph [ref=e73]: Master view includes meetings allowed by your calendar ownership and explicit client sharing. It does not grant access to teammates' private calendars.
```

# Test source

```ts
  3   | 
  4   | const task = {
  5   |   id: "task-date-1",
  6   |   name: "Synthetic scheduled follow-up",
  7   |   status: "todo",
  8   |   archived: false,
  9   |   startOn: "2026-10-12",
  10  |   dueOn: null,
  11  |   startTime: null,
  12  |   dueTime: null,
  13  |   timeZone: null,
  14  |   clientId,
  15  | };
  16  | 
  17  | test("Master Agenda retains scheduled starts and due dates while client Calendar stays meeting-scoped", async ({
  18  |   page,
  19  | }) => {
  20  |   const unexpected = await installFixtures(page);
  21  |   const calls: URL[] = [];
  22  |   await page.route("**/strategy/planner/tasks?**", (route) => {
  23  |     calls.push(new URL(route.request().url()));
  24  |     return json(route, {
  25  |       items: [
  26  |         task,
  27  |         {
  28  |           ...task,
  29  |           id: "task-date-2",
  30  |           name: "Synthetic report delivery",
  31  |           dueOn: "2026-10-16",
  32  |         },
  33  |         {
  34  |           ...task,
  35  |           id: "task-date-3",
  36  |           name: "Archived synthetic task",
  37  |           archived: true,
  38  |         },
  39  |       ],
  40  |       nextCursor: null,
  41  |     });
  42  |   });
  43  |   await page.goto(
  44  |     "/calendar?view=agenda&date=2026-10-15&zone=America%2FLos_Angeles",
  45  |   );
  46  |   await expect(
  47  |     page.getByRole("heading", { name: task.name, exact: true }),
  48  |   ).toBeVisible();
  49  |   await expect(
  50  |     page.getByRole("heading", {
  51  |       name: "Synthetic report delivery",
  52  |       exact: true,
  53  |     }),
  54  |   ).toHaveCount(2);
  55  |   const delivery = page.locator("article").filter({
  56  |     has: page.getByRole("heading", {
  57  |       name: "Synthetic report delivery",
  58  |       exact: true,
  59  |     }),
  60  |   });
  61  |   await expect(delivery.filter({ hasText: "scheduled start" })).toHaveCount(1);
  62  |   await expect(delivery.filter({ hasText: "due date" })).toHaveCount(1);
  63  |   await expect(
  64  |     page.getByRole("heading", { name: "Archived synthetic task", exact: true }),
  65  |   ).toHaveCount(0);
  66  |   expect(calls).toHaveLength(1);
  67  |   expect(calls[0]?.searchParams.has("clientId")).toBe(false);
  68  |   expect(calls[0]?.searchParams.has("from")).toBe(false);
  69  |   await page.getByRole("button", { name: "Planner", exact: true }).click();
  70  |   await expect(
  71  |     page.getByRole("heading", { name: task.name, exact: true }),
  72  |   ).toHaveCount(0);
  73  |   await page.getByRole("button", { name: "Clear filters" }).click();
  74  |   await expect(
  75  |     page.getByRole("heading", { name: task.name, exact: true }),
  76  |   ).toBeVisible();
  77  |   await page
  78  |     .getByRole("combobox", { name: "Calendar scope" })
  79  |     .selectOption(clientId);
  80  |   await expect(
  81  |     page.getByRole("heading", { name: task.name, exact: true }),
  82  |   ).toHaveCount(0);
  83  |   expect(calls).toHaveLength(1);
  84  |   expect(unexpected).toEqual([]);
  85  | });
  86  | 
  87  | test("invalid timed Planner source is a visible feed error", async ({
  88  |   page,
  89  | }) => {
  90  |   const unexpected = await installFixtures(page);
  91  |   await page.route("**/strategy/planner/tasks?**", (route) =>
  92  |     json(route, {
  93  |       items: [{ ...task, startTime: "09:00", timeZone: null }],
  94  |       nextCursor: null,
  95  |     }),
  96  |   );
  97  |   await page.goto("/calendar?view=agenda&date=2026-10-15&zone=UTC");
  98  |   await expect(
  99  |     page.getByRole("heading", { name: task.name, exact: true }),
  100 |   ).toHaveCount(0);
  101 |   await expect(
  102 |     page.getByRole("button", { name: "Retry", exact: true }),
> 103 |   ).toBeVisible();
      |     ^ Error: expect(locator).toBeVisible() failed
  104 |   await expect(
  105 |     page.getByRole("heading", { name: "Master Calendar", exact: true }),
  106 |   ).toBeVisible();
  107 |   expect(unexpected).toEqual([]);
  108 | });
  109 | 
```