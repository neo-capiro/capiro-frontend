# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: calendar-lifecycle.spec.ts >> client agenda filters native lifecycle status without requests or approval inference
- Location: tests/browser/calendar-lifecycle.spec.ts:111:1

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

# Test source

```ts
  24  |   attendees: [
  25  |     {
  26  |       id: "attendee-one",
  27  |       name: "Synthetic attendee",
  28  |       email: "attendee@example.test",
  29  |       role: "Organizer",
  30  |     },
  31  |   ],
  32  |   preps: [],
  33  |   notes: [],
  34  |   debriefs: [],
  35  | });
  36  | const upcoming = makeMeeting(
  37  |   "upcoming",
  38  |   "2026-10-13T12:00:00Z",
  39  |   "2026-10-13T13:00:00Z",
  40  | );
  41  | const live = makeMeeting(
  42  |   "live",
  43  |   "2026-10-12T11:30:00Z",
  44  |   "2026-10-12T12:30:00Z",
  45  | );
  46  | const completed = makeMeeting(
  47  |   "completed",
  48  |   "2026-10-11T12:00:00Z",
  49  |   "2026-10-11T13:00:00Z",
  50  | );
  51  | const cancelled = {
  52  |   ...completed,
  53  |   id: "cancelled",
  54  |   subject: "Synthetic cancelled",
  55  |   status: "cancelled",
  56  | };
  57  | async function setup(page: Page) {
  58  |   await page.clock.setFixedTime(new Date(now));
  59  |   const unexpected = await installFixtures(page);
  60  |   const state = {
  61  |     meetings: [upcoming, live, completed, cancelled] as Record<
  62  |       string,
  63  |       unknown
  64  |     >[],
  65  |     reads: 0,
  66  |     writes: [] as string[],
  67  |     status: 200,
  68  |     hold: false,
  69  |     release: () => {},
  70  |   };
  71  |   await page.route("**/api/backend/core/engagement/attachments?**", (route) =>
  72  |     json(route, []),
  73  |   );
  74  |   await page.route(
  75  |     "**/api/backend/core/engagement/meetings**",
  76  |     async (route) => {
  77  |       const url = new URL(route.request().url());
  78  |       if (route.request().method() !== "GET") {
  79  |         state.writes.push(url.pathname);
  80  |         return json(route, { message: "Unexpected synthetic mutation" }, 500);
  81  |       }
  82  |       const path = url.pathname.split("/engagement/meetings")[1];
  83  |       if (!path) {
  84  |         state.reads++;
  85  |         if (state.hold)
  86  |           await new Promise<void>((resolve) => {
  87  |             state.release = resolve;
  88  |           });
  89  |         return json(
  90  |           route,
  91  |           state.status === 200
  92  |             ? state.meetings
  93  |             : { message: "Synthetic meeting feed failed" },
  94  |           state.status,
  95  |         );
  96  |       }
  97  |       if (path.endsWith("/notes") || path.endsWith("/debriefs"))
  98  |         return json(route, []);
  99  |       if (path.endsWith("/notetaker")) return json(route, null);
  100 |       return json(
  101 |         route,
  102 |         state.meetings.find((row) => path === `/${row.id}`) ?? {},
  103 |         200,
  104 |       );
  105 |     },
  106 |   );
  107 |   return { state, unexpected };
  108 | }
  109 | const url = `/calendar-boundary.html?view=agenda&date=2026-10-12&zone=UTC&clientId=${clientId}`;
  110 | 
  111 | test("client agenda filters native lifecycle status without requests or approval inference", async ({
  112 |   page,
  113 | }) => {
  114 |   const { state, unexpected } = await setup(page);
  115 |   state.meetings.push({
  116 |     ...upcoming,
  117 |     id: "prepared",
  118 |     subject: "Synthetic prepared",
  119 |     preps: [prep],
  120 |   });
  121 |   await page.goto(url);
  122 |   await expect(
  123 |     page.getByRole("columnheader", { name: "Prep", exact: true }),
> 124 |   ).toBeVisible();
      |     ^ Error: expect(locator).toBeVisible() failed
  125 |   const prepared = page.getByRole("row", { name: /Synthetic prepared/ });
  126 |   await expect(prepared).toContainText("Generated");
  127 |   await expect(prepared).not.toContainText("Approved");
  128 |   const reads = state.reads;
  129 |   await page.getByRole("button", { name: "Needs prep", exact: true }).click();
  130 |   await expect(
  131 |     page.getByRole("button", { name: upcoming.subject, exact: true }),
  132 |   ).toBeVisible();
  133 |   await expect(
  134 |     page.getByRole("button", { name: "Synthetic prepared", exact: true }),
  135 |   ).toHaveCount(0);
  136 |   await expect(
  137 |     page.getByRole("button", { name: completed.subject, exact: true }),
  138 |   ).toHaveCount(0);
  139 |   await page
  140 |     .getByRole("button", { name: "Needs debrief", exact: true })
  141 |     .click();
  142 |   await expect(
  143 |     page.getByRole("button", { name: completed.subject, exact: true }),
  144 |   ).toBeVisible();
  145 |   await expect(
  146 |     page.getByRole("button", { name: cancelled.subject, exact: true }),
  147 |   ).toHaveCount(0);
  148 |   await page.getByRole("button", { name: "All meetings", exact: true }).click();
  149 |   await expect(
  150 |     page.getByRole("button", { name: "Synthetic prepared", exact: true }),
  151 |   ).toBeVisible();
  152 |   expect(state.reads).toBe(reads);
  153 |   expect(state.writes).toEqual([]);
  154 |   expect(unexpected).toEqual([]);
  155 | });
  156 | 
  157 | test("omitted debrief metadata is unavailable rather than a missing debrief", async ({
  158 |   page,
  159 | }) => {
  160 |   const { state, unexpected } = await setup(page);
  161 |   const { debriefs: omitted, ...unknown } = completed;
  162 |   void omitted;
  163 |   state.meetings = [
  164 |     { ...unknown, id: "unknown", subject: "Synthetic unavailable metadata" },
  165 |     completed,
  166 |   ];
  167 |   await page.goto(url);
  168 |   await expect(
  169 |     page.getByRole("row", { name: /Synthetic unavailable metadata/ }),
  170 |   ).toContainText("Status unavailable");
  171 |   await page
  172 |     .getByRole("button", { name: "Needs debrief", exact: true })
  173 |     .click();
  174 |   await expect(
  175 |     page.getByRole("button", {
  176 |       name: "Synthetic unavailable metadata",
  177 |       exact: true,
  178 |     }),
  179 |   ).toHaveCount(0);
  180 |   await expect(
  181 |     page.getByRole("button", { name: completed.subject, exact: true }),
  182 |   ).toBeVisible();
  183 |   expect(unexpected).toEqual([]);
  184 | });
  185 | 
  186 | for (const [meeting, tab] of [
  187 |   [upcoming, "Preparation"],
  188 |   [live, "Notes"],
  189 |   [completed, "Debriefs"],
  190 |   [cancelled, "Information"],
  191 | ] as const)
  192 |   test(`${meeting.id} opens ${tab} and retains identity across all meeting tabs`, async ({
  193 |     page,
  194 |   }) => {
  195 |     const { state, unexpected } = await setup(page);
  196 |     await page.goto(`${url}&meeting=${meeting.id}`);
  197 |     const detail = page.getByRole("dialog", {
  198 |       name: meeting.subject,
  199 |       exact: true,
  200 |     });
  201 |     await expect(
  202 |       detail.getByRole("button", { name: tab, exact: true }),
  203 |     ).toHaveAttribute("aria-pressed", "true");
  204 |     for (const name of ["Information", "Preparation", "Notes", "Debriefs"]) {
  205 |       await detail.getByRole("button", { name, exact: true }).click();
  206 |       const identity = detail.getByRole("region", { name: "Meeting identity" });
  207 |       await expect(identity).toContainText(`Meeting ${meeting.id}`);
  208 |       await expect(identity).toContainText("Synthetic meeting room");
  209 |       await expect(identity).toContainText("Synthetic attendee");
  210 |       await expect(identity).toContainText("UTC");
  211 |     }
  212 |     expect(state.writes).toEqual([]);
  213 |     expect(unexpected).toEqual([]);
  214 |   });
  215 | 
  216 | test("held and failed refresh hide stale lifecycle rows until an explicit successful retry", async ({
  217 |   page,
  218 | }) => {
  219 |   const { state, unexpected } = await setup(page);
  220 |   await page.goto(url);
  221 |   await expect(
  222 |     page.getByRole("button", { name: upcoming.subject, exact: true }),
  223 |   ).toBeVisible();
  224 |   state.hold = true;
```