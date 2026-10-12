# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: calendar-sharing.spec.ts >> approved prep and attachment share and selected unshare preserve other shared notes
- Location: tests/browser/calendar-sharing.spec.ts:122:1

# Error details

```
Test timeout of 12000ms exceeded.
```

```
Error: locator.click: Test timeout of 12000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Share artifacts', exact: true })

```

# Page snapshot

```yaml
- generic:
  - generic:
    - generic:
      - banner:
        - generic:
          - paragraph: Your accessible calendar
          - heading [level=1]: Master Calendar
        - generic:
          - button: Meeting library
          - button: Sync calendar
          - button:
            - img
            - text: New meeting
      - generic:
        - combobox
        - button:
          - img
        - button: Today
        - button:
          - img
        - textbox: 2026-10-12
        - combobox
        - combobox
      - generic:
        - textbox:
          - /placeholder: Search events…
        - button [pressed]: Meeting
        - button: Clear filters
      - paragraph: Master view includes meetings allowed by your calendar ownership and explicit client sharing. It does not grant access to teammates' private calendars.
      - generic:
        - generic:
          - heading [level=2]:
            - time: 2026-10-13
          - article:
            - generic: Meeting
            - generic:
              - heading [level=3]:
                - button: Synthetic sharing meeting
              - generic: Oct 13, 12:00 PM UTC · scheduled
              - text: Your accessible meetings
  - dialog "Synthetic sharing meeting" [ref=e2]:
    - banner [ref=e3]:
      - heading "Synthetic sharing meeting" [level=2] [ref=e4]
      - button "Close" [active] [ref=e5] [cursor=pointer]:
        - img [ref=e6]
    - paragraph [ref=e9]: Synthetic sharing meeting
    - generic [ref=e10]: privateTest Aerospace
    - navigation "Meeting sections" [ref=e11]:
      - button "Information" [pressed] [ref=e12] [cursor=pointer]
      - button "Preparation" [ref=e13] [cursor=pointer]
      - button "Notes" [ref=e14] [cursor=pointer]
      - button "Debriefs" [ref=e15] [cursor=pointer]
    - generic [ref=e16]:
      - paragraph [ref=e17]: Oct 13, 12:00 PM UTC – Oct 13, 1:00 PM UTC
      - paragraph [ref=e18]:
        - img [ref=e19]
        - text: Synthetic meeting room
      - region "Meri meeting attendance" [ref=e22]:
        - heading "Meri attendance" [level=3] [ref=e23]
        - status [ref=e24]: No Meri attendance requested
        - generic [ref=e25]:
          - button "Send Meri to take notes" [disabled] [ref=e26]
          - button "Refresh Meri status" [ref=e27] [cursor=pointer]
        - paragraph [ref=e28]: Attendance actions are disabled in this environment. Existing status remains visible.
      - paragraph [ref=e29]: No description.
      - heading "Attendees" [level=3] [ref=e30]:
        - img [ref=e31]
        - text: Attendees
      - list
      - button "Edit meeting" [ref=e36] [cursor=pointer]
      - button "Client assignment" [ref=e37] [cursor=pointer]
```

# Test source

