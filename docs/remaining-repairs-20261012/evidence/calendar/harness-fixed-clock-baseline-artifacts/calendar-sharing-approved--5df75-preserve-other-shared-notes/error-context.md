# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: calendar-sharing.spec.ts >> approved prep and attachment share and selected unshare preserve other shared notes
- Location: tests/browser/calendar-sharing.spec.ts:123:1

# Error details

```
Test timeout of 12000ms exceeded.
```

```
Error: locator.click: Test timeout of 12000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Share artifacts', exact: true })

```

# Test source

```ts
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
  18  |   await page.clock.setFixedTime(new Date(sharingTime));
  19  |   const unexpected = await installFixtures(page);
  20  |   const state = {
  21  |     meeting: structuredClone(sharingMeeting),
  22  |     files: [structuredClone(sharingFile)],
  23  |     feed: [sharedMeetingFixture()],
  24  |     writes: [] as {
  25  |       path: string;
  26  |       body: { artifacts: { type: string; id: string }[] };
  27  |     }[],
  28  |     receipt: undefined as unknown,
  29  |     status: 200,
  30  |     feedStatus: 200,
  31  |     reads: 0,
  32  |     feedReads: 0,
  33  |     hold: undefined as Promise<void> | undefined,
  34  |     readHold: undefined as Promise<void> | undefined,
  35  |     feedHold: undefined as Promise<void> | undefined,
  36  |   };
  37  |   await page.route("**/core/engagement/attachments?**", (route) =>
  38  |     json(route, state.files),
  39  |   );
  40  |   await page.route("**/core/engagement/shared-meetings?**", async (route) => {
  41  |     state.feedReads++;
  42  |     if (state.feedHold) await state.feedHold;
  43  |     return json(
  44  |       route,
  45  |       state.feedStatus === 200
  46  |         ? state.feed
  47  |         : { message: "Synthetic shared feed unavailable" },
  48  |       state.feedStatus,
  49  |     ).catch(() => {});
  50  |   });
  51  |   await page.route("**/core/engagement/meetings**", async (route) => {
  52  |     const path = new URL(route.request().url()).pathname;
  53  |     if (route.request().method() !== "GET") {
  54  |       const body = route.request().postDataJSON();
  55  |       state.writes.push({ path, body });
  56  |       if (state.hold) await state.hold;
  57  |       if (state.receipt !== undefined)
  58  |         return json(route, state.receipt, state.status).catch(() => {});
  59  |       for (const ref of body.artifacts) {
  60  |         const kind = (
  61  |           {
  62  |             prep: "preps",
  63  |             note: "notes",
  64  |             debrief: "debriefs",
  65  |             attachment: "attachments",
  66  |           } as const
  67  |         )[ref.type as "prep"];
  68  |         const item = state.meeting[kind].find((item) => item.id === ref.id);
  69  |         if (item)
  70  |           Object.assign(
  71  |             item,
  72  |             path.endsWith("/unshare")
  73  |               ? { sharedAt: null, sharedByUserId: null }
  74  |               : { sharedAt: sharingTime, sharedByUserId: "user-test" },
  75  |           );
  76  |       }
  77  |       state.meeting.visibility =
  78  |         state.meeting.notes.some((row) => row.sharedAt) ||
  79  |         state.meeting.preps.some((row) => row.sharedAt) ||
  80  |         state.meeting.attachments.some((row) => row.sharedAt)
  81  |           ? "shared"
  82  |           : "private";
  83  |       state.files = state.meeting.attachments.map((row) => ({
  84  |         ...row,
  85  |         usable: true,
  86  |       }));
  87  |       return json(route, state.meeting, state.status).catch(() => {});
  88  |     }
  89  |     if (path.endsWith("/meetings")) return json(route, [state.meeting]);
  90  |     if (path.endsWith("/notes") || path.endsWith("/debriefs"))
  91  |       return json(route, []);
  92  |     if (path.endsWith("/notetaker")) return json(route, null);
  93  |     state.reads++;
  94  |     if (state.readHold) await state.readHold;
  95  |     return json(route, state.meeting).catch(() => {});
  96  |   });
  97  |   return { state, unexpected };
  98  | }
  99  | async function openSharing(page: Page) {
  100 |   await page.goto(`${url}&meeting=${sharingMeeting.id}`);
  101 |   await page
  102 |     .getByRole("button", { name: "Share artifacts", exact: true })
> 103 |     .click();
      |      ^ Error: locator.click: Test timeout of 12000ms exceeded.
  104 |   const dialog = page.getByRole("dialog", {
  105 |     name: "Share artifacts with your organization?",
  106 |     exact: true,
  107 |   });
  108 |   await expect(dialog.getByRole("checkbox").first()).toBeVisible();
  109 |   return dialog;
  110 | }
  111 | async function choosePrepAndFile(page: Page) {
  112 |   const dialog = page.getByRole("dialog", {
  113 |     name: "Share artifacts with your organization?",
  114 |     exact: true,
  115 |   });
  116 |   await dialog.getByRole("checkbox", { name: /Meeting prep/ }).check();
  117 |   await dialog.getByRole("checkbox", { name: /Synthetic questions/ }).check();
  118 |   await dialog
  119 |     .getByRole("button", { name: "Share selected artifacts", exact: true })
  120 |     .click();
  121 |   return dialog;
  122 | }
  123 | test("approved prep and attachment share and selected unshare preserve other shared notes", async ({
  124 |   page,
  125 | }) => {
  126 |   const { state, unexpected } = await setup(page);
  127 |   Object.assign(state.meeting.notes[0]!, {
  128 |     sharedAt: sharingTime,
  129 |     sharedByUserId: "user-test",
  130 |   });
  131 |   await openSharing(page);
  132 |   const dialog = await choosePrepAndFile(page);
  133 |   expect(state.writes).toHaveLength(0);
  134 |   await dialog
  135 |     .getByRole("button", { name: "Confirm: Share selected artifacts" })
  136 |     .click();
  137 |   await expect(dialog).toHaveCount(0);
  138 |   expect(state.writes[0]!.body.artifacts).toEqual([
  139 |     { type: "prep", id: sharingMeeting.preps[0]!.id },
  140 |     { type: "attachment", id: sharingFile.id },
  141 |   ]);
  142 |   await page
  143 |     .getByRole("button", { name: "Share artifacts", exact: true })
  144 |     .click();
  145 |   const share = page.getByRole("dialog", {
  146 |     name: "Share artifacts with your organization?",
  147 |     exact: true,
  148 |   });
  149 |   await share.getByRole("button", { name: "Unshare", exact: true }).click();
  150 |   await share.getByRole("checkbox", { name: /Meeting prep/ }).check();
  151 |   await share.getByRole("checkbox", { name: /Synthetic questions/ }).check();
  152 |   await share
  153 |     .getByRole("button", { name: "Unshare selected artifacts", exact: true })
  154 |     .click();
  155 |   const confirm = page.getByRole("dialog", {
  156 |     name: "Unshare artifacts?",
  157 |     exact: true,
  158 |   });
  159 |   await confirm
  160 |     .getByRole("button", { name: "Confirm: Unshare selected artifacts" })
  161 |     .click();
  162 |   await expect(confirm).toHaveCount(0);
  163 |   expect(state.writes).toHaveLength(2);
  164 |   expect(state.meeting.visibility).toBe("shared");
  165 |   expect(state.meeting.preps[0]!.sharedAt).toBeNull();
  166 |   expect(state.meeting.notes[0]!.sharedAt).toBe(sharingTime);
  167 |   expect(unexpected).toEqual([]);
  168 | });
  169 | test("approval, confidentiality, institutional and readiness restrictions are visible and do not dispatch", async ({
  170 |   page,
  171 | }) => {
  172 |   const { state } = await setup(page);
  173 |   Object.assign(state.meeting.preps[0]!, {
  174 |     generatedFrom: { schemaVersion: "research_portfolio_institutional_v1" },
  175 |   });
  176 |   state.meeting.notes[0]!.confidential = true;
  177 |   state.meeting.debriefs[0]!.status = "generated";
  178 |   state.files[0]!.usable = false;
  179 |   const dialog = await openSharing(page);
  180 |   for (const checkbox of await dialog.getByRole("checkbox").all())
  181 |     await expect(checkbox).toBeDisabled();
  182 |   await expect(dialog).toContainText("Private Research Portfolio preparation");
  183 |   await expect(dialog).toContainText("Approval required");
  184 |   await expect(
  185 |     dialog.getByRole("button", {
  186 |       name: "Share selected artifacts",
  187 |       exact: true,
  188 |     }),
  189 |   ).toBeDisabled();
  190 |   expect(state.writes).toEqual([]);
  191 | });
  192 | for (const scenario of ["uncertain", "foreign receipt"] as const)
  193 |   test(`${scenario} remains fenced after reopening and duplicate clicks`, async ({
  194 |     page,
  195 |   }) => {
  196 |     const { state } = await setup(page);
  197 |     state.receipt =
  198 |       scenario === "uncertain"
  199 |         ? {}
  200 |         : { ...sharedMeetingFixture(), tenantId: "foreign" };
  201 |     state.status = scenario === "uncertain" ? 503 : 200;
  202 |     await openSharing(page);
  203 |     const dialog = await choosePrepAndFile(page);
```