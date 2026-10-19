# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: calendar-lifecycle.spec.ts >> client agenda filters native lifecycle status without requests or approval inference
- Location: tests/browser/calendar-lifecycle.spec.ts:113:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('columnheader', { name: 'Prep', exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('columnheader', { name: 'Prep', exact: true })

```

```yaml
- banner:
  - paragraph: Your accessible calendar
  - heading "Master Calendar" [level=1]
  - button "Meeting library"
  - button "Sync calendar"
  - button "New meeting"
- combobox "Calendar scope":
  - option "Master view"
  - option "Test Aerospace" [selected]
- button "Previous period"
- button "Today"
- button "Next period"
- textbox "Calendar date": 2026-10-12
- combobox "Calendar view":
  - option "Month"
  - option "Week"
  - option "Agenda" [selected]
- combobox "Calendar timezone":
  - option "America/New_York"
  - option "America/Chicago"
  - option "America/Denver"
  - option "America/Los_Angeles"
  - option "Pacific/Honolulu"
  - option "UTC" [selected]
- textbox "Search calendar events":
  - /placeholder: Search events…
- button "Meeting" [pressed]
- button "Clear filters"
- paragraph: Master view includes meetings allowed by your calendar ownership and explicit client sharing. It does not grant access to teammates' private calendars.
- heading "2026-10-11" [level=2]:
  - time: 2026-10-11
- article:
  - text: Meeting
  - heading "Synthetic cancelled" [level=3]:
    - button "Synthetic cancelled"
  - text: Oct 11, 6:57 PM UTC · cancelled Your accessible meetings
- article:
  - text: Meeting
  - heading "Synthetic completed" [level=3]:
    - button "Synthetic completed"
  - text: Oct 11, 6:57 PM UTC · scheduled Your accessible meetings
- heading "2026-10-12" [level=2]:
  - time: 2026-10-12
- article:
  - text: Meeting
  - heading "Synthetic live" [level=3]:
    - button "Synthetic live"
  - text: Oct 12, 7:27 PM UTC · scheduled Your accessible meetings
- heading "2026-10-13" [level=2]:
  - time: 2026-10-13
- article:
  - text: Meeting
  - heading "Synthetic prepared" [level=3]:
    - button "Synthetic prepared"
  - text: Oct 13, 7:57 PM UTC · scheduled Your accessible meetings
- article:
  - text: Meeting
  - heading "Synthetic upcoming" [level=3]:
    - button "Synthetic upcoming"
  - text: Oct 13, 7:57 PM UTC · scheduled Your accessible meetings
```

# Test source

```ts
  26  |   location: "Synthetic meeting room",
  27  |   attendees: [
  28  |     {
  29  |       id: "attendee-one",
  30  |       name: "Synthetic attendee",
  31  |       email: "attendee@example.test",
  32  |       role: "Organizer",
  33  |     },
  34  |   ],
  35  |   preps: [],
  36  |   notes: [],
  37  |   debriefs: [],
  38  | });
  39  | const upcoming = makeMeeting(
  40  |   "upcoming",
  41  |   offset(24),
  42  |   offset(25),
  43  | );
  44  | const live = makeMeeting(
  45  |   "live",
  46  |   offset(-0.5),
  47  |   offset(0.5),
  48  | );
  49  | const completed = makeMeeting(
  50  |   "completed",
  51  |   offset(-25),
  52  |   offset(-24),
  53  | );
  54  | const cancelled = {
  55  |   ...completed,
  56  |   id: "cancelled",
  57  |   subject: "Synthetic cancelled",
  58  |   status: "cancelled",
  59  | };
  60  | async function setup(page: Page) {
  61  |   const unexpected = await installFixtures(page);
  62  |   const state = {
  63  |     meetings: [upcoming, live, completed, cancelled] as Record<
  64  |       string,
  65  |       unknown
  66  |     >[],
  67  |     reads: 0,
  68  |     writes: [] as string[],
  69  |     status: 200,
  70  |     hold: false,
  71  |     release: () => {},
  72  |   };
  73  |   await page.route("**/api/backend/core/engagement/attachments?**", (route) =>
  74  |     json(route, []),
  75  |   );
  76  |   await page.route(
  77  |     "**/api/backend/core/engagement/meetings**",
  78  |     async (route) => {
  79  |       const url = new URL(route.request().url());
  80  |       if (route.request().method() !== "GET") {
  81  |         state.writes.push(url.pathname);
  82  |         return json(route, { message: "Unexpected synthetic mutation" }, 500);
  83  |       }
  84  |       const path = url.pathname.split("/engagement/meetings")[1];
  85  |       if (!path) {
  86  |         state.reads++;
  87  |         if (state.hold)
  88  |           await new Promise<void>((resolve) => {
  89  |             state.release = resolve;
  90  |           });
  91  |         return json(
  92  |           route,
  93  |           state.status === 200
  94  |             ? state.meetings
  95  |             : { message: "Synthetic meeting feed failed" },
  96  |           state.status,
  97  |         );
  98  |       }
  99  |       if (path.endsWith("/notes") || path.endsWith("/debriefs"))
  100 |         return json(route, []);
  101 |       if (path.endsWith("/notetaker")) return json(route, null);
  102 |       return json(
  103 |         route,
  104 |         state.meetings.find((row) => path === `/${row.id}`) ?? {},
  105 |         200,
  106 |       );
  107 |     },
  108 |   );
  109 |   return { state, unexpected };
  110 | }
  111 | const url = `/calendar-boundary.html?view=agenda&date=${day}&zone=UTC&clientId=${clientId}`;
  112 | 
  113 | test("client agenda filters native lifecycle status without requests or approval inference", async ({
  114 |   page,
  115 | }) => {
  116 |   const { state, unexpected } = await setup(page);
  117 |   state.meetings.push({
  118 |     ...upcoming,
  119 |     id: "prepared",
  120 |     subject: "Synthetic prepared",
  121 |     preps: [prep],
  122 |   });
  123 |   await page.goto(url);
  124 |   await expect(
  125 |     page.getByRole("columnheader", { name: "Prep", exact: true }),
> 126 |   ).toBeVisible();
      |     ^ Error: expect(locator).toBeVisible() failed
  127 |   const prepared = page.getByRole("row", { name: /Synthetic prepared/ });
  128 |   await expect(prepared).toContainText("Generated");
  129 |   await expect(prepared).not.toContainText("Approved");
  130 |   const reads = state.reads;
  131 |   await page.getByRole("button", { name: "Needs prep", exact: true }).click();
  132 |   await expect(
  133 |     page.getByRole("button", { name: upcoming.subject, exact: true }),
  134 |   ).toBeVisible();
  135 |   await expect(
  136 |     page.getByRole("button", { name: "Synthetic prepared", exact: true }),
  137 |   ).toHaveCount(0);
  138 |   await expect(
  139 |     page.getByRole("button", { name: completed.subject, exact: true }),
  140 |   ).toHaveCount(0);
  141 |   await page
  142 |     .getByRole("button", { name: "Needs debrief", exact: true })
  143 |     .click();
  144 |   await expect(
  145 |     page.getByRole("button", { name: completed.subject, exact: true }),
  146 |   ).toBeVisible();
  147 |   await expect(
  148 |     page.getByRole("button", { name: cancelled.subject, exact: true }),
  149 |   ).toHaveCount(0);
  150 |   await page.getByRole("button", { name: "All meetings", exact: true }).click();
  151 |   await expect(
  152 |     page.getByRole("button", { name: "Synthetic prepared", exact: true }),
  153 |   ).toBeVisible();
  154 |   expect(state.reads).toBe(reads);
  155 |   expect(state.writes).toEqual([]);
  156 |   expect(unexpected).toEqual([]);
  157 | });
  158 | 
  159 | test("omitted debrief metadata is unavailable rather than a missing debrief", async ({
  160 |   page,
  161 | }) => {
  162 |   const { state, unexpected } = await setup(page);
  163 |   const { debriefs: omitted, ...unknown } = completed;
  164 |   void omitted;
  165 |   state.meetings = [
  166 |     { ...unknown, id: "unknown", subject: "Synthetic unavailable metadata" },
  167 |     completed,
  168 |   ];
  169 |   await page.goto(url);
  170 |   await expect(
  171 |     page.getByRole("row", { name: /Synthetic unavailable metadata/ }),
  172 |   ).toContainText("Status unavailable");
  173 |   await page
  174 |     .getByRole("button", { name: "Needs debrief", exact: true })
  175 |     .click();
  176 |   await expect(
  177 |     page.getByRole("button", {
  178 |       name: "Synthetic unavailable metadata",
  179 |       exact: true,
  180 |     }),
  181 |   ).toHaveCount(0);
  182 |   await expect(
  183 |     page.getByRole("button", { name: completed.subject, exact: true }),
  184 |   ).toBeVisible();
  185 |   expect(unexpected).toEqual([]);
  186 | });
  187 | 
  188 | for (const [meeting, tab] of [
  189 |   [upcoming, "Preparation"],
  190 |   [live, "Notes"],
  191 |   [completed, "Debriefs"],
  192 |   [cancelled, "Information"],
  193 | ] as const)
  194 |   test(`${meeting.id} opens ${tab} and retains identity across all meeting tabs`, async ({
  195 |     page,
  196 |   }) => {
  197 |     const { state, unexpected } = await setup(page);
  198 |     await page.goto(`${url}&meeting=${meeting.id}`);
  199 |     const detail = page.getByRole("dialog", {
  200 |       name: meeting.subject,
  201 |       exact: true,
  202 |     });
  203 |     await expect(
  204 |       detail.getByRole("button", { name: tab, exact: true }),
  205 |     ).toHaveAttribute("aria-pressed", "true");
  206 |     for (const name of ["Information", "Preparation", "Notes", "Debriefs"]) {
  207 |       await detail.getByRole("button", { name, exact: true }).click();
  208 |       const identity = detail.getByRole("region", { name: "Meeting identity" });
  209 |       await expect(identity).toContainText(`Meeting ${meeting.id}`);
  210 |       await expect(identity).toContainText("Synthetic meeting room");
  211 |       await expect(identity).toContainText("Synthetic attendee");
  212 |       await expect(identity).toContainText("UTC");
  213 |     }
  214 |     expect(state.writes).toEqual([]);
  215 |     expect(unexpected).toEqual([]);
  216 |   });
  217 | 
  218 | test("held and failed refresh hide stale lifecycle rows until an explicit successful retry", async ({
  219 |   page,
  220 | }) => {
  221 |   const { state, unexpected } = await setup(page);
  222 |   await page.goto(url);
  223 |   await expect(
  224 |     page.getByRole("button", { name: upcoming.subject, exact: true }),
  225 |   ).toBeVisible();
  226 |   state.hold = true;
```