```ts
  2   | import { installFixtures, json } from "./fixtures";
  3   | import {
  4   |   sharingMeeting,
  5   |   sharingFile,
  6   |   sharingTime,
  7   |   sharedMeetingFixture,
  8   | } from "../calendar-sharing-fixtures";
  9   | const url = `/calendar-sharing.html?view=agenda&date=2026-10-12&zone=UTC&clientId=${sharingMeeting.client.id}`;
  10  | const held = () => {
  11  |   let release!: () => void;
  12  |   const promise = new Promise<void>((resolve) => {
  13  |     release = resolve;
  14  |   });
  15  |   return { promise, release };
  16  | };
  17  | async function setup(page: Page) {
  18  |   const unexpected = await installFixtures(page);
  19  |   const state = {
  20  |     meeting: structuredClone(sharingMeeting),
  21  |     files: [structuredClone(sharingFile)],
  22  |     feed: [sharedMeetingFixture()],
  23  |     writes: [] as {
  24  |       path: string;
  25  |       body: { artifacts: { type: string; id: string }[] };
  26  |     }[],
  27  |     receipt: undefined as unknown,
  28  |     status: 200,
  29  |     feedStatus: 200,
  30  |     reads: 0,
  31  |     feedReads: 0,
  32  |     hold: undefined as Promise<void> | undefined,
  33  |     readHold: undefined as Promise<void> | undefined,
  34  |     feedHold: undefined as Promise<void> | undefined,
  35  |   };
  36  |   await page.route("**/core/engagement/attachments?**", (route) =>
  37  |     json(route, state.files),
  38  |   );
  39  |   await page.route("**/core/engagement/shared-meetings?**", async (route) => {
  40  |     state.feedReads++;
  41  |     if (state.feedHold) await state.feedHold;
  42  |     return json(
  43  |       route,
  44  |       state.feedStatus === 200
  45  |         ? state.feed
  46  |         : { message: "Synthetic shared feed unavailable" },
  47  |       state.feedStatus,
  48  |     ).catch(() => {});
  49  |   });
  50  |   await page.route("**/core/engagement/meetings**", async (route) => {
  51  |     const path = new URL(route.request().url()).pathname;
  52  |     if (route.request().method() !== "GET") {
  53  |       const body = route.request().postDataJSON();
  54  |       state.writes.push({ path, body });
  55  |       if (state.hold) await state.hold;
  56  |       if (state.receipt !== undefined)
  57  |         return json(route, state.receipt, state.status).catch(() => {});
  58  |       for (const ref of body.artifacts) {
  59  |         const kind = (
  60  |           {
  61  |             prep: "preps",
  62  |             note: "notes",
  63  |             debrief: "debriefs",
  64  |             attachment: "attachments",
  65  |           } as const
  66  |         )[ref.type as "prep"];
  67  |         const item = state.meeting[kind].find((item) => item.id === ref.id);
  68  |         if (item)
  69  |           Object.assign(
  70  |             item,
  71  |             path.endsWith("/unshare")
  72  |               ? { sharedAt: null, sharedByUserId: null }
  73  |               : { sharedAt: sharingTime, sharedByUserId: "user-test" },
  74  |           );
  75  |       }
  76  |       state.meeting.visibility =
  77  |         state.meeting.notes.some((row) => row.sharedAt) ||
  78  |         state.meeting.preps.some((row) => row.sharedAt) ||
  79  |         state.meeting.attachments.some((row) => row.sharedAt)
  80  |           ? "shared"
  81  |           : "private";
  82  |       state.files = state.meeting.attachments.map((row) => ({
  83  |         ...row,
  84  |         usable: true,
  85  |       }));
  86  |       return json(route, state.meeting, state.status).catch(() => {});
  87  |     }
  88  |     if (path.endsWith("/meetings")) return json(route, [state.meeting]);
  89  |     if (path.endsWith("/notes") || path.endsWith("/debriefs"))
  90  |       return json(route, []);
  91  |     if (path.endsWith("/notetaker")) return json(route, null);
  92  |     state.reads++;
  93  |     if (state.readHold) await state.readHold;
  94  |     return json(route, state.meeting).catch(() => {});
  95  |   });
  96  |   return { state, unexpected };
  97  | }
  98  | async function openSharing(page: Page) {
  99  |   await page.goto(`${url}&meeting=${sharingMeeting.id}`);
  100 |   await page
  101 |     .getByRole("button", { name: "Share artifacts", exact: true })
> 102 |     .click();
      |      ^ Error: locator.click: Test timeout of 12000ms exceeded.
  103 |   const dialog = page.getByRole("dialog", {
  104 |     name: "Share artifacts with your organization?",
  105 |     exact: true,
  106 |   });
  107 |   await expect(dialog.getByRole("checkbox").first()).toBeVisible();
  108 |   return dialog;
  109 | }
  110 | async function choosePrepAndFile(page: Page) {
  111 |   const dialog = page.getByRole("dialog", {
  112 |     name: "Share artifacts with your organization?",
  113 |     exact: true,
  114 |   });
  115 |   await dialog.getByRole("checkbox", { name: /Meeting prep/ }).check();
  116 |   await dialog.getByRole("checkbox", { name: /Synthetic questions/ }).check();
  117 |   await dialog
  118 |     .getByRole("button", { name: "Share selected artifacts", exact: true })
  119 |     .click();
  120 |   return dialog;
  121 | }
  122 | test("approved prep and attachment share and selected unshare preserve other shared notes", async ({
  123 |   page,
  124 | }) => {
  125 |   const { state, unexpected } = await setup(page);
  126 |   Object.assign(state.meeting.notes[0]!, {
  127 |     sharedAt: sharingTime,
  128 |     sharedByUserId: "user-test",
  129 |   });
  130 |   await openSharing(page);
  131 |   const dialog = await choosePrepAndFile(page);
  132 |   expect(state.writes).toHaveLength(0);
  133 |   await dialog
  134 |     .getByRole("button", { name: "Confirm: Share selected artifacts" })
  135 |     .click();
  136 |   await expect(dialog).toHaveCount(0);
  137 |   expect(state.writes[0]!.body.artifacts).toEqual([
  138 |     { type: "prep", id: sharingMeeting.preps[0]!.id },
  139 |     { type: "attachment", id: sharingFile.id },
  140 |   ]);
  141 |   await page
  142 |     .getByRole("button", { name: "Share artifacts", exact: true })
  143 |     .click();
  144 |   const share = page.getByRole("dialog", {
  145 |     name: "Share artifacts with your organization?",
  146 |     exact: true,
  147 |   });
  148 |   await share.getByRole("button", { name: "Unshare", exact: true }).click();
  149 |   await share.getByRole("checkbox", { name: /Meeting prep/ }).check();
  150 |   await share.getByRole("checkbox", { name: /Synthetic questions/ }).check();
  151 |   await share
  152 |     .getByRole("button", { name: "Unshare selected artifacts", exact: true })
  153 |     .click();
  154 |   const confirm = page.getByRole("dialog", {
  155 |     name: "Unshare artifacts?",
  156 |     exact: true,
  157 |   });
  158 |   await confirm
  159 |     .getByRole("button", { name: "Confirm: Unshare selected artifacts" })
  160 |     .click();
  161 |   await expect(confirm).toHaveCount(0);
  162 |   expect(state.writes).toHaveLength(2);
  163 |   expect(state.meeting.visibility).toBe("shared");
  164 |   expect(state.meeting.preps[0]!.sharedAt).toBeNull();
  165 |   expect(state.meeting.notes[0]!.sharedAt).toBe(sharingTime);
  166 |   expect(unexpected).toEqual([]);
  167 | });
  168 | test("approval, confidentiality, institutional and readiness restrictions are visible and do not dispatch", async ({
  169 |   page,
  170 | }) => {
  171 |   const { state } = await setup(page);
  172 |   Object.assign(state.meeting.preps[0]!, {
  173 |     generatedFrom: { schemaVersion: "research_portfolio_institutional_v1" },
  174 |   });
  175 |   state.meeting.notes[0]!.confidential = true;
  176 |   state.meeting.debriefs[0]!.status = "generated";
  177 |   state.files[0]!.usable = false;
  178 |   const dialog = await openSharing(page);
  179 |   for (const checkbox of await dialog.getByRole("checkbox").all())
  180 |     await expect(checkbox).toBeDisabled();
  181 |   await expect(dialog).toContainText("Private Research Portfolio preparation");
  182 |   await expect(dialog).toContainText("Approval required");
  183 |   await expect(
  184 |     dialog.getByRole("button", {
  185 |       name: "Share selected artifacts",
  186 |       exact: true,
  187 |     }),
  188 |   ).toBeDisabled();
  189 |   expect(state.writes).toEqual([]);
  190 | });
  191 | for (const scenario of ["uncertain", "foreign receipt"] as const)
  192 |   test(`${scenario} remains fenced after reopening and duplicate clicks`, async ({
  193 |     page,
  194 |   }) => {
  195 |     const { state } = await setup(page);
  196 |     state.receipt =
  197 |       scenario === "uncertain"
  198 |         ? {}
  199 |         : { ...sharedMeetingFixture(), tenantId: "foreign" };
  200 |     state.status = scenario === "uncertain" ? 503 : 200;
  201 |     await openSharing(page);
  202 |     const dialog = await choosePrepAndFile(page);
```