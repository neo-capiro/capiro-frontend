# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: calendar-boundary.spec.ts >> failed refresh removes Synthetic retained hearing and preserves other feeds
- Location: tests/browser/calendar-boundary.spec.ts:66:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: 'Retry' })
Expected: visible
Error: strict mode violation: getByRole('button', { name: 'Retry' }) resolved to 2 elements:
    1) <button class="button">Retry</button> aka getByRole('button', { name: 'Retry' }).first()
    2) <button class="button">Retry</button> aka getByRole('button', { name: 'Retry' }).nth(1)

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('button', { name: 'Retry' })

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e5]:
      - paragraph [ref=e6]: Your accessible calendar
      - heading "Master Calendar" [level=1] [ref=e7]
    - generic [ref=e8]:
      - button "Meeting library" [ref=e9] [cursor=pointer]
      - button "Sync calendar" [ref=e10] [cursor=pointer]
      - button "New meeting" [ref=e11] [cursor=pointer]:
        - img [ref=e12]
        - text: New meeting
  - generic [ref=e13]:
    - combobox "Calendar scope" [ref=e14]:
      - option "Master view" [selected]
      - option "Test Aerospace"
    - button "Previous period" [ref=e15] [cursor=pointer]:
      - img [ref=e16]
    - button "Today" [ref=e18] [cursor=pointer]
    - button "Next period" [ref=e19] [cursor=pointer]:
      - img [ref=e20]
    - textbox "Calendar date" [ref=e22]: 2026-10-15
    - combobox "Calendar view" [ref=e23]:
      - option "Month"
      - option "Week"
      - option "Agenda" [selected]
    - combobox "Calendar timezone" [ref=e24]:
      - option "America/New_York"
      - option "America/Chicago"
      - option "America/Denver"
      - option "America/Los_Angeles"
      - option "Pacific/Honolulu"
      - option "UTC" [selected]
  - generic [ref=e25]:
    - textbox "Search calendar events" [ref=e26]:
      - /placeholder: Search events…
    - button "Meeting" [pressed] [ref=e27] [cursor=pointer]
    - button "Hearing" [pressed] [ref=e28] [cursor=pointer]
    - button "Planner" [pressed] [ref=e29] [cursor=pointer]
    - button "Deadline" [pressed] [ref=e30] [cursor=pointer]
    - button "Government" [pressed] [ref=e31] [cursor=pointer]
    - generic "Forecast dates do not have a published source contract" [ref=e32]: Government forecasts unavailable
    - button "Clear filters" [ref=e33] [cursor=pointer]
  - generic [ref=e34]:
    - alert [ref=e36]:
      - paragraph [ref=e37]: You do not have permission for this operation.
      - button "Retry" [ref=e38] [cursor=pointer]
    - status [ref=e40]: Deadline source currently returns at most 50 upcoming records within the next 30 days. It cannot establish a complete historical or extended calendar.
    - alert [ref=e42]:
      - paragraph [ref=e43]: Synthetic publisher effective-date source unavailable
      - button "Retry" [ref=e44] [cursor=pointer]
  - paragraph [ref=e45]: Master view includes meetings allowed by your calendar ownership and explicit client sharing. It does not grant access to teammates' private calendars.
  - generic [ref=e46]:
    - generic [ref=e47]:
      - heading "2026-10-11" [level=2] [ref=e48]:
        - time [ref=e49]: 2026-10-11
      - article [ref=e50]:
        - generic [ref=e51]: Meeting
        - generic [ref=e52]:
          - heading "Synthetic retained meeting" [level=3] [ref=e53]:
            - button "Synthetic retained meeting" [ref=e54] [cursor=pointer]
          - generic [ref=e55]: Oct 11, 2:00 PM UTC · scheduled
          - generic [ref=e56]: Your accessible meetings
    - generic [ref=e57]:
      - heading "2026-10-13" [level=2] [ref=e58]:
        - time [ref=e59]: 2026-10-13
      - article [ref=e60]:
        - generic [ref=e61]: Planner
        - generic [ref=e62]:
          - heading "Synthetic retained task" [level=3] [ref=e63]
          - generic [ref=e64]: Date only · time not supplied · todo
          - generic [ref=e65]: Planner tasks you can access; due date
    - generic [ref=e66]:
      - heading "2026-10-14" [level=2] [ref=e67]:
        - time [ref=e68]: 2026-10-14
      - article [ref=e69]:
        - generic [ref=e70]: Deadline
        - generic [ref=e71]:
          - heading "Synthetic retained deadline ↗" [level=3] [ref=e72]:
            - link "Synthetic retained deadline ↗" [ref=e73] [cursor=pointer]:
              - /url: https://example.test/synthetic-deadline
          - generic [ref=e74]: Date only · time not supplied
          - generic [ref=e75]: Federal Register public comment deadline; date only
