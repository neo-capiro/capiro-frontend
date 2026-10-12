# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: attendance.spec.ts >> Runtime disabled keeps real session status visible and forbids external actions
- Location: tests/browser/attendance.spec.ts:330:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('region', { name: 'Meri meeting attendance' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('region', { name: 'Meri meeting attendance' })

```

```yaml
- dialog "Synthetic attendance review":
  - banner:
    - heading "Synthetic attendance review" [level=2]
    - button "Close"
  - paragraph: Synthetic attendance review
  - region "Meeting identity":
    - text: Meeting 90000000-0000-4000-8000-000000000001 · Test Aerospace Upcoming private
    - paragraph: Oct 15, 2:00 PM UTC – Oct 15, 3:00 PM UTC · Virtual meeting
    - group: Attendees · 0
    - link "Join meeting":
      - /url: https://meet.google.com/abc-defg-hij
    - button "Edit meeting"
    - button "Share artifacts"
    - button "Client assignment"
  - navigation "Meeting sections":
    - button "Information"
    - button "Preparation" [pressed]
    - button "Notes"
    - button "Debriefs"
  - region "Meeting preparation":
    - text: Not started
    - note: Preparation generation is unavailable in this environment.
    - button "Generate with Meri" [disabled]
    - button "Prep settings"
    - text: Refine preparation 0/4000 characters
    - textbox "Refine preparation":
      - /placeholder: Add context for Meri to use when regenerating…
    - paragraph: No preparation yet.
  - region "Meeting attachment approvals":
    - heading "Meeting attachments" [level=3]
    - paragraph: Approval records your review of a file. It does not perform a security scan, extract text or share the file.
    - alert:
      - paragraph: The service returned an unexpected response. Please retry or contact support.
      - button "Retry"
    - button "Refresh attachment status"
```

# Test source

```ts
  3   | import type { Meeting } from "../../src/features/portfolio/calendar/contracts";
  4   | import type { BotSession } from "../../src/features/portfolio/calendar/attendance/contracts";
  5   | 
  6   | const meetingId = "90000000-0000-4000-8000-000000000001";
  7   | const sessionId = "91000000-0000-4000-8000-000000000001";
  8   | const meeting: Meeting = {
  9   |   id: meetingId,
  10  |   subject: "Synthetic attendance review",
  11  |   description: null,
  12  |   location: null,
  13  |   startsAt: "2099-10-15T14:00:00Z",
  14  |   endsAt: "2099-10-15T15:00:00Z",
  15  |   status: "scheduled",
  16  |   joinLink: "https://meet.google.com/abc-defg-hij",
  17  |   visibility: "private",
  18  |   isVirtual: true,
  19  |   meri: null,
  20  |   client: { id: clientId, name: client.name },
  21  |   attendees: [],
  22  |   preps: [],
  23  | };
  24  | const bot: BotSession = {
  25  |   id: sessionId,
  26  |   meetingId,
  27  |   clientId,
  28  |   provider: "recall",
  29  |   platform: "google_meet",
  30  |   status: "joining",
  31  |   recordingPolicy: "transcript_only",
  32  |   error: null,
  33  |   startedAt: null,
  34  |   endedAt: null,
  35  |   createdAt: "2026-10-11T07:00:00Z",
  36  |   updatedAt: "2026-10-11T07:00:00Z",
  37  | };
  38  | async function setup(page: Page) {
  39  |   const unexpected = await installFixtures(page);
  40  |   const state = {
  41  |     session: null as BotSession | null,
  42  |     preference: { enabled: false, stopping: false },
  43  |     sends: [] as unknown[],
  44  |     removals: 0,
  45  |     preferenceMethods: [] as string[],
  46  |   };
  47  |   await page.route("**/core/engagement/capabilities", (route) =>
  48  |     json(route, {
  49  |       meetingPrepComprehensiveEnabled: false,
  50  |       runtime: { externalActionsEnabled: true },
  51  |     }),
  52  |   );
  53  |   await page.route("**/core/engagement/meetings**", (route) => {
  54  |     const path = new URL(route.request().url()).pathname;
  55  |     if (path.endsWith("/notes") || path.endsWith("/debriefs"))
  56  |       return json(route, []);
  57  |     return json(route, path.endsWith(meetingId) ? meeting : [meeting]);
  58  |   });
  59  |   await page.route(
  60  |     `**/core/engagement/meetings/${meetingId}/notetaker`,
  61  |     (route) => {
  62  |       const method = route.request().method();
  63  |       if (method === "POST") {
  64  |         state.sends.push(route.request().postDataJSON());
  65  |         state.session = { ...bot };
  66  |       }
  67  |       if (method === "DELETE") {
  68  |         state.removals++;
  69  |         state.session = { ...bot, status: "removed" };
  70  |       }
  71  |       return json(route, state.session);
  72  |     },
  73  |   );
  74  |   await page.route(
  75  |     `**/core/engagement/clients/${clientId}/notetaker`,
  76  |     (route) => {
  77  |       const method = route.request().method();
  78  |       if (method !== "GET") {
  79  |         state.preferenceMethods.push(method);
  80  |         if (method === "POST") {
  81  |           expect(route.request().postDataJSON()).toEqual({
  82  |             authorizedToRecord: true,
  83  |             allPartiesWillBeNotified: true,
  84  |           });
  85  |           state.preference = { enabled: true, stopping: false };
  86  |         } else {
  87  |           state.preference = {
  88  |             enabled: false,
  89  |             stopping: state.preference.enabled,
  90  |           };
  91  |         }
  92  |       }
  93  |       return json(route, state.preference);
  94  |     },
  95  |   );
  96  |   return { state, unexpected };
  97  | }
  98  | async function openMeeting(page: Page) {
  99  |   await page.goto(
  100 |     `/portfolio/${clientId}/calendar?view=agenda&date=2099-10-15&zone=UTC&meeting=${meetingId}`,
  101 |   );
  102 |   const panel = page.getByRole("region", { name: "Meri meeting attendance" });
> 103 |   await expect(panel).toBeVisible();
      |                       ^ Error: expect(locator).toBeVisible() failed
  104 |   return panel;
  105 | }
  106 | async function openSend(page: Page) {
  107 |   const panel = await openMeeting(page);
  108 |   await panel.getByRole("button", { name: "Send Meri to take notes" }).click();
  109 |   return page.getByRole("dialog", {
  110 |     name: "Send Meri to take notes",
  111 |     exact: true,
  112 |   });
  113 | }
  114 | async function consent(dialog: Locator) {
  115 |   await dialog.getByRole("checkbox").nth(0).check();
  116 |   await dialog.getByRole("checkbox").nth(1).check();
  117 | }
  118 | async function openPreferences(page: Page) {
  119 |   await page.goto(`/portfolio/${clientId}`);
  120 |   await page.getByRole("button", { name: "Meri actions", exact: true }).click();
  121 |   await page
  122 |     .getByRole("menuitem", { name: /Notetaker for this client/ })
  123 |     .click();
  124 |   return page.getByRole("dialog", { name: "Automatic Meri attendance" });
  125 | }
  126 | test("Owned meeting dispatch requires both confirmations and preserves future scheduling without claiming attendance", async ({
  127 |   page,
  128 | }) => {
  129 |   const { state, unexpected } = await setup(page);
  130 |   const dialog = await openSend(page);
  131 |   await expect(dialog).toHaveCSS("width", "660px");
  132 |   await expect(dialog.getByLabel("Meeting join URL")).toHaveCSS(
  133 |     "font-weight",
  134 |     "400",
  135 |   );
  136 |   await expect(dialog.getByRole("checkbox").nth(0).locator("..")).toHaveCSS(
  137 |     "font-weight",
  138 |     "400",
  139 |   );
  140 |   await page.evaluate(() => document.fonts.ready);
  141 |   expect(
  142 |     await page.evaluate(() => document.fonts.check('13px "Geist Test"')),
  143 |   ).toBe(true);
  144 |   const send = dialog.getByRole("button", { name: "Send Meri", exact: true });
  145 |   await expect(send).toBeDisabled();
  146 |   await dialog.getByRole("checkbox").nth(0).check();
  147 |   await expect(send).toBeDisabled();
  148 |   await dialog.getByRole("checkbox").nth(1).check();
  149 |   await expect(dialog).toContainText("private Meeting Notes for review");
  150 |   await expect(dialog).toContainText("Scheduling does not confirm attendance");
  151 |   await page.screenshot({
  152 |     path: "work/screens/attendance-desktop.png",
  153 |     fullPage: true,
  154 |   });
  155 |   await send.click();
  156 |   await expect(dialog).not.toBeVisible();
  157 |   await expect(
  158 |     page.getByRole("region", { name: "Meri meeting attendance" }),
  159 |   ).toContainText("Joining or scheduled · attendance not yet confirmed");
  160 |   expect(state.sends).toEqual([
  161 |     {
  162 |       meetingUrl: meeting.joinLink,
  163 |       authorizedToRecord: true,
  164 |       allPartiesWillBeNotified: true,
  165 |       recordingPolicy: "transcript_only",
  166 |       joinAt: meeting.startsAt,
  167 |     },
  168 |   ]);
  169 |   expect(unexpected).toEqual([]);
  170 | });
  171 | test("Server validation retains the join URL and confirmations for explicit correction", async ({
  172 |   page,
  173 | }) => {
  174 |   const { state, unexpected } = await setup(page);
  175 |   await page.route(
  176 |     `**/core/engagement/meetings/${meetingId}/notetaker`,
  177 |     (route) => {
  178 |       if (route.request().method() === "POST") {
  179 |         state.sends.push(route.request().postDataJSON());
  180 |         return json(route, { message: "Unrecognized meeting provider" }, 400);
  181 |       }
  182 |       return json(route, null);
  183 |     },
  184 |   );
  185 |   const dialog = await openSend(page);
  186 |   await dialog
  187 |     .getByLabel("Meeting join URL")
  188 |     .fill("https://unsupported.test/join");
  189 |   await consent(dialog);
  190 |   await dialog.getByRole("button", { name: "Send Meri", exact: true }).click();
  191 |   await expect(dialog.getByRole("alert")).toContainText(
  192 |     "Unrecognized meeting provider",
  193 |   );
  194 |   await expect(dialog.getByLabel("Meeting join URL")).toHaveValue(
  195 |     "https://unsupported.test/join",
  196 |   );
  197 |   await expect(dialog.getByRole("checkbox").nth(1)).toBeChecked();
  198 |   expect(state.sends).toHaveLength(1);
  199 |   expect(unexpected).toEqual([]);
  200 | });
  201 | test("A foreign success receipt is uncertain and cannot be resent automatically or from the same form", async ({
  202 |   page,
  203 | }) => {
```