```

# Test source

```ts
  1   | import { expect, test } from "@playwright/test";
  2   | import { client, clientId, installFixtures, json } from "./fixtures";
  3   | import { voiceMeeting } from "./voice-meeting";
  4   | 
  5   | const feeds = [
  6   |   {
  7   |     name: "Synthetic retained meeting",
  8   |     route: "**/core/engagement/meetings?**",
  9   |     body: [{ ...voiceMeeting, subject: "Synthetic retained meeting" }],
  10  |   },
  11  |   {
  12  |     name: "Synthetic retained hearing",
  13  |     route: "**/core/legiwatch/live-hearings/calendar?**",
  14  |     body: {
  15  |       rows: [
  16  |         {
  17  |           id: "hearing-retained",
  18  |           title: "Synthetic retained hearing",
  19  |           date: "2026-10-12",
  20  |           startsAt: null,
  21  |           timezone: "America/New_York",
  22  |           eventStatus: "scheduled",
  23  |           officialPageUrl: null,
  24  |         },
  25  |       ],
  26  |       total: 1,
  27  |       page: 1,
  28  |       pageSize: 200,
  29  |     },
  30  |   },
  31  |   {
  32  |     name: "Synthetic retained task",
  33  |     route: "**/strategy/planner/tasks?**",
  34  |     body: {
  35  |       items: [
  36  |         {
  37  |           id: "planner-retained",
  38  |           name: "Synthetic retained task",
  39  |           status: "todo",
  40  |           archived: false,
  41  |           dueOn: "2026-10-13",
  42  |           startOn: null,
  43  |           clientId,
  44  |         },
  45  |       ],
  46  |       nextCursor: null,
  47  |     },
  48  |   },
  49  |   {
  50  |     name: "Synthetic retained deadline",
  51  |     route: "**/core/federal-register/upcoming-deadlines",
  52  |     body: [
  53  |       {
  54  |         id: "deadline-retained",
  55  |         documentNumber: "2026-retained",
  56  |         title: "Synthetic retained deadline",
  57  |         commentEndDate: "2026-10-14",
  58  |         effectiveDate: null,
  59  |         htmlUrl: "https://example.test/synthetic-deadline",
  60  |       },
  61  |     ],
  62  |   },
  63  | ];
  64  | 
  65  | for (const failedFeed of feeds) {
  66  |   test(`failed refresh removes ${failedFeed.name} and preserves other feeds`, async ({
  67  |     page,
  68  |   }) => {
  69  |     const unexpected = await installFixtures(page);
  70  |     let denied = false;
  71  |     for (const feed of feeds)
  72  |       await page.route(feed.route, (route) =>
  73  |         denied && feed === failedFeed
  74  |           ? json(route, { message: "Synthetic feed access changed" }, 403)
  75  |           : json(route, feed.body),
  76  |       );
  77  |     await page.goto(
  78  |       "/calendar-boundary.html?view=agenda&date=2026-10-15&zone=UTC",
  79  |     );
  80  |     for (const feed of feeds)
  81  |       await expect(
  82  |         page.getByRole("heading", { name: new RegExp(feed.name) }),
  83  |       ).toBeVisible();
  84  |     denied = true;
  85  |     await page.evaluate(async () => {
  86  |       if (!window.__calendarBoundary) throw new Error("Missing test controls");
  87  |       await window.__calendarBoundary.refreshFeeds();
  88  |     });
> 89  |     await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
      |                                                               ^ Error: expect(locator).toBeVisible() failed
  90  |     expect(
  91  |       await page.evaluate(() => window.__calendarBoundary?.snapshots()),
  92  |     ).toContainEqual({ status: "error", retained: true });
  93  |     await expect(
  94  |       page.getByRole("heading", { name: new RegExp(failedFeed.name) }),
  95  |     ).toHaveCount(0);
  96  |     for (const feed of feeds.filter((value) => value !== failedFeed))
  97  |       await expect(
  98  |         page.getByRole("heading", { name: new RegExp(feed.name) }),
  99  |       ).toBeVisible();
  100 |     denied = false;
  101 |     await page.getByRole("button", { name: "Retry" }).click();
  102 |     await expect(
  103 |       page.getByRole("heading", { name: new RegExp(failedFeed.name) }),
  104 |     ).toBeVisible();
  105 |     expect(unexpected).toEqual([]);
  106 |   });
  107 | }
  108 | 
  109 | test("failed client refresh removes cached names from the Calendar scope picker", async ({
  110 |   page,
  111 | }) => {
  112 |   const unexpected = await installFixtures(page);
  113 |   let denied = false;
  114 |   await page.route("**/core/clients", (route) =>
  115 |     denied
  116 |       ? json(route, { message: "Synthetic client access changed" }, 403)
  117 |       : json(route, [client]),
  118 |   );
  119 |   await page.goto(
  120 |     "/calendar-boundary.html?view=agenda&date=2026-10-15&zone=UTC",
  121 |   );
  122 |   const scope = page.getByRole("combobox", { name: "Calendar scope" });
  123 |   await expect(scope.getByRole("option", { name: client.name })).toHaveCount(1);
  124 |   denied = true;
  125 |   await page.evaluate(async () => {
  126 |     if (!window.__calendarBoundary) throw new Error("Missing test controls");
  127 |     await window.__calendarBoundary.refreshClients();
  128 |   });
  129 |   await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
  130 |   await expect(scope.getByRole("option", { name: client.name })).toHaveCount(0);
  131 |   denied = false;
  132 |   await page.getByRole("button", { name: "Retry" }).click();
  133 |   await expect(scope.getByRole("option", { name: client.name })).toHaveCount(1);
  134 |   expect(unexpected).toEqual([]);
  135 | });
  136 | 
  137 | test("meeting client selection survives failed refresh without a silent association change", async ({
  138 |   page,
  139 | }) => {
  140 |   const unexpected = await installFixtures(page);
  141 |   let denied = false;
  142 |   await page.route("**/core/clients", (route) =>
  143 |     denied
  144 |       ? json(route, { message: "Synthetic client access changed" }, 403)
  145 |       : json(route, [client]),
  146 |   );
  147 |   await page.goto(
  148 |     "/calendar-boundary.html?view=agenda&date=2026-10-15&zone=UTC",
  149 |   );
  150 |   await page.getByRole("button", { name: "New meeting" }).click();
  151 |   const dialog = page.getByRole("dialog", { name: "New meeting" });
  152 |   const selection = dialog.getByRole("combobox", {
  153 |     name: "Client",
  154 |     exact: true,
  155 |   });
  156 |   await selection.selectOption(clientId);
  157 |   await dialog.getByRole("textbox", { name: "Subject" }).fill("Retained draft");
  158 |   denied = true;
  159 |   await page.evaluate(async () => {
  160 |     if (!window.__calendarBoundary) throw new Error("Missing test controls");
  161 |     await window.__calendarBoundary.refreshClients();
  162 |   });
  163 |   await expect(selection).toHaveValue(clientId);
  164 |   await expect(selection).toBeDisabled();
  165 |   await expect(
  166 |     selection.getByRole("option", { name: client.name }),
  167 |   ).toHaveCount(0);
  168 |   await expect(
  169 |     selection.getByRole("option", { name: "Selected client unavailable" }),
  170 |   ).toHaveCount(1);
  171 |   await expect(
  172 |     dialog.getByRole("button", { name: "Save meeting" }),
  173 |   ).toBeDisabled();
  174 |   await expect(dialog.getByRole("textbox", { name: "Subject" })).toHaveValue(
  175 |     "Retained draft",
  176 |   );
  177 |   denied = false;
  178 |   await dialog.getByRole("button", { name: "Retry" }).click();
  179 |   await expect(selection).toBeEnabled();
  180 |   await expect(selection).toHaveValue(clientId);
  181 |   await expect(
  182 |     selection.getByRole("option", { name: client.name }),
  183 |   ).toHaveCount(1);
  184 |   await expect(
  185 |     dialog.getByRole("button", { name: "Save meeting" }),
  186 |   ).toBeEnabled();
  187 |   expect(unexpected).toEqual([]);
  188 | });
  189 | 
```